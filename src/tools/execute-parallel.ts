import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { ParallelExecutor } from '../parallel/executors/parallel-executor.js';
import { ExecutionStateManager } from '../parallel/state/state-manager.js';
import { ParallelConfig } from '../parallel/config/parallel-config.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown } from '../core/task-parser.js';
import { parsedTasksToParallelTasks } from './task-adapter.js';

export const executeParallelTool: Tool = {
  name: 'execute-parallel',
  description: `Execute tasks in parallel based on analysis results.

Executes independent tasks or parallel groups safely with state management, monitoring, and rollback capabilities.`,
  inputSchema: {
    type: 'object',
    properties: {
      specName: {
        type: 'string',
        description: 'Name of the specification containing tasks to execute'
      },
      taskIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific task IDs to execute (optional - if not provided, executes all safe parallel tasks)'
      },
      maxParallel: {
        type: 'number',
        description: 'Maximum number of parallel tasks (1-3)',
        minimum: 1,
        maximum: 3,
        default: 3
      },
      dryRun: {
        type: 'boolean',
        description: 'Simulate execution without making changes',
        default: false
      }
    },
    required: ['specName']
  }
};

export async function executeParallelHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { specName, taskIds, maxParallel = 3, dryRun = false } = args;
    const projectPath = context.projectPath;

    // Validate maxParallel
    if (maxParallel < 1 || maxParallel > 3) {
      return {
        success: false,
        message: 'maxParallel must be between 1 and 3'
      };
    }

    // Read spec file
    const specPath = join(projectPath, '.spec-workflow', 'specs', specName, 'tasks.md');
    let specContent: string;

    try {
      specContent = await readFile(specPath, 'utf-8');
    } catch (error) {
      return {
        success: false,
        message: `Specification "${specName}" not found. Use create-spec-doc to create it first.`
      };
    }

    // Parse tasks from spec
    const parsedResult = parseTasksFromMarkdown(specContent);
    const parsedTasks = parsedResult.tasks || [];

    if (parsedTasks.length === 0) {
      return {
        success: false,
        message: `No tasks found in specification "${specName}".`
      };
    }

    // Convert to parallel task format
    const allTasks = parsedTasksToParallelTasks(parsedTasks);

    // Filter tasks to execute
    let tasksToExecute = allTasks;
    if (taskIds && taskIds.length > 0) {
      tasksToExecute = allTasks.filter(task => taskIds.includes(task.id));

      if (tasksToExecute.length === 0) {
        return {
          success: false,
          message: `None of the specified task IDs found: ${taskIds.join(', ')}`
        };
      }
    }

    // For parallel execution, we'll execute all tasks (no status filtering needed)
    const pendingTasks = tasksToExecute;

    if (pendingTasks.length === 0) {
      return {
        success: false,
        message: 'No pending tasks found to execute. All specified tasks may already be completed.'
      };
    }

    // Initialize executor and state manager
    const config: ParallelConfig = {
      maxParallelTasks: maxParallel,
      mode: 'turbo',
      agentTimeout: 30000,
      enableSuggestions: true,
      enableDependencyAnalysis: true,
      strictIndependence: false,
      dashboard: {
        showParallelAnalysis: true,
        enableRealtimeUpdates: true,
        showDependencyGraph: true
      },
      agents: {
        enableCCPMAgents: true,
        communicationTimeout: 60000,
        enableContextCompression: true
      }
    };
    const executor = new ParallelExecutor(config);
    const stateManager = new ExecutionStateManager();

    let result = `# Parallel Execution for "${specName}"\n\n`;
    result += `**Mode:** ${dryRun ? 'DRY RUN (Simulation)' : 'LIVE EXECUTION'}\n`;
    result += `**Max Parallel Tasks:** ${maxParallel}\n`;
    result += `**Tasks to Execute:** ${pendingTasks.length}\n\n`;

    if (dryRun) {
      // Simulate execution
      result += `## 🔍 Simulation Results\n\n`;

      const batches: any[][] = [];
      let currentBatch: any[] = [];

      for (const task of pendingTasks) {
        if (currentBatch.length < maxParallel) {
          currentBatch.push(task);
        } else {
          batches.push([...currentBatch]);
          currentBatch = [task];
        }
      }

      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      result += `**Execution Plan:**\n`;
      batches.forEach((batch, index) => {
        result += `\nBatch ${index + 1} (${batch.length} tasks in parallel):\n`;
        batch.forEach(task => {
          result += `- ${task.id}: ${task.title || task.description}\n`;
        });
      });

      result += `\n**Estimated Duration:** ${batches.length} execution cycles\n`;
      result += `**No actual changes made** (dry run mode)\n\n`;
      result += `To execute for real, run again with dryRun: false\n`;

      return {
        success: true,
        message: result,
        data: {
          dryRun: true,
          specName,
          tasksPlanned: pendingTasks.length,
          batches: batches.length,
          maxParallel
        }
      };
    }

    // Real execution
    result += `## ⚡ Live Execution Started\n\n`;

    try {
      // Initialize tasks before execution
      stateManager.initializeTasks(pendingTasks);

      // Execute tasks
      const executionResults = await executor.executeParallel(pendingTasks, projectPath);

      // Process results
      let successCount = 0;
      let failureCount = 0;

      result += `\n## 📊 Execution Results\n\n`;

      for (const executionResult of executionResults) {
        if (executionResult.success) {
          successCount++;
          result += `✅ **${executionResult.taskId}**: Completed successfully\n`;
          if (executionResult.output) {
            result += `   Output: ${executionResult.output.substring(0, 100)}...\n`;
          }
        } else {
          failureCount++;
          result += `❌ **${executionResult.taskId}**: Failed\n`;
          result += `   Error: ${executionResult.error}\n`;
        }
      }

      // Update spec file with completed tasks
      if (successCount > 0) {
        let updatedContent = specContent;
        for (const executionResult of executionResults) {
          if (executionResult.success) {
            // Mark task as completed in the spec
            const taskPattern = new RegExp(`(##\\s+${executionResult.taskId}[^#]*?)\\*\\*Status\\*\\*:\\s*pending`, 'g');
            updatedContent = updatedContent.replace(taskPattern, `$1**Status**: completed`);
          }
        }

        await writeFile(specPath, updatedContent, 'utf-8');
      }

      result += `\n## 📈 Summary\n`;
      result += `- **Successful:** ${successCount}/${executionResults.length}\n`;
      result += `- **Failed:** ${failureCount}/${executionResults.length}\n`;
      result += `- **Success Rate:** ${Math.round((successCount / executionResults.length) * 100)}%\n\n`;

      if (failureCount > 0) {
        result += `⚠️ Some tasks failed. Use \`rollback-execution\` if needed.\n`;
        result += `Check individual task errors above for details.\n\n`;
      }

      result += `Use \`get-execution-status\` to monitor ongoing progress.\n`;

      return {
        success: successCount > 0,
        message: result,
        data: {
          specName,
          executed: executionResults.length,
          successful: successCount,
          failed: failureCount,
          results: executionResults
        }
      };

    } catch (error: any) {
      // Execution failed - attempt rollback
      result += `\n🚨 **Execution Failed:** ${error.message}\n\n`;
      result += `Attempting automatic rollback...\n`;

      try {
        const currentTime = Date.now();
        const rollbackSuccess = stateManager.rollbackToSnapshot(currentTime - 60000); // Rollback to 1 minute ago
        if (rollbackSuccess) {
          result += `✅ Rollback completed successfully.\n`;
        } else {
          result += `❌ No suitable checkpoint found for rollback.\n`;
        }
      } catch (rollbackError: any) {
        result += `❌ Rollback failed: ${rollbackError.message}\n`;
        result += `Manual recovery may be required.\n`;
      }

      return {
        success: false,
        message: result
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Parallel execution failed: ${error.message}`
    };
  }
}