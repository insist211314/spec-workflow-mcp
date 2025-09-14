/**
 * Base agent architecture for parallel execution
 * All agents extend this base class to provide consistent interface
 */

import { ParallelTaskInfo } from '../types.js';

/**
 * Context provided to agents for execution
 */
export interface AgentContext {
  /**
   * Project root path
   */
  projectPath: string;

  /**
   * Spec workflow root (.spec-workflow directory)
   */
  workflowRoot: string;

  /**
   * Current spec being processed
   */
  specName?: string;

  /**
   * Tasks to be processed
   */
  tasks?: ParallelTaskInfo[];

  /**
   * Agent-specific configuration
   */
  config?: Record<string, any>;

  /**
   * Language for i18n
   */
  lang?: string;

  /**
   * Dashboard URL if available
   */
  dashboardUrl?: string;

  /**
   * Timeout for this execution in milliseconds
   */
  timeout?: number;

  /**
   * Working directory for this execution
   */
  workingDirectory?: string;

  /**
   * Environment variables for this execution
   */
  environment?: Record<string, string>;

  /**
   * Resources allocated to this execution
   */
  resources?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Result returned by agent execution
 */
export interface AgentResult {
  /**
   * Whether the execution was successful
   */
  success: boolean;

  /**
   * Result data
   */
  data?: any;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Execution metrics
   */
  metrics?: AgentMetrics;

  /**
   * Warnings or important messages
   */
  warnings?: string[];

  /**
   * Suggestions for improvement
   */
  suggestions?: string[];

  /**
   * Compressed output (for context optimization)
   */
  compressed?: boolean;

  /**
   * Original size before compression (if compressed)
   */
  originalSize?: number;

  /**
   * Compressed size (if compressed)
   */
  compressedSize?: number;
}

/**
 * Agent execution metrics
 */
export interface AgentMetrics {
  /**
   * Execution start time
   */
  startTime: number;

  /**
   * Execution end time
   */
  endTime: number;

  /**
   * Total duration in milliseconds
   */
  duration: number;

  /**
   * Memory used in bytes
   */
  memoryUsed?: number;

  /**
   * Number of operations performed
   */
  operationCount?: number;

  /**
   * Custom metrics specific to the agent
   */
  custom?: Record<string, number>;
}

/**
 * Agent capability descriptor
 */
export interface AgentCapability {
  /**
   * Capability name
   */
  name: string;

  /**
   * Description of what this capability does
   */
  description: string;

  /**
   * Input parameters required
   */
  inputSchema?: Record<string, any>;

  /**
   * Output format
   */
  outputSchema?: Record<string, any>;

  /**
   * Examples of usage
   */
  examples?: string[];
}

/**
 * Agent lifecycle events
 */
export type AgentEvent = 
  | 'initialized'
  | 'starting'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

/**
 * Agent event listener
 */
export type AgentEventListener = (event: AgentEvent, data?: any) => void;

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent {
  /**
   * Agent name
   */
  protected name: string;

  /**
   * Agent version
   */
  protected version: string;

  /**
   * Agent capabilities
   */
  protected capabilities: AgentCapability[];

  /**
   * Event listeners
   */
  private eventListeners: Map<AgentEvent, AgentEventListener[]>;

  /**
   * Current execution context
   */
  protected currentContext?: AgentContext;

  /**
   * Execution metrics
   */
  protected metrics?: AgentMetrics;

  constructor(name: string, version: string = '1.0.0') {
    this.name = name;
    this.version = version;
    this.capabilities = [];
    this.eventListeners = new Map();
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get agent version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return [...this.capabilities];
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Validate context before execution
   */
  protected validateContext(context: AgentContext): void {
    if (!context.projectPath) {
      throw new Error('Project path is required in context');
    }
    if (!context.workflowRoot) {
      throw new Error('Workflow root is required in context');
    }
  }

  /**
   * Execute with automatic metrics tracking
   */
  async run(context: AgentContext): Promise<AgentResult> {
    this.currentContext = context;
    this.metrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0
    };

    try {
      this.emit('initialized');
      this.validateContext(context);
      
      this.emit('starting');
      
      // Set timeout if specified
      const timeoutPromise = context.timeout 
        ? new Promise<AgentResult>((_, reject) => 
            setTimeout(() => reject(new Error('Agent execution timeout')), context.timeout)
          )
        : null;

      this.emit('executing');
      
      // Execute with timeout
      const result = timeoutPromise
        ? await Promise.race([this.execute(context), timeoutPromise])
        : await this.execute(context);

      this.metrics.endTime = Date.now();
      this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
      
      result.metrics = this.metrics;
      
      this.emit('completed', result);
      return result;

    } catch (error) {
      this.metrics!.endTime = Date.now();
      this.metrics!.duration = this.metrics!.endTime - this.metrics!.startTime;
      
      const errorResult: AgentResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: this.metrics
      };
      
      this.emit('failed', errorResult);
      return errorResult;
    } finally {
      this.currentContext = undefined;
    }
  }

  /**
   * Cancel current execution
   */
  cancel(): void {
    this.emit('cancelled');
  }

  /**
   * Add event listener
   */
  on(event: AgentEvent, listener: AgentEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: AgentEvent, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  protected emit(event: AgentEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(event, data));
    }
  }

  /**
   * Compress data for context optimization
   * Implements CCPM's 80% compression goal
   */
  protected compress(data: any): any {
    // Base implementation - can be overridden by subclasses
    // This is a placeholder - real compression would be more sophisticated
    if (typeof data === 'string' && data.length > 1000) {
      // Simple compression: extract key information
      const lines = data.split('\n');
      const summary = lines
        .filter((line, index) => 
          index < 10 || // Keep first 10 lines
          line.includes('error') || 
          line.includes('ERROR') ||
          line.includes('warning') ||
          line.includes('WARNING') ||
          line.includes('failed') ||
          line.includes('FAILED')
        )
        .join('\n');
      
      return {
        compressed: true,
        summary,
        originalLength: data.length,
        compressedLength: summary.length,
        compressionRatio: ((data.length - summary.length) / data.length * 100).toFixed(1) + '%'
      };
    }
    
    return data;
  }

  /**
   * Log message with agent context
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.name}]`;
    switch (level) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * Get agent information
   */
  getInfo(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      capabilities: this.capabilities.map(c => ({
        name: c.name,
        description: c.description
      })),
      ready: true
    };
  }
}