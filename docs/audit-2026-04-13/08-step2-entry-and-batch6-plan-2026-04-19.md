# Step2 进入与第六批最小交付清单（2026-04-19）

- 状态：`Completed`
- 负责人：项目负责人 / 开发负责人（联合）
- 关联阶段：`Step 2 - 阻断项清零`
- 触发依据：已确认“完成文档交付后进入下一阶段”

## 1. 阶段进入结论
1. Step 1 门禁阈值已冻结，进入 Step 2 执行。
2. Step 2 的目标从“继续修补”调整为“可上线测试的阻断项清零”。
3. 本阶段执行以“批次落地 + 证据同步 + 阶段复扫”三件套为准。

## 2. 第六批最小交付清单（按天）

### D0（当天）文档交付与基线冻结
1. 新增本文件并登记到索引。
2. 将阶段状态从 Step 1 切换到 Step 2。
3. 明确本批目标范围：`auth.js` 管理端仲裁列表/详情与仲裁提交流程。

### D1（开发）代码收口
1. 修复仲裁提交流程中的目标解析问题：
- 禁止随机 `order_id` 写入；改为真实目标解析后提交。
2. 收口管理端仲裁列表/详情剩余历史模板分支：
- 继续执行字段转义、参数白名单、错误输出安全化。
3. 对齐订单类型映射：
- 补齐 `order` 类型标签，避免显示回退到原始值。

### D2（验证）证据与回归
1. 语法检查与错误检查：
- `node --check auth.js`
- `get_errors auth.js`
2. 关键字复扫：
- `auth.js` 中 `${err.message}` 与高风险模板分支复查。
3. 归档同步：
- 更新 `07-remediation-batch-2026-04-19.md`
- 更新 `04-rescan-and-progress-2026-04-17.md`
- 更新 `03-unfinished-items.md`

## 3. 优先级矩阵（本阶段）

### P0（必须完成，阻断上线测试）
1. 阻断型业务错误（如随机 ID、核心链路不可追溯）。
2. 可触发注入或错误信息直出链路。

### P1（强建议本阶段完成）
1. `auth.js` 剩余历史模板分支收口。
2. 仲裁链路补充自动化回归证据。

### 可改可不改（可延后）
1. 非核心界面视觉优化。
2. 非阻断型结构重构。

## 4. 可上线测试交付线（Step2 结束判定）
1. P0=0，P1=0（本次发布范围内）。
2. 核心链路回归通过率 100%：
- 登录/会话、角色访问、订单与意向、仲裁、文件访问。
3. 失败路径用例通过率 100%：
- 超时、非法输入、并发重复提交、资源不可用。
4. 文档与证据一致：
- `03/04/07/08` 四份文档状态互相一致。

## 5. 下一阶段切换条件（Step3）
1. Step2 交付线满足后，进入 Step3（鲁棒性专项）。
2. Step3 首要任务：失败路径矩阵与故障注入回归。

