# MCP 工具命令使用指南

完整的 Spec Workflow MCP 工具命令参考和使用示例

## 📖 使用说明

本指南适合希望直接了解和使用 MCP 工具命令的用户。你可以通过以下方式使用：

1. **在 Claude 中直接提及工具名称**：`"请使用 init_project 工具初始化项目"`
2. **了解工具参数进行精确控制**：`"调用 create_spec 工具，参数 specName 为 '用户认证'"`
3. **调试和问题排查**：直接指定工具名称进行测试

---

## Phase 1: 基础工作流程工具

### 1. `init_project` - 项目初始化

**功能**：初始化新的 Spec Workflow 项目

**参数**：
- `projectName` (string, 必需): 项目名称
- `description` (string, 可选): 项目描述
- `language` (string, 可选): 界面语言，默认 "en"

**命令使用**：
```
调用 init_project 工具，参数：
- projectName: "电商系统"
- description: "基于微服务架构的电商平台"
- language: "zh"
```

**等效自然语言**：
```
初始化一个名为 "电商系统" 的项目，描述为 "基于微服务架构的电商平台"
```

### 2. `create_steering_doc` - 创建指导文档

**功能**：创建项目技术指导文档

**参数**：
- `docName` (string, 必需): 文档名称
- `content` (string, 必需): 文档内容

**命令使用**：
```
调用 create_steering_doc 工具，参数：
- docName: "技术架构指导"
- content: "使用 React + TypeScript 前端，Node.js Express 后端，PostgreSQL 数据库"
```

### 3. `create_spec` - 创建规范文档

**功能**：创建新的规范文档

**参数**：
- `specName` (string, 必需): 规范名称
- `content` (string, 必需): 规范内容

**命令使用**：
```
调用 create_spec 工具，参数：
- specName: "用户注册"
- content: "## 需求描述\n用户注册功能包括邮箱验证、密码强度检查..."
```

### 4. `read_spec` - 读取规范文档

**功能**：读取现有规范文档内容

**参数**：
- `specName` (string, 必需): 规范名称

**命令使用**：
```
调用 read_spec 工具，参数：
- specName: "用户注册"
```

### 5. `update_spec` - 更新规范文档

**功能**：更新现有规范文档

**参数**：
- `specName` (string, 必需): 规范名称
- `content` (string, 必需): 新内容

**命令使用**：
```
调用 update_spec 工具，参数：
- specName: "用户注册"
- content: "更新后的规范内容..."
```

### 6. `list_specs` - 列出所有规范

**功能**：列出项目中的所有规范文档

**参数**：无

**命令使用**：
```
调用 list_specs 工具
```

### 7. `get_project_context` - 获取项目上下文

**功能**：获取完整的项目上下文信息

**参数**：无

**命令使用**：
```
调用 get_project_context 工具
```

### 8. `open_dashboard` - 打开仪表板

**功能**：启动并打开实时 Web 仪表板

**参数**：
- `port` (number, 可选): 端口号，默认 3000

**命令使用**：
```
调用 open_dashboard 工具，参数：
- port: 3000
```

---

## Phase 2: 增强功能工具

### 9. `request_approval` - 请求批准

**功能**：为规范文档创建批准请求

**参数**：
- `specName` (string, 必需): 规范名称
- `approverEmail` (string, 必需): 批准者邮箱
- `message` (string, 可选): 批准请求消息

**命令使用**：
```
调用 request_approval 工具，参数：
- specName: "用户注册"
- approverEmail: "tech-lead@company.com"
- message: "请审核用户注册功能规范"
```

### 10. `approve_spec` - 批准规范

**功能**：批准待审核的规范文档

**参数**：
- `approvalId` (string, 必需): 批准请求 ID
- `decision` (string, 必需): "approved" 或 "rejected"
- `comments` (string, 可选): 批准意见

**命令使用**：
```
调用 approve_spec 工具，参数：
- approvalId: "approval_20241213_001"
- decision: "approved"
- comments: "规范详细，技术方案可行"
```

