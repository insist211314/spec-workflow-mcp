/**
 * Feedback System for Learning and Improvement
 * Collects feedback and improves recommendations over time
 */

import { ExecutionResult } from '../executors/parallel-executor.js';
import { TaskPattern, LearningData } from '../intelligence/pattern-recognition.js';

export interface FeedbackData {
  executionId: string;
  userId?: string;
  timestamp: number;
  feedbackType: 'execution_result' | 'user_rating' | 'adaptation_outcome' | 'conflict_resolution';
  rating: number; // 1-5 scale
  comments?: string;
  context: FeedbackContext;
}

export interface FeedbackContext {
  taskIds: string[];
  strategyUsed: string;
  executionMode: 'sequential' | 'parallel';
  conflictsDetected: number;
  adaptationsMade: number;
  actualDuration: number;
  expectedDuration: number;
}

export interface LearningInsights {
  patterns: PatternInsight[];
  strategies: StrategyInsight[];
  conflicts: ConflictInsight[];
  adaptations: AdaptationInsight[];
  overallTrends: TrendInsight[];
}

export interface PatternInsight {
  patternId: string;
  patternName: string;
  successRate: number;
  averageRating: number;
  recommendedStrategy: string;
  commonIssues: string[];
  improvement: number; // Positive/negative trend
}

export interface StrategyInsight {
  strategyId: string;
  strategyName: string;
  usageCount: number;
  successRate: number;
  averageRating: number;
  bestForPatterns: string[];
  worstForPatterns: string[];
}

export interface ConflictInsight {
  conflictType: string;
  frequency: number;
  resolutionSuccessRate: number;
  averageResolutionTime: number;
  mostEffectiveResolutions: string[];
}

export interface AdaptationInsight {
  adaptationType: string;
  triggerFrequency: number;
  successRate: number;
  averageImprovement: number;
  userSatisfactionImpact: number;
}

export interface TrendInsight {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  confidence: number;
}

export class FeedbackSystem {
  private feedbackHistory: FeedbackData[];
  private insights: LearningInsights;
  private learningEnabled: boolean;
  private maxFeedbackHistory: number = 1000;

  constructor(learningEnabled: boolean = true) {
    this.feedbackHistory = [];
    this.insights = this.initializeInsights();
    this.learningEnabled = learningEnabled;
  }

  /**
   * Record execution result for learning
   */
  recordExecution(result: ExecutionResult, context: FeedbackContext): void {
    if (!this.learningEnabled) return;

    const feedbackData: FeedbackData = {
      executionId: result.taskId || `exec-${Date.now()}`,
      timestamp: Date.now(),
      feedbackType: 'execution_result',
      rating: result.success ? 5 : 1, // Simple binary rating based on success
      context
    };

    this.addFeedback(feedbackData);
  }

  /**
   * Record user rating and feedback
   */
  recordUserFeedback(
    executionId: string,
    rating: number,
    comments?: string,
    context?: Partial<FeedbackContext>
  ): void {
    if (!this.learningEnabled) return;

    const feedbackData: FeedbackData = {
      executionId,
      timestamp: Date.now(),
      feedbackType: 'user_rating',
      rating: Math.max(1, Math.min(5, rating)), // Ensure 1-5 range
      comments,
      context: {
        taskIds: [],
        strategyUsed: 'unknown',
        executionMode: 'sequential',
        conflictsDetected: 0,
        adaptationsMade: 0,
        actualDuration: 0,
        expectedDuration: 0,
        ...context
      }
    };

    this.addFeedback(feedbackData);
  }

  /**
   * Record adaptation outcome
   */
  recordAdaptationOutcome(
    adaptationId: string,
    success: boolean,
    improvementFactor: number,
    context: FeedbackContext
  ): void {
    if (!this.learningEnabled) return;

    const feedbackData: FeedbackData = {
      executionId: adaptationId,
      timestamp: Date.now(),
      feedbackType: 'adaptation_outcome',
      rating: success ? Math.min(5, 3 + improvementFactor * 2) : 1,
      context
    };

    this.addFeedback(feedbackData);
  }

  /**
   * Record conflict resolution outcome
   */
  recordConflictResolution(
    conflictId: string,
    resolutionSuccess: boolean,
    resolutionTime: number,
    context: FeedbackContext
  ): void {
    if (!this.learningEnabled) return;

    const rating = resolutionSuccess ? (resolutionTime < 60000 ? 5 : 3) : 1;

    const feedbackData: FeedbackData = {
      executionId: conflictId,
      timestamp: Date.now(),
      feedbackType: 'conflict_resolution',
      rating,
      context
    };

    this.addFeedback(feedbackData);
  }

