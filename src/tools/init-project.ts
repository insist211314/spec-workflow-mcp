import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export const initProjectTool: Tool = {
  name: 'init_project',
  description: `Initialize a new Spec Workflow project with parallel capabilities.

Creates the .spec-workflow/ directory structure and configuration files needed for spec-driven development with parallel execution support.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectName: {
        type: 'string',
        description: 'Name of the project'
      },
      description: {
        type: 'string',
        description: 'Project description (optional)'
      },
      language: {
        type: 'string',
        description: 'Interface language code (en, zh, fr, etc.)',
        default: 'en'
      }
    },
    required: ['projectName']
  }
};

export async function initProjectHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { projectName, description = '', language = 'en' } = args;
    const projectPath = context.projectPath;

    // Check if already initialized
    const specWorkflowDir = join(projectPath, '.spec-workflow');
    try {
      await access(specWorkflowDir, constants.F_OK);
      return {
        success: true,
        message: 'Project already initialized. Existing .spec-workflow directory found.'
      };
    } catch {
      // Directory doesn't exist, continue with initialization
    }

    // Create directory structure
    const dirs = [
      '.spec-workflow',
      '.spec-workflow/steering',
      '.spec-workflow/specs',
      '.spec-workflow/approval',
      '.spec-workflow/archive',
      '.spec-workflow/parallel',
      '.spec-workflow/parallel/logs',
      '.spec-workflow/parallel/state'
    ];

    for (const dir of dirs) {
      await mkdir(join(projectPath, dir), { recursive: true });
    }

    // Create initial configuration
    const config = {
      project: {
        name: projectName,
        description,
        language,
        initialized: new Date().toISOString()
      },
      parallel: {
        enabled: true,
        maxConcurrentTasks: 3,
        mode: 'classic', // classic or turbo
        enableSuggestions: true
      },
      dashboard: {
        autoStart: false,
        port: 3000,
        theme: 'light'
      }
    };

    await writeFile(
      join(projectPath, '.spec-workflow', 'config.toml'),
      `# Spec Workflow Configuration
# Generated on ${new Date().toISOString()}

[project]
name = "${projectName}"
description = "${description}"
language = "${language}"
initialized = "${new Date().toISOString()}"

[parallel]
enabled = true
maxConcurrentTasks = 3
mode = "classic"  # classic or turbo
enableSuggestions = true

[dashboard]
autoStart = false
port = 3000
theme = "light"
`,
      'utf-8'
    );

    // Create session.json
    const sessionData = {
      projectName,
      language,
      parallel: {
        enabled: true,
        mode: 'classic'
      },
      lastUpdated: new Date().toISOString()
    };

    await writeFile(
      join(projectPath, '.spec-workflow', 'session.json'),
      JSON.stringify(sessionData, null, 2),
      'utf-8'
    );

    // Create README for the project structure
    const readmeContent = `# ${projectName}

${description}

## Spec Workflow Structure

This project uses Spec Workflow MCP with parallel execution capabilities.

### Directory Structure
- \`.spec-workflow/steering/\` - Project guidance documents
- \`.spec-workflow/specs/\` - Specification documents
- \`.spec-workflow/approval/\` - Approval workflow data
- \`.spec-workflow/parallel/\` - Parallel execution state and logs

### Getting Started
1. Create steering documents to define project direction
2. Create specification documents for features
3. Use parallel analysis to identify independent tasks
4. Execute tasks in parallel for faster development

### Available Commands
Use Claude with this MCP server to access spec workflow commands:
- \`init_project\` - Initialize project (done)
- \`create-steering-doc\` - Create guidance documents
- \`create-spec-doc\` - Create specifications
- \`analyze-parallel\` - Analyze parallel execution opportunities
- \`execute-parallel\` - Execute tasks in parallel

Language: ${language}
Initialized: ${new Date().toLocaleString()}
`;

    await writeFile(
      join(projectPath, '.spec-workflow', 'README.md'),
      readmeContent,
      'utf-8'
    );

    return {
      success: true,
      message: `Project "${projectName}" initialized successfully with parallel capabilities.\n\nDirectory structure created:\n- .spec-workflow/\n- Configuration files generated\n- Language set to: ${language}\n\nYou can now use other spec workflow tools to create steering documents and specifications.`
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to initialize project: ${error.message}`
    };
  }
}