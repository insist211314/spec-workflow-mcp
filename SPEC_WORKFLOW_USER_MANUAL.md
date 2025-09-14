# Spec Workflow MCP Pro - 用户手册

## 概述

Spec Workflow MCP Pro 是一个基于Model Context Protocol (MCP)的智能规格驱动开发系统，支持并行任务执行、Git工作树管理和实时仪表板监控。系统通过25个专业MCP工具提供完整的开发工作流支持。

## 快速开始

### 启动服务器
```bash
# 基础启动
node dist/index.js

# 自动启动仪表板
node dist/index.js --AutoStartDashboard

# 指定端口启动
node dist/index.js --AutoStartDashboard --port 3000

# 指定语言启动
node dist/index.js --lang zh --port 3000
```

### 配置文件支持
```toml
# .spec-workflow/config.toml
[server]
port = 3000
autoStartDashboard = true
lang = "zh"

[dashboard]
title = "我的项目仪表板"
theme = "dark"
```

## MCP工具详解

### 🎯 Phase 1: 基础规格工作流工具 (14个)

#### 1. `spec-workflow-guide`
**功能**: 提供规格工作流指导和最佳实践
**参数**: 无
**应用场景**:
- 新团队成员学习工作流程
- 查看规格文档编写标准
- 了解审批流程指南

```typescript
// 使用示例
{
  "tool": "spec-workflow-guide"
}
```

#### 2. `steering-guide`
**功能**: 提供技术方向文档指导
**参数**: 无
**应用场景**:
- 制定项目技术架构决策
- 编写技术愿景文档
- 建立技术标准和规范

#### 3. `create-spec-doc`
**功能**: 创建新的规格文档
**参数**:
- `name` (string): 规格文档名称
- `type` (string): 文档类型 (requirements|design|tasks)
- `content` (string, 可选): 初始内容

**应用场景**:
- 创建需求规格文档
- 建立设计规格文档
- 生成任务分解文档

```typescript
{
  "tool": "create-spec-doc",
  "name": "user-authentication",
  "type": "requirements",
  "content": "# 用户认证系统需求\n\n## 功能需求\n1. 用户注册\n2. 用户登录"
}
```

#### 4. `spec-status`
**功能**: 查看规格文档状态和进度
**参数**:
- `specName` (string, 可选): 特定规格名称

**应用场景**:
- 检查文档审批状态
- 查看任务完成进度
- 监控项目整体状态

#### 5. `spec-list`
**功能**: 列出所有规格文档
**参数**: 无
**应用场景**:
- 查看项目所有规格文档
- 了解文档组织结构
- 快速导航到特定文档

#### 6. `create-steering-doc`
**功能**: 创建技术方向文档
**参数**:
- `name` (string): 文档名称
- `content` (string): 文档内容

**应用场景**:
- 建立技术架构指导
- 记录重要技术决策
- 制定开发标准和约定

#### 7. `get-steering-context`
**功能**: 获取技术方向上下文信息
**参数**: 无
**应用场景**:
- AI助手获取项目技术背景
- 保持技术决策一致性
- 为新功能开发提供指导

#### 8. `get-spec-context`
**功能**: 获取规格文档上下文
**参数**:
- `specName` (string, 可选): 特定规格名称

**应用场景**:
- AI助手理解项目需求
- 获取设计和任务上下文
- 确保开发符合规格要求

#### 9. `get-template-context`
**功能**: 获取文档模板上下文
**参数**: 无
**应用场景**:
- 标准化文档格式
- 提供文档编写模板
- 确保文档质量一致性

#### 10. `manage-tasks`
**功能**: 管理任务列表和状态
**参数**:
- `action` (string): 操作类型 (list|update|complete)
- `specName` (string, 可选): 规格名称
- `taskId` (string, 可选): 任务ID
- `status` (string, 可选): 新状态

**应用场景**:
- 更新任务完成状态
- 跟踪开发进度
- 管理任务依赖关系

```typescript
{
  "tool": "manage-tasks",
  "action": "complete",
  "specName": "user-auth",
  "taskId": "auth-001"
}
```

#### 11. `request-approval`
**功能**: 提交文档审批请求
**参数**:
- `specName` (string): 规格名称
- `approverEmail` (string): 审批人邮箱
- `message` (string, 可选): 审批说明

