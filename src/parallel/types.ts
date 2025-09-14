/**
 * Extended types for parallel execution support
 * These types extend the base Spec Workflow types with parallel analysis capabilities
 */

import { TaskInfo } from '../types.js';

/**
 * Task execution states
 */
export enum TaskState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Extended task information with parallel execution metadata
 */
export interface ParallelTaskInfo extends TaskInfo {
  /**
   * Whether this task is safe to run in parallel with others
   * Determined by dependency analysis
   */
  parallelSafe: boolean;

  /**
   * List of task IDs that this task depends on
   * Tasks can only run after all dependencies are completed
   */
  dependencies: string[];

  /**
   * Files associated with this task
   * Used for conflict detection and resource analysis
   */
  files?: string[];

  /**
   * List of task IDs that depend on this task
   * Used for impact analysis
   */
  dependents?: string[];

  /**
   * Estimated execution time in milliseconds
   * Used for scheduling optimization
   */
  estimatedDuration?: number;

  /**
   * Resources this task will access (files, APIs, etc.)
   * Used for conflict detection
   */
  resources?: string[];

  /**
   * Priority level for execution ordering
   * Higher priority tasks are scheduled first
   */
  priority?: number;

  /**
   * Tags for categorizing tasks
   * Used for grouping and filtering
   */
  tags?: string[];

  /**
   * Execution status for parallel tracking
   */
  executionStatus?: TaskExecutionStatus;
}

/**
 * Task execution status for parallel execution
 */
export interface TaskExecutionStatus {
  /**
   * Current state of the task
   */
  state: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

  /**
   * Timestamp when the task started executing
   */
  startedAt?: string;

  /**
   * Timestamp when the task completed
   */
  completedAt?: string;

  /**
   * Error message if the task failed
   */
  error?: string;

  /**
   * Progress percentage (0-100)
   */
  progress?: number;

  /**
   * Current operation being performed
   */
  currentOperation?: string;

  /**
   * Worker or agent ID executing this task
   */
  executorId?: string;
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  /**
   * All tasks with their dependencies mapped
   */
  taskGraph: Map<string, ParallelTaskInfo>;

  /**
   * Groups of tasks that can run in parallel
   */
  parallelGroups: TaskGroup[];

  /**
   * Tasks that must run sequentially
   */
  sequentialTasks: string[];

  /**
   * Detected circular dependencies
   */
  circularDependencies: string[][];

  /**
   * Potential conflicts between tasks
   */
  potentialConflicts: TaskConflict[];

  /**
   * Recommended execution order
   */
  executionOrder: string[][];

  /**
   * Analysis metadata
   */
  metadata: AnalysisMetadata;
}

/**
 * Group of tasks that can run in parallel
 */
export interface TaskGroup {
  /**
   * Unique identifier for this group
   */
  id: string;

  /**
   * Tasks in this group
   */
  tasks: string[];

  /**
   * Why these tasks can run together
   */
  reason: string;

  /**
   * Risk level of running these tasks in parallel
   */
  risk: 'low' | 'medium' | 'high';

  /**
   * Confidence score (0-1) for this grouping
   */
  confidence: number;

  /**
   * Estimated total duration if run in parallel
   */
  estimatedDuration?: number;
}

/**
 * Potential conflict between tasks
 */
export interface TaskConflict {
  /**
   * Tasks involved in the conflict
   */
  tasks: string[];

  /**
   * Type of conflict
   */
  type: 'resource' | 'dependency' | 'order' | 'state';

  /**
   * Description of the conflict
   */
  description: string;

  /**
   * Severity of the conflict
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Suggested resolution
   */
  resolution?: string;
}

/**
 * Metadata about the dependency analysis
 */
export interface AnalysisMetadata {
  /**
   * When the analysis was performed
   */
  analyzedAt: string;

  /**
   * How long the analysis took in milliseconds
   */
  analysisDuration: number;

  /**
   * Total number of tasks analyzed
   */
  totalTasks: number;

  /**
   * Number of independent tasks
   */
  independentTasks: number;

  /**
   * Maximum parallel tasks that could run
   */
  maxParallelism: number;

  /**
   * Estimated time savings with parallel execution
   */
  estimatedTimeSaving?: number;

  /**
   * Analysis version/algorithm used
   */
  analysisVersion: string;
}

/**
 * WebSocket message types for parallel execution updates
 */
export type ParallelWebSocketMessage = 
  | ParallelAnalysisUpdate
  | TaskExecutionUpdate
  | ConflictDetected
  | GroupingUpdate;

/**
 * Parallel analysis update message
 */
export interface ParallelAnalysisUpdate {
  type: 'parallelAnalysis';
  analysis: DependencyAnalysis;
  timestamp: string;
}

/**
 * Task execution status update
 */
export interface TaskExecutionUpdate {
  type: 'taskExecution';
  taskId: string;
  status: TaskExecutionStatus;
  timestamp: string;
}

/**
 * Conflict detected message
 */
export interface ConflictDetected {
  type: 'conflictDetected';
  conflict: TaskConflict;
  timestamp: string;
}

/**
 * Task grouping update
 */
export interface GroupingUpdate {
  type: 'groupingUpdate';
  groups: TaskGroup[];
  timestamp: string;
}

/**
 * Smart suggestion for parallel execution
 */
export interface ParallelSuggestion {
  /**
   * Type of suggestion
   */
  type: 'safe' | 'risky' | 'sequential';

  /**
   * Recommended task groups
   */
  taskGroups: TaskGroup[];

  /**
   * Explanation of the suggestion
   */
  reason: string;

  /**
   * Confidence in this suggestion (0-1)
   */
  confidence: number;

  /**
   * Alternative suggestions
   */
  alternatives?: ParallelSuggestion[];

  /**
   * Expected benefits
   */
  benefits: string[];

  /**
   * Potential risks
   */
  risks: string[];
}

/**
 * Basic task interface for agents
 */
export interface Task {
  id: string;
  description: string;
  files?: string[];
  context?: any;
  status?: 'pending' | 'in-progress' | 'completed';
}

/**
 * Result of task execution
 */
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