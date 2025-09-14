/**
 * Task dependency graph builder for visualization and execution planning
 */

import { ParallelTaskInfo } from '../types.js';

/**
 * Graph node representing a task
 */
export interface GraphNode {
  id: string;
  task: ParallelTaskInfo;
  level: number; // Depth in dependency tree
  dependencies: Set<string>;
  dependents: Set<string>;
  visited?: boolean;
  inProgress?: boolean;
  completed?: boolean;
}

/**
 * Execution level containing tasks that can run in parallel
 */
export interface ExecutionLevel {
  level: number;
  tasks: string[];
  canRunInParallel: boolean;
  estimatedDuration: number;
}

/**
 * Task dependency graph class
 */
export class TaskDependencyGraph {
  private graph: Map<string, GraphNode>;
  private levels: Map<number, Set<string>>;
  private executionOrder: string[][];
  
  constructor() {
    this.graph = new Map();
    this.levels = new Map();
    this.executionOrder = [];
  }
  
  /**
   * Add a task to the graph
   */
  addTask(taskId: string, dependencies: string[] = []): void {
    if (!this.graph.has(taskId)) {
      this.graph.set(taskId, {
        id: taskId,
        task: { 
          id: taskId, 
          dependencies,
          parallelSafe: dependencies.length === 0,
          description: '',
          completed: false
        } as ParallelTaskInfo,
        level: -1,
        dependencies: new Set(dependencies),
        dependents: new Set()
      });
    } else {
      // Update dependencies if task already exists
      const node = this.graph.get(taskId)!;
      dependencies.forEach(dep => node.dependencies.add(dep));
    }
    
    // Update dependents for dependency tasks
    dependencies.forEach(depId => {
      if (!this.graph.has(depId)) {
        // Create placeholder for dependency if it doesn't exist
        this.graph.set(depId, {
          id: depId,
          task: { 
            id: depId, 
            dependencies: [],
            parallelSafe: true,
            description: '',
            completed: false
          } as ParallelTaskInfo,
          level: -1,
          dependencies: new Set(),
          dependents: new Set()
        });
      }
      this.graph.get(depId)!.dependents.add(taskId);
    });
    
    // Recalculate levels when graph changes
    this.calculateLevels();
  }
  
  /**
   * Add a complete task with all information
   */
  addCompleteTask(task: ParallelTaskInfo): void {
    const dependencies = task.dependencies || [];
    
    this.graph.set(task.id, {
      id: task.id,
      task,
      level: -1,
      dependencies: new Set(dependencies),
      dependents: new Set(task.dependents || [])
    });
    
    // Update dependents for dependency tasks
    dependencies.forEach(depId => {
      if (this.graph.has(depId)) {
        this.graph.get(depId)!.dependents.add(task.id);
      }
    });
    
    this.calculateLevels();
  }
  
  /**
   * Get tasks with no dependencies (can start immediately)
   */
  getIndependentTasks(): string[] {
    const independent: string[] = [];
    
    this.graph.forEach((node, taskId) => {
      if (node.dependencies.size === 0) {
        independent.push(taskId);
      }
    });
    
    return independent;
  }
  
  /**
   * Get execution order (tasks grouped by level)
   */
  getExecutionOrder(): string[][] {
    if (this.executionOrder.length === 0) {
      this.calculateExecutionOrder();
    }
    return this.executionOrder;
  }
  
  /**
   * Get execution levels with metadata
   */
  getExecutionLevels(): ExecutionLevel[] {
    const levels: ExecutionLevel[] = [];
    const order = this.getExecutionOrder();
    
    order.forEach((tasks, index) => {
      const levelTasks = tasks.map(id => this.graph.get(id)!);
      const maxDuration = Math.max(
        ...levelTasks.map(node => node.task.estimatedDuration || 5000)
      );
      
      levels.push({
        level: index,
        tasks,
        canRunInParallel: this.canRunInParallel(tasks),
        estimatedDuration: maxDuration
      });
    });
    
    return levels;
  }
  
