# Step3-B3 跨端降级与可观测告警联动（2026-04-20）

- 状态：`Approved`
- 负责人：kk
- 关联阶段：`Step 3 - 鲁棒性专项`
- 关联执行文档：`10-step3-entry-and-workplan-2026-04-19.md`

## 1. 目标
1. 为跨端（旧 H5 + Uni-app）补齐统一降级响应契约，避免依赖不可用时前端解释不一致。
2. 将安全失败路径（尤其限流）联动到运行时观测快照，形成“异常可见 + 告警可判定”基础能力。

## 2. 本轮改动
1. `server.js`
- `GET /api/config/amap` 在不可用场景返回结构化 `data`：
  - `error_code=AMAP_UNAVAILABLE`
  - `reason`（强制降级/未配置）
  - `degrade.fallback=manual-address`
- `GET /api/admin/settings/runtime` 增加 `observability`：
  - `recent_security_events`（最近窗口 `401/403/429`）
  - `active_alerts`（阈值触发告警）
  - `dependency_health`

2. `tests/api_tests/test-p4-failure-paths.js`
- 新增降级契约断言：校验 `error_code` 与 `degrade.fallback`。
- 新增可观测告警联动断言：
  - `recent_security_events.status_429 >= 1`
  - `active_alerts` 包含 `SECURITY_RATE_LIMIT_SPIKE`

## 3. 验证结果
1. `npm run test:gates`：通过。
2. `test:p4` 输出新增标记：`observability=rate-limit-alert-linked`。

## 4. 证据
1. `evidence/observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`
2. `evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`

## 5. 结论与下一步
1. Step3-B3 已完成：降级契约与告警联动具备自动化验证闭环。
2. 下一入口：Step3-B4（告警演练脚本与可观测门禁模板固化）。
