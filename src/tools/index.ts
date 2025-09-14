import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { specWorkflowGuideTool, specWorkflowGuideHandler } from './spec-workflow-guide.js';
import { createSpecDocTool, createSpecDocHandler } from './create-spec-doc.js';
import { specStatusTool, specStatusHandler } from './spec-status.js';
import { specListTool, specListHandler } from './spec-list.js';
import { createSteeringDocTool, createSteeringDocHandler } from './create-steering-doc.js';
import { getSteeringContextTool, getSteeringContextHandler } from './get-steering-context.js';
import { getSpecContextTool, getSpecContextHandler } from './get-spec-context.js';
import { getTemplateContextTool, getTemplateContextHandler } from './get-template-context.js';
import { manageTasksTool, manageTasksHandler } from './manage-tasks.js';
import { steeringGuideTool, steeringGuideHandler } from './steering-guide.js';
import { requestApprovalTool, requestApprovalHandler } from './request-approval.js';
import { getApprovalStatusTool, getApprovalStatusHandler } from './get-approval-status.js';
import { deleteApprovalTool, deleteApprovalHandler } from './delete-approval.js';
import { refreshTasksTool, refreshTasksHandler } from './refresh-tasks.js';
// Parallel execution tools
import { initProjectTool, initProjectHandler } from './init-project.js';
import { getParallelStatusTool, getParallelStatusHandler } from './get-parallel-status.js';
import { analyzeParallelTool, analyzeParallelHandler } from './analyze-parallel.js';
import { executeParallelTool, executeParallelHandler } from './execute-parallel.js';
import { runAgentTool, runAgentHandler } from './run-agent.js';
// Git Worktree management tools (Phase 4)
import { createWorktreeTool, createWorktreeHandler } from './create-worktree.js';
import { manageWorktreeTool, manageWorktreeHandler } from './manage-worktree.js';
import { consolidateWorktreesTool, consolidateWorktreesHandler } from './consolidate-worktrees.js';
import { destroyWorktreeTool, destroyWorktreeHandler } from './destroy-worktree.js';
// Advanced monitoring and agent management tools
import { executionMonitorTool, executionMonitorHandler } from './execution-monitor.js';
import { manageAgentsTool, manageAgentsHandler } from './manage-agents.js';
import { ToolContext, ToolResponse, MCPToolResponse, toMCPResponse } from '../types.js';

export function registerTools(): Tool[] {
  return [
    // Original Spec Workflow tools
    specWorkflowGuideTool,
    steeringGuideTool,
    createSpecDocTool,
    specStatusTool,
    specListTool,
    createSteeringDocTool,
    getSteeringContextTool,
    getSpecContextTool,
    getTemplateContextTool,
    manageTasksTool,
    requestApprovalTool,
    getApprovalStatusTool,
    deleteApprovalTool,
    refreshTasksTool,
    // Parallel execution tools
    initProjectTool,
    getParallelStatusTool,
    analyzeParallelTool,
    executeParallelTool,
    runAgentTool,
    // Git Worktree management tools (Phase 4)
    createWorktreeTool,
    manageWorktreeTool,
    consolidateWorktreesTool,
    destroyWorktreeTool,
    // Advanced monitoring and agent management tools
    executionMonitorTool,
    manageAgentsTool
  ];
}

export async function handleToolCall(name: string, args: any, context: ToolContext): Promise<MCPToolResponse> {
  let response: ToolResponse;
  let isError = false;

  try {
    switch (name) {
      case 'spec-workflow-guide':
        response = await specWorkflowGuideHandler(args, context);
        break;
      case 'steering-guide':
        response = await steeringGuideHandler(args, context);
        break;
      case 'create-spec-doc':
        response = await createSpecDocHandler(args, context);
        break;
      case 'spec-status':
        response = await specStatusHandler(args, context);
        break;
      case 'spec-list':
        response = await specListHandler(args, context);
        break;
      case 'create-steering-doc':
        response = await createSteeringDocHandler(args, context);
        break;
      case 'get-steering-context':
        response = await getSteeringContextHandler(args, context);
        break;
      case 'get-spec-context':
        response = await getSpecContextHandler(args, context);
        break;
      case 'get-template-context':
        response = await getTemplateContextHandler(args, context);
        break;
      case 'manage-tasks':
        response = await manageTasksHandler(args, context);
        break;
      case 'request-approval':
        response = await requestApprovalHandler(args, context);
        break;
      case 'get-approval-status':
        response = await getApprovalStatusHandler(args, context);
        break;
      case 'delete-approval':
        response = await deleteApprovalHandler(args, context);
        break;
      case 'refresh-tasks':
        response = await refreshTasksHandler(args, context);
        break;
      // Parallel execution tool handlers
      case 'init_project':
        response = await initProjectHandler(args, context);
        break;
      case 'get-parallel-status':
        response = await getParallelStatusHandler(args, context);
        break;
      case 'analyze-parallel':
        response = await analyzeParallelHandler(args, context);
        break;
      case 'execute-parallel':
        response = await executeParallelHandler(args, context);
        break;
      case 'run-agent':
        response = await runAgentHandler(args, context);
        break;
      // Git Worktree management tool handlers (Phase 4)
      case 'create-worktree':
        response = await createWorktreeHandler(args, context);
        break;
      case 'manage-worktree':
        response = await manageWorktreeHandler(args, context);
        break;
      case 'consolidate-worktrees':
        response = await consolidateWorktreesHandler(args, context);
        break;
      case 'destroy-worktree':
        response = await destroyWorktreeHandler(args, context);
        break;
      // Advanced monitoring and agent management tool handlers
      case 'execution-monitor':
        response = await executionMonitorHandler(args, context);
        break;
      case 'manage-agents':
        response = await manageAgentsHandler(args, context);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Check if the response indicates an error
    isError = !response.success;

  } catch (error: any) {
    response = {
      success: false,
      message: `Tool execution failed: ${error.message}`
    };
    isError = true;
  }

  return toMCPResponse(response, isError);
}