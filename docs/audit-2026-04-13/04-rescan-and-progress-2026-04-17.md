# 全量复扫与修复进度（2026-04-17）

## 1. 扫描范围与方法
- 扫描范围：后端 `server.js`、短信与鉴权相关模块、旧 H5 入口（`index.html`/`auth.js`/`main_code.js`）、uni 页面（`src/pages/**`）、文档一致性。
- 扫描方法：
  1. 静态检索：`rg` 搜索鉴权、静态暴露、XSS、Mock/占位、敏感配置。
  2. 关键代码精读：权限中间件、文件访问控制、订单与申报查询路径。
  3. 动态验证：本地启动服务后，直接请求敏感路径验证可利用性。

---

## 2. 本轮关键结论（摘要）
- 已确认多项历史问题已修复：短信真实化、OTP 入库与限流、processor_requests 模型收敛、登录页闭环、密码哈希轮数统一等。
- 仍存在高风险问题：**项目根目录静态暴露**，可直接访问源码与数据库文件。
- 旧 H5 代码仍有大量 `innerHTML` 注入面和本地 token 依赖，安全面尚未收口。
- 管理端与多条业务页面仍存在占位与 Mock 回退，影响上线稳定性和联调真实性。

---

## 3. 安全漏洞复扫结果

### 3.1 高危（P0）

#### NEW-SEC-001 根目录静态暴露导致源码/数据库可被直接下载
- 证据代码：`server.js:605` 使用 `app.use(express.static(path.join(__dirname)));`
- 复现实验（本地）：
  - 请求 `/server.js` 返回 `HTTP/1.1 200 OK`，可读源码。
  - 请求 `/db/schema.sql` 返回 `HTTP/1.1 200 OK`。
  - 请求 `/data/agri.db` 返回 `HTTP/1.1 200 OK`，文件头为 `SQLite format 3`。
- 风险：代码泄露、数据泄露、攻击者快速掌握接口与鉴权细节。
- 结论：**未修复，且风险高于原 SEC-004（上传目录暴露）**。

### 3.2 中危（P1）

#### SEC-009 多处注入面（旧 H5）仍未完成收敛
- 证据示例：`main_code.js:35`、`index.html:782`、`auth.js:323`（及大量 `innerHTML` 命中）
- 风险：若拼接内容混入不可信输入，存在 DOM XSS 攻击面。
- 结论：**未修复（旧 H5 主体）**。

#### NEW-SEC-002 文件访问支持 query token，存在 token 泄露面
- 证据：`server.js:533-540`（`getTokenFromRequest` 支持 `req.query.token`）
- 风险：token 可能通过 URL、日志、Referer 泄露。
- 结论：**待修复**。

### 3.3 低危（P2）

#### SEC-013 token 仍落地在客户端存储
- 证据：`src/utils/request.js:12-20`（`uni.getStorageSync('agri_auth_token')`）
- 风险：与 XSS 叠加时存在会话窃取面。
- 结论：**未修复（策略层）**。

#### SEC-014 安全响应头仅部分落地
- 证据：
  - 已有：`server.js:281-287`（`X-Content-Type-Options`、`X-Frame-Options`、`Cache-Control`）
  - HSTS：`server.js:384`（仅在鉴权成功路径设置）
  - 缺失：全局 CSP、`Referrer-Policy`、`Permissions-Policy` 等
- 结论：**部分修复**。

---

## 4. Bug 复扫结果（功能与一致性）

### 4.1 阻断/高优先级未完成
- 管理端设置页仍占位：`src/pages/admin/settings/index.vue:8`
- 管理端统计页仍占位：`src/pages/admin/statistics/index.vue:8`
- 管理端用户页仍占位：`src/pages/admin/users/index.vue:3`
- 农户申报列表混入 Mock：`src/pages/farmer/report/list.vue:77-113`
- 农户供货大厅混入 Mock：`src/pages/farmer/supply/index.vue:110-164`
- 商户财务中心仍为 Mock：`src/pages/merchant/finance/index.vue:50-56`
- 订单详情失败回退 Mock（商户）：`src/pages/merchant/orders/detail.vue:162-170`、`src/pages/merchant/orders/detail.vue:185-205`
- 订单详情失败回退 Mock（处理商）：`src/pages/processor/orders/detail.vue:167-176`、`src/pages/processor/orders/detail.vue:190-212`

### 4.2 文档一致性问题
- 架构文档仍以旧 H5（`auth.js/main_code.js`）为主体：`docs/ARCHITECTURE.md:10-22`
- 与当前 uni 主体并行状态不一致，容易误导验收与维护。

---

## 5. 历史问题修复进度矩阵

