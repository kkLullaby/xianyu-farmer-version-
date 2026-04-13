# 安全隐患扫描报告

## A. P0 / 高危

### SEC-001 前端身份可伪造（本地存储信任）
- 严重级别：P0
- 证据：
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L261)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L262)
  - [src/pages/profile/index.vue](../../src/pages/profile/index.vue#L53)
- 风险说明：角色与身份信息通过本地存储直接写入和读取，缺少服务端鉴权闭环。
- 影响：可伪造管理员/商户/处理商身份，触发越权访问。
- 建议：服务端签发并校验会话；所有业务接口使用服务端 userId/role，不信任前端传入。

### SEC-002 JWT 密钥硬编码
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L13)
- 风险说明：密钥泄露后可伪造 token。
- 建议：改为 `process.env.JWT_SECRET`，生产环境强随机密钥并支持轮换。

### SEC-003 SQL 动态字段拼接注入面
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L808)
  - [server.js](../../server.js#L811)
- 风险说明：字段名通过模板字符串拼接进入 SQL。
- 建议：字段白名单 + 分支 SQL；禁止动态拼接未校验字段。

### SEC-004 上传文件静态暴露
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L246)
- 风险说明：上传目录可直接访问，敏感证据文件可能被枚举下载。
- 建议：移除静态公开，改鉴权下载接口并使用随机文件名。

### SEC-005 接口授权边界不完整（ID 可伪造）
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L596)
  - [server.js](../../server.js#L609)
  - [server.js](../../server.js#L615)
- 风险说明：接口按 query/body 里的 id 过滤，缺少“请求用户是否拥有该 id”的强校验。
- 建议：强制以 token userId 为主，前端传入 id 仅作辅助筛选。

## B. P1 / 中危

### SEC-006 CORS 全放开
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L164)
- 风险说明：任意 origin 可跨域访问。
- 建议：配置白名单域名、方法、凭证策略。

### SEC-007 OTP 存储在内存
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L19)
- 风险说明：服务重启后 OTP 状态丢失；不利于可用性与安全审计。
- 建议：迁移 Redis/DB，保留过期与尝试次数。

### SEC-008 缺少系统级接口限流
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L394)
  - [server.js](../../server.js#L370)
- 风险说明：登录/注册等核心接口可被暴力尝试。
- 建议：接入 `express-rate-limit`，按 IP + 账户双维度限制。

### SEC-009 多处 innerHTML 注入面（XSS）
- 严重级别：P1
- 证据：
  - [farmer-nearby-recyclers.html](../../farmer-nearby-recyclers.html#L413)
  - [index.html](../../index.html#L822)
  - [auth.js](../../auth.js#L254)
  - [main_code.js](../../main_code.js#L34)
- 风险说明：动态模板直接注入字符串，若混入不可信数据可执行脚本。
- 建议：优先改为 textContent/DOM 构建；确需 HTML 时做白名单净化。

### SEC-010 API Key 前端暴露
- 严重级别：P1
- 证据：
  - [index.html](../../index.html#L9)
  - [farmer-nearby-recyclers.html](../../farmer-nearby-recyclers.html#L347)
- 风险说明：第三方 key 可被滥用，带来额度与费用风险。
- 建议：使用受限 key（域名/IP/Referer）并迁移后端代理。

### SEC-011 上传验证仅依赖 MIME/扩展名
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L252)
  - [server.js](../../server.js#L259)
- 风险说明：伪装文件可能绕过校验。
- 建议：增加 magic bytes 校验与病毒扫描策略。

## C. P2 / 低危

### SEC-012 密码哈希轮数不一致
- 严重级别：P2
- 证据：
  - [server.js](../../server.js#L349)
  - [server.js](../../server.js#L380)
- 风险说明：不同入口安全强度不一致。
- 建议：统一 rounds 配置。

### SEC-013 本地 token 存储与 XSS 叠加风险
- 严重级别：P2
- 证据：
  - [src/utils/request.js](../../src/utils/request.js#L17)
- 风险说明：本地存储 token 在存在 XSS 时可被窃取。
- 建议：减少长期 token 暴露，缩短有效期并强化刷新机制。

### SEC-014 缺少 HTTPS 强制与安全头策略（待部署层确认）
- 严重级别：P2
- 证据：
  - [server.js](../../server.js#L1850)
- 风险说明：未发现应用层强制策略声明。
- 建议：在网关/反向代理启用 HSTS、X-Content-Type-Options、CSP。

## D. 交叉引用
- 与 Bug 强相关：`processor_requests` 字段不一致见 [02-bug-findings.md](./02-bug-findings.md)。
- 与未完成强相关：登录与短信闭环缺口见 [03-unfinished-items.md](./03-unfinished-items.md)。
