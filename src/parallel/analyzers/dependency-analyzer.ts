/**
 * Dependency analyzer for parallel task execution
 * Ported from CCPM concepts to TypeScript
 */

import { ParallelTaskInfo, DependencyAnalysis, TaskGroup, TaskConflict, AnalysisMetadata } from '../types.js';

/**
 * Dependency analyzer class
 */
export class DependencyAnalyzer {
  /**
   * Analyze task dependencies and generate execution plan
   */
  async analyzeDependencies(tasks: ParallelTaskInfo[]): Promise<DependencyAnalysis> {
    const startTime = Date.now();
    
    // Build task graph
    const taskGraph = this.buildTaskGraph(tasks);
    
    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(taskGraph);
    
    // Find independent tasks
    const independentTasks = this.findIndependentTasks(taskGraph);
    
    // Generate parallel groups
    const parallelGroups = this.generateParallelGroups(taskGraph, circularDependencies);
    
    // Identify sequential tasks
    const sequentialTasks = this.identifySequentialTasks(taskGraph, parallelGroups);
    
    // Detect potential conflicts
    const potentialConflicts = this.detectConflicts(taskGraph);
    
    // Generate execution order
    const executionOrder = this.generateExecutionOrder(taskGraph, parallelGroups, circularDependencies);
    
    // Calculate metadata
    const metadata: AnalysisMetadata = {
      analyzedAt: new Date().toISOString(),
      analysisDuration: Date.now() - startTime,
      totalTasks: tasks.length,
      independentTasks: independentTasks.length,
      maxParallelism: this.calculateMaxParallelism(parallelGroups),
      estimatedTimeSaving: this.estimateTimeSaving(tasks, parallelGroups),
      analysisVersion: '1.0.0'
    };
    
    return {
      taskGraph,
      parallelGroups,
      sequentialTasks,
      circularDependencies,
      potentialConflicts,
      executionOrder,
      metadata
    };
  }
  