**应用场景**:
- 提交规格文档审批
- 请求设计方案审核
- 启动正式开发流程

#### 12. `get-approval-status`
**功能**: 查看审批状态
**参数**:
- `specName` (string, 可选): 规格名称

**应用场景**:
- 检查审批进度
- 了解审批反馈
- 确认是否可以开始开发

#### 13. `delete-approval`
**功能**: 删除审批请求
**参数**:
- `approvalId` (string): 审批ID

**应用场景**:
- 撤回错误的审批请求
- 清理过期的审批记录
- 重新提交修改后的文档

#### 14. `refresh-tasks`
**功能**: 刷新任务列表
**参数**:
- `specName` (string, 可选): 规格名称

**应用场景**:
- 同步最新任务状态
- 重新解析任务依赖
- 更新进度统计

### 🚀 Phase 2-3: 并行执行工具 (5个)

#### 15. `init_project`
**功能**: 初始化项目并行执行环境
**参数**:
- `projectPath` (string): 项目路径
- `config` (object, 可选): 配置选项

**应用场景**:
- 首次配置并行开发环境
- 设置CCPM分析参数
- 初始化状态管理系统

```typescript
{
  "tool": "init_project",
  "projectPath": "/path/to/project",
  "config": {
    "maxParallelTasks": 4,
    "enableCCPM": true,
    "resourceOptimization": true
  }
}
```

#### 16. `get-parallel-status`
**功能**: 获取并行执行状态
**参数**: 无
**应用场景**:
- 监控并行任务进度
- 查看资源使用情况
- 检测执行瓶颈

#### 17. `analyze-parallel`
**功能**: 分析任务并行执行可行性
**参数**:
- `specName` (string): 规格名称
- `mode` (string): 分析模式 (dependencies|resources|timeline)
- `options` (object, 可选): 分析选项

**应用场景**:
- 识别任务依赖关系
- 优化并行执行策略
- 预测项目完成时间

```typescript
{
  "tool": "analyze-parallel",
  "specName": "user-auth",
  "mode": "dependencies",
  "options": {
    "includeCCPM": true,
    "optimizeResources": true
  }
}
```

#### 18. `execute-parallel`
**功能**: 执行并行任务
**参数**:
- `specName` (string): 规格名称
- `taskIds` (array, 可选): 特定任务ID列表
- `config` (object, 可选): 执行配置

**应用场景**:
- 启动并行开发任务
- 执行独立功能模块
- 加速项目交付

#### 19. `run-agent`
**功能**: 运行智能分析代理
**参数**:
- `agentType` (string): 代理类型 (ccmp-analyzer|dependency-detector)
- `input` (object): 输入数据
- `config` (object, 可选): 代理配置

**应用场景**:
- 执行CCPM关键链分析
- 自动检测任务依赖
- 优化资源分配策略

### 🌳 Phase 4: Git工作树管理工具 (4个)

#### 20. `create-worktree`
**功能**: 创建隔离的Git工作树
**参数**:
- `taskId` (string): 任务ID
- `baseBranch` (string, 可选): 基础分支 (默认: main)
- `branchPrefix` (string, 可选): 分支前缀

**应用场景**:
- 为并行任务创建独立开发环境
- 隔离不同功能的代码修改
- 避免并行开发中的代码冲突

```typescript
{
  "tool": "create-worktree",
  "taskId": "auth-login",
  "baseBranch": "develop",
  "branchPrefix": "feature"
}
```

#### 21. `manage-worktree`
**功能**: 管理工作树生命周期
**参数**:
- `action` (string): 操作类型 (list|status|allocate|deallocate)
- `worktreeId` (string, 可选): 工作树ID
- `taskId` (string, 可选): 任务ID

**应用场景**:
- 查看所有工作树状态
- 分配工作树给特定任务
- 释放已完成任务的工作树

#### 22. `consolidate-worktrees`
**功能**: 合并多个工作树的更改
**参数**:
- `targetBranch` (string): 目标分支
- `worktreeIds` (array, 可选): 工作树ID列表
- `strategy` (string, 可选): 合并策略
- `dryRun` (boolean, 可选): 预演模式

