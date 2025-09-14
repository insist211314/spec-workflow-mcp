/**
 * Risk Assessment Module for Parallel Execution
 * Evaluates and quantifies risks associated with parallel task execution
 */

import { ParallelTaskInfo, TaskConflict, DependencyAnalysis } from '../types.js';
import { PatternMatch } from './pattern-recognition.js';

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100, higher is riskier
  specificRisks: Risk[];
  mitigations: Mitigation[];
  recommendation: string;
  confidence: number;
}

export interface Risk {
  id: string;
  type: 'dependency' | 'resource' | 'complexity' | 'stability' | 'data' | 'timing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  likelihood: number; // 0-1
  impact: number; // 0-1
  tasks: string[]; // Affected task IDs
  evidence: string[];
}

export interface Mitigation {
  riskId: string;
  strategy: 'avoidance' | 'reduction' | 'monitoring' | 'contingency';
  description: string;
  effectiveness: number; // 0-1
  cost: 'low' | 'medium' | 'high';
  automated: boolean;
}

export interface RiskContext {
  tasks: ParallelTaskInfo[];
  dependencyAnalysis: DependencyAnalysis;
  patternMatches: PatternMatch[];
  executionHistory?: any[];
  environmentFactors?: EnvironmentFactors;
}

export interface EnvironmentFactors {
  systemLoad: number;
  availableResources: string[];
  currentTime: Date;
  projectComplexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  teamExperience: 'novice' | 'intermediate' | 'expert';
}

