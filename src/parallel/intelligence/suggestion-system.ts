/**
 * Smart Suggestion System for Parallel Execution
 * Provides intelligent recommendations for task parallelization
 */

import { ParallelTaskInfo, TaskGroup, DependencyAnalysis, ParallelSuggestion } from '../types.js';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';

export interface ParallelRecommendation {
  recommendation: 'sequential' | 'parallel-safe' | 'parallel-risky';
  safeParallelGroups: TaskGroup[];
  risks: Risk[];
  confidence: number;
  estimatedTimeSaved?: string;
  reasoning: string[];
}

export interface Risk {
  type: 'dependency' | 'resource' | 'complexity' | 'stability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  parallelizability: 'safe' | 'risky' | 'unsafe';
  confidence: number;
}

export interface ExecutionHistory {
  taskPatterns: string[];
  parallelSuccess: boolean;
  duration: number;
  conflicts: string[];
  timestamp: number;
}

export class SmartSuggestionSystem {
  private dependencyAnalyzer: DependencyAnalyzer;
  private patterns: Map<string, Pattern>;
  private executionHistory: ExecutionHistory[];
  private maxHistorySize: number = 100;

  constructor() {
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.patterns = new Map();
    this.executionHistory = [];
    this.initializePatterns();
  }

  async analyzeTasks(tasks: ParallelTaskInfo[]): Promise<ParallelRecommendation> {
    // Step 1: Basic dependency analysis
    const dependencyAnalysis = await this.dependencyAnalyzer.analyzeDependencies(tasks);

    // Step 2: Pattern recognition
    const detectedPatterns = this.detectPatterns(tasks);

    // Step 3: Risk assessment
    const risks = this.calculateRiskScore(tasks, dependencyAnalysis, detectedPatterns);

    // Step 4: Learn from history
    const historicalInsights = this.analyzeHistoricalPatterns(tasks);

    // Step 5: Generate recommendation
    const recommendation = this.generateRecommendation(
      tasks,
      dependencyAnalysis,
      detectedPatterns,
      risks,
      historicalInsights
    );

    return recommendation;
  }

  private generateRecommendation(
    tasks: ParallelTaskInfo[],
    analysis: DependencyAnalysis,
    patterns: Pattern[],
    risks: Risk[],
    historicalInsights: any
  ): ParallelRecommendation {
    const confidence = this.calculateConfidence(patterns, risks, historicalInsights);
    const safeGroups = this.identifySafeParallelGroups(analysis, patterns);
    const reasoning = this.generateReasoning(tasks, analysis, patterns, risks);

    // Determine recommendation type
    let recommendationType: 'sequential' | 'parallel-safe' | 'parallel-risky';

    if (safeGroups.length === 0 || confidence < 0.3) {
      recommendationType = 'sequential';
    } else if (confidence > 0.8 && risks.every(r => r.severity !== 'critical' && r.severity !== 'high')) {
      recommendationType = 'parallel-safe';
    } else {
      recommendationType = 'parallel-risky';
    }

    // Calculate time savings estimate
    const estimatedTimeSaved = this.calculateTimeSavings(tasks, safeGroups);

    return {
      recommendation: recommendationType,
      safeParallelGroups: safeGroups,
      risks,
      confidence,
      estimatedTimeSaved,
      reasoning
    };
  }

