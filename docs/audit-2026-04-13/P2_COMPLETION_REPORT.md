# P2 低危项修复完成报告

## 阶段状态：✅ 完成

修复时间：2026-04-17
修复内容：3 个 P2（低危）项

## 修复明细

### ✅ SEC-012 - 密码哈希轮数不一致
- **文件修改**：server.js
- **修改内容**：
  - `/api/register-phone` - 已使用 10 rounds（保持原值）
  - `/api/register` - 改为 10 rounds（从 8 修改）
  - `/api/login` - （无需修改，无相关代码）
- **状态**：完成
- **验证**：所有密码哈希操作现已统一使用 bcrypt 10 轮

### ✅ SEC-013 - 本地 token 存储与 XSS / Token 有效期优化
- **文件修改**：server.js
- **修改内容**：
  - `/api/register-phone` - token 有效期从 7d 改为 2h
  - `/api/register` - token 有效期从 7d 改为 2h
  - `/api/login` - token 有效期从 7d 改为 2h
  - ✨ **新增** `/api/auth/refresh` - 允许用户在 token 过期前刷新获取新 token
- **状态**：完成
- **验证**：
  ```bash
  # 测试新的刷新端点
  curl -X POST http://localhost:4000/api/auth/refresh \
    -H "Authorization: Bearer <valid_token>" \
    -H "Content-Type: application/json"
  ```

### ✅ SEC-014 - 缺少 HTTPS 强制与安全策略
- **文件修改**：server.js
- **修改内容**：
  - 在认证中间件添加 HSTS 头：`Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - 新增全局安全头中间件，包括：
    - `X-Content-Type-Options: nosniff` - 防 MIME 类型嗅探
    - `X-Frame-Options: DENY` - 防 clickjacking
    - `Cache-Control: no-store, no-cache, must-revalidate` - 禁止缓存敏感内容
- **状态**：完成
- **验证**：在浏览器开发工具中查看响应头

## 新增文件

### ✅ .env.example
- **用途**：环境变量配置示例（为后续 SEC-002 JWT 密钥环保提前做准备）
- **内容**：JWT_SECRET、CORS、SMS、文件上传等配置项示例

## 测试清单

### 依赖的测试用例
- [ ] 通过手机号 + OTP 注册新账户，验证 token 有效期
- [ ] 通过用户名 + 密码登录，验证 token 有效期
- [ ] 使用有效 token 调用 `/api/auth/refresh` 刷新，验证返回新 token
- [ ] 使用过期 token 调用 `/api/auth/refresh`，验证返回 401
- [ ] 验证所有 API 响应头包含安全策略（HSTS、X-Content-Type-Options 等）
- [ ] 重新注册用户并验证密码哈希强度（bcrypt 10 rounds）

## 下一步

收到你的确认和 git 保存完成后，我将开始 **第二阶段：P1 中危修复**（6 个项）。

### 进度更新（2026-04-19）
- 已进入第二阶段（P1）并完成两批旧 H5 注入面收口：
  - 第一批：`auth.js`（账户页、列表渲染、错误输出）
  - 第二批：`index.html`、`main_code.js`（底部文本与协议弹窗、占位渲染）
- 已完成第三批：`farmer-nearby-recyclers.html`（列表卡片、定位状态区、路线失败提示由 `innerHTML` 改为 DOM 渲染）。
- 已完成第四批：`auth.js`（订单/求购主链路与编辑表单回填字段收口，`err.message` 直出改为转义输出）。
- 已完成第五批：`auth.js`（意向列表弹窗字段转义、动作参数白名单化、罚款凭证预览由 `innerHTML` 改为 DOM 节点渲染）。
- 已启动并完成第六批首段：`auth.js`（仲裁提交改为真实目标解析，不再使用随机 `order_id`；管理端仲裁列表/详情补齐 `order` 类型映射）。
- 运行问题补充：`node server.js` 退出码 1 已定位为 `EADDRINUSE:4000`（端口占用），非语法错误。

### 当前阶段判定
- 审计主线处于 **P1 持续推进中（第五批已完成 + 第六批首段完成）**。
- 已收口范围：`auth.js`（首批 + 第四批订单/求购主链路 + 第五批意向/仲裁周边 + 第六批首段仲裁提交流程/管理端映射）、`index.html`、`main_code.js`、`farmer-nearby-recyclers.html`。
- 剩余主风险：`auth.js` 仍有历史边缘模板渲染分支待继续分批迁移到 DOM 渲染或严格转义输出。

---

**修复实施者**：GitHub Copilot  
**复核状态**：待用户确认  
**Git 状态**：待提交

---

## 补充记录（2026-04-19，非防飞单续修）

为持续收敛 4-13 审计“未完成项”，本次在 audit 主线新增一批落地修复：

1. 管理端占位页清理与真实接口接入
- `src/pages/admin/settings/index.vue`
- `src/pages/admin/statistics/index.vue`
- `src/pages/admin/users/index.vue`
- 新增后端接口：
  - `GET /api/admin/users`
  - `GET /api/admin/statistics/overview`
  - `GET /api/admin/settings/runtime`

2. 业务页去 Mock
- `src/pages/merchant/finance/index.vue` 改为真实订单流水计算。
- `src/pages/processor/supply/index.vue` 改为真实货源接口拉取。

3. 审核页硬编码样例清理
- `src/pages/admin/audit/index.vue` 的 `original*MockList` 已清空。

4. 验证
- `get_errors`（本轮改动文件）：无新增错误。
- `node --check server.js`：通过。

5. 归档
- 详细增量报告：`docs/audit-2026-04-13/07-remediation-batch-2026-04-19.md`
- 复扫主线补充：`docs/audit-2026-04-13/04-rescan-and-progress-2026-04-17.md`（第 15 节）
