/**
 * Example agent implementation to demonstrate the base agent architecture
 * This will be replaced with real agents in later phases
 */

import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import { ParallelTaskInfo } from '../types.js';

/**
 * Example agent that analyzes tasks for parallel execution
 */
export class ExampleAnalyzerAgent extends BaseAgent {
  constructor() {
    super('ExampleAnalyzer', '1.0.0');
    
    // Define capabilities
    this.capabilities = [
      {
        name: 'analyze-dependencies',
        description: 'Analyze task dependencies for parallel execution',
        inputSchema: {
          tasks: 'Array<ParallelTaskInfo>'
        },
        outputSchema: {
          independentTasks: 'string[]',
          dependencyGraph: 'Map<string, string[]>'
        }
      },
      {
        name: 'suggest-grouping',
        description: 'Suggest task groupings for parallel execution',
        inputSchema: {
          tasks: 'Array<ParallelTaskInfo>'
        },
        outputSchema: {
          groups: 'TaskGroup[]'
        }
      }
    ];
  }

  /**
   * Execute the analysis
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      this.log('Starting example analysis', 'info');
      
      if (!context.tasks || context.tasks.length === 0) {
        return {
          success: false,
          error: 'No tasks provided for analysis',
          warnings: ['Context must include tasks array']
        };
      }

      // Simulate analysis work
      const analysisResult = await this.analyzeTasks(context.tasks);
      
      // Simulate compression
      const compressed = this.compress(analysisResult);
      
      return {
        success: true,
        data: compressed,
        compressed: true,
        originalSize: JSON.stringify(analysisResult).length,
        compressedSize: JSON.stringify(compressed).length,
        suggestions: [
          `Found ${analysisResult.independentTasks.length} independent tasks`,
          `Recommend ${analysisResult.suggestedGroups.length} parallel groups`
        ]
      };
      
    } catch (error) {
      this.log(`Analysis failed: ${error}`, 'error');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Analyze tasks for dependencies
   */
  private async analyzeTasks(tasks: ParallelTaskInfo[]): Promise<any> {
    // Simulate async analysis work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find truly independent tasks (no dependencies)
    const independentTasks = tasks
      .filter(task => !task.dependencies || task.dependencies.length === 0)
      .map(task => task.id);
    
    // Build dependency graph
    const dependencyGraph = new Map<string, string[]>();
    tasks.forEach(task => {
      dependencyGraph.set(task.id, task.dependencies || []);
    });
    
    // Suggest groupings
    const suggestedGroups = this.suggestGroups(tasks);
    
    return {
      independentTasks,
      dependencyGraph: Array.from(dependencyGraph.entries()),
      suggestedGroups,
      analysisTimestamp: new Date().toISOString()
    };
  }

  /**
   * Suggest task groupings
   */
  private suggestGroups(tasks: ParallelTaskInfo[]): any[] {
    const groups: any[] = [];
    
    // Group 1: All independent tasks
    const independentTasks = tasks.filter(t => 
      !t.dependencies || t.dependencies.length === 0
    );
    
    if (independentTasks.length > 0) {
      groups.push({
        id: 'group-independent',
        tasks: independentTasks.map(t => t.id),
        reason: 'These tasks have no dependencies',
        risk: 'low',
        confidence: 0.95
      });
    }
    
    // Group 2: Tasks with common dependencies
    const tasksByDependency = new Map<string, ParallelTaskInfo[]>();
    tasks.forEach(task => {
      if (task.dependencies) {
        const depKey = task.dependencies.sort().join(',');
        if (!tasksByDependency.has(depKey)) {
          tasksByDependency.set(depKey, []);
        }
        tasksByDependency.get(depKey)!.push(task);
      }
    });
    
    tasksByDependency.forEach((taskGroup, depKey) => {
      if (taskGroup.length > 1) {
        groups.push({
          id: `group-common-deps-${groups.length}`,
          tasks: taskGroup.map(t => t.id),
          reason: `These tasks share the same dependencies: ${depKey}`,
          risk: 'medium',
          confidence: 0.8
        });
      }
    });
    
    return groups;
  }

  /**
   * Override compress for custom compression logic
   */
  protected compress(data: any): any {
    // Custom compression for analysis results
    if (data.dependencyGraph && Array.isArray(data.dependencyGraph)) {
      // Only keep non-empty dependencies
      data.dependencyGraph = data.dependencyGraph.filter(
        ([_, deps]: [string, string[]]) => deps && deps.length > 0
      );
    }
    
    // Add compression metadata
    return {
      ...data,
      _compressed: true,
      _compressionMethod: 'example-v1'
    };
  }
}