  private calculateRiskScore(
    tasks: ParallelTaskInfo[],
    analysis: DependencyAnalysis,
    patterns: Pattern[]
  ): Risk[] {
    const risks: Risk[] = [];

    // Check for circular dependencies
    if (analysis.circularDependencies.length > 0) {
      risks.push({
        type: 'dependency',
        severity: 'critical',
        description: `Circular dependencies detected: ${analysis.circularDependencies.join(', ')}`,
        mitigation: 'Break circular dependencies before attempting parallel execution'
      });
    }

    // Check for resource conflicts
    const resourceConflicts = this.detectResourceConflicts(tasks);
    if (resourceConflicts.length > 0) {
      risks.push({
        type: 'resource',
        severity: 'high',
        description: `Resource conflicts detected: ${resourceConflicts.join(', ')}`,
        mitigation: 'Use resource allocation strategy or execute conflicting tasks sequentially'
      });
    }

    // Check pattern-based risks
    const riskyPatterns = patterns.filter(p => p.parallelizability === 'unsafe' || p.parallelizability === 'risky');
    riskyPatterns.forEach(pattern => {
      risks.push({
        type: 'complexity',
        severity: pattern.parallelizability === 'unsafe' ? 'high' : 'medium',
        description: `Pattern detected: ${pattern.description}`,
        mitigation: 'Consider sequential execution for this task type'
      });
    });

    // Check task complexity
    const complexTasks = tasks.filter(task =>
      task.description.length > 500 ||
      (task.resources && task.resources.length > 5)
    );
    if (complexTasks.length > 0) {
      risks.push({
        type: 'complexity',
        severity: 'medium',
        description: `${complexTasks.length} tasks appear highly complex`,
        mitigation: 'Monitor these tasks closely during parallel execution'
      });
    }

    return risks;
  }

  private detectPatterns(tasks: ParallelTaskInfo[]): Pattern[] {
    const detectedPatterns: Pattern[] = [];

    for (const task of tasks) {
      for (const pattern of this.patterns.values()) {
        if (this.taskMatchesPattern(task, pattern)) {
          detectedPatterns.push(pattern);
        }
      }
    }

    return detectedPatterns;
  }

  private taskMatchesPattern(task: ParallelTaskInfo, pattern: Pattern): boolean {
    const taskDescription = task.description.toLowerCase();
    return pattern.indicators.some(indicator =>
      taskDescription.includes(indicator.toLowerCase())
    );
  }

  private identifySafeParallelGroups(
    analysis: DependencyAnalysis,
    patterns: Pattern[]
  ): TaskGroup[] {
    const safeGroups: TaskGroup[] = [];
    const safePatterns = patterns.filter(p => p.parallelizability === 'safe');

    // Only include groups with high confidence and safe patterns
    for (const group of analysis.parallelGroups) {
      if (group.confidence > 0.8 && group.risk === 'low') {
        // Check if all tasks in group match safe patterns
        const allTasksSafe = safePatterns.length > 0; // For now, simplified logic

        if (allTasksSafe || group.confidence > 0.9) {
          safeGroups.push(group);
        }
      }
    }

    // Limit to maximum 3 parallel tasks as per requirements
    return safeGroups.filter(group => group.tasks.length <= 3);
  }

