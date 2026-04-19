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

## D. 增量状态更新（2026-04-19）

### D.1 本轮已收敛（阶段完成：基础可用版）
1. TODO-005 管理端设置页占位
- 证据：
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue)
  - [server.js](../../server.js#L972)

2. TODO-006 管理端统计页占位
- 证据：
  - [src/pages/admin/statistics/index.vue](../../src/pages/admin/statistics/index.vue)
  - [server.js](../../server.js#L920)
  - [src/pages/admin/dashboard/index.vue](../../src/pages/admin/dashboard/index.vue#L23)

3. TODO-007 用户管理页占位
- 证据：
  - [src/pages/admin/users/index.vue](../../src/pages/admin/users/index.vue)
  - [server.js](../../server.js#L833)

4. TODO-013 财务页模拟数据
- 证据：
  - [src/pages/merchant/finance/index.vue](../../src/pages/merchant/finance/index.vue)
  - [server.js](../../server.js)
  - 现状：已改为基于真实订单数据聚合统计，阶段完成（基础可用版）。

5. TODO-014 处理商供货页模拟数据
- 证据：
  - [src/pages/processor/supply/index.vue](../../src/pages/processor/supply/index.vue)
  - [server.js](../../server.js)
  - 现状：已改为真实接口拉取货源，阶段完成（基础可用版）。

6. TODO-008 多关键业务仍依赖本地 mock 列表
- 本轮进展：
  - `src/pages/admin/audit/index.vue` 已完成后端化，审核列表与审批动作均改为真实 API。
  - `src/pages/farmer/report/create.vue` 已改为 `POST /api/farmer-reports`，移除 `global_report_list/global_audit_list` 写入。
  - `src/pages/merchant/demand/publish.vue` 已改为 `POST /api/recycler-requests`，移除 `global_demand_list/global_audit_list` 写入。
  - `src/pages/processor/demand/publish.vue` 已改为 `POST /api/processor-requests`，移除 `global_demand_list/global_audit_list` 写入。
  - `src/pages/farmer/demand-hall/index.vue` 已完成后端化，移除 `global_demand_list/global_intentions` 与静态示例链路。
  - `src/pages/farmer/nearby/index.vue` 已改为 `GET /api/recyclers/nearby + GET /api/purchase-requests + POST /api/intentions`。
  - `src/pages/merchant/intentions/index.vue` 已改为 `GET /api/intentions + PATCH /api/intentions/:id/status`。
  - `src/pages/processor/intentions/index.vue` 已改为 `GET /api/intentions + PATCH /api/intentions/:id/status`。
  - `src/pages/profile/intentions/index.vue` 已改为 `GET /api/intentions?applicant_id=...`。
  - `src/pages/farmer/arbitration/index.vue`、`src/pages/merchant/arbitration/index.vue`、`src/pages/processor/arbitration/index.vue`、`src/pages/admin/arbitration/index.vue` 均已切换真实 API。
  - `server.js` 已支持 `order_type=order` 仲裁目标，并在 `PATCH /api/orders/:id/status` 增加仲裁锁校验。
  - 关键字复查：`src/pages/**` 范围无 `global_arbitration_list/global_order_list` 命中。
- 状态判定：
  - 阶段完成（基础可用版，后续建议补自动化回归）。
- 证据：
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue)
  - [src/pages/farmer/report/create.vue](../../src/pages/farmer/report/create.vue)
  - [src/pages/merchant/demand/publish.vue](../../src/pages/merchant/demand/publish.vue)
  - [src/pages/processor/demand/publish.vue](../../src/pages/processor/demand/publish.vue)
  - [src/pages/farmer/demand-hall/index.vue](../../src/pages/farmer/demand-hall/index.vue)
  - [src/pages/farmer/nearby/index.vue](../../src/pages/farmer/nearby/index.vue)
  - [src/pages/merchant/intentions/index.vue](../../src/pages/merchant/intentions/index.vue)
  - [src/pages/processor/intentions/index.vue](../../src/pages/processor/intentions/index.vue)
  - [src/pages/profile/intentions/index.vue](../../src/pages/profile/intentions/index.vue)
  - [src/pages/farmer/arbitration/index.vue](../../src/pages/farmer/arbitration/index.vue)
  - [src/pages/merchant/arbitration/index.vue](../../src/pages/merchant/arbitration/index.vue)
  - [src/pages/processor/arbitration/index.vue](../../src/pages/processor/arbitration/index.vue)
  - [src/pages/admin/arbitration/index.vue](../../src/pages/admin/arbitration/index.vue)
  - [server.js](../../server.js)

### D.2 本轮部分收敛
1. TODO-008 已完成仲裁链路后端化收口，本项由“部分完成”升级为“阶段完成（基础可用版）”。

### D.3 仍待后续批次推进
1. TODO-015 / TODO-016 / TODO-017（旧 H5 与文档对齐；`auth.js`、`index.html`、`main_code.js`、`farmer-nearby-recyclers.html` 已完成五批并进入第六批收口，第六批首段已修复 `auth.js` 仲裁提交随机 `order_id` 与管理端 `order` 类型映射，第二段已修复仲裁管理按钮冒泡冲突与详情 ID 命中稳健性，第三段已修复仲裁详情刷新与罚款弹窗关闭的文本耦合判定，第四段已修复仲裁详情文件预览的内联事件模板分支并统一罚款弹窗关闭路径，第五段已修复仲裁详情操作按钮的内联事件模板并改为统一事件分发，第六段已修复仲裁管理列表与罚款弹窗剩余内联事件模板并统一为 `data-action` 分发绑定，第七段已修复仲裁提交页取消按钮与意向列表弹窗接受/拒绝按钮的内联事件模板并统一为渲染后绑定，第八段已修复四类工作台卡片与侧边栏导航主路径内联点击模板并统一为渲染后绑定，第九段已修复 CMS 中心上传/清空与列表编辑/删除按钮的内联事件模板并统一为 `data-action` 分发绑定，第十段已修复求购页入口导航与求购/供应表单草稿按钮的内联事件模板并统一为 `data-action` 分发绑定，仍需继续覆盖其余历史模板渲染分支）
2. TODO-020 / TODO-021 / TODO-022（安全策略文档化与审计日志）
3. TODO-023 / TODO-024（自动化负测与 README 里程碑固化）

### D.4 当前检查点（进入下一步前）
1. TODO-008 当前状态为“阶段完成（基础可用版）”，下一步建议转向旧 H5 注入面收口与安全策略文档化。
2. 建议补充仲裁链路自动化回归后，再评估是否升级为“稳定完成”。
