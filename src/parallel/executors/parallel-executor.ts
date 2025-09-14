/**
 * Parallel Task Executor
 * Manages parallel execution of independent tasks with isolation and state management
 */

import { BaseAgent } from '../agents/base-agent.js';
import { ParallelTaskInfo, TaskState } from '../types.js';
import { ParallelConfig } from '../config/parallel-config.js';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';

export interface ExecutionContext {
  taskId: string;
  workingDirectory: string;
  environment: Record<string, string>;
  resources: string[];
  startTime: number;
  state: TaskState;
}

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  resources: string[];
  conflicts?: string[];
  needsManualResolution?: boolean;
}

export interface ParallelExecutionPlan {
  executionGroups: string[][];
  estimatedDuration: number;
  maxParallelism: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export class IsolatedTaskContext {
  private taskId: string;
  private workingDir: string;
  private environment: Map<string, string>;
  private allocatedResources: Set<string>;
  private state: TaskState;

  constructor(taskId: string, baseWorkingDir: string) {
    this.taskId = taskId;
    this.workingDir = `${baseWorkingDir}/.parallel-tasks/${taskId}`;
    this.environment = new Map();
    this.allocatedResources = new Set();
    this.state = TaskState.PENDING;
  }

  getTaskId(): string {
    return this.taskId;
  }

  getWorkingDirectory(): string {
    return this.workingDir;
  }

  setEnvironmentVariable(key: string, value: string): void {
    this.environment.set(key, value);
  }

  getEnvironmentVariable(key: string): string | undefined {
    return this.environment.get(key);
  }

  getAllEnvironmentVariables(): Record<string, string> {
    return Object.fromEntries(this.environment);
  }

  allocateResource(resource: string): boolean {
    if (this.allocatedResources.has(resource)) {
      return false;
    }
    this.allocatedResources.add(resource);
    return true;
  }

  releaseResource(resource: string): void {
    this.allocatedResources.delete(resource);
  }

  getAllocatedResources(): string[] {
    return Array.from(this.allocatedResources);
  }

  setState(state: TaskState): void {
    this.state = state;
  }

  getState(): TaskState {
    return this.state;
  }

  cleanup(): void {
    this.allocatedResources.clear();
    this.environment.clear();
  }
}

export class ExecutionQueue {
  private maxParallelTasks: number;
  private runningTasks: Map<string, Promise<ExecutionResult>>;
  private pendingTasks: ParallelTaskInfo[];
  private completedTasks: Map<string, ExecutionResult>;
  private failedTasks: Map<string, ExecutionResult>;

  constructor(maxParallelTasks: number = 3) {
    this.maxParallelTasks = Math.min(maxParallelTasks, 3); // Hard limit of 3
    this.runningTasks = new Map();
    this.pendingTasks = [];
    this.completedTasks = new Map();
    this.failedTasks = new Map();
  }

  addTask(task: ParallelTaskInfo): void {
    this.pendingTasks.push(task);
  }

  canExecuteMore(): boolean {
    return this.runningTasks.size < this.maxParallelTasks;
  }

  getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  getNextExecutableTask(): ParallelTaskInfo | null {
    return this.pendingTasks.find(task =>
      task.dependencies.every(dep => this.completedTasks.has(dep))
    ) || null;
  }

  startTask(taskId: string, promise: Promise<ExecutionResult>): void {
    this.runningTasks.set(taskId, promise);
    this.pendingTasks = this.pendingTasks.filter(task => task.id !== taskId);
  }

  completeTask(taskId: string, result: ExecutionResult): void {
    this.runningTasks.delete(taskId);
    if (result.success) {
      this.completedTasks.set(taskId, result);
    } else {
      this.failedTasks.set(taskId, result);
    }
  }

  getCompletedTasks(): Map<string, ExecutionResult> {
    return this.completedTasks;
  }

  getFailedTasks(): Map<string, ExecutionResult> {
    return this.failedTasks;
  }

  isComplete(): boolean {
    return this.pendingTasks.length === 0 && this.runningTasks.size === 0;
  }

  hasFailures(): boolean {
    return this.failedTasks.size > 0;
  }

