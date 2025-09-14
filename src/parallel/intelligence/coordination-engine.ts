/**
 * Smart Coordination Engine
 * Orchestrates all Phase 3 intelligent features for parallel execution
 */

import { ParallelTaskInfo, TaskGroup, DependencyAnalysis } from '../types.js';
import { SmartSuggestionSystem, ParallelRecommendation } from './suggestion-system.js';
import { PatternRecognitionEngine, PatternMatch } from './pattern-recognition.js';
import { RiskAssessor, RiskAssessment, RiskContext } from './risk-assessor.js';
import { SmartConflictDetector, PotentialConflict, ActualConflict } from '../conflicts/smart-detector.js';
import { AdaptiveExecutor } from '../adaptive/dynamic-executor.js';
import { FeedbackSystem } from '../learning/feedback-system.js';
import { UserPreferencesManager, UserPreferences } from '../preferences/user-preferences.js';
import { ExecutionResult } from '../executors/parallel-executor.js';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';

export interface CoordinationContext {
  tasks: ParallelTaskInfo[];
  projectPath: string;
  userPreferences: UserPreferences;
  executionHistory: any[];
  environmentFactors?: any;
}

export interface IntelligentAnalysis {
  recommendation: ParallelRecommendation;
  riskAssessment: RiskAssessment;
  patternMatches: PatternMatch[];
  potentialConflicts: PotentialConflict[];
  adaptationSuggestions: string[];
  confidence: number;
}

export interface ExecutionPlan {
  strategy: 'sequential' | 'parallel-conservative' | 'parallel-balanced' | 'parallel-aggressive';
  taskGroups: TaskGroup[];
  riskMitigations: string[];
  monitoringPoints: string[];
  fallbackOptions: string[];
  estimatedDuration: number;
  confidenceScore: number;
}

export interface CoordinationResult {
  executionResults: ExecutionResult[];
  conflictsEncountered: ActualConflict[];
  adaptationsMade: string[];
  learningData: any;
  userFeedback?: number;
  improvementSuggestions: string[];
}

export class SmartCoordinationEngine {
  private suggestionSystem: SmartSuggestionSystem;
  private patternEngine: PatternRecognitionEngine;
  private riskAssessor: RiskAssessor;
  private conflictDetector: SmartConflictDetector;
  private adaptiveExecutor: AdaptiveExecutor;
  private feedbackSystem: FeedbackSystem;
  private preferencesManager: UserPreferencesManager;
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor() {
    this.suggestionSystem = new SmartSuggestionSystem();
    this.patternEngine = new PatternRecognitionEngine();
    this.riskAssessor = new RiskAssessor();
    this.conflictDetector = new SmartConflictDetector();
    this.adaptiveExecutor = new AdaptiveExecutor({
      mode: 'turbo',
      maxParallelTasks: 3,
      enableSuggestions: true,
      agentTimeout: 30000
    });
    this.feedbackSystem = new FeedbackSystem();
    this.preferencesManager = new UserPreferencesManager();
    this.dependencyAnalyzer = new DependencyAnalyzer();
  }

  /**
   * Perform comprehensive intelligent analysis of tasks
   */
  async analyzeTasksIntelligently(context: CoordinationContext): Promise<IntelligentAnalysis> {
    const { tasks, userPreferences, executionHistory } = context;

    // Step 1: Pattern Recognition
    const patternMatches = this.patternEngine.identifyPatterns(tasks);

    // Step 2: Dependency Analysis for Risk Assessment
    const dependencyAnalysis = await this.dependencyAnalyzer.analyzeDependencies(tasks);

    // Step 3: Risk Assessment
    const riskContext: RiskContext = {
      tasks,
      dependencyAnalysis,
      patternMatches,
      executionHistory,
      environmentFactors: context.environmentFactors
    };
    const riskAssessment = this.riskAssessor.assessParallelRisk(riskContext);

    // Step 4: Smart Suggestion
    const recommendation = await this.suggestionSystem.analyzeTasks(tasks);

    // Step 5: Conflict Prediction
    const conflictContext = {
      tasks,
      patternMatches,
      workingDirectory: context.projectPath,
      executionHistory
    };
    const potentialConflicts = await this.conflictDetector.predictConflicts(conflictContext);

    // Step 5: Adaptation Suggestions
    const adaptationSuggestions = this.generateAdaptationSuggestions(
      recommendation,
      riskAssessment,
      userPreferences
    );

    // Step 6: Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      recommendation,
      riskAssessment,
      patternMatches,
      potentialConflicts
    );

