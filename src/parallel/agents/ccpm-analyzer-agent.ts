/**
 * CCPM Analyzer Agent
 * Analyzes CCPM projects to extract agents, commands, and scripts
 */

import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Agent definition from CCPM
 */
export interface AgentDefinition {
  name: string;
  description: string;
  tools: string[];
  model?: string;
  color?: string;
  instructions: string;
  capabilities: string[];
}

/**
 * Command definition from CCPM
 */
export interface CommandDefinition {
  name: string;
  category: string;
  description: string;
  allowedTools: string[];
  script?: string;
  preflight?: string[];
}

/**
 * CCPM project analysis result
 */
export interface CCPMAnalysis {
  agents: AgentDefinition[];
  commands: CommandDefinition[];
  scripts: string[];
  structure: {
    hasAgents: boolean;
    hasCommands: boolean;
    hasScripts: boolean;
    hasPRDs: boolean;
    hasEpics: boolean;
  };
  compatibility: {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
}

/**
 * CCPM Analyzer Agent
 */
export class CCPMAnalyzerAgent extends BaseAgent {
  constructor() {
    super('CCPMAnalyzer', '1.0.0');
    
    this.capabilities = [
      {
        name: 'analyze-project',
        description: 'Analyze CCPM project structure and extract components',
        inputSchema: {
          projectPath: 'string'
        },
        outputSchema: {
          analysis: 'CCPMAnalysis'
        }
      },
      {
        name: 'extract-agents',
        description: 'Extract agent definitions from CCPM project',
        inputSchema: {
          projectPath: 'string'
        },
        outputSchema: {
          agents: 'AgentDefinition[]'
        }
      },
      {
        name: 'extract-commands',
        description: 'Extract command definitions from CCPM project',
        inputSchema: {
          projectPath: 'string'
        },
        outputSchema: {
          commands: 'CommandDefinition[]'
        }
      }
    ];
  }
  
  /**
   * Execute the CCPM analysis
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      this.log('Starting CCPM project analysis', 'info');
      
      const projectPath = context.config?.ccpmPath || 
                         join(context.projectPath, '../ccpm');
      
      // Check if CCPM project exists
      const exists = await this.checkCCPMProject(projectPath);
      if (!exists) {
        return {
          success: false,
          error: `CCPM project not found at ${projectPath}`,
          suggestions: [
            'Ensure CCPM project is available',
            'Check the project path configuration'
          ]
        };
      }
      
      // Analyze the project
      const analysis = await this.analyzeCCPMProject(projectPath);
      
      // Compress the result
      const compressed = this.compress(analysis);
      
      return {
        success: true,
        data: compressed,
        compressed: true,
        originalSize: JSON.stringify(analysis).length,
        compressedSize: JSON.stringify(compressed).length,
        suggestions: analysis.compatibility.recommendations
      };
      
    } catch (error) {
      this.log(`Analysis failed: ${error}`, 'error');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check if CCPM project exists
   */
  private async checkCCPMProject(projectPath: string): Promise<boolean> {
    try {
      const claudeDir = join(projectPath, '.claude');
      const stats = await fs.stat(claudeDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  
  /**
   * Analyze CCPM project
   */
  async analyzeCCPMProject(projectPath: string): Promise<CCPMAnalysis> {
    const claudeDir = join(projectPath, '.claude');
    
    // Extract components
    const agents = await this.extractAgents(claudeDir);
    const commands = await this.extractCommands(claudeDir);
    const scripts = await this.extractScripts(claudeDir);
    
    // Check structure
    const structure = await this.analyzeStructure(claudeDir);
    
    // Assess compatibility
    const compatibility = this.assessCompatibility(agents, commands, scripts);
    
    return {
      agents,
      commands,
      scripts,
      structure,
      compatibility
    };
  }
  
  /**
   * Extract agent definitions
   */
  async extractAgents(claudeDir: string): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];
    const agentsDir = join(claudeDir, 'agents');
    
    try {
      const files = await fs.readdir(agentsDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(join(agentsDir, file), 'utf-8');
          const agent = this.parseAgentDefinition(file, content);
          if (agent) {
            agents.push(agent);
          }
        }
      }
    } catch (error) {
      this.log(`Failed to extract agents: ${error}`, 'warn');
    }
    
    return agents;
  }
  
