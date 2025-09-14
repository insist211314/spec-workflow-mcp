/**
 * Parser for CCPM Markdown agent definitions
 * Converts Markdown agent files to TypeScript agent classes
 */

import { BaseAgent, AgentContext, AgentResult } from './base-agent.js';

/**
 * Parsed agent metadata from frontmatter
 */
export interface ParsedAgentMetadata {
  name: string;
  description: string;
  tools: string[];
  model?: string;
  color?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

/**
 * Parsed agent structure
 */
export interface ParsedAgent {
  metadata: ParsedAgentMetadata;
  instructions: string;
  sections: Map<string, string>;
  examples: string[];
  patterns: string[];
  responsibilities: string[];
}

/**
 * TypeScript agent template
 */
export interface AgentTemplate {
  className: string;
  imports: string[];
  properties: string[];
  methods: string[];
  fullCode: string;
}

/**
 * Markdown Agent Parser
 */
export class MarkdownAgentParser {
  
  /**
   * Parse a markdown agent definition
   */
  parseMarkdownAgent(content: string): ParsedAgent {
    const metadata = this.extractMetadata(content);
    const instructions = this.extractInstructions(content);
    const sections = this.extractSections(content);
    const examples = this.extractExamples(content);
    const patterns = this.extractPatterns(content);
    const responsibilities = this.extractResponsibilities(content);
    
    return {
      metadata,
      instructions,
      sections,
      examples,
      patterns,
      responsibilities
    };
  }
  
  /**
   * Extract metadata from frontmatter
   */
  private extractMetadata(content: string): ParsedAgentMetadata {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found in agent definition');
    }
    
    const frontmatter = frontmatterMatch[1];
    const metadata: ParsedAgentMetadata = {
      name: '',
      description: '',
      tools: []
    };
    