### 11. `list_pending_approvals` - 列出待批准项

**功能**：列出所有待批准的规范

**参数**：无

**命令使用**：
```
调用 list_pending_approvals 工具
```

### 12. `extract_tasks` - 提取任务

**功能**：从规范文档中提取开发任务

**参数**：
- `specName` (string, 必需): 规范名称

**命令使用**：
```
调用 extract_tasks 工具，参数：
- specName: "用户注册"
```

### 13. `update_task_status` - 更新任务状态

**功能**：更新任务完成状态

**参数**：
- `specName` (string, 必需): 规范名称
- `taskId` (string, 必需): 任务 ID
- `status` (string, 必需): "pending", "in-progress", "completed"

**命令使用**：
```
调用 update_task_status 工具，参数：
- specName: "用户注册"
- taskId: "1.2"
- status: "completed"
```

### 14. `get_task_progress` - 获取任务进度

**功能**：获取规范的任务完成进度

**参数**：
- `specName` (string, 必需): 规范名称

**命令使用**：
```
调用 get_task_progress 工具，参数：
- specName: "用户注册"
```

---

## Phase 3: 企业级特性工具

### 15. `archive_completed_spec` - 归档已完成规范

**功能**：将已完成的规范移动到归档区

**参数**：
- `specName` (string, 必需): 规范名称
- `archiveNotes` (string, 可选): 归档备注

**命令使用**：
```
调用 archive_completed_spec 工具，参数：
- specName: "用户注册"
- archiveNotes: "v1.0 正式发布，功能完整"
```

### 16. `list_archived_specs` - 列出归档规范

**功能**：列出所有已归档的规范

**参数**：无

**命令使用**：
```
调用 list_archived_specs 工具
```

### 17. `get_workflow_metrics` - 获取工作流指标

**功能**：获取详细的工作流性能指标

**参数**：无

**命令使用**：
```
调用 get_workflow_metrics 工具
```

### 18. `generate_progress_report` - 生成进度报告

**功能**：生成项目进度的详细报告

**参数**：
- `format` (string, 可选): "markdown" 或 "json"，默认 "markdown"

**命令使用**：
```
调用 generate_progress_report 工具，参数：
- format: "markdown"
```

### 19. `set_language` - 设置语言

**功能**：设置仪表板界面语言

**参数**：
- `language` (string, 必需): 语言代码

**支持的语言代码**：
- `en` - English
- `zh` - 中文
- `fr` - Français
- `de` - Deutsch
- `es` - Español
- `it` - Italiano
- `ja` - 日本語
- `ko` - 한국어
- `pt` - Português
- `ru` - Русский
- `ar` - العربية

**命令使用**：
```
调用 set_language 工具，参数：
- language: "zh"
```

---

## Phase 4: 并行执行工具

### 20. `analyze-parallel` - 并行分析

**功能**：分析任务的并行执行机会

**参数**：
- `specName` (string, 必需): 规范名称
- `mode` (string, 可选): 分析模式
  - `"conservative"` - 保守模式，只分析确定安全的并行任务
  - `"balanced"` - 平衡模式，考虑中等风险的并行机会
  - `"aggressive"` - 激进模式，最大化并行机会

**命令使用**：
```
调用 analyze-parallel 工具，参数：
- specName: "用户认证"
- mode: "balanced"
```

### 21. `execute-parallel` - 并行执行

**功能**：基于分析结果执行并行任务

**参数**：
- `specName` (string, 必需): 规范名称
- `taskIds` (array, 可选): 特定任务 ID 列表
- `maxParallel` (number, 可选): 最大并行数，默认 3，最大值 3

**命令使用**：
```
调用 execute-parallel 工具，参数：
- specName: "用户认证"
- taskIds: ["1.1", "1.3", "2.1"]
- maxParallel: 2
```

### 22. `run-agent` - 运行智能代理

**功能**：执行特定的分析代理

**参数**：
- `agentName` (string, 必需): 代理名称
  - `"code-analyzer"` - 代码分析代理
  - `"file-analyzer"` - 文件分析代理
