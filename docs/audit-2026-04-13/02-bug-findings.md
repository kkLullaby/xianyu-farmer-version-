# Bug 扫描报告

## A. P0 / 严重

### BUG-001 processor_requests 接单字段不存在
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L1096)
  - [db/schema.sql](../../db/schema.sql#L173)
- 现象：接口更新 `recycler_id`，但表定义缺失该列。
- 影响：回收商接单接口直接失败。
- 建议：统一数据模型（新增列或改业务逻辑）。
- 状态：已完成（2026-04-20，见 `test:p8` 与 Step6-B1 回归证据）。

### BUG-002 processor_requests 字段命名不一致
- 严重级别：P0
- 证据：
  - [server.js](../../server.js#L970)
  - [db/schema.sql](../../db/schema.sql#L179)
  - [db/schema.sql](../../db/schema.sql#L180)
- 现象：接口使用 `citrus_variety/address`，schema 定义为 `citrus_type/location_address`。
- 影响：更新或查询映射混乱，导致数据读写异常。
- 建议：统一字段命名并补迁移脚本。
- 状态：已完成（2026-04-20，字段映射与生命周期链路已回归）。

### BUG-003 登录页为占位页，认证入口未实现
- 严重级别：P0
- 证据：
  - [src/pages/login/index.vue](../../src/pages/login/index.vue#L3)
- 影响：真实用户无法正常完成登录流程。
- 建议：实现正式登录页并接入后端接口。
- 状态：已完成（2026-04-20，见 `test:p11` 与 Step6-B2 收口证据）。

### BUG-004 认证实现与文档结论冲突
- 严重级别：P0
- 证据：
  - [docs/ai_logs/INTEGRATION_TEST_REPORT.md](../../docs/ai_logs/INTEGRATION_TEST_REPORT.md)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L140)
  - [src/utils/session.js](../../src/utils/session.js#L22)
- 现象：代码侧已收敛为服务端会话同步，但验收文档仍存在历史描述，导致结论与现状不一致。
- 影响：测试通过结论与真实状态不一致，易误导上线判断。
- 建议：修正文档或完成代码对齐。
- 状态：已完成（2026-04-20，文档已重写对齐当前实现口径）。

## B. P1 / 中等

### BUG-005 register 与 register-phone 的加密策略不一致
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L349)
  - [server.js](../../server.js#L380)
- 影响：同平台不同入口产生不同安全质量，后续维护与排障困难。
- 建议：统一配置项。

### BUG-006 订单/申报查询存在越权读取可能
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L433)
  - [server.js](../../server.js#L596)
- 现象：通过 query 的 id 直接过滤查询，未绑定 token 主体。
- 影响：可读取他人数据（取决于客户端是否可控）。
- 建议：服务端强校验。

### BUG-007 OTP 防刷策略不足
- 严重级别：P1
- 证据：
  - [server.js](../../server.js#L270)
- 现象：仅有单点间隔控制，缺少全局/窗口级限制。
- 影响：可被高频请求拖垮短信与登录链路。
- 建议：加入速率限制器与风控策略。

### BUG-008 多页面仍依赖本地 Mock 数据
- 严重级别：P1
- 证据：
  - [src/pages/index/article.vue](../../src/pages/index/article.vue#L32)
  - [src/pages/farmer/report/list.vue](../../src/pages/farmer/report/list.vue#L78)
  - [src/pages/farmer/supply/index.vue](../../src/pages/farmer/supply/index.vue#L110)
- 影响：真实联调不可用，行为与后端脱节。
- 建议：拆分 mock 模式与生产模式，默认走真实 API。

### BUG-009 管理后台模块入口可点击但无真实功能
- 严重级别：P1
- 证据：
  - [src/pages/admin/dashboard/index.vue](../../src/pages/admin/dashboard/index.vue#L23)
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue#L8)
- 影响：运营流程中断。
- 建议：隐藏未实现入口或补齐功能。

### BUG-010 短信服务未接真实供应商
- 严重级别：P1
- 证据：
  - [smsClient.js](../../smsClient.js#L14)
  - [server.js](../../server.js#L20)
  - [tests/api_tests/test-p10-sms-runtime-guard.js](../../tests/api_tests/test-p10-sms-runtime-guard.js)
- 影响：验证码流程在生产不可用。
- 建议：接阿里云 SDK，补错误重试和可观测日志。
- 状态：已完成（2026-04-20，生产环境 Mock 通道启动已硬阻断，见 Step6-B2 证据）。

## C. P2 / 低

### BUG-011 架构文档与代码结构偏离
- 严重级别：P2
- 证据：
  - [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
  - [src/main.js](../../src/main.js)
- 影响：新人接手与问题定位成本升高。
- 建议：按当前 uni-app 架构重写文档。

## D. 复测建议
1. `processor_requests` 生命周期集成测试已补齐：`tests/api_tests/test-p8-processor-request-lifecycle.js`（发布、更新、查询映射、接单、防重复接单、状态流转）。
2. 针对登录链路增加端到端测试：手机号 + 验证码 + token 刷新。
3. 对越权场景做负向测试：A 用户无法查询 B 用户数据。
