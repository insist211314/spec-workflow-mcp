# 命令参考与场景用例 - Spec Workflow MCP

## 一、命令行参数详解

### 1.1 主命令
```bash
spec-workflow-mcp [path] [options]
```

### 1.2 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `path` | string | 当前目录 | 项目路径，支持 `~` 表示用户主目录 |
| `--help` | flag | - | 显示帮助信息 |
| `--dashboard` | flag | false | 仅运行仪表板模式（不启动 MCP 服务器） |
| `--AutoStartDashboard` | flag | false | 自动启动仪表板并与 MCP 服务器一起运行 |
| `--port <number>` | number | 随机端口 | 指定仪表板端口（1024-65535） |
| `--config <path>` | string | `.spec-workflow/config.toml` | 使用自定义配置文件 |

### 1.3 参数格式支持
- 空格分隔：`--port 3000`
- 等号格式：`--port=3000`
- 路径参数：支持相对路径和绝对路径

### 1.4 配置文件格式（config.toml）
```toml
# 项目目录（默认为当前目录）
projectDir = "/path/to/your/project"

# 仪表板端口（1024-65535）
port = 3456

# 自动启动仪表板
autoStartDashboard = true

# 仅运行仪表板模式
dashboardOnly = false

# 界面语言（en, ja, zh, es, pt, de, fr, ru, it, ko, ar）
lang = "zh"
```

## 二、MCP 工具命令

### 2.1 工作流指南类工具

#### spec-workflow-guide
**作用**：获取完整的规范驱动工作流程指南
```typescript
// 无参数，返回完整的工作流指导文档
```

#### steering-guide
**作用**：获取创建项目指导文档的指南
```typescript
// 无参数，返回指导文档创建指南
```

### 2.2 规范管理类工具

#### create-spec-doc
**作用**：创建或更新规范文档（需求、设计、任务）
```typescript
参数：
- specName: string        // 规范名称
- docType: 'requirements' | 'design' | 'tasks'  // 文档类型
- content: string         // 文档内容（Markdown 格式）
- metadata?: object       // 可选的元数据
```

#### spec-list
**作用**：列出所有规范及其状态信息
```typescript
// 无参数，返回所有规范的列表和状态
```

#### spec-status
**作用**：获取特定规范的详细状态
```typescript
参数：
- specName: string        // 规范名称
```

#### manage-tasks
**作用**：综合任务管理工具
```typescript
参数：
- specName: string        // 规范名称
- action: 'list' | 'update' | 'complete'  // 操作类型
- taskId?: string        // 任务 ID（更新或完成时需要）
- status?: string        // 新状态
```

### 2.3 上下文和模板类工具

#### get-template-context
**作用**：获取所有文档类型的 Markdown 模板
```typescript
// 无参数，返回所有预定义模板
```

#### get-steering-context
**作用**：获取项目指导上下文和指南
```typescript
// 无参数，返回项目级指导信息
```

#### get-spec-context
**作用**：获取特定规范的上下文
```typescript
参数：
- specName: string        // 规范名称
```

### 2.4 指导文档类工具

#### create-steering-doc
**作用**：创建项目指导文档
```typescript
参数：
- docType: 'product' | 'tech' | 'structure'  // 文档类型
- content: string         // 文档内容（Markdown 格式）
```

### 2.5 审批系统类工具

#### request-approval
**作用**：请求用户审批文档
```typescript
参数：
- specName: string        // 规范名称
- documentType: string    // 文档类型
- documentPath: string    // 文档路径
- content: string        // 文档内容
```

#### get-approval-status
**作用**：检查审批状态
```typescript
参数：
- specName: string        // 规范名称
- documentType?: string   // 可选的文档类型筛选
```

#### delete-approval
**作用**：清理已完成的审批
```typescript
参数：
- approvalId: string      // 审批 ID
```

## 三、主要场景用例

### 场景 1：全新项目初始化

