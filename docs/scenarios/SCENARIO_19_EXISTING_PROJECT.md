# 场景19: 现有项目集成 - "首次引入spec-workflow开发新功能"

### 🎯 问题描述
团队有一个运行2年的React项目，从来没有使用过spec-workflow。现在产品经理要求添加一个"用户评论系统"功能，团队决定借此机会引入spec-workflow规范化开发流程。

### 💡 解决方案 - MCP命令组合 (17个命令)

#### 第1步: 启动MCP服务器并了解工作流
```json
{"tool": "spec-workflow-guide"}
```
**说明**: 团队首次接触spec-workflow，需要了解基本的工作流程和最佳实践。

#### 第2步: 获取技术方向指导
```json
{"tool": "steering-guide"}
```
**说明**: 了解如何为现有项目建立技术方向文档。

#### 第3步: 创建项目技术方向文档
```json
{
  "tool": "create-steering-doc",
  "name": "existing-project-technical-direction",
  "content": "# 现有React项目技术方向\n\n## 当前技术栈\n- 前端: React 17.0.2 + TypeScript\n- 状态管理: Redux + Redux Toolkit\n- UI组件: Ant Design 4.x\n- 构建工具: Create React App\n- 测试: Jest + React Testing Library\n\n## 项目结构\n```\nsrc/\n├── components/     # 可复用组件\n├── pages/         # 页面组件\n├── store/         # Redux store\n├── utils/         # 工具函数\n├── api/           # API接口\n└── types/         # TypeScript类型定义\n```\n\n## 开发规范\n- ESLint + Prettier代码格式化\n- Git commit message规范\n- PR代码审查机制\n- 分支策略: feature -> develop -> main\n\n## 新功能开发指导\n- 遵循现有代码风格和架构\n- 新组件要有单元测试\n- API调用统一通过api层\n- 状态管理使用Redux Toolkit\n\n## 集成spec-workflow策略\n- 逐步引入，不影响现有开发\n- 新功能优先使用spec-workflow\n- 现有功能优化时迁移到spec-workflow"
}
```

#### 第4步: 创建用户评论系统需求规格
```json
{
  "tool": "create-spec-doc",
  "name": "user-comment-system",
  "type": "requirements",
  "content": "# 用户评论系统需求规格\n\n## 1. 功能概述\n为现有React项目添加用户评论功能，用户可以对文章、产品等内容进行评论和回复。\n\n## 2. 功能需求\n\n### 2.1 评论发布\n**需求ID**: REQ-UC-001  \n**优先级**: 高  \n**描述**: 用户可以发布评论\n\n**验收标准**:\n- 登录用户才能发布评论\n- 支持文本评论，长度限制1000字符\n- 支持Markdown格式\n- 评论需要内容审核（敏感词过滤）\n- 发布后立即显示（待审核状态）\n\n### 2.2 评论展示\n**需求ID**: REQ-UC-002  \n**优先级**: 高  \n**描述**: 展示评论列表和详情\n\n**验收标准**:\n- 按时间倒序展示评论\n- 显示评论者头像、昵称、时间\n- 支持分页加载，每页20条\n- 显示评论状态（已审核/待审核/已删除）\n\n### 2.3 评论回复\n**需求ID**: REQ-UC-003  \n**优先级**: 中  \n**描述**: 用户可以回复评论\n\n**验收标准**:\n- 支持多级回复（最多3级）\n- 回复时@提及原评论者\n- 回复数量统计显示\n- 展开/收起回复列表\n\n### 2.4 评论管理\n**需求ID**: REQ-UC-004  \n**优先级**: 中  \n**描述**: 用户可以管理自己的评论\n\n**验收标准**:\n- 用户可以编辑自己的评论（发布后30分钟内）\n- 用户可以删除自己的评论\n- 管理员可以删除/隐藏任意评论\n- 评论举报功能\n\n## 3. 技术需求\n\n### 3.1 前端实现\n- 使用现有的React + TypeScript技术栈\n- 集成到现有的Ant Design组件体系\n- 状态管理使用Redux Toolkit\n- 支持响应式设计\n\n### 3.2 API接口设计\n- RESTful API设计\n- JWT token认证\n- 数据格式JSON\n- 错误处理统一\n\n### 3.3 性能要求\n- 评论列表加载时间 < 2秒\n- 支持虚拟滚动（评论数量>100时）\n- 图片懒加载\n- 接口响应时间 < 500ms"
}
```

#### 第5步: 创建技术设计文档
```json
{
  "tool": "create-spec-doc",
  "name": "user-comment-system",
  "type": "design",
  "content": "# 用户评论系统技术设计\n\n## 1. 组件架构\n```\nsrc/components/Comment/\n├── CommentList.tsx      # 评论列表容器\n├── CommentItem.tsx      # 单条评论\n├── CommentForm.tsx      # 评论表单\n├── CommentReply.tsx     # 回复组件\n└── index.ts\n```\n\n## 2. 状态管理\n```typescript\ninterface CommentState {\n  comments: Comment[];\n  loading: boolean;\n  error: string | null;\n  pagination: {\n    page: number;\n    total: number;\n  };\n}\n```\n\n## 3. API接口\n- GET /api/comments - 获取评论列表\n- POST /api/comments - 发布评论\n- PUT /api/comments/:id - 编辑评论\n- DELETE /api/comments/:id - 删除评论\n\n## 4. 集成策略\n- 与现有Redux store集成\n- 使用现有的API请求封装\n- 复用Ant Design组件样式\n- 保持现有路由结构"
}
```

#### 第6步: 分解开发任务
```json
{
  "tool": "create-spec-doc",
  "name": "user-comment-system",
  "type": "tasks",
  "content": "# 开发任务分解\n\n## 后端任务\n- [ ] 设计评论数据表结构\n- [ ] 实现评论CRUD API接口\n- [ ] 添加评论权限控制\n- [ ] 实现敏感词过滤\n\n## 前端任务\n- [ ] 创建评论组件模块\n- [ ] 实现评论列表组件\n- [ ] 实现评论发布表单\n- [ ] 集成到现有页面\n- [ ] 添加单元测试\n\n## 测试任务\n- [ ] API接口测试\n- [ ] 组件单元测试\n- [ ] 集成测试\n- [ ] 端到端测试"
}
```

#### 第7步: 提交需求审批
```json
{
  "tool": "request-approval",
  "specName": "user-comment-system",
  "approverEmail": "product-manager@company.com",
  "message": "用户评论系统需求设计完成，这是首次使用spec-workflow，请审批"
}
```

#### 第8步: 检查审批状态
```json
{"tool": "get-approval-status", "specName": "user-comment-system"}
```

#### 第9步: 初始化并行开发环境
```json
{
  "tool": "init_project",
  "projectPath": "/path/to/react-project",
  "config": {
    "maxParallelTasks": 3,
    "integrationMode": true
  }
}
```

#### 第10步: 分析任务依赖关系
```json
{
  "tool": "analyze-parallel",
  "specName": "user-comment-system",
  "mode": "dependencies"
}
```

#### 第11步: 为不同模块创建工作树
```json
{"tool": "create-worktree", "taskId": "comment-frontend", "baseBranch": "develop"}
```
```json
{"tool": "create-worktree", "taskId": "comment-backend", "baseBranch": "develop"}
```

#### 第12步: 启动并行开发
```json
{
  "tool": "execute-parallel",
  "specName": "user-comment-system",
  "config": {"integrationMode": true}
}
```

#### 第13步: 监控开发进度
```json
{"tool": "get-parallel-status"}
```

#### 第14步: 更新任务进度
```json
{
  "tool": "manage-tasks",
  "action": "update",
  "specName": "user-comment-system",
  "taskId": "comment-frontend",
  "status": "in_progress",
  "notes": "评论组件开发中，预计明天完成"
}
```

#### 第15步: 合并代码到现有项目
```json
{
  "tool": "consolidate-worktrees",
  "targetBranch": "develop",
  "strategy": "integration-merge"
}
```

#### 第16步: 完成开发任务
```json
{
  "tool": "manage-tasks",
  "action": "complete",
  "specName": "user-comment-system",
  "notes": "评论系统开发完成，已集成到现有项目"
}
```

#### 第17步: 清理工作树
```json
{"tool": "destroy-worktree", "worktreeId": "comment-frontend"}
```
```json
{"tool": "destroy-worktree", "worktreeId": "comment-backend"}
```

### ✅ 结果
通过17个命令成功在现有项目中引入spec-workflow并完成新功能开发，实现了：

1. **规范化流程**: 建立了完整的需求→设计→开发→测试流程
2. **无缝集成**: 新功能与现有React项目完美集成
3. **团队协作**: 通过并行开发提高了开发效率
4. **质量保证**: 通过审批和监控确保了代码质量
5. **知识沉淀**: 为团队建立了spec-workflow的实践经验

### 💡 关键价值
- **降低风险**: 规范化流程减少出错可能
- **提高效率**: 并行开发和工作树管理提升开发速度
- **增强协作**: 清晰的文档和任务分解改善团队协作
- **便于维护**: 完整的文档让后续维护更容易

### 🎯 适用场景
这个场景特别适合：
- 想要在现有项目中引入spec-workflow的团队
- 需要规范化开发流程的成熟项目
- 希望提升开发效率和代码质量的团队
- 面临复杂功能开发需要更好协作的情况

---

*这是第19个真实开发场景，展示了如何在现有项目中平滑引入spec-workflow系统！*