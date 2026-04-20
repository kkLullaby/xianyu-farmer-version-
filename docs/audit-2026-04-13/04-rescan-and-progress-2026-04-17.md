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
| BUG-004 认证与文档冲突 | 已修复 | 集成测试报告已重写为当前 uni-app + 服务端会话回源口径。 |
| BUG-005 哈希策略不一致 | 已修复 | register / register-phone / seed 已统一。 |
| BUG-006 查询越权可能 | 基本修复 | 抽样接口已绑定主体；需负向回归测试闭环。 |
| BUG-007 OTP 防刷不足 | 已修复 | 限流 + 冷却 +尝试次数已覆盖。 |
| BUG-008 多页面依赖 Mock | 已修复 | 关键业务页已完成后端化，保留持续回归。 |
| BUG-009 管理后台入口无功能 | 已修复 | settings/statistics/users 已完成基础可用版。 |
| BUG-010 短信服务 Mock | 已修复 | `smsClient.js` 已接阿里云模式并支持环境控制。 |
| BUG-011 架构文档偏离代码 | 未修复 | `docs/ARCHITECTURE.md` 未同步到 uni 主体。 |

---

## 6. TODO 阻断项进度（来自 03-unfinished-items）
| 编号 | 当前状态 | 说明 |
|---|---|---|
| TODO-001 登录占位 | 已完成 |
| TODO-002 短信 Mock | 已完成 |
| TODO-003 认证信任边界前端化 | 已完成 |
| TODO-004 processor_requests 未收敛 | 已完成 |
| TODO-005 管理设置占位 | 已完成 |
| TODO-006 管理统计占位 | 已完成 |
| TODO-007 用户管理占位 | 已完成 |
| TODO-008 关键业务依赖 Mock | 已完成 |
| TODO-009 文档未对齐 | 已完成 |

---

## 7. 建议下一批修复优先级
1. **转入下一阶段能力**：引入真实用户账号与短信注册真实链路（当前阶段按“不依赖真实手机号”范围已收口）。
2. **持续压实安全基线**：继续执行 `test:gates` + `test:p9` + `test:p10` + `test:p11`，防止认证与登录链路回退。
3. **补齐文档治理**：同步 `docs/ARCHITECTURE.md` 到 uni-app 主体事实。

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

## 34. 增量修复记录（2026-04-19，P1 第六批第十一段：农户申报说明按钮与电话占位模板收口）

### 34.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. 农户申报与电话占位模板第十一段收口（`auth.js`）
- `showNewReportForm` 的品级说明按钮由内联 `onclick` 改为 `data-report-form-action`，并改为渲染后绑定切换 `grade-info` 显示状态。
- 供货列表/货源列表/订单列表/处理商订单列表的 4 处 `href="javascript:void(0)"` 电话占位链接改为无脚本占位元素。

### 34.2 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-report-form-action`、`toggle-grade-info` 存在，`onclick="` 与 `javascript:void(0)` 在 `auth.js` 中无残留。

### 34.3 状态结论
- P1 第六批第十一段已完成，`auth.js` 历史内联模板与 `javascript:` 占位模板进一步下降。

## 35. 增量修复记录（2026-04-19，P1 第六批第十二段：index/main_code/nearby 页面模板内联事件绑定收口）

### 35.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. 入口页与周边页面第十二段收口（`index.html` / `main_code.js` / `farmer-nearby-recyclers.html`）
- `index.html` 的公告翻页、登录弹窗、意向弹窗按钮由内联 `onclick` 改为 `data-action`，新增 `bindIndexTemplateActions()` 统一分发。
- `main_code.js` 的提交按钮由内联 `onclick` 改为渲染后绑定。
- `farmer-nearby-recyclers.html` 的地图关闭按钮由内联 `onclick` 改为 `data-nearby-action`，新增 `bindNearbyActions()`。

### 35.2 验证结果
- `node --check main_code.js`：通过。
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`data-home-action`、`data-auth-ui-action`、`data-intention-action`、`bindIndexTemplateActions`、`data-nearby-action`、`bindNearbyActions`、`btn-submit-report` 均存在。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onclick="` 与 `javascript:void(0)` 均无残留。

### 35.3 状态结论
- P1 第六批第十二段已完成，旧 H5 入口页与周边页面模板内联事件继续下降。

## 36. 增量修复记录（2026-04-19，P1 第六批第十三段：index 页面 hover 内联事件收口）

### 36.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `index.html` hover 交互第十三段收口
- 页脚“隐私政策/服务协议”链接由内联 `onmouseover/onmouseout` 改为 `footer-policy-link` + CSS `:hover`。
- 首页动态“案例卡片/广告卡片”容器由内联 `onmouseover/onmouseout` 改为 `home-hover-card` + CSS `:hover`。

### 36.2 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`footer-policy-link`、`home-hover-card` 均存在。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均无残留。

### 36.3 状态结论
- P1 第六批第十三段已完成，`index.html` 剩余 hover 内联事件模板完成收口。

## 37. 增量修复记录（2026-04-19，P1 第六批第十四段：index 动态图片 onerror 内联事件收口）

### 37.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `index.html` 动态图片回退第十四段收口
- 公告大图、案例缩略图、案例 logo、广告图的内联 `onerror` 模板改为 `data-home-fallback` 标记。
- 新增 `createHomeFallbackNode(type)` 与 `bindHomeImageFallbacks(scope)`，在渲染后统一绑定错误回退逻辑。

