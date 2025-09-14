/**
 * Type adapter for converting between ParsedTask and ParallelTaskInfo
 * This allows MCP tools to work with existing parallel execution modules
 */

import { ParsedTask } from '../core/task-parser.js';
import { ParallelTaskInfo } from '../parallel/types.js';

/**
 * Convert ParsedTask to ParallelTaskInfo for parallel execution
 */
export function parsedTaskToParallelTask(parsedTask: ParsedTask): ParallelTaskInfo {
  return {
    // Basic TaskInfo properties
    id: parsedTask.id,
    description: parsedTask.description,
    completed: parsedTask.completed,

    // Parallel execution properties
    parallelSafe: !parsedTask.isHeader, // Header tasks are not safe for parallel execution
    dependencies: extractDependencies(parsedTask),
    files: parsedTask.files || [],
    estimatedDuration: estimateTaskDuration(parsedTask),
    resources: extractResources(parsedTask),
    priority: calculatePriority(parsedTask),
    tags: extractTags(parsedTask)
  };
}

/**
 * Convert array of ParsedTask to ParallelTaskInfo array
 */
export function parsedTasksToParallelTasks(parsedTasks: ParsedTask[]): ParallelTaskInfo[] {
  return parsedTasks.map(parsedTaskToParallelTask);
}

/**
 * Extract dependencies from a ParsedTask
 * For now, we infer dependencies based on task hierarchy and requirements
 */
function extractDependencies(task: ParsedTask): string[] {
  const dependencies: string[] = [];

  // If task has requirements, treat them as dependencies
  if (task.requirements) {
    dependencies.push(...task.requirements);
  }

  // For hierarchical tasks, previous tasks at same level or parent level are dependencies
  if (task.id.includes('.')) {
    const parts = task.id.split('.');
    const taskNumber = parseInt(parts[parts.length - 1]);

    if (taskNumber > 1) {
      // Previous sibling task is a dependency
      const siblingParts = [...parts];
      siblingParts[siblingParts.length - 1] = String(taskNumber - 1);
      dependencies.push(siblingParts.join('.'));
    }

    if (parts.length > 1) {
      // Parent task is a dependency
      const parentParts = parts.slice(0, -1);
      dependencies.push(parentParts.join('.'));
    }
  } else {
    // Top-level task - previous top-level task is dependency
    const taskNumber = parseInt(task.id);
    if (taskNumber > 1) {
      dependencies.push(String(taskNumber - 1));
    }
  }

  return dependencies;
}

/**
 * Extract resources from a ParsedTask
 */
function extractResources(task: ParsedTask): string[] {
  const resources: string[] = [];

  // Files are resources
  if (task.files) {
    resources.push(...task.files);
  }

  // Leverage items might be resources
  if (task.leverage) {
    // Leverage is a string, split by comma
    const leverageItems = task.leverage.split(',').map(l => l.trim());
    resources.push(...leverageItems);
  }

  return resources;
}

/**
 * Estimate task duration based on complexity
 */
function estimateTaskDuration(task: ParsedTask): number {
  let duration = 5000; // Base 5 seconds

  // Header tasks take less time
  if (task.isHeader) {
    return 2000;
  }

  // Add time based on implementation details
  if (task.implementationDetails) {
    duration += task.implementationDetails.length * 3000; // 3 seconds per detail
  }

  // Add time based on files to modify
  if (task.files) {
    duration += task.files.length * 2000; // 2 seconds per file
  }

  // Add time based on requirements
  if (task.requirements) {
    duration += task.requirements.length * 1000; // 1 second per requirement
  }

  return Math.min(duration, 30000); // Cap at 30 seconds
}

/**
 * Calculate task priority based on hierarchy and importance
 */
function calculatePriority(task: ParsedTask): number {
  let priority = 50; // Base priority

  // Header tasks have lower priority
  if (task.isHeader) {
    priority -= 20;
  }

  // Higher-level tasks (fewer dots) have higher priority
  const dots = (task.id.match(/\./g) || []).length;
  priority += (3 - dots) * 10;

  // Tasks with more implementation details have higher priority
  if (task.implementationDetails) {
    priority += task.implementationDetails.length * 5;
  }

  return Math.max(1, Math.min(100, priority));
}

/**
 * Extract tags from a ParsedTask
 */
function extractTags(task: ParsedTask): string[] {
  const tags: string[] = [];

  if (task.isHeader) {
    tags.push('header');
  }

  if (task.status === 'completed') {
    tags.push('completed');
  } else if (task.status === 'in-progress') {
    tags.push('in-progress');
  } else {
    tags.push('pending');
  }

  // Add tags based on files
  if (task.files) {
    task.files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) {
        tags.push(ext);
      }
    });
  }

  return tags;
}