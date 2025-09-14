/**
 * Smart Conflict Detector for Parallel Task Execution
 * Predicts and detects conflicts before and during execution
 */

import { ParallelTaskInfo, TaskConflict } from '../types.js';
import { PatternMatch } from '../intelligence/pattern-recognition.js';

export interface PotentialConflict {
  id: string;
  type: 'resource' | 'dependency' | 'data' | 'timing' | 'semantic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTasks: string[];
  likelihood: number; // 0-1
  predictedImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  evidence: ConflictEvidence[];
  detectionMethod: 'static' | 'dynamic' | 'pattern' | 'historical';
}

export interface ActualConflict {
  id: string;
  originalPrediction?: string; // ID of the PotentialConflict if predicted
  type: 'resource' | 'dependency' | 'data' | 'timing' | 'semantic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTasks: string[];
  detectedAt: number; // timestamp
  manifestation: ConflictManifestation;
  resolution?: ConflictResolution;
}

export interface ConflictEvidence {
  type: 'file_overlap' | 'resource_usage' | 'dependency_cycle' | 'timing_pattern' | 'historical_data';
  description: string;
  confidence: number; // 0-1
  source: string;
}

export interface ConflictManifestation {
  symptoms: string[];
  errorMessages: string[];
  affectedFiles: string[];
  performanceImpact: number; // 0-1
  dataCorruption: boolean;
}

export interface ConflictResolution {
  strategy: 'serialize' | 'isolate' | 'merge' | 'retry' | 'abort';
  description: string;
  implemented: boolean;
  success: boolean;
  appliedAt: number;
}

export interface ConflictContext {
  tasks: ParallelTaskInfo[];
  patternMatches: PatternMatch[];
  workingDirectory: string;
  executionHistory: any[];
  currentExecution?: {
    runningTasks: string[];
    completedTasks: string[];
    fileChanges: Map<string, string[]>; // file -> tasks that modified it
  };
}

export class SmartConflictDetector {
  private detectedConflicts: Map<string, PotentialConflict>;
  private actualConflicts: Map<string, ActualConflict>;
  private conflictPatterns: Map<string, ConflictPattern>;
  private fileWatchers: Map<string, any>;

  constructor() {
    this.detectedConflicts = new Map();
    this.actualConflicts = new Map();
    this.conflictPatterns = new Map();
    this.fileWatchers = new Map();
    this.initializeConflictPatterns();
  }

  /**
   * Predict conflicts before execution starts
   */
  async predictConflicts(context: ConflictContext): Promise<PotentialConflict[]> {
    const conflicts: PotentialConflict[] = [];

    // Static analysis conflicts
    conflicts.push(...this.detectStaticConflicts(context));

    // Pattern-based conflicts
    conflicts.push(...this.detectPatternBasedConflicts(context));

    // Historical conflicts
    conflicts.push(...this.detectHistoricalConflicts(context));

    // Advanced semantic conflicts
    conflicts.push(...await this.detectSemanticConflicts(context));

    // Store predictions
    conflicts.forEach(conflict => {
      this.detectedConflicts.set(conflict.id, conflict);
    });

    return conflicts.sort((a, b) => (b.likelihood * this.getSeverityWeight(b.severity)) -
                                   (a.likelihood * this.getSeverityWeight(a.severity)));
  }

  /**
   * Detect conflicts during runtime
   */
  async detectRuntimeConflicts(context: ConflictContext): Promise<ActualConflict[]> {
    const conflicts: ActualConflict[] = [];

    if (!context.currentExecution) {
      return conflicts;
    }

    // File system conflicts
    conflicts.push(...this.detectFileSystemConflicts(context.currentExecution));

    // Resource contention
    conflicts.push(...this.detectResourceContention(context));

    // Data consistency conflicts
    conflicts.push(...this.detectDataConsistencyConflicts(context));

    // Timing conflicts
    conflicts.push(...this.detectTimingConflicts(context));

    // Store actual conflicts
    conflicts.forEach(conflict => {
      this.actualConflicts.set(conflict.id, conflict);
    });

    return conflicts;
  }

