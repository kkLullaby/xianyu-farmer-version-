# 未完成部分扫描报告

## A. 阻断上线项（必须先完成）

### TODO-001 登录页面仍为占位
- 证据：
  - [src/pages/login/index.vue](../../src/pages/login/index.vue#L3)
  - [tests/api_tests/test-p11-login-readiness.js](../../tests/api_tests/test-p11-login-readiness.js)
  - [docs/audit-2026-04-13/evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md](./evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md)
- 状态：已完成（2026-04-20，登录页收口自动化已落地并通过）
- 上线影响：已解除（登录入口与回归门禁已可复跑）。

### TODO-002 短信验证码服务为 Mock
- 证据：
  - [smsClient.js](../../smsClient.js#L14)
  - [server.js](../../server.js#L20)
  - [tests/api_tests/test-p10-sms-runtime-guard.js](../../tests/api_tests/test-p10-sms-runtime-guard.js)
  - [docs/audit-2026-04-13/evidence/security/2026-04-20_step6-b2-sms-runtime-guard_kk.md](./evidence/security/2026-04-20_step6-b2-sms-runtime-guard_kk.md)
- 状态：已完成（2026-04-20，生产环境短信通道 Mock 已被启动硬阻断）
- 上线影响：已解除（生产环境必须使用配置完整的阿里云短信通道）。

### TODO-003 认证信任边界仍在前端
- 证据：
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L140)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L249)
  - [src/utils/session.js](../../src/utils/session.js#L22)
  - [tests/api_tests/test-p9-auth-trust-boundary.js](../../tests/api_tests/test-p9-auth-trust-boundary.js)
- 状态：已完成（2026-04-20，首页认证入口统一为服务端会话同步 + 自动化防回退）
- 上线影响：已解除（前端角色缓存仅作展示，权限判断由 `/api/me` 同步结果驱动）。

### TODO-004 processor_requests 模型未收敛
- 证据：
  - [server.js](../../server.js#L970)
  - [server.js](../../server.js#L1096)
  - [db/schema.sql](../../db/schema.sql#L179)
  - [tests/api_tests/test-p8-processor-request-lifecycle.js](../../tests/api_tests/test-p8-processor-request-lifecycle.js)
  - [docs/audit-2026-04-13/evidence/regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md](./evidence/regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md)
- 状态：已完成（2026-04-20，模型收敛 + 生命周期回归）
- 上线影响：已解除（接单/更新链路通过自动化验证）。

### TODO-005 管理端设置页占位
- 证据：
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue#L8)
- 状态：已完成（阶段完成：基础可用版）
- 上线影响：后台系统配置无法操作。

### TODO-006 管理端统计页占位
- 证据：
  - [src/pages/admin/statistics/index.vue](../../src/pages/admin/statistics/index.vue#L8)
- 状态：已完成（阶段完成：基础可用版）
- 上线影响：运营数据面板不可用。

### TODO-007 用户管理页占位
- 证据：
  - [src/pages/admin/users/index.vue](../../src/pages/admin/users/index.vue#L3)
- 状态：已完成（阶段完成：基础可用版）
- 上线影响：无法进行用户管理运维。

### TODO-008 多关键业务仍依赖本地 mock 列表
- 证据：
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue#L153)
  - [src/pages/farmer/report/list.vue](../../src/pages/farmer/report/list.vue#L78)
  - [src/pages/farmer/supply/index.vue](../../src/pages/farmer/supply/index.vue#L110)
- 状态：已完成（阶段完成：基础可用版）
- 上线影响：跨端数据不一致，联调不可控。

### TODO-009 认证与实现文档未对齐
- 证据：
  - [docs/ai_logs/INTEGRATION_TEST_REPORT.md](../../docs/ai_logs/INTEGRATION_TEST_REPORT.md)
  - [src/pages/index/index.vue](../../src/pages/index/index.vue#L140)
  - [docs/audit-2026-04-13/evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md](./evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md)
- 状态：已完成（2026-04-20，集成测试报告已重写为当前实现口径）
- 上线影响：已解除（验收口径与实现一致）。

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
- 状态：已完成（阶段完成：基础可用版）

### TODO-014 处理商供货页仍在模拟数据阶段
- 证据：
  - [src/pages/processor/supply/index.vue](../../src/pages/processor/supply/index.vue#L135)
- 状态：已完成（阶段完成：基础可用版）

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
- 状态：已完成（2026-04-19，第25段）；见 [docs/security/SECURITY_BASELINE.md](../../docs/security/SECURITY_BASELINE.md)

### TODO-021 鉴权失败/越权的审计日志策略未落地
- 证据：
  - [server.js](../../server.js)
- 状态：已完成（2026-04-19，第25段）；`/api` 范围 401/403/429 已接入结构化审计日志 `logs/security-audit.log`

### TODO-022 CSP 与安全响应头策略未文档化
- 证据：
  - [server.js](../../server.js)
- 状态：已完成（2026-04-19，第25段）；见 [docs/security/SECURITY_BASELINE.md](../../docs/security/SECURITY_BASELINE.md)

### TODO-023 端到端测试缺失角色权限负向用例
- 证据：
  - [tests/html_tests/test-full-workflow.html](../../tests/html_tests/test-full-workflow.html)
- 状态：已完成（2026-04-19，第25段）；新增 `tests/api_tests/test-p3-authz-negative.js` 并接入 `npm run test:p3`

### TODO-024 修复优先级与里程碑尚未固化到项目 README
- 证据：
  - [docs/README.md](../../docs/README.md)
- 状态：已完成（2026-04-19，第25段）；README 已补充 Step2 安全门禁回归与放行条件

## C. 建议里程碑
1. M1（1 周）：完成登录闭环、短信真实化、认证信任边界收敛。
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
1. TODO-015 / TODO-016 / TODO-017（旧 H5 与文档对齐；`auth.js`、`index.html`、`main_code.js`、`farmer-nearby-recyclers.html` 已完成五批并进入第六批收口，第六批首段已修复 `auth.js` 仲裁提交随机 `order_id` 与管理端 `order` 类型映射，第二段已修复仲裁管理按钮冒泡冲突与详情 ID 命中稳健性，第三段已修复仲裁详情刷新与罚款弹窗关闭的文本耦合判定，第四段已修复仲裁详情文件预览的内联事件模板分支并统一罚款弹窗关闭路径，第五段已修复仲裁详情操作按钮的内联事件模板并改为统一事件分发，第六段已修复仲裁管理列表与罚款弹窗剩余内联事件模板并统一为 `data-action` 分发绑定，第七段已修复仲裁提交页取消按钮与意向列表弹窗接受/拒绝按钮的内联事件模板并统一为渲染后绑定，第八段已修复四类工作台卡片与侧边栏导航主路径内联点击模板并统一为渲染后绑定，第九段已修复 CMS 中心上传/清空与列表编辑/删除按钮的内联事件模板并统一为 `data-action` 分发绑定，第十段已修复求购页入口导航与求购/供应表单草稿按钮的内联事件模板并统一为 `data-action` 分发绑定，第十一段已修复农户申报品级说明按钮内联 `onclick` 与多处 `javascript:void(0)` 电话占位模板，第十二段已修复 `index.html`/`main_code.js`/`farmer-nearby-recyclers.html` 入口与弹窗按钮内联 `onclick` 模板并统一为渲染后绑定，第十三段已修复 `index.html` 页脚链接与首页动态卡片的 `onmouseover/onmouseout` 内联 hover 交互模板并统一为 CSS `:hover`，第十四段已修复 `index.html` 公告/案例/广告动态图片 `onerror` 内联回退模板并统一为渲染后绑定，第十五段已修复 `index.html` 协议弹窗与首页模板分发中的 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`，第十六段已修复 `main_code.js` 与 `farmer-nearby-recyclers.html` 的 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`（含防重复绑定保护），第十七段已修复 `auth.js` 求购列表中 `data-processor-demand-action` 与两组 `intention` 按钮的 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`，第十八段已修复 `auth.js` 农户申报与回收商订单/求购链路多簇按钮的 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`，第十九段已修复 `auth.js` 供应与订单模块中多处 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`，第二十段已修复 `auth.js` 四个分发函数中的 `.onclick` 属性绑定并统一为 `addEventListener('click', ...)`，仍需继续覆盖其余历史模板渲染分支）
2. 第21/22/23/24段已完成仲裁、非仲裁与跨文件同域多簇收口：`showArbitrationCenter`、`setupFilePreview`、`loadMyArbitrations`、`showArbitrationManagement`、`loadArbitrationRequests`、`showArbitrationDetail`、`viewFile`、`setPenalty`、`payPenalty`、`bindCmsTabActions`、`bindCmsFormActions`、`bindCmsListActions`、`bindDashboardActions`、`bindSidebarActions`、`updateNavbar`、`viewIntentions` 与同域 `change/submit` 交互簇的目标 `.onclick/.onchange/.onsubmit` 已切换为 `addEventListener`，`userProfile.js` 内联 hover 模板也已改为 CSS `:hover`，当前阶段跨文件 `on*` 目标模式已清零。
3. 第25段已完成 TODO-020 / TODO-021 / TODO-022：上传安全策略统一文档、`/api` 鉴权失败/越权/限流审计日志、CSP 与安全响应头策略已实现并落档。
4. 第25段已完成 TODO-023 / TODO-024：新增 `test:p3` 角色权限负向自动化用例并固化 README Step2 门禁里程碑。

### D.4 当前检查点（进入下一步前）
1. TODO-020/021/022/023/024 已在第25段完成“实现 + 自动化 + 文档”闭环，Step2 门禁项达到当前阶段完成条件。
2. TODO-008 当前状态为“阶段完成（基础可用版）”，建议后续持续补充仲裁链路与越权负测，巩固为“稳定完成”。

### D.5 Step2 收官判定（2026-04-19）
1. 收官范围：第六批第二十一至第二十五段 + `TODO-020/021/022/023/024`。
2. 收官结果：范围内门禁项已闭环，证据与文档已归档，可进入 Step3。
3. 收官证据：`09-step2-closure-2026-04-19.md`、`evidence/regression/2026-04-19_step2-final-gates_kk.md`、`evidence/security/2026-04-19_step2-authz-audit-log_kk.md`。
4. 范围外遗留：`TODO-001/002/003/015/016/017/018/019` 仍待后续批次推进，不受本次收官判定影响。

### D.6 Step3 启动记录（2026-04-19）
1. 当前阶段已切换为 Step3（鲁棒性专项），执行文档：`10-step3-entry-and-workplan-2026-04-19.md`。
2. 每次任务开始前必须完成启动确认清单：`11-task-kickoff-checklist-2026-04-19.md`。
3. 范围外遗留项将按 Step3 失败路径与稳定性优先级继续推进。
4. Step3-B1 第一段（2026-04-20）已完成审计日志轮转与留存上限修复，详见 `04-rescan-and-progress-2026-04-17.md` 第50节与 `evidence/security/2026-04-20_step3-audit-log-rotation_kk.md`。

### D.7 Step3-B1 第二段记录（2026-04-20）
1. 已完成失败路径矩阵 V1：`12-step3-failure-path-matrix-v1-2026-04-20.md`。
2. 已完成首批失败路径自动化：新增 `tests/api_tests/test-p4-failure-paths.js` 并接入 `npm run test:p4`。
3. 已完成回归证据归档：`evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`。
4. 当前遗留：超时失败路径自动化（矩阵 FP-005）待在 Step3-B1 第三段补齐。

### D.8 Step3-B1 第三段记录（2026-04-20）
1. 已完成 FP-005：`tests/api_tests/test-p4-failure-paths.js` 新增超时失败路径断言（`timeout=true`）。
2. 已完成支撑能力：`server.js` 管理端运行时接口新增非生产可控延迟模拟（`simulate_delay_ms`）。
3. 已完成回归证据归档：`evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`。
4. 当前遗留：重试/降级路径（预留 FP-008/FP-009）待在 Step3-B1 第四段推进。

### D.9 Step3-B1 第四段记录（2026-04-20）
1. 已完成 FP-008：`test:p4` 新增“超时后立即重试成功”断言。
2. 已完成 FP-009：`/api/config/amap?force_unavailable=1` 触发 `503`，并验证核心管理接口可用。
3. 已完成回归证据归档：`evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`。
4. 下一入口：Step3-B2（门禁合并执行与执行手册固化）。

### D.10 Step3-B2 记录（2026-04-20）
1. 已完成合并门禁脚本：新增 `tests/api_tests/run-step3-b2-gates.js`，并接入 `npm run test:gates`。
2. 已完成合并门禁回归：`npm run test:gates` 在 fresh server instance 策略下通过（`p0+p1+p2+p3+p4` 全绿）。
3. 已完成执行手册固化：新增 `13-step3-b2-merged-gates-runbook-2026-04-20.md`。
4. 已完成证据归档：`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`。
5. 下一入口：Step3-B3（跨端降级场景扩展与可观测告警联动评估）。

### D.11 Step3-B3 记录（2026-04-20）
1. 已完成跨端降级契约补齐：`/api/config/amap` 在 `503` 时返回标准化降级信息（`error_code` + `degrade.fallback`）。
2. 已完成可观测告警联动：`/api/admin/settings/runtime` 新增最近安全事件统计与活跃告警快照。
3. 已完成自动化断言扩展：`test:p4` 新增降级契约与限流告警联动断言。
4. 已完成合并门禁回归：`npm run test:gates` 全通过，`test:p4` 输出 `observability=rate-limit-alert-linked`。
5. 已完成证据归档：`14-step3-b3-observability-alert-linkage-2026-04-20.md`、`evidence/observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`。
6. 下一入口：Step3-B4（告警演练脚本与可观测门禁模板固化）。

### D.12 Step3-B4 记录（2026-04-20）
1. 已完成：新增 `tests/api_tests/test-p5-observability-alert-drill.js`，覆盖 `401/403/429` 告警演练与三类告警码断言。
2. 已完成：`tests/api_tests/run-step3-b2-gates.js` 扩展为 `test:p0~test:p5`，并为 p5 注入低阈值演练环境变量。
3. 已完成：`npm run test:gates` 全通过（`p0~p5`），`test:p5` 输出 `Observability alert drill passed`。
4. 已完成：执行手册更新至 `13-step3-b2-merged-gates-runbook-2026-04-20.md`（包含 p5 端口与通过标准）。
5. 已完成：证据归档 `15-step3-b4-observability-drill-and-gate-template-2026-04-20.md`、`evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`。
6. 下一入口：Step4-B1（可观测性补齐：指标面板与值班告警说明）。

### D.13 Step4-B1 记录（2026-04-20）
1. 已完成：新增执行文档 `16-step4-entry-and-b1-observability-baseline-2026-04-20.md`，固化指标映射、告警分级和值班响应模板。
2. 已完成：新增证据 `evidence/observability/2026-04-20_step4-b1-observability-baseline_kk.md`，登记门禁与统计基线。
3. 已完成：索引/阶段计划/Step3 收官文档/证据台账同步到 Step4 在途状态。
4. 下一入口：Step4-B2（告警路由演练与值班交接演习）。

### D.14 Step4-B2 记录（2026-04-20）
1. 已完成：新增执行文档 `17-step4-b2-alert-routing-and-handover-drill-2026-04-20.md`，固化告警路由与值班交接动作。
2. 已完成：新增证据 `evidence/observability/2026-04-20_step4-b2-alert-routing-and-handover_kk.md`。
3. 已完成：`npm run test:gates` 通过并记录本轮告警统计基线（`recent401=39, recent403=33, recent429=27`）。
4. 阶段结论：Step4 收官，进入 Step5-B1。

### D.15 Step5-B1 记录（2026-04-20）
1. 已完成：新增预发布演练脚本 `tests/api_tests/test-p6-release-drill.js`。
2. 已完成：新增命令 `npm run test:p6` 与 `npm run test:release-drill`。
3. 已完成：新增执行文档 `18-step5-entry-and-b1-release-drill-2026-04-20.md` 与证据 `evidence/release-drill/2026-04-20_step5-b1-migration-rollback-drill_kk.md`。
4. 已完成：`npm run test:p6` 通过（哈希回滚一致），`npm run test:gates` 通过。
5. 下一入口：Step5-B2（灰度与应急流程联合演练）。

### D.16 Step5-B2 记录（2026-04-20）
1. 已完成：新增联合演练脚本 `tests/api_tests/test-p7-gray-rollback-drill.js`。
2. 已完成：新增命令 `npm run test:p7` 与 `npm run test:gray-drill`。
3. 已完成：新增执行文档 `19-step5-b2-gray-and-emergency-drill-2026-04-20.md` 与证据 `evidence/release-drill/2026-04-20_step5-b2-gray-emergency-drill_kk.md`。
4. 已完成：`npm run test:p7` 通过，灰度检查点 10%/30%/50% 全部通过并完成应急回滚演练。
5. 阶段结论：Step5 收官，进入 Step6-B1。

### D.17 Step6-B1 记录（2026-04-20）
1. 已完成：新增阶段进入文档 `20-step6-entry-and-b1-canary-readiness-2026-04-20.md`。
2. 已完成：固化放量门槛、回滚阈值与小流量观察模板。
3. 下一入口：Step6-B2（真实小流量窗口执行与放量/回滚决策记录）。

### D.18 TODO-004 收口记录（2026-04-20）
1. 已完成：新增 `tests/api_tests/test-p8-processor-request-lifecycle.js`，覆盖创建、更新、字段映射、接单、防重复接单、状态流转。
2. 已完成：`npm run test:processor-lifecycle` 通过；`npm run test:gates` 通过。
3. 已完成：证据归档 `evidence/regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md`。
4. 状态变更：TODO-004 由“未完成”升级为“已完成（生命周期已回归）”。

### D.19 TODO-003 收口记录（2026-04-20）
1. 已完成：`src/pages/index/index.vue` 移除手写 `/api/me` 请求与本地角色判断，统一复用 `src/utils/session.js` 的 `syncSessionFromServer + roleAllowed`。
2. 已完成：`src/utils/request.js` 的 401 清理逻辑补齐 `current_role/current_user_name/current_user_phone`，避免会话失效后残留身份缓存。
3. 已完成：新增 `tests/api_tests/test-p9-auth-trust-boundary.js`，并接入 `npm run test:p9`、`npm run test:auth-boundary`。
4. 已完成：`npm run test:p9` 通过；`npm run test:gates` 通过。
5. 状态变更：TODO-003 由“未完成”升级为“已完成（认证信任边界已收敛）”。

### D.20 TODO-002 收口记录（2026-04-20）
1. 已完成：`smsClient.js` 新增 `getSmsRuntimeStatus`、`ensureSmsRuntimeReady`，统一短信通道运行态判定。
2. 已完成：`server.js` 启动阶段接入 `ensureSmsRuntimeReady`，生产环境 Mock/缺配场景启动即阻断。
3. 已完成：`/api/admin/settings/runtime` 新增短信门禁可观测字段（`sms_runtime_ready/sms_runtime_block_reason` 等）。
4. 已完成：新增 `tests/api_tests/test-p10-sms-runtime-guard.js`，并接入 `npm run test:p10`、`npm run test:sms-runtime`。
5. 已完成：`npm run test:p10` 通过；`npm run test:gates` 通过。
6. 状态变更：TODO-002 由“未完成”升级为“已完成（短信运行态门禁已收敛）”。

### D.21 TODO-001 收口记录（2026-04-20）
1. 已完成：新增 `tests/api_tests/test-p11-login-readiness.js`，覆盖登录页静态非占位、登录成功链路、会话读取与错误密码 401。
2. 已完成：`package.json` 新增 `test:p11` 与 `test:login-readiness`。
3. 已完成：`npm run test:p11` 通过；`npm run test:login-readiness` 通过。
4. 已完成：收口上线测试通过（`npm run test:gray-drill`、`npm run test:gates`、`npm run test:processor-lifecycle`、`npm run test:auth-boundary`、`npm run test:sms-runtime`）。
5. 状态变更：TODO-001 由“未完成”升级为“已完成（登录收口可复跑）”。

### D.22 TODO-009 收口记录（2026-04-20）
1. 已完成：`docs/ai_logs/INTEGRATION_TEST_REPORT.md` 重写为当前 uni-app + 服务端会话回源口径。
2. 已完成：移除旧 H5 验收依据歧义，明确历史流程不再作为当前上线判断标准。
3. 已完成：与 `src/utils/session.js`、`src/utils/request.js` 的认证实现口径一致性复核。
4. 状态变更：TODO-009 由“未完成”升级为“已完成（认证实现与文档口径一致）”。
