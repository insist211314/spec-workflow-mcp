import { join } from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

export interface Worktree {
  id: string;
  path: string;
  branch: string;
  status: 'active' | 'merging' | 'completed';
  taskId?: string;
  baseBranch: string;
  createdAt: Date;
}

export interface WorktreeCreateOptions {
  taskId: string;
  baseBranch: string;
  branchPrefix?: string;
  workDir?: string;
}

export interface WorktreeAllocation {
  worktree: Worktree;
  allocated: boolean;
  reason?: string;
}

export interface ConsolidationResult {
  success: boolean;
  mergedBranches: string[];
  conflicts: string[];
  summary: string;
}

export class WorktreeManager {
  private worktrees: Map<string, Worktree> = new Map();
  private projectPath: string;
  private defaultBaseBranch: string;

  constructor(projectPath: string, defaultBaseBranch: string = 'main') {
    this.projectPath = projectPath;
    this.defaultBaseBranch = defaultBaseBranch;
  }

  async createWorktree(options: WorktreeCreateOptions): Promise<Worktree> {
    const { taskId, baseBranch = this.defaultBaseBranch, branchPrefix = 'task', workDir } = options;

    // Generate unique worktree ID and branch name
    const timestamp = Date.now().toString(36);
    const worktreeId = `${branchPrefix}-${taskId}-${timestamp}`;
    const branchName = `parallel/${worktreeId}`;

    // Determine worktree path
    const worktreePath = workDir
      ? join(workDir, worktreeId)
      : join(this.projectPath, '..', 'worktrees', worktreeId);

    try {
      // Ensure parent directory exists
      await fs.mkdir(join(worktreePath, '..'), { recursive: true });

      // Create git worktree
      await this.execGit(['worktree', 'add', '-b', branchName, worktreePath, baseBranch]);

      const worktree: Worktree = {
        id: worktreeId,
        path: worktreePath,
        branch: branchName,
        status: 'active',
        taskId,
        baseBranch,
        createdAt: new Date()
      };

      this.worktrees.set(worktreeId, worktree);

      // Set up initial commit in worktree
      await this.execGit(['commit', '--allow-empty', '-m', `Initialize worktree for task ${taskId}`], worktreePath);

      return worktree;
    } catch (error: any) {
      // Cleanup on failure
      try {
        await this.destroyWorktree(worktreeId);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to create worktree: ${error.message}`);
    }
  }

  async destroyWorktree(worktreeId: string): Promise<void> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      return; // Already destroyed or never existed
    }

    try {
      // Remove git worktree
      await this.execGit(['worktree', 'remove', '--force', worktree.path]);

      // Delete branch if it exists
      try {
        await this.execGit(['branch', '-D', worktree.branch]);
      } catch {
        // Branch might not exist or already deleted
      }

      // Remove from tracking
      this.worktrees.delete(worktreeId);
    } catch (error: any) {
      throw new Error(`Failed to destroy worktree ${worktreeId}: ${error.message}`);
    }
  }

  async syncWorktree(worktree: Worktree): Promise<void> {
    try {
      // Fetch latest changes
      await this.execGit(['fetch', 'origin'], worktree.path);

      // Check for conflicts with base branch
      const mergeBase = await this.execGit(['merge-base', worktree.branch, worktree.baseBranch], worktree.path);
      const baseTip = await this.execGit(['rev-parse', `origin/${worktree.baseBranch}`], worktree.path);

      if (mergeBase.trim() !== baseTip.trim()) {
        // Base branch has moved, need to rebase
        await this.execGit(['rebase', `origin/${worktree.baseBranch}`], worktree.path);
      }
    } catch (error: any) {
      throw new Error(`Failed to sync worktree ${worktree.id}: ${error.message}`);
    }
  }

  async mergeWorktree(worktree: Worktree, targetBranch: string): Promise<void> {
    if (worktree.status !== 'active') {
      throw new Error(`Cannot merge worktree ${worktree.id} with status ${worktree.status}`);
    }

    try {
      worktree.status = 'merging';

      // Switch to target branch in main repo
      await this.execGit(['checkout', targetBranch]);

      // Pull latest changes
      await this.execGit(['pull', 'origin', targetBranch]);

      // Create merge commit
      const mergeMessage = `Merge task ${worktree.taskId} from worktree ${worktree.id}

Closes: ${worktree.taskId}
Worktree: ${worktree.id}
Branch: ${worktree.branch}`;

      await this.execGit(['merge', '--no-ff', '-m', mergeMessage, worktree.branch]);

      worktree.status = 'completed';
    } catch (error: any) {
      worktree.status = 'active'; // Reset status on failure
      throw new Error(`Failed to merge worktree ${worktree.id}: ${error.message}`);
    }
  }

  async getWorktreeStatus(worktreeId: string): Promise<{
    clean: boolean;
    ahead: number;
    behind: number;
    conflicts: string[];
  }> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeId} not found`);
    }

    try {
      // Check if working directory is clean
      const status = await this.execGit(['status', '--porcelain'], worktree.path);
      const clean = status.trim() === '';

      // Check ahead/behind status
      const aheadBehind = await this.execGit([
        'rev-list',
        '--left-right',
        '--count',
        `${worktree.baseBranch}...${worktree.branch}`
      ], worktree.path);

      const [behind, ahead] = aheadBehind.trim().split('\t').map(Number);

      // Check for merge conflicts
      const conflicts: string[] = [];
      if (!clean) {
        const conflictFiles = await this.execGit(['diff', '--name-only', '--diff-filter=U'], worktree.path);
        conflicts.push(...conflictFiles.trim().split('\n').filter(Boolean));
      }

      return { clean, ahead, behind, conflicts };
    } catch (error: any) {
      throw new Error(`Failed to get worktree status: ${error.message}`);
    }
  }

  async listWorktrees(): Promise<Worktree[]> {
    return Array.from(this.worktrees.values());
  }

  async cleanupCompletedWorktrees(): Promise<string[]> {
    const cleaned: string[] = [];

    for (const [id, worktree] of this.worktrees) {
      if (worktree.status === 'completed') {
        try {
          await this.destroyWorktree(id);
          cleaned.push(id);
        } catch (error) {
          console.warn(`Failed to cleanup worktree ${id}:`, error);
        }
      }
    }

    return cleaned;
  }

  async validateWorktreeIntegrity(): Promise<{
    valid: Worktree[];
    invalid: { id: string; reason: string }[];
  }> {
    const valid: Worktree[] = [];
    const invalid: { id: string; reason: string }[] = [];

    for (const worktree of this.worktrees.values()) {
      try {
        // Check if directory exists
        await fs.access(worktree.path);

        // Check if it's a valid git repository
        await this.execGit(['status'], worktree.path);

        // Check if branch exists
        await this.execGit(['rev-parse', '--verify', worktree.branch], worktree.path);

        valid.push(worktree);
      } catch (error: any) {
        invalid.push({
          id: worktree.id,
          reason: error.message
        });
      }
    }

    return { valid, invalid };
  }

  private async execGit(args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, {
        cwd: cwd || this.projectPath,
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