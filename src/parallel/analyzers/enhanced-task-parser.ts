/**
 * Enhanced task parser with dependency analysis
 * Extends the base task parser to extract dependency information
 */

import { ParsedTask, parseTasksFromMarkdown } from '../../core/task-parser.js';
import { ParallelTaskInfo } from '../types.js';
import { DependencyAnalyzer } from './dependency-analyzer.js';
import { TaskDependencyGraph } from './task-graph.js';

/**
 * Dependency keywords to look for in task descriptions
 */
const DEPENDENCY_KEYWORDS = [
  'depends on',
  'requires',
  'after',
  'needs',
  'wait for',
  'blocked by',
  'prerequisite:',
  'following'
];

/**
 * Resource keywords to identify shared resources
 */
const RESOURCE_KEYWORDS = [
  'modifies',
  'updates',
  'changes',
  'creates',
  'deletes',
  'accesses',
  'uses',
  'reads',
  'writes'
];

/**
 * Enhanced task with parallel execution metadata
 */
export interface EnhancedTaskParserResult {
  tasks: ParallelTaskInfo[];
  dependencyAnalysis: Awaited<ReturnType<DependencyAnalyzer['analyzeDependencies']>>;
  graph: TaskDependencyGraph;
  warnings: string[];
}

/**
 * Enhanced task parser class
 */
export class EnhancedTaskParser {
  private analyzer: DependencyAnalyzer;
  
  constructor() {
    this.analyzer = new DependencyAnalyzer();
  }
  
  /**
   * Parse tasks with dependency analysis
   */
  async parseWithDependencies(content: string): Promise<EnhancedTaskParserResult> {
    // Parse basic tasks
    const baseResult = parseTasksFromMarkdown(content);
    
    // Enhance tasks with dependency information
    const enhancedTasks = this.enhanceTasks(baseResult.tasks, content);
    
    // Analyze dependencies
    const dependencyAnalysis = await this.analyzer.analyzeDependencies(enhancedTasks);
    
    // Build graph
    const graph = this.buildGraph(enhancedTasks);
    
    // Generate warnings
    const warnings = this.generateWarnings(dependencyAnalysis, enhancedTasks);
    
    return {
      tasks: enhancedTasks,
      dependencyAnalysis,
      graph,
      warnings
    };
  }
  