### 37.2 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`data-home-fallback`、`createHomeFallbackNode`、`bindHomeImageFallbacks` 均存在。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onerror=`、`onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均无残留。

### 37.3 状态结论
- P1 第六批第十四段已完成，`index.html` 动态图片错误回退链路内联事件完成收口。

## 38. 增量修复记录（2026-04-19，P1 第六批第十五段：index onclick 属性绑定收口）

### 38.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `index.html` 点击绑定第十五段收口
- 协议弹窗相关节点（隐私/服务链接、关闭按钮、蒙层点击关闭）由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `bindIndexTemplateActions()` 中公告翻页、认证弹窗、意向弹窗三组分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

### 38.2 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`privacyLink.addEventListener`、`serviceLink.addEventListener`、`closeBtn.addEventListener`、`modal.addEventListener`、`bindIndexTemplateActions` 内三组 `addEventListener('click')` 均存在。
- 残留复查：`index.html` 中 `.onclick =` 无残留；`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onerror=`、`onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均无残留。

### 38.3 状态结论
- P1 第六批第十五段已完成，`index.html` 点击交互绑定进一步统一为事件监听模式。

## 39. 增量修复记录（2026-04-19，P1 第六批第十六段：main_code/nearby onclick 属性绑定收口）

### 39.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `main_code.js` / `farmer-nearby-recyclers.html` 点击绑定第十六段收口
- `main_code.js` 中 `submitBtn.onclick = ...` 改为 `addEventListener('click', ...)`。
- `farmer-nearby-recyclers.html` 中 `retryBtn.onclick = ...` 与 `bindNearbyActions` 内 `node.onclick = ...` 改为 `addEventListener('click', ...)`。
- 为 `bindNearbyActions` 新增 `data-nearby-action-bound` 防重复绑定保护，避免重复注册监听。

### 39.2 验证结果
- `get_errors main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`submitBtn.addEventListener('click', ...)`、`retryBtn.addEventListener('click', ...)`、`node.addEventListener('click', ...)`（`bindNearbyActions`）均存在。
- 残留复查：`main_code.js` 与 `farmer-nearby-recyclers.html` 中 `.onclick =`、`onclick=`、`javascript:void(0)` 均无残留。

### 39.3 状态结论
- P1 第六批第十六段已完成，旧 H5 周边页面点击交互绑定继续向事件监听模式收敛。

## 40. 增量修复记录（2026-04-19，P1 第六批第十七段：auth 求购列表 onclick 属性绑定收口）

### 40.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 求购列表点击绑定第十七段收口
- `loadProcessorDemands()` 中 `data-processor-demand-action` 分发绑定由 `btn.onclick = ...` 改为 `addEventListener('click', ...)`。
- `loadRecyclerDemands()` 中 `data-demand-action="intention"` 与 `data-processor-demand-action="intention"` 两组分发绑定由 `btn.onclick = ...` 改为 `addEventListener('click', ...)`。

### 40.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：三组按钮分发绑定均为 `btn.addEventListener('click', ...)`。
- 残留复查（目标模块）：上述三组分发绑定中的 `.onclick =` 无残留。

### 40.3 状态结论
- P1 第六批第十七段已完成，`auth.js` 求购链路列表交互绑定继续向事件监听模式收敛。

## 41. 增量修复记录（2026-04-19，P1 第六批第十八段：auth 多簇 onclick 属性绑定收口）

### 41.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第十八段多簇点击绑定收口（一次执行多步）
- `showNewReportForm`：`gradeToggleBtn` 与 `btn-save-draft` 的 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showMyReports` 与回收商订单页 `loadOrders`：`.filter-btn` 点击绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `loadProcessorOrders`、`loadMyDemands`、`bindRecyclerOrderActions`：三组分发按钮绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

### 41.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`gradeToggleBtn.addEventListener`、`saveDraftBtn.addEventListener`、两处 `.filter-btn` 的 `addEventListener('click')` 与三组动作按钮分发绑定均存在。
- 残留复查（目标簇）：第十八段目标簇中的 `.onclick =` 无残留。

### 41.3 状态结论
- P1 第六批第十八段已完成，`auth.js` 多个低风险点击交互簇在单轮内完成事件监听模式收口。

## 42. 增量修复记录（2026-04-19，P1 第六批第十九段：auth 供应/订单模块 onclick 属性绑定收口）

### 42.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第十九段多簇点击绑定收口（一次执行多步）
- `showSupplySources`：`data-source-action` 与 `.supply-source-tab` 绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showFarmerSupplies` 与 `bindSupplyActions`：刷新按钮与 `data-supply-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showRecyclerOrders`：`.tab-btn` 页签切换绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

### 42.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：五组目标绑定均为 `addEventListener('click', ...)`。
- 残留复查（目标簇）：第十九段目标簇中的 `.onclick =` 无残留。

### 42.3 状态结论
- P1 第六批第十九段已完成，`auth.js` 供应与订单链路在单轮多簇改造后保持稳定。

## 43. 增量修复记录（2026-04-19，P1 第六批第二十段：auth 分发函数 onclick 属性绑定收口）

### 43.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第20段分发函数收口（一次执行多步）
- `bindProcessorOrderActions`：`[data-processor-action]` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `bindReportActions`：`[data-action]` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `bindDemandEntryActions`：`[data-demand-entry-action]` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `bindDemandFormActions`：`[data-demand-form-action]` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

