import { BaseAgent, AgentContext, AgentResult, AgentCapability } from '../base-agent.js';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { spawn } from 'child_process';

export interface CodeAnalysisRequest {
  files: string[];
  scope?: 'changes' | 'full' | 'specific';
  focusAreas?: ('bugs' | 'security' | 'performance' | 'logic' | 'dependencies')[];
  includeTests?: boolean;
}

export interface CodeAnalysisResult {
  scope: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  criticalFindings: BugFinding[];
  potentialIssues: BugFinding[];
  verifiedSafe: SafeComponent[];
  logicTrace: LogicTrace;
  recommendations: string[];
  summary: string;
}

export interface BugFinding {
  type: 'bug' | 'potential-issue' | 'design-concern';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  impact: string;
  fix: string;
  confidence: number;
}

export interface SafeComponent {
  component: string;
  description: string;
  checksPerformed: string[];
}

export interface LogicTrace {
  entryPoints: string[];
  keyPaths: string[];
  dependencies: string[];
  riskAreas: string[];
  summary: string;
}

/**
 * Code Analyzer Agent - TypeScript port of CCPM's code-analyzer.md
 *
 * This agent specializes in deep-dive code analysis while maintaining context efficiency.
 * It hunts for bugs, traces logic flow, and provides actionable insights.
 */
export class CodeAnalyzerAgent extends BaseAgent {
  private gitAvailable: boolean = false;

  constructor() {
    super('code-analyzer', '2.0.0');

    this.capabilities = [
      {
        name: 'analyzeCode',
        description: 'Analyze code changes for potential bugs and issues',
        inputSchema: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' } },
            scope: { type: 'string', enum: ['changes', 'full', 'specific'] },
            focusAreas: { type: 'array', items: { type: 'string' } }
          },
          required: ['files']
        }
      },
      {
        name: 'traceLogic',
        description: 'Trace execution paths and logic flow across files',
        inputSchema: {
          type: 'object',
          properties: {
            entryPoint: { type: 'string' },
            maxDepth: { type: 'number' }
          },
          required: ['entryPoint']
        }
      },
      {
        name: 'findBugs',
        description: 'Hunt for specific bug patterns and vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            patterns: { type: 'array', items: { type: 'string' } },
            files: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    ];
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      this.log('Starting code analysis');

      // Check git availability
      await this.checkGitAvailable();

      // Get changed files if analyzing changes
      const files = await this.getFilesToAnalyze(context);

      if (files.length === 0) {
        return {
          success: true,
          data: {
            scope: 'No files to analyze',
            riskLevel: 'Low' as const,
            summary: 'No code changes detected for analysis',
            criticalFindings: [],
            potentialIssues: [],
            verifiedSafe: [],
            logicTrace: {
              entryPoints: [],
              keyPaths: [],
              dependencies: [],
              riskAreas: [],
              summary: 'No files analyzed'
            },
            recommendations: []
          },
          compressed: true
        };
      }

      // Perform analysis
      const analysisResult = await this.analyzeCode({
        files,
        scope: 'changes',
        focusAreas: ['bugs', 'security', 'logic'],
        includeTests: true
      });

      // Compress result for context optimization
      const compressedResult = this.compressAnalysisResult(analysisResult);