  /**
   * Generate resolution strategies for conflicts
   */
  async suggestResolution(conflict: PotentialConflict | ActualConflict): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];

    switch (conflict.type) {
      case 'resource':
        resolutions.push(...this.generateResourceResolutions(conflict));
        break;
      case 'dependency':
        resolutions.push(...this.generateDependencyResolutions(conflict));
        break;
      case 'data':
        resolutions.push(...this.generateDataResolutions(conflict));
        break;
      case 'timing':
        resolutions.push(...this.generateTimingResolutions(conflict));
        break;
      case 'semantic':
        resolutions.push(...this.generateSemanticResolutions(conflict));
        break;
    }

    // Rank by effectiveness and feasibility
    return resolutions.sort((a, b) => (b.effectiveness * b.feasibility) - (a.effectiveness * a.feasibility));
  }

  /**
   * Detect static conflicts through code analysis
   */
  private detectStaticConflicts(context: ConflictContext): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];

    // File overlap conflicts
    const fileConflicts = this.detectFileOverlapConflicts(context.tasks);
    conflicts.push(...fileConflicts);

    // Resource conflicts
    const resourceConflicts = this.detectResourceConflicts(context.tasks);
    conflicts.push(...resourceConflicts);

    // Dependency conflicts
    const depConflicts = this.detectDependencyConflicts(context.tasks);
    conflicts.push(...depConflicts);

    return conflicts;
  }

  private detectFileOverlapConflicts(tasks: ParallelTaskInfo[]): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];
    const fileMap = new Map<string, string[]>();

    // Build file usage map
    for (const task of tasks) {
      if (task.resources) {
        for (const resource of task.resources) {
          if (resource.endsWith('.ts') || resource.endsWith('.js') ||
              resource.endsWith('.json') || resource.endsWith('.md')) {
            const users = fileMap.get(resource) || [];
            users.push(task.id);
            fileMap.set(resource, users);
          }
        }
      }
    }

    // Identify conflicts
    fileMap.forEach((taskIds, file) => {
      if (taskIds.length > 1) {
        conflicts.push({
          id: `file-overlap-${file.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'resource',
          severity: this.determineFileSeverity(file),
          description: `Multiple tasks will modify the same file: ${file}`,
          affectedTasks: taskIds,
          likelihood: 0.9,
          predictedImpact: 'significant',
          evidence: [{
            type: 'file_overlap',
            description: `Tasks ${taskIds.join(', ')} all reference file: ${file}`,
            confidence: 0.95,
            source: 'static_analysis'
          }],
          detectionMethod: 'static'
        });
      }
    });

    return conflicts;
  }

  private detectResourceConflicts(tasks: ParallelTaskInfo[]): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];
    const resourceMap = new Map<string, string[]>();

    // Non-file resources
    for (const task of tasks) {
      if (task.resources) {
        for (const resource of task.resources) {
          if (!resource.includes('.') && !resource.startsWith('/')) {
            const users = resourceMap.get(resource) || [];
            users.push(task.id);
            resourceMap.set(resource, users);
          }
        }
      }
    }

    resourceMap.forEach((taskIds, resource) => {
      if (taskIds.length > 1) {
        conflicts.push({
          id: `resource-conflict-${resource}`,
          type: 'resource',
          severity: 'medium',
          description: `Resource "${resource}" will be used by multiple tasks simultaneously`,
          affectedTasks: taskIds,
          likelihood: 0.7,
          predictedImpact: 'moderate',
          evidence: [{
            type: 'resource_usage',
            description: `Resource "${resource}" used by: ${taskIds.join(', ')}`,
            confidence: 0.8,
            source: 'static_analysis'
          }],
          detectionMethod: 'static'
        });
      }
    });

    return conflicts;
  }

  private detectDependencyConflicts(tasks: ParallelTaskInfo[]): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];

    // Build dependency graph
    const dependsOn = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    for (const task of tasks) {
      dependsOn.set(task.id, task.dependencies || []);
      for (const dep of task.dependencies || []) {
        const deps = dependents.get(dep) || [];
        deps.push(task.id);
        dependents.set(dep, deps);
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const detectCycle = (taskId: string, path: string[]): boolean => {
      if (inStack.has(taskId)) {
        const cycleStart = path.indexOf(taskId);
        const cycle = path.slice(cycleStart);
        cycle.push(taskId);

        conflicts.push({
          id: `circular-dependency-${cycle.join('-')}`,
          type: 'dependency',
          severity: 'critical',
          description: `Circular dependency detected: ${cycle.join(' → ')}`,
          affectedTasks: cycle,
          likelihood: 1.0,
          predictedImpact: 'severe',
          evidence: [{
            type: 'dependency_cycle',
            description: `Cycle: ${cycle.join(' → ')}`,
            confidence: 1.0,
            source: 'static_analysis'
          }],
          detectionMethod: 'static'
        });

        return true;
      }

      if (visited.has(taskId)) return false;

      visited.add(taskId);
      inStack.add(taskId);

      const deps = dependsOn.get(taskId) || [];
      for (const dep of deps) {
        if (detectCycle(dep, [...path, taskId])) {
          return true;
        }
      }

      inStack.delete(taskId);
      return false;
    };

    for (const taskId of tasks.map(t => t.id)) {
      detectCycle(taskId, []);
    }

    return conflicts;
  }

  private detectPatternBasedConflicts(context: ConflictContext): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];

    for (const pattern of this.conflictPatterns.values()) {
      const matches = context.patternMatches.filter(match =>
        pattern.triggerPatterns.some(trigger => match.pattern.id === trigger)
      );

      if (matches.length >= pattern.minMatches) {
        conflicts.push({
          id: `pattern-conflict-${pattern.id}`,
          type: pattern.conflictType,
          severity: pattern.severity,
          description: pattern.description,
          affectedTasks: matches.map(m => ''), // Would need task mapping
          likelihood: pattern.likelihood,
          predictedImpact: pattern.predictedImpact,
          evidence: [{
            type: 'historical_data',
            description: `Pattern "${pattern.name}" detected`,
            confidence: Math.max(...matches.map(m => m.confidence)),
            source: 'pattern_analysis'
          }],
          detectionMethod: 'pattern'
        });
      }
    }

    return conflicts;
  }

  private detectHistoricalConflicts(context: ConflictContext): PotentialConflict[] {
    const conflicts: PotentialConflict[] = [];

    if (!context.executionHistory || context.executionHistory.length === 0) {
      return conflicts;
    }

    const recentFailures = context.executionHistory
      .slice(-20)
      .filter(h => h.conflicts && h.conflicts.length > 0);

    if (recentFailures.length > 0) {
      const commonConflicts = this.analyzeCommonConflicts(recentFailures);

      for (const [conflictType, frequency] of commonConflicts) {
        if (frequency >= 3) {
          conflicts.push({
            id: `historical-${conflictType}`,
            type: this.mapConflictType(conflictType),
            severity: frequency >= 5 ? 'high' : 'medium',
            description: `Historical data shows recurring ${conflictType} conflicts`,
            affectedTasks: context.tasks.map(t => t.id),
            likelihood: Math.min(0.9, frequency / 10),
            predictedImpact: 'moderate',
            evidence: [{
              type: 'historical_data',
              description: `${conflictType} occurred ${frequency} times in last 20 executions`,
              confidence: 0.8,
              source: 'execution_history'
            }],
            detectionMethod: 'historical'
          });
        }
      }
    }

    return conflicts;
  }

  private async detectSemanticConflicts(context: ConflictContext): Promise<PotentialConflict[]> {
    const conflicts: PotentialConflict[] = [];

    // Analyze task descriptions for semantic conflicts
    const semanticAnalysis = this.analyzeSemanticRelationships(context.tasks);

    for (const relationship of semanticAnalysis) {
      if (relationship.conflictProbability > 0.6) {
        conflicts.push({
          id: `semantic-${relationship.task1}-${relationship.task2}`,
          type: 'semantic',
          severity: relationship.conflictProbability > 0.8 ? 'high' : 'medium',
          description: `Semantic analysis suggests potential conflict between tasks: ${relationship.reason}`,
          affectedTasks: [relationship.task1, relationship.task2],
          likelihood: relationship.conflictProbability,
          predictedImpact: 'moderate',
          evidence: [{
            type: 'timing_pattern',
            description: relationship.reason,
            confidence: relationship.conflictProbability,
            source: 'semantic_analysis'
          }],
          detectionMethod: 'static'
        });
      }
    }

    return conflicts;
  }

  // Runtime conflict detection methods

  private detectFileSystemConflicts(execution: NonNullable<ConflictContext['currentExecution']>): ActualConflict[] {
    const conflicts: ActualConflict[] = [];

    execution.fileChanges.forEach((modifyingTasks, file) => {
      if (modifyingTasks.length > 1) {
        conflicts.push({
          id: `runtime-file-${file.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'resource',
          severity: 'high',
          description: `Multiple tasks are simultaneously modifying file: ${file}`,
          affectedTasks: modifyingTasks,
          detectedAt: Date.now(),
          manifestation: {
            symptoms: ['Concurrent file access detected'],
            errorMessages: [],
            affectedFiles: [file],
            performanceImpact: 0.3,
            dataCorruption: true
          }
        });
      }
    });

    return conflicts;
  }

  private detectResourceContention(context: ConflictContext): ActualConflict[] {
    const conflicts: ActualConflict[] = [];

    // This would integrate with system monitoring
    // For now, return empty array as it requires runtime monitoring
    return conflicts;
  }

  private detectDataConsistencyConflicts(context: ConflictContext): ActualConflict[] {
    const conflicts: ActualConflict[] = [];

    // This would integrate with database monitoring or state tracking
    return conflicts;
  }

  private detectTimingConflicts(context: ConflictContext): ActualConflict[] {
    const conflicts: ActualConflict[] = [];

    // This would monitor for race conditions and timing issues
    return conflicts;
  }

  // Resolution generation methods

  private generateResourceResolutions(conflict: PotentialConflict | ActualConflict): Resolution[] {
    return [
      {
        id: `serialize-${conflict.id}`,
        strategy: 'serialize',
        description: 'Execute conflicting tasks sequentially to avoid resource conflicts',
        effectiveness: 0.95,
        feasibility: 0.9,
        cost: 'medium',
        automated: true,
        estimatedTime: 'Increases execution time by ~50%'
      },
      {
        id: `isolate-${conflict.id}`,
        strategy: 'isolate',
        description: 'Create isolated workspaces for each task to prevent conflicts',
        effectiveness: 0.8,
        feasibility: 0.7,
        cost: 'high',
        automated: true,
        estimatedTime: 'Adds 2-3 minutes for setup'
      }
    ];
  }

  private generateDependencyResolutions(conflict: PotentialConflict | ActualConflict): Resolution[] {
    return [
      {
        id: `reorder-${conflict.id}`,
        strategy: 'serialize',
        description: 'Reorder tasks to respect dependencies and break cycles',
        effectiveness: 0.9,
        feasibility: 0.95,
        cost: 'low',
        automated: true,
        estimatedTime: 'No additional time'
      }
    ];
  }

  private generateDataResolutions(conflict: PotentialConflict | ActualConflict): Resolution[] {
    return [
      {
        id: `transaction-${conflict.id}`,
        strategy: 'isolate',
        description: 'Use database transactions to ensure data consistency',
        effectiveness: 0.85,
        feasibility: 0.6,
        cost: 'medium',
        automated: false,
        estimatedTime: 'Minimal impact'
      },
      {
        id: `serialize-data-${conflict.id}`,
        strategy: 'serialize',
        description: 'Execute data-modifying tasks sequentially',
        effectiveness: 0.95,
        feasibility: 0.9,
        cost: 'medium',
        automated: true,
        estimatedTime: 'Increases execution time'
      }
    ];
  }

  private generateTimingResolutions(conflict: PotentialConflict | ActualConflict): Resolution[] {
    return [
      {
        id: `synchronize-${conflict.id}`,
        strategy: 'isolate',
        description: 'Add synchronization points to prevent race conditions',
        effectiveness: 0.7,
        feasibility: 0.5,
        cost: 'high',
        automated: false,
        estimatedTime: 'Moderate impact'
      },
      {
        id: `retry-${conflict.id}`,
        strategy: 'retry',
        description: 'Implement retry logic for timing-sensitive operations',
        effectiveness: 0.6,
        feasibility: 0.8,
        cost: 'low',
        automated: true,
        estimatedTime: 'Variable'
      }
    ];
  }

  private generateSemanticResolutions(conflict: PotentialConflict | ActualConflict): Resolution[] {
    return [
      {
        id: `manual-review-${conflict.id}`,
        strategy: 'serialize',
        description: 'Manual review required - semantic conflicts need human judgment',
        effectiveness: 0.9,
        feasibility: 0.3,
        cost: 'high',
        automated: false,
        estimatedTime: 'Depends on complexity'
      }
    ];
  }

  // Helper methods

  private determineFileSeverity(file: string): 'low' | 'medium' | 'high' | 'critical' {
    if (file.includes('package.json') || file.includes('tsconfig.json')) {
      return 'critical';
    }
    if (file.includes('config') || file.includes('.env')) {
      return 'high';
    }
    if (file.endsWith('.md') || file.endsWith('.txt')) {
      return 'low';
    }
    return 'medium';
  }

  private getSeverityWeight(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity];
  }

  private analyzeCommonConflicts(failures: any[]): Map<string, number> {
    const conflicts = new Map<string, number>();

    failures.forEach(failure => {
      failure.conflicts.forEach((conflict: string) => {
        conflicts.set(conflict, (conflicts.get(conflict) || 0) + 1);
      });
    });

    return conflicts;
  }

  private mapConflictType(conflictType: string): 'resource' | 'dependency' | 'data' | 'timing' | 'semantic' {
    // Simple mapping - in real implementation, would be more sophisticated
    if (conflictType.includes('file')) return 'resource';
    if (conflictType.includes('dependency')) return 'dependency';
    if (conflictType.includes('data')) return 'data';
    if (conflictType.includes('timing')) return 'timing';
    return 'semantic';
  }

  private analyzeSemanticRelationships(tasks: ParallelTaskInfo[]): Array<{
    task1: string;
    task2: string;
    conflictProbability: number;
    reason: string;
  }> {
    const relationships = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];

        const analysis = this.semanticConflictAnalysis(task1, task2);
        if (analysis.conflictProbability > 0.5) {
          relationships.push({
            task1: task1.id,
            task2: task2.id,
            conflictProbability: analysis.conflictProbability,
            reason: analysis.reason
          });
        }
      }
    }

    return relationships;
  }

  private semanticConflictAnalysis(task1: ParallelTaskInfo, task2: ParallelTaskInfo): {
    conflictProbability: number;
    reason: string;
  } {
    const desc1 = task1.description.toLowerCase();
    const desc2 = task2.description.toLowerCase();

    // Simple semantic analysis
    if (desc1.includes('delete') && desc2.includes('create')) {
      return {
        conflictProbability: 0.8,
        reason: 'One task deletes while another creates - potential order dependency'
      };
    }

    if (desc1.includes('refactor') && desc2.includes('add')) {
      return {
        conflictProbability: 0.6,
        reason: 'Refactoring and adding features may conflict'
      };
    }

    // Check for overlapping keywords
    const words1 = new Set(desc1.split(' '));
    const words2 = new Set(desc2.split(' '));
    const commonWords = new Set([...words1].filter(x => words2.has(x)));

    if (commonWords.size > 2) {
      return {
        conflictProbability: Math.min(0.7, commonWords.size * 0.15),
        reason: `Tasks share ${commonWords.size} common concepts`
      };
    }

    return { conflictProbability: 0.1, reason: 'No significant semantic conflicts detected' };
  }

  private initializeConflictPatterns(): void {
    // Initialize known conflict patterns
    this.conflictPatterns.set('db-migration-conflict', {
      id: 'db-migration-conflict',
      name: 'Database Migration Conflict',
      description: 'Multiple database migrations running in parallel',
      triggerPatterns: ['database-operations', 'schema-changes'],
      minMatches: 2,
      conflictType: 'data',
      severity: 'critical',
      likelihood: 0.9,
      predictedImpact: 'severe'
    });

    this.conflictPatterns.set('config-file-conflict', {
      id: 'config-file-conflict',
      name: 'Configuration File Conflict',
      description: 'Multiple tasks modifying configuration files',
      triggerPatterns: ['configuration'],
      minMatches: 2,
      conflictType: 'resource',
      severity: 'high',
      likelihood: 0.8,
      predictedImpact: 'significant'
    });
  }

  // Public API methods

  getPredictedConflicts(): PotentialConflict[] {
    return Array.from(this.detectedConflicts.values());
  }

  getActualConflicts(): ActualConflict[] {
    return Array.from(this.actualConflicts.values());
  }

  clearConflicts(): void {
    this.detectedConflicts.clear();
    this.actualConflicts.clear();
  }
}

// Supporting interfaces

export interface Resolution {
  id: string;
  strategy: 'serialize' | 'isolate' | 'merge' | 'retry' | 'abort';
  description: string;
  effectiveness: number; // 0-1
  feasibility: number; // 0-1
  cost: 'low' | 'medium' | 'high';
  automated: boolean;
  estimatedTime: string;
}

interface ConflictPattern {
  id: string;
  name: string;
  description: string;
  triggerPatterns: string[];
  minMatches: number;
  conflictType: 'resource' | 'dependency' | 'data' | 'timing' | 'semantic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  predictedImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
}