    return {
      recommendation,
      riskAssessment,
      patternMatches,
      potentialConflicts,
      adaptationSuggestions,
      confidence
    };
  }

  /**
   * Create intelligent execution plan
   */
  async createIntelligentExecutionPlan(
    analysis: IntelligentAnalysis,
    context: CoordinationContext
  ): Promise<ExecutionPlan> {
    const { tasks, userPreferences } = context;
    const { recommendation, riskAssessment, potentialConflicts } = analysis;

    // Determine strategy based on analysis and user preferences
    const strategy = this.determineExecutionStrategy(
      recommendation,
      riskAssessment,
      userPreferences
    );

    // Create task groups based on strategy
    const taskGroups = this.createTaskGroups(
      tasks,
      recommendation.safeParallelGroups,
      strategy,
      userPreferences
    );

    // Generate risk mitigations
    const riskMitigations = this.generateRiskMitigations(
      riskAssessment,
      potentialConflicts,
      strategy
    );

    // Set up monitoring points
    const monitoringPoints = this.defineMonitoringPoints(
      taskGroups,
      potentialConflicts,
      riskAssessment
    );

    // Create fallback options
    const fallbackOptions = this.createFallbackOptions(strategy, riskAssessment);

    // Estimate duration
    const estimatedDuration = this.estimateExecutionDuration(taskGroups, strategy);

    // Calculate plan confidence
    const confidenceScore = this.calculatePlanConfidence(
      analysis,
      strategy,
      userPreferences
    );

    return {
      strategy,
      taskGroups,
      riskMitigations,
      monitoringPoints,
      fallbackOptions,
      estimatedDuration,
      confidenceScore
    };
  }

  /**
   * Execute with intelligent coordination
   */
  async executeWithIntelligentCoordination(
    plan: ExecutionPlan,
    context: CoordinationContext
  ): Promise<CoordinationResult> {
    const startTime = Date.now();
    const conflictsEncountered: ActualConflict[] = [];
    const adaptationsMade: string[] = [];

    try {
      // Execute with adaptive strategy
      const { results, adaptations } = await this.adaptiveExecutor.executeWithAdaptation(
        context.tasks,
        context.projectPath
      );

      adaptationsMade.push(...adaptations.map(a => a.reason));

      // Detect runtime conflicts
      const runtimeConflicts = await this.conflictDetector.detectRuntimeConflicts({
        tasks: context.tasks,
        patternMatches: [],
        workingDirectory: context.projectPath,
        executionHistory: context.executionHistory,
        currentExecution: {
          runningTasks: results.filter(r => !r.success && !r.error).map(r => r.taskId),
          completedTasks: results.filter(r => r.success).map(r => r.taskId),
          fileChanges: new Map() // Would be populated with actual file changes
        }
      });

      conflictsEncountered.push(...runtimeConflicts);

      // Record execution for learning
      const executionDuration = Date.now() - startTime;
      const success = results.every(r => r.success);

      this.feedbackSystem.recordExecution(
        { taskId: 'batch', success, duration: executionDuration, output: '', resources: [] },
        {
          taskIds: context.tasks.map(t => t.id),
          strategyUsed: plan.strategy,
          executionMode: success ? 'parallel' : 'sequential',
          conflictsDetected: conflictsEncountered.length,
          adaptationsMade: adaptationsMade.length,
          actualDuration: executionDuration,
          expectedDuration: plan.estimatedDuration
        }
      );

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        results,
        conflictsEncountered,
        adaptationsMade,
        plan
      );

      // Get learning data for export
      const learningData = this.feedbackSystem.exportLearnings();

      return {
        executionResults: results,
        conflictsEncountered,
        adaptationsMade,
        learningData,
        improvementSuggestions
      };

    } catch (error) {
      // Handle execution failure
      const failureResult: CoordinationResult = {
        executionResults: [],
        conflictsEncountered,
        adaptationsMade,
        learningData: {},
        improvementSuggestions: [
          'Execution failed - consider using sequential mode',
          'Review task dependencies and resource requirements',
          'Check system resources and environment'
        ]
      };

      // Record failure for learning
      this.feedbackSystem.recordExecution(
        { taskId: 'batch', success: false, duration: Date.now() - startTime, output: '', error: error instanceof Error ? error.message : String(error), resources: [] },
        {
          taskIds: context.tasks.map(t => t.id),
          strategyUsed: plan.strategy,
          executionMode: 'sequential',
          conflictsDetected: conflictsEncountered.length,
          adaptationsMade: adaptationsMade.length,
          actualDuration: Date.now() - startTime,
          expectedDuration: plan.estimatedDuration
        }
      );

      return failureResult;
    }
  }

  /**
   * Learn from user feedback
   */
  recordUserFeedback(
    executionId: string,
    rating: number,
    comments?: string,
    improvementSuggestions?: string[]
  ): void {
    this.feedbackSystem.recordUserFeedback(executionId, rating, comments);

    // Use feedback to improve future recommendations
    this.feedbackSystem.improveRecommendations();
  }

  // Private helper methods

  private generateAdaptationSuggestions(
    recommendation: ParallelRecommendation,
    riskAssessment: RiskAssessment,
    userPreferences: UserPreferences
  ): string[] {
    const suggestions: string[] = [];

    if (riskAssessment.overallRisk === 'high' && userPreferences.riskTolerance === 'aggressive') {
      suggestions.push('Consider reducing risk tolerance for this execution');
    }

    if (recommendation.confidence < 0.6 && userPreferences.suggestionMode === 'never') {
      suggestions.push('Enable suggestions for low-confidence scenarios');
    }

    if (recommendation.safeParallelGroups.length === 0) {
      suggestions.push('Consider analyzing task dependencies more thoroughly');
    }

    return suggestions;
  }

  private calculateOverallConfidence(
    recommendation: ParallelRecommendation,
    riskAssessment: RiskAssessment,
    patternMatches: PatternMatch[],
    potentialConflicts: PotentialConflict[]
  ): number {
    let confidence = recommendation.confidence * 0.4; // 40% from recommendation

    // Factor in risk assessment confidence
    confidence += riskAssessment.confidence * 0.3; // 30% from risk assessment

    // Factor in pattern recognition confidence
    if (patternMatches.length > 0) {
      const avgPatternConfidence = patternMatches.reduce((sum, match) => sum + match.confidence, 0) / patternMatches.length;
      confidence += avgPatternConfidence * 0.2; // 20% from patterns
    }

    // Reduce confidence based on potential conflicts
    const conflictPenalty = Math.min(0.3, potentialConflicts.length * 0.1);
    confidence -= conflictPenalty;

    return Math.max(0, Math.min(1, confidence));
  }

  private determineExecutionStrategy(
    recommendation: ParallelRecommendation,
    riskAssessment: RiskAssessment,
    userPreferences: UserPreferences
  ): 'sequential' | 'parallel-conservative' | 'parallel-balanced' | 'parallel-aggressive' {
    // If user forces sequential or risks are too high
    if (userPreferences.executionMode === 'classic' || riskAssessment.overallRisk === 'critical') {
      return 'sequential';
    }

    // If user forces turbo mode and risks are acceptable
    if (userPreferences.executionMode === 'turbo' && riskAssessment.overallRisk !== 'high') {
      if (userPreferences.riskTolerance === 'aggressive') {
        return 'parallel-aggressive';
      }
      return 'parallel-balanced';
    }

    // Auto mode - decide based on recommendation and user tolerance
    if (recommendation.recommendation === 'sequential') {
      return 'sequential';
    }

    if (recommendation.recommendation === 'parallel-safe') {
      switch (userPreferences.riskTolerance) {
        case 'conservative': return 'parallel-conservative';
        case 'balanced': return 'parallel-balanced';
        case 'aggressive': return 'parallel-aggressive';
      }
    }

    if (recommendation.recommendation === 'parallel-risky') {
      if (userPreferences.riskTolerance === 'aggressive') {
        return 'parallel-balanced'; // Scale down risky to balanced
      }
      return 'parallel-conservative';
    }

    return 'parallel-balanced';
  }

  private createTaskGroups(
    tasks: ParallelTaskInfo[],
    recommendedGroups: TaskGroup[],
    strategy: string,
    userPreferences: UserPreferences
  ): TaskGroup[] {
    const maxTasks = Math.min(userPreferences.maxParallelTasks, 3);

    if (strategy === 'sequential') {
      return tasks.map(task => ({
        id: task.id,
        tasks: [task.id],
        reason: 'Sequential execution',
        risk: 'low' as const,
        confidence: 1.0
      }));
    }

    // Filter and limit groups based on strategy
    let filteredGroups = recommendedGroups;

    if (strategy === 'parallel-conservative') {
      filteredGroups = recommendedGroups.filter(group =>
        group.risk === 'low' && group.confidence > 0.8
      );
    } else if (strategy === 'parallel-balanced') {
      filteredGroups = recommendedGroups.filter(group =>
        group.risk !== 'high' && group.confidence > 0.6
      );
    }
    // parallel-aggressive uses all recommended groups

    // Ensure we don't exceed max parallel tasks
    return filteredGroups.slice(0, Math.ceil(maxTasks / 2));
  }

  private generateRiskMitigations(
    riskAssessment: RiskAssessment,
    potentialConflicts: PotentialConflict[],
    strategy: string
  ): string[] {
    const mitigations: string[] = [];

    // Add risk-specific mitigations
    riskAssessment.mitigations.forEach(mitigation => {
      if (mitigation.automated) {
        mitigations.push(`Auto: ${mitigation.description}`);
      } else {
        mitigations.push(`Manual: ${mitigation.description}`);
      }
    });

    // Add conflict-specific mitigations
    potentialConflicts.forEach(conflict => {
      if (conflict.severity === 'high' || conflict.severity === 'critical') {
        mitigations.push(`Monitor: ${conflict.description}`);
      }
    });

    return mitigations;
  }

  private defineMonitoringPoints(
    taskGroups: TaskGroup[],
    potentialConflicts: PotentialConflict[],
    riskAssessment: RiskAssessment
  ): string[] {
    const monitoringPoints: string[] = [];

    // Monitor high-risk task groups
    taskGroups.forEach(group => {
      if (group.risk === 'high' || group.confidence < 0.7) {
        monitoringPoints.push(`Task Group ${group.id}: Monitor for conflicts`);
      }
    });

    // Monitor potential conflict areas
    potentialConflicts.forEach(conflict => {
      if (conflict.likelihood > 0.7) {
        monitoringPoints.push(`Conflict Watch: ${conflict.description}`);
      }
    });

    // Monitor high-risk areas
    riskAssessment.specificRisks.forEach(risk => {
      if (risk.severity === 'high' || risk.severity === 'critical') {
        monitoringPoints.push(`Risk Monitor: ${risk.description}`);
      }
    });

    return monitoringPoints;
  }

  private createFallbackOptions(
    strategy: string,
    riskAssessment: RiskAssessment
  ): string[] {
    const fallbacks: string[] = [];

    if (strategy !== 'sequential') {
      fallbacks.push('Fallback to sequential execution if conflicts arise');
    }

    if (strategy === 'parallel-aggressive') {
      fallbacks.push('Scale down to balanced mode if failure rate increases');
    }

    if (riskAssessment.overallRisk === 'high') {
      fallbacks.push('Abort and rollback if critical issues detected');
    }

    fallbacks.push('Manual intervention available at any time');

    return fallbacks;
  }

  private estimateExecutionDuration(
    taskGroups: TaskGroup[],
    strategy: string
  ): number {
    if (strategy === 'sequential') {
      return taskGroups.reduce((total, group) => total + (group.estimatedDuration || 5000), 0);
    }

    // For parallel, take the maximum duration among groups
    return Math.max(...taskGroups.map(group => group.estimatedDuration || 5000));
  }

  private calculatePlanConfidence(
    analysis: IntelligentAnalysis,
    strategy: string,
    userPreferences: UserPreferences
  ): number {
    let confidence = analysis.confidence * 0.6; // Base on analysis confidence

    // Boost confidence if strategy aligns with user preferences
    if (
      (strategy === 'sequential' && userPreferences.riskTolerance === 'conservative') ||
      (strategy.includes('aggressive') && userPreferences.riskTolerance === 'aggressive')
    ) {
      confidence += 0.1;
    }

    // Reduce confidence if strategy conflicts with user preferences
    if (
      (strategy === 'sequential' && userPreferences.executionMode === 'turbo') ||
      (strategy.includes('aggressive') && userPreferences.riskTolerance === 'conservative')
    ) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateImprovementSuggestions(
    results: ExecutionResult[],
    conflicts: ActualConflict[],
    adaptations: string[],
    plan: ExecutionPlan
  ): string[] {
    const suggestions: string[] = [];

    const successRate = results.filter(r => r.success).length / results.length;

    if (successRate < 0.8) {
      suggestions.push('Consider more conservative execution strategy');
    }

    if (conflicts.length > 2) {
      suggestions.push('Improve dependency analysis to reduce conflicts');
    }

    if (adaptations.length > 3) {
      suggestions.push('Review task preparation to reduce need for adaptations');
    }

    if (plan.confidenceScore < 0.6) {
      suggestions.push('Allow more analysis time for better confidence');
    }

    return suggestions;
  }

  // Public API methods

  getPreferencesManager(): UserPreferencesManager {
    return this.preferencesManager;
  }

  getFeedbackSystem(): FeedbackSystem {
    return this.feedbackSystem;
  }

  getAdaptiveExecutor(): AdaptiveExecutor {
    return this.adaptiveExecutor;
  }

  exportLearningData(): any {
    return {
      suggestions: this.suggestionSystem.getExecutionHistory(),
      patterns: this.patternEngine.exportLearningData(),
      feedback: this.feedbackSystem.exportLearnings(),
      preferences: this.preferencesManager.exportPreferences()
    };
  }

  importLearningData(data: any): void {
    if (data.patterns) {
      this.patternEngine.importLearningData(data.patterns);
    }
    if (data.feedback) {
      this.feedbackSystem.importLearnings(data.feedback);
    }
    if (data.preferences) {
      this.preferencesManager.importPreferences(data.preferences);
    }
  }
}