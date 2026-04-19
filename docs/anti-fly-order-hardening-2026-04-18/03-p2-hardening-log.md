# P2 修复记录（2026-04-18）

## 本批次目标
1. 清理核心业务页面的 Mock 回退逻辑，确保前端走真实 API。
2. 补齐订单详情与状态流转后端接口，闭合页面操作链路。
3. 新增 P2 自动化测试并归档执行结果。

## 1) 去 Mock 与真接口切换（已完成）

### 1.1 农户端
1. 农户申报列表
- 文件：`src/pages/farmer/report/list.vue`
- 变更：移除 `originalMockList` 与 `global_report_list` 兜底，改为 `GET /api/farmer-reports`。
- 补充：状态映射升级为 `pending/accepted/completed/rejected/cancelled`。

2. 农户申报详情
- 文件：`src/pages/farmer/report/detail.vue`
- 变更：移除本地存储 fallback，改为 `GET /api/farmer-reports/:id`。
- 补充：时间线与顶部状态横幅适配 `accepted/completed` 新语义。

3. 农户供货大厅
- 文件：`src/pages/farmer/supply/index.vue`
- 变更：移除 `originalMockList` 与 `global_demand_list` 混入逻辑。
- 接口：`GET /api/processor-requests?for_farmers=true`、`POST /api/intentions`。
- 展示：需求重量统一为“斤”；无价格显示“待协商”。

### 1.2 回收商端
1. 订单列表
- 文件：`src/pages/merchant/orders/index.vue`
- 变更：移除 mock 列表，改为 `GET /api/orders`。
- 补充：新增后端状态到前端文案映射（`pending_ship/shipped/completed`）。

2. 订单详情
- 文件：`src/pages/merchant/orders/detail.vue`
- 变更：移除 `useMockData` 与本地状态持久化。
- 接口：`GET /api/orders/:id`、`PATCH /api/orders/:id/status`。
- 补充：基于 `created_at/updated_at` 重建时间线展示。

### 1.3 处理商端
1. 订单列表
- 文件：`src/pages/processor/orders/index.vue`
- 变更：移除 mock 列表，改为 `GET /api/orders`。

2. 订单详情
- 文件：`src/pages/processor/orders/detail.vue`
- 变更：移除 `useMockData` 与本地状态持久化。
- 接口：`GET /api/orders/:id`、`PATCH /api/orders/:id/status`。

### 1.4 请求封装兼容
- 文件：`src/utils/request.js`
- 变更：请求层同时兼容信封响应（`{ code, msg, data }`）与普通 JSON 响应。
- 目的：避免“接口成功但前端误判失败”导致的假异常。

## 2) 后端订单接口闭环（已完成）

- 文件：`server.js`
- 新增/增强：
1. `GET /api/orders`
- 返回扩展字段：买卖双方姓名/手机号、地点信息。
- 按创建时间倒序返回，满足列表展示需求。

2. `GET /api/orders/:id`
- 支持按 `id` 或 `order_no` 查询。
- 加入角色权限校验（管理员、订单双方可访问，非参与方拒绝）。
- 处理路由冲突：`/api/orders/nearby` 优先保留。

3. `PATCH /api/orders/:id/status`
- 支持订单状态流转更新。
- 写入 `order_status_history`，保留状态变更记录。

## 3) 自动化测试与验证（已完成）

### 3.1 新增脚本
- `tests/api_tests/test-p2-mock-cleanup.js`
- `package.json` 新增命令：`npm run test:p2`

### 3.2 覆盖断言
1. 静态去 Mock 检查
- 核验核心页面不再包含 `originalMockList`、`global_*`、`useMockData` 等旧回退标记。
- 核验页面已引用目标真实 API 路径。

2. 动态订单接口检查
- 登录三角色账号并创建订单。
- 校验订单列表可见、详情可查、状态可更新（`shipped -> completed`）。
- 校验权限边界：非参与方查询订单详情返回 `403`。

### 3.3 本地执行结果
- `get_errors`（本轮相关文件）：无错误。
- `npm run test:p2`（BASE_URL=http://localhost:4100）：通过。
- `npm run test:p1`（BASE_URL=http://localhost:4100）：通过。
- `npm run test:p0`：本轮早先已通过（同会话已验证）。

> 说明：因启用了登录限流，自动化脚本建议按组分进程执行；必要时重启测试实例后运行下一组。

## 4) 归档结论
- P2 已从“页面侧识别问题”进入“代码落地 + 自动化验证通过 + 文档归档完成”。
- 防飞单专项当前阶段状态更新为：`P0/P1/P2 Verified Completed`。

## 5) 收官记录（2026-04-19）
- 已按分进程策略补做最终验收：`test:p2`、`test:p0`、`test:p1` 全部通过。
- 发布前测试痕迹清理已完成：回滚 `data/agri.db` 测试副作用，并删除两张测试上传文件。
- 收官报告见：`04-victory-report-2026-04-19.md`。