  /**
   * Build a task dependency graph
   */
  buildTaskGraph(tasks: ParallelTaskInfo[]): Map<string, ParallelTaskInfo> {
    const graph = new Map<string, ParallelTaskInfo>();
    
    // First pass: add all tasks to graph
    tasks.forEach(task => {
      graph.set(task.id, { ...task });
    });
    
    // Second pass: validate dependencies and add reverse dependencies
    tasks.forEach(task => {
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          const depTask = graph.get(depId);
          if (depTask) {
            // Add reverse dependency
            if (!depTask.dependents) {
              depTask.dependents = [];
            }
            if (!depTask.dependents.includes(task.id)) {
              depTask.dependents.push(task.id);
            }
          }
        });
      }
    });
    
    return graph;
  }
  
  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(taskGraph: Map<string, ParallelTaskInfo>): string[][] {
    const circles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);
      
      const task = taskGraph.get(taskId);
      if (task?.dependencies) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId)) {
              return true;
            }
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycle.push(depId); // Complete the circle
            circles.push(cycle);
            return true;
          }
        }
      }
      
      path.pop();
      recursionStack.delete(taskId);
      return false;
    };
    
    // Check all tasks
    taskGraph.forEach((_, taskId) => {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    });
    
    return circles;
  }
  
  /**
   * Find tasks with no dependencies
   */
  findIndependentTasks(taskGraph: Map<string, ParallelTaskInfo>): string[] {
    const independent: string[] = [];
    
    taskGraph.forEach((task, taskId) => {
      if (!task.dependencies || task.dependencies.length === 0) {
        independent.push(taskId);
      }
    });
    
    return independent;
  }
  
  /**
   * Generate groups of tasks that can run in parallel
   */
  generateParallelGroups(
    taskGraph: Map<string, ParallelTaskInfo>,
    circularDeps: string[][]
  ): TaskGroup[] {
    const groups: TaskGroup[] = [];
    const processed = new Set<string>();
    const circularTasks = new Set(circularDeps.flat());
    
    // Group 1: All independent tasks (no dependencies)
    const independent = this.findIndependentTasks(taskGraph);
    if (independent.length > 0) {
      groups.push({
        id: 'group-independent',
        tasks: independent,
        reason: 'No dependencies - can run immediately',
        risk: 'low',
        confidence: 0.95,
        estimatedDuration: this.estimateGroupDuration(independent, taskGraph)
      });
      independent.forEach(id => processed.add(id));
    }
    
    // Group 2: Tasks with same dependencies (can run after dependencies complete)
    const tasksByDeps = new Map<string, string[]>();
    
    taskGraph.forEach((task, taskId) => {
      if (!processed.has(taskId) && !circularTasks.has(taskId)) {
        if (task.dependencies && task.dependencies.length > 0) {
          const depKey = task.dependencies.sort().join(',');
          if (!tasksByDeps.has(depKey)) {
            tasksByDeps.set(depKey, []);
          }
          tasksByDeps.get(depKey)!.push(taskId);
        }
      }
    });
    
    tasksByDeps.forEach((taskIds, depKey) => {
      if (taskIds.length > 1) {
        // Check if these tasks conflict with each other
        const hasConflicts = this.checkGroupConflicts(taskIds, taskGraph);
        
        groups.push({
          id: `group-common-deps-${groups.length}`,
          tasks: taskIds,
          reason: `Share dependencies: ${depKey.split(',').join(', ')}`,
          risk: hasConflicts ? 'high' : 'medium',
          confidence: hasConflicts ? 0.5 : 0.8,
          estimatedDuration: this.estimateGroupDuration(taskIds, taskGraph)
        });
        taskIds.forEach(id => processed.add(id));
      }
    });
    
    // Group 3: Remaining tasks as individual groups
    taskGraph.forEach((task, taskId) => {
      if (!processed.has(taskId) && !circularTasks.has(taskId)) {
        groups.push({
          id: `group-single-${groups.length}`,
          tasks: [taskId],
          reason: circularTasks.has(taskId) 
            ? 'Part of circular dependency - requires manual resolution'
            : 'Unique dependency pattern',
          risk: circularTasks.has(taskId) ? 'high' : 'medium',
          confidence: 0.6,
          estimatedDuration: task.estimatedDuration
        });
      }
    });
    
    return groups;
  }
  
  /**
   * Identify tasks that must run sequentially
   */
  identifySequentialTasks(
    taskGraph: Map<string, ParallelTaskInfo>,
    parallelGroups: TaskGroup[]
  ): string[] {
    const sequential: string[] = [];
    const parallelTasks = new Set(parallelGroups.flatMap(g => g.tasks));
    
    taskGraph.forEach((task, taskId) => {
      // Tasks with long dependency chains or not in any parallel group
      if (!parallelTasks.has(taskId)) {
        sequential.push(taskId);
      } else if (task.dependencies && task.dependencies.length > 2) {
        // Tasks with many dependencies might be better run sequentially
        sequential.push(taskId);
      }
    });
    
    return sequential;
  }
  
  /**
   * Detect potential conflicts between tasks
   */
  detectConflicts(taskGraph: Map<string, ParallelTaskInfo>): TaskConflict[] {
    const conflicts: TaskConflict[] = [];
    const tasks = Array.from(taskGraph.values());
    
    // Check for resource conflicts
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];
        
        // Check if tasks share resources
        if (task1.resources && task2.resources) {
          const sharedResources = task1.resources.filter(r => 
            task2.resources!.includes(r)
          );
          
          if (sharedResources.length > 0) {
            conflicts.push({
              tasks: [task1.id, task2.id],
              type: 'resource',
              description: `Both tasks access: ${sharedResources.join(', ')}`,
              severity: this.assessConflictSeverity(sharedResources),
              resolution: 'Run sequentially or ensure resource safety'
            });
          }
        }
        
        // Check for dependency conflicts
        if (task1.dependencies?.includes(task2.id) && 
            task2.dependencies?.includes(task1.id)) {
          conflicts.push({
            tasks: [task1.id, task2.id],
            type: 'dependency',
            description: 'Mutual dependency detected',
            severity: 'critical',
            resolution: 'Refactor to remove circular dependency'
          });
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Generate optimal execution order
   */
  generateExecutionOrder(
    taskGraph: Map<string, ParallelTaskInfo>,
    parallelGroups: TaskGroup[],
    circularDeps: string[][]
  ): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const circularTasks = new Set(circularDeps.flat());
    
    // Use topological sort with level grouping
    let level = 0;
    let hasMore = true;
    
    while (hasMore && level < taskGraph.size) {
      const currentLevel: string[] = [];
      
      taskGraph.forEach((task, taskId) => {
        if (!completed.has(taskId) && !circularTasks.has(taskId)) {
          // Check if all dependencies are completed
          const canRun = !task.dependencies || 
            task.dependencies.every(dep => completed.has(dep));
          
          if (canRun) {
            currentLevel.push(taskId);
          }
        }
      });
      
      if (currentLevel.length > 0) {
        order.push(currentLevel);
        currentLevel.forEach(id => completed.add(id));
      } else {
        hasMore = false;
      }
      
      level++;
    }
    
    // Add circular dependency tasks at the end with warning
    if (circularTasks.size > 0) {
      order.push(Array.from(circularTasks));
    }
    
    return order;
  }
  
  /**
   * Check if tasks in a group have conflicts
   */
  private checkGroupConflicts(taskIds: string[], taskGraph: Map<string, ParallelTaskInfo>): boolean {
    for (let i = 0; i < taskIds.length; i++) {
      for (let j = i + 1; j < taskIds.length; j++) {
        const task1 = taskGraph.get(taskIds[i]);
        const task2 = taskGraph.get(taskIds[j]);
        
        if (task1?.resources && task2?.resources) {
          const hasSharedResources = task1.resources.some(r => 
            task2.resources!.includes(r)
          );
          if (hasSharedResources) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Estimate duration for a group of tasks
   */
  private estimateGroupDuration(taskIds: string[], taskGraph: Map<string, ParallelTaskInfo>): number {
    let maxDuration = 0;
    
    taskIds.forEach(id => {
      const task = taskGraph.get(id);
      if (task?.estimatedDuration) {
        maxDuration = Math.max(maxDuration, task.estimatedDuration);
      }
    });
    
    return maxDuration || 5000; // Default 5 seconds
  }
  
  /**
   * Calculate maximum parallelism possible
   */
  private calculateMaxParallelism(groups: TaskGroup[]): number {
    return Math.max(...groups.map(g => g.tasks.length), 1);
  }
  
  /**
   * Estimate time saving with parallel execution
   */
  private estimateTimeSaving(tasks: ParallelTaskInfo[], groups: TaskGroup[]): number {
    // Sequential time: sum of all task durations
    const sequentialTime = tasks.reduce((sum, task) => 
      sum + (task.estimatedDuration || 5000), 0
    );
    
    // Parallel time: sum of max duration in each group
    const parallelTime = groups.reduce((sum, group) => 
      sum + (group.estimatedDuration || 5000), 0
    );
    
    return Math.max(0, sequentialTime - parallelTime);
  }
  
  /**
   * Assess severity of resource conflicts
   */
  private assessConflictSeverity(resources: string[]): 'low' | 'medium' | 'high' | 'critical' {
    // Critical resources that should never be accessed in parallel
    const criticalResources = ['database', 'main-config', 'auth-system'];
    const highRiskResources = ['api', 'cache', 'session'];
    
    if (resources.some(r => criticalResources.some(cr => r.includes(cr)))) {
      return 'critical';
    }
    if (resources.some(r => highRiskResources.some(hr => r.includes(hr)))) {
      return 'high';
    }
    if (resources.length > 2) {
      return 'medium';
    }
    return 'low';
  }
}