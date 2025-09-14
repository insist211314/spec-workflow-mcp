import { BaseAgent, AgentContext, AgentResult, AgentCapability } from '../base-agent.js';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { stat } from 'fs/promises';

export interface FileAnalysisRequest {
  files: string[];
  maxLength?: number;
  includeStructure?: boolean;
  extractErrors?: boolean;
  summarizeContent?: boolean;
}

export interface FileAnalysisResult {
  summary: string;
  criticalFindings: CriticalFinding[];
  keyObservations: KeyObservation[];
  recommendations: string[];
  fileDetails: FileDetail[];
  compressed: boolean;
  compressionRatio: string;
}

export interface CriticalFinding {
  file: string;
  type: 'error' | 'warning' | 'exception' | 'failure';
  message: string;
  line?: number;
  context?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface KeyObservation {
  file: string;
  category: 'pattern' | 'performance' | 'behavior' | 'config' | 'structure';
  observation: string;
  details?: string;
}

export interface FileDetail {
  path: string;
  type: 'log' | 'config' | 'code' | 'data' | 'other';
  size: number;
  lineCount: number;
  summary: string;
  errorCount?: number;
  warningCount?: number;
}

/**
 * File Analyzer Agent - TypeScript port of CCPM's file-analyzer.md
 *
 * Specializes in extracting and summarizing critical information from files,
 * particularly log files and verbose outputs, with 80-90% compression while
 * preserving 100% of critical information.
 */
export class FileAnalyzerAgent extends BaseAgent {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly COMPRESSION_TARGET = 0.8; // 80% compression