### 43.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：四个分发函数的目标节点均为 `addEventListener('click', ...)`。
- 残留复查（目标簇）：第20段目标簇中的 `.onclick =` 无残留。

### 43.3 状态结论
- P1 第六批第20段已完成，`auth.js` 分发函数层交互绑定在单轮内完成集中收口。

## 44. 增量修复记录（2026-04-19，P1 第六批第二十一段：auth 仲裁与证据上传链路 onclick 属性绑定收口）

### 44.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第21段同域多簇收口（一次执行多步）
- `showArbitrationCenter`：`.arbitration-tab` 与 `data-arb-submit-action` 两组绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `setupFilePreview`：`input.onchange` 改为 `input.addEventListener('change', ...)`，删除按钮 `removeBtn.onclick` 改为 `addEventListener('click', ...)`。
- `loadMyArbitrations`：`data-my-arb-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showArbitrationManagement` / `loadArbitrationRequests`：`.filter-btn` 与 `data-arb-list-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

### 44.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`.arbitration-tab`、`data-arb-submit-action`、`setupFilePreview`、`data-my-arb-action`、`.filter-btn`、`data-arb-list-action` 六组目标绑定均为 `addEventListener`。
- 残留复查（目标簇）：第21段目标簇中的 `.onclick =` 与 `input.onchange =` 无残留。

### 44.3 状态结论
- P1 第六批第21段已完成，`auth.js` 仲裁中心与证据上传链路交互绑定继续向事件监听模式收敛。

## 45. 增量修复记录（2026-04-19，P1 第六批第二十二段：auth 仲裁详情与罚款弹窗链路 onclick/onchange 属性绑定收口）

### 45.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第22段同域多簇收口（一次执行多步）
- `showArbitrationDetail`：文件预览节点与 `data-arb-detail-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`，加载失败回退按钮同步改造。
- `viewFile`：关闭按钮与背景点击关闭由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `setPenalty`：遮罩点击关闭与 `data-set-penalty-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `payPenalty`：遮罩点击关闭与 `data-pay-penalty-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`，`proofInput.onchange` 改为 `addEventListener('change', ...)`。

### 45.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-arb-detail-action`、`viewFile`、`data-set-penalty-action`、`data-pay-penalty-action`、`proofInput.addEventListener('change', ...)` 均存在。
- 残留复查（目标簇）：第22段目标簇中的 `.onclick =` 与 `.onchange =` 无残留。

### 45.3 状态结论
- P1 第六批第22段已完成，`auth.js` 仲裁详情与罚款弹窗主链路交互绑定继续向事件监听模式收敛。

## 46. 增量修复记录（2026-04-19，P1 第六批第二十三段：auth 非仲裁残留 onclick/onchange 属性绑定收口）

### 46.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. `auth.js` 第23段低风险多簇收口（一次执行多步）
- `bindCmsTabActions` / `bindCmsFormActions` / `bindCmsListActions`：分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `bindDashboardActions` / `bindSidebarActions`：分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `updateNavbar`：登录按钮由 `.onclick = ...` 改为单次 `addEventListener('click', ...)` 绑定 + `data-auth-navbar-action` 分发。
- `viewIntentions`：`data-intention-action` 分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `supply-sort`、两处 `demand-permanent`、`target-type`：由 `.onchange = ...` 改为 `addEventListener('change', ...)`。

### 46.2 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`bindCmsTabActions`、`bindDashboardActions`、`bindSidebarActions`、`updateNavbar`、`viewIntentions`、`supply-sort`、`demand-permanent`、`target-type` 相关 `addEventListener('click'/'change', ...)` 均存在。
- 残留复查（目标簇）：第23段目标簇中的 `.onclick =` 与 `.onchange =` 无残留。

### 46.3 状态结论
- P1 第六批第23段已完成，`auth.js` 非仲裁低风险交互簇在单轮内完成集中收口。

## 47. 增量修复记录（2026-04-19，P1 第六批第二十四段：跨文件 on* 属性绑定清零收口）

### 47.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 判定：P0/P1/P2 均通过，未出现影响结论的限流噪声。

2. 跨文件低风险合并收口
- `auth.js`：剩余 `.onsubmit = ...` 绑定改为 `addEventListener('submit', ...)`，覆盖 CMS、申报、求购/供应、仲裁提交表单。
- `userProfile.js`：`renderListGroup` 列表项移除内联 `onmouseover/onmouseout`，改为 class + CSS `:hover`。

