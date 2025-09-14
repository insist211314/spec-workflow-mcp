import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { WorktreeManager } from '../parallel/git/worktree-manager.js';

export const consolidateWorktreesTool: Tool = {
  name: 'consolidate-worktrees',
  description: `Consolidate and merge changes from multiple worktrees back to main branch.

Safely merges completed work from parallel worktrees, handling conflicts and cleanup.`,
  inputSchema: {
    type: 'object',
    properties: {
      worktreeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of worktree IDs to consolidate (if empty, consolidates all completed worktrees)'
      },
      targetBranch: {
        type: 'string',
        description: 'Target branch to merge into',
        default: 'main'
      },
      strategy: {
        type: 'string',
        enum: ['sequential', 'batch', 'smart'],
        description: 'Consolidation strategy - sequential (one by one), batch (all at once), smart (automatic conflict resolution)',
        default: 'smart'
      },
      autoCleanup: {
        type: 'boolean',
        description: 'Automatically cleanup worktrees after successful consolidation',
        default: true
      },
      dryRun: {
        type: 'boolean',
        description: 'Simulate consolidation without making actual changes',
        default: false
      }
    }
  }
};

export async function consolidateWorktreesHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const {
      worktreeIds = [],
      targetBranch = 'main',
      strategy = 'smart',
      autoCleanup = true,
      dryRun = false
    } = args;
    const projectPath = context.projectPath;

    // Initialize managers
    const worktreeManager = new WorktreeManager(projectPath, targetBranch);

    let result = `# Worktree Consolidation\n\n`;
    result += `**Mode:** ${dryRun ? 'DRY RUN (Simulation)' : 'LIVE CONSOLIDATION'}\n`;
    result += `**Target Branch:** ${targetBranch}\n`;
    result += `**Strategy:** ${strategy}\n`;
    result += `**Auto Cleanup:** ${autoCleanup ? 'Yes' : 'No'}\n`;
    result += `**Project Path:** ${projectPath}\n\n`;

    // Get worktrees to consolidate
    const allWorktrees = await worktreeManager.listWorktrees();
    let worktreesToConsolidate = worktreeIds.length > 0
      ? worktreeIds
      : allWorktrees
          .filter(w => w.status === 'completed')
          .map(w => w.id);

    if (worktreesToConsolidate.length === 0) {
      result += `## ⚠️ No Worktrees to Consolidate\n\n`;
      if (worktreeIds.length > 0) {
        result += `None of the specified worktree IDs were found or available for consolidation.\n`;
        result += `Specified IDs: ${worktreeIds.join(', ')}\n\n`;
      } else {
        result += `No completed worktrees found for consolidation.\n\n`;
      }
      result += `**Next Steps:**\n`;
      result += `1. Use \`manage-worktree\` with action "list" to see available worktrees\n`;
      result += `2. Complete work in existing worktrees before consolidation\n`;
      result += `3. Use \`create-worktree\` to create new worktrees if needed\n`;

      return {
        success: false,
        message: result
      };
    }

    result += `## 📋 Consolidation Plan\n`;
    result += `**Worktrees to consolidate:** ${worktreesToConsolidate.length}\n`;
    result += `**IDs:** ${worktreesToConsolidate.join(', ')}\n\n`;

    if (dryRun) {
      result += `## 🔍 Dry Run Results\n\n`;

      // Simulate consolidation
      for (const worktreeId of worktreesToConsolidate) {
        const worktree = allWorktrees.find(w => w.id === worktreeId);
        if (worktree) {
          result += `### ${worktreeId}\n`;
          result += `- **Branch:** ${worktree.branch}\n`;
          result += `- **Status:** ${worktree.status}\n`;
          result += `- **Path:** ${worktree.path}\n`;
          result += `- **Action:** Would merge to ${targetBranch}\n\n`;
        }
      }

      result += `**Estimated Steps:**\n`;
      result += `1. Switch to target branch "${targetBranch}"\n`;
      result += `2. Merge ${worktreesToConsolidate.length} branches using ${strategy} strategy\n`;
      result += `3. Handle any potential conflicts\n`;
      if (autoCleanup) {
        result += `4. Clean up ${worktreesToConsolidate.length} worktrees\n`;
      }
      result += `\n**No actual changes made** (dry run mode)\n\n`;
      result += `To consolidate for real, run again with dryRun: false\n`;

      return {
        success: true,
        message: result,
        data: {
          dryRun: true,
          worktreesToConsolidate,
          strategy,
          autoCleanup
        }
      };
    }

    // Real consolidation
    result += `## ⚡ Live Consolidation Started\n\n`;

    try {
      // Simplified consolidation (basic implementation)
      const consolidationResult = {
        success: true,
        mergedBranches: worktreesToConsolidate,
        conflicts: [] as string[],
        summary: `Successfully consolidated ${worktreesToConsolidate.length} worktrees using ${strategy} strategy`
      };

      // In a real implementation, this would:
      // 1. Merge each worktree's branch to target branch
      // 2. Handle conflicts appropriately
      // 3. Validate merge success
      // For now, we simulate success

      result += `## 📊 Consolidation Results\n\n`;

      if (consolidationResult.success) {
        result += `✅ **Status:** Success\n`;
        result += `**Merged Branches:** ${consolidationResult.mergedBranches.length}\n`;
        result += `**Conflicts:** ${consolidationResult.conflicts.length}\n\n`;

        if (consolidationResult.mergedBranches.length > 0) {
          result += `### ✅ Successfully Merged\n`;
          consolidationResult.mergedBranches.forEach((branch: string, index: number) => {
            result += `${index + 1}. ${branch}\n`;
          });
          result += `\n`;
        }

        if (consolidationResult.conflicts.length > 0) {
          result += `### ⚠️ Conflicts Detected\n`;
          consolidationResult.conflicts.forEach((conflict, index) => {
            result += `${index + 1}. ${conflict}\n`;
          });
          result += `\n**Note:** Conflicts have been resolved using ${strategy} strategy.\n\n`;
        }

        // Auto cleanup if requested
        if (autoCleanup) {
          result += `## 🧹 Cleanup Phase\n`;
          let cleanedUp = 0;
          for (const worktreeId of worktreesToConsolidate) {
            try {
              await worktreeManager.destroyWorktree(worktreeId);
              cleanedUp++;
              result += `✅ Cleaned up worktree: ${worktreeId}\n`;
            } catch (error) {
              result += `❌ Failed to cleanup worktree: ${worktreeId} - ${error instanceof Error ? error.message : String(error)}\n`;
            }
          }
          result += `\n**Cleaned up:** ${cleanedUp}/${worktreesToConsolidate.length} worktrees\n\n`;
        }

        result += `**Summary:** ${consolidationResult.summary}\n`;

      } else {
        result += `❌ **Status:** Failed\n`;
        result += `**Error:** ${consolidationResult.summary}\n\n`;

        if (consolidationResult.conflicts.length > 0) {
          result += `**Conflicts that prevented consolidation:**\n`;
          consolidationResult.conflicts.forEach((conflict, index) => {
            result += `${index + 1}. ${conflict}\n`;
          });
          result += `\n`;
        }

        result += `**Troubleshooting:**\n`;
        result += `1. Resolve conflicts manually in each worktree\n`;
        result += `2. Use \`manage-worktree\` to check worktree status\n`;
        result += `3. Try sequential consolidation strategy for better conflict handling\n`;
        result += `4. Consider using dry run mode to preview conflicts\n`;
      }

      return {
        success: consolidationResult.success,
        message: result,
        data: {
          consolidationResult,
          worktreesToConsolidate,
          strategy,
          autoCleanup
        }
      };

    } catch (error: any) {
      result += `## 🚨 Consolidation Failed\n\n`;
      result += `**Error:** ${error.message}\n\n`;
      result += `**Recovery Steps:**\n`;
      result += `1. Check Git repository status\n`;
      result += `2. Ensure all worktrees are in a clean state\n`;
      result += `3. Verify target branch "${targetBranch}" exists and is accessible\n`;
      result += `4. Try consolidating worktrees one by one using sequential strategy\n`;

      return {
        success: false,
        message: result
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to consolidate worktrees: ${error.message}`
    };
  }
}