**应用场景**:
- 将并行开发的功能合并到主分支
- 解决多个工作树间的代码冲突
- 验证合并策略的可行性

```typescript
{
  "tool": "consolidate-worktrees",
  "targetBranch": "main",
  "strategy": "merge-commit",
  "dryRun": true
}
```

#### 23. `destroy-worktree`
**功能**: 安全销毁工作树
**参数**:
- `worktreeId` (string): 工作树ID
- `force` (boolean, 可选): 强制删除
- `preserveBranch` (boolean, 可选): 保留分支

**应用场景**:
- 清理已完成任务的工作树
- 释放磁盘空间
- 维护干净的开发环境

### 📊 高级监控与管理工具 (2个)

#### 24. `execution-monitor`
**功能**: 实时监控并行执行
**参数**:
- `action` (string): 监控操作 (start|stop|status|history)
- `taskId` (string, 可选): 特定任务ID
- `timeframe` (string, 可选): 时间范围 (1h|6h|24h|7d|all)

**应用场景**:
- 实时跟踪任务执行进度
- 监控系统资源使用情况
- 分析历史执行数据

```typescript
{
  "tool": "execution-monitor",
  "action": "history",
  "timeframe": "24h"
}
```

#### 25. `manage-agents`
**功能**: 管理智能代理
**参数**:
- `action` (string): 操作类型 (list|status|configure|restart)
- `agentId` (string, 可选): 代理ID
- `config` (object, 可选): 代理配置

**应用场景**:
- 配置CCPM分析代理
- 管理依赖检测代理
- 监控代理健康状态

## 工作流示例

### 典型开发流程

```bash
# 1. 获取工作流指导
{"tool": "spec-workflow-guide"}

# 2. 创建需求规格
{"tool": "create-spec-doc", "name": "payment-system", "type": "requirements"}

# 3. 提交审批
{"tool": "request-approval", "specName": "payment-system", "approverEmail": "lead@company.com"}

# 4. 分析并行可行性
{"tool": "analyze-parallel", "specName": "payment-system", "mode": "dependencies"}

# 5. 初始化并行环境
{"tool": "init_project", "projectPath": "/project"}

# 6. 创建工作树
{"tool": "create-worktree", "taskId": "payment-gateway"}
{"tool": "create-worktree", "taskId": "payment-ui"}

# 7. 执行并行任务
{"tool": "execute-parallel", "specName": "payment-system"}

# 8. 监控执行
{"tool": "execution-monitor", "action": "status"}

# 9. 合并结果
{"tool": "consolidate-worktrees", "targetBranch": "main"}

# 10. 清理环境
{"tool": "destroy-worktree", "worktreeId": "worktree-001"}
```

## 最佳实践

### 1. 文档管理
- 使用清晰的命名约定
- 定期更新任务状态
- 及时处理审批流程

### 2. 并行执行
- 先进行依赖分析
- 合理分配并行任务
- 监控资源使用情况

### 3. 工作树管理
- 为每个独立任务创建工作树
- 定期合并和清理
- 使用描述性的分支名称

### 4. 监控和管理
- 启用实时监控
- 定期检查代理状态
- 分析历史执行数据

## 故障排除

### 常见问题

1. **MCP连接失败**
   - 检查服务器是否正常启动
   - 验证端口配置
   - 确认权限设置

2. **并行执行失败**
   - 检查任务依赖关系
   - 验证资源可用性
   - 查看执行日志

3. **工作树冲突**
   - 使用干净的基础分支
   - 及时合并更改
   - 解决代码冲突

### 日志查看
```bash
# 查看服务器日志
tail -f .spec-workflow/logs/server.log

# 查看仪表板日志
tail -f .spec-workflow/logs/dashboard.log
```

## 支持的配置

### 语言支持
- 英语 (en)
- 中文 (zh)
- 日语 (ja)
- 西班牙语 (es)
- 葡萄牙语 (pt)
- 德语 (de)
- 法语 (fr)
- 俄语 (ru)
- 意大利语 (it)
- 韩语 (ko)
- 阿拉伯语 (ar)

### 环境要求
- Node.js 18+
- Git 2.20+
- TypeScript 4.5+

## 版本信息
- 当前版本: 0.0.33
- MCP工具数量: 25个
- 支持语言: 11种
- 文档更新: 2025-09-13