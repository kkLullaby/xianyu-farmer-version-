# Step3-B1 失败路径矩阵 V1（2026-04-20）

- 状态：`Completed（V1 + B4演练闭环）`
- 负责人：kk
- 关联执行文档：`10-step3-entry-and-workplan-2026-04-19.md`
- 关联证据：`evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`、`evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`、`evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`、`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`、`evidence/observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`、`evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`

## 1. 目标与范围
1. 建立 Step3 失败路径最小可执行矩阵（V1），将关键异常场景转为可验证条目。
2. 先覆盖认证/鉴权、文件访问、依赖配置、意向并发、登录限流五条高频风险链路。
3. 为后续超时、重试与降级回退留出可追踪编号与补齐计划。

## 2. 失败路径矩阵（V1）

| 编号 | 主链路 | 失败类型 | 触发条件 | 预期行为 | 自动化覆盖 | 状态 |
|---|---|---|---|---|---|---|
| FP-001 | 仲裁文件访问 | 资源不可用 | 访问不存在的仲裁文件路径 | 返回 `404`，不泄露内部路径细节 | `test:p4` | 已完成 |
| FP-002 | 地图配置下发 | 依赖不可用 | `AMAP_WEB_KEY` 未配置 | `/api/config/amap` 返回 `503` 与明确提示 | `test:p4` | 已完成 |
| FP-003 | 意向状态推进 | 并发冲突 | 同一意向并发执行 `accepted` | 返回 `[200, 409]`，避免重复受理 | `test:p4` | 已完成 |
| FP-004 | 登录接口 | 限流触发 | 连续错误登录请求 | 命中 `429`，阻断暴力尝试 | `test:p4` | 已完成 |
| FP-005 | 管理端关键查询 | 超时 | 请求处理超过超时阈值 | 客户端可识别超时并触发降级提示 | `test:p4` | 已完成 |
| FP-006 | 鉴权中间件 | 匿名/坏 token | 无 token 或无效 token | 返回 `401`，审计日志记录原因码 | `test:p3` | 已完成 |
| FP-007 | 管理员边界 | 越权访问 | 非管理员访问管理员接口 | 返回 `403`，审计日志记录原因码 | `test:p3` | 已完成 |
| FP-008 | 管理端关键查询 | 重试恢复 | 首次请求因超时中止 | 立即重试返回 `200`，链路恢复 | `test:p4` | 已完成 |
| FP-009 | 地图配置依赖 | 降级回退 | 强制依赖不可用（`force_unavailable=1`） | 返回 `503` 且核心管理接口保持可用 | `test:p4` | 已完成 |

## 3. 本轮落地情况（2026-04-20）
1. 已新增 `tests/api_tests/test-p4-failure-paths.js`，并接入 `npm run test:p4`。
2. 已在 fresh server instance 执行并通过：`BASE_URL=http://localhost:4312 npm run test:p4`。
3. 已登记证据：`evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`。
4. 已补齐 FP-005：`BASE_URL=http://localhost:4313 npm run test:p4` 通过，证据 `evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`。
5. 已补齐 FP-008/FP-009：`BASE_URL=http://localhost:4314 npm run test:p4` 通过，证据 `evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`。

## 4. Step3-B2 执行结果
1. 已将 `test:p4` 纳入阶段门禁合并执行（`p0+p1+p2+p3+p4`），入口命令：`npm run test:gates`。
2. 已补齐门禁执行手册：`13-step3-b2-merged-gates-runbook-2026-04-20.md`。
3. 已完成合并门禁证据归档：`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`。

## 5. Step3-B3 执行结果
1. 已完成跨端降级契约：`/api/config/amap` 在不可用场景下返回结构化降级信息。
2. 已完成可观测告警联动：`/api/admin/settings/runtime` 增加最近安全事件统计与活跃告警快照。
3. 已完成自动化验证：`test:p4` 新增观测联动断言并在 `test:gates` 中通过。

## 6. Step3-B4 执行结果
1. 已新增 `test:p5`：`tests/api_tests/test-p5-observability-alert-drill.js`，覆盖可观测告警演练闭环。
2. 已将合并门禁扩展为 `p0+p1+p2+p3+p4+p5`，入口仍为 `npm run test:gates`。
3. 已更新执行手册并固化证据模板：`13-step3-b2-merged-gates-runbook-2026-04-20.md`、`15-step3-b4-observability-drill-and-gate-template-2026-04-20.md`。
4. 已完成证据归档：`evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`。

## 7. 下一段计划（Step4-B1）
1. 进入可观测性补齐阶段，固化关键指标面板映射与告警分级。
2. 输出值班响应模板与告警处置 Runbook，补齐 Step4 证据链。