## 6. 当前执行记录
1. 已完成：Step2 文档交付与阶段切换登记。
2. 已完成：第六批首段（`auth.js` 仲裁提交流程 + 管理端仲裁映射）。
3. 已完成：第六批第二段（仲裁管理按钮冒泡冲突修复 + 详情 ID 命中稳健性增强）。
4. 已完成：第六批第三段（仲裁详情刷新判定改为显式视图状态 + 罚款弹窗关闭改为 `data-modal-type` 精确关闭）。
5. 已完成：第六批第四段（仲裁详情文件预览改为渲染后事件绑定 + 罚款弹窗关闭链路统一为 `closeModalByType`）。
6. 已完成：第六批第五段（仲裁详情操作按钮改为 `data-arb-detail-action` 统一事件分发，移除详情区内联 onclick 调用）。
7. 已完成：自动化回归检测（`test:p0` 通过；`test:p1/test:p2` 首次触发登录限流 `429`，重启测试实例后复跑通过）。
8. 已完成：第六批第六段（仲裁管理列表卡片与操作按钮改为 `data-arb-list-action` 统一分发，用户侧罚款入口与罚款弹窗按钮改为 `data-action` 绑定，详情加载失败返回按钮改为渲染后绑定）。
9. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮采用 fresh server instance 策略，结果稳定）。
10. 已完成：第六批第七段（仲裁提交页“取消”按钮改为 `data-arb-submit-action` 渲染后绑定，意向列表弹窗“接受/拒绝”按钮改为 `data-intention-action` 统一绑定，移除对应内联 `onclick` 模板）。
11. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
12. 已完成：第六批第八段（四类工作台卡片点击由内联 `onclick` 改为 `data-dashboard-action` 统一分发，侧边栏菜单由内联 `onclick` 改为 `data-nav-action` 渲染后绑定，导航/退出主路径统一收口）。
13. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
14. 已完成：第六批第九段（CMS 中心公告/案例/广告表单上传与清空按钮由内联 `onclick` 改为 `data-cms-form-action` 统一分发，三类列表编辑/删除按钮由内联 `onclick` 改为 `data-cms-list-action` 渲染后绑定）。
15. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
16. 已完成：第六批第十段（求购页“发布新求购”入口与处理商订单空态引导由内联 `onclick` 改为 `data-demand-entry-action`，求购/供应表单草稿与返回按钮由内联 `onclick` 改为 `data-demand-form-action` 统一分发）。
17. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
18. 已完成：第六批第十一段（农户申报页品级说明按钮由内联 `onclick` 改为 `data-report-form-action` 渲染后绑定，供货/货源/订单列表中的 `javascript:void(0)` 电话占位链接改为无脚本占位元素）。
19. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
20. 已完成：第六批第十二段（`index.html` 的公告翻页/登录弹窗/意向弹窗按钮由内联 `onclick` 改为 `data-action` 并统一绑定，`main_code.js` 提交按钮改为渲染后绑定，`farmer-nearby-recyclers.html` 地图关闭按钮改为 `data-nearby-action` 绑定）。
21. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
22. 已完成：第六批第十三段（`index.html` 页脚“隐私政策/服务协议”链接与首页动态“案例卡片/广告卡片”容器由内联 `onmouseover/onmouseout` 改为 class + CSS `:hover`，移除剩余 hover 内联事件模板）。
23. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
24. 已完成：第六批第十四段（`index.html` 公告/案例/广告动态图片的内联 `onerror` 回退模板改为 `data-home-fallback` + 渲染后 `bindHomeImageFallbacks` 统一绑定，移除剩余图片回退内联事件模板）。
25. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
26. 已完成：第六批第十五段（`index.html` 协议弹窗与首页模板分发中的 `.onclick` 属性绑定改为 `addEventListener('click', ...)`，包括 `privacy-link/service-link`、弹窗关闭逻辑与 `bindIndexTemplateActions` 三组分发绑定）。
27. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
28. 已完成：第六批第十六段（`main_code.js` 的 `btn-submit-report` 点击绑定与 `farmer-nearby-recyclers.html` 的重试按钮、`bindNearbyActions` 分发绑定由 `.onclick` 改为 `addEventListener('click', ...)`，并增加防重复绑定保护）。
29. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
30. 已完成：第六批第十七段（`auth.js` 的 `loadProcessorDemands` 与 `loadRecyclerDemands` 中三组求购列表按钮分发绑定由 `.onclick` 改为 `addEventListener('click', ...)`，保持接单与发起意向行为不变）。
31. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
32. 已完成：第六批第十八段（`auth.js` 农户申报页按钮、申报/订单筛选按钮、以及订单/求购动作分发按钮的 `.onclick` 属性绑定在单轮内集中改为 `addEventListener('click', ...)`）。
33. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
34. 已完成：第六批第十九段（`auth.js` 的 `showSupplySources`、`showFarmerSupplies`、`bindSupplyActions`、`showRecyclerOrders` 中多簇 `.onclick` 属性绑定改为 `addEventListener('click', ...)`，覆盖供应与订单主链路交互）。
35. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。
36. 已完成：第六批第二十段（`auth.js` 的 `bindProcessorOrderActions`、`bindReportActions`、`bindDemandEntryActions`、`bindDemandFormActions` 四个分发函数由 `.onclick` 属性绑定改为 `addEventListener('click', ...)`）。

## 7. 运行手册补记（EADDRINUSE:4000）
1. 现象
- 执行 `node server.js` 时报错：`EADDRINUSE:4000`。

2. 处理步骤
- 查询占用进程：
	- `lsof -i :4000`
- 终止占用进程（示例）：
	- `kill -9 <PID>`
- 重新启动服务：
	- `node server.js`

3. 验证
- 启动日志中不再出现 `EADDRINUSE`。
- 访问健康接口或首页接口应返回正常结果。

## 8. 下一阶段规划（第十九段预案）
1. 目标范围
- 优先收口 `auth.js` 中剩余高频 `.onclick` 绑定，优先级从“列表渲染后按钮分发”到“导航/工作台入口绑定”。

2. 执行策略
- 延续“改动太少则合并多簇”的策略：单轮可连续执行 2-3 个低风险小簇，统一做一次 P0/P1/P2 回归并集中落档。
- 对可能重复渲染的节点，优先采用 `addEventListener` + 绑定保护（或在重渲染路径按需重建节点）避免重复监听。

3. 交付约束
- 每轮保持“代码改造 + 回归 + 07/04/03/08 同步”闭环。
- 继续记录 fresh server instance 回归结果与测试产物变化，避免误判环境噪声。

