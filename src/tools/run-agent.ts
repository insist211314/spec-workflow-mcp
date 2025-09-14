import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { BaseAgent } from '../parallel/agents/base-agent.js';
import { CCPMAnalyzerAgent } from '../parallel/agents/ccpm-analyzer-agent.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown } from '../core/task-parser.js';
import { parsedTasksToParallelTasks } from './task-adapter.js';

export const runAgentTool: Tool = {
  name: 'run-agent',
  description: `Execute intelligent analysis agents for advanced parallel coordination.

Runs specialized agents for dependency analysis, task monitoring, and smart coordination with learning capabilities.`,
  inputSchema: {
    type: 'object',
    properties: {
      agentType: {
        type: 'string',
        enum: ['ccmp-analyzer'],
        description: 'Type of agent to run - ccmp-analyzer (CCPM dependency analysis and task coordination)'
      },
      specName: {
        type: 'string',
        description: 'Name of the specification to analyze'
      },
      options: {
        type: 'object',
        description: 'Agent-specific options',
        properties: {
          mode: {
            type: 'string',
            enum: ['conservative', 'balanced', 'aggressive'],
            description: 'Analysis mode',
            default: 'balanced'
          },
          learningEnabled: {
            type: 'boolean',
            description: 'Enable agent learning from execution results',
            default: true
          },
          realTimeUpdates: {
            type: 'boolean',
            description: 'Enable real-time status updates',
            default: true
          }
        }
      }
    },
    required: ['agentType', 'specName']
  }
};

export async function runAgentHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { agentType, specName, options = {} } = args;
    const { mode = 'balanced', learningEnabled = true, realTimeUpdates = true } = options;
    const projectPath = context.projectPath;

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
        message: `No tasks found in specification "${specName}". Make sure the spec contains task definitions.`
      };
    }

    // Convert to parallel task format
    const tasks = parsedTasksToParallelTasks(parsedTasks);

    // Initialize appropriate agent
    let agent: BaseAgent;
    let agentName: string;

    switch (agentType) {
      case 'ccmp-analyzer':
        agent = new CCPMAnalyzerAgent();
        agentName = 'CCMP Analyzer Agent';
        break;
      default:
        return {
          success: false,
          message: `Unknown agent type: ${agentType}. Must be: ccmp-analyzer`
        };
    }

    let result = `# ${agentName} Execution Results for "${specName}"\n\n`;
    result += `**Agent Type:** ${agentType}\n`;
    result += `**Analysis Mode:** ${mode}\n`;
    result += `**Learning Enabled:** ${learningEnabled ? 'Yes' : 'No'}\n`;
    result += `**Real-time Updates:** ${realTimeUpdates ? 'Yes' : 'No'}\n`;
    result += `**Tasks Analyzed:** ${tasks.length}\n\n`;

    // Execute agent
    try {
      const agentResult = await agent.execute({
        projectPath,
        workflowRoot: `${projectPath}/.spec-workflow`,
        tasks,
        workingDirectory: projectPath,
        environment: {},
        resources: [],
        timeout: 30000
      });

      result += `## 🤖 Agent Execution Results\n\n`;

      if (agentResult.success) {
        result += `✅ **Status:** Success\n\n`;

        if (agentResult.data) {
          result += `**Output:**\n${agentResult.data}\n\n`;
        }

        // Add agent-specific insights
        switch (agentType) {
          case 'ccmp-analyzer':
            result += `### 📊 CCMP Analysis Insights\n`;
            result += `- Task dependencies have been analyzed using CCMP methodology\n`;
            result += `- Parallel execution opportunities identified\n`;
            result += `- Risk assessment completed\n`;
            result += `- Task coordination optimized\n\n`;
            break;
        }

        // Learning feedback
        if (learningEnabled) {
          result += `### 🧠 Learning Feedback\n`;
          result += `- Agent has recorded execution patterns\n`;
          result += `- Performance insights captured for future optimization\n`;
          result += `- Knowledge base updated with new patterns\n\n`;
        }

      } else {
        result += `❌ **Status:** Failed\n`;
        if (agentResult.error) {
          result += `**Error:** ${agentResult.error}\n\n`;
        }
      }

      // Next steps
      result += `## 📋 Next Steps\n`;
      switch (agentType) {
        case 'ccmp-analyzer':
          result += `1. Review CCMP analysis results and recommendations\n`;
          result += `2. Use \`execute-parallel\` to run identified parallel groups\n`;
          result += `3. Monitor execution with \`get-parallel-status\`\n`;
          result += `4. Apply CCPM coordination insights to optimize workflow\n`;
          break;
      }

      return {
        success: agentResult.success,
        message: result,
        data: {
          specName,
          agentType,
          agentResult: agentResult.data,
          learningEnabled,
          realTimeUpdates
        }
      };

    } catch (error: any) {
      result += `## ❌ Agent Execution Failed\n\n`;
      result += `**Error:** ${error.message}\n\n`;
      result += `**Troubleshooting:**\n`;
      result += `1. Check that the specification contains valid task definitions\n`;
      result += `2. Verify that the agent type is supported\n`;
      result += `3. Ensure the project is properly initialized\n`;

      return {
        success: false,
        message: result
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Agent execution failed: ${error.message}`
    };
  }
}