  /**
   * Check if task can start (all dependencies completed)
   */
  canStart(taskId: string, completed: Set<string>): boolean {
    const node = this.graph.get(taskId);
    if (!node) return false;
    
    // Check if all dependencies are completed
    for (const dep of node.dependencies) {
      if (!completed.has(dep)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get next tasks that can be started
   */
  getNextTasks(completed: Set<string>, inProgress: Set<string>): string[] {
    const next: string[] = [];
    
    this.graph.forEach((node, taskId) => {
      if (!completed.has(taskId) && 
          !inProgress.has(taskId) && 
          this.canStart(taskId, completed)) {
        next.push(taskId);
      }
    });
    
    return next;
  }
  
  /**
   * Detect circular dependencies
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (taskId: string, path: string[]): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);
      
      const node = this.graph.get(taskId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId, [...path])) {
              return true;
            }
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycle.push(depId);
            cycles.push(cycle);
            return true;
          }
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    this.graph.forEach((_, taskId) => {
      if (!visited.has(taskId)) {
        dfs(taskId, []);
      }
    });
    
    return cycles;
  }
  
  /**
   * Get critical path (longest dependency chain)
   */
  getCriticalPath(): string[] {
    const paths: Map<string, string[]> = new Map();
    const maxPath: { path: string[], duration: number } = { path: [], duration: 0 };
    
    // Find all paths from independent tasks
    const independent = this.getIndependentTasks();
    
    const findPaths = (taskId: string, currentPath: string[], currentDuration: number): void => {
      currentPath.push(taskId);
      const node = this.graph.get(taskId)!;
      currentDuration += node.task.estimatedDuration || 5000;
      
      if (node.dependents.size === 0) {
        // Leaf node - end of path
        if (currentDuration > maxPath.duration) {
          maxPath.path = [...currentPath];
          maxPath.duration = currentDuration;
        }
      } else {
        // Continue path
        node.dependents.forEach(depId => {
          findPaths(depId, [...currentPath], currentDuration);
        });
      }
    };
    
    independent.forEach(taskId => {
      findPaths(taskId, [], 0);
    });
    
    return maxPath.path;
  }
  
  /**
   * Export graph as adjacency list
   */
  toAdjacencyList(): Record<string, string[]> {
    const adjacency: Record<string, string[]> = {};
    
    this.graph.forEach((node, taskId) => {
      adjacency[taskId] = Array.from(node.dependencies);
    });
    
    return adjacency;
  }
  
  /**
   * Export graph in DOT format for visualization
   */
  toDOT(): string {
    const lines: string[] = ['digraph TaskDependencies {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box];');
    
    // Add nodes with labels
    this.graph.forEach((node, taskId) => {
      const label = node.task.description || taskId;
      const color = node.dependencies.size === 0 ? 'green' : 
                   node.dependents.size === 0 ? 'red' : 'blue';
      lines.push(`  "${taskId}" [label="${label}", color=${color}];`);
    });
    
    // Add edges
    this.graph.forEach((node, taskId) => {
      node.dependencies.forEach(depId => {
        lines.push(`  "${depId}" -> "${taskId}";`);
      });
    });
    
    lines.push('}');
    return lines.join('\n');
  }
  
  /**
   * Calculate levels for each task (topological levels)
   */
  private calculateLevels(): void {
    this.levels.clear();
    
    // Reset all levels
    this.graph.forEach(node => {
      node.level = -1;
    });
    
    // Calculate level for each node
    const calculateNodeLevel = (taskId: string): number => {
      const node = this.graph.get(taskId);
      if (!node) return 0;
      
      if (node.level !== -1) {
        return node.level;
      }
      
      if (node.dependencies.size === 0) {
        node.level = 0;
      } else {
        let maxDepLevel = 0;
        node.dependencies.forEach(depId => {
          maxDepLevel = Math.max(maxDepLevel, calculateNodeLevel(depId));
        });
        node.level = maxDepLevel + 1;
      }
      
      // Add to level map
      if (!this.levels.has(node.level)) {
        this.levels.set(node.level, new Set());
      }
      this.levels.get(node.level)!.add(taskId);
      
      return node.level;
    };
    
    this.graph.forEach((_, taskId) => {
      calculateNodeLevel(taskId);
    });
  }
  
  /**
   * Calculate execution order based on levels
   */
  private calculateExecutionOrder(): void {
    this.executionOrder = [];
    
    // Sort levels and create execution order
    const sortedLevels = Array.from(this.levels.keys()).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const tasksAtLevel = Array.from(this.levels.get(level) || []);
      if (tasksAtLevel.length > 0) {
        this.executionOrder.push(tasksAtLevel);
      }
    });
  }
  
  /**
   * Check if tasks can run in parallel
   */
  private canRunInParallel(tasks: string[]): boolean {
    // Check for resource conflicts
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = this.graph.get(tasks[i])?.task;
        const task2 = this.graph.get(tasks[j])?.task;
        
        if (task1?.resources && task2?.resources) {
          const hasConflict = task1.resources.some(r => 
            task2.resources!.includes(r)
          );
          if (hasConflict) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get graph statistics
   */
  getStatistics(): {
    totalTasks: number;
    independentTasks: number;
    maxDepth: number;
    maxWidth: number;
    hasCycles: boolean;
    criticalPathLength: number;
  } {
    const cycles = this.detectCycles();
    const criticalPath = this.getCriticalPath();
    
    let maxWidth = 0;
    this.levels.forEach(level => {
      maxWidth = Math.max(maxWidth, level.size);
    });
    
    return {
      totalTasks: this.graph.size,
      independentTasks: this.getIndependentTasks().length,
      maxDepth: this.levels.size,
      maxWidth,
      hasCycles: cycles.length > 0,
      criticalPathLength: criticalPath.length
    };
  }
}