### 5.1 安全项（SEC）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| SEC-001 前端身份可伪造 | 部分修复 | uni 页面已大量改为 `/api/me` 回源；但旧 H5 仍依赖本地会话/本地 token。 |
| SEC-002 JWT 密钥硬编码 | 已修复 | 生产环境要求 `JWT_SECRET`，未配置则拒绝启动。 |
| SEC-003 SQL 动态字段拼接 | 已修复 | 本轮未检出 SQL 模板插值注入模式。 |
| SEC-004 上传文件静态暴露 | 回归风险 | 仲裁文件访问已加鉴权，但根目录静态暴露导致更广泛泄露。 |
| SEC-005 授权边界不完整 | 基本修复 | 订单/申报等路径已大量绑定 token 主体；建议补自动化负测。 |
| SEC-006 CORS 全放开 | 已修复 | 已配置白名单 origin。 |
| SEC-007 OTP 内存存储 | 已修复 | 已落库，含过期/尝试次数。 |
| SEC-008 缺少限流 | 已修复 | 登录/注册/OTP 已接入限流。 |
| SEC-009 innerHTML 注入面 | 未修复 | 旧 H5 命中仍非常多。 |
| SEC-010 API Key 前端暴露 | 已修复 | 改为后端 `/api/config/amap` 返回 key。 |
| SEC-011 仅 MIME 上传校验 | 已修复 | 已加入 magic bytes 校验。 |
| SEC-012 哈希轮数不一致 | 已修复 | 已统一由 `BCRYPT_ROUNDS` 配置驱动。 |
| SEC-013 本地 token + XSS 叠加 | 未修复 | 仍在客户端存储 token。 |
| SEC-014 HTTPS/安全头策略 | 部分修复 | 已有部分安全头，仍缺全局 CSP 等。 |

### 5.2 Bug 项（BUG）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| BUG-001 processor_requests 接单字段不存在 | 已修复 | 字段与迁移已补齐。 |
| BUG-002 processor_requests 字段不一致 | 已修复 | 命名已统一并做兼容迁移。 |
| BUG-003 登录页占位 | 已修复 | 已替换为可用登录/注册页。 |
| BUG-004 认证与文档冲突 | 部分修复 | 认证实现前进，但文档与旧 H5 仍有偏差。 |
| BUG-005 哈希策略不一致 | 已修复 | register / register-phone / seed 已统一。 |
| BUG-006 查询越权可能 | 基本修复 | 抽样接口已绑定主体；需负向回归测试闭环。 |
| BUG-007 OTP 防刷不足 | 已修复 | 限流 + 冷却 +尝试次数已覆盖。 |
| BUG-008 多页面依赖 Mock | 未修复 | 多个业务页仍混入 Mock。 |
| BUG-009 管理后台入口无功能 | 未修复 | settings/statistics/users 仍占位。 |
| BUG-010 短信服务 Mock | 已修复 | `smsClient.js` 已接阿里云模式并支持环境控制。 |
| BUG-011 架构文档偏离代码 | 未修复 | `docs/ARCHITECTURE.md` 未同步到 uni 主体。 |

---

## 6. TODO 阻断项进度（来自 03-unfinished-items）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| TODO-001 登录占位 | 已完成 |
| TODO-002 短信 Mock | 已完成 |
| TODO-003 认证信任边界前端化 | 部分完成 |
| TODO-004 processor_requests 未收敛 | 已完成 |
| TODO-005 管理设置占位 | 未完成 |
| TODO-006 管理统计占位 | 未完成 |
| TODO-007 用户管理占位 | 未完成 |
| TODO-008 关键业务依赖 Mock | 未完成 |
| TODO-009 文档未对齐 | 未完成 |

---

## 7. 建议下一批修复优先级
1. **立即修复 P0**：收紧静态资源暴露范围（禁止项目根目录直出，按白名单发布静态目录）。
2. **并行修复 P1**：旧 H5 `innerHTML` 高风险点收敛（至少先覆盖登录、仲裁、列表渲染主链路）。
3. **清理阻断 Bug**：完成 admin settings/statistics/users 基本可用版本，移除业务页 Mock 回退。
4. **补文档与自动化负测**：统一架构文档到 uni 主体；新增越权与匿名访问负向测试。

---

## 8. 备注
- 本报告基于 2026-04-17 当前工作区快照与本地动态验证生成。
- 已确认服务进程在验证后关闭。

---

## 9. 增量修复记录（2026-04-17 当日继续）

### 9.1 已完成
- NEW-SEC-001（P0）根目录静态暴露：已修复。
  - 后端改为白名单根文件发布，移除项目根目录静态直出。
  - 仲裁证据访问路由前置并强制鉴权。
- NEW-SEC-002（P1）query token 泄露面：已修复。
  - 仲裁文件访问仅接受 `Authorization: Bearer <token>`。
  - 前端旧 H5 文件预览改为携带 Authorization 拉取 blob。
- SEC-009（P1）旧 H5 注入面：阶段性收敛。
  - `auth.js` 已新增统一转义工具（HTML / JS 单引号上下文）。
  - CMS 三列表渲染（公告/案例/广告）已完成 ID 白名单、文本转义、图片路径白名单。
  - 仲裁管理列表 `loadArbitrationRequests` 与仲裁详情 `showArbitrationDetail` 已完成核心动态字段收敛。
  - 用户侧仲裁进度列表 `loadMyArbitrations` 已完成同类收敛。
  - 仲裁提交文件预览 `setupFilePreview` 已由 `innerHTML` 拼接改为安全 DOM 节点构建。

