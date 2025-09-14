/**
 * Pattern Recognition Engine for Task Analysis
 * Identifies common patterns in tasks and learns from execution history
 */

import { ParallelTaskInfo } from '../types.js';
import { ExecutionHistory } from './suggestion-system.js';

export interface TaskPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  contextualIndicators: string[];
  antiPatterns: string[];
  parallelizationScore: number; // 0-1, higher means more parallelizable
  riskFactors: string[];
  successRate: number;
  lastSeen: number;
  frequency: number;
}

export interface PatternMatch {
  pattern: TaskPattern;
  confidence: number;
  matchedKeywords: string[];
  contextClues: string[];
}

export interface LearningData {
  patterns: TaskPattern[];
  executionStatistics: Map<string, ExecutionStats>;
  correlations: PatternCorrelation[];
  lastUpdated: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  parallelExecutions: number;
  parallelSuccesses: number;
  averageDuration: number;
  commonConflicts: string[];
}

export interface PatternCorrelation {
  patternA: string;
  patternB: string;
  cooccurrenceRate: number;
  parallelCompatibility: number;
  conflictRate: number;
}

export class PatternRecognitionEngine {
  private patterns: Map<string, TaskPattern>;
  private executionStats: Map<string, ExecutionStats>;
  private correlations: Map<string, PatternCorrelation>;
  private learningThreshold: number = 3; // Minimum executions to learn from

  constructor() {
    this.patterns = new Map();
    this.executionStats = new Map();
    this.correlations = new Map();
    this.initializeBasePatterns();
  }

