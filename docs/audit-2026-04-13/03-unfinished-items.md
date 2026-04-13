# 未完成部分扫描报告

## A. 阻断上线项（必须先完成）

### TODO-001 登录页面仍为占位
- 证据：
  - [src/pages/login/index.vue](../../src/pages/login/index.vue#L3)
- 状态：未完成
- 上线影响：用户无法完成标准登录。

### TODO-002 短信验证码服务为 Mock
- 证据：
  - [smsClient.js](../../smsClient.js#L8)
  - [docs/README.md](../../docs/README.md#L62)
- 状态：未完成
- 上线影响：验证码无法真实发送。

### TODO-003 认证信任边界仍在前端
- 证据：
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L257)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L261)
- 状态：未完成
- 上线影响：身份可被伪造。

### TODO-004 processor_requests 模型未收敛
- 证据：
  - [server.js](../../server.js#L970)
  - [server.js](../../server.js#L1096)
  - [db/schema.sql](../../db/schema.sql#L179)
- 状态：未完成
- 上线影响：接单/更新流程不可用。

### TODO-005 管理端设置页占位
- 证据：
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue#L8)
- 状态：未完成
- 上线影响：后台系统配置无法操作。

### TODO-006 管理端统计页占位
- 证据：
  - [src/pages/admin/statistics/index.vue](../../src/pages/admin/statistics/index.vue#L8)
- 状态：未完成
- 上线影响：运营数据面板不可用。

### TODO-007 用户管理页占位
- 证据：
  - [src/pages/admin/users/index.vue](../../src/pages/admin/users/index.vue#L3)
- 状态：未完成
- 上线影响：无法进行用户管理运维。

### TODO-008 多关键业务仍依赖本地 mock 列表
- 证据：
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue#L153)
  - [src/pages/farmer/report/list.vue](../../src/pages/farmer/report/list.vue#L78)
  - [src/pages/farmer/supply/index.vue](../../src/pages/farmer/supply/index.vue#L110)
- 状态：未完成
- 上线影响：跨端数据不一致，联调不可控。

### TODO-009 认证与实现文档未对齐
- 证据：
  - [docs/ai_logs/INTEGRATION_TEST_REPORT.md](../../docs/ai_logs/INTEGRATION_TEST_REPORT.md#L303)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L257)
- 状态：未完成
- 上线影响：验收标准失真。

## B. 可延期但需排期项

### TODO-010 首页文章仍有默认 Mock 内容
- 证据：
  - [src/pages/index/article.vue](../../src/pages/index/article.vue#L32)

### TODO-011 商户订单详情含 Mock 回退
- 证据：
  - [src/pages/merchant/orders/detail.vue](../../src/pages/merchant/orders/detail.vue#L185)

### TODO-012 处理商订单详情含 Mock 回退
- 证据：
  - [src/pages/processor/orders/detail.vue](../../src/pages/processor/orders/detail.vue#L190)

### TODO-013 财务页仍在模拟数据阶段
- 证据：
  - [src/pages/merchant/finance/index.vue](../../src/pages/merchant/finance/index.vue#L50)

### TODO-014 处理商供货页仍在模拟数据阶段
- 证据：
  - [src/pages/processor/supply/index.vue](../../src/pages/processor/supply/index.vue#L135)

### TODO-015 旧版 HTML 端仍存在大量“正在开发中”占位
- 证据：
  - [auth.js](../../auth.js#L1480)
  - [main_code.js](../../main_code.js#L34)

### TODO-016 架构文档未同步到当前 uni-app 主体
- 证据：
  - [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)

### TODO-017 文档中对系统能力描述偏乐观
- 证据：
  - [docs/README.md](../../docs/README.md#L96)

### TODO-018 测试用例覆盖偏向手工 HTML，缺少自动化回归
- 证据：
  - [tests/html_tests/test-integration.html](../../tests/html_tests/test-integration.html)

### TODO-019 数据目录存在多 DB 文件，角色不清晰
- 证据：
  - [data/agri.db](../../data/agri.db)
  - [data/citrus.db](../../data/citrus.db)
  - [data/project.db](../../data/project.db)
- 说明：该项需你确认哪些是历史遗留，哪些是有效数据源。

### TODO-020 上传安全策略未形成统一规范文档
- 证据：
  - [server.js](../../server.js#L252)

### TODO-021 鉴权失败/越权的审计日志策略未落地
- 证据：
  - [server.js](../../server.js)

### TODO-022 CSP 与安全响应头策略未文档化
- 证据：
  - [server.js](../../server.js)

### TODO-023 端到端测试缺失角色权限负向用例
- 证据：
  - [tests/html_tests/test-full-workflow.html](../../tests/html_tests/test-full-workflow.html)

### TODO-024 修复优先级与里程碑尚未固化到项目 README
- 证据：
  - [docs/README.md](../../docs/README.md)

## C. 建议里程碑
1. M1（1 周）：完成登录闭环、短信真实化、processor_requests 模型收敛。
2. M2（1-2 周）：完成管理端关键页面、去除核心业务 Mock。
3. M3（持续）：安全加固（限流、上传校验、XSS 收敛、审计日志）与文档同步。