### 9.2 当前结论
- 根目录源码/数据库可直接下载的问题已解除。
- 仲裁文件 query token 泄露链路已解除。
- 旧 H5 仲裁主链路注入风险已明显下降，但全量 `innerHTML` 收敛仍未完成。

### 9.3 下一批建议（延续）
1. 继续扫描并收敛旧 H5 剩余高风险 `innerHTML`（优先订单/列表主链路）。
2. 逐步替换内联 `onclick` 模式，改为事件绑定，减少 JS 上下文注入面。
3. 对关键页面补最小回归清单（登录、仲裁列表/详情、文件预览、罚款支付按钮）。

---

## 10. 阶段转入记录（2026-04-17）
- 已从“多轮问题修复”转入“上线准备阶段管理”。
- 阶段总览文档：`05-release-readiness-phase-plan-2026-04-17.md`
- 当前执行步骤：`Step 1 - 上线门禁定义`。
- Step 1 执行文档：`06-step1-release-gates-2026-04-17.md`

### 10.1 转入目的
- 将上线前工作由问题驱动转为门禁驱动，保证每项上线风险可量化、可验证、可签署。

### 10.2 当前状态
- Step 1 文档已创建，状态为 `In Review`。
- 下一动作为确认门禁阈值与证据格式，确认后进入 Step 2（阻断项清零）。

---

## 11. 增量验证记录（2026-04-18）

### 11.1 本轮完成项
- P0 自动化负测脚本已落地：`tests/api_tests/test-p0-guardrails.js`
- 运行入口已加入：`npm run test:p0`
- 覆盖范围：
  1. 联系方式脱敏断言（市场列表/详情）
  2. 仲裁冻结拦截断言（活跃仲裁下状态更新应返回 409）
  3. 意向并发接受防重断言（并发请求返回 200 + 409）

### 11.2 执行结果
- 本地执行：`npm run test:p0`
- 结果：通过（全部断言通过）

### 11.3 结论
- P0 已从“代码修复完成”升级为“自动化验证完成”。
- 建议将 `npm run test:p0` 纳入上线门禁证据，作为发布前必过检查项。

## 12. 增量修复记录（2026-04-18，P1 完成）

### 12.1 本轮完成项
1. 仲裁证据关联结构化落地
- 新增 `arbitration_file_refs` 表与索引（`db/schema.sql` + `runMigrations`）。
- 启动迁移自动回填历史 `arbitration_requests` 的证据路径。
- 仲裁提交与罚款支付凭证链路同步写入结构化引用。
- 仲裁文件权限校验切换为结构化精确匹配，不再依赖 `JSON LIKE`。

2. 站内沟通留痕后端闭环
- 新增消息写入接口：`POST /api/chats/messages`
- 新增消息查询接口：`GET /api/chats/messages`
- 新增已读接口：`POST /api/chats/messages/read`
- 完成按目标类型路由（`farmer_report` / `recycler_request` / `processor_request`）及权限边界。

3. P1 自动化回归
- 新增脚本：`tests/api_tests/test-p1-traceability.js`
- 新增命令：`npm run test:p1`

### 12.2 执行结果
- `node --check server.js`：通过
- `npm run test:p0`（BASE_URL=http://localhost:4100）：通过
- `npm run test:p1`（BASE_URL=http://localhost:4100）：通过

### 12.3 结论
- P1 已从“方案识别阶段”进入“实现+验证完成阶段”。
- 防飞单专项当前状态升级为：`P0/P1 Verified Completed`。

## 13. 增量修复记录（2026-04-18，P2 完成）

### 13.1 本轮完成项
1. 页面 Mock 回退清理
- 农户端：`src/pages/farmer/report/list.vue`、`src/pages/farmer/report/detail.vue`、`src/pages/farmer/supply/index.vue`
- 回收商端：`src/pages/merchant/orders/index.vue`、`src/pages/merchant/orders/detail.vue`
- 处理商端：`src/pages/processor/orders/index.vue`、`src/pages/processor/orders/detail.vue`
- 以上页面已切换到真实 API，不再依赖 `originalMockList` / `global_*` / `useMockData` 回退。

2. 订单接口闭环补齐
- `GET /api/orders`：扩展返回字段并按创建时间倒序。
- `GET /api/orders/:id`：新增订单详情查询（支持 id/order_no）并补角色权限校验。
- `PATCH /api/orders/:id/status`：新增状态更新并写入 `order_status_history`。

3. 请求层响应兼容
- `src/utils/request.js` 已兼容信封模式与普通 JSON，减少接口格式差异导致的误判失败。

4. 自动化脚本
- 新增：`tests/api_tests/test-p2-mock-cleanup.js`
- 命令：`npm run test:p2`

### 13.2 执行结果
- `get_errors`（本轮相关文件）：无错误。
- `npm run test:p2`（BASE_URL=http://localhost:4100）：通过。
- `npm run test:p1`（BASE_URL=http://localhost:4100）：通过。
- `npm run test:p0`：本轮早先已通过。

### 13.3 结论
- P2 已完成“去 Mock + 真接口 + 自动化验证 + 文档归档”闭环。
- 防飞单专项当前状态升级为：`P0/P1/P2 Verified Completed`。

## 14. 收官补充记录（2026-04-19）

