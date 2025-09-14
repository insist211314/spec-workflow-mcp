/**
 * Dynamic Adaptive Executor for Parallel Task Execution
 * Adjusts execution strategy based on runtime conditions and learning
 */

import { ParallelTaskInfo, TaskGroup, ExecutionResult } from '../types.js';
import { SmartSuggestionSystem, ParallelRecommendation } from '../intelligence/suggestion-system.js';
import { PatternRecognitionEngine } from '../intelligence/pattern-recognition.js';
import { RiskAssessor, RiskAssessment } from '../intelligence/risk-assessor.js';
import { SmartConflictDetector } from '../conflicts/smart-detector.js';
import { ParallelExecutor } from '../executors/parallel-executor.js';

export interface PerformanceMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  parallelEfficiencyGain: number; // Percentage improvement over sequential
  conflictRate: number;
  userSatisfactionScore: number; // Based on user feedback
  adaptationAccuracy: number; // How often adaptations improved outcomes
}

export interface AdaptationTrigger {
  type: 'performance_degradation' | 'conflict_increase' | 'pattern_change' | 'user_feedback' | 'environmental_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: number;
  metrics: any;
}

export interface ExecutionStrategy {
  id: string;
  name: string;
  description: string;
  maxParallelTasks: number;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  conflictHandling: 'avoid' | 'detect_and_resolve' | 'monitor';
  adaptationRate: number; // How quickly to adapt (0-1)
  conditions: StrategyCondition[];
}

export interface StrategyCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  weight: number;
}

export interface AdaptationResult {
  previousStrategy: string;
  newStrategy: string;
  reason: string;
  expectedImprovement: number;
  actualImprovement?: number;
  adaptedAt: number;
  success: boolean;
}

export class AdaptiveExecutor {
  private suggestionSystem: SmartSuggestionSystem;
  private patternEngine: PatternRecognitionEngine;
  private riskAssessor: RiskAssessor;
  private conflictDetector: SmartConflictDetector;
  private parallelExecutor: ParallelExecutor;

  private performance: PerformanceMetrics;
  private currentStrategy: ExecutionStrategy;
  private availableStrategies: Map<string, ExecutionStrategy>;
  private adaptationHistory: AdaptationResult[];
  private triggerThresholds: Map<string, number>;

  // Note: Performance collection is disabled per requirements
  // We only track success/failure rates for adaptation decisions
  private readonly collectMetrics = false;

  constructor(initialConfig: any) {
    this.suggestionSystem = new SmartSuggestionSystem();
    this.patternEngine = new PatternRecognitionEngine();
    this.riskAssessor = new RiskAssessor();
    this.conflictDetector = new SmartConflictDetector();
    this.parallelExecutor = new ParallelExecutor(initialConfig);

    this.performance = this.initializePerformanceMetrics();
    this.availableStrategies = new Map();
    this.adaptationHistory = [];
    this.triggerThresholds = new Map();

    this.initializeStrategies();
    this.initializeTriggerThresholds();
    this.currentStrategy = this.availableStrategies.get('balanced')!;
  }

  /**
   * Execute tasks with adaptive strategy selection
   */
  async executeWithAdaptation(
    tasks: ParallelTaskInfo[],
    projectPath: string
  ): Promise<{ results: ExecutionResult[]; adaptations: AdaptationResult[] }> {
    const startTime = Date.now();
    const adaptationsMade: AdaptationResult[] = [];

    try {
      // Pre-execution analysis and strategy selection
      const preExecutionStrategy = await this.selectOptimalStrategy(tasks);
      if (preExecutionStrategy.id !== this.currentStrategy.id) {
        const adaptation = await this.adaptStrategy(preExecutionStrategy, 'pre_execution_optimization');
        adaptationsMade.push(adaptation);
      }

      // Execute with monitoring and potential runtime adaptations
      const results = await this.executeWithMonitoring(tasks, projectPath, adaptationsMade);

      // Post-execution learning and strategy adjustment
      await this.learnFromExecution(tasks, results, adaptationsMade);

      return { results, adaptations: adaptationsMade };

    } catch (error) {
      // Handle execution failure and adapt if necessary
      await this.handleExecutionFailure(error as Error, tasks, adaptationsMade);
      throw error;
    }
  }

  /**
   * Dynamically adjust parallelism based on runtime conditions
   */
  async adjustParallelism(currentExecution: any): Promise<void> {
    // Check if adjustment is needed based on success/failure patterns only
    // (No performance metrics collection as per requirement)

    const recentResults = this.getRecentExecutionResults(10);
    const successRate = this.calculateSuccessRate(recentResults);

    if (successRate < 0.7) {
      // Reduce parallelism for stability
      await this.reduceParallelism('low_success_rate');
    } else if (successRate > 0.9 && this.currentStrategy.maxParallelTasks < 3) {
      // Increase parallelism if we're being too conservative
      await this.increaseParallelism('high_success_rate');
    }
  }