  /**
   * Identify patterns in a set of tasks
   */
  identifyPatterns(tasks: ParallelTaskInfo[]): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const task of tasks) {
      const taskMatches = this.analyzeTask(task);
      matches.push(...taskMatches);
    }

    return this.deduplicateAndRank(matches);
  }

  /**
   * Analyze a single task for pattern matches
   */
  private analyzeTask(task: ParallelTaskInfo): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const taskText = `${task.description} ${task.tags?.join(' ') || ''}`.toLowerCase();

    for (const pattern of this.patterns.values()) {
      const match = this.matchPattern(pattern, taskText, task);
      if (match.confidence > 0.3) { // Minimum confidence threshold
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Match a specific pattern against task data
   */
  private matchPattern(pattern: TaskPattern, taskText: string, task: ParallelTaskInfo): PatternMatch {
    let confidence = 0;
    const matchedKeywords: string[] = [];
    const contextClues: string[] = [];

    // Check for keyword matches
    for (const keyword of pattern.keywords) {
      if (taskText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        confidence += 0.2;
      }
    }

    // Check for contextual indicators
    for (const indicator of pattern.contextualIndicators) {
      if (taskText.includes(indicator.toLowerCase())) {
        contextClues.push(indicator);
        confidence += 0.15;
      }
    }

    // Check for anti-patterns (reduce confidence)
    for (const antiPattern of pattern.antiPatterns) {
      if (taskText.includes(antiPattern.toLowerCase())) {
        confidence -= 0.3;
      }
    }

    // Factor in resource patterns
    if (task.resources) {
      const resourcePatterns = this.analyzeResourcePatterns(task.resources, pattern);
      confidence += resourcePatterns * 0.1;
    }

    // Factor in historical success rate
    confidence *= pattern.successRate;

    // Normalize confidence to 0-1 range
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      pattern,
      confidence,
      matchedKeywords,
      contextClues
    };
  }

  /**
   * Analyze resource usage patterns
   */
  private analyzeResourcePatterns(resources: string[], pattern: TaskPattern): number {
    let score = 0;

    for (const resource of resources) {
      const resourceLower = resource.toLowerCase();

      // Database patterns
      if (pattern.id === 'database-operations' &&
          (resourceLower.includes('db') || resourceLower.includes('database') ||
           resourceLower.includes('.sql') || resourceLower.includes('migration'))) {
        score += 0.5;
      }

      // File patterns
      if (pattern.id === 'file-operations' &&
          (resourceLower.includes('file') || resourceLower.includes('.json') ||
           resourceLower.includes('.md') || resourceLower.includes('.txt'))) {
        score += 0.3;
      }

      // Configuration patterns
      if (pattern.id === 'configuration' &&
          (resourceLower.includes('config') || resourceLower.includes('.env') ||
           resourceLower.includes('package.json') || resourceLower.includes('settings'))) {
        score += 0.4;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Learn from execution results to improve pattern recognition
   */
  learnFromExecution(
    tasks: ParallelTaskInfo[],
    matches: PatternMatch[],
    executionResult: ExecutionHistory
  ): void {
    // Update execution statistics
    this.updateExecutionStats(tasks, matches, executionResult);

    // Update pattern success rates
    this.updatePatternSuccessRates(matches, executionResult.parallelSuccess);

    // Learn new patterns from successful executions
    if (executionResult.parallelSuccess) {
      this.learnNewPatterns(tasks, executionResult);
    }

    // Update correlations between patterns
    this.updatePatternCorrelations(matches, executionResult);
  }

  /**
   * Update execution statistics for patterns
   */
  private updateExecutionStats(
    tasks: ParallelTaskInfo[],
    matches: PatternMatch[],
    result: ExecutionHistory
  ): void {
    for (const match of matches) {
      const patternId = match.pattern.id;
      let stats = this.executionStats.get(patternId);

      if (!stats) {
        stats = {
          totalExecutions: 0,
          successfulExecutions: 0,
          parallelExecutions: 0,
          parallelSuccesses: 0,
          averageDuration: 0,
          commonConflicts: []
        };
      }

      stats.totalExecutions++;
      if (result.parallelSuccess) {
        stats.successfulExecutions++;
      }

      // Update parallel execution stats
      if (tasks.length > 1) {
        stats.parallelExecutions++;
        if (result.parallelSuccess) {
          stats.parallelSuccesses++;
        }
      }

      // Update average duration
      stats.averageDuration = (stats.averageDuration * (stats.totalExecutions - 1) + result.duration) / stats.totalExecutions;

      // Track conflicts
      if (result.conflicts.length > 0) {
        stats.commonConflicts.push(...result.conflicts);
        // Keep only unique conflicts and limit to recent ones
        stats.commonConflicts = [...new Set(stats.commonConflicts)].slice(-10);
      }

      this.executionStats.set(patternId, stats);
    }
  }

  /**
   * Update pattern success rates based on execution results
   */
  private updatePatternSuccessRates(matches: PatternMatch[], success: boolean): void {
    for (const match of matches) {
      const pattern = match.pattern;
      const weight = match.confidence; // Weight updates by confidence

      if (success) {
        pattern.successRate = pattern.successRate * 0.9 + 0.1 * weight;
      } else {
        pattern.successRate = pattern.successRate * 0.9 + 0.1 * (1 - weight);
      }

      // Keep success rate in reasonable bounds
      pattern.successRate = Math.max(0.1, Math.min(0.95, pattern.successRate));
      pattern.lastSeen = Date.now();
      pattern.frequency++;
    }
  }

  /**
   * Learn new patterns from successful parallel executions
   */
  private learnNewPatterns(tasks: ParallelTaskInfo[], result: ExecutionHistory): void {
    if (tasks.length < 2) return; // Need multiple tasks to learn parallel patterns

    // Extract common keywords from successful parallel tasks
    const commonKeywords = this.extractCommonKeywords(tasks);
    if (commonKeywords.length >= 2) {
      const patternId = `learned-${Date.now()}`;
      const newPattern: TaskPattern = {
        id: patternId,
        name: `Learned Pattern ${patternId.split('-')[1]}`,
        description: `Auto-learned pattern from successful parallel execution`,
        keywords: commonKeywords,
        contextualIndicators: [],
        antiPatterns: [],
        parallelizationScore: 0.8, // Start with high score since it was successful
        riskFactors: [],
        successRate: 0.8,
        lastSeen: Date.now(),
        frequency: 1
      };

      this.patterns.set(patternId, newPattern);
    }
  }

  /**
   * Extract common keywords from a set of tasks
   */
  private extractCommonKeywords(tasks: ParallelTaskInfo[]): string[] {
    const wordCounts = new Map<string, number>();
    const minFrequency = Math.ceil(tasks.length * 0.6); // Must appear in 60% of tasks

    for (const task of tasks) {
      const words = task.description.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3) // Ignore short words
        .filter(word => !/^\d+$/.test(word)); // Ignore pure numbers

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= minFrequency)
      .map(([word, _]) => word)
      .slice(0, 5); // Limit to top 5 keywords
  }

  /**
   * Update correlations between patterns
   */
  private updatePatternCorrelations(matches: PatternMatch[], result: ExecutionHistory): void {
    if (matches.length < 2) return;

    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const patternA = matches[i].pattern.id;
        const patternB = matches[j].pattern.id;
        const correlationKey = `${patternA}-${patternB}`;

        let correlation = this.correlations.get(correlationKey);
        if (!correlation) {
          correlation = {
            patternA,
            patternB,
            cooccurrenceRate: 0,
            parallelCompatibility: 0.5,
            conflictRate: 0
          };
        }

        // Update cooccurrence rate
        correlation.cooccurrenceRate = Math.min(1, correlation.cooccurrenceRate + 0.1);

        // Update parallel compatibility
        if (result.parallelSuccess) {
          correlation.parallelCompatibility = correlation.parallelCompatibility * 0.9 + 0.1;
        } else {
          correlation.parallelCompatibility = correlation.parallelCompatibility * 0.9;
        }

        // Update conflict rate
        if (result.conflicts.length > 0) {
          correlation.conflictRate = correlation.conflictRate * 0.9 + 0.1;
        } else {
          correlation.conflictRate = correlation.conflictRate * 0.9;
        }

        this.correlations.set(correlationKey, correlation);
      }
    }
  }

  /**
   * Remove duplicate matches and rank by confidence
   */
  private deduplicateAndRank(matches: PatternMatch[]): PatternMatch[] {
    const seen = new Set<string>();
    const unique: PatternMatch[] = [];

    for (const match of matches.sort((a, b) => b.confidence - a.confidence)) {
      if (!seen.has(match.pattern.id)) {
        seen.add(match.pattern.id);
        unique.push(match);
      }
    }

    return unique;
  }

  /**
   * Get pattern recommendations for parallel execution
   */
  getParallelRecommendations(matches: PatternMatch[]): {
    compatible: PatternMatch[];
    incompatible: PatternMatch[];
    recommendations: string[];
  } {
    const compatible: PatternMatch[] = [];
    const incompatible: PatternMatch[] = [];
    const recommendations: string[] = [];

    for (const match of matches) {
      if (match.pattern.parallelizationScore > 0.7 && match.confidence > 0.5) {
        compatible.push(match);
      } else {
        incompatible.push(match);
      }
    }

    // Generate specific recommendations
    if (compatible.length >= 2) {
      recommendations.push(`${compatible.length} patterns detected that work well in parallel`);
    }

    if (incompatible.length > 0) {
      const riskyPatterns = incompatible.map(m => m.pattern.name).join(', ');
      recommendations.push(`Consider sequential execution for: ${riskyPatterns}`);
    }

    // Check for known correlations
    for (let i = 0; i < compatible.length; i++) {
      for (let j = i + 1; j < compatible.length; j++) {
        const correlation = this.getPatternCorrelation(
          compatible[i].pattern.id,
          compatible[j].pattern.id
        );
        if (correlation && correlation.parallelCompatibility > 0.8) {
          recommendations.push(
            `Patterns "${compatible[i].pattern.name}" and "${compatible[j].pattern.name}" have high parallel compatibility`
          );
        }
      }
    }

    return { compatible, incompatible, recommendations };
  }

  /**
   * Get correlation between two patterns
   */
  private getPatternCorrelation(patternA: string, patternB: string): PatternCorrelation | null {
    const key1 = `${patternA}-${patternB}`;
    const key2 = `${patternB}-${patternA}`;
    return this.correlations.get(key1) || this.correlations.get(key2) || null;
  }

  /**
   * Export learning data for persistence
   */
  exportLearningData(): LearningData {
    return {
      patterns: Array.from(this.patterns.values()),
      executionStatistics: this.executionStats,
      correlations: Array.from(this.correlations.values()),
      lastUpdated: Date.now()
    };
  }

  /**
   * Import learning data from persistence
   */
  importLearningData(data: LearningData): void {
    // Import patterns
    data.patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });

    // Import execution statistics
    this.executionStats = data.executionStatistics;

    // Import correlations
    data.correlations.forEach(correlation => {
      const key = `${correlation.patternA}-${correlation.patternB}`;
      this.correlations.set(key, correlation);
    });
  }

  /**
   * Initialize base patterns for common development tasks
   */
  private initializeBasePatterns(): void {
    const basePatterns: TaskPattern[] = [
      {
        id: 'crud-operations',
        name: 'CRUD Operations',
        description: 'Create, Read, Update, Delete operations',
        keywords: ['create', 'read', 'update', 'delete', 'crud', 'add', 'remove', 'modify'],
        contextualIndicators: ['endpoint', 'api', 'service', 'repository'],
        antiPatterns: ['database schema', 'migration'],
        parallelizationScore: 0.6,
        riskFactors: ['data consistency', 'transaction isolation'],
        successRate: 0.7,
        lastSeen: Date.now(),
        frequency: 0
      },
      {
        id: 'ui-components',
        name: 'UI Components',
        description: 'User interface component development',
        keywords: ['component', 'widget', 'button', 'form', 'modal', 'dialog'],
        contextualIndicators: ['react', 'vue', 'angular', 'html', 'css'],
        antiPatterns: ['shared state', 'global store'],
        parallelizationScore: 0.9,
        riskFactors: ['style conflicts'],
        successRate: 0.85,
        lastSeen: Date.now(),
        frequency: 0
      },
      {
        id: 'utility-functions',
        name: 'Utility Functions',
        description: 'Helper and utility function development',
        keywords: ['utility', 'helper', 'function', 'tool', 'lib', 'common'],
        contextualIndicators: ['pure function', 'stateless', 'utils'],
        antiPatterns: ['side effects', 'global state'],
        parallelizationScore: 0.95,
        riskFactors: [],
        successRate: 0.9,
        lastSeen: Date.now(),
        frequency: 0
      },
      {
        id: 'schema-changes',
        name: 'Schema Changes',
        description: 'Database or data structure modifications',
        keywords: ['schema', 'migration', 'table', 'column', 'index', 'constraint'],
        contextualIndicators: ['database', 'sql', 'mongodb', 'sequelize'],
        antiPatterns: [],
        parallelizationScore: 0.2,
        riskFactors: ['data integrity', 'breaking changes', 'dependency order'],
        successRate: 0.4,
        lastSeen: Date.now(),
        frequency: 0
      },
      {
        id: 'test-suites',
        name: 'Test Suites',
        description: 'Test creation and maintenance',
        keywords: ['test', 'spec', 'unit', 'integration', 'mock', 'assert'],
        contextualIndicators: ['jest', 'mocha', 'jasmine', 'cypress'],
        antiPatterns: ['shared fixtures', 'test data dependencies'],
        parallelizationScore: 0.8,
        riskFactors: ['test isolation'],
        successRate: 0.8,
        lastSeen: Date.now(),
        frequency: 0
      }
    ];

    basePatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  /**
   * Get all learned patterns
   */
  getPatterns(): TaskPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): Map<string, ExecutionStats> {
    return this.executionStats;
  }

  /**
   * Clean up old or unused patterns
   */
  cleanupPatterns(): void {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [id, pattern] of this.patterns) {
      // Remove patterns that haven't been seen recently and have low frequency
      if (now - pattern.lastSeen > maxAge && pattern.frequency < 3) {
        this.patterns.delete(id);
        this.executionStats.delete(id);
      }
    }
  }
}