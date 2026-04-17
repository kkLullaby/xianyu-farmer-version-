# 安全隐患修复计划（2026-04-13）

## 修复范围确认
基于 01-security-findings.md，共 14 个隐患需修复。本方案涵盖所有项，分为"必须修复"与"建议修复"两类。

## P0 修复计划（5 个，必须修复）

### SEC-002 JWT 密钥硬编码
- **文件**：server.js:13
- **修复内容**：
  ```javascript
  // 当前
  const JWT_SECRET = 'agri_waste_super_secret_key_2026';
  
  // 修复为
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_key_dev_only_change_in_production';
  ```
- **同步项**：
  - 添加 `.env.example` 示例文件
  - 更新 README 说明环境变量配置
- **风险**：低，向后兼容（默认 fallback）
- **预计工时**：15 分钟

### SEC-003 SQL 动态字段拼接注入面
- **文件**：server.js:808-811（farmer_reports 状态更新）
- **现象代码**：
  ```javascript
  const updateField = processor_id ? 'processor_id' : 'recycler_id';
  db.run(`UPDATE farmer_reports SET status = 'accepted', ${updateField} = ?, updated_at = datetime('now') WHERE id = ?`,
  ```
- **修复方案**：使用 CASE 语句覆盖两个分支
  ```javascript
  db.run(`UPDATE farmer_reports SET status = 'accepted', 
          recycler_id = CASE WHEN ? = 0 THEN recycler_id ELSE ? END,
          processor_id = CASE WHEN ? = 0 THEN processor_id ELSE ? END,
          updated_at = datetime('now') WHERE id = ?`,
        [processor_id ? 0 : 1, processor_id, processor_id ? 1 : 0, recycler_id, req.params.id],
  ```
- **风险**：中（需仔细验证参数顺序）
- **预计工时**：30 分钟

### SEC-004 上传文件静态暴露
- **文件**：server.js:246
- **修复内容**：
  1. 删除 `app.use('/uploads', express.static(...))`
  2. 新增受权接口 `/api/files/:fileId`
  3. 对上传文件使用 UUID 重命名（避免枚举）
- **新增代码涉及**：
  - 修改文件上传处理逻辑
  - 添加权限校验中间件
  - 更新前端访问文件的方式
- **风险**：高（破坏性修改，需客户端适配）
- **预计工时**：1 小时

### SEC-005 接口授权边界不完整（ID 可伪造）
- **文件**：server.js:596-615（farmer_reports GET）
- **修复方案**：强制 userId 校验
  ```javascript
  // 当前逻辑
  const { farmer_id, recycler_id, status } = req.query;
  
  // 修复为
  const decoded = req.user; // 从 token 签名获取
  const { farmer_id, recycler_id, status } = req.query;
  if (farmer_id && farmer_id !== decoded.id && decoded.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }
  ```
- **影响范围**：需同步修改的其他接口
  - `/api/orders`
  - `/api/recycler-requests/*`
  - 其他查询类接口
- **风险**：高（涉及鉴权边界，需全面测试）
- **预计工时**：1.5 小时

### SEC-001 前端身份可伪造（本地存储信任）
- **文件**：src/pages/index/index.vue:261-262、auth.js (多处)
- **修复方案**：
  1. 服务端生成 session token，客户端只存 token（不存 role/userId）
  2. 修改前端 auth 逻辑，每次启动/重登后从 `/api/me` 获取用户信息（需服务端实现）
  3. 删除所有 `uni.setStorageSync('current_role')` 直接赋值
- **新增后端接口**：
  - `GET /api/me` - 返回当前登录用户信息
  - `POST /api/logout` - 清退登录状态
- **影响范围**：
  - src/pages/index/index.vue
  - src/utils/request.js
  - auth.js (前端导航系统)
- **风险**：非常高（涉及整个认证系统重构）
- **预计工时**：2-3 小时

---

## P1 修复计划（6 个，建议立即修复）

### SEC-006 CORS 全放开
- **文件**：server.js:164
- **修复内容**：
  ```javascript
  // 当前
  app.use(cors());
  
  // 修复为
  app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4000', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }));
  ```
- **风险**：低
- **预计工时**：10 分钟

### SEC-007 OTP 存储在内存
- **文件**：server.js:19-21
- **修复方案**：暂时改为 SQLite 存储（需补充表结构）
  - 新建表 `otp_store`（phone, code, expires_at, attempts, last_sent_at）
  - 改 Map 为 DB query
- **风险**：中（涉及 DB 操作逻辑变化）
- **预计工时**：45 分钟

### SEC-008 缺少系统级接口限流
- **文件**：server.js (新增中间件)
- **修复方案**：
  - 安装 `express-rate-limit` 包
  - 为 `/api/login`、`/api/register`、`/api/auth/send-otp` 添加限流
- **风险**：低
- **预计工时**：30 分钟

### SEC-009 多处 innerHTML 注入面（XSS）
- **文件**：farmer-nearby-recyclers.html:413、index.html:822、auth.js:254 等
- **修复方案**：全量替换为 textContent 或 DOM 安全构建
- **风险**：中（涉及多处 HTML 操作，需验证渲染）
- **预计工时**：1 小时

### SEC-010 API Key 前端暴露
- **文件**：index.html:9、farmer-nearby-recyclers.html:347
- **修复方案**：
  - 后端创建代理接口 `/api/amap/*` 转发请求
  - 前端改为调用后端接口而不是直接调用高德 API
- **风险**：中（需新增后端代理逻辑）
- **预计工时**：1 小时

### SEC-011 上传验证仅依赖 MIME
- **文件**：server.js:252-267
- **修复方案**：
  - 增加 magic bytes 校验
  - 对图片做 resize/recompress（破坏隐藏脚本）
- **风险**：中
- **预计工时**：45 分钟

---

## P2 修复计划（3 个，可延期）

### SEC-012 密码哈希轮数不一致
- **文件**：server.js:349、380
- **修复**：统一为 10 rounds 或配置化
- **预计工时**：10 分钟

### SEC-013 本地 token 存储与 XSS
- **文件**：src/utils/request.js:17
- **修复**：缩短 token 有效期、补充 token 刷新机制
- **预计工时**：30 分钟

### SEC-014 缺少 HTTPS 强制
- **文件**：server.js (需网关或应用层支持)
- **修复**：添加 HSTS 响应头
- **预计工时**：15 分钟

---

## 总体工时估算
- P0：5 小时（最关键）
- P1：4 小时
- P2：1 小时
- **总计**：10 小时

## 实施顺序建议
1. SEC-002、SEC-006 (快速低风险)
2. SEC-003、SEC-004、SEC-011 (中等风险)
3. SEC-008、SEC-007、SEC-009、SEC-010 (复杂改动)
4. SEC-005、SEC-001 (最复杂，涉及鉴权系统)
5. SEC-012 到 014 (P2，可后续处理)

## 确认清单
- [ ] 确认是否执行所有修复（还是仅限 P0）?
- [ ] 对修复方案有无调整需求?
- [ ] 是否需要先搭建自动化复测?