### 47.2 验证结果
- `get_errors auth.js/userProfile.js`：无新增错误。
- 关键锚点复查：`addEventListener('submit', ...)`、`profile-list-item` 与 `.profile-list-item:hover` 均存在。
- 全量残留复扫：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html/userProfile.js` 中目标 `on*` 模式无命中。

### 47.3 状态结论
- P1 第六批第24段已完成，跨文件事件属性绑定在当前阶段完成清零收口。

## 48. 增量修复记录（2026-04-19，P1 第六批第二十五段：Step2 安全门禁项收口）

### 48.1 本轮完成项
1. 自动化回归先行
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- `npm run test:p3`：通过（fresh server instance，包含 401/403 角色权限负向链路与审计日志校验）。

2. 安全门禁代码收口（一次执行多步）
- `server.js`：新增 `/api` 安全审计中间件，统一记录 `401/403/429` 到 `logs/security-audit.log`。
- `server.js`：新增全局 `Content-Security-Policy`、`Referrer-Policy`、`Permissions-Policy`，并按 HTTPS 条件下发 HSTS。
- `server.js`：鉴权失败与越权关键路径补充 `securityAuditReason`（`AUTH_HEADER_MISSING`、`AUTH_TOKEN_INVALID`、`LOGIN_BAD_CREDENTIALS`、`ADMIN_ROLE_REQUIRED`）。
- `tests/api_tests/test-p3-authz-negative.js`：新增负向权限自动化脚本并接入 `package.json` 的 `test:p3`。

3. 文档门禁收口
- 新增 `docs/security/SECURITY_BASELINE.md`：统一上传安全、审计日志、CSP/安全头规范（TODO-020/021/022）。
- 更新 `docs/README.md`：固化 Step2 安全回归命令与里程碑放行条件（TODO-024）。

### 48.2 验证结果
- `node --check server.js`：通过。
- `get_errors server.js`：无新增错误。
- 负向权限接口返回与日志增量一致：`401/403` 响应与审计日志事件可对应。

### 48.3 状态结论
- P1 第六批第25段已完成，Step2 门禁项 TODO-020/021/022/023/024 在本轮达成闭环。

## 49. 增量修复记录（2026-04-19，Step2 收官复扫与签收）

### 49.1 本轮完成项
1. 最终回归复扫
- `BASE_URL=http://localhost:4304 npm run test:p0`：通过。
- `BASE_URL=http://localhost:4301 npm run test:p1`：通过。
- `BASE_URL=http://localhost:4302 npm run test:p2`：通过。
- `BASE_URL=http://localhost:4303 npm run test:p3`：通过。

2. 证据台账登记
- `evidence/regression/2026-04-19_step2-final-gates_kk.md`
- `evidence/security/2026-04-19_step2-authz-audit-log_kk.md`

3. 收官文档登记
- 新增 `09-step2-closure-2026-04-19.md`，完成 Step2 收官判定与 Step3 移交。

### 49.2 验证结果
- 关键门禁命令连续通过，无新增阻断异常。
- 审计日志中 `401/403` 事件可与负向权限用例对应。
- `00/03/05/07/08/09` 与 `evidence/README.md` 状态一致。

### 49.3 状态结论
- Step2（第六批与安全门禁子范围）已完成收官签收，可进入 Step3（鲁棒性专项）。

## 50. 增量修复记录（2026-04-20，Step3-B1 第一段：审计日志轮转与留存上限）

### 50.1 本轮完成项
1. `server.js` 审计日志增强
- 新增 `SECURITY_AUDIT_LOG_MAX_MB` 与 `SECURITY_AUDIT_LOG_MAX_FILES` 配置解析。
- 新增 `rotateSecurityAuditLogsIfNeeded` 轮转函数：超过阈值时归档为 `.1/.2...`。
- 管理端运行时安全快照新增轮转状态与阈值字段。

2. 轮转功能验证
- 启动参数：`PORT=4310 SECURITY_AUDIT_LOG_MAX_MB=0.01 SECURITY_AUDIT_LOG_MAX_FILES=2`。
- 连续触发未授权请求后，`logs/security-audit.log.1` 生成，轮转生效。

3. 回归验证
- `BASE_URL=http://localhost:4311 npm run test:p3`：通过。

### 50.2 验证结果
- `node --check server.js`：通过。
- `get_errors server.js`：无新增错误。
- 低阈值轮转验证 + `test:p3` 回归均通过。

### 50.3 状态结论
- Step3-B1 第一段完成，审计日志可靠性从“单文件增长”提升为“可控轮转归档”。

## 51. 增量修复记录（2026-04-20，Step3-B1 第二段：失败路径矩阵 V1 + 负向异常用例）

### 51.1 本轮完成项
1. 失败路径矩阵 V1 建立
- 新增 `12-step3-failure-path-matrix-v1-2026-04-20.md`，统一编号并登记场景状态（FP-001~FP-007）。

2. 自动化负向脚本落地
- 新增 `tests/api_tests/test-p4-failure-paths.js`，覆盖：
  - 资源不可用（不存在仲裁文件 -> 404）
  - 依赖不可用（地图配置缺失 -> 503）
  - 并发冲突（同一意向并发受理 -> 200/409）
  - 登录限流（连续错误登录 -> 429）
- `package.json` 已新增命令 `npm run test:p4`。

3. 证据归档
- 新增 `evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`。

### 51.2 验证结果
- `node --check tests/api_tests/test-p4-failure-paths.js`：通过。
- `BASE_URL=http://localhost:4312 npm run test:p4`：通过。
- 输出摘要：`[P4] Failure-path tests passed.`，`amap=unavailable-503`，`loginStatuses=401,401,429,429,429,429`。

### 51.3 状态结论
- Step3-B1 第二段完成：失败路径矩阵 V1 与首批自动化负向用例已形成闭环。
- Step3-B1 第三段入口：补齐超时失败路径自动化（矩阵项 FP-005）。

## 52. 增量修复记录（2026-04-20，Step3-B1 第三段：FP-005 超时失败路径补齐）

### 52.1 本轮完成项
1. 超时路径代码支撑
- `server.js`：`GET /api/admin/settings/runtime` 增加非生产可控延迟模拟（`simulate_delay_ms`，带上限保护）。