  /**
   * Rebalance task allocation during execution
   */
  async rebalanceTasks(tasks: ParallelTaskInfo[]): Promise<TaskGroup[]> {
    // Get current recommendation
    const recommendation = await this.suggestionSystem.analyzeTasks(tasks);

    // Apply current strategy constraints
    const constrainedGroups = this.applyStrategyConstraints(
      recommendation.safeParallelGroups,
      this.currentStrategy
    );

    return constrainedGroups;
  }

  /**
   * Handle task failure with adaptive response
   */
  async handleTaskFailure(failedTask: ParallelTaskInfo, error: Error): Promise<void> {
    const adaptation = await this.analyzeFailureAndAdapt(failedTask, error);

    if (adaptation) {
      this.adaptationHistory.push(adaptation);

      // Apply adaptation immediately for remaining tasks
      await this.applyAdaptation(adaptation);
    }
  }

  /**
   * Select optimal strategy based on current context
   */
  private async selectOptimalStrategy(tasks: ParallelTaskInfo[]): Promise<ExecutionStrategy> {
    // Analyze tasks
    const recommendation = await this.suggestionSystem.analyzeTasks(tasks);
    const riskAssessment = this.riskAssessor.assessParallelRisk({
      tasks,
      dependencyAnalysis: {} as any, // Would be populated in real implementation
      patternMatches: [],
      executionHistory: []
    });

    // Select strategy based on risk and recommendation
    return this.selectStrategyByRiskAndRecommendation(recommendation, riskAssessment);
  }

  private selectStrategyByRiskAndRecommendation(
    recommendation: ParallelRecommendation,
    riskAssessment: RiskAssessment
  ): ExecutionStrategy {
    if (riskAssessment.overallRisk === 'critical' || riskAssessment.overallRisk === 'high') {
      return this.availableStrategies.get('conservative')!;
    }

    if (recommendation.recommendation === 'parallel-safe' && riskAssessment.overallRisk === 'low') {
      return this.availableStrategies.get('aggressive')!;
    }

    return this.availableStrategies.get('balanced')!;
  }

