/**
 * WebSocket handler for parallel analysis results
 * Manages communication between backend analysis and frontend display
 */

import { WebSocket } from 'ws';
import { ParallelAnalysisUpdate, TaskExecutionUpdate, ConflictDetected, GroupingUpdate, TaskState } from '../parallel/types.js';
import { EnhancedTaskParser } from '../parallel/analyzers/enhanced-task-parser.js';
import { CCPMAnalyzerAgent } from '../parallel/agents/ccpm-analyzer-agent.js';
import { ParallelExecutor, ExecutionResult } from '../parallel/executors/parallel-executor.js';
import { ExecutionStateManager } from '../parallel/state/state-manager.js';
import { RollbackManager } from '../parallel/recovery/rollback-manager.js';
import { ParallelConfigManager } from '../parallel/config/parallel-config.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Parallel analysis WebSocket handler
 */
export class ParallelAnalysisHandler {
  private parser: EnhancedTaskParser;
  private ccpmAnalyzer: CCPMAnalyzerAgent;
  private analysisCache: Map<string, any>;
  private executor: ParallelExecutor | null;
  private stateManager: ExecutionStateManager;
  private rollbackManager: RollbackManager | null;
  private configManager: ParallelConfigManager;
  private activeConnections: Set<WebSocket>;

  constructor() {
    this.parser = new EnhancedTaskParser();
    this.ccpmAnalyzer = new CCPMAnalyzerAgent();
    this.analysisCache = new Map();
    this.executor = null;
    this.stateManager = new ExecutionStateManager();
    this.rollbackManager = null;
    this.configManager = new ParallelConfigManager();
    this.activeConnections = new Set();

    // Set up state change listener
    this.stateManager.addStateChangeListener((snapshot) => {
      this.broadcastExecutionUpdate(snapshot);
    });
  }