2. 自动化脚本补齐
- `tests/api_tests/test-p4-failure-paths.js` 新增超时失败路径断言：
  - 请求 `GET /api/admin/settings/runtime?simulate_delay_ms=1500`
  - 客户端 `timeoutMs=300`，通过 `AbortController` 触发超时中止
  - 断言 `timeout=true`

3. 证据归档
- 新增 `evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`。

### 52.2 验证结果
- `node --check server.js`：通过。
- `node --check tests/api_tests/test-p4-failure-paths.js`：通过。
- `BASE_URL=http://localhost:4313 npm run test:p4`：通过。
- 输出摘要：`[P4] Failure-path tests passed.`，`timeout=true`。

### 52.3 状态结论
- Step3-B1 第三段完成，FP-005（超时）已纳入自动化。
- 失败路径矩阵 V1（FP-001~FP-007）当前全部完成。
- 下一入口：Step3-B1 第四段（重试/降级路径扩展，预留 FP-008/FP-009）。

## 53. 增量修复记录（2026-04-20，Step3-B1 第四段：FP-008/FP-009 重试与降级路径）

### 53.1 本轮完成项
1. 降级触发能力补齐
- `server.js`：`GET /api/config/amap` 增加非生产强制依赖不可用开关（`force_unavailable=1`）。

2. 自动化脚本扩展
- `tests/api_tests/test-p4-failure-paths.js` 新增：
  - FP-008 重试恢复：首次超时后立即重试返回 `200`。
  - FP-009 降级回退：强制地图依赖 `503` 时，核心管理接口仍可用。

3. 证据归档
- 新增 `evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`。

### 53.2 验证结果
- `node --check server.js`：通过。
- `node --check tests/api_tests/test-p4-failure-paths.js`：通过。
- `BASE_URL=http://localhost:4314 npm run test:p4`：通过。
- 输出摘要：`degrade=forced-503-core-ok`，`retry=timeout-then-success`。

### 53.3 状态结论
- Step3-B1 第四段完成，FP-008/FP-009 已纳入自动化。
- `test:p4` 当前覆盖：资源不可用、依赖不可用、并发冲突、超时、重试、降级、限流。
- 下一入口：Step3-B2（门禁合并执行与执行手册固化）。

## 54. 增量修复记录（2026-04-20，Step3-B2：门禁合并执行与执行手册固化）

### 54.1 本轮完成项
1. 合并门禁执行器落地
- 新增 `tests/api_tests/run-step3-b2-gates.js`。
- 顺序执行 `test:p0 -> test:p1 -> test:p2 -> test:p3 -> test:p4`。
- 每个脚本使用 fresh server instance（独立端口 `4320~4324`）。

2. 命令入口统一
- `package.json` 新增 `npm run test:gates`，作为 Step3-B2 合并门禁入口。

3. 执行手册与证据固化
- 新增执行手册：`13-step3-b2-merged-gates-runbook-2026-04-20.md`。
- 新增回归证据：`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`。

### 54.2 验证结果
- `npm run test:gates`：通过。
- 输出摘要：`test:p0~test:p4` 全部 `PASS`，汇总结论 `Step3-B2 合并门禁通过`。

### 54.3 状态结论
- Step3-B2 已完成“合并门禁执行 + 手册固化”闭环。
- 下一入口：Step3-B3（跨端降级场景扩展与可观测告警联动评估）。

## 55. 增量修复记录（2026-04-20，Step3-B3：跨端降级契约与可观测告警联动）

### 55.1 本轮完成项
1. 跨端降级契约补齐
- `server.js`：`GET /api/config/amap` 在不可用场景下返回标准结构化降级信息：
  - `data.error_code=AMAP_UNAVAILABLE`
  - `data.reason`（区分强制降级与未配置）
  - `data.degrade.fallback=manual-address`

2. 可观测告警快照落地
- `server.js`：`GET /api/admin/settings/runtime` 新增 `observability`：
  - `recent_security_events`（最近窗口 `401/403/429` 统计）
  - `active_alerts`（按阈值计算的活跃告警）
  - `dependency_health`（依赖健康摘要）

3. 自动化断言扩展
- `tests/api_tests/test-p4-failure-paths.js` 新增：
  - 地图降级契约字段断言（`error_code` + `degrade.fallback`）
  - 可观测告警联动断言（`status_429` 计数 + `SECURITY_RATE_LIMIT_SPIKE`）

### 55.2 验证结果
- `npm run test:gates`：通过。
- 输出摘要：`test:p0~test:p4` 全部 `PASS`。
- `test:p4` 摘要新增：`observability=rate-limit-alert-linked`。

### 55.3 状态结论
- Step3-B3 已完成“跨端降级契约 + 可观测告警联动 + 自动化验证”闭环。
- 下一入口：Step3-B4（告警演练脚本与可观测门禁模板固化）。

## 56. 增量修复记录（2026-04-20，Step3-B4：告警演练脚本与可观测门禁模板固化）

### 56.1 本轮完成项
1. 告警演练脚本落地
- 新增 `tests/api_tests/test-p5-observability-alert-drill.js`。
- 覆盖 `401/403/429` 三类事件触发与 `active_alerts` 三类告警码断言。

2. 合并门禁扩展
- `tests/api_tests/run-step3-b2-gates.js` 扩展到 `test:p5`。
- p5 场景注入低阈值环境变量：`SECURITY_ALERT_AUTHN_THRESHOLD=5`、`SECURITY_ALERT_AUTHZ_THRESHOLD=4`、`SECURITY_ALERT_RATE_LIMIT_THRESHOLD=2`。

