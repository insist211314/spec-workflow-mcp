/**
 * State Management for Parallel Execution
 * Handles state synchronization and coordination between parallel tasks
 */

import { TaskState, ParallelTaskInfo } from '../types.js';
import { ExecutionResult } from '../executors/parallel-executor.js';

export interface TaskStateSnapshot {
  taskId: string;
  state: TaskState;
  progress: number;
  startTime?: number;
  endTime?: number;
  output?: string;
  error?: string;
  dependencies: string[];
  dependents: string[];
}

export interface ExecutionSnapshot {
  timestamp: number;
  tasks: Map<string, TaskStateSnapshot>;
  globalState: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
}

export type StateChangeListener = (snapshot: ExecutionSnapshot) => void;

export class ExecutionStateManager {
  private taskStates: Map<string, TaskStateSnapshot>;
  private taskDependencyGraph: Map<string, string[]>; // taskId -> dependents
  private listeners: Set<StateChangeListener>;
  private globalState: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  private stateHistory: ExecutionSnapshot[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 50) {
    this.taskStates = new Map();
    this.taskDependencyGraph = new Map();
    this.listeners = new Set();
    this.globalState = 'idle';
    this.stateHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  initializeTasks(tasks: ParallelTaskInfo[]): void {
    this.taskStates.clear();
    this.taskDependencyGraph.clear();

    // Initialize task states
    tasks.forEach(task => {
      const snapshot: TaskStateSnapshot = {
        taskId: task.id,
        state: TaskState.PENDING,
        progress: 0,
        dependencies: [...task.dependencies],
        dependents: []
      };
      this.taskStates.set(task.id, snapshot);
    });

    // Build dependency graph (dependents)
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        const dependents = this.taskDependencyGraph.get(depId) || [];
        dependents.push(task.id);
        this.taskDependencyGraph.set(depId, dependents);
      });
    });

    this.globalState = 'idle';
    this.notifyListeners();
  }

  updateTaskState(taskId: string, state: TaskState, progress?: number, output?: string, error?: string): void {
    const snapshot = this.taskStates.get(taskId);
    if (!snapshot) {
      console.warn(`Task ${taskId} not found in state manager`);
      return;
    }

    snapshot.state = state;
    if (progress !== undefined) {
      snapshot.progress = Math.min(100, Math.max(0, progress));
    }
    if (output !== undefined) {
      snapshot.output = output;
    }
    if (error !== undefined) {
      snapshot.error = error;
    }

    // Update timestamps
    if (state === TaskState.RUNNING && !snapshot.startTime) {
      snapshot.startTime = Date.now();
    }
    if ((state === TaskState.COMPLETED || state === TaskState.FAILED) && !snapshot.endTime) {
      snapshot.endTime = Date.now();
      snapshot.progress = state === TaskState.COMPLETED ? 100 : snapshot.progress;
    }

    this.updateGlobalState();
    this.notifyListeners();
  }

  startExecution(): void {
    this.globalState = 'running';
    this.notifyListeners();
  }

  completeExecution(): void {
    this.globalState = 'completed';
    this.notifyListeners();
  }

  failExecution(): void {
    this.globalState = 'failed';
    this.notifyListeners();
  }

  stopExecution(): void {
    this.globalState = 'stopped';

    // Mark all running/pending tasks as stopped
    for (const snapshot of this.taskStates.values()) {
      if (snapshot.state === TaskState.RUNNING || snapshot.state === TaskState.PENDING) {
        snapshot.state = TaskState.FAILED;
        snapshot.error = 'Execution stopped by user';
        snapshot.endTime = Date.now();
      }
    }

    this.notifyListeners();
  }

  getTaskState(taskId: string): TaskStateSnapshot | null {
    return this.taskStates.get(taskId) || null;
  }

  getAllTaskStates(): TaskStateSnapshot[] {
    return Array.from(this.taskStates.values());
  }

  getReadyTasks(): string[] {
    const readyTasks: string[] = [];

    for (const snapshot of this.taskStates.values()) {
      if (snapshot.state === TaskState.PENDING) {
        // Check if all dependencies are completed
        const allDepsCompleted = snapshot.dependencies.every(depId => {
          const depSnapshot = this.taskStates.get(depId);
          return depSnapshot?.state === TaskState.COMPLETED;
        });

        if (allDepsCompleted) {
          readyTasks.push(snapshot.taskId);
        }
      }
    }

    return readyTasks;
  }

  getRunningTasks(): string[] {
    return Array.from(this.taskStates.values())
      .filter(snapshot => snapshot.state === TaskState.RUNNING)
      .map(snapshot => snapshot.taskId);
  }

  getCompletedTasks(): string[] {
    return Array.from(this.taskStates.values())
      .filter(snapshot => snapshot.state === TaskState.COMPLETED)
      .map(snapshot => snapshot.taskId);
  }

  getFailedTasks(): string[] {
    return Array.from(this.taskStates.values())
      .filter(snapshot => snapshot.state === TaskState.FAILED)
      .map(snapshot => snapshot.taskId);
  }

  isExecutionComplete(): boolean {
    return Array.from(this.taskStates.values()).every(snapshot =>
      snapshot.state === TaskState.COMPLETED || snapshot.state === TaskState.FAILED
    );
  }

  hasFailures(): boolean {
    return Array.from(this.taskStates.values()).some(snapshot =>
      snapshot.state === TaskState.FAILED
    );
  }

  getExecutionProgress(): { total: number; completed: number; failed: number; running: number; progress: number } {
    const total = this.taskStates.size;
    const completed = this.getCompletedTasks().length;
    const failed = this.getFailedTasks().length;
    const running = this.getRunningTasks().length;
    const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    return { total, completed, failed, running, progress };
  }

  createSnapshot(): ExecutionSnapshot {
    const { total, completed, failed, running } = this.getExecutionProgress();

    return {
      timestamp: Date.now(),
      tasks: new Map(this.taskStates),
      globalState: this.globalState,
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      runningTasks: running
    };
  }

  getStateHistory(): ExecutionSnapshot[] {
    return [...this.stateHistory];
  }

  canRollback(): boolean {
    return this.stateHistory.length > 1;
  }

  rollbackToSnapshot(timestamp: number): boolean {
    const targetSnapshot = this.stateHistory.find(snapshot => snapshot.timestamp === timestamp);
    if (!targetSnapshot) {
      return false;
    }

    // Restore state from snapshot
    this.taskStates = new Map(targetSnapshot.tasks);
    this.globalState = targetSnapshot.globalState;

    // Remove snapshots after target
    this.stateHistory = this.stateHistory.filter(snapshot => snapshot.timestamp <= timestamp);

    this.notifyListeners();
    return true;
  }

  addStateChangeListener(listener: StateChangeListener): void {
    this.listeners.add(listener);
  }

  removeStateChangeListener(listener: StateChangeListener): void {
    this.listeners.delete(listener);
  }

  private updateGlobalState(): void {
    if (this.isExecutionComplete()) {
      this.globalState = this.hasFailures() ? 'failed' : 'completed';
    } else if (this.getRunningTasks().length > 0) {
      this.globalState = 'running';
    }
  }

  private notifyListeners(): void {
    const snapshot = this.createSnapshot();

    // Add to history
    this.stateHistory.push(snapshot);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  // Synchronization methods for cross-task communication
  setSharedData(key: string, value: any): void {
    // Store shared data that can be accessed by any task
    // Implementation would use a shared storage mechanism
    console.log(`Setting shared data: ${key} = ${JSON.stringify(value)}`);
  }

  getSharedData(key: string): any {
    // Retrieve shared data
    // Implementation would use a shared storage mechanism
    console.log(`Getting shared data: ${key}`);
    return null;
  }

  waitForTaskCompletion(taskId: string): Promise<TaskStateSnapshot> {
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        const snapshot = this.taskStates.get(taskId);
        if (!snapshot) {
          reject(new Error(`Task ${taskId} not found`));
          return;
        }

        if (snapshot.state === TaskState.COMPLETED) {
          resolve(snapshot);
        } else if (snapshot.state === TaskState.FAILED) {
          reject(new Error(`Task ${taskId} failed: ${snapshot.error}`));
        } else {
          // Continue waiting
          setTimeout(checkTask, 100);
        }
      };

      checkTask();
    });
  }

  clear(): void {
    this.taskStates.clear();
    this.taskDependencyGraph.clear();
    this.globalState = 'idle';
    this.stateHistory = [];
    this.listeners.clear();
  }
}

// Export alias for backwards compatibility
export { ExecutionStateManager as StateManager };