- `context` (object, 可选): 代理上下文数据
- `timeout` (number, 可选): 超时时间（毫秒），默认 30000

**命令使用**：
```
调用 run-agent 工具，参数：
- agentName: "code-analyzer"
- context: {"files": ["src/auth.js", "src/user.js"]}
- timeout: 60000
```

### 23. `pm:issue-analyze` - 问题分析（CCPM风格）

**功能**：CCPM 风格的问题并行化分析

**参数**：
- `issueId` (string, 可选): 问题 ID
- `specName` (string, 可选): 规范名称

**命令使用**：
```
调用 pm:issue-analyze 工具，参数：
- issueId: "123"
- specName: "用户认证"
```

### 24. `pm:issue-start` - 开始并行工作

**功能**：使用 Git worktree 开始并行工作

**参数**：
- `issueId` (string, 必需): 问题 ID
- `mode` (string, 可选): 工作模式
  - `"worktree"` - 使用 Git worktree（推荐）
  - `"branch"` - 使用分支模式

**命令使用**：
```
调用 pm:issue-start 工具，参数：
- issueId: "123"
- mode: "worktree"
```

### 25. `pm:context-optimize` - 上下文优化

**功能**：使用代理压缩优化上下文

**参数**：
- `target` (string, 可选): 目标路径，默认 "."
- `compressionRatio` (number, 可选): 压缩比例 0.1-0.9，默认 0.8

**命令使用**：
```
调用 pm:context-optimize 工具，参数：
- target: "src/"
- compressionRatio: 0.8
```

### 26. `spec-analyze` - 规范分析

**功能**：增强的规范分析，包含并行建议

**参数**：
- `specName` (string, 必需): 规范名称
- `includeParallel` (boolean, 可选): 是否包含并行分析，默认 true

**命令使用**：
```
调用 spec-analyze 工具，参数：
- specName: "用户认证"
- includeParallel: true
```

### 27. `manage-tasks-parallel` - 并行任务管理

**功能**：支持并行执行的任务管理

**参数**：
- `specName` (string, 必需): 规范名称
- `action` (string, 必需): 操作类型
  - `"list"` - 列出任务
  - `"analyze"` - 分析任务
  - `"execute"` - 执行任务
- `parallelMode` (boolean, 可选): 是否启用并行模式，默认 false

**命令使用**：
```
调用 manage-tasks-parallel 工具，参数：
- specName: "用户认证"
- action: "execute"
- parallelMode: true
```

---

## 完整开发场景命令示例

### 场景 1: 新项目开发流程

```bash
# 步骤 1: 项目初始化
调用 init_project 工具，参数：
- projectName: "电商系统"
- description: "完整的电商平台"
- language: "zh"

# 步骤 2: 启动仪表板
调用 open_dashboard 工具，参数：
- port: 3000

# 步骤 3: 创建技术指导
调用 create_steering_doc 工具，参数：
- docName: "技术架构"
- content: "使用微服务架构，React前端，Node.js后端"

# 步骤 4: 创建用户模块规范
调用 create_spec 工具，参数：
- specName: "用户管理"
- content: "包含注册、登录、权限管理的完整用户模块规范"

# 步骤 5: 提取开发任务
调用 extract_tasks 工具，参数：
- specName: "用户管理"

# 步骤 6: 分析并行执行机会
调用 analyze-parallel 工具，参数：
- specName: "用户管理"
- mode: "balanced"

# 步骤 7: 开始并行开发
调用 execute-parallel 工具，参数：
- specName: "用户管理"
- maxParallel: 3

# 步骤 8: 更新任务状态
调用 update_task_status 工具，参数：
- specName: "用户管理"
- taskId: "1.1"
- status: "completed"
```

### 场景 2: 企业级协作流程