  /**
   * Update pattern recognition based on feedback
   */
  updatePatterns(pattern: TaskPattern, feedbackScore: number): void {
    if (!this.learningEnabled) return;

    // Find pattern insight or create new one
    let patternInsight = this.insights.patterns.find(p => p.patternId === pattern.id);
    if (!patternInsight) {
      patternInsight = {
        patternId: pattern.id,
        patternName: pattern.name,
        successRate: 0.5,
        averageRating: 3,
        recommendedStrategy: 'balanced',
        commonIssues: [],
        improvement: 0
      };
      this.insights.patterns.push(patternInsight);
    }

    // Update pattern metrics with weighted average
    const weight = 0.1; // Learning rate
    patternInsight.averageRating = patternInsight.averageRating * (1 - weight) + feedbackScore * weight;

    // Update success rate if execution feedback
    if (feedbackScore >= 3) {
      patternInsight.successRate = patternInsight.successRate * (1 - weight) + 1 * weight;
    } else {
      patternInsight.successRate = patternInsight.successRate * (1 - weight) + 0 * weight;
    }
  }

  /**
   * Improve recommendations based on accumulated feedback
   */
  improveRecommendations(): void {
    if (!this.learningEnabled) return;

    this.analyzePatternPerformance();
    this.analyzeStrategyEffectiveness();
    this.analyzeConflictPatterns();
    this.analyzeAdaptationEffectiveness();
    this.updateTrends();
  }

  /**
   * Export learning data for persistence
   */
  exportLearnings(): LearningData {
    return {
      patterns: this.insights.patterns.map(insight => ({
        id: insight.patternId,
        name: insight.patternName,
        description: `Pattern with ${insight.successRate.toFixed(2)} success rate`,
        keywords: [],
        contextualIndicators: [],
        antiPatterns: insight.commonIssues,
        parallelizationScore: insight.successRate,
        riskFactors: [],
        successRate: insight.successRate,
        lastSeen: Date.now(),
        frequency: this.getFeedbackCountForPattern(insight.patternId)
      })),
      executionStatistics: new Map(), // Would be populated with actual stats
      correlations: [], // Would be populated with pattern correlations
      lastUpdated: Date.now()
    };
  }

  /**
   * Import learning data
   */
  importLearnings(data: LearningData): void {
    if (!this.learningEnabled) return;

    // Import pattern insights
    for (const pattern of data.patterns) {
      const insight: PatternInsight = {
        patternId: pattern.id,
        patternName: pattern.name,
        successRate: pattern.successRate,
        averageRating: pattern.successRate * 5, // Convert to 1-5 scale
        recommendedStrategy: this.determineRecommendedStrategy(pattern.successRate),
        commonIssues: pattern.antiPatterns,
        improvement: 0
      };

      const existingIndex = this.insights.patterns.findIndex(p => p.patternId === pattern.id);
      if (existingIndex >= 0) {
        this.insights.patterns[existingIndex] = insight;
      } else {
        this.insights.patterns.push(insight);
      }
    }
  }

  /**
   * Get insights for decision making
   */
  getInsights(): LearningInsights {
    return JSON.parse(JSON.stringify(this.insights)); // Deep copy
  }

  /**
   * Get recommendations based on learning
   */
  getRecommendationsForContext(context: Partial<FeedbackContext>): {
    recommendedStrategy: string;
    confidence: number;
    reasoning: string[];
  } {
    const recommendations: string[] = [];
    let confidence = 0.5;
    let recommendedStrategy = 'balanced';

    // Analyze historical performance for similar contexts
    const similarFeedback = this.findSimilarContexts(context);

    if (similarFeedback.length > 0) {
      const avgRating = similarFeedback.reduce((sum, f) => sum + f.rating, 0) / similarFeedback.length;
      confidence = Math.min(0.9, 0.3 + (similarFeedback.length * 0.1));

      // Find best performing strategy for similar contexts
      const strategyPerformance = new Map<string, number[]>();
      similarFeedback.forEach(feedback => {
        const ratings = strategyPerformance.get(feedback.context.strategyUsed) || [];
        ratings.push(feedback.rating);
        strategyPerformance.set(feedback.context.strategyUsed, ratings);
      });

      let bestStrategy = 'balanced';
      let bestAvgRating = 0;

      strategyPerformance.forEach((ratings, strategy) => {
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        if (avgRating > bestAvgRating) {
          bestAvgRating = avgRating;
          bestStrategy = strategy;
        }
      });

      recommendedStrategy = bestStrategy;
      recommendations.push(`Based on ${similarFeedback.length} similar executions`);
      recommendations.push(`Strategy ${bestStrategy} has ${bestAvgRating.toFixed(1)}/5 average rating`);
    }

    // Factor in pattern insights
    if (context.taskIds && context.taskIds.length > 0) {
      const relevantPatterns = this.insights.patterns.filter(p =>
        p.successRate > 0.7 && p.averageRating > 3.5
      );

      if (relevantPatterns.length > 0) {
        recommendations.push(`${relevantPatterns.length} successful patterns detected`);
        confidence = Math.min(0.95, confidence + 0.1);
      }
    }

    return {
      recommendedStrategy,
      confidence,
      reasoning: recommendations
    };
  }

