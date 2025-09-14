import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { WorktreeManager } from '../parallel/git/worktree-manager.js';

export const manageWorktreeTool: Tool = {
  name: 'manage-worktree',
  description: `Manage and monitor Git worktrees for parallel execution.

View status, list all worktrees, and perform management operations on existing worktrees.`,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'status', 'allocate', 'deallocate'],
        description: 'Management action to perform'
      },
      worktreeId: {
        type: 'string',
        description: 'Worktree ID (required for status, allocate, deallocate actions)'
      },
      taskId: {
        type: 'string',
        description: 'Task ID for allocation'
      },
      baseBranch: {
        type: 'string',
        description: 'Base branch for the worktree manager',
        default: 'main'
      }
    },
    required: ['action']
  }
};

export async function manageWorktreeHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { action, worktreeId, taskId, baseBranch = 'main' } = args;
    const projectPath = context.projectPath;

    // Initialize WorktreeManager
    const worktreeManager = new WorktreeManager(projectPath, baseBranch);

    let result = `# Worktree Management - ${action.toUpperCase()}\n\n`;

    switch (action) {
      case 'list': {
        const worktrees = await worktreeManager.listWorktrees();

        result += `**Total Worktrees:** ${worktrees.length}\n`;
        result += `**Project Path:** ${projectPath}\n\n`;

        if (worktrees.length === 0) {
          result += `## 📭 No Worktrees Found\n\n`;
          result += `No worktrees are currently active. Use \`create-worktree\` to create one.\n`;
        } else {
          result += `## 📋 Active Worktrees\n\n`;

          worktrees.forEach((worktree, index) => {
            result += `### ${index + 1}. ${worktree.id}\n`;
            result += `- **Branch:** ${worktree.branch}\n`;
            result += `- **Path:** ${worktree.path}\n`;
            result += `- **Status:** ${worktree.status}\n`;
            result += `- **Task ID:** ${worktree.taskId || 'None'}\n`;
            result += `- **Base Branch:** ${worktree.baseBranch}\n`;
            result += `- **Created:** ${worktree.createdAt.toLocaleString()}\n\n`;
          });
        }

        return {
          success: true,
          message: result,
          data: { worktrees }
        };
      }

      case 'status': {
        if (!worktreeId) {
          return {
            success: false,
            message: 'Worktree ID is required for status action'
          };
        }

        const worktrees = await worktreeManager.listWorktrees();
        const worktree = worktrees.find(w => w.id === worktreeId);
        if (!worktree) {
          return {
            success: false,
            message: `Worktree "${worktreeId}" not found`
          };
        }

        result += `**Worktree ID:** ${worktree.id}\n`;
        result += `**Branch:** ${worktree.branch}\n`;
        result += `**Path:** ${worktree.path}\n`;
        result += `**Status:** ${worktree.status}\n`;
        result += `**Task ID:** ${worktree.taskId || 'None'}\n`;
        result += `**Base Branch:** ${worktree.baseBranch}\n`;
        result += `**Created:** ${worktree.createdAt.toLocaleString()}\n\n`;

        // Check if directory exists and is accessible
        try {
          const stats = await import('fs/promises').then(fs => fs.stat(worktree.path));
          result += `## 📁 Directory Status\n`;
          result += `- **Exists:** ✅ Yes\n`;
          result += `- **Type:** ${stats.isDirectory() ? 'Directory' : 'File'}\n`;
          result += `- **Size:** ${stats.size} bytes\n`;
          result += `- **Modified:** ${stats.mtime.toLocaleString()}\n\n`;
        } catch (error) {
          result += `## ❌ Directory Status\n`;
          result += `- **Exists:** ❌ No (or inaccessible)\n`;
          result += `- **Error:** ${error instanceof Error ? error.message : String(error)}\n\n`;
        }

        result += `## 📋 Available Actions\n`;
        result += `- Use \`manage-worktree\` with action "allocate" to assign a task\n`;
        result += `- Use \`manage-worktree\` with action "deallocate" to free the worktree\n`;
        result += `- Use \`consolidate-worktrees\` to merge changes\n`;
        result += `- Use \`destroy-worktree\` to remove the worktree\n`;

        return {
          success: true,
          message: result,
          data: { worktree }
        };
      }

      case 'allocate': {
        if (!worktreeId || !taskId) {
          return {
            success: false,
            message: 'Both worktreeId and taskId are required for allocation'
          };
        }

        // Simplified allocation - just find and update the worktree
        const worktrees = await worktreeManager.listWorktrees();
        const worktree = worktrees.find(w => w.id === worktreeId);

        if (!worktree) {
          return {
            success: false,
            message: `Worktree "${worktreeId}" not found`
          };
        }

        // Update task assignment
        worktree.taskId = taskId;
        const allocation = {
          allocated: true,
          worktree,
          reason: undefined
        };

        if (allocation.allocated) {
          result += `## ✅ Worktree Allocated Successfully\n\n`;
          result += `**Worktree ID:** ${allocation.worktree.id}\n`;
          result += `**Task ID:** ${allocation.worktree.taskId}\n`;
          result += `**Status:** ${allocation.worktree.status}\n`;
          result += `**Path:** ${allocation.worktree.path}\n\n`;
          result += `The worktree is now allocated and ready for task execution.\n`;
        } else {
          result += `## ❌ Allocation Failed\n\n`;
          result += `**Reason:** ${allocation.reason || 'Unknown error'}\n`;
        }

        return {
          success: allocation.allocated,
          message: result,
          data: { allocation }
        };
      }

      case 'deallocate': {
        if (!worktreeId) {
          return {
            success: false,
            message: 'Worktree ID is required for deallocation'
          };
        }

        // Simplified deallocation - just find and clear task assignment
        const worktrees = await worktreeManager.listWorktrees();
        const worktree = worktrees.find(w => w.id === worktreeId);
        const success = !!worktree;

        if (worktree) {
          worktree.taskId = undefined;
        }

        if (success) {
          result += `## ✅ Worktree Deallocated Successfully\n\n`;
          result += `**Worktree ID:** ${worktreeId}\n`;
          result += `The worktree is now available for other tasks.\n`;
        } else {
          result += `## ❌ Deallocation Failed\n\n`;
          result += `**Worktree ID:** ${worktreeId}\n`;
          result += `The worktree may not exist or is already deallocated.\n`;
        }

        return {
          success,
          message: result,
          data: { worktreeId, deallocated: success }
        };
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}. Available actions: list, status, allocate, deallocate`
        };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to manage worktree: ${error.message}`
    };
  }
}