  private calculateConfidence(
    patterns: Pattern[],
    risks: Risk[],
    historicalInsights: any
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for safe patterns
    const safePatterns = patterns.filter(p => p.parallelizability === 'safe');
    confidence += safePatterns.length * 0.1;

    // Reduce confidence for risks
    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    const highRisks = risks.filter(r => r.severity === 'high').length;

    confidence -= criticalRisks * 0.3;
    confidence -= highRisks * 0.2;

    // Factor in historical success
    if (historicalInsights.successRate > 0.8) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateReasoning(
    tasks: ParallelTaskInfo[],
    analysis: DependencyAnalysis,
    patterns: Pattern[],
    risks: Risk[]
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Analyzed ${tasks.length} tasks for parallel execution opportunities`);

    if (analysis.parallelGroups.length > 0) {
      reasoning.push(`Found ${analysis.parallelGroups.length} potential parallel groups`);
    } else {
      reasoning.push('No safe parallel groups identified');
    }

    if (patterns.length > 0) {
      const safePatterns = patterns.filter(p => p.parallelizability === 'safe').length;
      const riskyPatterns = patterns.filter(p => p.parallelizability === 'risky').length;
      reasoning.push(`Detected ${safePatterns} safe patterns and ${riskyPatterns} risky patterns`);
    }

    if (risks.length > 0) {
      const criticalRisks = risks.filter(r => r.severity === 'critical').length;
      if (criticalRisks > 0) {
        reasoning.push(`⚠️ ${criticalRisks} critical risks identified - sequential execution recommended`);
      } else {
        reasoning.push(`${risks.length} risks identified but manageable with proper monitoring`);
      }
    } else {
      reasoning.push('No significant risks detected for parallel execution');
    }

    return reasoning;
  }

  private calculateTimeSavings(tasks: ParallelTaskInfo[], groups: TaskGroup[]): string | undefined {
    if (groups.length === 0) return undefined;

    const totalSequentialTime = tasks.reduce((sum, task) =>
      sum + (task.estimatedDuration || 5000), 0
    );

    const parallelTime = groups.reduce((maxTime, group) => {
      const groupTime = Math.max(...group.tasks.map(taskId => {
        const task = tasks.find(t => t.id === taskId);
        return task?.estimatedDuration || 5000;
      }));
      return maxTime + groupTime;
    }, 0);

    const timeSaved = totalSequentialTime - parallelTime;
    const percentage = Math.round((timeSaved / totalSequentialTime) * 100);

    if (timeSaved > 0) {
      const minutes = Math.round(timeSaved / 60000);
      return `~${minutes} minutes (${percentage}% faster)`;
    }

    return undefined;
  }

  private detectResourceConflicts(tasks: ParallelTaskInfo[]): string[] {
    const resourceMap = new Map<string, string[]>();
    const conflicts: string[] = [];

    // Build resource usage map
    tasks.forEach(task => {
      if (task.resources) {
        task.resources.forEach(resource => {
          const users = resourceMap.get(resource) || [];
          users.push(task.id);
          resourceMap.set(resource, users);
        });
      }
    });

    // Identify conflicts
    resourceMap.forEach((users, resource) => {
      if (users.length > 1) {
        conflicts.push(`${resource} (used by: ${users.join(', ')})`);
      }
    });

    return conflicts;
  }

  private analyzeHistoricalPatterns(tasks: ParallelTaskInfo[]): any {
    // Simplified historical analysis
    const recentHistory = this.executionHistory.slice(-10);
    const successRate = recentHistory.length > 0
      ? recentHistory.filter(h => h.parallelSuccess).length / recentHistory.length
      : 0.5;

    return {
      successRate,
      recentExecutions: recentHistory.length,
      commonPatterns: this.findCommonPatterns(recentHistory)
    };
  }

  private findCommonPatterns(history: ExecutionHistory[]): string[] {
    const patternCounts = new Map<string, number>();

    history.forEach(execution => {
      execution.taskPatterns.forEach(pattern => {
        patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      });
    });

    return Array.from(patternCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([pattern, _]) => pattern);
  }

  // Learning methods
  recordExecution(result: ExecutionHistory): void {
    this.executionHistory.push(result);

    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  private initializePatterns(): void {
    // Initialize common task patterns
    const commonPatterns: Pattern[] = [
      {
        id: 'file-operations',
        name: 'File Operations',
        description: 'Tasks that primarily involve file system operations',
        indicators: ['create file', 'update file', 'delete file', 'copy file', 'move file'],
        parallelizability: 'risky',
        confidence: 0.7
      },
      {
        id: 'independent-modules',
        name: 'Independent Modules',
        description: 'Tasks working on separate modules or components',
        indicators: ['component', 'module', 'service', 'utility', 'helper'],
        parallelizability: 'safe',
        confidence: 0.9
      },
      {
        id: 'database-operations',
        name: 'Database Operations',
        description: 'Tasks involving database schema or data changes',
        indicators: ['database', 'schema', 'migration', 'table', 'query'],
        parallelizability: 'unsafe',
        confidence: 0.8
      },
      {
        id: 'test-creation',
        name: 'Test Creation',
        description: 'Creating or updating test files',
        indicators: ['test', 'spec', 'unit test', 'integration test'],
        parallelizability: 'safe',
        confidence: 0.85
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Documentation updates and creation',
        indicators: ['readme', 'documentation', 'docs', 'comment', 'jsdoc'],
        parallelizability: 'safe',
        confidence: 0.9
      },
      {
        id: 'configuration',
        name: 'Configuration Changes',
        description: 'Modifying configuration files',
        indicators: ['config', 'settings', 'environment', 'env', 'package.json'],
        parallelizability: 'risky',
        confidence: 0.6
      }
    ];

    commonPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  // Public API for learning and improvement
  updatePattern(pattern: Pattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  getExecutionHistory(): ExecutionHistory[] {
    return [...this.executionHistory];
  }

  clearHistory(): void {
    this.executionHistory = [];
  }
}