```bash
# 1. 在项目目录启动 MCP 服务器并自动打开仪表板
npx -y @pimzino/spec-workflow-mcp@latest ~/my-project --AutoStartDashboard --port 3000

# 2. AI 助手中执行（伪代码）
AI: "让我帮你初始化项目结构"

# 创建产品愿景文档
create-steering-doc(
  docType: 'product',
  content: `
    # 产品愿景
    
    ## 项目概述
    构建一个现代化的电商平台...
    
    ## 核心价值
    - 用户友好的购物体验
    - 高性能的订单处理
    - 灵活的支付集成
  `
)

# 创建技术决策文档
create-steering-doc(
  docType: 'tech',
  content: `
    # 技术决策
    
    ## 技术栈
    - 前端：React + TypeScript
    - 后端：Node.js + Express
    - 数据库：PostgreSQL + Redis
  `
)

# 创建项目结构文档
create-steering-doc(
  docType: 'structure',
  content: `
    # 项目结构
    
    ## 目录结构
    - /src - 源代码
    - /tests - 测试文件
    - /docs - 文档
  `
)
```

### 场景 2：功能开发工作流

```bash
# 1. 仅启动仪表板查看项目状态
npx -y @pimzino/spec-workflow-mcp@latest ~/my-project --dashboard

# 2. AI 助手中创建用户认证功能规范
AI: "我将为用户认证功能创建完整的规范文档"

# 步骤 1：创建需求文档
create-spec-doc(
  specName: 'user-authentication',
  docType: 'requirements',
  content: `
    # 用户认证需求
    
    ## 功能需求
    1. 用户注册
       - 邮箱验证
       - 密码强度检查
    2. 用户登录
       - 记住我功能
       - 双因素认证
    3. 密码重置
       - 邮件发送重置链接
       - 安全令牌验证
  `
)

# 步骤 2：创建设计文档
create-spec-doc(
  specName: 'user-authentication',
  docType: 'design',
  content: `
    # 用户认证设计
    
    ## 架构设计
    - JWT 令牌认证
    - Redis 会话存储
    - bcrypt 密码加密
    
    ## API 设计
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/reset-password
  `
)

# 步骤 3：创建任务列表
create-spec-doc(
  specName: 'user-authentication',
  docType: 'tasks',
  content: `
    # 实施任务
    
    ## 1. 后端开发
    ### 1.1 [ ] 创建用户模型
    ### 1.2 [ ] 实现注册 API
    ### 1.3 [ ] 实现登录 API
    
    ## 2. 前端开发
    ### 2.1 [ ] 创建注册表单
    ### 2.2 [ ] 创建登录表单
    ### 2.3 [ ] 实现路由守卫
  `
)

# 步骤 4：请求审批
request-approval(
  specName: 'user-authentication',
  documentType: 'requirements',
  documentPath: '.spec-workflow/specs/user-authentication/requirements.md',
  content: '...' // 完整内容
)
```

### 场景 3：任务执行与跟踪

```bash
# 使用自定义配置文件
npx -y @pimzino/spec-workflow-mcp@latest --config ~/configs/dev-spec.toml

# AI 助手执行任务
AI: "开始执行用户认证的任务"

# 查看所有任务
manage-tasks(
  specName: 'user-authentication',
  action: 'list'
)

# 更新任务状态为进行中
manage-tasks(
  specName: 'user-authentication',
  action: 'update',
  taskId: '1.1',
  status: 'in-progress'
)

# 实际编码工作...
// 创建 models/User.js
// 实现用户模型代码

# 完成任务
manage-tasks(
  specName: 'user-authentication',
  action: 'complete',
  taskId: '1.1'
)

# 查看规范状态
spec-status(
  specName: 'user-authentication'
)
```

### 场景 4：项目监控与报告

```bash
# 仅运行仪表板用于项目展示
npx -y @pimzino/spec-workflow-mcp@latest ~/my-project --dashboard --port 8080

# AI 助手生成项目报告
AI: "让我为你生成项目状态报告"

# 获取所有规范列表
spec-list()
# 返回：
# - user-authentication (进度: 33%)
# - payment-integration (进度: 0%)
# - shopping-cart (进度: 100%)

# 获取特定规范的详细信息
spec-status('user-authentication')
# 返回：
# - 需求：已批准
# - 设计：待审批
# - 任务：3/9 已完成

# 获取规范上下文用于深入分析
get-spec-context('user-authentication')
# 返回完整的规范文档和任务状态
```