  // Private methods

  private addFeedback(feedback: FeedbackData): void {
    this.feedbackHistory.push(feedback);

    // Maintain history size limit
    if (this.feedbackHistory.length > this.maxFeedbackHistory) {
      this.feedbackHistory.shift();
    }

    // Trigger immediate learning if significant feedback
    if (feedback.rating <= 2 || feedback.rating >= 4) {
      this.improveRecommendations();
    }
  }

  private initializeInsights(): LearningInsights {
    return {
      patterns: [],
      strategies: [
        {
          strategyId: 'conservative',
          strategyName: 'Conservative',
          usageCount: 0,
          successRate: 0.9,
          averageRating: 4.0,
          bestForPatterns: [],
          worstForPatterns: []
        },
        {
          strategyId: 'balanced',
          strategyName: 'Balanced',
          usageCount: 0,
          successRate: 0.8,
          averageRating: 3.5,
          bestForPatterns: [],
          worstForPatterns: []
        },
        {
          strategyId: 'aggressive',
          strategyName: 'Aggressive',
          usageCount: 0,
          successRate: 0.7,
          averageRating: 3.0,
          bestForPatterns: [],
          worstForPatterns: []
        }
      ],
      conflicts: [],
      adaptations: [],
      overallTrends: []
    };
  }

  private analyzePatternPerformance(): void {
    // Analyze how different patterns perform
    const patternPerformance = new Map<string, number[]>();

    this.feedbackHistory.forEach(feedback => {
      // This would map feedback to patterns based on task analysis
      // For now, simplified implementation
      const patternId = 'general-pattern';
      const ratings = patternPerformance.get(patternId) || [];
      ratings.push(feedback.rating);
      patternPerformance.set(patternId, ratings);
    });

    // Update pattern insights
    patternPerformance.forEach((ratings, patternId) => {
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const successRate = ratings.filter(r => r >= 3).length / ratings.length;

      let insight = this.insights.patterns.find(p => p.patternId === patternId);
      if (!insight) {
        insight = {
          patternId,
          patternName: `Pattern ${patternId}`,
          successRate,
          averageRating: avgRating,
          recommendedStrategy: this.determineRecommendedStrategy(successRate),
          commonIssues: [],
          improvement: 0
        };
        this.insights.patterns.push(insight);
      } else {
        const previousRating = insight.averageRating;
        insight.averageRating = avgRating;
        insight.successRate = successRate;
        insight.improvement = avgRating - previousRating;
      }
    });
  }

  private analyzeStrategyEffectiveness(): void {
    const strategyStats = new Map<string, { ratings: number[]; usage: number }>();

    this.feedbackHistory.forEach(feedback => {
      const strategy = feedback.context.strategyUsed;
      const stats = strategyStats.get(strategy) || { ratings: [], usage: 0 };
      stats.ratings.push(feedback.rating);
      stats.usage++;
      strategyStats.set(strategy, stats);
    });

    // Update strategy insights
    strategyStats.forEach((stats, strategyId) => {
      const insight = this.insights.strategies.find(s => s.strategyId === strategyId);
      if (insight) {
        insight.usageCount = stats.usage;
        insight.averageRating = stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length;
        insight.successRate = stats.ratings.filter(r => r >= 3).length / stats.ratings.length;
      }
    });
  }

  private analyzeConflictPatterns(): void {
    const conflictFeedback = this.feedbackHistory.filter(f => f.feedbackType === 'conflict_resolution');

    const conflictTypes = new Map<string, {
      frequency: number;
      successfulResolutions: number;
      totalResolutions: number;
      resolutionTimes: number[];
    }>();

    conflictFeedback.forEach(feedback => {
      const conflictType = 'general'; // Would be extracted from feedback context
      const stats = conflictTypes.get(conflictType) || {
        frequency: 0,
        successfulResolutions: 0,
        totalResolutions: 0,
        resolutionTimes: []
      };

      stats.frequency++;
      stats.totalResolutions++;
      if (feedback.rating >= 3) {
        stats.successfulResolutions++;
      }

      conflictTypes.set(conflictType, stats);
    });

    // Update conflict insights
    this.insights.conflicts = Array.from(conflictTypes.entries()).map(([type, stats]) => ({
      conflictType: type,
      frequency: stats.frequency,
      resolutionSuccessRate: stats.successfulResolutions / stats.totalResolutions,
      averageResolutionTime: stats.resolutionTimes.reduce((sum, t) => sum + t, 0) / stats.resolutionTimes.length || 0,
      mostEffectiveResolutions: ['serialize', 'isolate'] // Would be determined from feedback
    }));
  }

