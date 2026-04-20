# Step2 安全基线（Upload / Audit / Header）

更新时间：2026-04-19
适用范围：`server.js` 提供的 Node.js + Express API 与旧 H5 静态入口。

## 1. 上传安全策略（TODO-020）

### 1.1 适用接口
- `POST /api/upload-arbitration-files`
- `POST /api/upload-cms-images`

### 1.2 强制控制项
- 文件大小限制：单文件 `10MB`（multer `limits.fileSize`）。
- 扩展名白名单：
  - 仲裁证据：`jpeg/jpg/png/pdf/doc/docx/mp4/avi`
  - CMS 图片：`jpeg/jpg/png`
- MIME + 扩展名双重校验：上传时同时校验 `file.mimetype` 与扩展名。
- 魔数校验（Magic Number）：
  - 读取文件头并按扩展名验证签名。
  - 若签名不匹配，立即删除已落盘文件并返回 `400`。
- 路径收敛：
  - 仲裁文件访问强制走 `GET /uploads/arbitration/:filename`。
  - 仅允许 `basename` 安全文件名，拒绝路径穿越。
  - 文件归属通过 `arbitration_file_refs` + 仲裁参与方关系校验。

### 1.3 失败处理
- 校验失败返回 `400`，错误信息不包含磁盘路径。
- 非授权访问仲裁文件返回 `401/403`。

## 2. 鉴权失败/越权审计策略（TODO-021）

### 2.1 触发条件
`/api/**` 范围内以下状态码都会写入安全审计日志：
- `401` 认证失败（缺失 token、token 无效、错误凭证）
- `403` 越权访问（角色权限不足、管理员接口越权等）
- `429` 频率限制（登录/注册/验证码限流）

### 2.2 日志文件
- 路径：`logs/security-audit.log`
- 格式：每行一条 JSON（JSON Lines）
- 归档：按轮转生成 `logs/security-audit.log.1`、`.2` ...

### 2.3 字段规范
- `ts`：事件时间（ISO8601）
- `event_type`：`AUTHN_DENIED` / `AUTHZ_DENIED` / `RATE_LIMITED`
- `reason`：安全原因码（如 `AUTH_HEADER_MISSING`、`AUTH_TOKEN_INVALID`、`LOGIN_BAD_CREDENTIALS`、`ADMIN_ROLE_REQUIRED`）
- `status`：HTTP 状态码
- `method`：HTTP 方法
- `path`：请求路径
- `actor_id`：用户 ID（匿名为 `null`）
- `role`：角色（匿名为 `anonymous`）
- `ip`：客户端 IP
- `user_agent_hash`：UA 的 SHA256 截断值（避免原文存储）
- `duration_ms`：请求耗时

### 2.4 合规约束
- 不记录密码、token、原始验证码等敏感明文。
- 仅保留最小必要追踪字段，便于回溯与风控分析。

### 2.5 轮转与留存（Step3 增强）
- 大小阈值：`SECURITY_AUDIT_LOG_MAX_MB`（支持浮点，默认 `20`）。
- 保留份数：`SECURITY_AUDIT_LOG_MAX_FILES`（默认 `7`）。
- 触发机制：写入前检查主日志文件大小，超阈值则轮转归档后再写入。
- 运维要求：生产环境建议按日志量调整阈值，并结合外部日志采集系统做长期留存。

## 3. CSP 与安全响应头策略（TODO-022）

### 3.1 全局响应头
`server.js` 全局中间件统一下发：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`
- `Content-Security-Policy: ...`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(), microphone=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`（仅 HTTPS 请求）

### 3.2 CSP 方向
- `default-src 'self'`
- 脚本与连接仅放行站内与高德地图域名。
- 禁止 `object-src` 与跨站框架嵌入（`frame-ancestors 'none'`）。

## 4. 验证命令

```bash
# 1) 启动服务
npm start

# 2) 安全/链路回归
npm run test:p0
npm run test:p1
npm run test:p2
npm run test:p3

# 3) 查看新增审计日志
tail -n 20 logs/security-audit.log
```

## 5. Step2 结论
- TODO-020：已通过统一文档 + 代码校验链路落地。
- TODO-021：已通过 `/api` 全局审计中间件落地。
- TODO-022：已通过全局安全响应头与 CSP 策略落地。