### 场景 5：团队协作场景

```bash
# 开发者 A：启动 MCP 服务器进行开发
npx -y @pimzino/spec-workflow-mcp@latest ~/team-project --AutoStartDashboard

# 开发者 B：仅查看项目状态
npx -y @pimzino/spec-workflow-mcp@latest ~/team-project --dashboard --port 3001

# 项目经理：通过仪表板审批文档
# 1. 访问 http://localhost:3001
# 2. 查看待审批文档
# 3. 点击批准/拒绝/请求修订

# AI 助手处理审批反馈
get-approval-status(
  specName: 'user-authentication',
  documentType: 'requirements'
)
# 如果状态为 'revision_requested'，根据反馈修改文档

# 清理已完成的审批
delete-approval('approval-id-123')
```

### 场景 6：多语言团队支持

```toml
# 配置文件：.spec-workflow/config.toml
projectDir = "/home/user/international-project"
port = 3456
autoStartDashboard = true
lang = "ja"  # 日语界面
```

```bash
# 日本团队成员使用日语界面
npx -y @pimzino/spec-workflow-mcp@latest

# 中国团队成员使用中文界面（命令行覆盖配置）
npx -y @pimzino/spec-workflow-mcp@latest --config .spec-workflow/config.toml --dashboard
# 然后在浏览器界面中切换到中文

# 国际团队协作，每个成员使用自己的语言配置
# 美国成员
lang = "en"

# 德国成员  
lang = "de"

# 巴西成员
lang = "pt"
```

### 场景 7：CI/CD 集成

```bash
# 在 CI 环境中验证规范完整性
# .github/workflows/spec-check.yml

- name: Check Spec Status
  run: |
    npx -y @pimzino/spec-workflow-mcp@latest . --dashboard --port 3000 &
    sleep 5
    # 使用 API 检查所有规范状态
    curl http://localhost:3000/api/specs

# 生成项目文档
- name: Generate Documentation
  run: |
    # 获取所有模板和规范
    npx -y @pimzino/spec-workflow-mcp@latest . << EOF
    get-template-context()
    spec-list()
    EOF
```

### 场景 8：问题修复工作流

```bash
# 快速启动调试环境
npx -y @pimzino/spec-workflow-mcp@latest . --AutoStartDashboard --port 9999

# AI 助手创建 bug 修复规范
create-spec-doc(
  specName: 'bug-fix-auth-timeout',
  docType: 'requirements',
  content: `
    # Bug 修复：认证超时问题
    
    ## 问题描述
    用户在 30 分钟后会话意外终止
    
    ## 影响范围
    - 所有已登录用户
    - 影响用户体验
    
    ## 修复要求
    - 延长会话到 2 小时
    - 添加会话刷新机制
  `
)

# 快速创建修复任务
create-spec-doc(
  specName: 'bug-fix-auth-timeout',
  docType: 'tasks',
  content: `
    # 修复任务
    
    ## 1. 调查
    ### 1.1 [x] 复现问题
    ### 1.2 [x] 定位根因
    
    ## 2. 修复
    ### 2.1 [ ] 更新会话配置
    ### 2.2 [ ] 实现刷新机制
    ### 2.3 [ ] 编写测试用例
  `
)
```

## 四、最佳实践建议

### 4.1 启动模式选择
- **开发阶段**：使用 `--AutoStartDashboard` 自动启动完整环境
- **查看状态**：使用 `--dashboard` 仅启动仪表板
- **CI/CD**：使用配置文件管理所有参数
- **团队协作**：每个成员使用独立端口

### 4.2 端口管理
- **开发环境**：3000-3999
- **测试环境**：4000-4999
- **演示环境**：8000-8999
- **调试环境**：9000-9999

### 4.3 配置管理
- **项目级配置**：`.spec-workflow/config.toml`
- **用户级配置**：`~/configs/spec-workflow.toml`
- **环境配置**：`--config` 参数指定不同环境

### 4.4 工作流建议
1. 始终先创建指导文档
2. 按顺序创建规范文档（需求→设计→任务）
3. 及时更新任务状态
4. 定期清理已完成的审批
5. 使用仪表板监控整体进度