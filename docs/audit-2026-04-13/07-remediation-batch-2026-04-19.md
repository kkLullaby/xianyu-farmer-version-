# 增量修复归档（2026-04-19，非防飞单批次）

## 1. 本轮目标
在不改动防飞单专项结论的前提下，继续推进 4-13 审计中“未完成项”的收敛，重点处理：
1. 管理端占位页。
2. 业务页 Mock 数据残留。
3. 审核页硬编码示例数据。
4. 对应文档状态同步。

## 2. 已完成改动

### 2.1 管理端 API 补齐（后端）
- 新增管理员用户列表接口：
  - [server.js](../../server.js#L833) `GET /api/admin/users`
- 新增管理员统计总览接口：
  - [server.js](../../server.js#L920) `GET /api/admin/statistics/overview`
- 新增管理员运行配置快照接口：
  - [server.js](../../server.js#L972) `GET /api/admin/settings/runtime`

### 2.2 管理端页面去占位（前端）
- 用户管理页改为真实数据列表与筛选：
  - [src/pages/admin/users/index.vue](../../src/pages/admin/users/index.vue#L4)
  - [src/pages/admin/users/index.vue](../../src/pages/admin/users/index.vue#L161)
- 数据统计页改为真实指标看板：
  - [src/pages/admin/statistics/index.vue](../../src/pages/admin/statistics/index.vue#L4)
  - [src/pages/admin/statistics/index.vue](../../src/pages/admin/statistics/index.vue#L118)
- 系统设置页改为运行/安全配置快照：
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue#L4)
  - [src/pages/admin/settings/index.vue](../../src/pages/admin/settings/index.vue#L178)
- 管理控制台“数据统计”入口改为真实跳转：
  - [src/pages/admin/dashboard/index.vue](../../src/pages/admin/dashboard/index.vue#L23)

### 2.3 业务页去 Mock
- 商户财务页改为基于真实订单计算收益与流水：
  - [src/pages/merchant/finance/index.vue](../../src/pages/merchant/finance/index.vue#L11)
  - [src/pages/merchant/finance/index.vue](../../src/pages/merchant/finance/index.vue#L153)
- 处理商供货页改为真实接口拉取货源：
  - [src/pages/processor/supply/index.vue](../../src/pages/processor/supply/index.vue#L192)
  - [src/pages/processor/supply/index.vue](../../src/pages/processor/supply/index.vue#L197)

### 2.4 审核页硬编码样例清理
- 移除 `originalFarmerMockList` / `originalMerchantMockList` / `originalProcessorMockList` 静态样例：
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue#L153)
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue#L188)
  - [src/pages/admin/audit/index.vue](../../src/pages/admin/audit/index.vue#L192)

### 2.5 管理审核流后端化（继续收敛）
- `src/pages/admin/audit/index.vue` 已从本地 `global_*` 审核流切换为真实 API 驱动：
  - 拉取：`GET /api/farmer-reports?status=all`
  - 拉取：`GET /api/recycler-requests?status=all`
  - 拉取：`GET /api/processor-requests?status=all`
  - 审批：`PATCH /api/farmer-reports/:id/status`
  - 审批：`PATCH /api/recycler-requests/:id/status`
  - 审批：`PATCH /api/processor-requests/:id/status`
- 同步移除审核页抽成弹窗的本地状态持久化流程，避免前端本地审核结果与后端状态漂移。

### 2.6 发布/申报入口去本地 Mock
- 农户申报创建页改为真实提交：
  - [src/pages/farmer/report/create.vue](../../src/pages/farmer/report/create.vue)
  - 接口：`POST /api/farmer-reports`
- 回收商求购发布页改为真实提交：
  - [src/pages/merchant/demand/publish.vue](../../src/pages/merchant/demand/publish.vue)
  - 接口：`POST /api/recycler-requests`
- 处理商求购发布页改为真实提交：
  - [src/pages/processor/demand/publish.vue](../../src/pages/processor/demand/publish.vue)
  - 接口：`POST /api/processor-requests`
- 以上页面均已移除 `global_report_list/global_audit_list/global_demand_list` 本地写入与 `setTimeout` 模拟提交流程。

### 2.7 农户供需大厅后端化（本轮继续）
- 农户供需大厅已改为真实需求列表聚合：
  - [src/pages/farmer/demand-hall/index.vue](../../src/pages/farmer/demand-hall/index.vue)
  - 拉取：`GET /api/purchase-requests`
  - 拉取：`GET /api/processor-requests?for_farmers=true`
- 意向提交已改为后端写入：
  - 接口：`POST /api/intentions`
- 已移除 `global_demand_list` 与 `global_intentions` 本地存储链路、静态示例卡片与本地提交流程。

### 2.8 意向中心与附近回收点后端化（本轮继续）
- 意向中心“收到的意向”改为后端拉取与状态流转：
  - [src/pages/merchant/intentions/index.vue](../../src/pages/merchant/intentions/index.vue)
  - [src/pages/processor/intentions/index.vue](../../src/pages/processor/intentions/index.vue)
  - 拉取：`GET /api/recycler-requests?status=all` / `GET /api/processor-requests?status=all`
  - 拉取：`GET /api/intentions?target_type=...&target_id=...`
  - 处理：`PATCH /api/intentions/:id/status`
- “我的意向”改为按当前登录用户查询：
  - [src/pages/profile/intentions/index.vue](../../src/pages/profile/intentions/index.vue)
  - 拉取：`GET /api/intentions?applicant_id=...`
- 农户附近回收点页面改为真实附近点 + 真实意向投递：
  - [src/pages/farmer/nearby/index.vue](../../src/pages/farmer/nearby/index.vue)
  - 拉取：`GET /api/recyclers/nearby`
  - 拉取：`GET /api/purchase-requests`
  - 提交：`POST /api/intentions`
- 上述 4 个页面已移除 `global_intentions` 本地读写。

## 3. 验证记录
- 静态错误检查：本轮改动文件 `get_errors` 无新增错误。
- 后端语法检查：
  - `node --check server.js` 通过。

- 前端本地 Mock 关键字复查：
  - 已确认 `src/pages/admin/audit/index.vue`
  - 已确认 `src/pages/farmer/report/create.vue`
  - 已确认 `src/pages/merchant/demand/publish.vue`
  - 已确认 `src/pages/processor/demand/publish.vue`
  - 已确认 `src/pages/farmer/demand-hall/index.vue`
  - 已确认 `src/pages/farmer/nearby/index.vue`
  - 已确认 `src/pages/merchant/intentions/index.vue`
  - 已确认 `src/pages/processor/intentions/index.vue`
  - 已确认 `src/pages/profile/intentions/index.vue`
  - 上述文件无 `global_report_list/global_audit_list/global_demand_list/global_intentions` 命中。

## 4. 对未完成项的状态影响
- 可判定“阶段完成（基础可用版）”的项：
  - TODO-005 管理端设置页占位
  - TODO-006 管理端统计页占位
  - TODO-007 用户管理页占位
  - TODO-013 财务页模拟数据
  - TODO-014 处理商供货页模拟数据
  - TODO-008 多关键业务依赖 Mock（审核流、发布流、供需大厅、意向中心、仲裁链路均已切换真实 API，`src/pages/**` 已无 `global_arbitration_list/global_order_list` 命中）

## 5. 仍待后续批次处理
1. 旧 H5 (`auth.js` / `index.html` / `main_code.js`) 注入面与占位进一步收口（`auth.js` 已完成首批高风险注入点修复，仍需继续覆盖其余页面与文件）。
2. 文档层：`docs/ARCHITECTURE.md` 与 `docs/README.md` 持续对齐当前 uni-app 主体。
3. 安全策略层：CSP、Referrer-Policy、Permissions-Policy 与审计日志策略落地。

## 6. 当前状况快照（进入下一步前）
1. 已完成并可复用的能力
- 审核流、发布流、供需大厅、意向中心、仲裁链路均已切换到真实 API。
- 仲裁链路覆盖页：`src/pages/farmer/arbitration/index.vue`、`src/pages/merchant/arbitration/index.vue`、`src/pages/processor/arbitration/index.vue`、`src/pages/admin/arbitration/index.vue`。
- 后端配套：`/api/arbitration-requests` 支持 `order_type=order`；`PATCH /api/orders/:id/status` 已增加仲裁锁校验；仲裁查询补充 `applicant_role`。
- 本轮涉及页面 `get_errors` 已通过；`node --check server.js` 已通过。
- 关键字复查：`rg "global_arbitration_list|global_order_list" src/pages` 无命中。

2. 当前主要风险与边界
- 终端 `node server.js` 退出码 1 已定位为端口占用（`EADDRINUSE:4000`），不属于语法问题；仍需在运行手册中补充“端口冲突处理”步骤。

3. 下一步推荐切入点（按优先级）
- P1：旧 H5 占位与注入面收口。
- P2：安全策略文档化与审计日志策略落地。
- P3：补充仲裁链路自动化回归（覆盖申请、管理员裁决、订单状态冻结）。

4. 执行门禁（建议）
- 开发完成后需同时满足：
  - 目标页面无新增 `get_errors`。
  - 关键字复查无新增 `global_*` 回退。
  - 归档文档（07/03/04）状态与代码事实一致。

## 7. 本轮追加（2026-04-19，P1 首批：旧 H5 注入面收口）
1. 代码改动（`auth.js`）
- 新增安全渲染方法：`renderPlaceholderPage`、`renderMyAccountPage`，替换用户信息直拼 `innerHTML`。
- 农户/回收商/处理商工作台标题与登录时间输出改为转义后渲染（`escapeHtml`）。
- 农户申报表单回填字段（联系人、地址、备注等）统一做转义后再写入模板。
- 申报列表、货源供应列表中的后端字段改为先转义再拼接，错误信息输出改为转义后展示。

2. 验证结果
- `get_errors auth.js`：无新增错误。
- `node --check auth.js`：通过。
- 关键字复查：`auth.js` 中本轮目标模式 `${this.currentUser.name}` / `${this.currentUser.username}` / `${err.message}` 已无命中。

3. 状态判定
- 旧 H5 注入面收口进入“阶段推进中”：已完成首批高风险点（账户页与两类列表渲染），后续仍需继续覆盖 `index.html`、`main_code.js` 及其余历史渲染分支。

## 8. 本轮追加（2026-04-19，P1 第二批：index/main_code 注入面收口）
1. 代码改动
- `index.html`：新增 `setMultilineText`，底部 `about` 文本改为 DOM 文本节点 + `<br>` 组装，移除该路径 `innerHTML` 注入。
- `index.html`：新增 `openPolicyModalWithIframe`，隐私政策/服务协议弹窗改为 iframe 加载静态页面，不再 fetch 后直写 `innerHTML`。
- `main_code.js`：新增 `renderComingSoon`，占位页改为 DOM 节点渲染，移除该路径 `innerHTML` 写入。

2. 验证结果
- `get_errors`：`index.html`、`main_code.js` 无新增错误。
- 语法检查：`node --check main_code.js` 通过。

3. 状态判定
- 旧 H5 注入面整改继续推进：`auth.js`、`index.html`、`main_code.js` 均已落地第二阶段可验证修正，后续重点转向 `farmer-nearby-recyclers.html` 及 `auth.js` 其余历史渲染分支全量收口。

## 9. 本轮追加（2026-04-19，P1 第三批：farmer-nearby 注入面收口）
1. 代码改动（`farmer-nearby-recyclers.html`）
- 新增 DOM 渲染辅助函数：`clearChildren`、`createInfoIcon`、`createInfoItem`、`setStatusLoading`、`setStatusSuccess`、`appendStatusHint`、`setStatusError`。
- 回收商卡片渲染改为 `createElement + textContent + addEventListener`，移除列表主体 `innerHTML` 字符串拼接。
- 状态面板（定位中/成功/查找中/失败）改为 DOM 方式渲染，移除 `statusDiv.innerHTML` 动态写入。
- 路线规划失败提示改为 DOM 文本节点写入，移除 `route-info` 路径 `innerHTML` 写入。

2. 验证结果
- `get_errors farmer-nearby-recyclers.html`：无新增错误。
- 关键字复查：`farmer-nearby-recyclers.html` 中 `container.innerHTML` / `statusDiv.innerHTML` / `route-info.innerHTML` 已无命中。

3. 状态判定
- 旧 H5 注入面整改已完成第三批阶段收口：`auth.js`、`index.html`、`main_code.js`、`farmer-nearby-recyclers.html` 四处高风险面已完成可验证收敛；后续重点转向 `auth.js` 历史分支中仍采用模板字符串渲染的大段页面。

## 10. 本轮追加（2026-04-19，P1 第四批：auth.js 订单/求购模板收口）
1. 代码改动（`auth.js`）
- 回收商订单中心 `showRecyclerOrders` 内三处高风险渲染函数完成字段转义与数据属性收口：
  - `loadOrders`
  - `loadProcessorOrders`
  - `loadMyDemands`
- 处理商“我的求购”列表 `loadProcessorOrders`（方法）完成同类收口：
  - `request_no/contact_name/location_address/notes/valid_until` 等后端字段统一转义后输出。
  - `data-id/data-uid` 改为数值白名单写入，避免属性注入。
- 发布求购表单 `showPublishDemandForm` 的编辑回填路径完成安全化：
  - `weight/location_address/contact_name/contact_phone/valid_until/notes` 回填值统一转义。
  - 草稿按钮编辑 ID 参数改为数值白名单（`editIdExpr`）。
- 农户端与回收商端求购大厅列表完成同类收口：
  - `loadProcessorDemands`
  - `loadRecyclerDemands`
- 以上函数中的错误展示已由 `${err.message}` 直出改为转义输出。

2. 验证结果
- `get_errors auth.js`：无新增错误。
- `node --check auth.js`：通过。
- 关键字复查：`auth.js` 中 `${err.message}` 无命中。

3. 状态判定
- 旧 H5 注入面整改已完成第四批阶段收口：主风险从“订单/求购主链路直出”降级为“历史边缘分支待继续分批治理”。
- 下一批建议继续覆盖 `auth.js` 其余 `data.map(...).join('')` 历史模板分支（如意向中心与仲裁周边页面渲染）。

## 11. 本轮追加（2026-04-19，P1 第五批：auth.js 意向/仲裁周边收口）
1. 代码改动（`auth.js`）
- 意向列表弹窗 `viewIntentions` 完成字段与动作参数收口：
  - `applicant_name/status/estimated_weight/expected_date/notes/created_at` 统一转义后输出。
  - 接受/拒绝按钮中的 `id` 参数改为数值白名单写入，避免内联参数注入。
  - 加载失败提示由 `${err.message}` 直出改为转义输出。
- 罚款支付弹窗 `payPenalty` 的凭证预览收口：
  - 图片与文件名预览由 `innerHTML` 拼接改为 `createElement + textContent`。

2. 验证结果
- `get_errors auth.js`：无新增错误。
- `node --check auth.js`：通过。
- 关键字复查：`auth.js` 中 `${err.message}` 无命中。

3. 状态判定
- 旧 H5 注入面整改已完成第五批阶段收口：意向列表与仲裁周边的高风险模板插值进一步下降。
- 下一批建议继续覆盖 `auth.js` 中剩余历史模板渲染分支（优先管理端仲裁列表与详情的边缘展示路径）。

## 12. 本轮追加（2026-04-19，P1 第六批首段：auth.js 仲裁提交流程与管理端映射收口）
1. 代码改动（`auth.js`）
- 仲裁申请入口 `showArbitrationCenter` 增加 `order` 类型选项（平台交易订单，推荐）。
- `submitArbitration` 修复随机 `order_id` 逻辑：
  - `order` 类型通过 `GET /api/orders/:idOrNo` 解析真实 `order_id`。
  - `farmer_report/recycler_request/processor_request` 通过对应列表接口按编号查找真实 `id`。
  - 仲裁提交改为使用解析后的真实 `order_id/order_no`，不再使用临时随机值。
- 管理端仲裁页面订单类型映射补齐：
  - `loadArbitrationRequests` 与 `showArbitrationDetail` 均新增 `order -> 平台交易订单`。

2. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`auth.js` 中已无随机 `order_id` 生成逻辑，且存在 `order_id: resolvedTarget.order_id`。

3. 状态判定
- 第六批已启动并完成首段收口：仲裁提交链路从“可错投随机目标”收敛为“真实目标解析后提交”。
- 下一步建议继续覆盖 `auth.js` 管理端仲裁详情中的剩余历史模板分支，并补充回归证据。

## 13. 本轮追加（2026-04-19，P1 第六批第二段：auth.js 仲裁管理交互与详情加载稳健性）
1. 代码改动（`auth.js`）
- 修复仲裁管理列表卡片点击与操作按钮冲突：
  - 在 `loadArbitrationRequests` 的四个操作按钮（开始调查/做出裁决/驳回申请/添加备注）中增加 `event.stopPropagation()`，避免点击按钮时误触发卡片详情跳转。
- 增强仲裁详情加载稳健性：
  - `showArbitrationDetail` 增加 `id` 数值校验（非法 ID 直接返回错误提示）。
  - 详情查询改为 `Number(a.id) === targetId`，避免因类型不一致导致“存在记录却提示未找到”。

2. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`event.stopPropagation()` 与 `Number(a.id) === targetId` 均已落地。

3. 状态判定
- 第六批第二段已完成，仲裁管理端交互稳定性与详情命中率进一步提升。
- 下一步建议：继续推进 `auth.js` 仲裁详情其余历史模板分支收口，并并行补运行手册的 `EADDRINUSE` 处理步骤。

## 14. 本轮追加（2026-04-19，P1 第六批第三段：auth.js 仲裁视图状态与弹窗关闭稳健性）
1. 代码改动（`auth.js`）
- 仲裁页面刷新路径去文本依赖：
  - 新增 `isArbitrationDetailViewActive()`，通过 `content-area` 的 `data-arbitration-view` 判断当前是否处于详情页。
  - `showArbitrationManagement` 写入 `data-arbitration-view='list'`，`showArbitrationDetail` 写入 `data-arbitration-view='detail'`。
  - `resolveArbitration` / `rejectArbitration` / `addArbitrationNote` 的刷新逻辑由 `innerHTML.includes('返回仲裁列表')` 改为显式状态判断。
- 罚款弹窗关闭逻辑去文本依赖：
  - `setPenalty` 与 `payPenalty` 弹窗容器新增 `data-modal-type` 标记。
  - `submitPenalty` 与 `submitPenaltyPayment` 改为按 `data-modal-type` 精确关闭对应弹窗，不再扫描固定定位层并匹配文案。

2. 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`isArbitrationDetailViewActive`、`data-arbitration-view`、`data-modal-type`、`setPenaltyModal`、`payPenaltyModal` 均已落地。

3. 状态判定
- 第六批第三段已完成，仲裁管理流程在“页面刷新判定”和“弹窗关闭”两个路径上摆脱文案耦合，减少后续回归脆弱点。
- 下一步建议：继续收口 `auth.js` 仲裁详情中的剩余历史模板分支，并补齐自动化负测证据。

## 15. 本轮追加（2026-04-19，P1 第六批第四段：auth.js 仲裁详情文件预览与弹窗关闭路径收口）
1. 代码改动（`auth.js`）
- 仲裁详情文件预览去内联事件模板：
  - `showArbitrationDetail` 中 `renderFileList` 不再拼接 `onclick/onmouseenter/onmouseleave`。
  - 文件项改为写入 `data-file-preview-key`，并使用 `filePreviewRegistry` 保存 `filePath/fileName/isImage` 元数据。
  - 详情渲染后统一绑定 hover 与 click 事件，点击时调用 `viewFile`。
- 罚款弹窗关闭逻辑进一步统一：
  - 新增 `closeModalByType(modalType)`。
  - `setPenalty` 与 `payPenalty` 的取消按钮、遮罩点击关闭、提交成功关闭，全部改为调用 `closeModalByType`，不再依赖样式选择器链路。

2. 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`file-preview-`、`data-file-preview-key`、`filePreviewRegistry`、`closeModalByType` 均已落地。

3. 状态判定
- 第六批第四段已完成，仲裁详情文件预览路径从“模板内联事件”收敛为“渲染后绑定”，弹窗关闭链路一致性进一步提升。
- 下一步建议：继续推进 `auth.js` 仲裁详情剩余历史模板分支收口，并补最小自动化负测证据。

## 16. 本轮追加（2026-04-19，P1 第六批第五段：auth.js 仲裁详情操作按钮事件绑定收口）
1. 代码改动（`auth.js`）
- 仲裁详情操作按钮去内联事件模板：
  - 返回列表按钮改为 `data-arb-detail-action="back-list"`。
  - 罚款凭证按钮改为 `data-arb-detail-action="view-penalty-proof"` + `data-proof-*` 元数据。
  - “开始调查/设置罚款/做出裁决/驳回申请/添加备注”按钮统一改为 `data-arb-detail-action` + `data-arb-id`。
- 统一事件绑定分发：
  - 详情渲染后新增 `container.querySelectorAll('[data-arb-detail-action]')` 统一绑定。
  - 按 action 分发到 `navigateTo`、`viewFile`、`updateArbitrationStatus`、`setPenalty`、`resolveArbitration`、`rejectArbitration`、`addArbitrationNote`。

2. 验证结果
- `node --check auth.js`：通过。
- 关键锚点复查：`data-arb-detail-action`、`view-penalty-proof`、`start-investigation`、`set-penalty`、`add-note` 均已落地。

3. 状态判定
- 第六批第五段已完成，仲裁详情区操作路径从“模板内联调用”收敛为“统一事件分发”，后续重构与回归稳定性进一步提升。
- 下一步建议：继续清理 `auth.js` 其余仲裁历史模板分支，并补自动化负测证据。

## 17. 本轮追加（2026-04-19，P1 第六批第六段：auth.js 仲裁管理列表与罚款弹窗事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过。
- `npm run test:p1`：首次执行触发登录限流 `HTTP 429`，重启测试实例后重跑通过。
- `npm run test:p2`：首次执行触发登录限流 `HTTP 429`，重启测试实例后重跑通过。
- 结论：P0/P1/P2 均已获得有效通过结果；`429` 属于测试实例连续登录导致的环境噪声，不属于业务回归失败。

2. 代码改动（`auth.js`）
- 用户端仲裁进度列表 `loadMyArbitrations`：
  - “立即支付罚款”按钮改为 `data-my-arb-action="pay-penalty" + data-arb-id`。
  - 渲染后统一绑定支付动作，补充 ID 校验。
- 管理端仲裁列表 `loadArbitrationRequests`：
  - 卡片点击与四个操作按钮改为 `data-arb-list-action` 分发绑定，移除内联 `onclick`。
  - 非详情动作统一在绑定层 `stopPropagation`，避免卡片点击冒泡冲突。
- 详情加载失败回退：
  - “返回列表”按钮改为 `data-arb-detail-error-action`，渲染后绑定跳转动作。
- 罚款相关弹窗：
  - `setPenalty` 改为 `data-set-penalty-action` 统一绑定（20% 计算/提交/取消），并增加仲裁 ID 校验。
  - `payPenalty` 改为 `data-pay-penalty-action` 统一绑定（提交/取消），并增加仲裁 ID 校验。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-my-arb-action`、`data-arb-list-action`、`data-arb-detail-error-action`、`data-set-penalty-action`、`data-pay-penalty-action` 均已落地。

4. 状态判定
- 第六批第六段已完成，仲裁管理列表与罚款流程中剩余内联事件模板进一步收口为统一事件分发。

## 18. 本轮追加（2026-04-19，P1 第六批第七段：auth.js 仲裁提交页与意向列表弹窗事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过；本轮按“脚本独立实例”执行，未出现影响结论的限流噪声。

2. 代码改动（`auth.js`）
- 仲裁提交页 `showArbitrationCenter`：
  - “取消”按钮由内联 `onclick` 改为 `data-arb-submit-action="cancel-submit"`。
  - 渲染后统一绑定 `data-arb-submit-action`，分发到 `navigateTo('dashboard')`。
- 意向列表弹窗 `viewIntentions`：
  - “接受/拒绝”按钮由内联 `onclick` 改为 `data-intention-action + data-intention-id`。
  - 渲染后统一绑定 `data-intention-action`，补充意向 ID 数值校验后调用 `updateIntentionStatus`。
- `updateIntentionStatus`：
  - 增加按钮参数空值兼容，统一处理禁用/恢复与卡片状态更新路径，降低调用方耦合。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-arb-submit-action`、`data-intention-action` 均已落地。

4. 状态判定
- 第六批第七段已完成，仲裁提交页与意向列表弹窗中的残余内联动作已收敛为渲染后统一绑定。
- 下一步建议：继续清理 `auth.js` 仲裁中心提交页与管理端边缘模板分支，并补一组最小自动化负测证据。

## 19. 本轮追加（2026-04-19，P1 第六批第八段：auth.js 工作台卡片与侧边栏导航事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`）
- 四类工作台卡片去内联事件：
  - `showAdminDashboard` / `showFarmerDashboard` / `showRecyclerDashboard` / `showProcessorDashboard` 中卡片点击由内联 `onclick` 改为 `data-dashboard-action + data-dashboard-page`。
  - 农户“附近处理点”入口改为 `data-dashboard-action="open-nearby"`，由绑定层统一处理跳转。
- 新增统一绑定方法：
  - `bindDashboardActions(container)`：统一分发 `navigate/open-nearby`。
  - `bindSidebarActions(navList)`：统一分发 `navigate/logout`。
- 侧边栏菜单 `updateSidebar` 去内联事件：
  - 菜单链接改为 `data-nav-action + data-nav-page`，渲染后统一绑定，不再拼接 `onclick`。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-dashboard-action`、`data-nav-action`、`bindDashboardActions`、`bindSidebarActions` 均已落地。

4. 状态判定
- 第六批第八段已完成，工作台与侧边栏导航路径中的主要内联点击模板已收敛为渲染后统一绑定。

## 20. 本轮追加（2026-04-19，P1 第六批第九段：auth.js CMS 中心模板内联事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`）
- CMS 表单区去内联事件：
  - `showCmsCenter` 中公告/案例/广告三个表单的“上传图片/上传缩略图/上传Logo/清空”按钮由内联 `onclick` 改为 `data-cms-form-action` + 参数属性。
- CMS 列表区去内联事件：
  - `loadCmsAnnouncements` / `loadCmsCases` / `loadCmsAds` 中“编辑/删除”按钮由内联 `onclick` 改为 `data-cms-list-action + data-cms-id`。
- 新增统一绑定方法：
  - `bindCmsTabActions(container)`：统一处理 CMS 二级标签页切换。
  - `bindCmsFormActions(container)`：统一分发上传图片与清空表单动作。
  - `bindCmsListActions(listContainer)`：统一分发公告/案例/广告编辑与删除动作。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-cms-form-action`、`data-cms-list-action`、`bindCmsTabActions`、`bindCmsFormActions`、`bindCmsListActions` 均已落地。

4. 状态判定
- 第六批第九段已完成，CMS 中心模板内联事件主路径已收敛为渲染后统一绑定。

## 21. 本轮追加（2026-04-19，P1 第六批第十段：auth.js 求购页入口与表单按钮内联事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`）
- 求购页入口与空态引导去内联事件：
  - `showRecyclerOrders` 与 `showProcessorOrders` 中“+ 发布新求购”按钮由内联 `onclick` 改为 `data-demand-entry-action`。
  - 处理商订单空态“处理商需求”链接由内联 `onclick` 改为 `data-demand-entry-action`。
- 求购/供应表单按钮去内联事件：
  - `showPublishDemandForm` 中处理商草稿按钮、回收商草稿/返回按钮、回收商供应草稿按钮由内联 `onclick` 改为 `data-demand-form-action`。
- 新增统一绑定方法：
  - `bindDemandEntryActions(scope)`：统一分发 `navigate`。
  - `bindDemandFormActions(scope)`：统一分发 `save-processor-demand` / `save-recycler-demand` / `save-recycler-supply` / `navigate`。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-demand-entry-action`、`data-demand-form-action`、`bindDemandEntryActions`、`bindDemandFormActions` 均已落地。

4. 状态判定
- 第六批第十段已完成，求购页入口与表单按钮主路径内联事件模板已收敛为渲染后统一绑定。

## 22. 本轮追加（2026-04-19，P1 第六批第十一段：auth.js 农户申报说明按钮与电话占位模板收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`）
- 农户申报页去最后一个内联事件：
  - `showNewReportForm` 中品级说明切换按钮由内联 `onclick` 改为 `data-report-form-action="toggle-grade-info"`。
  - 渲染后绑定按钮点击逻辑，统一处理 `grade-info` 展开/收起。
- 电话占位模板去 `javascript:`：
  - 供货列表、货源列表、订单列表与处理商订单列表中 4 处 `href="javascript:void(0)"` 电话占位链接改为无脚本占位元素，移除 `javascript:` 模板残留。

3. 验证结果
- `node --check auth.js`：通过。
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-report-form-action`、`toggle-grade-info` 已落地，`onclick="` 与 `javascript:void(0)` 在 `auth.js` 中已清零。

4. 状态判定
- 第六批第十一段已完成，`auth.js` 内联模板事件与 `javascript:` 占位模板进一步下降。

## 23. 本轮追加（2026-04-19，P1 第六批第十二段：index/main_code/nearby 页面模板内联事件绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`index.html` / `main_code.js` / `farmer-nearby-recyclers.html`）
- `index.html` 去内联事件：
  - 公告翻页按钮、登录弹窗关闭/切换 tab/登录/注册按钮、意向弹窗关闭/提交按钮由内联 `onclick` 改为 `data-action`。
  - 新增 `bindIndexTemplateActions()`，统一分发 `change-ann`、认证弹窗操作、意向弹窗操作。
- `main_code.js` 去内联事件：
  - `renderReportForm` 的“提交申报信息”按钮由内联 `onclick` 改为 `id` + 渲染后 `onclick` 绑定。
- `farmer-nearby-recyclers.html` 去内联事件：
  - 地图关闭按钮由内联 `onclick` 改为 `data-nearby-action`。
  - 新增 `bindNearbyActions()` 并在 `init()` 入口绑定。

3. 验证结果
- `node --check main_code.js`：通过。
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`data-home-action`、`data-auth-ui-action`、`data-intention-action`、`bindIndexTemplateActions`、`data-nearby-action`、`bindNearbyActions`、`btn-submit-report` 均已落地。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onclick="` 与 `javascript:void(0)` 均已清零。

4. 状态判定
- 第六批第十二段已完成，旧 H5 入口页与周边页面的模板内联事件继续下降。

## 24. 本轮追加（2026-04-19，P1 第六批第十三段：index.html 剩余 hover 内联事件收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`index.html`）
- 页脚政策链接 hover 改色去内联事件：
  - `隐私政策`、`服务协议` 两个链接由 `onmouseover/onmouseout` 改为 `footer-policy-link` + CSS `:hover`。
- 首页动态卡片 hover 动效去内联事件：
  - 案例卡片与广告卡片容器由 `onmouseover/onmouseout` 改为 `home-hover-card` + CSS `:hover`。

3. 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`footer-policy-link`、`home-hover-card` 均已落地。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均已清零。

4. 状态判定
- 第六批第十三段已完成，`index.html` 剩余 hover 内联事件模板已收敛，旧 H5 入口模板事件治理继续推进。

## 25. 本轮追加（2026-04-19，P1 第六批第十四段：index.html 动态图片 onerror 内联事件收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`index.html`）
- 公告/案例/广告动态图片去内联错误回退：
  - 公告大图、案例缩略图、案例 logo、广告图的 `onerror` 内联模板改为 `data-home-fallback` 标记。
- 新增统一回退绑定：
  - 新增 `createHomeFallbackNode(type)` 与 `bindHomeImageFallbacks(scope)`。
  - 在 `renderAnnouncement` 与案例/广告渲染完成后统一绑定图片错误回退逻辑。

3. 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`data-home-fallback`、`createHomeFallbackNode`、`bindHomeImageFallbacks` 均已落地。
- 残留复查：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onerror=`、`onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均已清零。

4. 状态判定
- 第六批第十四段已完成，`index.html` 动态图片回退链路的内联事件模板已收敛为渲染后统一绑定。

## 26. 本轮追加（2026-04-19，P1 第六批第十五段：index.html onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`index.html`）
- 弹窗与协议入口点击绑定收口：
  - `privacy-link`、`service-link`、`policy-modal-close`、`policy-modal` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 首页模板统一分发绑定收口：
  - `bindIndexTemplateActions()` 中 `data-home-action` / `data-auth-ui-action` / `data-intention-action` 三组节点由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors index.html/main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`privacyLink.addEventListener`、`serviceLink.addEventListener`、`closeBtn.addEventListener`、`modal.addEventListener` 与 `bindIndexTemplateActions` 内三组 `addEventListener('click')` 均已落地。
- 残留复查：`index.html` 中 `.onclick =` 已清零；`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html` 中 `onerror=`、`onmouseover=`、`onmouseout=`、`onclick="` 与 `javascript:void(0)` 均已清零。

4. 状态判定
- 第六批第十五段已完成，`index.html` 点击交互从 DOM 属性绑定进一步收敛为统一事件监听。

## 27. 本轮追加（2026-04-19，P1 第六批第十六段：main_code/nearby onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`main_code.js` / `farmer-nearby-recyclers.html`）
- `main_code.js` 收口：
  - `renderReportForm` 中 `btn-submit-report` 的 `submitBtn.onclick = ...` 改为 `addEventListener('click', ...)`。
- `farmer-nearby-recyclers.html` 收口：
  - 加载失败重试按钮 `retryBtn.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `bindNearbyActions()` 中 `data-nearby-action` 分发绑定由 `node.onclick = ...` 改为 `addEventListener('click', ...)`，并增加 `data-nearby-action-bound` 防重复绑定保护。

3. 验证结果
- `get_errors main_code.js/farmer-nearby-recyclers.html`：无新增错误。
- 关键锚点复查：`submitBtn.addEventListener('click', ...)`、`retryBtn.addEventListener('click', ...)`、`bindNearbyActions` 内 `node.addEventListener('click', ...)` 均已落地。
- 残留复查：`main_code.js` 与 `farmer-nearby-recyclers.html` 中 `.onclick =`、`onclick=`、`javascript:void(0)` 无残留。

4. 状态判定
- 第六批第十六段已完成，`main_code.js` 与 `farmer-nearby-recyclers.html` 点击交互绑定进一步统一为事件监听模式。

## 28. 本轮追加（2026-04-19，P1 第六批第十七段：auth.js 求购列表 onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`）
- 处理商求购列表按钮绑定收口：
  - `loadProcessorDemands()` 内 `data-processor-demand-action` 的 `btn.onclick = ...` 改为 `addEventListener('click', ...)`。
- 农户端求购大厅按钮绑定收口：
  - `loadRecyclerDemands()` 内 `data-demand-action="intention"` 与 `data-processor-demand-action="intention"` 两组 `btn.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`loadProcessorDemands()` 与 `loadRecyclerDemands()` 三组按钮均为 `btn.addEventListener('click', ...)` 绑定。
- 残留复查（目标模块）：上述三组按钮分发绑定中 `.onclick =` 已清零，业务行为保持不变（接单/发起意向）。

4. 状态判定
- 第六批第十七段已完成，`auth.js` 求购相关列表点击交互继续向事件监听模式收敛。

## 29. 本轮追加（2026-04-19，P1 第六批第十八段：auth.js 多簇 onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，一次执行多步）
- 农户申报表单收口：
  - `showNewReportForm` 中 `gradeToggleBtn.onclick = ...` 与 `btn-save-draft` 的 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 列表筛选按钮收口：
  - `showMyReports` 与回收商订单页（`loadOrders`）中的 `.filter-btn` 点击绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 订单/求购动作按钮收口：
  - `loadProcessorOrders` 的 `data-processor-order-action`。
  - `loadMyDemands` 的 `data-demand-action`。
  - `bindRecyclerOrderActions` 的 `data-order-action`。
  - 以上三组均由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`gradeToggleBtn.addEventListener`、`saveDraftBtn.addEventListener`、两处 `.filter-btn` 的 `addEventListener('click')`，以及 `data-processor-order-action`/`data-demand-action`/`data-order-action` 三组分发绑定均已落地。
- 残留复查（目标簇）：上述第十八段目标簇中的 `.onclick =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第十八段已完成，`auth.js` 农户申报与回收商订单/求购链路的点击绑定继续向事件监听模式收敛。

## 30. 本轮追加（2026-04-19，P1 第六批第十九段：auth.js 供应/订单模块 onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，多簇合并执行）
- `showSupplySources`：
  - `data-source-action` 按钮分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `.supply-source-tab` 切换绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showFarmerSupplies` / `bindSupplyActions`：
  - 刷新按钮 `btn-refresh-supplies` 的 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `data-supply-action` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showRecyclerOrders`：
  - `.tab-btn` 页签切换绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`[data-source-action]`、`.supply-source-tab`、`#btn-refresh-supplies`、`[data-supply-action]`、`.tab-btn` 五组绑定均为 `addEventListener`。
- 残留复查（目标簇）：第十九段目标簇中的 `.onclick =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第十九段已完成，`auth.js` 供应/订单链路的点击交互绑定继续向事件监听模式收敛。

## 31. 本轮追加（2026-04-19，P1 第六批第二十段：auth.js 分发函数 onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，多簇合并执行）
- 分发函数统一收口：
  - `bindProcessorOrderActions`：`[data-processor-action]` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `bindReportActions`：`[data-action]` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `bindDemandEntryActions`：`[data-demand-entry-action]` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - `bindDemandFormActions`：`[data-demand-form-action]` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：以上四个分发函数的目标节点均改为 `addEventListener('click', ...)`。
- 残留复查（目标簇）：第20段目标簇中的 `.onclick =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第二十段已完成，`auth.js` 分发函数层的点击绑定继续向事件监听模式收敛。

## 32. 本轮追加（2026-04-19，P1 第六批第二十一段：auth.js 仲裁与证据上传链路 onclick 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，同域多簇合并执行）
- `showArbitrationCenter`：
  - 仲裁标签切换 `.arbitration-tab` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - 提交页动作分发 `data-arb-submit-action` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `setupFilePreview`：
  - 文件选择 `input.onchange` 改为 `input.addEventListener('change', ...)`。
  - 预览项删除按钮 `removeBtn.onclick` 改为 `removeBtn.addEventListener('click', ...)`。
- `loadMyArbitrations`：
  - 用户侧罚款入口 `data-my-arb-action` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `showArbitrationManagement` 与 `loadArbitrationRequests`：
  - 筛选按钮 `.filter-btn` 与管理端动作分发 `data-arb-list-action` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`.arbitration-tab`、`data-arb-submit-action`、`setupFilePreview`、`data-my-arb-action`、`.filter-btn`、`data-arb-list-action` 六组目标绑定均为 `addEventListener`。
- 残留复查（目标簇）：第21段目标簇中的 `.onclick =` 与 `input.onchange =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第二十一段已完成，`auth.js` 仲裁与证据上传主链路交互继续向事件监听模式收敛。

## 33. 本轮追加（2026-04-19，P1 第六批第二十二段：auth.js 仲裁详情与罚款弹窗链路 onclick/onchange 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，同域多簇合并执行）
- `showArbitrationDetail`：
  - 文件预览节点的 `mouseenter/mouseleave/click` 由属性绑定改为 `addEventListener(...)`。
  - 详情区动作分发 `data-arb-detail-action` 由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - 详情加载失败回退按钮由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `viewFile`：
  - 关闭按钮与背景点击关闭由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `setPenalty`：
  - 遮罩点击关闭与 `data-set-penalty-action` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- `payPenalty`：
  - 遮罩点击关闭与 `data-pay-penalty-action` 分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
  - 支付凭证预览触发由 `proofInput.onchange = ...` 改为 `addEventListener('change', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`data-arb-detail-action`、`viewFile`、`data-set-penalty-action`、`data-pay-penalty-action`、`proofInput.addEventListener('change', ...)` 均已落地。
- 残留复查（目标簇）：第22段目标簇中的 `.onclick =` 与 `.onchange =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第二十二段已完成，`auth.js` 仲裁详情与罚款弹窗主链路交互继续向事件监听模式收敛。

## 34. 本轮追加（2026-04-19，P1 第六批第二十三段：auth.js 非仲裁残留 onclick/onchange 属性绑定收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js`，低风险多簇合并执行）
- CMS 交互分发收口：
  - `bindCmsTabActions`、`bindCmsFormActions`、`bindCmsListActions` 中分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 工作台与侧边栏分发收口：
  - `bindDashboardActions`、`bindSidebarActions` 中分发绑定由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 登录入口分发收口：
  - `updateNavbar` 中登录按钮改为单次 `addEventListener('click', ...)` 绑定，结合 `data-auth-navbar-action` 分发登录/退出行为。
- 意向列表弹窗分发收口：
  - `viewIntentions` 中 `data-intention-action` 按钮分发由 `.onclick = ...` 改为 `addEventListener('click', ...)`。
- 同域 `change` 事件收口：
  - `supply-sort`、两处 `demand-permanent`、`target-type` 单选切换由 `.onchange = ...` 改为 `addEventListener('change', ...)`。

3. 验证结果
- `get_errors auth.js`：无新增错误。
- 关键锚点复查：`bindCmsTabActions`、`bindDashboardActions`、`bindSidebarActions`、`updateNavbar`、`viewIntentions`、`supply-sort`、`demand-permanent`、`target-type` 相关 `addEventListener('click'/'change', ...)` 均已落地。
- 残留复查（目标簇）：第23段目标簇中的 `.onclick =` 与 `.onchange =` 已清零，业务行为保持不变。

4. 状态判定
- 第六批第二十三段已完成，`auth.js` 非仲裁低风险交互簇继续向事件监听模式收敛。

## 35. 本轮追加（2026-04-19，P1 第六批第二十四段：跨文件 on* 属性绑定清零收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- 结论：P0/P1/P2 均通过，本轮未触发影响判定的登录限流噪声。

2. 代码改动（`auth.js` / `userProfile.js`，跨文件低风险合并执行）
- `auth.js` 提交事件收口：
  - CMS 四个表单、农户申报表单、处理商求购表单、回收商双表单、仲裁提交表单由 `.onsubmit = ...` 改为 `addEventListener('submit', ...)`。
- `userProfile.js` hover 模板收口：
  - `renderListGroup` 列表项移除内联 `onmouseover/onmouseout`。
  - 改为 `class="profile-list-item"` + CSS `:hover` 处理悬浮效果。

3. 验证结果
- `get_errors auth.js/userProfile.js`：无新增错误。
- 全量复扫（核心旧 H5 + 个人中心）：`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html/userProfile.js` 中 `.onclick/.onchange/.onsubmit` 与 `onmouseover/onmouseout/onerror/onclick="..."/javascript:void(0)` 目标模式无命中。

4. 状态判定
- 第六批第二十四段已完成，跨文件 `on*` 属性绑定收口达到当前阶段清零目标。

## 36. 本轮追加（2026-04-19，P1 第六批第二十五段：Step2 安全门禁项 TODO-020/021/022/023/024 收口）
1. 自动化回归先行（按执行顺序）
- `npm run test:p0`：通过（fresh server instance）。
- `npm run test:p1`：通过（fresh server instance）。
- `npm run test:p2`：通过（fresh server instance）。
- `npm run test:p3`：通过（fresh server instance，覆盖 401/403 越权负向用例与审计日志落地校验）。

2. 代码与文档改动（安全门禁同轮收口）
- `server.js`：新增 `/api` 范围 401/403/429 结构化安全审计日志中间件，日志落地 `logs/security-audit.log`。
- `server.js`：补齐全局安全响应头策略，新增 `Content-Security-Policy`、`Referrer-Policy`、`Permissions-Policy`，并将 HSTS 调整为 HTTPS 请求下发。
- `server.js`：登录失败、缺失 Token、无效 Token、管理员越权访问等路径补充 `securityAuditReason`，提升审计可读性。
- `tests/api_tests/test-p3-authz-negative.js`：新增角色权限负向自动化脚本。
- `package.json`：新增 `npm run test:p3`。
- `docs/security/SECURITY_BASELINE.md`：新增统一安全基线文档，覆盖上传安全、审计日志、CSP 与安全头。
- `docs/README.md`：新增 Step2 安全门禁回归命令与放行条件。

3. 验证结果
- `node --check server.js` 与 `get_errors server.js` 均无新增错误。
- 负向权限场景（缺失 token、无效 token、管理员越权、跨角色越权更新）均按预期返回 `401/403`。
- 审计日志中已出现对应 `status=401/403` 的新增事件，包含路径与原因码。

4. 状态判定
- 第六批第二十五段已完成，Step2 门禁项 `TODO-020/021/022/023/024` 达成“实现 + 自动化 + 文档”闭环。

## 37. 本轮追加（2026-04-19，Step2 收官签收）
1. 收官回归（fresh server instance）
- `BASE_URL=http://localhost:4304 npm run test:p0`：通过。
- `BASE_URL=http://localhost:4301 npm run test:p1`：通过。
- `BASE_URL=http://localhost:4302 npm run test:p2`：通过。
- `BASE_URL=http://localhost:4303 npm run test:p3`：通过。

2. 证据归档
- 回归证据：`docs/audit-2026-04-13/evidence/regression/2026-04-19_step2-final-gates_kk.md`
- 安全证据：`docs/audit-2026-04-13/evidence/security/2026-04-19_step2-authz-audit-log_kk.md`
- 收官报告：`docs/audit-2026-04-13/09-step2-closure-2026-04-19.md`

3. 判定
- Step2（本批次定义范围）状态由 `In Progress` 变更为 `Closed`，下一阶段切换到 Step3（鲁棒性专项）。