### 14.1 最终验收
- `npm run test:p2`（BASE_URL=http://localhost:4100）：通过。
- `npm run test:p0`（BASE_URL=http://localhost:4100）：通过（重启测试实例后单独执行）。
- `npm run test:p1`（BASE_URL=http://localhost:4100）：通过（重启测试实例后单独执行）。

### 14.2 收官结论
- 本轮防飞单专项完成“实现-测试-归档-复验”全链路闭环。
- 收官报告：`docs/anti-fly-order-hardening-2026-04-18/04-victory-report-2026-04-19.md`。

## 15. 增量修复记录（2026-04-19，非防飞单批次）

### 15.1 本轮完成项
1. 管理端占位页收口
- `src/pages/admin/settings/index.vue`、`src/pages/admin/statistics/index.vue`、`src/pages/admin/users/index.vue` 已替换为真实数据页面，不再是“开发中”占位。
- `src/pages/admin/dashboard/index.vue` 的“数据统计”入口已改为真实页面跳转。

2. 管理端后端接口补齐
- 新增 `GET /api/admin/users`。
- 新增 `GET /api/admin/statistics/overview`。
- 新增 `GET /api/admin/settings/runtime`。

3. 业务页去 Mock
- `src/pages/merchant/finance/index.vue` 改为基于 `/api/orders` 真实数据计算收益与流水。
- `src/pages/processor/supply/index.vue` 改为基于 `/api/farmer-supplies` 与 `/api/recycler-supplies` 拉取真实货源。

4. 审核页静态样例清理
- `src/pages/admin/audit/index.vue` 中 `originalFarmerMockList / originalMerchantMockList / originalProcessorMockList` 已清空，不再混入硬编码示例数据。

### 15.2 验证结果
- `get_errors`（本轮改动文件）：无新增错误。
- `node --check server.js`：通过。

### 15.3 状态结论
- 4-13 审计项中，管理端占位与部分 Mock 残留已进一步收敛。
- 仍需继续推进的重点：管理审核流后端化、旧 H5 注入面收口、架构文档与 README 对齐、安全头策略文档化。

### 15.4 归档文档
- 详见：`docs/audit-2026-04-13/07-remediation-batch-2026-04-19.md`。

## 16. 增量修复记录（2026-04-19，继续批次）

### 16.1 本轮完成项
1. 农户供需大厅后端化
- `src/pages/farmer/demand-hall/index.vue` 已移除 `global_demand_list` 与静态示例卡片链路，改为真实接口拉取。
- 列表数据改为聚合：
  - `GET /api/purchase-requests`
  - `GET /api/processor-requests?for_farmers=true`
- 意向提交改为后端写入：`POST /api/intentions`。

2. TODO-008 状态升级
- 审核流、发布流、供需大厅三段链路已继续收敛并接入真实 API。
- 但 `global_intentions` 在意向中心相关页面仍有残留，TODO-008 当前状态为“部分完成”。

### 16.2 验证结果
- `get_errors`（`src/pages/farmer/demand-hall/index.vue`）：无新增错误。
- 关键字复查：`src/pages/farmer/demand-hall/index.vue` 无 `global_demand_list/global_intentions` 命中。

### 16.3 状态结论
- 4-13 审计主线中，管理审核流后端化与农户供需大厅后端化均已落地。
- 当前后续重点收敛项转为：意向中心 `global_intentions` 链路后端化、旧 H5 注入面与占位、架构文档/README 对齐、安全响应头与审计日志策略文档化。

## 17. 增量修复记录（2026-04-19，下一轮）

### 17.1 本轮完成项
1. 意向中心后端化
- `src/pages/merchant/intentions/index.vue`、`src/pages/processor/intentions/index.vue` 已改为真实 API 拉取与处理状态：
  - `GET /api/intentions?target_type=...&target_id=...`
  - `PATCH /api/intentions/:id/status`
- `src/pages/profile/intentions/index.vue` 已改为 `GET /api/intentions?applicant_id=...`。

2. 农户附近回收点意向投递后端化
- `src/pages/farmer/nearby/index.vue` 已移除本地 `global_intentions` 写入。
- 页面改为：`GET /api/recyclers/nearby + GET /api/purchase-requests + POST /api/intentions`。

### 17.2 验证结果
- `get_errors`：
  - `src/pages/farmer/nearby/index.vue`
  - `src/pages/merchant/intentions/index.vue`
  - `src/pages/processor/intentions/index.vue`
  - `src/pages/profile/intentions/index.vue`
  均无新增错误。
- 关键字复查：`src/**` 范围内无 `global_intentions` 命中。

### 17.3 状态结论
- TODO-008 继续保持“部分完成”：
  - 审核流、发布流、供需大厅、意向中心链路已完成后端化；
  - 仲裁链路仍存在 `global_arbitration_list/global_order_list` 本地状态依赖，需后续批次继续收敛。

### 17.4 下一步入口
- 建议下一轮以“仲裁链路后端化”作为单一主任务，完成后再做全量关键字复查与状态升级评估。

## 18. 增量修复记录（2026-04-19，仲裁链路收口）