## 9. 下一阶段规划（第二十段预案）
1. 目标范围
- 继续收口 `auth.js` 中剩余 `.onclick` 高密度簇，优先处理 `data-*` 分发绑定集中的仲裁与弹窗交互函数。

2. 执行策略
- 维持“单轮多簇”节奏：每轮合并 2-3 个低风险簇，减少碎片提交与回归成本。
- 对弹窗和动态列表优先采用 `addEventListener` + 绑定保护标记，避免重复渲染导致重复监听。

3. 验收标准
- 目标簇 `.onclick =` 清零；`get_errors` 无新增错误；`test:p0/test:p1/test:p2` 全通过；07/04/03/08 四文档同步。

## 10. 下一阶段规划（第二十一段预案）
1. 目标范围
- 继续收口 `auth.js` 中仲裁与证据上传链路的剩余 `.onclick` 绑定（如仲裁标签切换、提交页动作、文件预览删除按钮等）。

2. 执行策略
- 继续采用“单轮多簇”方式，将仲裁中心页面内可同测的低风险交互合并处理。
- 对动态生成的删除按钮优先采用事件监听并评估是否需要绑定保护，避免重复渲染后事件叠加。

3. 验收标准
- 目标簇 `.onclick =` 清零；`get_errors` 无新增错误；`test:p0/test:p1/test:p2` 全通过；07/04/03/08 同步更新。

## 11. 当前执行记录补充（第二十一段）
1. 已完成：第六批第二十一段（`auth.js` 仲裁与证据上传链路同域多簇收口）。
2. 已完成：`showArbitrationCenter` 的标签切换与提交页动作分发由 `.onclick` 改为 `addEventListener('click', ...)`。
3. 已完成：`setupFilePreview` 的文件选择与删除动作由 `.onchange/.onclick` 改为 `addEventListener('change'/'click', ...)`。
4. 已完成：`loadMyArbitrations`、`showArbitrationManagement`、`loadArbitrationRequests` 的目标动作分发由 `.onclick` 改为 `addEventListener('click', ...)`。
5. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。

## 12. 下一阶段规划（第二十二段预案）
1. 目标范围
- 继续收口 `auth.js` 仲裁详情与罚款弹窗链路剩余 `.onclick/.onchange` 绑定（优先 `showArbitrationDetail`、`viewFile`、`setPenalty`、`payPenalty`）。

2. 执行策略
- 维持“单轮多簇”模式，优先处理同测域内的详情区动作分发、文件预览弹窗关闭、罚款上传凭证交互。
- 保持动态节点渲染后绑定原则，避免回退到内联事件模板。

3. 验收标准
- 目标簇 `.onclick =` 与 `.onchange =` 清零；`get_errors auth.js` 无新增错误；`test:p0/test:p1/test:p2` 全通过；07/04/03/08 四文档同步更新。

## 13. 当前执行记录补充（第二十二段）
1. 已完成：第六批第二十二段（`auth.js` 仲裁详情与罚款弹窗链路同域多簇收口）。
2. 已完成：`showArbitrationDetail` 的文件预览节点与详情动作分发由 `.onclick` 改为 `addEventListener('click', ...)`，失败回退按钮同步收口。
3. 已完成：`viewFile` 的关闭按钮与背景点击关闭由 `.onclick` 改为 `addEventListener('click', ...)`。
4. 已完成：`setPenalty` 与 `payPenalty` 的遮罩点击关闭、动作分发按钮由 `.onclick` 改为 `addEventListener('click', ...)`，且 `proofInput.onchange` 改为 `addEventListener('change', ...)`。
5. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。

## 14. 下一阶段规划（第二十三段预案）
1. 目标范围
- 继续收口 `auth.js` 非仲裁残留小簇 `.onclick/.onchange` 绑定（优先意向列表弹窗与登录相关交互簇，按低风险可同测优先）。

2. 执行策略
- 延续“改动较小时合并多问题”策略，单轮并行处理 2-3 个低风险簇并统一回归。
- 对动态渲染节点保持渲染后绑定与必要的防重复绑定标记，避免监听叠加。

3. 验收标准
- 目标簇 `.onclick =` 与 `.onchange =` 清零；`get_errors auth.js` 无新增错误；`test:p0/test:p1/test:p2` 全通过；07/04/03/08 四文档同步更新。