  /**
   * Parse agent definition from markdown
   */
  private parseAgentDefinition(filename: string, content: string): AgentDefinition | null {
    try {
      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return null;
      }
      
      const frontmatter = frontmatterMatch[1];
      const instructions = content.replace(frontmatterMatch[0], '').trim();
      
      // Parse frontmatter
      const name = this.extractField(frontmatter, 'name') || 
                  filename.replace('.md', '');
      const description = this.extractField(frontmatter, 'description') || '';
      const toolsStr = this.extractField(frontmatter, 'tools') || '';
      const tools = toolsStr.split(',').map(t => t.trim()).filter(Boolean);
      const model = this.extractField(frontmatter, 'model');
      const color = this.extractField(frontmatter, 'color');
      
      // Extract capabilities from instructions
      const capabilities = this.extractCapabilities(instructions);
      
      return {
        name,
        description,
        tools,
        model,
        color,
        instructions,
        capabilities
      };
    } catch (error) {
      this.log(`Failed to parse agent ${filename}: ${error}`, 'warn');
      return null;
    }
  }
  
  /**
   * Extract field from frontmatter
   */
  private extractField(frontmatter: string, field: string): string | undefined {
    const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : undefined;
  }
  
  /**
   * Extract capabilities from instructions
   */
  private extractCapabilities(instructions: string): string[] {
    const capabilities: string[] = [];
    
    // Look for bullet points describing what the agent can do
    const bulletPoints = instructions.match(/^[\s]*[-*]\s+(.+)$/gm);
    if (bulletPoints) {
      bulletPoints.forEach(point => {
        const cleaned = point.replace(/^[\s]*[-*]\s+/, '').trim();
        if (cleaned.length < 100) { // Only short descriptions
          capabilities.push(cleaned);
        }
      });
    }
    
    return capabilities.slice(0, 5); // Limit to 5 capabilities
  }
  