3. 文档与证据模板固化
- 更新执行手册 `13-step3-b2-merged-gates-runbook-2026-04-20.md`，纳入 `p0~p5`。
- 新增执行文档 `15-step3-b4-observability-drill-and-gate-template-2026-04-20.md`。
- 新增证据 `evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`。

### 56.2 验证结果
- `node --check tests/api_tests/test-p5-observability-alert-drill.js`：通过。
- `node --check tests/api_tests/run-step3-b2-gates.js`：通过。
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- `test:p5` 输出摘要：
  - `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
  - `recent401=26, recent403=22, recent429=18`

### 56.3 状态结论
- Step3-B4 已完成“告警演练脚本 + 合并门禁纳管 + 证据模板”闭环。
- 下一入口：Step4-B1（可观测性补齐：指标面板与值班告警说明）。

## 57. 增量修复记录（2026-04-20，Step4-B1：可观测性基线与值班模板）

### 57.1 本轮完成项
1. Step4 进入文档落地
- 新增 `16-step4-entry-and-b1-observability-baseline-2026-04-20.md`。
- 已固化指标面板映射、告警分级与值班响应模板。

2. 证据归档落地
- 新增 `evidence/observability/2026-04-20_step4-b1-observability-baseline_kk.md`。
- 记录 `test:p5` 告警演练摘要与基线统计值。

3. 阶段状态同步
- `00-index.md` 已切换到 Step4 In Progress。
- `05-release-readiness-phase-plan-2026-04-17.md` 已同步 Step4-B1 完成状态。
- `10-step3-entry-and-workplan-2026-04-19.md` 已完成 Step3 收官判定。
- `evidence/README.md` 已纳入 Step4-B1 可观测证据。

### 57.2 验证结果
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- `test:p5` 摘要：
  - `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
  - `recent401=26, recent403=22, recent429=18`

### 57.3 状态结论
- Step4-B1 已完成“可观测基线定义 + 告警分级 + 值班响应模板 + 证据归档”闭环。
- 下一入口：Step4-B2（告警路由演练与值班交接演习）。

## 58. 增量修复记录（2026-04-20，Step4-B2：告警路由与值班交接演练）

### 58.1 本轮完成项
1. 演练文档落地
- 新增 `17-step4-b2-alert-routing-and-handover-drill-2026-04-20.md`。
- 固化告警路由规则、值班交接动作与 Step4 收官判定。

2. 证据归档
- 新增 `evidence/observability/2026-04-20_step4-b2-alert-routing-and-handover_kk.md`。
- 记录值班模板实填与升级链路演练。

3. 阶段状态同步
- `00-index.md`、`05-release-readiness-phase-plan-2026-04-17.md`、`evidence/README.md` 已纳入 Step4-B2 结果。

