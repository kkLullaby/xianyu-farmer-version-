# P0 修复记录（2026-04-18）

## 本批次修复摘要

### 1) 明文联系方式泄露收敛（已完成）
- 在服务端新增手机号脱敏工具 `maskPhone`。
- 对以下接口输出进行收敛：
  - `/api/recyclers/nearby`：非管理员返回脱敏 `phone`。
  - `/api/purchase-requests`：非管理员返回脱敏 `contact_phone` 与 `recycler_phone`。
  - `/api/recycler-requests/:id`：非管理员且非所有者返回脱敏电话字段。
  - `/api/farmer-supplies`：市场列表默认脱敏 `farmer_phone` 与 `contact_phone`，仅管理员/所有者可见明文。
  - `/api/recycler-supplies`：市场列表默认脱敏 `recycler_phone` 与 `contact_phone`，仅管理员/所有者可见明文。
  - `/api/processor-requests`：列表默认脱敏 `processor_phone` 与 `contact_phone`，仅管理员/所有者可见明文。
  - `/api/processor-requests/:id`：详情默认脱敏电话字段，管理员/所有者保持明文。

### 2) 仲裁冻结后端拦截（已完成）
- 新增 `isTargetUnderActiveArbitration`，识别目标是否处于活跃仲裁（`pending/investigating`）。
- 对关键状态流转接口增加冻结拦截（409）：
  - `PATCH /api/farmer-reports/:id/status`
  - `POST /api/farmer-reports/:id/accept`
  - `PATCH /api/recycler-requests/:id/status`
  - `PATCH /api/processor-requests/:id/status`
  - `POST /api/processor-requests/:id/accept`
  - `PATCH /api/intentions/:id/status`

### 3) 仲裁提交与成单链路加固（已完成）
- 仲裁提交新增：
  - 订单类型白名单校验。
  - 目标记录存在性校验。
  - 活跃仲裁去重（重复提交返回 409）。
  - 必填证据数组长度校验（三类证据必须非空）。
  - 自动推导并写入 `respondent_id`（尽可能补齐双方身份）。
- 意向接受改造：
  - 先执行 `pending -> accepted` 条件更新抢占状态（原子锁）。
  - 抢占失败返回 409，避免并发重复成单。
  - 建单失败回滚意向状态为 `pending`。

### 4) P0 自动化负测（已完成）
- 新增脚本：`tests/api_tests/test-p0-guardrails.js`
- 新增命令：`npm run test:p0`
- 覆盖断言：
  - 联系方式脱敏：`/api/farmer-supplies`、`/api/recycler-supplies`、`/api/processor-requests`、`/api/processor-requests/:id`
  - 仲裁冻结拦截：`PATCH /api/processor-requests/:id/status` 在活跃仲裁下返回 `409`
  - 并发成单防重：并发 `PATCH /api/intentions/:id/status`（accepted）返回一成一冲突（`200 + 409`）
- 实测结果：通过（本地一次执行通过）。

## 校验结果
- `server.js` 语法/问题检查：无错误。
- `node --check server.js`：通过（无语法错误）。
- `npm run test:p0`：通过（P0 负测全绿）。

## 后续建议（下一批）
1. 将 `npm run test:p0` 接入上线门禁（Step 1 证据目录），作为发布前必过项。
2. 推进 P1：站内沟通留痕闭环与证据结构化治理。