  /**
   * Execute with runtime monitoring and adaptation
   */
  private async executeWithMonitoring(
    tasks: ParallelTaskInfo[],
    projectPath: string,
    adaptations: AdaptationResult[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    let currentTasks = [...tasks];

    // Monitor execution and adapt if needed
    const monitoringInterval = setInterval(async () => {
      const triggers = await this.detectAdaptationTriggers();

      for (const trigger of triggers) {
        if (trigger.severity === 'high' || trigger.severity === 'critical') {
          const adaptation = await this.respondToTrigger(trigger);
          if (adaptation) {
            adaptations.push(adaptation);
            clearInterval(monitoringInterval);
            break;
          }
        }
      }
    }, 5000); // Check every 5 seconds

    try {
      // Execute with current strategy
      const executionResults = await this.parallelExecutor.executeParallel(currentTasks, projectPath);
      results.push(...executionResults);

    } finally {
      clearInterval(monitoringInterval);
    }

    return results;
  }

  /**
   * Learn from execution results to improve future decisions
   */
  private async learnFromExecution(
    tasks: ParallelTaskInfo[],
    results: ExecutionResult[],
    adaptations: AdaptationResult[]
  ): Promise<void> {
    // Update success rates (only metric we track per requirements)
    this.updateSuccessMetrics(results);

    // Learn patterns from successful/failed executions
    const patternMatches = this.patternEngine.identifyPatterns(tasks);
    const executionHistory = {
      taskPatterns: patternMatches.map(m => m.pattern.id),
      parallelSuccess: results.every(r => r.success),
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      conflicts: results.filter(r => !r.success).map(r => r.error || 'unknown'),
      timestamp: Date.now()
    };

    this.patternEngine.learnFromExecution(tasks, patternMatches, executionHistory);
    this.suggestionSystem.recordExecution(executionHistory);

    // Evaluate adaptation success
    for (const adaptation of adaptations) {
      adaptation.actualImprovement = this.evaluateAdaptationSuccess(adaptation, results);
      adaptation.success = adaptation.actualImprovement > 0;
    }
  }

  /**
   * Detect triggers for strategy adaptation
   */
  private async detectAdaptationTriggers(): Promise<AdaptationTrigger[]> {
    const triggers: AdaptationTrigger[] = [];

    // Check success rate degradation
    const recentResults = this.getRecentExecutionResults(5);
    const successRate = this.calculateSuccessRate(recentResults);

    if (successRate < this.triggerThresholds.get('min_success_rate')!) {
      triggers.push({
        type: 'performance_degradation',
        severity: successRate < 0.5 ? 'critical' : 'high',
        description: `Success rate dropped to ${(successRate * 100).toFixed(1)}%`,
        detectedAt: Date.now(),
        metrics: { successRate }
      });
    }

    // Check conflict rate increase
    const conflictRate = this.calculateConflictRate(recentResults);
    if (conflictRate > this.triggerThresholds.get('max_conflict_rate')!) {
      triggers.push({
        type: 'conflict_increase',
        severity: conflictRate > 0.3 ? 'high' : 'medium',
        description: `Conflict rate increased to ${(conflictRate * 100).toFixed(1)}%`,
        detectedAt: Date.now(),
        metrics: { conflictRate }
      });
    }

    return triggers;
  }

  /**
   * Respond to adaptation triggers
   */
  private async respondToTrigger(trigger: AdaptationTrigger): Promise<AdaptationResult | null> {
    switch (trigger.type) {
      case 'performance_degradation':
        return await this.adaptForPerformance(trigger);

      case 'conflict_increase':
        return await this.adaptForConflicts(trigger);

      default:
        return null;
    }
  }

  private async adaptForPerformance(trigger: AdaptationTrigger): Promise<AdaptationResult> {
    const conservativeStrategy = this.availableStrategies.get('conservative')!;
    return await this.adaptStrategy(conservativeStrategy, trigger.description);
  }

  private async adaptForConflicts(trigger: AdaptationTrigger): Promise<AdaptationResult> {
    // Switch to conflict-avoiding strategy
    const safeStrategy = this.availableStrategies.get('conservative')!;
    return await this.adaptStrategy(safeStrategy, trigger.description);
  }

  /**
   * Adapt to a new strategy
   */
  private async adaptStrategy(newStrategy: ExecutionStrategy, reason: string): Promise<AdaptationResult> {
    const previousStrategy = this.currentStrategy.id;

    const adaptation: AdaptationResult = {
      previousStrategy,
      newStrategy: newStrategy.id,
      reason,
      expectedImprovement: this.calculateExpectedImprovement(this.currentStrategy, newStrategy),
      adaptedAt: Date.now(),
      success: false // Will be updated after evaluation
    };

    this.currentStrategy = newStrategy;
    await this.applyAdaptation(adaptation);

    return adaptation;
  }

  private async applyAdaptation(adaptation: AdaptationResult): Promise<void> {
    // Apply the new strategy settings
    const strategy = this.availableStrategies.get(adaptation.newStrategy)!;

    // Update executor configuration
    // This would update the parallel executor's configuration
    console.log(`Applied adaptation: ${adaptation.previousStrategy} → ${adaptation.newStrategy} (${adaptation.reason})`);
  }

  private async reduceParallelism(reason: string): Promise<void> {
    if (this.currentStrategy.maxParallelTasks > 1) {
      const newStrategy = { ...this.currentStrategy };
      newStrategy.maxParallelTasks = Math.max(1, newStrategy.maxParallelTasks - 1);
      newStrategy.id = `${newStrategy.id}-reduced`;

      await this.adaptStrategy(newStrategy, reason);
    }
  }

  private async increaseParallelism(reason: string): Promise<void> {
    if (this.currentStrategy.maxParallelTasks < 3) { // Hard limit per requirements
      const newStrategy = { ...this.currentStrategy };
      newStrategy.maxParallelTasks = Math.min(3, newStrategy.maxParallelTasks + 1);
      newStrategy.id = `${newStrategy.id}-increased`;

      await this.adaptStrategy(newStrategy, reason);
    }
  }

  // Helper methods

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      averageExecutionTime: 0,
      parallelEfficiencyGain: 0,
      conflictRate: 0,
      userSatisfactionScore: 0.5,
      adaptationAccuracy: 0.5
    };
  }

  private initializeStrategies(): void {
    this.availableStrategies.set('conservative', {
      id: 'conservative',
      name: 'Conservative Strategy',
      description: 'Prioritizes safety over speed',
      maxParallelTasks: 1,
      riskTolerance: 'conservative',
      conflictHandling: 'avoid',
      adaptationRate: 0.1,
      conditions: [
        { metric: 'success_rate', operator: 'gte', value: 0.95, weight: 1.0 }
      ]
    });

    this.availableStrategies.set('balanced', {
      id: 'balanced',
      name: 'Balanced Strategy',
      description: 'Balances safety and performance',
      maxParallelTasks: 2,
      riskTolerance: 'balanced',
      conflictHandling: 'detect_and_resolve',
      adaptationRate: 0.3,
      conditions: [
        { metric: 'success_rate', operator: 'gte', value: 0.8, weight: 0.7 },
        { metric: 'conflict_rate', operator: 'lte', value: 0.2, weight: 0.3 }
      ]
    });

    this.availableStrategies.set('aggressive', {
      id: 'aggressive',
      name: 'Aggressive Strategy',
      description: 'Maximizes parallel execution for speed',
      maxParallelTasks: 3,
      riskTolerance: 'aggressive',
      conflictHandling: 'monitor',
      adaptationRate: 0.5,
      conditions: [
        { metric: 'success_rate', operator: 'gte', value: 0.9, weight: 0.5 },
        { metric: 'conflict_rate', operator: 'lte', value: 0.1, weight: 0.5 }
      ]
    });
  }

  private initializeTriggerThresholds(): void {
    this.triggerThresholds.set('min_success_rate', 0.7);
    this.triggerThresholds.set('max_conflict_rate', 0.25);
    this.triggerThresholds.set('max_adaptation_frequency', 5); // per hour
  }

  private getRecentExecutionResults(count: number): any[] {
    // This would retrieve recent execution results from storage
    // For now, return empty array
    return [];
  }

  private calculateSuccessRate(results: any[]): number {
    if (results.length === 0) return 0.5; // Default assumption

    const successful = results.filter(r => r.success).length;
    return successful / results.length;
  }

  private calculateConflictRate(results: any[]): number {
    if (results.length === 0) return 0;

    const withConflicts = results.filter(r => r.conflicts && r.conflicts.length > 0).length;
    return withConflicts / results.length;
  }

  private updateSuccessMetrics(results: ExecutionResult[]): void {
    this.performance.totalExecutions++;

    const successCount = results.filter(r => r.success).length;
    if (successCount === results.length) {
      this.performance.successfulExecutions++;
    }
  }

  private calculateExpectedImprovement(current: ExecutionStrategy, target: ExecutionStrategy): number {
    // Simple heuristic based on strategy characteristics
    if (target.riskTolerance === 'conservative' && current.riskTolerance !== 'conservative') {
      return 0.2; // Expected 20% improvement in reliability
    }
    if (target.maxParallelTasks > current.maxParallelTasks) {
      return 0.3; // Expected 30% improvement in speed
    }
    return 0.1; // Default modest improvement
  }

  private evaluateAdaptationSuccess(adaptation: AdaptationResult, results: ExecutionResult[]): number {
    // Evaluate whether the adaptation actually improved outcomes
    const successRate = results.filter(r => r.success).length / results.length;

    // Compare against historical average (simplified)
    const historicalAverage = this.performance.totalExecutions > 0
      ? this.performance.successfulExecutions / this.performance.totalExecutions
      : 0.5;

    return successRate - historicalAverage;
  }

  private applyStrategyConstraints(groups: TaskGroup[], strategy: ExecutionStrategy): TaskGroup[] {
    // Apply strategy constraints to task groups
    return groups
      .filter(group => group.risk === 'low' || strategy.riskTolerance !== 'conservative')
      .slice(0, Math.ceil(strategy.maxParallelTasks / 2)) // Limit number of groups
      .map(group => ({
        ...group,
        tasks: group.tasks.slice(0, strategy.maxParallelTasks) // Limit tasks per group
      }));
  }

  private async handleExecutionFailure(error: Error, tasks: ParallelTaskInfo[], adaptations: AdaptationResult[]): Promise<void> {
    // Record the failure for learning
    console.error('Execution failed:', error.message);

    // If this was a parallel execution failure, try adapting to a more conservative strategy
    if (this.currentStrategy.id !== 'conservative') {
      const conservativeStrategy = this.availableStrategies.get('conservative')!;
      const adaptation = await this.adaptStrategy(conservativeStrategy, `Execution failure: ${error.message}`);
      adaptations.push(adaptation);
    }
  }

  private async analyzeFailureAndAdapt(failedTask: ParallelTaskInfo, error: Error): Promise<AdaptationResult | null> {
    // Analyze the failure and determine if adaptation is needed
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('conflict') || errorMessage.includes('resource')) {
      // Switch to more conservative strategy
      const conservativeStrategy = this.availableStrategies.get('conservative')!;
      return await this.adaptStrategy(conservativeStrategy, `Task failure: ${error.message}`);
    }

    return null;
  }

  // Public API

  getCurrentStrategy(): ExecutionStrategy {
    return this.currentStrategy;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performance };
  }

  getAdaptationHistory(): AdaptationResult[] {
    return [...this.adaptationHistory];
  }

  setStrategy(strategyId: string): boolean {
    const strategy = this.availableStrategies.get(strategyId);
    if (strategy) {
      this.currentStrategy = strategy;
      return true;
    }
    return false;
  }
}