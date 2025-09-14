/**
 * Main entry point for parallel execution module
 * Exports all public APIs for integration with Spec Workflow
 */

// Import for internal use
import { ParallelConfig as PC, ParallelConfigManager as PCM, defaultParallelConfig as defaultPC } from './config/parallel-config.js';

// Re-export Configuration
export {
  ParallelConfig,
  defaultParallelConfig,
  ParallelConfigManager
} from './config/parallel-config.js';

// Types
export {
  ParallelTaskInfo,
  TaskExecutionStatus,
  DependencyAnalysis,
  TaskGroup,
  TaskConflict,
  AnalysisMetadata,
  ParallelWebSocketMessage,
  ParallelAnalysisUpdate,
  TaskExecutionUpdate,
  ConflictDetected,
  GroupingUpdate,
  ParallelSuggestion
} from './types.js';

// Base Agent Architecture
export {
  BaseAgent,
  AgentContext,
  AgentResult,
  AgentMetrics,
  AgentCapability,
  AgentEvent,
  AgentEventListener
} from './agents/base-agent.js';

// Example Agent (will be replaced with real agents)
export { ExampleAnalyzerAgent } from './agents/example-agent.js';

// Phase 2: Parallel Execution
export {
  ParallelExecutor,
  ExecutionResult,
  IsolatedTaskContext,
  ExecutionQueue
} from './executors/parallel-executor.js';

export {
  ExecutionStateManager,
  TaskStateSnapshot,
  ExecutionSnapshot
} from './state/state-manager.js';

// Phase 3: Smart Coordination
export {
  SmartSuggestionSystem,
  ParallelRecommendation,
  Risk
} from './intelligence/suggestion-system.js';

export {
  PatternRecognitionEngine,
  PatternMatch,
  TaskPattern,
  LearningData
} from './intelligence/pattern-recognition.js';

export {
  RiskAssessor,
  RiskAssessment,
  RiskContext
} from './intelligence/risk-assessor.js';

export {
  SmartConflictDetector,
  PotentialConflict,
  ActualConflict,
  Resolution
} from './conflicts/smart-detector.js';

export {
  AdaptiveExecutor,
  ExecutionStrategy,
  AdaptationResult
} from './adaptive/dynamic-executor.js';

export {
  FeedbackSystem,
  FeedbackData,
  LearningInsights
} from './learning/feedback-system.js';

export {
  UserPreferencesManager,
  UserPreferences,
  PreferenceProfile
} from './preferences/user-preferences.js';

export {
  SmartCoordinationEngine,
  IntelligentAnalysis,
  ExecutionPlan,
  CoordinationResult
} from './intelligence/coordination-engine.js';

/**
 * Initialize parallel execution module
 */
export async function initializeParallelModule(config?: Partial<PC>): Promise<PCM> {
  const configManager = new PCM(config);
  
  // Validate configuration
  const validation = configManager.validateConfig();
  if (!validation.valid) {
    throw new Error(`Invalid parallel configuration: ${validation.errors.join(', ')}`);
  }
  
  // Log initialization
  console.log(`[Parallel Module] Initialized in ${configManager.isParallelEnabled() ? 'TURBO' : 'CLASSIC'} mode`);
  console.log(`[Parallel Module] Max parallel tasks: ${configManager.getMaxParallelTasks()}`);
  
  return configManager;
}

/**
 * Check if parallel features are available
 */
export function isParallelAvailable(): boolean {
  // In Phase 1, only analysis is available
  // This will be expanded in later phases
  return true;
}

/**
 * Get parallel module version
 */
export function getParallelVersion(): string {
  return '3.0.0-smart-coordination';
}

/**
 * Get parallel module status
 */
export interface ParallelModuleStatus {
  available: boolean;
  version: string;
  mode: 'classic' | 'turbo';
  features: {
    analysis: boolean;
    execution: boolean;
    worktree: boolean;
    agents: boolean;
  };
}

export function getParallelStatus(configManager?: PCM): ParallelModuleStatus {
  const config = configManager?.getConfig() || defaultPC;

  return {
    available: isParallelAvailable(),
    version: getParallelVersion(),
    mode: config.mode,
    features: {
      analysis: true,  // Phase 1 ✅
      execution: true, // Phase 2 ✅
      worktree: false,  // Phase 4
      agents: true // Phase 3 ✅ - Smart Coordination
    }
  };
}