    // Parse each line of frontmatter
    const lines = frontmatter.split('\n');
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'name':
            metadata.name = value;
            break;
          case 'description':
            metadata.description = value;
            break;
          case 'tools':
            metadata.tools = value.split(',').map(t => t.trim());
            break;
          case 'model':
            metadata.model = value;
            break;
          case 'color':
            metadata.color = value;
            break;
          case 'version':
            metadata.version = value;
            break;
          case 'author':
            metadata.author = value;
            break;
          case 'tags':
            metadata.tags = value.split(',').map(t => t.trim());
            break;
        }
      }
    });
    
    return metadata;
  }
  
  /**
   * Extract main instructions
   */
  private extractInstructions(content: string): string {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Extract content before first ## heading
    const firstHeadingIndex = withoutFrontmatter.search(/^##\s/m);
    
    if (firstHeadingIndex > 0) {
      return withoutFrontmatter.substring(0, firstHeadingIndex).trim();
    }
    
    return withoutFrontmatter.trim();
  }
  
  /**
   * Extract sections (## headings)
   */
  private extractSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Match all ## sections
    const sectionMatches = withoutFrontmatter.matchAll(/^##\s+(.+?)\n([\s\S]*?)(?=^##\s|\z)/gm);
    
    for (const match of sectionMatches) {
      const title = match[1].trim();
      const content = match[2].trim();
      sections.set(title, content);
    }
    
    return sections;
  }
  
  /**
   * Extract code examples
   */
  private extractExamples(content: string): string[] {
    const examples: string[] = [];
    
    // Find code blocks
    const codeBlockMatches = content.matchAll(/```[\w]*\n([\s\S]*?)\n```/g);
    
    for (const match of codeBlockMatches) {
      examples.push(match[1]);
    }
    
    return examples;
  }
  
  /**
   * Extract execution patterns
   */
  private extractPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Look for numbered lists (common pattern format)
    const numberedLists = content.matchAll(/^\d+\.\s+(.+?)(?:\n|$)/gm);
    
    for (const match of numberedLists) {
      patterns.push(match[1].trim());
    }
    
    return patterns;
  }
  
  /**
   * Extract responsibilities
   */
  private extractResponsibilities(content: string): string[] {
    const responsibilities: string[] = [];
    
    // Look for bullet points in Responsibilities section
    const respSection = content.match(/##\s*(?:Core\s+)?Responsibilities[\s\S]*?(?=^##\s|\z)/m);
    
    if (respSection) {
      const bullets = respSection[0].matchAll(/^[\s]*[-*]\s+(.+?)(?:\n|$)/gm);
      
      for (const match of bullets) {
        responsibilities.push(match[1].trim());
      }
    }
    
    return responsibilities;
  }
  
  /**
   * Convert parsed agent to TypeScript template
   */
  convertToTypeScript(parsed: ParsedAgent): AgentTemplate {
    const className = this.toClassName(parsed.metadata.name);
    const imports = this.generateImports(parsed.metadata.tools);
    const properties = this.generateProperties(parsed);
    const methods = this.generateMethods(parsed);
    
    const fullCode = this.generateFullCode(
      className,
      imports,
      properties,
      methods,
      parsed
    );
    
    return {
      className,
      imports,
      properties,
      methods,
      fullCode
    };
  }
  
  /**
   * Convert name to class name
   */
  private toClassName(name: string): string {
    return name
      .split(/[-_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') + 'Agent';
  }
  
  /**
   * Generate imports based on tools
   */
  private generateImports(tools: string[]): string[] {
    const imports = [
      "import { BaseAgent, AgentContext, AgentResult } from '../base-agent.js';"
    ];
    
    // Add tool-specific imports
    if (tools.includes('Read') || tools.includes('Write')) {
      imports.push("import { promises as fs } from 'fs';");
    }
    
    if (tools.includes('Task')) {
      imports.push("import { ParallelTaskInfo } from '../../types.js';");
    }
    
    return imports;
  }
  
  /**
   * Generate class properties
   */
  private generateProperties(parsed: ParsedAgent): string[] {
    const properties: string[] = [];
    
    // Add metadata properties
    if (parsed.metadata.model) {
      properties.push(`private model = '${parsed.metadata.model}';`);
    }
    
    if (parsed.metadata.tools.length > 0) {
      properties.push(`private requiredTools = ${JSON.stringify(parsed.metadata.tools)};`);
    }
    
    if (parsed.responsibilities.length > 0) {
      properties.push(`private responsibilities = ${JSON.stringify(parsed.responsibilities, null, 2)};`);
    }
    
    return properties;
  }
  
  /**
   * Generate class methods
   */
  private generateMethods(parsed: ParsedAgent): string[] {
    const methods: string[] = [];
    
    // Generate execute method
    methods.push(this.generateExecuteMethod(parsed));
    
    // Generate helper methods for each section
    parsed.sections.forEach((content, title) => {
      const methodName = this.toMethodName(title);
      methods.push(this.generateHelperMethod(methodName, content));
    });
    
    return methods;
  }
  
  /**
   * Generate execute method
   */
  private generateExecuteMethod(parsed: ParsedAgent): string {
    return `
  /**
   * Execute the agent
   * ${parsed.metadata.description}
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      this.log('Starting ${parsed.metadata.name} agent execution', 'info');
      
      // Validate context
      this.validateContext(context);
      
      // Main execution logic
      const result = await this.performAnalysis(context);
      
      // Compress if needed
      const compressed = this.compress(result);
      
      return {
        success: true,
        data: compressed,
        compressed: true,
        originalSize: JSON.stringify(result).length,
        compressedSize: JSON.stringify(compressed).length
      };
      
    } catch (error) {
      this.log(\`Execution failed: \${error}\`, 'error');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }`;
  }
  
  /**
   * Generate helper method
   */
  private generateHelperMethod(name: string, content: string): string {
    const docComment = content.substring(0, 100);
    
    return `
  /**
   * ${docComment}...
   */
  private async ${name}(context: any): Promise<any> {
    // TODO: Implement based on instructions:
    // ${content.substring(0, 200).replace(/\n/g, '\n    // ')}
    
    throw new Error('Method ${name} not implemented');
  }`;
  }
  
  /**
   * Convert title to method name
   */
  private toMethodName(title: string): string {
    const words = title.split(/\s+/);
    return words[0].toLowerCase() + 
           words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }
  
  /**
   * Generate full TypeScript code
   */
  private generateFullCode(
    className: string,
    imports: string[],
    properties: string[],
    methods: string[],
    parsed: ParsedAgent
  ): string {
    return `/**
 * ${parsed.metadata.name} Agent
 * ${parsed.metadata.description}
 * 
 * Auto-generated from Markdown definition
 */

${imports.join('\n')}

/**
 * ${className}
 * ${parsed.instructions.substring(0, 200)}...
 */
export class ${className} extends BaseAgent {
  ${properties.join('\n  ')}
  
  constructor() {
    super('${parsed.metadata.name}', '${parsed.metadata.version || '1.0.0'}');
    
    this.capabilities = [
      {
        name: 'execute',
        description: '${parsed.metadata.description}',
        inputSchema: {
          context: 'AgentContext'
        },
        outputSchema: {
          result: 'AgentResult'
        }
      }
    ];
  }
  
  ${methods.join('\n  ')}
  
  /**
   * Perform the main analysis
   */
  private async performAnalysis(context: AgentContext): Promise<any> {
    // Implementation based on agent instructions
    const results = {};
    
    ${parsed.patterns.slice(0, 3).map((p, i) => `
    // Step ${i + 1}: ${p}
    // TODO: Implement step`).join('\n    ')}
    
    return results;
  }
}`;
  }
  
  /**
   * Validate TypeScript code
   */
  validateTypeScript(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation checks
    if (!code.includes('extends BaseAgent')) {
      errors.push('Class must extend BaseAgent');
    }
    
    if (!code.includes('execute(context: AgentContext)')) {
      errors.push('Must implement execute method');
    }
    
    if (!code.includes('constructor()')) {
      errors.push('Must have constructor');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}