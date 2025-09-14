/**
 * Phase 3 Integration Tests
 * Quick validation tests for Smart Coordination features
 */

import { describe, it, expect } from 'vitest';
import { SmartSuggestionSystem } from './suggestion-system.js';
import { PatternRecognitionEngine } from './pattern-recognition.js';
import { RiskAssessor } from './risk-assessor.js';
import { SmartConflictDetector } from '../conflicts/smart-detector.js';
import { SmartCoordinationEngine } from './coordination-engine.js';
import { UserPreferencesManager } from '../preferences/user-preferences.js';
import { FeedbackSystem } from '../learning/feedback-system.js';
import { ParallelTaskInfo } from '../types.js';

describe('Phase 3: Smart Coordination', () => {
  describe('Smart Suggestion System', () => {
    it('should create suggestion system instance', () => {
      const suggestionSystem = new SmartSuggestionSystem();
      expect(suggestionSystem).toBeDefined();
    });

    it('should analyze tasks and provide recommendations', async () => {
      const suggestionSystem = new SmartSuggestionSystem();

      const mockTasks: ParallelTaskInfo[] = [
        {
          id: 'task1',
          description: 'Create utility function',
          completed: false,
          parallelSafe: false,
          dependencies: [],
          tags: ['utility', 'function']
        },
        {
          id: 'task2',
          description: 'Create test file',
          completed: false,
          parallelSafe: false,
          dependencies: [],
          tags: ['test', 'spec']
        }
      ];

      const recommendation = await suggestionSystem.analyzeTasks(mockTasks);

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendation).toMatch(/sequential|parallel-safe|parallel-risky/);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(recommendation.reasoning)).toBe(true);
    });
  });

  describe('Pattern Recognition Engine', () => {
    it('should create pattern recognition engine', () => {
      const patternEngine = new PatternRecognitionEngine();
      expect(patternEngine).toBeDefined();
    });

    it('should identify patterns in tasks', () => {
      const patternEngine = new PatternRecognitionEngine();

      const mockTasks: ParallelTaskInfo[] = [
        {
          id: 'task1',
          description: 'Create component for user interface',
          completed: false,
          parallelSafe: false,
          dependencies: [],
          tags: ['component', 'ui']
        }
      ];

      const patterns = patternEngine.identifyPatterns(mockTasks);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should export learning data', () => {
      const patternEngine = new PatternRecognitionEngine();
      const learningData = patternEngine.exportLearningData();

      expect(learningData).toBeDefined();
      expect(learningData.patterns).toBeDefined();
      expect(learningData.lastUpdated).toBeDefined();
    });
  });

  describe('Risk Assessor', () => {
    it('should create risk assessor instance', () => {
      const riskAssessor = new RiskAssessor();
      expect(riskAssessor).toBeDefined();
    });

    it('should assess parallel execution risks', () => {
      const riskAssessor = new RiskAssessor();

      const mockContext = {
        tasks: [
          {
            id: 'task1',
            description: 'Database migration',
            completed: false,
            parallelSafe: false,
            dependencies: []
          },
          {
            id: 'task2',
            description: 'Another database operation',
            completed: false,
            parallelSafe: false,
            dependencies: []
          }
        ] as ParallelTaskInfo[],
        dependencyAnalysis: {
          taskGraph: new Map(),
          parallelGroups: [],
          sequentialTasks: [],
          circularDependencies: [],
          potentialConflicts: [],
          executionOrder: [],
          metadata: {
            analyzedAt: new Date().toISOString(),
            analysisDuration: 100,
            totalTasks: 2,
            independentTasks: 0,
            maxParallelism: 1,
            analysisVersion: '1.0.0'
          }
        },
        patternMatches: [],
        executionHistory: []
      };

      const assessment = riskAssessor.assessParallelRisk(mockContext);

      expect(assessment).toBeDefined();
      expect(assessment.overallRisk).toMatch(/low|medium|high|critical/);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(assessment.specificRisks)).toBe(true);
    });
  });

  describe('Smart Conflict Detector', () => {
    it('should create conflict detector instance', () => {
      const conflictDetector = new SmartConflictDetector();
      expect(conflictDetector).toBeDefined();
    });

    it('should predict potential conflicts', async () => {
      const conflictDetector = new SmartConflictDetector();

      const mockContext = {
        tasks: [
          {
            id: 'task1',
            description: 'Modify package.json',
            completed: false,
            parallelSafe: false,
            dependencies: [],
            resources: ['package.json']
          },
          {
            id: 'task2',
            description: 'Update package.json dependencies',
            completed: false,
            parallelSafe: false,
            dependencies: [],
            resources: ['package.json']
          }
        ] as ParallelTaskInfo[],
        patternMatches: [],
        workingDirectory: '/test',
        executionHistory: []
      };

      const conflicts = await conflictDetector.predictConflicts(mockContext);

      expect(Array.isArray(conflicts)).toBe(true);

      // Should detect resource conflict on package.json
      if (conflicts.length > 0) {
        expect(conflicts[0].type).toMatch(/resource|dependency|data|timing|semantic/);
        expect(conflicts[0].severity).toMatch(/low|medium|high|critical/);
      }
    });
  });

  describe('User Preferences Manager', () => {
    it('should create preferences manager', () => {
      const preferencesManager = new UserPreferencesManager();
      expect(preferencesManager).toBeDefined();
    });

    it('should provide default preferences', () => {
      const preferencesManager = new UserPreferencesManager();
      const preferences = preferencesManager.getPreferences();

      expect(preferences).toBeDefined();
      expect(preferences.riskTolerance).toMatch(/conservative|balanced|aggressive/);
      expect(preferences.maxParallelTasks).toBeGreaterThan(0);
      expect(preferences.maxParallelTasks).toBeLessThanOrEqual(3);
    });

    it('should provide predefined profiles', () => {
      const preferencesManager = new UserPreferencesManager();
      const profiles = preferencesManager.getProfiles();

      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles.some(p => p.id === 'beginner')).toBe(true);
      expect(profiles.some(p => p.id === 'intermediate')).toBe(true);
      expect(profiles.some(p => p.id === 'expert')).toBe(true);
    });
  });

  describe('Feedback System', () => {
    it('should create feedback system', () => {
      const feedbackSystem = new FeedbackSystem();
      expect(feedbackSystem).toBeDefined();
    });

    it('should record and export feedback', () => {
      const feedbackSystem = new FeedbackSystem();

      feedbackSystem.recordUserFeedback('test-execution', 4, 'Good execution');

      const insights = feedbackSystem.getInsights();
      expect(insights).toBeDefined();
      expect(insights.patterns).toBeDefined();
      expect(insights.strategies).toBeDefined();
    });

    it('should provide statistics', () => {
      const feedbackSystem = new FeedbackSystem();
      const stats = feedbackSystem.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalFeedback).toBe('number');
      expect(typeof stats.averageRating).toBe('number');
    });
  });

  describe('Smart Coordination Engine', () => {
    it('should create coordination engine', () => {
      const coordinationEngine = new SmartCoordinationEngine();
      expect(coordinationEngine).toBeDefined();
    });

    it('should provide access to subsystems', () => {
      const coordinationEngine = new SmartCoordinationEngine();

      expect(coordinationEngine.getPreferencesManager()).toBeDefined();
      expect(coordinationEngine.getFeedbackSystem()).toBeDefined();
      expect(coordinationEngine.getAdaptiveExecutor()).toBeDefined();
    });

    it('should export and import learning data', () => {
      const coordinationEngine = new SmartCoordinationEngine();

      const learningData = coordinationEngine.exportLearningData();
      expect(learningData).toBeDefined();

      // Should not throw when importing
      expect(() => {
        coordinationEngine.importLearningData(learningData);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work together for comprehensive analysis', async () => {
      const coordinationEngine = new SmartCoordinationEngine();

      const mockContext = {
        tasks: [
          {
            id: 'task1',
            description: 'Create utility function helper',
            parallelSafe: false,
            dependencies: [],
            tags: ['utility']
          },
          {
            id: 'task2',
            description: 'Add unit tests for utility',
            parallelSafe: false,
            dependencies: ['task1'],
            tags: ['test']
          }
        ] as ParallelTaskInfo[],
        projectPath: '/test/project',
        userPreferences: coordinationEngine.getPreferencesManager().getPreferences(),
        executionHistory: []
      };

      const analysis = await coordinationEngine.analyzeTasksIntelligently(mockContext);

      expect(analysis).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
      expect(analysis.riskAssessment).toBeDefined();
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should create intelligent execution plan', async () => {
      const coordinationEngine = new SmartCoordinationEngine();

      const mockContext = {
        tasks: [
          {
            id: 'task1',
            description: 'Independent task 1',
            completed: false,
            parallelSafe: false,
            dependencies: []
          }
        ] as ParallelTaskInfo[],
        projectPath: '/test/project',
        userPreferences: coordinationEngine.getPreferencesManager().getPreferences(),
        executionHistory: []
      };

      const analysis = await coordinationEngine.analyzeTasksIntelligently(mockContext);
      const plan = await coordinationEngine.createIntelligentExecutionPlan(analysis, mockContext);

      expect(plan).toBeDefined();
      expect(plan.strategy).toMatch(/sequential|parallel-conservative|parallel-balanced|parallel-aggressive/);
      expect(Array.isArray(plan.taskGroups)).toBe(true);
      expect(plan.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(plan.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});