### 58.2 验证结果
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- `test:p5` 摘要：
  - `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
  - `recent401=39, recent403=33, recent429=27`

### 58.3 状态结论
- Step4-B2 已完成“告警路由演练 + 值班交接演练 + 证据归档”闭环。
- Step4 阶段收官，下一入口：Step5-B1（迁移与回滚演练自动化）。

## 59. 增量修复记录（2026-04-20，Step5-B1：迁移与回滚演练自动化）

### 59.1 本轮完成项
1. 自动化脚本落地
- 新增 `tests/api_tests/test-p6-release-drill.js`。
- 覆盖：数据库备份 -> `--init` 迁移演练 -> 备份回滚 -> 回滚后健康检查。

2. 命令入口统一
- `package.json` 新增 `test:p6` 与 `test:release-drill`。

3. 文档与证据归档
- 新增 `18-step5-entry-and-b1-release-drill-2026-04-20.md`。
- 新增 `evidence/release-drill/2026-04-20_step5-b1-migration-rollback-drill_kk.md`。

### 59.2 验证结果
- `node --check tests/api_tests/test-p6-release-drill.js`：通过。
- `npm run test:p6`：通过。
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- `test:p6` 哈希摘要：
  - `before=7abaa0acd52f`
  - `afterInit=d750040ff702`
  - `afterRollback=7abaa0acd52f`

### 59.3 状态结论
- Step5-B1 已完成“迁移演练 + 回滚演练 + 健康校验 + 文档证据”闭环。
- 下一入口：Step5-B2（灰度与应急流程联合演练）。

## 60. 增量修复记录（2026-04-20，Step5-B2：灰度与应急流程联合演练）

### 60.1 本轮完成项
1. 联合演练脚本落地
- 新增 `tests/api_tests/test-p7-gray-rollback-drill.js`。
- 覆盖：10%/30%/50% 灰度检查点 + 应急回滚决策链路演练。

2. 命令入口补齐
- `package.json` 新增 `test:p7` 与 `test:gray-drill`。

3. 文档与证据归档
- 新增 `19-step5-b2-gray-and-emergency-drill-2026-04-20.md`。
- 新增 `evidence/release-drill/2026-04-20_step5-b2-gray-emergency-drill_kk.md`。

### 60.2 验证结果
- `node --check tests/api_tests/test-p7-gray-rollback-drill.js`：通过。
- `npm run test:p7`：通过。
- 灰度检查点：
  - 10%：PASS（3.4s）
  - 30%：PASS（3.7s）
  - 50%：PASS（4.3s）
- 回滚演练：PASS（2.9s，`scheduled-drill-after-50%`）。
- 回滚内部 `test:p6` 哈希摘要：
  - `before=4584b1256434`
  - `afterInit=b1b5dd7ac050`
  - `afterRollback=4584b1256434`
- `test:p5` 本轮统计：`recent401=39, recent403=31, recent429=27`。

### 60.3 状态结论
- Step5-B2 已完成“灰度检查点 + 应急回滚链路 + 证据归档”闭环。
- Step5 阶段收官，下一入口：Step6-B1（小流量准备与门槛确认）。

## 61. 增量修复记录（2026-04-20，Step6-B1：小流量准备与门槛确认）

### 61.1 本轮完成项
1. 阶段入口文档落地
- 新增 `20-step6-entry-and-b1-canary-readiness-2026-04-20.md`。

2. 小流量门槛固化
- 已定义 10%/30%/50% 观察窗口目标。
- 已定义阻断故障、连续 SEV-2 告警、门禁失败三类回滚触发阈值。

### 61.2 状态结论
- Step6-B1 已完成启动基线，进入 Step6-B2（真实小流量窗口执行与决策记录）。

## 62. 增量修复记录（2026-04-20，Step6-B1：TODO-004 processor_requests 收口）

### 62.1 本轮完成项
1. 生命周期回归脚本落地
- 新增 `tests/api_tests/test-p8-processor-request-lifecycle.js`。
- 覆盖：创建、更新、字段映射、接单、防重复接单、状态流转与市场列表可见性。

2. 命令入口补齐
- `package.json` 新增 `test:p8` 与 `test:processor-lifecycle`。

3. 证据归档
- 新增 `evidence/regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md`。

### 62.2 验证结果
- `node --check tests/api_tests/test-p8-processor-request-lifecycle.js`：通过。
- `npm run test:processor-lifecycle`：通过（fresh server 自动拉起）。
- 输出摘要：`requestId=56, recyclerId=3, secondAcceptStatus=400`。
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。

### 62.3 状态结论
- TODO-004 对应的 BUG-001/BUG-002 已完成“模型收敛 + 生命周期回归”闭环。
- Step6 下一入口保持：Step6-B2（真实小流量窗口执行与决策记录）。

## 63. 增量修复记录（2026-04-20，Step6-B2：TODO-003 认证信任边界收敛）

### 63.1 本轮完成项
1. 首页认证入口统一
- `src/pages/index/index.vue` 移除手写 `/api/me` 请求与本地角色判定，统一复用 `src/utils/session.js` 的 `syncSessionFromServer + roleAllowed`。

2. 会话失效清理补齐
- `src/utils/request.js` 在 401 分支统一清理 `agri_auth_token/current_role/current_user_name/current_user_phone`，避免失效会话残留。

3. 自动化防回退落地
- 新增 `tests/api_tests/test-p9-auth-trust-boundary.js`。
- `package.json` 新增 `test:p9` 与 `test:auth-boundary`。

4. 文档与证据归档
- 新增 `21-step6-b2-auth-trust-boundary-hardening-2026-04-20.md`。
- 新增 `evidence/regression/2026-04-20_step6-b2-auth-trust-boundary_kk.md`。

### 63.2 验证结果
- `node --check tests/api_tests/test-p9-auth-trust-boundary.js`：通过。
- `npm run test:p9`：通过。
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- 本轮观测摘要：
  - `test:p4`: `intentionId=59, loginStatuses=401,401,429,429,429,429`
  - `test:p5`: `recent401=26, recent403=24, recent429=18`

### 63.3 状态结论
- TODO-003 已完成“前端角色缓存去信任化 + 统一服务端会话同步 + 自动化防回退”闭环。
- 下一修复入口：TODO-001（登录页占位）与 TODO-002（短信通道真实化）。

## 64. 增量修复记录（2026-04-20，Step6-B2：TODO-002 短信运行态门禁收敛）

### 64.1 本轮完成项
1. 短信门禁能力补齐
- `smsClient.js` 新增 `getSmsRuntimeStatus` 与 `ensureSmsRuntimeReady`，统一短信通道解析与运行态判定。

2. 启动硬阻断落地
- `server.js` 启动阶段接入短信运行态校验：生产环境命中 Mock 或阿里云配置缺失时，服务直接拒绝启动。

3. 运行态可观测增强
- `/api/admin/settings/runtime` 复用短信运行态状态，新增 `sms_provider_configured/sms_runtime_ready/sms_runtime_block_reason`。

4. 自动化防回退落地
- 新增 `tests/api_tests/test-p10-sms-runtime-guard.js`。
- `package.json` 新增 `test:p10` 与 `test:sms-runtime`。

5. 文档与证据归档
- 新增 `22-step6-b2-sms-runtime-guard-hardening-2026-04-20.md`。
- 新增 `evidence/security/2026-04-20_step6-b2-sms-runtime-guard_kk.md`。

### 64.2 验证结果
- `node --check tests/api_tests/test-p10-sms-runtime-guard.js`：通过。
- `npm run test:p10`：通过。
- `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- 本轮观测摘要：
  - `test:p4`: `intentionId=61, loginStatuses=401,401,429,429,429,429`
  - `test:p5`: `recent401=26, recent403=22, recent429=18`

### 64.3 状态结论
- TODO-002 已完成“生产环境短信通道 Mock 禁止 + 启动硬阻断 + 自动化防回退”闭环。