  private analyzeAdaptationEffectiveness(): void {
    const adaptationFeedback = this.feedbackHistory.filter(f => f.feedbackType === 'adaptation_outcome');

    const adaptationStats = new Map<string, {
      frequency: number;
      successes: number;
      improvements: number[];
    }>();

    adaptationFeedback.forEach(feedback => {
      const adaptationType = 'strategy_change'; // Would be extracted from context
      const stats = adaptationStats.get(adaptationType) || {
        frequency: 0,
        successes: 0,
        improvements: []
      };

      stats.frequency++;
      if (feedback.rating >= 3) {
        stats.successes++;
      }

      adaptationStats.set(adaptationType, stats);
    });

    // Update adaptation insights
    this.insights.adaptations = Array.from(adaptationStats.entries()).map(([type, stats]) => ({
      adaptationType: type,
      triggerFrequency: stats.frequency,
      successRate: stats.successes / stats.frequency,
      averageImprovement: stats.improvements.reduce((sum, i) => sum + i, 0) / stats.improvements.length || 0,
      userSatisfactionImpact: 0.1 // Would be calculated from user feedback correlation
    }));
  }

  private updateTrends(): void {
    // Analyze trends in key metrics
    const recentFeedback = this.feedbackHistory.slice(-50); // Last 50 entries
    const olderFeedback = this.feedbackHistory.slice(-100, -50); // Previous 50 entries

    if (recentFeedback.length > 10 && olderFeedback.length > 10) {
      const recentAvgRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
      const olderAvgRating = olderFeedback.reduce((sum, f) => sum + f.rating, 0) / olderFeedback.length;

      const ratingTrend = recentAvgRating - olderAvgRating;

      this.insights.overallTrends = [
        {
          metric: 'user_satisfaction',
          trend: ratingTrend > 0.1 ? 'improving' : ratingTrend < -0.1 ? 'declining' : 'stable',
          changeRate: ratingTrend,
          confidence: Math.min(0.9, recentFeedback.length / 50)
        }
      ];
    }
  }

  private determineRecommendedStrategy(successRate: number): string {
    if (successRate > 0.8) return 'aggressive';
    if (successRate > 0.6) return 'balanced';
    return 'conservative';
  }

  private getFeedbackCountForPattern(patternId: string): number {
    // This would count feedback entries related to this pattern
    return this.feedbackHistory.filter(f =>
      f.executionId.includes(patternId) ||
      f.comments?.includes(patternId)
    ).length;
  }

  private findSimilarContexts(context: Partial<FeedbackContext>): FeedbackData[] {
    return this.feedbackHistory.filter(feedback => {
      let similarity = 0;
      let totalFactors = 0;

      if (context.strategyUsed && feedback.context.strategyUsed) {
        similarity += context.strategyUsed === feedback.context.strategyUsed ? 1 : 0;
        totalFactors++;
      }

      if (context.executionMode && feedback.context.executionMode) {
        similarity += context.executionMode === feedback.context.executionMode ? 1 : 0;
        totalFactors++;
      }

      if (context.taskIds && feedback.context.taskIds) {
        const commonTasks = context.taskIds.filter(id =>
          feedback.context.taskIds.includes(id)
        ).length;
        if (context.taskIds.length > 0) {
          similarity += commonTasks / context.taskIds.length;
          totalFactors++;
        }
      }

      return totalFactors > 0 && (similarity / totalFactors) > 0.5;
    });
  }

  // Public API methods

  isLearningEnabled(): boolean {
    return this.learningEnabled;
  }

  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  getFeedbackHistory(): FeedbackData[] {
    return [...this.feedbackHistory];
  }

  clearHistory(): void {
    this.feedbackHistory = [];
    this.insights = this.initializeInsights();
  }

  getStatistics(): {
    totalFeedback: number;
    averageRating: number;
    improvementTrend: number;
  } {
    const total = this.feedbackHistory.length;
    const avgRating = total > 0
      ? this.feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / total
      : 0;

    const recentFeedback = this.feedbackHistory.slice(-20);
    const olderFeedback = this.feedbackHistory.slice(-40, -20);

    const recentAvg = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length
      : 0;
    const olderAvg = olderFeedback.length > 0
      ? olderFeedback.reduce((sum, f) => sum + f.rating, 0) / olderFeedback.length
      : 0;

    return {
      totalFeedback: total,
      averageRating: avgRating,
      improvementTrend: recentAvg - olderAvg
    };
  }
}