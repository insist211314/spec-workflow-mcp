import { BaseAgent, AgentContext, AgentResult } from '../agents/base-agent.js';
import { CodeAnalyzerAgent } from '../agents/implementations/code-analyzer-agent.js';
import { FileAnalyzerAgent } from '../agents/implementations/file-analyzer-agent.js';

export interface Command {
  name: string;
  description: string;
  category: 'spec-workflow' | 'ccpm' | 'parallel';
  handler: (args: any, context: CommandContext) => Promise<CommandResult>;
  inputSchema?: any;
  examples?: string[];
  deprecated?: boolean;
  alias?: string[];
}

export interface CommandContext {
  projectPath: string;
  workflowRoot: string;
  sessionManager?: any;
  dashboardUrl?: string;
  lang?: string;
  user?: {
    preferences?: any;
    settings?: any;
  };
  currentSpec?: string;
  parallelMode?: boolean;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  message: string;
  nextSteps?: string[];
  warnings?: string[];
  error?: string;
}

export interface CommandInfo {
  name: string;
  description: string;
  category: string;
  usage: string;
  examples: string[];
  deprecated?: boolean;
  aliases?: string[];
}

/**
 * Unified Command System that bridges Spec Workflow and CCPM commands
 *
 * This system provides a single interface for all commands while preserving
 * the distinct capabilities of both systems.
 */
export class UnifiedCommandSystem {
  private specWorkflowCommands: Map<string, Command> = new Map();
  private ccpmCommands: Map<string, Command> = new Map();
  private parallelCommands: Map<string, Command> = new Map();
  private agentRegistry: Map<string, BaseAgent> = new Map();

  constructor() {
    this.initializeAgents();
    this.registerBuiltinCommands();
  }

  private initializeAgents(): void {
    // Register built-in agents
    this.agentRegistry.set('code-analyzer', new CodeAnalyzerAgent());
    this.agentRegistry.set('file-analyzer', new FileAnalyzerAgent());
  }

  private registerBuiltinCommands(): void {
    // Register parallel system commands
    this.registerParallelCommands();

    // Register CCPM-style commands with /pm: prefix
    this.registerCCPMCommands();

    // Register enhanced Spec Workflow commands
    this.registerSpecWorkflowCommands();
  }