## 65. 增量修复记录（2026-04-20，Step6-B2：TODO-001/TODO-009 收口 + 上线收口测试）

### 65.1 本轮完成项
1. 登录收口自动化补齐
- 新增 `tests/api_tests/test-p11-login-readiness.js`。
- `package.json` 新增 `test:p11` 与 `test:login-readiness`。
- 覆盖：登录页静态非占位、`/api/login`、`/api/me`、错误密码 `401`。

2. 认证验收文档对齐
- `docs/ai_logs/INTEGRATION_TEST_REPORT.md` 已重写为当前 uni-app + 服务端会话回源口径。
- 旧 H5（`index.html/auth.js`）历史结论不再作为当前上线验收依据。

3. 台账与索引同步
- `03-unfinished-items.md`：TODO-001、TODO-009 已更新为“已完成”。
- `02-bug-findings.md`：BUG-003、BUG-004 已更新为“已完成”。
- `00-index.md`、`05-release-readiness-phase-plan-2026-04-17.md`、`evidence/README.md` 已同步。
- 新增执行文档 `23-step6-b2-login-and-doc-alignment-2026-04-20.md`。

4. 证据归档
- 新增 `evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md`。

### 65.2 验证结果
- `node --check tests/api_tests/test-p11-login-readiness.js`：通过。
- `npm run test:p11`：通过（`[P11] userId=2, role=farmer`）。
- 收口上线测试（不依赖真实手机号）全通过：
  - `npm run test:gray-drill`：通过（灰度 10%/30%/50% + 回滚演练通过）。
  - `npm run test:processor-lifecycle`：通过。
  - `npm run test:auth-boundary`：通过。
  - `npm run test:sms-runtime`：通过。
  - `npm run test:login-readiness`：通过。
  - `npm run test:gates`：通过（`test:p0~test:p5` 全部 PASS）。
- 本轮观测摘要：
  - `gray-drill -> test:p4`: `intentionId=65`
  - `gray-drill -> test:p5`: `recent401=31, recent403=26, recent429=22`
  - `test:gates -> test:p4`: `intentionId=67, loginStatuses=401,401,429,429,429,429`
  - `test:gates -> test:p5`: `recent401=45, recent403=38, recent429=31`

### 65.3 状态结论
- TODO-001 已完成：登录页收口可复跑，阻断风险解除。
- TODO-009 已完成：认证实现与验收文档口径一致。
- 当前“不依赖真实手机号鉴权”的收口目标已完成。
- 下一入口：引入真实用户账号与短信注册真实链路后，执行 Step6 真实小流量窗口验证。
- 下一入口文档：`24-step6-final-weekly-closure-report-2026-04-20.md`。

## 66. 最终复扫记录（2026-04-20，Step6 收尾周报）

### 66.1 本轮完成项
1. 全量门禁与演练复验
- `npm run test:gates`：通过（`test:p0~test:p5` 全绿）。
- `npm run test:release-drill`：通过（迁移与回滚哈希一致）。
- `npm run test:gray-drill`：通过（10%/30%/50% + 应急回滚）。
- `npm run test:processor-lifecycle`：通过。
- `npm run test:auth-boundary`：通过。
- `npm run test:sms-runtime`：通过。
- `npm run test:login-readiness`：通过。

2. 安全动态探测复验
- 临时服务探测：`/server.js`、`/data/agri.db`、`/db/schema.sql` 均返回 `404`，根目录静态暴露未回归。
- 兼容入口探测：`/auth.js`、`/main_code.js`、`/index.html` 返回 `200`，旧 H5 入口仍对外可达（历史兼容）。

3. 静态复扫补充
- 未检出 `query.token`、`?token=`、`getTokenFromRequest` 路径。
- 安全头仍在：`X-Content-Type-Options`、`X-Frame-Options`、`Content-Security-Policy`、`Referrer-Policy`、`Permissions-Policy`、HTTPS 条件 HSTS。
- 旧 H5 渲染残余计数：`innerHTML =` 命中 `auth.js:95`、`index.html:6`、`main_code.js:1`、`userProfile.js:9`。
- 内联 HTML 事件属性（`onclick="..."` 等）未命中，`javascript:void(0)` 未命中。

4. 周收尾文档与证据归档
- 新增收尾报告：`24-step6-final-weekly-closure-report-2026-04-20.md`。
- 新增证据：`evidence/regression/2026-04-20_step6-final-rescan-and-weekly-closure_kk.md`。

### 66.2 本轮观测摘要
- `test:gates -> test:p4`：`intentionId=71, loginStatuses=401,401,429,429,429,429`
- `test:gates -> test:p5`：`recent401=26, recent403=22, recent429=18`
- `test:release-drill`：`before=e347dc476341, afterInit=3a3c5b70c8ca, afterRollback=e347dc476341`
- `test:gray-drill -> test:p5`：`recent401=39, recent403=32, recent429=27`
- `test:p8`：`requestId=67, recyclerId=3, secondAcceptStatus=400`
- `test:p11`：`userId=2, role=farmer`

### 66.3 状态结论
- Step6 在“非真实手机号链路”范围内已达到上线测试收尾条件。
- 本周工作完成“修复 + 自动化 + 文档 + 证据”闭环，可进入下一窗口上线测试。
- 风险余额主要为旧 H5 历史渲染残余与文档台账漂移（非当前范围阻断）。