### 18.1 本轮完成项
1. 仲裁页面全链路后端化
- `src/pages/farmer/arbitration/index.vue`、`src/pages/merchant/arbitration/index.vue`、`src/pages/processor/arbitration/index.vue`：
  - 列表改为 `GET /api/arbitration-requests?status=all`
  - 提交改为 `POST /api/arbitration-requests`
  - 提交前通过 `GET /api/orders/:id` 解析 `order_id`，并统一使用 `order_type=order`
- `src/pages/admin/arbitration/index.vue`：
  - 列表改为 `GET /api/arbitration-requests/all?status=all`
  - 裁决改为 `PATCH /api/arbitration-requests/:id`
  - 移除 `global_arbitration_list/global_order_list` 本地写回

2. 后端仲裁能力补齐
- `server.js`：
  - `getArbitrationTargetPartyIds` 增加 `order` 目标类型支持
  - `POST /api/arbitration-requests` 允许 `order_type=order`
  - `PATCH /api/orders/:id/status` 增加仲裁锁校验，仲裁处理中拒绝状态变更
  - 仲裁查询接口补充 `applicant_role` 字段（管理端展示申请人角色）

### 18.2 验证结果
- `get_errors`：
  - `server.js`
  - `src/pages/farmer/arbitration/index.vue`
  - `src/pages/merchant/arbitration/index.vue`
  - `src/pages/processor/arbitration/index.vue`
  - `src/pages/admin/arbitration/index.vue`
  均无新增错误。
- 后端语法：`node --check server.js` 通过。
- 关键字复查：`rg "global_arbitration_list|global_order_list" src/pages` 无命中。

### 18.3 状态结论
- TODO-008 由“部分完成”升级为“阶段完成（基础可用版）”：
  - 审核流、发布流、供需大厅、意向中心、仲裁链路均已后端化；
  - 前端仲裁链路已移除 `global_arbitration_list/global_order_list` 本地状态依赖。

### 18.4 下一步入口
- P1：旧 H5 注入面与占位继续收口（`auth.js` / `index.html` / `main_code.js`）。
- P2：安全策略文档化与审计日志策略落地。
- P3：补充仲裁链路自动化回归（申请、裁决、订单冻结）。

## 19. 增量修复记录（2026-04-19，P1 首批：旧 H5 注入面收口）

### 19.1 本轮完成项
1. `auth.js` 注入面首批收口
- 新增安全渲染方法：`renderPlaceholderPage`、`renderMyAccountPage`，替换“我的账户”等页面的用户字段直拼 `innerHTML`。
- 农户/回收商/处理商工作台中 `currentUser.name/loginTime` 输出改为转义后渲染。
- 农户申报表单回填字段（联系人、地址、备注等）统一转义后写入模板。
- 申报列表、货源供应列表中的 API 字段（如 `report_no`、`farmer_name`、`location_address`、`notes` 等）改为先转义再拼接。
- 列表加载失败提示由 `${err.message}` 直出改为转义后输出。

2. 运行问题定位补充
- 终端 `node server.js` 退出码 1 的根因已定位：`EADDRINUSE:4000`（端口占用），非语法错误。

### 19.2 验证结果
- `get_errors`：`auth.js` 无新增错误。
- 语法检查：`node --check auth.js` 通过。
- 关键字复查：`auth.js` 中本轮目标模式 `${this.currentUser.name}` / `${this.currentUser.username}` / `${err.message}` 已无命中。

### 19.3 状态结论
- 旧 H5 注入面整改进入“阶段推进中”：本轮已完成首批高风险点收口，但尚未完成 `index.html`、`main_code.js` 与其余历史渲染分支的全量收敛。

### 19.4 下一步入口
- P1：继续收口 `index.html` 与 `main_code.js` 的动态渲染注入面（优先含用户/后端字段拼接的区域）。
- P2：补齐运行手册中的端口冲突处理（`EADDRINUSE`）步骤。

## 20. 增量修复记录（2026-04-19，P1 第二批：index/main_code 收口）

### 20.1 本轮完成项
1. `index.html` 注入面收口
- 新增 `setMultilineText`，底部 `about` 输出由 `innerHTML` 改为文本节点 + `<br>` 组装。
- 新增 `openPolicyModalWithIframe`，隐私政策/服务协议改为 iframe 方式加载静态页，移除 fetch 后直写 `innerHTML` 路径。

2. `main_code.js` 占位渲染收口
- 新增 `renderComingSoon`，占位内容由 `innerHTML` 改为 `createElement + textContent` 渲染。

### 20.2 验证结果
- `get_errors`：`index.html`、`main_code.js` 均无新增错误。
- 语法检查：`node --check main_code.js` 通过。

### 20.3 状态结论
- 旧 H5 注入面整改继续推进：`auth.js`、`index.html`、`main_code.js` 已完成两批收口，风险持续下降；仍需对 `farmer-nearby-recyclers.html` 及历史分支做全量收敛。

### 20.4 下一步入口
- P1：`farmer-nearby-recyclers.html` 路由/状态面板相关 `innerHTML` 收口。
- P2：`auth.js` 其余低优先级历史渲染分支统一迁移为转义或 DOM 渲染。