  /**
   * Extract command definitions
   */
  async extractCommands(claudeDir: string): Promise<CommandDefinition[]> {
    const commands: CommandDefinition[] = [];
    const commandsDir = join(claudeDir, 'commands');
    
    try {
      const categories = await fs.readdir(commandsDir);
      
      for (const category of categories) {
        const categoryPath = join(commandsDir, category);
        const stats = await fs.stat(categoryPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const content = await fs.readFile(
                join(categoryPath, file), 
                'utf-8'
              );
              const command = this.parseCommandDefinition(
                category, 
                file, 
                content
              );
              if (command) {
                commands.push(command);
              }
            }
          }
        }
      }
    } catch (error) {
      this.log(`Failed to extract commands: ${error}`, 'warn');
    }
    
    return commands;
  }
  
  /**
   * Parse command definition
   */
  private parseCommandDefinition(
    category: string, 
    filename: string, 
    content: string
  ): CommandDefinition | null {
    try {
      const name = `${category}:${filename.replace('.md', '')}`;
      
      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
      
      // Extract allowed tools
      const allowedToolsStr = this.extractField(frontmatter, 'allowed-tools') || '';
      const allowedTools = allowedToolsStr.split(',').map(t => t.trim()).filter(Boolean);
      
      // Extract description (first paragraph after frontmatter)
      const contentBody = frontmatterMatch 
        ? content.replace(frontmatterMatch[0], '').trim()
        : content;
      const descriptionMatch = contentBody.match(/^#?\s*(.+?)(?:\n|$)/);
      const description = descriptionMatch ? descriptionMatch[1] : '';
      
      // Check for script reference
      const scriptMatch = content.match(/\$\{?SCRIPT[:\s]+([^\s}]+)/);
      const script = scriptMatch ? scriptMatch[1] : undefined;
      
      // Extract preflight checks
      const preflight: string[] = [];
      const preflightSection = content.match(/##\s*Preflight[\s\S]*?(?=##|$)/);
      if (preflightSection) {
        const checks = preflightSection[0].match(/^[\s]*[-*]\s+(.+)$/gm);
        if (checks) {
          checks.forEach(check => {
            preflight.push(check.replace(/^[\s]*[-*]\s+/, '').trim());
          });
        }
      }
      
      return {
        name,
        category,
        description,
        allowedTools,
        script,
        preflight: preflight.length > 0 ? preflight : undefined
      };
    } catch (error) {
      this.log(`Failed to parse command ${filename}: ${error}`, 'warn');
      return null;
    }
  }
  
  /**
   * Extract scripts
   */
  async extractScripts(claudeDir: string): Promise<string[]> {
    const scripts: string[] = [];
    const scriptsDir = join(claudeDir, 'scripts');
    
    try {
      const items = await this.walkDirectory(scriptsDir);
      
      for (const item of items) {
        if (item.endsWith('.sh')) {
          scripts.push(item.replace(scriptsDir + '/', ''));
        }
      }
    } catch (error) {
      this.log(`Failed to extract scripts: ${error}`, 'warn');
    }
    
    return scripts;
  }
  
  /**
   * Walk directory recursively
   */
  private async walkDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          const subItems = await this.walkDirectory(fullPath);
          results.push(...subItems);
        } else {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }
    
    return results;
  }
  
  /**
   * Analyze project structure
   */
  private async analyzeStructure(claudeDir: string): Promise<CCPMAnalysis['structure']> {
    const structure = {
      hasAgents: false,
      hasCommands: false,
      hasScripts: false,
      hasPRDs: false,
      hasEpics: false
    };
    
    try {
      const dirs = await fs.readdir(claudeDir);
      
      structure.hasAgents = dirs.includes('agents');
      structure.hasCommands = dirs.includes('commands');
      structure.hasScripts = dirs.includes('scripts');
      structure.hasPRDs = dirs.includes('prds');
      structure.hasEpics = dirs.includes('epics');
    } catch {
      // Directory not accessible
    }
    
    return structure;
  }
  
  /**
   * Assess compatibility with Spec Workflow
   */
  private assessCompatibility(
    agents: AgentDefinition[],
    commands: CommandDefinition[],
    scripts: string[]
  ): CCPMAnalysis['compatibility'] {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    
    // Check for GitHub dependencies
    const hasGitHubDeps = commands.some(cmd => 
      cmd.name.includes('github') || cmd.name.includes('issue')
    );
    if (hasGitHubDeps) {
      issues.push('Some commands depend on GitHub integration');
      recommendations.push('Consider adapting GitHub commands to use Dashboard');
      score -= 20;
    }
    
    // Check for complex shell scripts
    const complexScripts = scripts.filter(s => s.includes('pm/'));
    if (complexScripts.length > 5) {
      issues.push('Many PM scripts may need adaptation');
      recommendations.push('Port shell scripts to TypeScript for better integration');
      score -= 15;
    }
    
    // Check agent complexity
    const complexAgents = agents.filter(a => a.tools.length > 10);
    if (complexAgents.length > 0) {
      issues.push('Some agents use many tools');
      recommendations.push('Consider simplifying agent tool requirements');
      score -= 10;
    }
    
    // Positive factors
    if (agents.length > 0) {
      recommendations.push(`Found ${agents.length} agents ready for integration`);
    }
    
    if (commands.length > 0) {
      recommendations.push(`Found ${commands.length} commands that can be adapted`);
    }
    
    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }
  
  /**
   * Compress analysis results
   */
  protected compress(data: CCPMAnalysis): any {
    const compressed = {
      summary: {
        agents: data.agents.length,
        commands: data.commands.length,
        scripts: data.scripts.length,
        compatibilityScore: data.compatibility.score
      },
      topAgents: data.agents.slice(0, 3).map(a => ({
        name: a.name,
        tools: a.tools.length,
        description: a.description.substring(0, 50)
      })),
      topCommands: data.commands.slice(0, 5).map(c => ({
        name: c.name,
        category: c.category
      })),
      structure: data.structure,
      issues: data.compatibility.issues,
      recommendations: data.compatibility.recommendations
    };
    
    return compressed;
  }
}