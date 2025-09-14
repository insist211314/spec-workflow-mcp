/**
 * Phase 4: Full Integration - Export Index
 *
 * This file exports all the components implemented in Phase 4 of the
 * Spec Workflow MCP Pro parallel execution integration.
 */

import { WorktreeManager } from './git/worktree-manager.js';
import { UnifiedCommandSystem } from './commands/command-system.js';

// Git Worktree Management
export { WorktreeManager } from './git/worktree-manager.js';
export { WorktreeCoordinator } from './git/worktree-coordinator.js';
export type {
  Worktree,
  WorktreeCreateOptions,
  WorktreeAllocation,
  ConsolidationResult
} from './git/worktree-manager.js';

// TypeScript Agent Implementations
export { CodeAnalyzerAgent } from './agents/implementations/code-analyzer-agent.js';
export { FileAnalyzerAgent } from './agents/implementations/file-analyzer-agent.js';

export type {
  CodeAnalysisRequest,
  CodeAnalysisResult,
  BugFinding,
  SafeComponent,
  LogicTrace
} from './agents/implementations/code-analyzer-agent.js';
export type {
  FileAnalysisRequest,
  FileAnalysisResult,
  CriticalFinding,
  KeyObservation,
  FileDetail
} from './agents/implementations/file-analyzer-agent.js';

// Base Agent System
export { BaseAgent } from './agents/base-agent.js';
export type {
  AgentContext,
  AgentResult,
  AgentMetrics,
  AgentCapability,
  AgentEvent,
  AgentEventListener
} from './agents/base-agent.js';

// Unified Command System
export { UnifiedCommandSystem } from './commands/command-system.js';
export type {
  Command,
  CommandContext,
  CommandResult,
  CommandInfo
} from './commands/command-system.js';

// Re-export existing parallel components for completeness
export type { ParallelConfig } from './config/parallel-config.js';
export type { Task, ExecutionResult } from './types.js';

/**
 * Phase 4 Integration Summary
 *
 * Phase 4 provides:
 * 1. Git Worktree Integration - Isolated parallel execution environments
 * 2. TypeScript Agent System - Full port of CCPM agents with compression
 * 3. Unified Command System - Bridge between Spec Workflow and CCPM commands
 * 4. Complete Integration - End-to-end parallel execution workflow
 *
 * Key Features:
 * - Git worktree management for true isolation
 * - Intelligent code and file analysis agents
 * - Command system supporting both paradigms
 * - Context optimization and compression
 * - Conflict detection and resolution
 * - Production-ready parallel execution
 */

/**
 * Quick Start Guide for Phase 4
 *
 * 1. Create Worktree Manager:
 *    const manager = new WorktreeManager('/project/path', 'main');
 *
 * 2. Set up Command System:
 *    const commands = new UnifiedCommandSystem();
 *
 * 3. Run Analysis:
 *    const result = await commands.executeCommand('analyze-parallel',
 *      { specName: 'my-spec' }, context);
 *
 * 4. Execute in Parallel:
 *    const worktree = await manager.createWorktree({
 *      taskId: 'task-1', baseBranch: 'main'
 *    });
 *
 * 5. Use Agents for Analysis:
 *    const codeAnalyzer = new CodeAnalyzerAgent();
 *    const analysis = await codeAnalyzer.run(context);
 */

/**
 * Phase 4 Configuration Example
 */
export const PHASE4_CONFIG = {
  // Worktree settings
  worktree: {
    maxConcurrent: 10,
    cleanupAfterMerge: true,
    isolationLevel: 'complete'
  },

  // Agent settings
  agents: {
    compressionTarget: 0.8, // 80% compression
    timeoutMs: 300000, // 5 minutes
    contextOptimization: true
  },

  // Command system settings
  commands: {
    enableCCPMCommands: true,
    enableParallelCommands: true,
    preserveSpecWorkflow: true
  }
} as const;

/**
 * Migration Helper for upgrading from Phase 3 to Phase 4
 */
export class Phase4Migrator {
  static async migrateFromPhase3(projectPath: string): Promise<{
    success: boolean;
    changes: string[];
    warnings: string[];
  }> {
    const changes: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if git is available for worktree support
      const { spawn } = await import('child_process');
      await new Promise<void>((resolve, reject) => {
        const git = spawn('git', ['--version'], { cwd: projectPath });
        git.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Git not available'));
        });
      });

      changes.push('Git worktree support verified');

      // Initialize command system
      const commandSystem = new UnifiedCommandSystem();
      const availableCommands = await commandSystem.listCommands();

      changes.push(`Initialized ${availableCommands.length} unified commands`);

      // Set up agent registry
      const agents = commandSystem.getAvailableAgents();
      changes.push(`Registered ${agents.length} TypeScript agents`);

      return {
        success: true,
        changes,
        warnings
      };

    } catch (error: any) {
      warnings.push(`Migration warning: ${error.message}`);

      return {
        success: false,
        changes,
        warnings
      };
    }
  }

  static async validatePhase4Setup(projectPath: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Validate git repository
      const worktreeManager = new WorktreeManager(projectPath);
      const testWorktree = await worktreeManager.createWorktree({
        taskId: 'validation-test',
        baseBranch: 'main'
      });

      await worktreeManager.destroyWorktree(testWorktree.id);

      // Validate command system
      const commandSystem = new UnifiedCommandSystem();
      const commands = await commandSystem.listCommands();

      if (commands.length < 5) {
        issues.push('Insufficient commands registered');
      }

      // Validate agents
      const agents = commandSystem.getAvailableAgents();
      if (!agents.includes('code-analyzer')) {
        issues.push('Code analyzer agent not available');
      }
      if (!agents.includes('file-analyzer')) {
        issues.push('File analyzer agent not available');
      }

      if (issues.length === 0) {
        recommendations.push('Phase 4 setup is complete and functional');
        recommendations.push('Consider testing with a small parallel execution');
        recommendations.push('Review worktree isolation settings');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error: any) {
      issues.push(`Validation failed: ${error.message}`);

      return {
        valid: false,
        issues,
        recommendations: ['Check git repository status', 'Verify project structure']
      };
    }
  }
}