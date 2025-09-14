import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { WorktreeManager } from '../parallel/git/worktree-manager.js';
import { join } from 'path';

export const createWorktreeTool: Tool = {
  name: 'create-worktree',
  description: `Create an isolated Git worktree for parallel task execution.

Creates a separate working directory with its own branch for safe parallel development.`,
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Unique identifier for the task (will be used in branch name)'
      },
      baseBranch: {
        type: 'string',
        description: 'Base branch to create the worktree from',
        default: 'main'
      },
      branchPrefix: {
        type: 'string',
        description: 'Prefix for the new branch name',
        default: 'task'
      },
      workDir: {
        type: 'string',
        description: 'Custom working directory (optional - will use default if not specified)'
      }
    },
    required: ['taskId']
  }
};

export async function createWorktreeHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { taskId, baseBranch = 'main', branchPrefix = 'task', workDir } = args;
    const projectPath = context.projectPath;

    // Initialize WorktreeManager
    const worktreeManager = new WorktreeManager(projectPath, baseBranch);

    let result = `# Creating Git Worktree for Task "${taskId}"\n\n`;
    result += `**Base Branch:** ${baseBranch}\n`;
    result += `**Branch Prefix:** ${branchPrefix}\n`;
    result += `**Project Path:** ${projectPath}\n\n`;

    try {
      // Create the worktree
      const worktree = await worktreeManager.createWorktree({
        taskId,
        baseBranch,
        branchPrefix,
        workDir
      });

      result += `## ✅ Worktree Created Successfully\n\n`;
      result += `**Worktree ID:** ${worktree.id}\n`;
      result += `**Branch Name:** ${worktree.branch}\n`;
      result += `**Working Directory:** ${worktree.path}\n`;
      result += `**Status:** ${worktree.status}\n`;
      result += `**Created At:** ${worktree.createdAt.toISOString()}\n\n`;

      result += `## 📋 Next Steps\n`;
      result += `1. Use \`cd "${worktree.path}"\` to switch to the worktree directory\n`;
      result += `2. Develop your feature in complete isolation\n`;
      result += `3. Use \`manage-worktree\` to check status and manage the worktree\n`;
      result += `4. Use \`consolidate-worktrees\` when ready to merge changes\n`;
      result += `5. Use \`destroy-worktree\` to clean up when finished\n\n`;

      result += `## ⚡ Parallel Execution Ready\n`;
      result += `This worktree is now ready for parallel task execution. You can:\n`;
      result += `- Run tests independently without affecting other work\n`;
      result += `- Make experimental changes safely\n`;
      result += `- Develop features in complete isolation\n`;

      return {
        success: true,
        message: result,
        data: {
          worktree: {
            id: worktree.id,
            path: worktree.path,
            branch: worktree.branch,
            status: worktree.status,
            taskId: worktree.taskId,
            baseBranch: worktree.baseBranch,
            createdAt: worktree.createdAt
          }
        }
      };

    } catch (error: any) {
      result += `## ❌ Worktree Creation Failed\n\n`;
      result += `**Error:** ${error.message}\n\n`;

      result += `**Troubleshooting:**\n`;
      result += `1. Ensure you're in a Git repository\n`;
      result += `2. Check that the base branch "${baseBranch}" exists\n`;
      result += `3. Verify Git version supports worktrees (Git 2.5+)\n`;
      result += `4. Ensure sufficient disk space for the worktree\n`;
      result += `5. Check that the task ID "${taskId}" doesn't conflict with existing branches\n`;

      return {
        success: false,
        message: result
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create worktree: ${error.message}`
    };
  }
}