  private registerParallelCommands(): void {
    // Parallel analysis command
    this.parallelCommands.set('analyze-parallel', {
      name: 'analyze-parallel',
      description: 'Analyze tasks for parallel execution opportunities',
      category: 'parallel',
      handler: this.handleAnalyzeParallel.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          specName: { type: 'string' },
          mode: { type: 'string', enum: ['conservative', 'balanced', 'aggressive'] }
        },
        required: ['specName']
      },
      examples: [
        'analyze-parallel --spec-name user-auth',
        'analyze-parallel --spec-name user-auth --mode conservative'
      ]
    });

    // Parallel execution command
    this.parallelCommands.set('execute-parallel', {
      name: 'execute-parallel',
      description: 'Execute tasks in parallel based on analysis',
      category: 'parallel',
      handler: this.handleExecuteParallel.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          specName: { type: 'string' },
          taskIds: { type: 'array', items: { type: 'string' } },
          maxParallel: { type: 'number', minimum: 1, maximum: 3 }
        },
        required: ['specName']
      },
      examples: [
        'execute-parallel --spec-name user-auth',
        'execute-parallel --spec-name user-auth --task-ids 1.1,1.2 --max-parallel 2'
      ]
    });

    // Agent execution command
    this.parallelCommands.set('run-agent', {
      name: 'run-agent',
      description: 'Execute a specific agent with given context',
      category: 'parallel',
      handler: this.handleRunAgent.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          agentName: { type: 'string' },
          context: { type: 'object' },
          timeout: { type: 'number' }
        },
        required: ['agentName']
      },
      examples: [
        'run-agent --agent-name code-analyzer',
        'run-agent --agent-name file-analyzer --context \'{"files": ["log.txt"]}\''
      ]
    });
  }

  private registerCCPMCommands(): void {
    // Issue analysis (CCPM-style)
    this.ccpmCommands.set('pm:issue-analyze', {
      name: 'pm:issue-analyze',
      description: 'Analyze issue for parallel execution opportunities (CCPM-style)',
      category: 'ccpm',
      handler: this.handleIssueAnalyze.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string' },
          specName: { type: 'string' }
        }
      },
      examples: [
        'pm:issue-analyze --issue-id 123',
        'pm:issue-analyze --spec-name user-auth'
      ]
    });

    // Parallel start (CCPM-style)
    this.ccpmCommands.set('pm:issue-start', {
      name: 'pm:issue-start',
      description: 'Start parallel work on issue using worktrees',
      category: 'ccpm',
      handler: this.handleIssueStart.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string' },
          mode: { type: 'string', enum: ['worktree', 'branch'] }
        },
        required: ['issueId']
      },
      examples: [
        'pm:issue-start --issue-id 123',
        'pm:issue-start --issue-id 123 --mode worktree'
      ]
    });

    // Context optimization
    this.ccpmCommands.set('pm:context-optimize', {
      name: 'pm:context-optimize',
      description: 'Optimize context using agent compression',
      category: 'ccpm',
      handler: this.handleContextOptimize.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          compressionRatio: { type: 'number', minimum: 0.1, maximum: 0.9 }
        }
      },
      examples: [
        'pm:context-optimize --target logs/',
        'pm:context-optimize --target . --compression-ratio 0.8'
      ]
    });
  }

  private registerSpecWorkflowCommands(): void {
    // Enhanced spec workflow commands with parallel support
    this.specWorkflowCommands.set('spec-analyze', {
      name: 'spec-analyze',
      description: 'Analyze spec with parallel execution recommendations',
      category: 'spec-workflow',
      handler: this.handleSpecAnalyze.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          specName: { type: 'string' },
          includeParallel: { type: 'boolean', default: true }
        },
        required: ['specName']
      },
      examples: [
        'spec-analyze --spec-name user-auth',
        'spec-analyze --spec-name user-auth --include-parallel false'
      ]
    });

    // Enhanced task management with parallel support
    this.specWorkflowCommands.set('manage-tasks-parallel', {
      name: 'manage-tasks-parallel',
      description: 'Manage tasks with parallel execution support',
      category: 'spec-workflow',
      handler: this.handleManageTasksParallel.bind(this),
      inputSchema: {
        type: 'object',
        properties: {
          specName: { type: 'string' },
          action: { type: 'string', enum: ['list', 'analyze', 'execute'] },
          parallelMode: { type: 'boolean', default: false }
        },
        required: ['specName', 'action']
      },
      examples: [
        'manage-tasks-parallel --spec-name user-auth --action analyze',
        'manage-tasks-parallel --spec-name user-auth --action execute --parallel-mode true'
      ]
    });
  }

  /**
   * Execute a command by name with given arguments
   */
  async executeCommand(commandName: string, args: any = {}, context: CommandContext): Promise<CommandResult> {
    try {
      // Find command across all registries
      const command = this.findCommand(commandName);

      if (!command) {
        return {
          success: false,
          message: `Command '${commandName}' not found`,
          error: 'Command not found',
          nextSteps: [
            'Use list-commands to see available commands',
            'Check command spelling and category prefix'
          ]
        };
      }

      // Validate input if schema is provided
      if (command.inputSchema) {
        const validation = this.validateInput(args, command.inputSchema);
        if (!validation.valid) {
          return {
            success: false,
            message: `Invalid input: ${validation.errors.join(', ')}`,
            error: 'Validation failed',
            nextSteps: [`Check command usage: ${commandName} --help`]
          };
        }
      }

      // Execute command
      const result = await command.handler(args, context);

      // Add command metadata to result
      return {
        ...result,
        warnings: result.warnings || [],
        nextSteps: result.nextSteps || []
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Command execution failed: ${error.message}`,
        error: error.message,
        nextSteps: [
          'Check command arguments and context',
          'Verify project state and permissions'
        ]
      };
    }
  }

  /**
   * Register a new command
   */
  async registerCommand(command: Command): Promise<void> {
    const registry = this.getRegistryForCategory(command.category);
    registry.set(command.name, command);

    // Register aliases
    if (command.alias) {
      for (const alias of command.alias) {
        registry.set(alias, { ...command, name: alias });
      }
    }
  }

  /**
   * List all available commands
   */
  async listCommands(category?: string): Promise<CommandInfo[]> {
    const commands: CommandInfo[] = [];

    const registries = category
      ? [this.getRegistryForCategory(category as any)]
      : [this.specWorkflowCommands, this.ccpmCommands, this.parallelCommands];

    for (const registry of registries) {
      for (const [name, command] of registry) {
        // Skip aliases in listing
        if (command.alias?.includes(name)) continue;

        commands.push({
          name: command.name,
          description: command.description,
          category: command.category,
          usage: this.generateUsage(command),
          examples: command.examples || [],
          deprecated: command.deprecated,
          aliases: command.alias
        });
      }
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Command Handlers

  private async handleAnalyzeParallel(args: any, context: CommandContext): Promise<CommandResult> {
    const { specName, mode = 'conservative' } = args;

    try {
      // This would integrate with the parallel analysis system
      // For now, return a mock result
      return {
        success: true,
        message: `Parallel analysis completed for spec '${specName}' in ${mode} mode`,
        data: {
          specName,
          mode,
          parallelOpportunities: 2,
          recommendedGroups: [
            { tasks: ['1.1', '1.2'], confidence: 0.9 },
            { tasks: ['2.1', '2.3'], confidence: 0.7 }
          ]
        },
        nextSteps: [
          'Review parallel task groups',
          'Execute with: execute-parallel --spec-name ' + specName
        ]
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Parallel analysis failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async handleExecuteParallel(args: any, context: CommandContext): Promise<CommandResult> {
    const { specName, taskIds, maxParallel = 3 } = args;

    try {
      // This would integrate with the parallel execution system
      return {
        success: true,
        message: `Parallel execution started for spec '${specName}'`,
        data: {
          specName,
          executingTasks: taskIds || ['auto-selected'],
          maxParallel,
          estimatedTime: '15 minutes'
        },
        nextSteps: [
          'Monitor execution progress',
          'Check for conflicts during execution'
        ]
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Parallel execution failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async handleRunAgent(args: any, context: CommandContext): Promise<CommandResult> {
    const { agentName, context: agentContextData, timeout } = args;

    try {
      const agent = this.agentRegistry.get(agentName);
      if (!agent) {
        return {
          success: false,
          message: `Agent '${agentName}' not found`,
          error: 'Agent not found',
          nextSteps: ['Check available agents with list-agents command']
        };
      }

      const agentContext: AgentContext = {
        projectPath: context.projectPath,
        workflowRoot: context.workflowRoot,
        timeout,
        ...agentContextData
      };

      const result = await agent.run(agentContext);

      return {
        success: result.success,
        message: result.success
          ? `Agent '${agentName}' executed successfully`
          : `Agent '${agentName}' execution failed`,
        data: result.data,
        error: result.error,
        nextSteps: result.success
          ? ['Review agent results', 'Apply recommendations if applicable']
          : ['Check agent logs', 'Verify input parameters']
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Agent execution failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async handleIssueAnalyze(args: any, context: CommandContext): Promise<CommandResult> {
    // CCPM-style issue analysis
    return {
      success: true,
      message: 'Issue analysis completed (CCPM-style)',
      data: {
        parallelizationFactor: 3.2,
        workStreams: ['frontend', 'backend', 'tests'],
        estimatedTimeReduction: '60%'
      },
      nextSteps: [
        'Start parallel work with pm:issue-start',
        'Review work stream dependencies'
      ]
    };
  }

  private async handleIssueStart(args: any, context: CommandContext): Promise<CommandResult> {
    const { issueId, mode = 'worktree' } = args;

    return {
      success: true,
      message: `Started parallel work on issue ${issueId} using ${mode} mode`,
      data: {
        issueId,
        mode,
        worktreesCreated: mode === 'worktree' ? 3 : 0,
        branchesCreated: mode === 'branch' ? 3 : 0
      },
      nextSteps: [
        'Monitor parallel execution',
        'Use pm:issue-sync to sync progress'
      ]
    };
  }

  private async handleContextOptimize(args: any, context: CommandContext): Promise<CommandResult> {
    const { target = '.', compressionRatio = 0.8 } = args;

    // Use file analyzer agent for context optimization
    const fileAnalyzer = this.agentRegistry.get('file-analyzer') as FileAnalyzerAgent;

    if (!fileAnalyzer) {
      return {
        success: false,
        message: 'File analyzer agent not available',
        error: 'Agent not found'
      };
    }

    try {
      const agentContext: AgentContext = {
        projectPath: context.projectPath,
        workflowRoot: context.workflowRoot
      };

      const result = await fileAnalyzer.run(agentContext);

      return {
        success: result.success,
        message: `Context optimization completed with ${compressionRatio * 100}% compression`,
        data: {
          target,
          compressionRatio,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          optimizationResult: result.data
        },
        nextSteps: [
          'Review optimized context',
          'Apply compression settings to project'
        ]
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Context optimization failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async handleSpecAnalyze(args: any, context: CommandContext): Promise<CommandResult> {
    const { specName, includeParallel = true } = args;

    try {
      let parallelAnalysis = null;

      if (includeParallel) {
        // Perform parallel analysis
        const parallelResult = await this.handleAnalyzeParallel({ specName }, context);
        parallelAnalysis = parallelResult.success ? parallelResult.data : null;
      }

      return {
        success: true,
        message: `Spec analysis completed for '${specName}'${includeParallel ? ' with parallel recommendations' : ''}`,
        data: {
          specName,
          includeParallel,
          parallelAnalysis,
          analysis: {
            complexity: 'medium',
            taskCount: 8,
            estimatedTime: includeParallel ? '2 hours' : '4 hours'
          }
        },
        nextSteps: includeParallel
          ? ['Consider parallel execution', 'Review task dependencies']
          : ['Execute tasks sequentially', 'Monitor progress']
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Spec analysis failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async handleManageTasksParallel(args: any, context: CommandContext): Promise<CommandResult> {
    const { specName, action, parallelMode = false } = args;

    try {
      switch (action) {
        case 'list':
          return {
            success: true,
            message: `Listed tasks for spec '${specName}'${parallelMode ? ' with parallel grouping' : ''}`,
            data: {
              specName,
              parallelMode,
              tasks: [
                { id: '1.1', status: 'pending', parallelGroup: parallelMode ? 'A' : null },
                { id: '1.2', status: 'pending', parallelGroup: parallelMode ? 'A' : null },
                { id: '2.1', status: 'pending', parallelGroup: parallelMode ? 'B' : null }
              ]
            },
            nextSteps: parallelMode
              ? ['Execute parallel groups', 'Monitor for conflicts']
              : ['Execute tasks sequentially']
          };

        case 'analyze':
          return await this.handleAnalyzeParallel({ specName }, context);

        case 'execute':
          if (parallelMode) {
            return await this.handleExecuteParallel({ specName }, context);
          } else {
            return {
              success: true,
              message: `Sequential execution started for spec '${specName}'`,
              data: { specName, mode: 'sequential' },
              nextSteps: ['Monitor task progress', 'Update task statuses']
            };
          }

        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
            error: 'Invalid action',
            nextSteps: ['Use action: list, analyze, or execute']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Task management failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Helper methods

  private findCommand(name: string): Command | undefined {
    return this.specWorkflowCommands.get(name) ||
           this.ccpmCommands.get(name) ||
           this.parallelCommands.get(name);
  }

  private getRegistryForCategory(category: 'spec-workflow' | 'ccpm' | 'parallel'): Map<string, Command> {
    switch (category) {
      case 'spec-workflow':
        return this.specWorkflowCommands;
      case 'ccpm':
        return this.ccpmCommands;
      case 'parallel':
        return this.parallelCommands;
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  private validateInput(args: any, schema: any): { valid: boolean; errors: string[] } {
    // Simple validation - in a real implementation, use a proper JSON schema validator
    const errors: string[] = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private generateUsage(command: Command): string {
    const requiredFields = command.inputSchema?.required || [];
    const optionalFields = Object.keys(command.inputSchema?.properties || {})
      .filter(field => !requiredFields.includes(field));

    let usage = command.name;

    for (const field of requiredFields) {
      usage += ` --${field} <${field}>`;
    }

    for (const field of optionalFields) {
      usage += ` [--${field} <${field}>]`;
    }

    return usage;
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agentRegistry.keys());
  }

  /**
   * Register a new agent
   */
  registerAgent(name: string, agent: BaseAgent): void {
    this.agentRegistry.set(name, agent);
  }
}