# 场景20: 审批流程管理 - "撤回错误审批和智能代理配置"

### 🎯 问题描述
开发过程中发现之前提交的审批申请有错误，需要撤回重新提交。同时团队希望配置智能代理来优化开发流程，提高CCPM分析和依赖检测的准确性。

### 💡 解决方案 - MCP命令组合 (12个命令)

#### 第1步: 检查当前审批状态
```json
{"tool": "get-approval-status"}
```
**说明**: 查看所有待审批的请求，找到需要撤回的审批。

**预期输出**:
```
当前审批状态:
1. user-login-system (ID: approval-001) - 待审批
2. payment-integration (ID: approval-002) - 已审批
3. mobile-responsive (ID: approval-003) - 待审批
```

#### 第2步: 撤回错误的审批申请
```json
{
  "tool": "delete-approval",
  "approvalId": "approval-001"
}
```
**说明**: 发现user-login-system的需求文档有重大遗漏，需要撤回重新修改。

#### 第3步: 修正需求文档
```json
{
  "tool": "create-spec-doc",
  "name": "user-login-system",
  "type": "requirements",
  "content": "# 用户登录系统需求规格 (修正版)\n\n## 新增需求\n- 增加双因子认证(2FA)\n- 支持第三方登录(Google, GitHub)\n- 密码强度检测\n- 登录失败锁定机制\n\n## 原有需求\n- 用户注册和登录\n- 密码重置功能\n- 会话管理"
}
```

#### 第4步: 重新提交审批
```json
{
  "tool": "request-approval",
  "specName": "user-login-system",
  "approverEmail": "tech-lead@company.com",
  "message": "已修正需求文档，增加了安全性要求，请重新审批"
}
```

#### 第5步: 查看可用的智能代理
```json
{
  "tool": "manage-agents",
  "action": "list"
}
```
**说明**: 了解系统中有哪些可用的智能代理。

**预期输出**:
```
可用智能代理:
1. ccpm-analyzer - CCPM关键链分析代理
2. dependency-detector - 依赖关系检测代理
3. resource-optimizer - 资源优化代理
```

#### 第6步: 检查CCPM分析代理状态
```json
{
  "tool": "manage-agents",
  "action": "status",
  "agentId": "ccmp-analyzer"
}
```
**说明**: 检查CCMP分析代理的当前配置和运行状态。

#### 第7步: 配置CCPM分析代理
```json
{
  "tool": "manage-agents",
  "action": "configure",
  "agentId": "ccmp-analyzer",
  "config": {
    "analysisDepth": "detailed",
    "optimizationFocus": "time",
    "resourceConstraints": true,
    "riskAssessment": true,
    "bufferCalculation": "automatic"
  }
}
```
**说明**: 配置CCPM代理以提供更精确的项目时间估算和关键链分析。

#### 第8步: 配置依赖检测代理
```json
{
  "tool": "manage-agents",
  "action": "configure",
  "agentId": "dependency-detector",
  "config": {
    "detectionScope": "cross-module",
    "circularDependencyCheck": true,
    "apiDependencyTracking": true,
    "databaseDependencyCheck": true
  }
}
```
**说明**: 配置依赖检测代理以更好地发现模块间的隐藏依赖关系。

#### 第9步: 重启代理服务
```json
{
  "tool": "manage-agents",
  "action": "restart",
  "agentId": "ccmp-analyzer"
}
```

#### 第10步: 测试代理配置
```json
{
  "tool": "run-agent",
  "agentType": "ccmp-analyzer",
  "input": {
    "tasks": "user-login-system",
    "mode": "time-estimation"
  }
}
```
**说明**: 测试配置后的CCPM代理是否能提供更准确的分析。

#### 第11步: 查看更新后的审批状态
```json
{"tool": "get-approval-status", "specName": "user-login-system"}
```
**说明**: 确认重新提交的审批申请状态。

#### 第12步: 刷新任务列表以反映新配置
```json
{"tool": "refresh-tasks", "specName": "user-login-system"}
```
**说明**: 让智能代理的新配置应用到任务分析中。

### ✅ 结果
通过12个命令成功完成了审批流程管理和智能代理配置：

1. **审批管理**:
   - 成功撤回了错误的审批申请
   - 修正了需求文档
   - 重新提交了审批

2. **智能代理配置**:
   - 查看并配置了CCPM分析代理
   - 配置了依赖检测代理
   - 测试了代理的工作效果

### 💡 关键价值
- **错误修正**: 及时撤回错误审批，避免基于错误需求开发
- **流程优化**: 智能代理配置提升了分析准确性
- **质量提升**: 更精确的依赖检测减少了集成问题
- **效率提升**: CCPM分析优化了项目时间估算

### 🎯 适用场景
- 需要撤回或修正审批申请的情况
- 希望优化智能代理性能的团队
- 需要更精确的项目分析和估算
- 想要减少依赖冲突和集成问题

### 🔧 使用的关键工具
- `delete-approval` - 撤回审批申请
- `manage-agents` - 管理智能代理配置
- `run-agent` - 测试代理效果
- `get-approval-status` - 跟踪审批状态

---

*这是第20个场景，专门展示了之前遗漏的 `delete-approval` 和 `manage-agents` 工具的使用！*