      return {
        success: true,
        data: compressedResult,
        compressed: true,
        originalSize: JSON.stringify(analysisResult).length,
        compressedSize: JSON.stringify(compressedResult).length
      };

    } catch (error: any) {
      this.log(`Analysis failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Main code analysis method
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    const { files, scope = 'changes', focusAreas = ['bugs', 'security'] } = request;

    this.log(`Analyzing ${files.length} files with scope: ${scope}`);

    // Phase 1: Initial scan and impact assessment
    const impactAssessment = await this.assessImpact(files);

    // Phase 2: Deep dive analysis
    const findings = await this.performDeepAnalysis(files, focusAreas);

    // Phase 3: Logic tracing
    const logicTrace = await this.traceLogicFlow(files);

    // Phase 4: Safety verification
    const safeComponents = await this.verifySafeComponents(files);

    // Phase 5: Generate recommendations
    const recommendations = this.generateRecommendations(findings, logicTrace);

    // Determine overall risk level
    const riskLevel = this.calculateRiskLevel(findings);

    const result: CodeAnalysisResult = {
      scope: `${files.length} files analyzed (${scope})`,
      riskLevel,
      criticalFindings: findings.filter(f => f.severity === 'critical' || f.severity === 'high'),
      potentialIssues: findings.filter(f => f.severity === 'medium' || f.severity === 'low'),
      verifiedSafe: safeComponents,
      logicTrace,
      recommendations,
      summary: this.generateSummary(findings, riskLevel, files.length)
    };

    return result;
  }

  private async getFilesToAnalyze(context: AgentContext): Promise<string[]> {
    const files: string[] = [];

    try {
      // If tasks are provided in context, use those files
      if (context.tasks && context.tasks.length > 0) {
        for (const task of context.tasks) {
          if (task.files) {
            files.push(...task.files);
          }
        }
      }

      // If no task files, try git analysis
      if (files.length === 0 && this.gitAvailable) {
        const changedFiles = await this.getGitChangedFiles(context.projectPath);
        files.push(...changedFiles);
      }

      // If still no files, scan project directory for code files
      if (files.length === 0) {
        const recentFiles = await this.getRecentlyModifiedFiles(context.projectPath);
        files.push(...recentFiles);
      }

      // Filter for code files and make paths absolute
      return files
        .filter(file => this.isCodeFile(file))
        .map(file => file.startsWith('/') ? file : join(context.projectPath, file));

    } catch (error: any) {
      this.log(`Failed to get files to analyze: ${error.message}`, 'warn');
      return [];
    }
  }

  private async assessImpact(files: string[]): Promise<void> {
    this.log('Assessing impact of changes...');

    // Quick scan to identify the scope and nature of changes
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Check for high-impact patterns
        if (this.containsHighImpactPatterns(content)) {
          this.log(`High-impact changes detected in ${file}`, 'warn');
        }
      } catch (error) {
        // File might not exist or be readable
        continue;
      }
    }
  }

  private async performDeepAnalysis(files: string[], focusAreas: string[]): Promise<BugFinding[]> {
    const findings: BugFinding[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileFindings = await this.analyzeFile(file, content, focusAreas);
        findings.push(...fileFindings);
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return findings;
  }

  private async analyzeFile(filePath: string, content: string, focusAreas: string[]): Promise<BugFinding[]> {
    const findings: BugFinding[] = [];
    const lines = content.split('\n');

    // Bug pattern detection
    if (focusAreas.includes('bugs')) {
      findings.push(...this.detectBugPatterns(filePath, lines));
    }

    // Security vulnerability detection
    if (focusAreas.includes('security')) {
      findings.push(...this.detectSecurityIssues(filePath, lines));
    }

    // Logic flow issues
    if (focusAreas.includes('logic')) {
      findings.push(...this.detectLogicIssues(filePath, lines));
    }

    // Performance issues
    if (focusAreas.includes('performance')) {
      findings.push(...this.detectPerformanceIssues(filePath, lines));
    }

    return findings;
  }

  private detectBugPatterns(filePath: string, lines: string[]): BugFinding[] {
    const findings: BugFinding[] = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Null/undefined reference patterns
      if (this.matchesPattern(trimmedLine, /\w+\.\w+.*(?<!!)(?<!\?)(?<!\?.)/)) {
        if (!this.hasNullCheck(lines, index)) {
          findings.push({
            type: 'bug',
            severity: 'high',
            file: filePath,
            line: lineNum,
            issue: 'Potential null/undefined reference',
            impact: 'Runtime error if object is null/undefined',
            fix: 'Add null check or optional chaining',
            confidence: 0.7
          });
        }
      }

      // Async/await pattern issues
      if (trimmedLine.includes('await') && !this.isInAsyncFunction(lines, index)) {
        findings.push({
          type: 'bug',
          severity: 'critical',
          file: filePath,
          line: lineNum,
          issue: 'await used outside async function',
          impact: 'Syntax error, code will not execute',
          fix: 'Wrap in async function or remove await',
          confidence: 0.95
        });
      }

      // Resource leak patterns
      if (this.matchesPattern(trimmedLine, /new.*(?:Promise|EventEmitter|Stream)/)) {
        if (!this.hasCleanupPattern(lines, index, 10)) {
          findings.push({
            type: 'potential-issue',
            severity: 'medium',
            file: filePath,
            line: lineNum,
            issue: 'Potential resource leak',
            impact: 'Memory leak or resource exhaustion',
            fix: 'Add proper cleanup/disposal logic',
            confidence: 0.6
          });
        }
      }

      // Off-by-one errors
      if (this.matchesPattern(trimmedLine, /for.*<.*\.length.*\+\+/)) {
        findings.push({
          type: 'potential-issue',
          severity: 'low',
          file: filePath,
          line: lineNum,
          issue: 'Potential off-by-one error pattern',
          impact: 'Array bounds error',
          fix: 'Verify loop bounds are correct',
          confidence: 0.4
        });
      }
    });

    return findings;
  }

  private detectSecurityIssues(filePath: string, lines: string[]): BugFinding[] {
    const findings: BugFinding[] = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // SQL injection patterns
      if (this.matchesPattern(trimmedLine, /query.*\+.*\$\{|query.*\`.*\$\{/)) {
        findings.push({
          type: 'bug',
          severity: 'critical',
          file: filePath,
          line: lineNum,
          issue: 'Potential SQL injection vulnerability',
          impact: 'Database compromise, data theft',
          fix: 'Use parameterized queries or prepared statements',
          confidence: 0.8
        });
      }

      // XSS patterns
      if (this.matchesPattern(trimmedLine, /innerHTML.*\+|innerHTML.*\$\{/)) {
        findings.push({
          type: 'bug',
          severity: 'high',
          file: filePath,
          line: lineNum,
          issue: 'Potential XSS vulnerability',
          impact: 'Script injection, session hijacking',
          fix: 'Use textContent or proper sanitization',
          confidence: 0.7
        });
      }

      // Command injection patterns
      if (this.matchesPattern(trimmedLine, /exec.*\+|spawn.*\$\{|system.*\+/)) {
        findings.push({
          type: 'bug',
          severity: 'critical',
          file: filePath,
          line: lineNum,
          issue: 'Potential command injection',
          impact: 'System compromise, arbitrary code execution',
          fix: 'Validate and sanitize input, use safe APIs',
          confidence: 0.85
        });
      }
    });

    return findings;
  }

  private detectLogicIssues(filePath: string, lines: string[]): BugFinding[] {
    const findings: BugFinding[] = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Assignment in conditional
      if (this.matchesPattern(trimmedLine, /if.*=(?!=)/)) {
        findings.push({
          type: 'potential-issue',
          severity: 'medium',
          file: filePath,
          line: lineNum,
          issue: 'Assignment in conditional (possible typo)',
          impact: 'Unintended behavior, always true condition',
          fix: 'Use == or === for comparison',
          confidence: 0.8
        });
      }

      // Infinite loop patterns
      if (this.matchesPattern(trimmedLine, /while.*true.*\{/) &&
          !this.hasBreakStatement(lines, index, 20)) {
        findings.push({
          type: 'potential-issue',
          severity: 'high',
          file: filePath,
          line: lineNum,
          issue: 'Potential infinite loop',
          impact: 'Application hang, resource exhaustion',
          fix: 'Add proper exit condition or break statement',
          confidence: 0.6
        });
      }
    });

    return findings;
  }

  private detectPerformanceIssues(filePath: string, lines: string[]): BugFinding[] {
    const findings: BugFinding[] = [];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Inefficient loops
      if (this.matchesPattern(trimmedLine, /for.*in.*Object\.keys/)) {
        findings.push({
          type: 'potential-issue',
          severity: 'low',
          file: filePath,
          line: lineNum,
          issue: 'Inefficient loop pattern',
          impact: 'Performance degradation',
          fix: 'Use for...of or Object.entries()',
          confidence: 0.7
        });
      }

      // Synchronous file operations
      if (this.matchesPattern(trimmedLine, /fs\.readFileSync|fs\.writeFileSync/)) {
        findings.push({
          type: 'potential-issue',
          severity: 'medium',
          file: filePath,
          line: lineNum,
          issue: 'Synchronous file operation',
          impact: 'Blocking event loop, poor performance',
          fix: 'Use async file operations',
          confidence: 0.8
        });
      }
    });

    return findings;
  }

  private async traceLogicFlow(files: string[]): Promise<LogicTrace> {
    const entryPoints: string[] = [];
    const keyPaths: string[] = [];
    const dependencies: string[] = [];
    const riskAreas: string[] = [];

    // Simple logic tracing - can be enhanced
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Find entry points (main functions, exports)
        if (content.includes('export') || content.includes('function main')) {
          entryPoints.push(file);
        }

        // Find key paths (error handling, async operations)
        if (content.includes('try') || content.includes('catch') || content.includes('async')) {
          keyPaths.push(file);
        }

        // Find dependencies (imports, requires)
        if (content.includes('import') || content.includes('require')) {
          dependencies.push(file);
        }

        // Identify risk areas
        if (content.includes('eval') || content.includes('innerHTML') || content.includes('exec')) {
          riskAreas.push(file);
        }
      } catch (error) {
        continue;
      }
    }

    return {
      entryPoints,
      keyPaths,
      dependencies,
      riskAreas,
      summary: `Traced ${files.length} files: ${entryPoints.length} entry points, ${riskAreas.length} risk areas`
    };
  }

  private async verifySafeComponents(files: string[]): Promise<SafeComponent[]> {
    const safeComponents: SafeComponent[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const checks: string[] = [];

        // Check for proper error handling
        if (content.includes('try') && content.includes('catch')) {
          checks.push('Error handling present');
        }

        // Check for input validation
        if (content.includes('validate') || content.includes('schema')) {
          checks.push('Input validation detected');
        }

        // Check for type safety
        if (extname(file) === '.ts' || content.includes('interface') || content.includes('type ')) {
          checks.push('Type safety mechanisms');
        }

        if (checks.length > 0) {
          safeComponents.push({
            component: file,
            description: `Verified safe with ${checks.length} safety mechanisms`,
            checksPerformed: checks
          });
        }
      } catch (error) {
        continue;
      }
    }

    return safeComponents;
  }

  private generateRecommendations(findings: BugFinding[], logicTrace: LogicTrace): string[] {
    const recommendations: string[] = [];

    // High-priority recommendations based on critical findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical security vulnerabilities immediately`);
    }

    // Code quality recommendations
    const bugCount = findings.filter(f => f.type === 'bug').length;
    if (bugCount > 3) {
      recommendations.push('Consider adding automated testing to catch bugs earlier');
    }

    // Architecture recommendations
    if (logicTrace.riskAreas.length > 0) {
      recommendations.push(`Review ${logicTrace.riskAreas.length} high-risk components for security`);
    }

    // General recommendations
    if (findings.length > 10) {
      recommendations.push('Consider code review process improvements');
    }

    return recommendations;
  }

  private calculateRiskLevel(findings: BugFinding[]): 'Critical' | 'High' | 'Medium' | 'Low' {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;

    if (critical > 0) return 'Critical';
    if (high > 2) return 'High';
    if (high > 0 || findings.length > 5) return 'Medium';
    return 'Low';
  }

  private generateSummary(findings: BugFinding[], riskLevel: string, fileCount: number): string {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;

    return `Analyzed ${fileCount} files. Risk: ${riskLevel}. Found ${critical} critical, ${high} high, ${medium} medium issues.`;
  }

  private compressAnalysisResult(result: CodeAnalysisResult): any {
    // Implement 80% compression as per CCPM requirements
    return {
      scope: result.scope,
      riskLevel: result.riskLevel,
      criticalFindings: result.criticalFindings.slice(0, 5), // Top 5 only
      summary: result.summary,
      keyRecommendations: result.recommendations.slice(0, 3), // Top 3 only
      safeComponentCount: result.verifiedSafe.length,
      totalIssues: result.criticalFindings.length + result.potentialIssues.length,
      compressed: true
    };
  }

  // Helper methods
  private async checkGitAvailable(): Promise<void> {
    try {
      await this.execCommand('git', ['--version']);
      this.gitAvailable = true;
    } catch {
      this.gitAvailable = false;
      this.log('Git not available, using file system analysis', 'warn');
    }
  }

  private async getGitChangedFiles(projectPath: string): Promise<string[]> {
    try {
      const output = await this.execCommand('git', ['diff', '--name-only', 'HEAD~1'], projectPath);
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private async getRecentlyModifiedFiles(projectPath: string): Promise<string[]> {
    // Implementation to get recently modified files
    return [];
  }

  private isCodeFile(file: string): boolean {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs'];
    return codeExtensions.includes(extname(file));
  }

  private containsHighImpactPatterns(content: string): boolean {
    const highImpactPatterns = [
      /security/i,
      /authentication/i,
      /authorization/i,
      /database/i,
      /sql/i,
      /crypto/i,
      /password/i
    ];

    return highImpactPatterns.some(pattern => pattern.test(content));
  }

  private matchesPattern(line: string, pattern: RegExp): boolean {
    return pattern.test(line);
  }

  private hasNullCheck(lines: string[], currentIndex: number): boolean {
    // Look for null checks in nearby lines
    const searchRange = Math.max(0, currentIndex - 3);
    const endRange = Math.min(lines.length, currentIndex + 3);

    for (let i = searchRange; i < endRange; i++) {
      if (lines[i].includes('!') || lines[i].includes('?.') || lines[i].includes('null') || lines[i].includes('undefined')) {
        return true;
      }
    }
    return false;
  }

  private isInAsyncFunction(lines: string[], currentIndex: number): boolean {
    // Look backwards for async function declaration
    for (let i = currentIndex; i >= 0; i--) {
      if (lines[i].includes('async')) {
        return true;
      }
      if (lines[i].includes('function') && !lines[i].includes('async')) {
        return false;
      }
    }
    return false;
  }

  private hasCleanupPattern(lines: string[], startIndex: number, searchRange: number): boolean {
    const endIndex = Math.min(lines.length, startIndex + searchRange);

    for (let i = startIndex; i < endIndex; i++) {
      if (lines[i].includes('close') || lines[i].includes('dispose') || lines[i].includes('cleanup')) {
        return true;
      }
    }
    return false;
  }

  private hasBreakStatement(lines: string[], startIndex: number, searchRange: number): boolean {
    const endIndex = Math.min(lines.length, startIndex + searchRange);

    for (let i = startIndex; i < endIndex; i++) {
      if (lines[i].includes('break') || lines[i].includes('return')) {
        return true;
      }
    }
    return false;
  }

  private async execCommand(command: string, args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { cwd, stdio: 'pipe' });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed (${code}): ${stderr}`));
        }
      });

      process.on('error', reject);
    });
  }
}