## 15. 当前执行记录补充（第二十三段）
1. 已完成：第六批第二十三段（`auth.js` 非仲裁低风险交互簇同域多簇收口）。
2. 已完成：`bindCmsTabActions`、`bindCmsFormActions`、`bindCmsListActions` 的分发绑定由 `.onclick` 改为 `addEventListener('click', ...)`。
3. 已完成：`bindDashboardActions`、`bindSidebarActions`、`viewIntentions` 的分发绑定由 `.onclick` 改为 `addEventListener('click', ...)`。
4. 已完成：`updateNavbar` 登录按钮改为单次 `addEventListener('click', ...)` + `data-auth-navbar-action` 分发，`supply-sort`、两处 `demand-permanent`、`target-type` 由 `.onchange` 改为 `addEventListener('change', ...)`。
5. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。

## 16. 下一阶段规划（第二十四段预案）
1. 目标范围
- 继续收口跨文件残留 `on*` 属性绑定（优先 `index.html` / `main_code.js` / `farmer-nearby-recyclers.html` 的边缘交互路径），并补一轮全文件残留复扫。

2. 执行策略
- 维持“改动较小时合并多问题”节奏，按同测域一次合并 2-3 个低风险簇，统一做回归和文档更新。
- 对可能重复渲染节点采用渲染后绑定与防重复绑定标记，避免监听叠加。

3. 验收标准
- 目标簇 `on*` 属性绑定清零；`get_errors` 无新增错误；`test:p0/test:p1/test:p2` 全通过；07/04/03/08 四文档同步更新。

## 17. 当前执行记录补充（第二十四段）
1. 已完成：第六批第二十四段（跨文件 `on*` 属性绑定清零收口）。
2. 已完成：`auth.js` 中剩余 `.onsubmit` 绑定改为 `addEventListener('submit', ...)`，覆盖 CMS、申报、求购/供应、仲裁提交表单。
3. 已完成：`userProfile.js` 列表项移除内联 `onmouseover/onmouseout`，改为 `profile-list-item` + CSS `:hover`。
4. 已完成：核心文件全量复扫（`auth.js/index.html/main_code.js/farmer-nearby-recyclers.html/userProfile.js`）目标 `on*` 模式无命中。
5. 已完成：自动化回归检测（`test:p0/test:p1/test:p2` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。

## 18. 下一阶段规划（第二十五段预案）
1. 目标范围
- 转入非事件绑定类收口：优先安全策略与文档门禁项（TODO-020/021/022）及自动化门禁固化（TODO-023/024）。

2. 执行策略
- 以“最小可交付”方式推进：每轮聚焦 1-2 个门禁项，完成实现、回归与文档同步。
- 在不扩大改动面的前提下补齐策略文档、审计日志约束与 README 里程碑落档。

3. 验收标准
- 门禁项状态可验证；`test:p0/test:p1/test:p2` 持续通过；07/04/03/08 与代码事实一致。

## 19. 当前执行记录补充（第二十五段）
1. 已完成：第六批第二十五段（Step2 安全门禁项 TODO-020/021/022/023/024 收口）。
2. 已完成：`server.js` 增加 `/api` 范围 `401/403/429` 安全审计日志中间件，日志落地 `logs/security-audit.log`。
3. 已完成：`server.js` 增加 `Content-Security-Policy`、`Referrer-Policy`、`Permissions-Policy` 全局响应头，并将 HSTS 调整为 HTTPS 条件下发。
4. 已完成：`tests/api_tests/test-p3-authz-negative.js` 与 `npm run test:p3`，覆盖缺失 token、无效 token、管理员越权、跨角色越权更新等负向路径。
5. 已完成：`docs/security/SECURITY_BASELINE.md` 与 `docs/README.md` 安全门禁文档固化。
6. 已完成：自动化回归检测（`test:p0/test:p1/test:p2/test:p3` 通过；本轮继续采用 fresh server instance 策略，结果稳定）。

## 20. Step2 阶段结论与下一阶段入口
1. 结论
- Step2 门禁项 `TODO-020/021/022/023/024` 已完成“实现 + 自动化 + 文档”闭环。
- Step2 阶段目标达到当前定义的最小可交付线，可进入下一阶段（Step3，鲁棒性与持续安全回归专项）。

2. 下一阶段建议（Step3）
- 将 `test:p3` 纳入日常发布前门禁，和 `test:p0/p1/p2` 并行执行。
- 增补更细粒度失败路径矩阵（并发异常、资源枯竭、降级链路）与长期审计留存策略。

## 21. Step2 收官判定（2026-04-19）
1. 判定范围
- 仅针对第六批第二十一至第二十五段与安全门禁项 `TODO-020/021/022/023/024`。

2. 收官结果
- 判定：`Completed`。
- 依据：`test:p0/test:p1/test:p2/test:p3` fresh server instance 全通过，且证据台账完成登记。

3. 收官证据路径
- `09-step2-closure-2026-04-19.md`
- `evidence/regression/2026-04-19_step2-final-gates_kk.md`
- `evidence/security/2026-04-19_step2-authz-audit-log_kk.md`