```bash
# 步骤 1: 创建需要审批的规范
调用 create_spec 工具，参数：
- specName: "支付系统"
- content: "支付系统的详细规范文档"

# 步骤 2: 请求技术负责人批准
调用 request_approval 工具，参数：
- specName: "支付系统"
- approverEmail: "tech-lead@company.com"
- message: "请审核支付系统规范"

# 步骤 3: 查看待批准列表
调用 list_pending_approvals 工具

# 步骤 4: 批准规范
调用 approve_spec 工具，参数：
- approvalId: "payment-spec-001"
- decision: "approved"
- comments: "规范详细，可以开始开发"

# 步骤 5: 设置中文界面
调用 set_language 工具，参数：
- language: "zh"

# 步骤 6: 生成项目报告
调用 generate_progress_report 工具，参数：
- format: "markdown"

# 步骤 7: 归档完成的规范
调用 archive_completed_spec 工具，参数：
- specName: "支付系统"
- archiveNotes: "v1.0 正式发布"
```

### 场景 3: 代码质量分析

```bash
# 步骤 1: 运行代码分析代理
调用 run-agent 工具，参数：
- agentName: "code-analyzer"
- context: {"files": ["src/auth.js", "src/payment.js"]}
- timeout: 60000

# 步骤 2: 运行文件分析代理
调用 run-agent 工具，参数：
- agentName: "file-analyzer"
- context: {"files": ["logs/application.log"]}

# 步骤 3: 使用 CCPM 风格优化
调用 pm:context-optimize 工具，参数：
- target: "."
- compressionRatio: 0.8

# 步骤 4: 分析特定问题
调用 pm:issue-analyze 工具，参数：
- issueId: "456"
- specName: "用户认证"

# 步骤 5: 创建并行工作环境
调用 pm:issue-start 工具，参数：
- issueId: "456"
- mode: "worktree"
```

### 场景 4: 多规范并行开发

```bash
# 步骤 1: 创建多个相关规范
调用 create_spec 工具，参数：
- specName: "前端界面"
- content: "前端UI组件和页面规范"

调用 create_spec 工具，参数：
- specName: "后端API"
- content: "REST API接口规范"

调用 create_spec 工具，参数：
- specName: "数据库设计"
- content: "数据库表结构和关系设计"

# 步骤 2: 分析整体并行机会
调用 analyze-parallel 工具，参数：
- specName: "前端界面"
- mode: "aggressive"

调用 analyze-parallel 工具，参数：
- specName: "后端API"
- mode: "aggressive"

# 步骤 3: 以并行模式管理任务
调用 manage-tasks-parallel 工具，参数：
- specName: "前端界面"
- action: "list"
- parallelMode: true

# 步骤 4: 执行并行开发
调用 execute-parallel 工具，参数：
- specName: "前端界面"
- maxParallel: 2

调用 execute-parallel 工具，参数：
- specName: "后端API"
- maxParallel: 2

# 步骤 5: 监控进度
调用 get_workflow_metrics 工具

# 步骤 6: 生成综合报告
调用 generate_progress_report 工具，参数：
- format: "markdown"
```

---

## 工具组合使用模式

### 模式 1: 快速开发流程

```bash
# 基础三步骤
1. 调用 init_project 工具 -> 项目初始化
2. 调用 create_spec 工具 -> 创建规范
3. 调用 extract_tasks 工具 -> 提取任务

# 质量保证
4. 调用 run-agent 工具 (code-analyzer) -> 代码分析
5. 调用 update_task_status 工具 -> 更新状态
```

### 模式 2: 企业级完整流程

```bash
# 完整九步骤
1. 调用 init_project 工具
2. 调用 open_dashboard 工具
3. 调用 create_spec 工具
4. 调用 request_approval 工具
5. 调用 approve_spec 工具
6. 调用 extract_tasks 工具
7. 调用 execute-parallel 工具
8. 调用 generate_progress_report 工具
9. 调用 archive_completed_spec 工具
```

### 模式 3: 并行开发优化流程

```bash
# 并行优化五步骤
1. 调用 spec-analyze 工具 (includeParallel: true)
2. 调用 analyze-parallel 工具 (mode: "balanced")
3. 调用 pm:context-optimize 工具
4. 调用 execute-parallel 工具
5. 调用 run-agent 工具 (定期质量检查)
```