  /**
   * Enhance tasks with parallel execution metadata
   */
  private enhanceTasks(tasks: ParsedTask[], content: string): ParallelTaskInfo[] {
    const enhanced: ParallelTaskInfo[] = [];
    const taskMap = new Map<string, ParsedTask>();
    
    // Build task map for easy lookup
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      taskMap.set(task.description.toLowerCase(), task);
    });
    
    tasks.forEach(task => {
      const dependencies = this.extractDependencies(task, taskMap);
      const resources = this.extractResources(task);
      const estimatedDuration = this.estimateDuration(task);
      const priority = this.calculatePriority(task);
      const tags = this.extractTags(task);
      
      const enhancedTask: ParallelTaskInfo = {
        ...task,
        parallelSafe: dependencies.length === 0,
        dependencies,
        resources,
        estimatedDuration,
        priority,
        tags,
        leverage: task.leverage,
        requirements: task.requirements?.join(', ')
      };
      
      enhanced.push(enhancedTask);
    });
    
    // Add dependents information
    this.addDependents(enhanced);
    
    return enhanced;
  }
  
  /**
   * Extract dependencies from task description and metadata
   */
  private extractDependencies(task: ParsedTask, taskMap: Map<string, ParsedTask>): string[] {
    const dependencies: Set<string> = new Set();
    const text = task.description.toLowerCase();
    
    // Check for explicit dependency keywords
    DEPENDENCY_KEYWORDS.forEach(keyword => {
      const pattern = new RegExp(`${keyword}\\s+(.+?)(?:[,;.]|$)`, 'gi');
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        const depText = match[1].trim();
        
        // Try to find matching task
        const matchedTask = this.findMatchingTask(depText, taskMap);
        if (matchedTask) {
          dependencies.add(matchedTask.id);
        } else {
          // Try to extract task ID directly (e.g., "task 1.2", "#3")
          const idMatch = depText.match(/(?:task\s+)?(\d+(?:\.\d+)?)/);
          if (idMatch) {
            dependencies.add(idMatch[1]);
          }
        }
      }
    });
    
    // Check for parent task dependency (hierarchical)
    if (task.id.includes('.')) {
      const parentId = task.id.substring(0, task.id.lastIndexOf('.'));
      if (taskMap.has(parentId)) {
        dependencies.add(parentId);
      }
    }
    
    // Check implementation details for dependencies
    if (task.implementationDetails) {
      task.implementationDetails.forEach(detail => {
        const detailLower = detail.toLowerCase();
        DEPENDENCY_KEYWORDS.forEach(keyword => {
          if (detailLower.includes(keyword)) {
            // Extract potential task references
            const taskRefs = detailLower.match(/task\s+(\d+(?:\.\d+)?)/g);
            if (taskRefs) {
              taskRefs.forEach(ref => {
                const id = ref.replace(/task\s+/, '');
                if (taskMap.has(id)) {
                  dependencies.add(id);
                }
              });
            }
          }
        });
      });
    }
    
    return Array.from(dependencies);
  }
  
  /**
   * Extract resources from task description
   */
  private extractResources(task: ParsedTask): string[] {
    const resources: Set<string> = new Set();
    
    // Add files as resources
    if (task.files) {
      task.files.forEach(file => resources.add(file));
    }
    
    // Extract from description
    const text = task.description.toLowerCase();
    RESOURCE_KEYWORDS.forEach(keyword => {
      const pattern = new RegExp(`${keyword}\\s+([\\w\\-\\/\\.]+)`, 'gi');
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        resources.add(match[1]);
      }
    });
    
    // Extract from implementation details
    if (task.implementationDetails) {
      task.implementationDetails.forEach(detail => {
        // Look for file paths
        const filePaths = detail.match(/[\w\-\/]+\.\w+/g);
        if (filePaths) {
          filePaths.forEach(path => resources.add(path));
        }
      });
    }
    
    return Array.from(resources);
  }
  
  /**
   * Estimate task duration based on complexity
   */
  private estimateDuration(task: ParsedTask): number {
    let duration = 5000; // Base 5 seconds
    
    // Adjust based on implementation details
    if (task.implementationDetails) {
      duration += task.implementationDetails.length * 2000; // 2s per detail
    }
    
    // Adjust based on files
    if (task.files) {
      duration += task.files.length * 3000; // 3s per file
    }
    
    // Adjust based on description length
    duration += task.description.length * 50; // 50ms per character
    
    // Cap at 5 minutes
    return Math.min(duration, 300000);
  }
  
  /**
   * Calculate task priority
   */
  private calculatePriority(task: ParsedTask): number {
    let priority = 50; // Default medium priority
    
    // Higher priority for header tasks
    if (task.isHeader) {
      priority += 20;
    }
    
    // Higher priority for in-progress tasks
    if (task.inProgress) {
      priority += 30;
    }
    
    // Lower priority for completed tasks
    if (task.completed) {
      priority -= 40;
    }
    
    // Adjust based on task ID (earlier tasks higher priority)
    const idParts = task.id.split('.');
    const mainId = parseInt(idParts[0]);
    if (!isNaN(mainId)) {
      priority -= mainId * 2;
    }
    
    return Math.max(0, Math.min(100, priority));
  }
  
  /**
   * Extract tags from task description
   */
  private extractTags(task: ParsedTask): string[] {
    const tags: Set<string> = new Set();
    
    // Extract hashtags
    const hashtags = task.description.match(/#\w+/g);
    if (hashtags) {
      hashtags.forEach(tag => tags.add(tag.substring(1)));
    }
    
    // Add status as tag
    tags.add(task.status);
    
    // Add type tags
    if (task.isHeader) {
      tags.add('header');
    }
    
    if (task.files && task.files.length > 0) {
      tags.add('file-changes');
    }
    
    if (task.prompt) {
      tags.add('ai-assisted');
    }
    
    return Array.from(tags);
  }
  
  /**
   * Find matching task by text
   */
  private findMatchingTask(text: string, taskMap: Map<string, ParsedTask>): ParsedTask | null {
    // Direct lookup
    if (taskMap.has(text)) {
      return taskMap.get(text)!;
    }
    
    // Fuzzy matching
    for (const [key, task] of taskMap) {
      if (key.includes(text) || text.includes(key)) {
        return task;
      }
    }
    
    return null;
  }
  
  /**
   * Add dependents information to tasks
   */
  private addDependents(tasks: ParallelTaskInfo[]): void {
    const taskMap = new Map<string, ParallelTaskInfo>();
    tasks.forEach(task => taskMap.set(task.id, task));
    
    tasks.forEach(task => {
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          const depTask = taskMap.get(depId);
          if (depTask) {
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
  }
  
  /**
   * Build task dependency graph
   */
  private buildGraph(tasks: ParallelTaskInfo[]): TaskDependencyGraph {
    const graph = new TaskDependencyGraph();
    
    tasks.forEach(task => {
      graph.addCompleteTask(task);
    });
    
    return graph;
  }
  
  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(
    analysis: Awaited<ReturnType<DependencyAnalyzer['analyzeDependencies']>>,
    tasks: ParallelTaskInfo[]
  ): string[] {
    const warnings: string[] = [];
    
    // Warn about circular dependencies
    if (analysis.circularDependencies.length > 0) {
      analysis.circularDependencies.forEach(cycle => {
        warnings.push(`⚠️ Circular dependency detected: ${cycle.join(' → ')}`);
      });
    }
    
    // Warn about critical conflicts
    const criticalConflicts = analysis.potentialConflicts.filter(c => 
      c.severity === 'critical'
    );
    if (criticalConflicts.length > 0) {
      criticalConflicts.forEach(conflict => {
        warnings.push(`⚠️ Critical conflict: ${conflict.description}`);
      });
    }
    
    // Warn about tasks with too many dependencies
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 5) {
        warnings.push(`⚠️ Task "${task.id}" has ${task.dependencies.length} dependencies - consider breaking it down`);
      }
    });
    
    // Warn about resource contention
    const resourceUsage = new Map<string, string[]>();
    tasks.forEach(task => {
      if (task.resources) {
        task.resources.forEach(resource => {
          if (!resourceUsage.has(resource)) {
            resourceUsage.set(resource, []);
          }
          resourceUsage.get(resource)!.push(task.id);
        });
      }
    });
    
    resourceUsage.forEach((taskIds, resource) => {
      if (taskIds.length > 3) {
        warnings.push(`⚠️ Resource "${resource}" is accessed by ${taskIds.length} tasks - potential bottleneck`);
      }
    });
    
    return warnings;
  }
}