## 21. 增量修复记录（2026-04-19，P1 第三批：farmer-nearby 收口）

### 21.1 本轮完成项
1. `farmer-nearby-recyclers.html` 动态渲染收口
- 新增 `clearChildren`、`createInfoIcon`、`createInfoItem`、状态渲染函数族（`setStatusLoading/setStatusSuccess/appendStatusHint/setStatusError`）。
- 回收商卡片列表由 `innerHTML` 字符串拼接改为 DOM 创建与事件绑定（`addEventListener`）。
- 定位状态区与错误提示改为 DOM 渲染，移除 `statusDiv.innerHTML` 动态写入路径。
- 路线规划失败提示改为 DOM 文本写入，移除 `route-info` 路径 `innerHTML` 写入。

### 21.2 验证结果
- `get_errors`：`farmer-nearby-recyclers.html` 无新增错误。
- 关键字复查：`container.innerHTML` / `statusDiv.innerHTML` / `route-info.innerHTML` 在目标文件无命中。

### 21.3 状态结论
- 旧 H5 注入面整改已完成第三批阶段收口：`auth.js`、`index.html`、`main_code.js`、`farmer-nearby-recyclers.html` 高风险路径已完成一轮可验证收敛。
- 后续风险主要集中在 `auth.js` 历史模板渲染分支（页面量大，建议按模块继续拆批）。

### 21.4 下一步入口
- P1：按模块继续收口 `auth.js` 中订单中心/求购中心等历史模板渲染分支。
- P2：同步补全运行手册中的 `EADDRINUSE` 处理步骤与验证命令。

## 22. 增量修复记录（2026-04-19，P1 第四批：auth.js 订单/求购收口）

### 22.1 本轮完成项
1. 回收商订单中心（`showRecyclerOrders`）三条列表渲染收口
- `loadOrders`、`loadProcessorOrders`、`loadMyDemands` 中后端字段统一转义后输出。
- `data-id` / `data-uid` 统一改为数值白名单写入，避免属性注入。
- 列表错误提示由 `${err.message}` 直出改为转义后展示。

2. 处理商“我的求购”列表收口
- `loadProcessorOrders`（方法）完成 `request_no/contact_name/location_address/notes/valid_until` 等字段转义。
- 操作按钮 `data-id` 参数按数值白名单生成。

3. 编辑求购表单回填收口
- `showPublishDemandForm` 新增安全回填变量，覆盖 `weight/location_address/contact_name/contact_phone/valid_until/notes`。
- 草稿按钮中的编辑 ID 改为 `editIdExpr`（数值白名单），避免内联参数注入。

4. 求购大厅列表收口
- `loadProcessorDemands`、`loadRecyclerDemands` 完成字段转义与按钮参数白名单化。

### 22.2 验证结果
- `get_errors auth.js`：无新增错误。
- `node --check auth.js`：通过。
- 关键字复查：`auth.js` 中 `${err.message}` 无命中。

### 22.3 状态结论
- P1 旧 H5 注入面整改已完成第四批，订单/求购主链路的高风险模板插值基本完成本轮收口。
- 剩余风险集中在 `auth.js` 历史边缘分支，建议继续按模块分批推进。

### 22.4 下一步入口
- P1：继续覆盖 `auth.js` 其余 `data.map(...).join('')` 模板分支（意向、仲裁、公告类页面）。
- P2：同步更新运行手册与验证清单，补齐本批命令证据。

## 23. 增量修复记录（2026-04-19，P1 第五批：auth.js 意向/仲裁周边收口）

### 23.1 本轮完成项
1. 意向列表弹窗收口
- `viewIntentions` 中后端字段（`applicant_name/status/estimated_weight/expected_date/notes/created_at`）统一转义后输出。
- 接受/拒绝动作按钮内联参数 `id` 改为数值白名单写入。

2. 仲裁周边文件预览收口
- `payPenalty` 中支付凭证预览由 `innerHTML` 拼接改为 DOM 节点构建（图片预览与文件名文本）。

3. 错误输出收口
- `viewIntentions` 加载失败提示由 `${err.message}` 直出改为转义输出。

### 23.2 验证结果
- `get_errors auth.js`：无新增错误。
- `node --check auth.js`：通过。
- 关键字复查：`auth.js` 中 `${err.message}` 无命中。

### 23.3 状态结论
- P1 旧 H5 注入面整改已完成第五批，意向中心与仲裁周边风险继续下降。
- 剩余风险继续集中在 `auth.js` 历史边缘模板分支，建议按页面模块拆批持续治理。

### 23.4 下一步入口
- P1：继续覆盖 `auth.js` 管理端仲裁列表/详情中剩余模板分支。
- P2：补齐本批命令证据与运行手册更新。

## 24. 增量修复记录（2026-04-19，P1 第六批首段：auth.js 仲裁提交流程与管理端映射收口）

### 24.1 本轮完成项
1. 仲裁提交流程修复
- `submitArbitration` 已移除随机 `order_id` 生成逻辑。
- `order` 类型改为调用 `GET /api/orders/:idOrNo` 解析真实目标。
- 旧类型（`farmer_report/recycler_request/processor_request`）改为通过对应列表接口按编号查找真实 `id`。