---

## 参数类型说明

### 字符串参数 (string)
- 用引号包围：`"用户认证"`
- 可以包含中文、英文、数字
- 路径格式：`"src/components/"`

### 数字参数 (number)
- 直接写数字：`3000`
- 端口号：`3000-65535`
- 超时时间：单位毫秒，如 `30000` (30秒)

### 布尔参数 (boolean)
- 真值：`true`
- 假值：`false`

### 数组参数 (array)
- 格式：`["item1", "item2", "item3"]`
- 任务ID列表：`["1.1", "1.2", "2.1"]`
- 文件列表：`["src/auth.js", "src/user.js"]`

### 对象参数 (object)
- 格式：`{"key": "value", "files": ["file1.js"]}`
- 嵌套结构：`{"context": {"files": ["auth.js"]}}`

---

## 错误处理和调试

### 常见错误类型

#### 1. 参数错误
```bash
# 错误示例
调用 create_spec 工具，参数：
- specName: ""  # 空字符串错误

# 正确示例
调用 create_spec 工具，参数：
- specName: "用户认证"
- content: "详细的规范内容"
```

#### 2. 工具名称错误
```bash
# 错误示例
调用 create-spec 工具  # 错误的工具名

# 正确示例
调用 create_spec 工具  # 正确的工具名
```

#### 3. 参数类型错误
```bash
# 错误示例
调用 open_dashboard 工具，参数：
- port: "3000"  # 字符串类型错误

# 正确示例
调用 open_dashboard 工具，参数：
- port: 3000  # 数字类型正确
```

### 调试技巧

#### 1. 逐步执行
```bash
# 先测试基础工具
调用 get_project_context 工具
调用 list_specs 工具

# 再执行复杂操作
调用 analyze-parallel 工具
```

#### 2. 检查状态
```bash
# 检查项目状态
调用 get_project_context 工具

# 检查任务进度
调用 get_task_progress 工具，参数：
- specName: "目标规范名称"
```

#### 3. 重置和清理
```bash
# 获取工作流指标（检查系统状态）
调用 get_workflow_metrics 工具

# 重新启动仪表板
调用 open_dashboard 工具，参数：
- port: 3001  # 使用不同端口
```

---

## 性能优化建议

### 1. 合理设置超时时间
```bash
# 大型项目分析
调用 run-agent 工具，参数：
- agentName: "code-analyzer"
- timeout: 120000  # 2分钟

# 快速分析
调用 run-agent 工具，参数：
- agentName: "file-analyzer"
- timeout: 30000   # 30秒
```

### 2. 控制并行数量
```bash
# 资源有限时
调用 execute-parallel 工具，参数：
- specName: "大型规范"
- maxParallel: 1

# 资源充足时
调用 execute-parallel 工具，参数：
- specName: "中型规范"
- maxParallel: 3
```

### 3. 使用压缩优化
```bash
# 高压缩比（节省内存）
调用 pm:context-optimize 工具，参数：
- target: "."
- compressionRatio: 0.9

# 低压缩比（保留更多信息）
调用 pm:context-optimize 工具，参数：
- target: "src/"
- compressionRatio: 0.6
```

---

## 总结

### 🎯 关键要点

1. **27个工具** 覆盖完整开发生命周期
2. **四个阶段** 从基础到高级功能渐进
3. **精确控制** 通过参数精确控制工具行为
4. **错误处理** 完整的错误处理和调试指导

### ✅ 使用建议

1. **新手用户**：从 Phase 1 工具开始，逐步学习
2. **高级用户**：直接使用 Phase 4 并行执行工具
3. **调试场景**：使用 `get_project_context` 等状态检查工具
4. **性能优化**：合理设置超时和并行参数

### 📚 进一步学习

- 查看 `USER_MANUAL.md` 了解自然语言使用方式
- 查看 `LOCAL_DEVELOPMENT_GUIDE.md` 了解完整开发流程
- 结合两种方式使用，获得最佳开发体验