  clear(): void {
    this.runningTasks.clear();
    this.pendingTasks = [];
    this.completedTasks.clear();
    this.failedTasks.clear();
  }
}

export class ParallelExecutor {
  private config: ParallelConfig;
  private dependencyAnalyzer: DependencyAnalyzer;
  private executionQueue: ExecutionQueue;
  private resourceLocks: Map<string, string>; // resource -> taskId
  private taskContexts: Map<string, IsolatedTaskContext>;
  private agents: Map<string, BaseAgent>;

  constructor(config: ParallelConfig) {
    this.config = config;
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.executionQueue = new ExecutionQueue(config.maxParallelTasks);
    this.resourceLocks = new Map();
    this.taskContexts = new Map();
    this.agents = new Map();
  }

  registerAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
  }

  async createExecutionPlan(tasks: ParallelTaskInfo[]): Promise<ParallelExecutionPlan> {
    const analysis = await this.dependencyAnalyzer.analyzeDependencies(tasks);

    const executionGroups: string[][] = [];
    let totalEstimatedTime = 0;

    // Convert execution order to groups
    for (const level of analysis.executionOrder) {
      executionGroups.push(level);

      // Estimate time for this level (max of all tasks in level)
      const levelTasks = tasks.filter(task => level.includes(task.id));
      const levelTime = Math.max(...levelTasks.map(task => task.estimatedDuration || 5000));
      totalEstimatedTime += levelTime;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (analysis.potentialConflicts.length > 0) {
      riskLevel = 'medium';
    }
    if (analysis.circularDependencies.length > 0) {
      riskLevel = 'high';
    }

    return {
      executionGroups,
      estimatedDuration: totalEstimatedTime,
      maxParallelism: analysis.metadata.maxParallelism,
      riskLevel
    };
  }

  async executeParallel(tasks: ParallelTaskInfo[], projectPath: string): Promise<ExecutionResult[]> {
    if (this.config.mode === 'classic') {
      return this.executeSequential(tasks, projectPath);
    }

    // Clear previous state
    this.executionQueue.clear();
    this.resourceLocks.clear();
    this.taskContexts.clear();

    // Add all tasks to queue
    tasks.forEach(task => this.executionQueue.addTask(task));

    const results: ExecutionResult[] = [];
    const startTime = Date.now();

    try {
      while (!this.executionQueue.isComplete()) {
        // Start new tasks if possible
        while (this.executionQueue.canExecuteMore()) {
          const nextTask = this.executionQueue.getNextExecutableTask();
          if (!nextTask) break;

          // Check resource conflicts
          if (!this.canAllocateResources(nextTask)) {
            break;
          }

          // Create isolated context
          const context = new IsolatedTaskContext(nextTask.id, projectPath);
          this.taskContexts.set(nextTask.id, context);

          // Allocate resources
          this.allocateTaskResources(nextTask, context);

          // Start execution
          const executionPromise = this.executeTask(nextTask, context, projectPath);
          this.executionQueue.startTask(nextTask.id, executionPromise);

          // Handle completion
          executionPromise
            .then(result => {
              this.executionQueue.completeTask(nextTask.id, result);
              this.releaseTaskResources(nextTask.id);
              results.push(result);
            })
            .catch(error => {
              const errorResult: ExecutionResult = {
                taskId: nextTask.id,
                success: false,
                output: '',
                error: error.message,
                duration: Date.now() - startTime,
                resources: context.getAllocatedResources()
              };
              this.executionQueue.completeTask(nextTask.id, errorResult);
              this.releaseTaskResources(nextTask.id);
              results.push(errorResult);
            });
        }

        // Wait for at least one task to complete
        if (this.executionQueue.getRunningTaskCount() > 0) {
          await this.waitForAnyCompletion();
        }

        // Check for failures and handle rollback
        if (this.executionQueue.hasFailures() && this.config.mode === 'turbo') {
          await this.handleFailures();
          break;
        }
      }

      return results;

    } catch (error) {
      // Cleanup on error
      await this.cleanup();
      throw error;
    }
  }

  private async executeSequential(tasks: ParallelTaskInfo[], projectPath: string): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const task of tasks) {
      const context = new IsolatedTaskContext(task.id, projectPath);
      this.taskContexts.set(task.id, context);

      try {
        const result = await this.executeTask(task, context, projectPath);
        results.push(result);

        if (!result.success) {
          break; // Stop on first failure in sequential mode
        }
      } catch (error) {
        results.push({
          taskId: task.id,
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
          resources: []
        });
        break;
      } finally {
        context.cleanup();
        this.taskContexts.delete(task.id);
      }
    }