  /**
   * Handle WebSocket message
   */
  async handleMessage(ws: WebSocket, message: any): Promise<void> {
    try {
      const { type, data } = message;

      switch (type) {
        case 'analyzeParallel':
          await this.handleAnalyzeParallel(ws, data);
          break;

        case 'analyzeCCPM':
          await this.handleAnalyzeCCPM(ws, data);
          break;

        case 'executeParallel':
          await this.handleExecuteParallel(ws, data);
          break;

        case 'stopExecution':
          await this.handleStopExecution(ws, data);
          break;

        case 'setExecutionMode':
          await this.handleSetExecutionMode(ws, data);
          break;

        case 'setMaxParallelTasks':
          await this.handleSetMaxParallelTasks(ws, data);
          break;

        case 'getRollbackPoints':
          await this.handleGetRollbackPoints(ws, data);
          break;

        case 'rollbackToPoint':
          await this.handleRollbackToPoint(ws, data);
          break;

        case 'getExecutionStatus':
          await this.handleGetExecutionStatus(ws, data);
          break;

        case 'applySuggestion':
          await this.handleApplySuggestion(ws, data);
          break;

        case 'getAnalysisCache':
          await this.handleGetCache(ws, data);
          break;

        case 'clearCache':
          this.analysisCache.clear();
          ws.send(JSON.stringify({ type: 'cacheCleared' }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${type}`
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle parallel analysis request
   */
  private async handleAnalyzeParallel(ws: WebSocket, data: any): Promise<void> {
    const { specName, projectPath } = data;

    // Send progress update
    ws.send(JSON.stringify({
      type: 'analysisProgress',
      progress: 10,
      message: 'Loading task file...'
    }));

    // Load task file
    const taskFile = join(projectPath, '.spec-workflow', 'specs', specName, 'tasks.md');
    const content = await fs.readFile(taskFile, 'utf-8');

    // Send progress update
    ws.send(JSON.stringify({
      type: 'analysisProgress',
      progress: 30,
      message: 'Parsing tasks...'
    }));

    // Parse with dependency analysis
    const result = await this.parser.parseWithDependencies(content);

    // Send progress update
    ws.send(JSON.stringify({
      type: 'analysisProgress',
      progress: 70,
      message: 'Analyzing dependencies...'
    }));

    // Cache the result
    const cacheKey = `${projectPath}:${specName}`;
    this.analysisCache.set(cacheKey, result);

    // Send progress update
    ws.send(JSON.stringify({
      type: 'analysisProgress',
      progress: 90,
      message: 'Generating visualization...'
    }));

    // Prepare visualization data
    const visualizationData = this.prepareVisualizationData(result);

    // Send analysis update
    const update: ParallelAnalysisUpdate = {
      type: 'parallelAnalysis',
      analysis: result.dependencyAnalysis,
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(update));

    // Send visualization data
    ws.send(JSON.stringify({
      type: 'visualizationData',
      data: visualizationData
    }));

    // Send grouping update
    const groupingUpdate: GroupingUpdate = {
      type: 'groupingUpdate',
      groups: result.dependencyAnalysis.parallelGroups,
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(groupingUpdate));

    // Send warnings if any
    if (result.warnings.length > 0) {
      ws.send(JSON.stringify({
        type: 'analysisWarnings',
        warnings: result.warnings
      }));
    }

    // Send completion
    ws.send(JSON.stringify({
      type: 'analysisProgress',
      progress: 100,
      message: 'Analysis complete!'
    }));
  }

  /**
   * Handle CCPM analysis request
   */
  private async handleAnalyzeCCPM(ws: WebSocket, data: any): Promise<void> {
    const { projectPath } = data;

    // Send progress
    ws.send(JSON.stringify({
      type: 'ccpmProgress',
      progress: 10,
      message: 'Locating CCPM project...'
    }));

    // Analyze CCPM project
    const context = {
      projectPath,
      workflowRoot: join(projectPath, '.spec-workflow'),
      config: {
        ccpmPath: join(projectPath, '../ccpm')
      }
    };

    ws.send(JSON.stringify({
      type: 'ccpmProgress',
      progress: 30,
      message: 'Analyzing CCPM structure...'
    }));

    const result = await this.ccpmAnalyzer.execute(context);

    ws.send(JSON.stringify({
      type: 'ccpmProgress',
      progress: 80,
      message: 'Processing results...'
    }));

    // Send CCPM analysis result
    ws.send(JSON.stringify({
      type: 'ccpmAnalysis',
      success: result.success,
      data: result.data,
      error: result.error,
      suggestions: result.suggestions
    }));

    ws.send(JSON.stringify({
      type: 'ccpmProgress',
      progress: 100,
      message: 'CCPM analysis complete!'
    }));
  }

  /**
   * Handle cache retrieval
   */
  private async handleGetCache(ws: WebSocket, data: any): Promise<void> {
    const { specName, projectPath } = data;
    const cacheKey = `${projectPath}:${specName}`;

    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      ws.send(JSON.stringify({
        type: 'cachedAnalysis',
        data: cached
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'noCacheAvailable'
      }));
    }
  }

  /**
   * Prepare visualization data for frontend
   */
  private prepareVisualizationData(result: any): any {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Create nodes for each task
    result.tasks.forEach((task: any) => {
      nodes.push({
        id: task.id,
        label: task.description.substring(0, 30),
        type: task.parallelSafe ? 'parallel' : 'sequential',
        status: task.status,
        level: 0 // Will be calculated
      });
    });

    // Create edges for dependencies
    result.tasks.forEach((task: any) => {
      if (task.dependencies) {
        task.dependencies.forEach((depId: string) => {
          edges.push({
            source: depId,
            target: task.id,
            type: 'dependency'
          });
        });
      }
    });

    // Calculate levels for hierarchical layout
    const levels = this.calculateNodeLevels(nodes, edges);
    nodes.forEach(node => {
      node.level = levels.get(node.id) || 0;
    });

    // Group nodes by parallel groups
    const groups = result.dependencyAnalysis.parallelGroups.map((group: any, index: number) => ({
      id: group.id,
      index,
      tasks: group.tasks,
      color: this.getGroupColor(group.risk),
      risk: group.risk,
      confidence: group.confidence
    }));

    return {
      nodes,
      edges,
      groups,
      stats: {
        totalTasks: result.tasks.length,
        independentTasks: result.dependencyAnalysis.metadata.independentTasks,
        maxParallelism: result.dependencyAnalysis.metadata.maxParallelism,
        circularDependencies: result.dependencyAnalysis.circularDependencies.length,
        conflicts: result.dependencyAnalysis.potentialConflicts.length
      }
    };
  }

  /**
   * Calculate node levels for visualization
   */
  private calculateNodeLevels(nodes: any[], edges: any[]): Map<string, number> {
    const levels = new Map<string, number>();
    const dependencies = new Map<string, Set<string>>();

    // Build dependency map
    edges.forEach(edge => {
      if (!dependencies.has(edge.target)) {
        dependencies.set(edge.target, new Set());
      }
      dependencies.get(edge.target)!.add(edge.source);
    });

    // Calculate levels
    const calculateLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) {
        return levels.get(nodeId)!;
      }

      const deps = dependencies.get(nodeId);
      if (!deps || deps.size === 0) {
        levels.set(nodeId, 0);
        return 0;
      }

      let maxDepLevel = 0;
      deps.forEach(depId => {
        maxDepLevel = Math.max(maxDepLevel, calculateLevel(depId));
      });

      const level = maxDepLevel + 1;
      levels.set(nodeId, level);
      return level;
    };

    nodes.forEach(node => calculateLevel(node.id));

    return levels;
  }

  /**
   * Get color for risk level
   */
  private getGroupColor(risk: string): string {
    switch (risk) {
      case 'low':
        return '#10b981'; // green
      case 'medium':
        return '#f59e0b'; // amber
      case 'high':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Handle parallel execution request
   */
  private async handleExecuteParallel(ws: WebSocket, data: any): Promise<void> {
    const { specName, projectPath } = data;

    try {
      // Initialize executor if not exists
      if (!this.executor) {
        const config = this.configManager.getConfig();
        this.executor = new ParallelExecutor(config);

        // Initialize rollback manager
        const backupDir = join(projectPath, '.spec-workflow', 'backups');
        this.rollbackManager = new RollbackManager(this.stateManager, backupDir);
        await this.rollbackManager.loadPersistedRollbackPoints();
      }

      // Get cached analysis
      const cacheKey = `${projectPath}:${specName}`;
      const analysisResult = this.analysisCache.get(cacheKey);

      if (!analysisResult) {
        ws.send(JSON.stringify({
          type: 'executionError',
          error: 'No analysis data available. Please run analysis first.'
        }));
        return;
      }

      const tasks = analysisResult.tasks;

      // Initialize state manager
      this.stateManager.initializeTasks(tasks);
      this.stateManager.startExecution();

      // Create rollback point
      const rollbackId = await this.rollbackManager!.createRollbackPoint(
        `Before executing ${specName}`,
        [join(projectPath, '.spec-workflow', 'specs', specName, 'tasks.md')]
      );

      ws.send(JSON.stringify({
        type: 'executionStarted',
        rollbackId,
        tasks: tasks.length,
        mode: this.configManager.getConfig().mode
      }));

      // Start execution
      const results = await this.executor.executeParallel(tasks, projectPath);

      // Update final state
      if (results.some(r => !r.success)) {
        this.stateManager.failExecution();
      } else {
        this.stateManager.completeExecution();
      }

      ws.send(JSON.stringify({
        type: 'executionCompleted',
        results,
        success: results.every(r => r.success)
      }));

    } catch (error) {
      this.stateManager.failExecution();
      ws.send(JSON.stringify({
        type: 'executionError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle stop execution request
   */
  private async handleStopExecution(ws: WebSocket, data: any): Promise<void> {
    try {
      if (this.executor && this.executor.isExecuting()) {
        await this.executor.stop();
        this.stateManager.stopExecution();

        ws.send(JSON.stringify({
          type: 'executionStopped',
          timestamp: new Date().toISOString()
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'executionNotRunning'
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'executionError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle execution mode change
   */
  private async handleSetExecutionMode(ws: WebSocket, data: any): Promise<void> {
    const { mode } = data;

    try {
      this.configManager.updateConfig({ mode });

      // Reinitialize executor with new config
      if (this.executor) {
        await this.executor.stop();
        this.executor = new ParallelExecutor(this.configManager.getConfig());
      }

      ws.send(JSON.stringify({
        type: 'executionModeUpdated',
        mode
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'configError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle max parallel tasks change
   */
  private async handleSetMaxParallelTasks(ws: WebSocket, data: any): Promise<void> {
    const { maxTasks } = data;

    try {
      const clamped = Math.min(3, Math.max(1, maxTasks));
      this.configManager.updateConfig({ maxParallelTasks: clamped });

      // Reinitialize executor with new config
      if (this.executor) {
        await this.executor.stop();
        this.executor = new ParallelExecutor(this.configManager.getConfig());
      }

      ws.send(JSON.stringify({
        type: 'maxParallelTasksUpdated',
        maxTasks: clamped
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'configError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle get rollback points request
   */
  private async handleGetRollbackPoints(ws: WebSocket, data: any): Promise<void> {
    try {
      if (!this.rollbackManager) {
        ws.send(JSON.stringify({
          type: 'rollbackPoints',
          points: []
        }));
        return;
      }

      const points = this.rollbackManager.getRollbackPoints();
      ws.send(JSON.stringify({
        type: 'rollbackPoints',
        points: points.map(p => ({
          id: p.id,
          timestamp: p.timestamp,
          description: p.description
        }))
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'rollbackError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle rollback to point request
   */
  private async handleRollbackToPoint(ws: WebSocket, data: any): Promise<void> {
    const { rollbackId } = data;

    try {
      if (!this.rollbackManager) {
        ws.send(JSON.stringify({
          type: 'rollbackError',
          error: 'Rollback manager not initialized'
        }));
        return;
      }

      const success = await this.rollbackManager.rollbackToPoint(rollbackId);

      ws.send(JSON.stringify({
        type: 'rollbackCompleted',
        success,
        rollbackId
      }));

      if (success) {
        // Broadcast state update
        const snapshot = this.stateManager.createSnapshot();
        this.broadcastExecutionUpdate(snapshot);
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'rollbackError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle get execution status request
   */
  private async handleGetExecutionStatus(ws: WebSocket, data: any): Promise<void> {
    try {
      const status = this.executor ? this.executor.getExecutionStatus() : null;
      const progress = this.stateManager.getExecutionProgress();
      const tasks = this.stateManager.getAllTaskStates();

      ws.send(JSON.stringify({
        type: 'executionStatus',
        status,
        progress,
        tasks,
        isExecuting: this.executor?.isExecuting() || false
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'statusError',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle apply suggestion request
   */
  private async handleApplySuggestion(ws: WebSocket, data: any): Promise<void> {
    const { suggestionId, suggestion } = data;

    try {
      // Apply suggestion to configuration
      if (suggestion.type === 'safe' && suggestion.taskGroups) {
        // Apply safe parallel execution suggestion
        this.configManager.updateConfig({
          mode: 'turbo',
          enableSuggestions: true
        });

        // Reinitialize executor
        if (this.executor) {
          await this.executor.stop();
          this.executor = new ParallelExecutor(this.configManager.getConfig());
        }
      }

      ws.send(JSON.stringify({
        type: 'suggestionApplied',
        suggestionId,
        success: true
      }));

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'suggestionError',
        suggestionId,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Register WebSocket connection
   */
  addConnection(ws: WebSocket): void {
    this.activeConnections.add(ws);

    ws.on('close', () => {
      this.activeConnections.delete(ws);
    });
  }

  /**
   * Broadcast execution update to all connected clients
   */
  private broadcastExecutionUpdate(snapshot: any): void {
    const message = JSON.stringify({
      type: 'executionStateUpdate',
      snapshot,
      timestamp: new Date().toISOString()
    });

    this.activeConnections.forEach(ws => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      } catch (error) {
        console.warn('Failed to broadcast execution update:', error);
        this.activeConnections.delete(ws);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.executor) {
      await this.executor.stop();
    }

    this.stateManager.clear();
    this.activeConnections.clear();
  }
}