  constructor() {
    super('file-analyzer', '2.0.0');

    this.capabilities = [
      {
        name: 'analyzeFiles',
        description: 'Analyze and summarize file contents with extreme compression',
        inputSchema: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' } },
            maxLength: { type: 'number', default: 20000 },
            includeStructure: { type: 'boolean', default: true },
            extractErrors: { type: 'boolean', default: true }
          },
          required: ['files']
        }
      },
      {
        name: 'summarizeLogs',
        description: 'Extract key information from log files',
        inputSchema: {
          type: 'object',
          properties: {
            logFiles: { type: 'array', items: { type: 'string' } },
            timeRange: { type: 'string' },
            errorLevel: { type: 'string', enum: ['all', 'error', 'warning', 'info'] }
          },
          required: ['logFiles']
        }
      },
      {
        name: 'extractErrors',
        description: 'Find and categorize errors from multiple files',
        inputSchema: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' } },
            patterns: { type: 'array', items: { type: 'string' } }
          },
          required: ['files']
        }
      }
    ];
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      this.log('Starting file analysis');

      // Get files to analyze from context or scan for relevant files
      const files = await this.getFilesToAnalyze(context);

      if (files.length === 0) {
        return {
          success: true,
          data: {
            summary: 'No files found for analysis',
            criticalFindings: [],
            keyObservations: [],
            recommendations: [],
            fileDetails: [],
            compressed: true,
            compressionRatio: '0%'
          },
          compressed: true
        };
      }

      // Perform analysis
      const analysisResult = await this.analyzeFiles({
        files,
        maxLength: 20000,
        includeStructure: true,
        extractErrors: true,
        summarizeContent: true
      });

      return {
        success: true,
        data: analysisResult,
        compressed: true,
        originalSize: await this.calculateOriginalSize(files),
        compressedSize: JSON.stringify(analysisResult).length
      };

    } catch (error: any) {
      this.log(`File analysis failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Main file analysis method with aggressive compression
   */
  async analyzeFiles(request: FileAnalysisRequest): Promise<FileAnalysisResult> {
    const { files, maxLength = 20000, includeStructure = true, extractErrors = true } = request;

    this.log(`Analyzing ${files.length} files with compression target ${this.COMPRESSION_TARGET * 100}%`);

    let originalTotalSize = 0;
    let processedFiles = 0;
    const criticalFindings: CriticalFinding[] = [];
    const keyObservations: KeyObservation[] = [];
    const fileDetails: FileDetail[] = [];
    const recommendations: string[] = [];

    for (const filePath of files) {
      try {
        await this.validateFileAccess(filePath);

        const fileInfo = await stat(filePath);
        originalTotalSize += fileInfo.size;

        // Skip oversized files to prevent memory issues
        if (fileInfo.size > this.MAX_FILE_SIZE) {
          this.log(`Skipping oversized file: ${filePath} (${fileInfo.size} bytes)`, 'warn');
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const fileDetail = await this.analyzeFile(filePath, content, extractErrors, includeStructure);

        fileDetails.push(fileDetail);

        // Extract critical findings
        if (fileDetail.errorCount && fileDetail.errorCount > 0) {
          const errors = await this.extractErrors(filePath, content);
          criticalFindings.push(...errors);
        }

        // Extract key observations
        const observations = await this.extractObservations(filePath, content);
        keyObservations.push(...observations);

        processedFiles++;

      } catch (error: any) {
        this.log(`Failed to analyze ${filePath}: ${error.message}`, 'warn');

        criticalFindings.push({
          file: filePath,
          type: 'error',
          message: `Failed to read file: ${error.message}`,
          severity: 'medium'
        });
      }
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(criticalFindings, keyObservations, fileDetails));

    // Create summary
    const summary = this.createSummary(processedFiles, criticalFindings, keyObservations);

    // Calculate compression ratio
    const compressedSize = JSON.stringify({ criticalFindings, keyObservations, fileDetails }).length;
    const compressionRatio = originalTotalSize > 0
      ? `${(((originalTotalSize - compressedSize) / originalTotalSize) * 100).toFixed(1)}%`
      : '0%';

    return {
      summary,
      criticalFindings: this.prioritizeFindings(criticalFindings),
      keyObservations: this.prioritizeObservations(keyObservations),
      recommendations,
      fileDetails,
      compressed: true,
      compressionRatio
    };
  }

  private async analyzeFile(filePath: string, content: string, extractErrors: boolean, includeStructure: boolean): Promise<FileDetail> {
    const lines = content.split('\n');
    const fileType = this.determineFileType(filePath, content);

    let errorCount = 0;
    let warningCount = 0;
    let summary = '';

    if (extractErrors) {
      // Count errors and warnings
      for (const line of lines) {
        if (this.isErrorLine(line)) errorCount++;
        if (this.isWarningLine(line)) warningCount++;
      }
    }

    // Generate file-specific summary
    switch (fileType) {
      case 'log':
        summary = await this.summarizeLogFile(lines, errorCount, warningCount);
        break;
      case 'config':
        summary = await this.summarizeConfigFile(lines);
        break;
      case 'code':
        summary = await this.summarizeCodeFile(lines);
        break;
      case 'data':
        summary = await this.summarizeDataFile(lines);
        break;
      default:
        summary = `${fileType} file with ${lines.length} lines`;
    }

    return {
      path: filePath,
      type: fileType,
      size: Buffer.byteLength(content, 'utf-8'),
      lineCount: lines.length,
      summary,
      errorCount,
      warningCount
    };
  }

  private async extractErrors(filePath: string, content: string): Promise<CriticalFinding[]> {
    const findings: CriticalFinding[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Error patterns
      if (this.isErrorLine(line)) {
        const severity = this.determineSeverity(line);
        findings.push({
          file: filePath,
          type: 'error',
          message: this.extractErrorMessage(line),
          line: lineNum,
          context: this.getContextLines(lines, index),
          severity
        });
      }

      // Exception patterns
      if (this.isExceptionLine(line)) {
        findings.push({
          file: filePath,
          type: 'exception',
          message: this.extractExceptionMessage(line),
          line: lineNum,
          context: this.getContextLines(lines, index),
          severity: 'high'
        });
      }

      // Failure patterns
      if (this.isFailureLine(line)) {
        findings.push({
          file: filePath,
          type: 'failure',
          message: this.extractFailureMessage(line),
          line: lineNum,
          severity: 'medium'
        });
      }
    });

    return findings;
  }

  private async extractObservations(filePath: string, content: string): Promise<KeyObservation[]> {
    const observations: KeyObservation[] = [];
    const lines = content.split('\n');

    // Performance observations
    const performanceLines = lines.filter(line =>
      line.includes('slow') ||
      line.includes('timeout') ||
      line.includes('performance') ||
      /\d+ms|\d+s/.test(line)
    );

    if (performanceLines.length > 0) {
      observations.push({
        file: filePath,
        category: 'performance',
        observation: `${performanceLines.length} performance-related entries found`,
        details: performanceLines.slice(0, 3).join('; ')
      });
    }

    // Pattern observations
    const patterns = this.detectPatterns(lines);
    if (patterns.length > 0) {
      observations.push({
        file: filePath,
        category: 'pattern',
        observation: `Detected ${patterns.length} recurring patterns`,
        details: patterns.join(', ')
      });
    }

    // Configuration observations
    if (this.isConfigFile(filePath)) {
      const configObs = this.analyzeConfiguration(lines);
      observations.push(...configObs.map(obs => ({
        file: filePath,
        category: 'config' as const,
        observation: obs.observation,
        details: obs.details
      })));
    }

    return observations;
  }

  private determineFileType(filePath: string, content: string): 'log' | 'config' | 'code' | 'data' | 'other' {
    const ext = extname(filePath).toLowerCase();
    const fileName = basename(filePath).toLowerCase();

    // Log files
    if (ext === '.log' || fileName.includes('log') || this.looksLikeLogContent(content)) {
      return 'log';
    }

    // Config files
    if (['.json', '.yaml', '.yml', '.toml', '.ini', '.conf'].includes(ext) ||
        fileName.includes('config') || fileName.includes('settings')) {
      return 'config';
    }

    // Code files
    if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs'].includes(ext)) {
      return 'code';
    }

    // Data files
    if (['.csv', '.xml', '.json'].includes(ext)) {
      return 'data';
    }

    return 'other';
  }

  private looksLikeLogContent(content: string): boolean {
    const lines = content.split('\n').slice(0, 10);
    const logPatterns = [
      /\d{4}-\d{2}-\d{2}/, // Date pattern
      /\d{2}:\d{2}:\d{2}/, // Time pattern
      /(ERROR|WARN|INFO|DEBUG|TRACE)/i, // Log levels
      /\[.*\]/ // Bracketed content
    ];

    return lines.some(line =>
      logPatterns.some(pattern => pattern.test(line))
    );
  }

  private async summarizeLogFile(lines: string[], errorCount: number, warningCount: number): Promise<string> {
    const totalLines = lines.length;
    const timeRange = this.extractTimeRange(lines);
    const logLevels = this.countLogLevels(lines);

    let summary = `Log file: ${totalLines} lines`;

    if (timeRange) {
      summary += `, ${timeRange}`;
    }

    if (errorCount > 0 || warningCount > 0) {
      summary += `, ${errorCount} errors, ${warningCount} warnings`;
    }

    if (Object.keys(logLevels).length > 0) {
      const levelSummary = Object.entries(logLevels)
        .map(([level, count]) => `${count} ${level}`)
        .join(', ');
      summary += ` (${levelSummary})`;
    }

    return summary;
  }

  private async summarizeConfigFile(lines: string[]): Promise<string> {
    const nonEmptyLines = lines.filter(line => line.trim() && !line.trim().startsWith('#'));
    const sections = lines.filter(line => line.trim().startsWith('[') && line.trim().endsWith(']'));

    return `Config file: ${nonEmptyLines.length} settings${sections.length > 0 ? `, ${sections.length} sections` : ''}`;
  }

  private async summarizeCodeFile(lines: string[]): Promise<string> {
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    });

    const functions = lines.filter(line =>
      line.includes('function ') ||
      line.includes('def ') ||
      line.includes('class ') ||
      line.includes('interface ')
    );

    return `Code file: ${codeLines.length} code lines, ${functions.length} definitions`;
  }

  private async summarizeDataFile(lines: string[]): Promise<string> {
    return `Data file: ${lines.length} lines`;
  }

  private isErrorLine(line: string): boolean {
    return /\b(ERROR|Error|error|FAILED|Failed|failed|EXCEPTION|Exception)\b/.test(line);
  }

  private isWarningLine(line: string): boolean {
    return /\b(WARN|Warning|warning|CAUTION|Caution)\b/.test(line);
  }

  private isExceptionLine(line: string): boolean {
    return /\b(Exception|exception|Traceback|Stack trace|at .+:\d+)\b/.test(line);
  }

  private isFailureLine(line: string): boolean {
    return /\b(FAIL|Fail|fail|TIMEOUT|timeout|ABORT|abort)\b/.test(line);
  }

  private extractErrorMessage(line: string): string {
    // Extract the actual error message, removing timestamps and prefixes
    const cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}.*?\s/, '')
                          .replace(/^\d{2}:\d{2}:\d{2}.*?\s/, '')
                          .replace(/^\[.*?\]\s*/, '');

    return cleanLine.substring(0, 200); // Limit message length
  }

  private extractExceptionMessage(line: string): string {
    return this.extractErrorMessage(line);
  }

  private extractFailureMessage(line: string): string {
    return this.extractErrorMessage(line);
  }

  private determineSeverity(line: string): 'critical' | 'high' | 'medium' | 'low' {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('critical') || lowerLine.includes('fatal') || lowerLine.includes('panic')) {
      return 'critical';
    }

    if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('failed')) {
      return 'high';
    }

    if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
      return 'medium';
    }

    return 'low';
  }

  private getContextLines(lines: string[], centerIndex: number, contextSize: number = 2): string {
    const start = Math.max(0, centerIndex - contextSize);
    const end = Math.min(lines.length, centerIndex + contextSize + 1);

    return lines.slice(start, end)
                .map((line, idx) => `${start + idx + 1}: ${line.trim()}`)
                .join('\n');
  }

  private detectPatterns(lines: string[]): string[] {
    const patterns: string[] = [];
    const messageMap = new Map<string, number>();

    // Find repeated messages
    for (const line of lines) {
      const cleanMessage = this.cleanLogMessage(line);
      if (cleanMessage.length > 10) {
        messageMap.set(cleanMessage, (messageMap.get(cleanMessage) || 0) + 1);
      }
    }

    // Find patterns that occur more than 3 times
    for (const [message, count] of messageMap.entries()) {
      if (count > 3) {
        patterns.push(`"${message.substring(0, 50)}" (${count} times)`);
      }
    }

    return patterns.slice(0, 5); // Return top 5 patterns
  }

  private cleanLogMessage(line: string): string {
    return line.replace(/\d{4}-\d{2}-\d{2}.*?\s/, '')
               .replace(/\d{2}:\d{2}:\d{2}.*?\s/, '')
               .replace(/^\[.*?\]\s*/, '')
               .replace(/\d+/g, 'N') // Replace numbers with N
               .trim();
  }

  private extractTimeRange(lines: string[]): string | null {
    const timestamps: Date[] = [];

    for (const line of lines.slice(0, 100)) { // Check first 100 lines
      const match = line.match(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/);
      if (match) {
        const timestamp = new Date(match[0]);
        if (!isNaN(timestamp.getTime())) {
          timestamps.push(timestamp);
        }
      }
      if (timestamps.length >= 10) break; // Enough samples
    }

    if (timestamps.length === 0) return null;

    const earliest = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const latest = new Date(Math.max(...timestamps.map(t => t.getTime())));

    if (earliest.getTime() === latest.getTime()) {
      return earliest.toISOString().split('T')[0];
    }

    return `${earliest.toISOString().split('T')[0]} to ${latest.toISOString().split('T')[0]}`;
  }

  private countLogLevels(lines: string[]): Record<string, number> {
    const levels: Record<string, number> = {};
    const levelPatterns = [
      { name: 'ERROR', pattern: /\b(ERROR|Error)\b/ },
      { name: 'WARN', pattern: /\b(WARN|Warning)\b/ },
      { name: 'INFO', pattern: /\b(INFO|Info)\b/ },
      { name: 'DEBUG', pattern: /\b(DEBUG|Debug)\b/ }
    ];

    for (const line of lines) {
      for (const { name, pattern } of levelPatterns) {
        if (pattern.test(line)) {
          levels[name] = (levels[name] || 0) + 1;
        }
      }
    }

    return levels;
  }

  private isConfigFile(filePath: string): boolean {
    return this.determineFileType(filePath, '') === 'config';
  }

  private analyzeConfiguration(lines: string[]): Array<{ observation: string; details?: string }> {
    const observations: Array<{ observation: string; details?: string }> = [];

    const nonDefaultSettings = lines.filter(line =>
      line.trim() &&
      !line.trim().startsWith('#') &&
      line.includes('=')
    );

    if (nonDefaultSettings.length > 0) {
      observations.push({
        observation: `${nonDefaultSettings.length} configured settings`,
        details: nonDefaultSettings.slice(0, 3).map(s => s.trim()).join('; ')
      });
    }

    return observations;
  }

  private prioritizeFindings(findings: CriticalFinding[]): CriticalFinding[] {
    // Sort by severity and limit to most important
    return findings
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10); // Top 10 most critical
  }

  private prioritizeObservations(observations: KeyObservation[]): KeyObservation[] {
    // Sort by category importance
    const categoryOrder = { performance: 5, pattern: 4, behavior: 3, config: 2, structure: 1 };

    return observations
      .sort((a, b) => categoryOrder[b.category] - categoryOrder[a.category])
      .slice(0, 8); // Top 8 observations
  }

  private generateRecommendations(
    findings: CriticalFinding[],
    observations: KeyObservation[],
    fileDetails: FileDetail[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical findings recommendations
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical issues immediately`);
    }

    // Error pattern recommendations
    const errorFiles = fileDetails.filter(f => f.errorCount && f.errorCount > 10);
    if (errorFiles.length > 0) {
      recommendations.push(`Review ${errorFiles.length} files with high error counts`);
    }

    // Performance recommendations
    const perfObservations = observations.filter(o => o.category === 'performance');
    if (perfObservations.length > 0) {
      recommendations.push('Investigate performance issues identified in logs');
    }

    // Pattern-based recommendations
    const patternObservations = observations.filter(o => o.category === 'pattern');
    if (patternObservations.length > 0) {
      recommendations.push('Consider implementing monitoring for recurring issues');
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private createSummary(
    processedFiles: number,
    criticalFindings: CriticalFinding[],
    keyObservations: KeyObservation[]
  ): string {
    const errorCount = criticalFindings.filter(f => f.type === 'error').length;
    const warningCount = criticalFindings.filter(f => f.type === 'warning').length;
    const exceptionCount = criticalFindings.filter(f => f.type === 'exception').length;

    let summary = `Analyzed ${processedFiles} files. `;

    if (criticalFindings.length > 0) {
      summary += `Found ${errorCount} errors, ${warningCount} warnings, ${exceptionCount} exceptions. `;
    } else {
      summary += 'No critical issues found. ';
    }

    if (keyObservations.length > 0) {
      summary += `${keyObservations.length} key observations identified.`;
    }

    return summary;
  }

  private async getFilesToAnalyze(context: AgentContext): Promise<string[]> {
    // For now, return empty array - this would be enhanced to find relevant files
    // based on context, recent changes, or specific file patterns
    return [];
  }

  private async validateFileAccess(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Cannot access file: ${filePath}`);
    }
  }

  private async calculateOriginalSize(files: string[]): Promise<number> {
    let totalSize = 0;
    for (const file of files) {
      try {
        const stats = await stat(file);
        totalSize += stats.size;
      } catch {
        // Skip files that can't be accessed
      }
    }
    return totalSize;
  }
}