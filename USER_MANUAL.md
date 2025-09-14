# Spec Workflow MCP 用户手册

完整的四阶段开发工作流程系统使用指南

## 目录

1. [系统概述](#系统概述)
2. [安装和配置](#安装和配置)
3. [Phase 1: 基础工作流程](#phase-1-基础工作流程)
4. [Phase 2: 增强功能](#phase-2-增强功能)
5. [Phase 3: 企业级特性](#phase-3-企业级特性)
6. [Phase 4: 并行执行](#phase-4-并行执行)
7. [配置选项](#配置选项)
8. [使用场景示例](#使用场景示例)
9. [故障排除](#故障排除)

---

## 系统概述

Spec Workflow MCP 是一个基于 Model Context Protocol (MCP) 的规范驱动开发工作流系统，提供四个渐进式的功能阶段：

- **Phase 1**: 基础工作流程 - 核心规范管理
- **Phase 2**: 增强功能 - 批准工作流和自动化
- **Phase 3**: 企业级特性 - 多语言、归档、监控
- **Phase 4**: 并行执行 - Git worktree 并行处理

## 安装和配置

### 安装

```bash
npm install -g @pimzino/spec-workflow-mcp
```

### 基本配置

配置文件是**可选的**，系统有内置默认值。如需自定义，可在项目根目录的 `.spec-workflow/config.toml` 文件中配置：

> 📝 **说明**：这个文件在 `init_project` 初始化项目后，在 `.spec-workflow/` 目录下创建。

```toml
[general]
language = "zh"
port = 3000
autoOpenDashboard = true
enableNotifications = true

[parallel]
maxConcurrentTasks = 3
worktreeBasePath = ".spec-workflow/worktrees"

[dashboard]
theme = "light"
updateInterval = 1000
```

### 在 Claude Desktop 中配置

在 `claude_desktop_config.json` 中添加：

**选项 1：最简配置（推荐）**
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "spec-workflow-mcp"
    }
  }
}
```

**选项 2：指定项目路径**
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "spec-workflow-mcp",
      "args": ["/path/to/your/project"]
    }
  }
}
```

**选项 3：自动启动仪表板**
```json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "spec-workflow-mcp",
      "args": ["--AutoStartDashboard", "--port", "3000"]
    }
  }
}
```

> ⚠️ **注意**：不要使用 `--lang` 参数，语言设置通过 MCP 工具 `set_language` 来配置。

---

## Phase 1: 基础工作流程

### 核心 MCP 工具

#### 1. `init_project` - 项目初始化

**功能**: 初始化新的 Spec Workflow 项目

**参数**:
- `projectName` (string): 项目名称
- `description` (string, 可选): 项目描述
- `language` (string, 可选): 界面语言，默认 "en"

**使用示例**:
```
初始化一个名为 "用户认证系统" 的项目
```

#### 2. `create_steering_doc` - 创建指导文档

**功能**: 创建项目指导文档，定义技术方向和架构决策

**参数**:
- `docName` (string): 文档名称
- `content` (string): 文档内容

**使用示例**:
```
创建技术架构指导文档，内容包括：
- 使用 React + TypeScript 前端
- Node.js Express 后端
- PostgreSQL 数据库
- JWT 认证
```

#### 3. `create_spec` - 创建规范文档

**功能**: 创建新的规范文档

**参数**:
- `specName` (string): 规范名称
- `content` (string): 规范内容

**使用示例**:
```
创建 "用户注册" 规范文档，包含：
- 需求分析
- 接口设计
- 数据模型
- 验证规则
```

#### 4. `read_spec` - 读取规范文档

**功能**: 读取现有规范文档内容

**参数**:
- `specName` (string): 规范名称

**使用示例**:
```
读取 "用户注册" 规范文档
```

#### 5. `update_spec` - 更新规范文档

**功能**: 更新现有规范文档

**参数**:
- `specName` (string): 规范名称
- `content` (string): 新内容

**使用示例**:
```
更新 "用户注册" 规范文档，添加密码强度验证要求
```

#### 6. `list_specs` - 列出所有规范

**功能**: 列出项目中的所有规范文档

**参数**: 无

**使用示例**:
```
显示项目中所有的规范文档列表
```

#### 7. `get_project_context` - 获取项目上下文

**功能**: 获取完整的项目上下文信息

**参数**: 无

**使用示例**:
```
获取当前项目的完整上下文，包括所有规范和进度
```

#### 8. `open_dashboard` - 打开仪表板

**功能**: 启动并打开实时 Web 仪表板

**参数**:
- `port` (number, 可选): 端口号，默认 3000

**使用示例**:
```
在端口 3000 上启动仪表板
```

---

## Phase 2: 增强功能

### 批准工作流工具

#### 9. `request_approval` - 请求批准

**功能**: 为规范文档创建批准请求

**参数**:
- `specName` (string): 规范名称
- `approverEmail` (string): 批准者邮箱
- `message` (string, 可选): 批准请求消息

**使用示例**:
```
为 "用户注册" 规范请求批准，批准者：tech-lead@company.com
```

#### 10. `approve_spec` - 批准规范

**功能**: 批准待审核的规范文档

**参数**:
- `approvalId` (string): 批准请求 ID
- `decision` (string): "approved" 或 "rejected"
- `comments` (string, 可选): 批准意见

**使用示例**:
```
批准 ID 为 "abc123" 的规范，状态设为 "approved"
```

#### 11. `list_pending_approvals` - 列出待批准项

**功能**: 列出所有待批准的规范

**参数**: 无

**使用示例**:
```
显示所有待批准的规范列表
```

### 任务管理工具

#### 12. `extract_tasks` - 提取任务

**功能**: 从规范文档中提取开发任务

**参数**:
- `specName` (string): 规范名称

**使用示例**:
```
从 "用户注册" 规范中提取开发任务列表
```

#### 13. `update_task_status` - 更新任务状态

**功能**: 更新任务完成状态

**参数**:
- `specName` (string): 规范名称
- `taskId` (string): 任务 ID
- `status` (string): "pending", "in-progress", "completed"

**使用示例**:
```
将规范 "用户注册" 中的任务 "1.2" 状态更新为 "completed"
```

#### 14. `get_task_progress` - 获取任务进度

**功能**: 获取规范的任务完成进度

**参数**:
- `specName` (string): 规范名称

**使用示例**:
```
获取 "用户注册" 规范的任务完成进度统计
```

---

## Phase 3: 企业级特性

### 归档和监控工具

#### 15. `archive_completed_spec` - 归档已完成规范

**功能**: 将已完成的规范移动到归档区

**参数**:
- `specName` (string): 规范名称
- `archiveNotes` (string, 可选): 归档备注

**使用示例**:
```
归档已完成的 "用户注册" 规范，备注：v1.0 正式发布
```

#### 16. `list_archived_specs` - 列出归档规范

**功能**: 列出所有已归档的规范

**参数**: 无

**使用示例**:
```
显示所有已归档的规范列表
```

#### 17. `get_workflow_metrics` - 获取工作流指标

**功能**: 获取详细的工作流性能指标

**参数**: 无

**使用示例**:
```
获取项目的工作流效率统计，包括完成时间和阶段分布
```

#### 18. `generate_progress_report` - 生成进度报告

**功能**: 生成项目进度的详细报告

**参数**:
- `format` (string, 可选): "markdown" 或 "json"，默认 "markdown"

**使用示例**:
```
生成 Markdown 格式的项目进度报告
```

#### 19. `set_language` - 设置语言

**功能**: 设置仪表板界面语言

**参数**:
- `language` (string): 语言代码（en, zh, fr, de, es, it, ja, ko, pt, ru, ar）

**使用示例**:
```
将界面语言设置为中文
```

---

## Phase 4: 并行执行

### 并行分析命令

#### 20. `analyze-parallel` - 并行分析

**功能**: 分析任务的并行执行机会

**参数**:
- `specName` (string): 规范名称
- `mode` (string, 可选): "conservative", "balanced", "aggressive"

**使用示例**:
```
分析 "用户认证" 规范的并行执行机会，使用保守模式
```

#### 21. `execute-parallel` - 并行执行

**功能**: 基于分析结果执行并行任务

**参数**:
- `specName` (string): 规范名称
- `taskIds` (array, 可选): 特定任务 ID 列表
- `maxParallel` (number, 可选): 最大并行数，默认 3

**使用示例**:
```
并行执行 "用户认证" 规范的任务，最多同时运行 2 个任务
```

#### 22. `run-agent` - 运行智能代理

**功能**: 执行特定的分析代理

**参数**:
- `agentName` (string): 代理名称（"code-analyzer" 或 "file-analyzer"）
- `context` (object, 可选): 代理上下文
- `timeout` (number, 可选): 超时时间（毫秒）

**使用示例**:
```
运行代码分析代理，分析当前项目的代码质量
```

### CCPM 风格命令

#### 23. `pm:issue-analyze` - 问题分析

**功能**: CCPM 风格的问题并行化分析

**参数**:
- `issueId` (string, 可选): 问题 ID
- `specName` (string, 可选): 规范名称

**使用示例**:
```
分析问题 #123 的并行执行潜力
```

#### 24. `pm:issue-start` - 开始并行工作

**功能**: 使用 worktree 开始并行工作

**参数**:
- `issueId` (string): 问题 ID
- `mode` (string, 可选): "worktree" 或 "branch"

**使用示例**:
```
为问题 #123 创建 worktree 开始并行开发
```

#### 25. `pm:context-optimize` - 上下文优化

**功能**: 使用代理压缩优化上下文

**参数**:
- `target` (string, 可选): 目标路径，默认 "."
- `compressionRatio` (number, 可选): 压缩比例 0.1-0.9

**使用示例**:
```
优化当前目录的上下文，压缩比例 80%
```

### Spec Workflow 增强命令

#### 26. `spec-analyze` - 规范分析

**功能**: 增强的规范分析，包含并行建议

**参数**:
- `specName` (string): 规范名称
- `includeParallel` (boolean, 可选): 是否包含并行分析

**使用示例**:
```
分析 "用户认证" 规范，包含并行执行建议
```

#### 27. `manage-tasks-parallel` - 并行任务管理

**功能**: 支持并行执行的任务管理

**参数**:
- `specName` (string): 规范名称
- `action` (string): "list", "analyze", "execute"
- `parallelMode` (boolean, 可选): 是否启用并行模式

**使用示例**:
```
以并行模式执行 "用户认证" 规范的任务
```

---

## 配置选项

### 命令行参数

```bash
spec-workflow-mcp [选项]

选项：
  --port <number>          仪表板端口 (默认: 3000)
  --host <string>          绑定主机 (默认: localhost)
  --lang <string>          界面语言 (默认: en)
  --config <path>          配置文件路径
  --no-dashboard           禁用仪表板
  --no-auto-open           禁用自动打开浏览器
  --log-level <level>      日志级别 (debug, info, warn, error)
  --parallel-mode          启用并行执行模式
  --max-parallel <number>  最大并行任务数 (默认: 3)
  --help                   显示帮助信息
  --version                显示版本信息
```

### TOML 配置文件

```toml
[general]
language = "zh"           # 界面语言
port = 3000              # 仪表板端口
host = "localhost"       # 绑定主机
autoOpenDashboard = true # 自动打开仪表板
enableNotifications = true # 启用通知
logLevel = "info"        # 日志级别

[dashboard]
theme = "light"          # 主题: light/dark
updateInterval = 1000    # 更新间隔(毫秒)
enableWebSocket = true   # 启用实时更新
maxRecentSpecs = 10      # 最近规范显示数量

[approval]
enableWorkflow = true    # 启用批准工作流
defaultApprover = ""     # 默认批准者
timeoutDays = 7          # 批准超时天数
requireComments = false  # 是否必须填写意见

[parallel]
enabled = true           # 启用并行执行
maxConcurrentTasks = 3   # 最大并发任务数
worktreeBasePath = ".spec-workflow/worktrees" # worktree 基础路径
autoCleanup = true       # 自动清理完成的 worktree
conflictResolution = "manual" # 冲突解决方式: manual/auto

[agents]
enableCodeAnalyzer = true    # 启用代码分析代理
enableFileAnalyzer = true    # 启用文件分析代理
compressionRatio = 0.8       # 默认压缩比例
analysisTimeout = 30000      # 分析超时时间(毫秒)

[archive]
autoArchive = false      # 自动归档完成的规范
archivePath = "archive"  # 归档路径
retentionDays = 365      # 保留天数

[monitoring]
enableMetrics = true     # 启用指标收集
metricsInterval = 60000  # 指标收集间隔(毫秒)
enableReporting = true   # 启用报告生成
```

---

## 使用场景示例

### 场景 1: 新项目开发流程

```
1. 初始化项目
   "初始化一个名为 '电商系统' 的项目"

2. 创建技术指导文档
   "创建技术架构指导文档，使用微服务架构"

3. 创建用户模块规范
   "创建 '用户管理' 规范文档，包含注册、登录、权限管理"

4. 打开仪表板查看进度
   "启动仪表板查看项目状态"

5. 提取开发任务
   "从 '用户管理' 规范中提取开发任务"

6. 分析并行执行机会
   "分析 '用户管理' 规范的并行执行机会"

7. 开始并行开发
   "并行执行 '用户管理' 规范的任务，最多同时运行 3 个"
```

### 场景 2: 企业级协作流程

```
1. 创建需要审批的规范
   "创建 '支付系统' 规范文档"

2. 请求技术负责人批准
   "为 '支付系统' 规范请求批准，批准者：tech-lead@company.com"

3. 查看待批准列表
   "显示所有待批准的规范"

4. 批准规范
   "批准 ID 为 'payment-spec-001' 的规范"

5. 设置中文界面
   "将界面语言设置为中文"

6. 生成项目报告
   "生成项目进度报告"

7. 归档完成的规范
   "归档已完成的 '支付系统' 规范"
```

### 场景 3: 代码质量分析

```
1. 运行代码分析代理
   "运行代码分析代理，检查当前项目的代码质量"

2. 运行文件分析代理
   "运行文件分析代理，分析项目日志文件"

3. 使用 CCPM 风格优化
   "优化当前目录的上下文，压缩比例 80%"

4. 分析特定问题
   "分析 GitHub 问题 #456 的并行执行潜力"

5. 创建并行工作环境
   "为问题 #456 创建 worktree 开始并行开发"
```

### 场景 4: 多规范并行开发

```
1. 创建多个相关规范
   "创建 '前端界面' 规范"
   "创建 '后端API' 规范"
   "创建 '数据库设计' 规范"

2. 分析整体并行机会
   "分析所有规范的并行执行机会"

3. 以并行模式管理任务
   "以并行模式列出所有规范的任务"

4. 执行并行开发
   "并行执行多个规范的任务，最大并行数 3"

5. 监控进度
   "获取工作流效率统计"

6. 生成综合报告
   "生成包含所有规范的进度报告"
```

### 场景 5: 现有项目集成

```
1. 在现有项目中初始化
   "在当前目录初始化 Spec Workflow"

2. 分析现有代码
   "运行代码分析代理，评估现有代码质量"

3. 创建重构规范
   "创建 '代码重构' 规范文档"

4. 分析重构任务的并行性
   "分析 '代码重构' 规范的并行执行机会，使用保守模式"

5. 优化项目上下文
   "优化当前项目的上下文，提高分析效率"

6. 开始增量重构
   "以并行模式执行重构任务"
```

---

## 故障排除

### 常见问题

#### 1. 仪表板无法启动

**症状**: 执行 `open_dashboard` 后无法访问仪表板

**解决方案**:
```bash
# 检查端口是否被占用
netstat -an | grep :3000

# 使用不同端口
"在端口 3001 上启动仪表板"

# 检查防火墙设置
```

#### 2. 并行执行失败

**症状**: 并行任务执行时出现错误

**解决方案**:
```bash
# 检查 Git 状态
git status

# 清理 worktree
git worktree prune

# 减少并行数量
"并行执行任务，最多同时运行 1 个"
```

#### 3. 代理分析超时

**症状**: 代码或文件分析代理执行超时

**解决方案**:
```
# 增加超时时间
"运行代码分析代理，超时时间 60000 毫秒"

# 限制分析范围
"运行代码分析代理，上下文限制为 src 目录"
```

#### 4. 配置文件错误

**症状**: 配置文件格式错误导致启动失败

**解决方案**:
```bash
# 验证 TOML 格式
npm run validate:config

# 使用默认配置
spec-workflow-mcp --use-default-config

# 重新生成配置文件
"初始化项目时重新生成配置"
```

#### 5. 权限问题

**症状**: 文件读写权限不足

**解决方案**:
```bash
# 检查目录权限
ls -la .spec-workflow/

# 修复权限
chmod -R 755 .spec-workflow/

# 使用不同的工作目录
spec-workflow-mcp --work-dir /tmp/spec-workflow
```

### 调试模式

启用详细日志进行问题诊断：

```bash
spec-workflow-mcp --log-level debug
```

或在配置文件中设置：

```toml
[general]
logLevel = "debug"
```

### 性能优化

#### 大型项目优化

```toml
[agents]
compressionRatio = 0.9    # 提高压缩比例
analysisTimeout = 60000   # 增加分析超时

[parallel]
maxConcurrentTasks = 2    # 减少并发数量

[dashboard]
updateInterval = 2000     # 降低更新频率
```

#### 网络优化

```toml
[dashboard]
enableWebSocket = false   # 禁用实时更新以减少网络负载
enableCaching = true      # 启用缓存
```

---

## 总结

Spec Workflow MCP 提供了从基础工作流程到高级并行执行的完整解决方案。通过合理配置和使用各阶段的功能，可以显著提升开发效率和代码质量。

**关键特性**:
- ✅ 27 个 MCP 工具覆盖完整开发生命周期
- ✅ 四个渐进式功能阶段
- ✅ 实时 Web 仪表板
- ✅ 多语言支持（11 种语言）
- ✅ Git worktree 并行隔离
- ✅ 智能代码分析代理
- ✅ 企业级批准工作流
- ✅ 丰富的配置选项

建议从 Phase 1 开始使用，逐步启用更高级的功能。如遇问题，请参考故障排除部分或查看详细日志进行诊断。