2. 管理端仲裁显示一致性修复
- `loadArbitrationRequests`、`showArbitrationDetail` 的 `orderTypeLabels` 均补齐 `order -> 平台交易订单`。

### 24.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`auth.js` 已使用 `order_id: resolvedTarget.order_id`，随机 `order_id` 逻辑已清除。

### 24.3 状态结论
- P1 第六批已启动并完成首段，仲裁提交链路的业务正确性与可追溯性明显提升。
- 下一步继续覆盖管理端仲裁详情中剩余历史模板渲染分支，并补回归证据。

## 25. 增量修复记录（2026-04-19，P1 第六批第二段：auth.js 仲裁管理交互与详情加载稳健性）

### 25.1 本轮完成项
1. 仲裁管理列表交互冲突修复
- `loadArbitrationRequests` 中四个操作按钮新增 `event.stopPropagation()`，避免按钮点击触发卡片 `onclick` 误跳详情。

2. 仲裁详情加载稳健性增强
- `showArbitrationDetail` 新增 `id` 数值校验，非法 ID 直接拦截并提示。
- 详情记录查找改为 `Number(a.id) === targetId`，修复类型不一致引起的命中失败。

### 25.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`event.stopPropagation()`、`Number(a.id) === targetId` 均存在。

### 25.3 状态结论
- P1 第六批第二段已完成，仲裁管理端交互稳定性与详情命中准确性进一步提升。
- 下一步：继续推进 `auth.js` 仲裁详情历史模板分支收口，并并行补运行手册中的 `EADDRINUSE` 步骤。

## 26. 增量修复记录（2026-04-19，P1 第六批第三段：auth.js 仲裁视图状态与弹窗关闭稳健性）

### 26.1 本轮完成项
1. 仲裁详情刷新路径稳健性增强
- 新增 `isArbitrationDetailViewActive()`，改为使用 `data-arbitration-view` 显式判断当前视图。
- `resolveArbitration` / `rejectArbitration` / `addArbitrationNote` 不再依赖 `innerHTML.includes('返回仲裁列表')` 的文本匹配。

2. 罚款弹窗关闭逻辑精确化
- `setPenalty`、`payPenalty` 弹窗新增 `data-modal-type` 标识。
- `submitPenalty`、`submitPenaltyPayment` 改为按标识选择器关闭对应弹窗，避免误删其它固定定位层。

### 26.2 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`isArbitrationDetailViewActive`、`data-arbitration-view`、`data-modal-type`、`setPenaltyModal`、`payPenaltyModal` 均存在。

### 26.3 状态结论
- P1 第六批第三段已完成，仲裁模块在文案变更场景下的行为稳定性进一步提升。
- 下一步：继续清理 `auth.js` 仲裁详情剩余历史模板分支，并补自动化负测证据。

## 27. 增量修复记录（2026-04-19，P1 第六批第四段：auth.js 仲裁详情文件预览与弹窗关闭路径收口）

### 27.1 本轮完成项
1. 仲裁详情文件预览事件收口
- `showArbitrationDetail` 的 `renderFileList` 移除内联 `onclick/onmouseenter/onmouseleave` 模板。
- 文件项改为写入 `data-file-preview-key`，并通过 `filePreviewRegistry` 保存元数据。
- 详情渲染后统一绑定点击与 hover 事件，点击后调用 `viewFile`。

2. 罚款弹窗关闭路径统一
- 新增 `closeModalByType(modalType)`。
- `setPenalty` 与 `payPenalty` 的取消按钮、遮罩点击关闭、提交成功关闭均改为调用该方法。

### 27.2 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`file-preview-`、`data-file-preview-key`、`filePreviewRegistry`、`closeModalByType` 均存在。

### 27.3 状态结论
- P1 第六批第四段已完成，仲裁详情文件预览路径与罚款弹窗关闭路径稳健性进一步提升。
- 下一步：继续清理 `auth.js` 仲裁详情剩余历史模板分支，并补自动化负测证据。

## 28. 增量修复记录（2026-04-19，P1 第六批第五段：auth.js 仲裁详情操作按钮事件绑定收口）

### 28.1 本轮完成项
1. 仲裁详情操作按钮去内联事件
- 返回列表、查看凭证、开始调查、设置罚款、做出裁决、驳回申请、添加备注均改为 `data-arb-detail-action` 触发。
- 仲裁相关按钮参数通过 `data-arb-id` 与 `data-proof-*` 元数据承载。

2. 统一事件分发绑定
- 详情渲染后新增 `container.querySelectorAll('[data-arb-detail-action]')` 统一绑定。
- 按 action 分发到对应业务方法，保留既有交互行为。

### 28.2 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`data-arb-detail-action`、`view-penalty-proof`、`start-investigation`、`set-penalty`、`add-note` 均存在。

### 28.3 状态结论
- P1 第六批第五段已完成，仲裁详情操作区模板耦合进一步下降。
- 下一步：继续收口 `auth.js` 仲裁历史模板分支并补自动化负测证据。

## 29. 增量修复记录（2026-04-19，P1 第六批第六段：仲裁管理列表与罚款弹窗事件绑定收口）

