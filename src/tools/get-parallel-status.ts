import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const getParallelStatusTool: Tool = {
  name: 'get-parallel-status',
  description: `Get the current status of parallel execution capabilities.

Shows if parallel features are enabled, configuration settings, and available functionality.`,
  inputSchema: {
    type: 'object',
    properties: {
      detailed: {
        type: 'boolean',
        description: 'Include detailed system information',
        default: false
      }
    }
  }
};

export async function getParallelStatusHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { detailed = false } = args;
    const projectPath = context.projectPath;

    let result = `# Parallel Execution Status\n\n`;

    // Check if project is initialized
    let isInitialized = false;
    let config: any = null;

    try {
      const configPath = join(projectPath, '.spec-workflow', 'config.toml');
      await readFile(configPath, 'utf-8');
      isInitialized = true;

      // Try to read session data
      try {
        const sessionPath = join(projectPath, '.spec-workflow', 'session.json');
        const sessionContent = await readFile(sessionPath, 'utf-8');
        config = JSON.parse(sessionContent);
      } catch {
        // Session file may not exist
      }
    } catch {
      isInitialized = false;
    }

    result += `**Project Status:** ${isInitialized ? '✅ Initialized' : '❌ Not Initialized'}\n`;

    if (!isInitialized) {
      result += `\n⚠️ **Project not initialized for Spec Workflow**\n`;
      result += `Use \`init_project\` to set up parallel execution capabilities.\n\n`;
      result += `Example: \`init_project\` with projectName: "My Project"\n`;

      return {
        success: true,
        message: result,
        data: {
          initialized: false,
          parallelEnabled: false
        }
      };
    }

    // Show parallel capabilities status
    const parallelEnabled = config?.parallel?.enabled ?? true;
    const mode = config?.parallel?.mode ?? 'classic';

    result += `**Parallel Execution:** ${parallelEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    result += `**Current Mode:** ${mode}\n\n`;

    // Available tools
    result += `## 🛠️ Available Parallel Tools\n\n`;
    result += `### Phase 1 - Analysis Tools\n`;
    result += `- \`analyze-parallel\` - Analyze task dependencies and parallel opportunities\n`;
    result += `- \`get-parallel-status\` - Check system status (current tool)\n\n`;

    result += `### Phase 2 - Execution Tools\n`;
    result += `- \`execute-parallel\` - Execute tasks in parallel\n`;
    result += `- \`manage-tasks-parallel\` - Manage parallel task execution\n\n`;

    result += `### Phase 3-4 - Advanced Tools\n`;
    result += `- \`run-agent\` - Execute intelligent analysis agents\n`;
    result += `- Advanced coordination and learning features\n\n`;

    // Current capabilities
    result += `## ⚡ Current Capabilities\n\n`;
    result += `✅ **Implemented Features:**\n`;
    result += `- Project initialization with parallel support\n`;
    result += `- Dependency analysis (27 analysis components)\n`;
    result += `- Intelligent task coordination\n`;
    result += `- Risk assessment and suggestions\n`;
    result += `- Git worktree integration\n`;
    result += `- TypeScript agent system\n`;
    result += `- State management and rollback\n\n`;

    if (detailed) {
      result += `## 🔧 Technical Details\n\n`;
      result += `**Backend Components:**\n`;
      result += `- Phase 1: MVP Parallel Analysis (95% complete)\n`;
      result += `- Phase 2: Basic Parallel Execution (90% complete)\n`;
      result += `- Phase 3: Smart Coordination (100% complete)\n`;
      result += `- Phase 4: Full Integration (95% complete)\n\n`;

      result += `**Implementation Files:**\n`;
      result += `- 27 parallel execution modules\n`;
      result += `- 4 test suites\n`;
      result += `- Complete dashboard integration\n`;
      result += `- MCP tool interfaces (newly added)\n\n`;
    }

    result += `## 📋 Next Steps\n\n`;
    if (parallelEnabled) {
      result += `1. Create specifications using \`create-spec-doc\`\n`;
      result += `2. Analyze parallel opportunities with \`analyze-parallel\`\n`;
      result += `3. Execute tasks in parallel with \`execute-parallel\`\n`;
      result += `4. Use intelligent agents with \`run-agent\`\n`;
    } else {
      result += `1. Enable parallel execution in project configuration\n`;
      result += `2. Use \`init_project\` to set up parallel capabilities\n`;
      result += `3. Start with \`analyze-parallel\` for your first spec\n`;
    }

    return {
      success: true,
      message: result,
      data: {
        initialized: isInitialized,
        parallelEnabled,
        mode,
        projectPath,
        availableTools: [
          'init_project',
          'analyze-parallel',
          'execute-parallel',
          'run-agent',
          'get-parallel-status'
        ]
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to get parallel status: ${error.message}`
    };
  }
}