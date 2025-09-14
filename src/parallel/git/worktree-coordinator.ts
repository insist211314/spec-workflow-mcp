import { WorktreeManager, Worktree } from './worktree-manager.js';
import { Task, ExecutionResult, TaskState, ParallelTaskInfo } from '../types.js';
import { StateManager } from '../state/state-manager.js';
import { ParallelExecutor } from '../executors/parallel-executor.js';

export interface WorktreeAllocation {
  taskId: string;
  worktreeId: string;
  worktree: Worktree;
  allocated: boolean;
}

export interface ConsolidationResult {
  successful: Worktree[];
  failed: { worktree: Worktree; error: string }[];
  conflicts: { file: string; worktrees: string[] }[];
}

export class WorktreeCoordinator {
  private worktreeManager: WorktreeManager;
  private stateManager: StateManager;
  private parallelExecutor: ParallelExecutor;
  private allocations: Map<string, WorktreeAllocation> = new Map();

  constructor(
    projectPath: string,
    stateManager: StateManager,
    parallelExecutor: ParallelExecutor,
    baseBranch: string = 'main'
  ) {
    this.worktreeManager = new WorktreeManager(projectPath, baseBranch);
    this.stateManager = stateManager;
    this.parallelExecutor = parallelExecutor;
  }

  async allocateWorktree(task: Task): Promise<string> {
    try {
      // Create worktree for the task
      const worktree = await this.worktreeManager.createWorktree({
        taskId: task.id,
        baseBranch: 'main',
        branchPrefix: 'task'
      });

      // Track the allocation
      const allocation: WorktreeAllocation = {
        taskId: task.id,
        worktreeId: worktree.id,
        worktree,
        allocated: true
      };

      this.allocations.set(task.id, allocation);

      // Update state
      this.stateManager.updateTaskState(task.id, TaskState.RUNNING);

      return worktree.id;
    } catch (error: any) {
      throw new Error(`Failed to allocate worktree for task ${task.id}: ${error.message}`);
    }
  }