### 29.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过。
- `npm run test:p1`：首次触发登录限流 `HTTP 429`，重启测试实例后重跑通过。
- `npm run test:p2`：首次触发登录限流 `HTTP 429`，重启测试实例后重跑通过。
- 判定：P0/P1/P2 均已通过，`429` 为环境噪声，不属于业务回归失败。

2. 仲裁事件绑定第六段收口（`auth.js`）
- `loadMyArbitrations` 的“立即支付罚款”改为 `data-my-arb-action` 绑定。
- `loadArbitrationRequests` 卡片与操作按钮改为 `data-arb-list-action` 统一分发，移除内联 `onclick`。
- 详情加载失败回退按钮改为 `data-arb-detail-error-action`，渲染后绑定返回列表动作。
- `setPenalty` / `payPenalty` 弹窗按钮改为 `data-set-penalty-action` / `data-pay-penalty-action` 统一绑定，并补充 ID 校验。

### 29.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-my-arb-action`、`data-arb-list-action`、`data-arb-detail-error-action`、`data-set-penalty-action`、`data-pay-penalty-action` 均存在。

### 29.3 状态结论
- P1 第六批第六段已完成，仲裁管理列表与罚款流程剩余内联事件模板继续下降。

## 30. 增量修复记录（2026-04-19，P1 第六批第七段：仲裁提交页与意向列表弹窗事件绑定收口）

### 30.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，本轮未出现影响结论的限流噪声。

2. 仲裁与意向事件绑定第七段收口（`auth.js`）
- `showArbitrationCenter` 的“取消”按钮改为 `data-arb-submit-action`，渲染后统一分发跳转动作。
- `viewIntentions` 的“接受/拒绝”按钮改为 `data-intention-action + data-intention-id`，移除内联 `onclick`。
- `updateIntentionStatus` 增加按钮参数空值兼容，统一处理禁用/恢复与状态更新。

### 30.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-arb-submit-action`、`data-intention-action` 均存在。

### 30.3 状态结论
- P1 第六批第七段已完成，仲裁提交页与意向列表弹窗残余内联动作模板继续下降。
- 下一步：继续清理 `auth.js` 仲裁中心与管理端边缘模板分支，并补最小自动化负测证据。

## 31. 增量修复记录（2026-04-19，P1 第六批第八段：工作台卡片与侧边栏导航事件绑定收口）

### 31.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. 工作台与侧边栏事件绑定第八段收口（`auth.js`）
- `showAdminDashboard` / `showFarmerDashboard` / `showRecyclerDashboard` / `showProcessorDashboard` 卡片点击由内联 `onclick` 改为 `data-dashboard-action` 分发。
- 新增 `bindDashboardActions(container)`，统一分发 `navigate/open-nearby`。
- `updateSidebar` 菜单链接由内联 `onclick` 改为 `data-nav-action + data-nav-page`。
- 新增 `bindSidebarActions(navList)`，统一分发 `navigate/logout`。

### 31.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-dashboard-action`、`data-nav-action`、`bindDashboardActions`、`bindSidebarActions` 均存在。

### 31.3 状态结论
- P1 第六批第八段已完成，工作台与侧边栏导航主路径内联点击模板继续下降。

## 32. 增量修复记录（2026-04-19，P1 第六批第九段：CMS 中心模板内联事件绑定收口）

### 32.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. CMS 事件绑定第九段收口（`auth.js`）
- `showCmsCenter` 中公告/案例/广告表单的上传与清空按钮由内联 `onclick` 改为 `data-cms-form-action` 分发。
- `loadCmsAnnouncements` / `loadCmsCases` / `loadCmsAds` 列表的编辑/删除按钮由内联 `onclick` 改为 `data-cms-list-action + data-cms-id`。
- 新增 `bindCmsTabActions(container)`、`bindCmsFormActions(container)`、`bindCmsListActions(listContainer)`，统一分发 tab 切换、表单动作与列表动作。

### 32.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-cms-form-action`、`data-cms-list-action`、`bindCmsTabActions`、`bindCmsFormActions`、`bindCmsListActions` 均存在。

### 32.3 状态结论
- P1 第六批第九段已完成，CMS 中心主路径内联点击模板继续下降。

## 33. 增量修复记录（2026-04-19，P1 第六批第十段：求购页入口与表单按钮内联事件绑定收口）

### 33.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. 求购页与表单事件绑定第十段收口（`auth.js`）
- `showRecyclerOrders` / `showProcessorOrders` 的“发布新求购”入口及处理商订单空态引导由内联 `onclick` 改为 `data-demand-entry-action`。
- `showPublishDemandForm` 中处理商草稿、回收商草稿/返回、回收商供应草稿按钮由内联 `onclick` 改为 `data-demand-form-action`。
- 新增 `bindDemandEntryActions(scope)` 与 `bindDemandFormActions(scope)`，统一分发导航与草稿保存动作。

### 33.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-demand-entry-action`、`data-demand-form-action`、`bindDemandEntryActions`、`bindDemandFormActions` 均存在。

### 33.3 状态结论
- P1 第六批第十段已完成，求购页入口与表单按钮主路径内联点击模板继续下降。