export class RiskAssessor {
  private riskThresholds = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90
  };

  private riskWeights = {
    dependency: 0.3,
    resource: 0.25,
    complexity: 0.2,
    stability: 0.15,
    data: 0.07,
    timing: 0.03
  };

  /**
   * Perform comprehensive risk assessment for parallel execution
   */
  assessParallelRisk(context: RiskContext): RiskAssessment {
    const risks = this.identifyRisks(context);
    const riskScore = this.calculateOverallRiskScore(risks);
    const overallRisk = this.categorizeRisk(riskScore);
    const mitigations = this.generateMitigations(risks);
    const recommendation = this.generateRecommendation(overallRisk, risks, mitigations);
    const confidence = this.calculateConfidence(context, risks);

    return {
      overallRisk,
      riskScore,
      specificRisks: risks,
      mitigations,
      recommendation,
      confidence
    };
  }

  /**
   * Identify all potential risks in the given context
   */
  private identifyRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];

    // Dependency risks
    risks.push(...this.assessDependencyRisks(context));

    // Resource conflicts
    risks.push(...this.assessResourceRisks(context));

    // Complexity risks
    risks.push(...this.assessComplexityRisks(context));

    // Stability risks
    risks.push(...this.assessStabilityRisks(context));

    // Data integrity risks
    risks.push(...this.assessDataRisks(context));

    // Timing risks
    risks.push(...this.assessTimingRisks(context));

    return risks.sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));
  }

  /**
   * Assess dependency-related risks
   */
  private assessDependencyRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { dependencyAnalysis, tasks } = context;

    // Circular dependencies
    if (dependencyAnalysis.circularDependencies && dependencyAnalysis.circularDependencies.length > 0) {
      risks.push({
        id: 'circular-dependencies',
        type: 'dependency',
        severity: 'critical',
        description: `Circular dependencies detected: ${dependencyAnalysis.circularDependencies.map(cycle => cycle.join(' → ')).join(', ')}`,
        likelihood: 1.0,
        impact: 0.9,
        tasks: dependencyAnalysis.circularDependencies.flat(),
        evidence: ['Dependency analysis detected cycles', 'Cannot determine execution order']
      });
    }

    // Hidden dependencies
    const hiddenDeps = this.detectHiddenDependencies(tasks);
    if (hiddenDeps.length > 0) {
      risks.push({
        id: 'hidden-dependencies',
        type: 'dependency',
        severity: 'high',
        description: `Potential hidden dependencies detected between tasks`,
        likelihood: 0.7,
        impact: 0.6,
        tasks: hiddenDeps.map(dep => dep.taskId),
        evidence: hiddenDeps.map(dep => dep.evidence)
      });
    }

    // Complex dependency chains
    const complexChains = this.identifyComplexDependencyChains(dependencyAnalysis);
    if (complexChains.length > 0) {
      risks.push({
        id: 'complex-dependency-chains',
        type: 'dependency',
        severity: 'medium',
        description: `Complex dependency chains may lead to cascading failures`,
        likelihood: 0.5,
        impact: 0.7,
        tasks: complexChains.flat(),
        evidence: [`${complexChains.length} dependency chains with 3+ levels detected`]
      });
    }

    return risks;
  }

  /**
   * Assess resource conflict risks
   */
  private assessResourceRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { tasks } = context;

    const resourceMap = new Map<string, string[]>();

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

    // Identify resource conflicts
    const conflicts: Array<{resource: string, tasks: string[]}> = [];
    resourceMap.forEach((users, resource) => {
      if (users.length > 1) {
        conflicts.push({ resource, tasks: users });
      }
    });

    if (conflicts.length > 0) {
      const severity = conflicts.length > 3 ? 'high' : 'medium';
      risks.push({
        id: 'resource-conflicts',
        type: 'resource',
        severity,
        description: `Resource conflicts detected: ${conflicts.map(c => `${c.resource} (${c.tasks.length} tasks)`).join(', ')}`,
        likelihood: 0.8,
        impact: 0.6,
        tasks: conflicts.flatMap(c => c.tasks),
        evidence: conflicts.map(c => `Resource "${c.resource}" used by: ${c.tasks.join(', ')}`)
      });
    }

    // File system risks
    const fileRisks = this.assessFileSystemRisks(tasks);
    if (fileRisks) {
      risks.push(fileRisks);
    }

    return risks;
  }

  /**
   * Assess complexity-related risks
   */
  private assessComplexityRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { tasks, patternMatches } = context;

    // High complexity tasks
    const complexTasks = tasks.filter(task => this.isHighComplexity(task));
    if (complexTasks.length > 0) {
      const severity = complexTasks.length > 2 ? 'high' : 'medium';
      risks.push({
        id: 'high-complexity-tasks',
        type: 'complexity',
        severity,
        description: `${complexTasks.length} high-complexity tasks may be difficult to parallelize safely`,
        likelihood: 0.6,
        impact: 0.5,
        tasks: complexTasks.map(t => t.id),
        evidence: complexTasks.map(t => `Task ${t.id}: ${this.getComplexityReasons(t).join(', ')}`)
      });
    }

    // Pattern complexity risks
    const riskyPatterns = patternMatches.filter(match =>
      match.pattern.parallelizationScore < 0.5 && match.confidence > 0.6
    );
    if (riskyPatterns.length > 0) {
      risks.push({
        id: 'risky-patterns',
        type: 'complexity',
        severity: 'medium',
        description: `Tasks match patterns known to be risky for parallel execution`,
        likelihood: 0.7,
        impact: 0.6,
        tasks: [], // Would need task-pattern mapping
        evidence: riskyPatterns.map(p => `Pattern: ${p.pattern.name} (confidence: ${p.confidence.toFixed(2)})`)
      });
    }

    return risks;
  }

  /**
   * Assess stability risks
   */
  private assessStabilityRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { tasks, executionHistory } = context;

    // Historical failure patterns
    if (executionHistory && executionHistory.length > 0) {
      const recentFailures = executionHistory
        .slice(-10)
        .filter(h => !h.parallelSuccess);

      if (recentFailures.length > 3) {
        risks.push({
          id: 'historical-failures',
          type: 'stability',
          severity: 'high',
          description: `Recent history shows ${recentFailures.length} parallel execution failures`,
          likelihood: 0.8,
          impact: 0.7,
          tasks: tasks.map(t => t.id),
          evidence: [`${recentFailures.length}/10 recent parallel executions failed`]
        });
      }
    }

    // Untested task combinations
    const novelCombination = this.isNovelTaskCombination(tasks, executionHistory || []);
    if (novelCombination) {
      risks.push({
        id: 'untested-combination',
        type: 'stability',
        severity: 'medium',
        description: 'This combination of tasks has not been tested in parallel before',
        likelihood: 0.5,
        impact: 0.4,
        tasks: tasks.map(t => t.id),
        evidence: ['No historical data for this task combination']
      });
    }

    return risks;
  }

  /**
   * Assess data integrity risks
   */
  private assessDataRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { tasks } = context;

    // Database operations
    const dbTasks = tasks.filter(task =>
      task.description.toLowerCase().includes('database') ||
      task.description.toLowerCase().includes('schema') ||
      task.description.toLowerCase().includes('migration')
    );

    if (dbTasks.length > 1) {
      risks.push({
        id: 'concurrent-database-operations',
        type: 'data',
        severity: 'high',
        description: 'Multiple database operations running in parallel may cause data consistency issues',
        likelihood: 0.7,
        impact: 0.8,
        tasks: dbTasks.map(t => t.id),
        evidence: ['Multiple tasks involve database operations']
      });
    }

    // Shared state modifications
    const sharedStateTasks = this.identifySharedStateModifications(tasks);
    if (sharedStateTasks.length > 1) {
      risks.push({
        id: 'shared-state-modifications',
        type: 'data',
        severity: 'medium',
        description: 'Tasks may modify shared state concurrently',
        likelihood: 0.6,
        impact: 0.6,
        tasks: sharedStateTasks.map(t => t.id),
        evidence: ['Tasks appear to modify shared state or global variables']
      });
    }

    return risks;
  }

  /**
   * Assess timing-related risks
   */
  private assessTimingRisks(context: RiskContext): Risk[] {
    const risks: Risk[] = [];
    const { tasks, environmentFactors } = context;

    // Race conditions
    const raceConditionTasks = this.identifyPotentialRaceConditions(tasks);
    if (raceConditionTasks.length > 0) {
      risks.push({
        id: 'race-conditions',
        type: 'timing',
        severity: 'medium',
        description: 'Potential race conditions detected between tasks',
        likelihood: 0.4,
        impact: 0.7,
        tasks: raceConditionTasks.map(t => t.id),
        evidence: ['Tasks may have timing dependencies or race conditions']
      });
    }

    // System load considerations
    if (environmentFactors?.systemLoad && environmentFactors.systemLoad > 0.8) {
      risks.push({
        id: 'high-system-load',
        type: 'timing',
        severity: 'low',
        description: 'High system load may affect parallel execution performance',
        likelihood: 0.6,
        impact: 0.3,
        tasks: tasks.map(t => t.id),
        evidence: [`System load: ${(environmentFactors.systemLoad * 100).toFixed(0)}%`]
      });
    }

    return risks;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(risks: Risk[]): number {
    if (risks.length === 0) return 0;

    let weightedScore = 0;
    let totalWeight = 0;

    for (const risk of risks) {
      const weight = this.riskWeights[risk.type] || 0.1;
      const riskValue = risk.likelihood * risk.impact * this.getSeverityMultiplier(risk.severity);
      weightedScore += riskValue * weight * 100;
      totalWeight += weight;
    }

    return Math.min(100, weightedScore / totalWeight);
  }

  /**
   * Categorize risk based on score
   */
  private categorizeRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= this.riskThresholds.critical) return 'critical';
    if (score >= this.riskThresholds.high) return 'high';
    if (score >= this.riskThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Generate risk mitigations
   */
  private generateMitigations(risks: Risk[]): Mitigation[] {
    const mitigations: Mitigation[] = [];

    for (const risk of risks) {
      const riskMitigations = this.getMitigationsForRisk(risk);
      mitigations.push(...riskMitigations);
    }

    return mitigations;
  }

  /**
   * Get specific mitigations for a risk
   */
  private getMitigationsForRisk(risk: Risk): Mitigation[] {
    const mitigations: Mitigation[] = [];

    switch (risk.id) {
      case 'circular-dependencies':
        mitigations.push({
          riskId: risk.id,
          strategy: 'avoidance',
          description: 'Execute tasks sequentially to avoid circular dependency issues',
          effectiveness: 1.0,
          cost: 'low',
          automated: true
        });
        break;

      case 'resource-conflicts':
        mitigations.push({
          riskId: risk.id,
          strategy: 'reduction',
          description: 'Implement resource allocation queuing to serialize access to conflicted resources',
          effectiveness: 0.8,
          cost: 'medium',
          automated: true
        });
        break;

      case 'high-complexity-tasks':
        mitigations.push({
          riskId: risk.id,
          strategy: 'monitoring',
          description: 'Enhanced monitoring and logging for complex tasks during parallel execution',
          effectiveness: 0.6,
          cost: 'low',
          automated: true
        });
        break;

      case 'concurrent-database-operations':
        mitigations.push({
          riskId: risk.id,
          strategy: 'avoidance',
          description: 'Execute database operations sequentially to maintain data consistency',
          effectiveness: 0.95,
          cost: 'medium',
          automated: true
        });
        break;

      default:
        mitigations.push({
          riskId: risk.id,
          strategy: 'monitoring',
          description: 'Implement enhanced monitoring and rollback capabilities',
          effectiveness: 0.5,
          cost: 'low',
          automated: true
        });
    }

    return mitigations;
  }

  /**
   * Generate overall recommendation
   */
  private generateRecommendation(
    overallRisk: 'low' | 'medium' | 'high' | 'critical',
    risks: Risk[],
    mitigations: Mitigation[]
  ): string {
    switch (overallRisk) {
      case 'critical':
        return 'Parallel execution not recommended. Critical risks detected that could cause system instability or data corruption.';

      case 'high':
        return 'Parallel execution risky. Consider sequential execution or implement comprehensive risk mitigations before proceeding.';

      case 'medium':
        const automaticMitigations = mitigations.filter(m => m.automated && m.effectiveness > 0.6);
        if (automaticMitigations.length >= risks.length * 0.7) {
          return 'Parallel execution possible with automatic risk mitigations. Monitor execution closely.';
        } else {
          return 'Parallel execution requires manual risk assessment. Review and address identified risks.';
        }

      case 'low':
        return 'Parallel execution recommended. Low risk detected with good potential for time savings.';

      default:
        return 'Unable to determine recommendation. Please review risks manually.';
    }
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(context: RiskContext, risks: Risk[]): number {
    let confidence = 0.7; // Base confidence

    // More execution history increases confidence
    if (context.executionHistory && context.executionHistory.length > 10) {
      confidence += 0.2;
    }

    // Pattern matches increase confidence
    if (context.patternMatches.length > 0) {
      const avgPatternConfidence = context.patternMatches.reduce((sum, match) => sum + match.confidence, 0) / context.patternMatches.length;
      confidence += avgPatternConfidence * 0.1;
    }

    // Clear evidence increases confidence
    const evidenceCount = risks.reduce((sum, risk) => sum + risk.evidence.length, 0);
    confidence += Math.min(0.1, evidenceCount * 0.02);

    return Math.min(1, confidence);
  }

  // Helper methods

  private getSeverityMultiplier(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 1.5;
      case 'high': return 2;
      case 'critical': return 3;
    }
  }

  private detectHiddenDependencies(tasks: ParallelTaskInfo[]): Array<{taskId: string, evidence: string}> {
    const hidden: Array<{taskId: string, evidence: string}> = [];

    // Simple heuristic: look for tasks that might have implicit dependencies
    for (const task of tasks) {
      const desc = task.description.toLowerCase();

      // Tasks that mention "after", "before", "depends on"
      if (desc.includes('after') || desc.includes('before') || desc.includes('depends')) {
        hidden.push({
          taskId: task.id,
          evidence: 'Task description contains temporal or dependency keywords'
        });
      }

      // Tasks that modify shared resources
      if (desc.includes('global') || desc.includes('shared') || desc.includes('common')) {
        hidden.push({
          taskId: task.id,
          evidence: 'Task may modify shared resources'
        });
      }
    }

    return hidden;
  }

  private identifyComplexDependencyChains(analysis: DependencyAnalysis): string[][] {
    const chains: string[][] = [];

    // Find chains longer than 2 levels
    for (const level of analysis.executionOrder) {
      if (level.length > 2) {
        chains.push(level);
      }
    }

    return chains;
  }

  private assessFileSystemRisks(tasks: ParallelTaskInfo[]): Risk | null {
    const fileOperations = tasks.filter(task => {
      const desc = task.description.toLowerCase();
      return desc.includes('file') || desc.includes('write') || desc.includes('create') || desc.includes('delete');
    });

    if (fileOperations.length > 1) {
      return {
        id: 'concurrent-file-operations',
        type: 'resource',
        severity: 'medium',
        description: 'Multiple file operations may cause conflicts',
        likelihood: 0.6,
        impact: 0.5,
        tasks: fileOperations.map(t => t.id),
        evidence: ['Multiple tasks involve file system operations']
      };
    }

    return null;
  }

  private isHighComplexity(task: ParallelTaskInfo): boolean {
    return (
      task.description.length > 500 ||
      (task.resources && task.resources.length > 5) ||
      (task.dependencies && task.dependencies.length > 3) ||
      task.description.toLowerCase().includes('complex') ||
      task.description.toLowerCase().includes('difficult')
    );
  }

  private getComplexityReasons(task: ParallelTaskInfo): string[] {
    const reasons: string[] = [];

    if (task.description.length > 500) {
      reasons.push('lengthy description');
    }
    if (task.resources && task.resources.length > 5) {
      reasons.push('many resources');
    }
    if (task.dependencies && task.dependencies.length > 3) {
      reasons.push('many dependencies');
    }

    return reasons;
  }

  private isNovelTaskCombination(tasks: ParallelTaskInfo[], history: any[]): boolean {
    // Simplified: check if this exact combination has been tried before
    const currentSignature = tasks.map(t => t.description).sort().join('|');

    return !history.some(h => {
      const historySignature = (h.taskPatterns || []).sort().join('|');
      return historySignature === currentSignature;
    });
  }

  private identifySharedStateModifications(tasks: ParallelTaskInfo[]): ParallelTaskInfo[] {
    return tasks.filter(task => {
      const desc = task.description.toLowerCase();
      return (
        desc.includes('global') ||
        desc.includes('shared') ||
        desc.includes('state') ||
        desc.includes('singleton') ||
        desc.includes('cache')
      );
    });
  }

  private identifyPotentialRaceConditions(tasks: ParallelTaskInfo[]): ParallelTaskInfo[] {
    return tasks.filter(task => {
      const desc = task.description.toLowerCase();
      return (
        desc.includes('async') ||
        desc.includes('callback') ||
        desc.includes('promise') ||
        desc.includes('event') ||
        desc.includes('timer')
      );
    });
  }
}