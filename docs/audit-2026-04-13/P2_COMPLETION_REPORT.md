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

### ✅ SEC-014 - 缺少 HTTPS 强制与安全事策略
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

---

**修复实施者**：GitHub Copilot  
**复核状态**：待用户确认  
**Git 状态**：待提交