  async executeInWorktree(task: Task, worktree: Worktree): Promise<ExecutionResult> {
    try {
      // Update task context with worktree information
      const taskWithWorktree: ParallelTaskInfo = {
        ...task,
        completed: task.status === 'completed',
        parallelSafe: true,
        dependencies: []
      };

      // Execute the task in the isolated worktree
      const result = await this.parallelExecutor.executeTaskInWorktree(taskWithWorktree, worktree);

      // Sync worktree with upstream changes
      await this.worktreeManager.syncWorktree(worktree);

      // Check for conflicts
      const status = await this.worktreeManager.getWorktreeStatus(worktree.id);
      if (status.conflicts.length > 0) {
        result.conflicts = status.conflicts;
        result.needsManualResolution = true;
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to execute task ${task.id} in worktree ${worktree.id}: ${error.message}`);
    }
  }

  async consolidateResults(worktrees: Worktree[]): Promise<ConsolidationResult> {
    const successful: Worktree[] = [];
    const failed: { worktree: Worktree; error: string }[] = [];
    const conflicts: { file: string; worktrees: string[] }[] = [];

    // Detect conflicts between worktrees
    const conflictMap = await this.detectCrossWorktreeConflicts(worktrees);

    for (const worktree of worktrees) {
      try {
        // Check individual worktree status
        const status = await this.worktreeManager.getWorktreeStatus(worktree.id);

        if (status.conflicts.length > 0) {
          // Handle individual worktree conflicts
          for (const file of status.conflicts) {
            const existing = conflicts.find(c => c.file === file);
            if (existing) {
              existing.worktrees.push(worktree.id);
            } else {
              conflicts.push({ file, worktrees: [worktree.id] });
            }
          }
          continue;
        }

        // Check for cross-worktree conflicts
        const hasConflicts = conflictMap.some(conflict =>
          conflict.worktrees.includes(worktree.id)
        );

        if (hasConflicts) {
          failed.push({
            worktree,
            error: 'Cross-worktree conflicts detected'
          });
          continue;
        }

        // If no conflicts, mark as successful
        successful.push(worktree);
      } catch (error: any) {
        failed.push({
          worktree,
          error: error.message
        });
      }
    }

    // Add cross-worktree conflicts to the conflicts array
    conflicts.push(...conflictMap);

    return { successful, failed, conflicts };
  }

  async cleanupWorktrees(): Promise<{
    cleaned: string[];
    errors: { id: string; error: string }[];
  }> {
    const cleaned: string[] = [];
    const errors: { id: string; error: string }[] = [];

    // Clean up completed worktrees
    try {
      const cleanedWorktrees = await this.worktreeManager.cleanupCompletedWorktrees();
      cleaned.push(...cleanedWorktrees);

      // Remove from allocations
      for (const worktreeId of cleanedWorktrees) {
        const allocation = Array.from(this.allocations.values())
          .find(a => a.worktreeId === worktreeId);
        if (allocation) {
          this.allocations.delete(allocation.taskId);
        }
      }
    } catch (error: any) {
      errors.push({
        id: 'cleanup-completed',
        error: error.message
      });
    }

    // Validate remaining worktrees
    try {
      const validation = await this.worktreeManager.validateWorktreeIntegrity();

      // Clean up invalid worktrees
      for (const invalid of validation.invalid) {
        try {
          await this.worktreeManager.destroyWorktree(invalid.id);
          cleaned.push(invalid.id);
        } catch (cleanupError: any) {
          errors.push({
            id: invalid.id,
            error: `Failed to cleanup invalid worktree: ${cleanupError.message}`
          });
        }
      }
    } catch (error: any) {
      errors.push({
        id: 'validation',
        error: error.message
      });
    }

    return { cleaned, errors };
  }

  async mergeSuccessfulWorktrees(worktrees: Worktree[], targetBranch: string = 'main'): Promise<{
    merged: string[];
    failed: { id: string; error: string }[];
  }> {
    const merged: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const worktree of worktrees) {
      try {
        await this.worktreeManager.mergeWorktree(worktree, targetBranch);
        merged.push(worktree.id);

        // Update state
        if (worktree.taskId) {
          this.stateManager.updateTaskState(worktree.taskId, TaskState.COMPLETED);
        }
      } catch (error: any) {
        failed.push({
          id: worktree.id,
          error: error.message
        });
      }
    }

    return { merged, failed };
  }

  async getAllocatedWorktrees(): Promise<WorktreeAllocation[]> {
    return Array.from(this.allocations.values());
  }

  async getWorktreeForTask(taskId: string): Promise<Worktree | null> {
    const allocation = this.allocations.get(taskId);
    return allocation?.worktree || null;
  }

  private async detectCrossWorktreeConflicts(worktrees: Worktree[]): Promise<{
    file: string;
    worktrees: string[];
  }[]> {
    const fileChanges = new Map<string, string[]>();

    // Collect changed files from each worktree
    for (const worktree of worktrees) {
      try {
        // Get list of changed files in this worktree
        const changedFiles = await this.getChangedFiles(worktree);

        for (const file of changedFiles) {
          if (!fileChanges.has(file)) {
            fileChanges.set(file, []);
          }
          fileChanges.get(file)!.push(worktree.id);
        }
      } catch (error) {
        // Continue with other worktrees if one fails
        console.warn(`Failed to get changed files for worktree ${worktree.id}:`, error);
      }
    }

    // Find files changed by multiple worktrees
    const conflicts: { file: string; worktrees: string[] }[] = [];
    for (const [file, worktreeIds] of fileChanges) {
      if (worktreeIds.length > 1) {
        conflicts.push({ file, worktrees: worktreeIds });
      }
    }

    return conflicts;
  }

  private async getChangedFiles(worktree: Worktree): Promise<string[]> {
    try {
      // Get files changed in this worktree compared to base branch
      const output = await this.execGit([
        'diff',
        '--name-only',
        worktree.baseBranch
      ], worktree.path);

      return output.trim().split('\n').filter(Boolean);
    } catch (error: any) {
      throw new Error(`Failed to get changed files for worktree ${worktree.id}: ${error.message}`);
    }
  }

  private async execGit(args: string[], cwd: string): Promise<string> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const git = spawn('git', args, {
        cwd,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      git.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Git command failed (${code}): ${stderr || stdout}`));
        }
      });

      git.on('error', (error) => {
        reject(error);
      });
    });
  }
}