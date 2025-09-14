import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { DependencyAnalyzer } from '../parallel/analyzers/dependency-analyzer.js';
import { SmartSuggestionSystem } from '../parallel/intelligence/suggestion-system.js';
import { RiskAssessor } from '../parallel/intelligence/risk-assessor.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseTasksFromMarkdown } from '../core/task-parser.js';
import { parsedTasksToParallelTasks } from './task-adapter.js';

export const analyzeParallelTool: Tool = {
  name: 'analyze-parallel',
  description: `Analyze tasks for parallel execution opportunities.

Analyzes task dependencies, identifies safe parallel execution groups, and provides intelligent suggestions with risk assessment.`,
  inputSchema: {
    type: 'object',
    properties: {
      specName: {
        type: 'string',
        description: 'Name of the specification to analyze'
      },
      mode: {
        type: 'string',
        enum: ['conservative', 'balanced', 'aggressive'],
        description: 'Analysis mode - conservative (safe only), balanced (moderate risk), aggressive (maximum parallelism)',
        default: 'balanced'
      },
      includeRecommendations: {
        type: 'boolean',
        description: 'Include AI-powered recommendations',
        default: true
      }
    },
    required: ['specName']
  }
};

export async function analyzeParallelHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  try {
    const { specName, mode = 'balanced', includeRecommendations = true } = args;
    const projectPath = context.projectPath;

    // Read spec file (tasks.md contains the task definitions for parallel analysis)
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

    // Initialize analyzers
    const dependencyAnalyzer = new DependencyAnalyzer();
    const suggestionSystem = new SmartSuggestionSystem();
    const riskAssessor = new RiskAssessor();

    // Perform dependency analysis
    const dependencyAnalysis = await dependencyAnalyzer.analyzeDependencies(tasks);

    // Generate suggestions
    let suggestions: any = null;
    if (includeRecommendations) {
      suggestions = await suggestionSystem.analyzeTasks(tasks);
    }

    // Assess risks - Create risk context
    const riskContext = {
      tasks,
      dependencyAnalysis,
      patternMatches: []
    };
    const riskAssessment = riskAssessor.assessParallelRisk(riskContext);

    // Format results
    const parallelGroups = dependencyAnalysis.parallelGroups || [];
    const independentTasks: string[] = [];

    // Extract independent tasks from the first parallel group if it exists
    if (parallelGroups.length > 0 && parallelGroups[0].id === 'group-independent') {
      independentTasks.push(...parallelGroups[0].tasks);
    }

    const circularDependencies = dependencyAnalysis.circularDependencies || [];

    let result = `# Parallel Analysis Results for "${specName}"\n\n`;
    result += `**Analysis Mode:** ${mode}\n`;
    result += `**Total Tasks:** ${tasks.length}\n`;
    result += `**Independent Tasks:** ${independentTasks.length}\n`;
    result += `**Parallel Groups Found:** ${parallelGroups.length}\n\n`;

    // Independent tasks
    if (independentTasks.length > 0) {
      result += `## ✅ Independent Tasks (Safe for Parallel Execution)\n`;
      independentTasks.forEach((taskId, index) => {
        const task = tasks.find(t => t.id === taskId);
        result += `${index + 1}. **${taskId}**: ${task?.description || 'Unknown task'}\n`;
      });
      result += `\n`;
    }

    // Parallel groups
    if (parallelGroups.length > 0) {
      result += `## 🔄 Recommended Parallel Groups\n`;
      parallelGroups.forEach((group, index) => {
        result += `### Group ${index + 1}\n`;
        group.tasks.forEach((taskId: string, taskIndex: number) => {
          const task = tasks.find(t => t.id === taskId);
          result += `- **${taskId}**: ${task?.description || 'Unknown task'}\n`;
        });
        result += `\n`;
      });
    }

    // Risk assessment
    result += `## ⚠️ Risk Assessment\n`;
    result += `**Overall Risk Level:** ${riskAssessment.overallRisk}\n`;
    result += `**Risk Score:** ${riskAssessment.riskScore}/100\n\n`;

    if (riskAssessment.specificRisks && riskAssessment.specificRisks.length > 0) {
      result += `### Identified Risks:\n`;
      riskAssessment.specificRisks.forEach((risk, index) => {
        result += `${index + 1}. **${risk.type}**: ${risk.description}\n`;
      });
      result += `\n`;
    }

    // Circular dependencies warning
    if (circularDependencies.length > 0) {
      result += `## 🚨 Circular Dependencies Detected\n`;
      result += `The following circular dependencies prevent parallel execution:\n`;
      circularDependencies.forEach((cycle, index) => {
        result += `${index + 1}. ${cycle.join(' → ')}\n`;
      });
      result += `\nResolve these dependencies before attempting parallel execution.\n\n`;
    }

    // AI Suggestions
    if (includeRecommendations && suggestions) {
      result += `## 🤖 AI Recommendations\n`;
      result += `**Recommendation:** ${suggestions.recommendation}\n`;
      result += `**Confidence:** ${Math.round(suggestions.confidence * 100)}%\n`;
      if (suggestions.reasoning && suggestions.reasoning.length > 0) {
        result += `**Reasoning:**\n`;
        suggestions.reasoning.forEach((reason: string, index: number) => {
          result += `${index + 1}. ${reason}\n`;
        });
      }
      result += `\n`;
    }

    // Next steps
    result += `## 📋 Next Steps\n`;
    if (independentTasks.length > 0 || parallelGroups.length > 0) {
      result += `1. Use \`execute-parallel\` to run the identified parallel groups\n`;
      result += `2. Use \`manage-tasks-parallel\` to track execution progress\n`;
      result += `3. Monitor execution with the dashboard\n`;
    } else {
      result += `1. Review task dependencies and consider breaking down complex tasks\n`;
      result += `2. Use sequential execution for now\n`;
      result += `3. Re-analyze after task restructuring\n`;
    }

    return {
      success: true,
      message: result,
      data: {
        specName,
        mode,
        totalTasks: tasks.length,
        independentTasks,
        parallelGroups,
        riskAssessment,
        suggestions: includeRecommendations ? suggestions : undefined,
        circularDependencies
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Parallel analysis failed: ${error.message}`
    };
  }
}