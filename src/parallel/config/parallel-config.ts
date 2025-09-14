/**
 * Parallel execution configuration for Spec Workflow
 * Integrates CCPM's parallel capabilities into the existing system
 */

export interface ParallelConfig {
  /**
   * Execution mode
   * - 'classic': Traditional sequential execution (default)
   * - 'turbo': Parallel execution with dependency analysis
   */
  mode: 'classic' | 'turbo';

  /**
   * Maximum number of tasks that can run in parallel
   * User requirement: Maximum 3 for stability
   * @default 3
   */
  maxParallelTasks: number;

  /**
   * Enable smart suggestions for parallel execution
   * Shows recommendations for safe parallel task groups
   * @default true
   */
  enableSuggestions: boolean;

  /**
   * Timeout for agent execution in milliseconds
   * @default 300000 (5 minutes)
   */
  agentTimeout: number;

  /**
   * Enable dependency analysis
   * Analyzes task dependencies to determine safe parallel groups
   * @default true
   */
  enableDependencyAnalysis: boolean;

  /**
   * Strict mode: Only parallelize tasks with zero dependencies
   * When false, allows parallel execution of tasks with resolved dependencies
   * @default true
   */
  strictIndependence: boolean;

  /**
   * Dashboard integration settings
   */
  dashboard: {
    /**
     * Show parallel analysis tab in dashboard
     * @default true
     */
    showParallelAnalysis: boolean;

    /**
     * Enable real-time updates for parallel execution
     * @default true
     */
    enableRealtimeUpdates: boolean;

    /**
     * Show dependency graph visualization
     * @default true
     */
    showDependencyGraph: boolean;
  };

  /**
   * Agent system configuration
   */
  agents: {
    /**
     * Enable CCPM agent integration
     * @default false (will be true after Phase 3)
     */
    enableCCPMAgents: boolean;

    /**
     * Agent communication timeout in milliseconds
     * @default 60000 (1 minute)
     */
    communicationTimeout: number;

    /**
     * Enable context compression (80% reduction as per CCPM)
     * @default true
     */
    enableContextCompression: boolean;
  };
}

/**
 * Default configuration values
 */
export const defaultParallelConfig: ParallelConfig = {
  mode: 'classic',
  maxParallelTasks: 3,
  enableSuggestions: true,
  agentTimeout: 300000,
  enableDependencyAnalysis: true,
  strictIndependence: true,
  dashboard: {
    showParallelAnalysis: true,
    enableRealtimeUpdates: true,
    showDependencyGraph: true
  },
  agents: {
    enableCCPMAgents: false,
    communicationTimeout: 60000,
    enableContextCompression: true
  }
};

/**
 * Configuration manager for parallel execution settings
 */
export class ParallelConfigManager {
  private config: ParallelConfig;

  constructor(config?: Partial<ParallelConfig>) {
    this.config = { ...defaultParallelConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ParallelConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ParallelConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if parallel execution is enabled
   */
  isParallelEnabled(): boolean {
    return this.config.mode === 'turbo';
  }

  /**
   * Get maximum parallel tasks allowed
   */
  getMaxParallelTasks(): number {
    return Math.min(this.config.maxParallelTasks, 3); // Hard limit of 3
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof ParallelConfig): boolean {
    const value = this.config[feature];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * Export configuration for persistence
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.config = { ...defaultParallelConfig, ...imported };
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.config = { ...defaultParallelConfig };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.maxParallelTasks < 1 || this.config.maxParallelTasks > 3) {
      errors.push('maxParallelTasks must be between 1 and 3');
    }

    if (this.config.agentTimeout < 1000) {
      errors.push('agentTimeout must be at least 1000ms');
    }

    if (this.config.agents.communicationTimeout < 1000) {
      errors.push('communicationTimeout must be at least 1000ms');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}