    return results;
  }

  /**
   * Execute a single task in a worktree context
   */
  async executeTaskInWorktree(task: ParallelTaskInfo, worktree: any): Promise<ExecutionResult> {
    const context = new IsolatedTaskContext(task.id, worktree.path);
    return this.executeTask(task, context, worktree.path);
  }

  private async executeTask(task: ParallelTaskInfo, context: IsolatedTaskContext, projectPath: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    context.setState(TaskState.RUNNING);

    try {
      // Find appropriate agent
      const agent = this.findAgentForTask(task);
      if (!agent) {
        throw new Error(`No suitable agent found for task: ${task.description}`);
      }

      // Execute task
      const agentResult = await agent.execute({
        projectPath: projectPath,
        workflowRoot: `${projectPath}/.spec-workflow`,
        tasks: [task],
        workingDirectory: context.getWorkingDirectory(),
        environment: context.getAllEnvironmentVariables(),
        resources: context.getAllocatedResources(),
        timeout: this.config.agentTimeout
      });

      context.setState(TaskState.COMPLETED);

      return {
        taskId: task.id,
        success: agentResult.success,
        output: agentResult.data || '',
        error: agentResult.error,
        duration: Date.now() - startTime,
        resources: context.getAllocatedResources()
      };

    } catch (error) {
      context.setState(TaskState.FAILED);

      return {
        taskId: task.id,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        resources: context.getAllocatedResources()
      };
    }
  }

  private findAgentForTask(task: ParallelTaskInfo): BaseAgent | null {
    // Simple agent matching based on task description keywords
    const description = task.description.toLowerCase();

    for (const [name, agent] of this.agents) {
      const capabilities = agent.getCapabilities();
      if (capabilities.some(cap => description.includes(cap.name.toLowerCase()))) {
        return agent;
      }
    }

    // Return first available agent as fallback
    return this.agents.values().next().value || null;
  }

  private canAllocateResources(task: ParallelTaskInfo): boolean {
    if (!task.resources) return true;

    return task.resources.every(resource => !this.resourceLocks.has(resource));
  }

  private allocateTaskResources(task: ParallelTaskInfo, context: IsolatedTaskContext): void {
    if (task.resources) {
      task.resources.forEach(resource => {
        this.resourceLocks.set(resource, task.id);
        context.allocateResource(resource);
      });
    }
  }

  private releaseTaskResources(taskId: string): void {
    const context = this.taskContexts.get(taskId);
    if (context) {
      context.getAllocatedResources().forEach(resource => {
        this.resourceLocks.delete(resource);
        context.releaseResource(resource);
      });
      context.cleanup();
      this.taskContexts.delete(taskId);
    }
  }

  private async waitForAnyCompletion(): Promise<void> {
    const runningPromises = Array.from(this.executionQueue['runningTasks'].values());
    if (runningPromises.length > 0) {
      await Promise.race(runningPromises);
    }
  }

  private async handleFailures(): Promise<void> {
    const failedTasks = this.executionQueue.getFailedTasks();

    console.warn(`Parallel execution failures detected: ${failedTasks.size} tasks failed`);

    // In future versions, implement sophisticated rollback logic
    // For now, just log the failures
    for (const [taskId, result] of failedTasks) {
      console.error(`Task ${taskId} failed:`, result.error);
    }
  }

  private async cleanup(): Promise<void> {
    // Release all resources
    for (const taskId of this.taskContexts.keys()) {
      this.releaseTaskResources(taskId);
    }

    this.executionQueue.clear();
    this.resourceLocks.clear();
    this.taskContexts.clear();
  }

  // Public status methods
  getExecutionStatus(): {
    running: number;
    completed: number;
    failed: number;
    pending: number;
  } {
    return {
      running: this.executionQueue.getRunningTaskCount(),
      completed: this.executionQueue.getCompletedTasks().size,
      failed: this.executionQueue.getFailedTasks().size,
      pending: this.executionQueue['pendingTasks'].length
    };
  }

  getTaskContext(taskId: string): IsolatedTaskContext | null {
    return this.taskContexts.get(taskId) || null;
  }

  isExecuting(): boolean {
    return !this.executionQueue.isComplete();
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}