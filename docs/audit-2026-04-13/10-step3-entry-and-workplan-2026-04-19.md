# Step3 进入与执行计划（2026-04-19）

- 状态：`Completed（B4收官）`
- 负责人：项目负责人 / 开发负责人 / 测试负责人（联合）
- 关联阶段：`Step 3 - 鲁棒性专项`
- 前置依据：`09-step2-closure-2026-04-19.md`

## 1. 阶段目标
1. 建立失败路径矩阵，覆盖超时、重试、并发、资源不可用、降级回退等关键异常路径。
2. 固化审计日志留存与追溯策略，形成可长期执行的运维规范。
3. 将鲁棒性与安全负向用例纳入发布前固定门禁流程。

## 2. 阶段进入检查（已确认）
1. Step2 收官已完成并获批。
2. `test:p0/test:p1/test:p2/test:p3` 在 fresh server instance 场景下通过。
3. Step2 证据台账已完成登记并可追溯。

## 3. 执行范围

### 3.1 必做项（本阶段）
1. 失败路径矩阵初版（接口级 + 链路级）。
2. 关键失败场景自动化覆盖补齐（并发冲突、资源不可用、权限边界回退）。
3. 安全审计日志留存策略（留存期、分级、轮转、脱敏检查）文档化。
4. 门禁执行手册更新，明确发布前必跑清单。

### 3.2 可并行项
1. 测试数据隔离与可重复回放策略。
2. 回归执行耗时优化（并行化、端口池策略、日志分片）。

## 4. 交付物清单
1. Step3 执行与进展文档（本文件持续更新）。
2. 失败路径矩阵文档（新增）。
3. 审计日志留存策略文档（新增或并入安全基线扩展章节）。
4. 回归证据文件（`docs/audit-2026-04-13/evidence/regression/`）。
5. 安全证据文件（`docs/audit-2026-04-13/evidence/security/`）。

## 5. 每次任务开始前必须确认
1. 使用 `11-task-kickoff-checklist-2026-04-19.md` 完成启动确认。
2. 未完成启动确认的任务，不允许进入代码改动与回归执行。

## 6. Step3-B1（首批任务建议）
1. 形成失败路径矩阵 V1，先覆盖认证、订单状态推进、仲裁、文件访问四条主链路。
2. 在现有 `test:p3` 基础上新增 `test:p4`，覆盖并发冲突、资源不可用、依赖不可用、限流、超时、重试与降级失败路径。
3. 输出审计日志留存策略 V1，并与当前 `logs/security-audit.log` 实际行为对齐。

## 7. 阶段门禁（Step3 结束判定）
1. 关键失败路径用例通过率 100%。
2. 新增失败路径自动化用例具备稳定复跑能力。
3. 审计留存策略可执行且有证据演示。
4. `00/04/05/10/证据台账` 文档状态一致。

## 8. 更新规则
1. 每轮任务完成后，必须同步更新 `04-rescan-and-progress-2026-04-17.md` 与证据台账。
2. 每次阶段结论更新时，必须回写 `00-index.md` 和 `05-release-readiness-phase-plan-2026-04-17.md`。

## 9. 任务启动确认（2026-04-20）
- 任务名称：Step3-B1 第一段（审计日志轮转与留存上限）
- 负责人：kk
- 目标：修复审计日志无限增长风险，补齐轮转与保留策略。
- 范围：`server.js` 审计日志写入链路 + Step3 文档与证据。
- 风险等级：中（涉及公共中间件写日志路径）。
- 前置依赖检查：通过（Step2 收官、测试脚本可执行、文档链路齐全）。
- 执行步骤：实现轮转逻辑 -> 低阈值触发验证 -> 回归 `test:p3` -> 文档与证据归档。
- 回滚方案：回退 `server.js` 本轮日志轮转改动，恢复单文件写入。
- 验证计划：`node --check server.js`、`get_errors server.js`、低阈值轮转验证、`npm run test:p3`。
- 证据输出路径：`evidence/security/2026-04-20_step3-audit-log-rotation_kk.md`
- 结论：允许启动。

## 10. 当前执行记录补充（Step3-B1 第一段）
1. 已完成：`server.js` 增加安全审计日志轮转能力（按文件大小触发，按份数保留归档）。
2. 已完成：新增运行时安全配置输出字段：`security_audit_log_rotation_enabled`、`security_audit_log_max_mb`、`security_audit_log_max_files`。
3. 已完成：低阈值验证（`SECURITY_AUDIT_LOG_MAX_MB=0.01`）触发轮转成功，`logs/security-audit.log.1` 生成。
4. 已完成：负向权限回归 `test:p3` 通过，未引入行为回退。
5. 已完成：证据归档 `evidence/security/2026-04-20_step3-audit-log-rotation_kk.md`。

## 11. 任务启动确认（2026-04-20，Step3-B1 第二段）
- 任务名称：Step3-B1 第二段（失败路径矩阵 V1 + 负向异常用例首批）
- 负责人：kk
- 目标：建立失败路径矩阵 V1，并落地首批自动化负向用例。
- 范围：`tests/api_tests/test-p4-failure-paths.js` + `package.json` 脚本接入 + Step3 文档与证据。
- 风险等级：中（涉及登录限流与并发负向路径，需控制测试顺序与 fresh server instance）。
- 前置依赖检查：通过（Step3-B1 第一段已完成，`test:p3` 稳定通过，文档链路可写入）。
- 执行步骤：编写 `test:p4` -> fresh 实例回归 -> 更新矩阵文档 -> 登记证据台账。
- 回滚方案：回退 `test:p4` 与文档增量，不影响线上运行路径。
- 验证计划：`node --check tests/api_tests/test-p4-failure-paths.js`、`BASE_URL=http://localhost:4312 npm run test:p4`。
- 证据输出路径：`evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`
- 结论：允许启动。

## 12. 当前执行记录补充（Step3-B1 第二段）
1. 已完成：新增失败路径自动化脚本 `tests/api_tests/test-p4-failure-paths.js` 并接入 `npm run test:p4`。
2. 已完成：`test:p4` 覆盖首批失败路径：资源不可用（404）、依赖不可用（503）、并发冲突（200/409）、限流触发（429）。
3. 已完成：新增失败路径矩阵文档 `12-step3-failure-path-matrix-v1-2026-04-20.md`，形成 V1 可追踪清单。
4. 已完成：fresh server instance 回归 `BASE_URL=http://localhost:4312 npm run test:p4` 通过。
5. 已完成：证据归档 `evidence/regression/2026-04-20_step3-failure-paths-v1_kk.md`。
6. 待继续：超时失败路径自动化（矩阵项 FP-005）转入 Step3-B1 第三段。

## 13. 任务启动确认（2026-04-20，Step3-B1 第三段）
- 任务名称：Step3-B1 第三段（FP-005 超时失败路径自动化补齐）
- 负责人：kk
- 目标：补齐管理端关键查询超时失败路径（FP-005）并完成回归。
- 范围：`server.js` 管理端运行时接口可控延迟模拟 + `tests/api_tests/test-p4-failure-paths.js` 超时断言 + 文档证据同步。
- 风险等级：中（涉及管理端运行时接口响应行为，需保持生产默认不受影响）。
- 前置依赖检查：通过（Step3-B1 第二段已完成，`test:p4` 稳定通过）。
- 执行步骤：增加可控延迟模拟 -> 增加超时断言 -> fresh 实例回归 -> 证据归档与文档同步。
- 回滚方案：回退 `server.js` 延迟模拟逻辑与 `test:p4` 超时断言，恢复第二段状态。
- 验证计划：`node --check server.js`、`node --check tests/api_tests/test-p4-failure-paths.js`、`BASE_URL=http://localhost:4313 npm run test:p4`。
- 证据输出路径：`evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`
- 结论：允许启动。

## 14. 当前执行记录补充（Step3-B1 第三段）
1. 已完成：`server.js` 的 `/api/admin/settings/runtime` 增加非生产可控延迟模拟（`simulate_delay_ms`，带上限保护）。
2. 已完成：`test:p4` 新增超时失败路径断言，使用 `AbortController` 验证 `timeout=true`。
3. 已完成：fresh server instance 回归 `BASE_URL=http://localhost:4313 npm run test:p4` 通过。
4. 已完成：证据归档 `evidence/regression/2026-04-20_step3-timeout-failure-path_kk.md`。
5. 当前状态：失败路径矩阵 V1（FP-001~FP-007）已全部覆盖。
6. 下一入口：Step3-B1 第四段（重试/降级路径，预留 FP-008/FP-009）。

## 15. 任务启动确认（2026-04-20，Step3-B1 第四段）
- 任务名称：Step3-B1 第四段（FP-008 重试恢复 + FP-009 降级回退）
- 负责人：kk
- 目标：补齐重试与降级失败路径自动化，并形成证据归档。
- 范围：`server.js` 地图配置接口非生产强制降级开关 + `tests/api_tests/test-p4-failure-paths.js` 重试/降级断言 + 文档与证据同步。
- 风险等级：中（涉及非生产测试开关，需确保生产默认不可触发）。
- 前置依赖检查：通过（第三段已完成，`test:p4` 超时路径稳定通过）。
- 执行步骤：补降级触发开关 -> 扩展 `test:p4` -> fresh 实例回归 -> 证据与文档同步。
- 回滚方案：回退 `server.js` 强制降级开关与 `test:p4` 对应断言。
- 验证计划：`node --check server.js`、`node --check tests/api_tests/test-p4-failure-paths.js`、`BASE_URL=http://localhost:4314 npm run test:p4`。
- 证据输出路径：`evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`
- 结论：允许启动。

## 16. 当前执行记录补充（Step3-B1 第四段）
1. 已完成：`server.js` 的 `/api/config/amap` 增加非生产强制依赖不可用开关（`force_unavailable=1`）。
2. 已完成：`test:p4` 增加 FP-008 重试恢复与 FP-009 降级回退断言。
3. 已完成：fresh server instance 回归 `BASE_URL=http://localhost:4314 npm run test:p4` 通过。
4. 已完成：证据归档 `evidence/regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`。
5. 当前状态：失败路径矩阵新增 FP-008/FP-009 并完成覆盖。
6. 下一入口：Step3-B2（门禁合并执行与执行手册固化）。

## 17. 任务启动确认（2026-04-20，Step3-B2）
- 任务名称：Step3-B2（门禁合并执行与执行手册固化）
- 负责人：kk
- 目标：将 `p0+p1+p2+p3+p4` 固化为可复跑的合并门禁，并形成执行手册。
- 范围：`tests/api_tests/run-step3-b2-gates.js` + `package.json` 聚合命令 + 文档证据同步。
- 风险等级：中（涉及多脚本串行执行与服务起停流程稳定性）。
- 前置依赖检查：通过（Step3-B1 已完成，`test:p0~test:p4` 单项稳定通过）。
- 执行步骤：新增聚合执行器 -> 接入命令 -> 真实执行验证 -> 手册与证据归档。
- 回滚方案：回退聚合脚本与 `package.json` 新增命令，恢复分脚本独立执行方案。
- 验证计划：`node --check tests/api_tests/run-step3-b2-gates.js`、`npm run test:gates`。
- 证据输出路径：`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`
- 结论：允许启动。

## 18. 当前执行记录补充（Step3-B2）
1. 已完成：新增 `tests/api_tests/run-step3-b2-gates.js`，顺序执行 `test:p0~test:p4`。
2. 已完成：`package.json` 新增 `npm run test:gates` 作为合并门禁入口。
3. 已完成：真实执行 `npm run test:gates` 通过（`test:p0~test:p4` 全部 PASS）。
4. 已完成：新增执行手册 `13-step3-b2-merged-gates-runbook-2026-04-20.md`。
5. 已完成：证据归档 `evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`。
6. 下一入口：Step3-B3（跨端降级场景扩展与可观测告警联动评估）。

## 19. 任务启动确认（2026-04-20，Step3-B3）
- 任务名称：Step3-B3（跨端降级契约与可观测告警联动）
- 负责人：kk
- 目标：补齐跨端降级响应契约，并将安全失败路径联动到运行时可观测告警快照。
- 范围：`server.js`（降级契约 + 观测快照）+ `tests/api_tests/test-p4-failure-paths.js`（联动断言）+ 文档证据同步。
- 风险等级：中（涉及运行时响应结构与 admin 观测字段扩展）。
- 前置依赖检查：通过（Step3-B2 合并门禁已稳定通过）。
- 执行步骤：扩展降级响应 -> 增加观测告警快照 -> 扩展 `test:p4` 断言 -> 执行 `test:gates` -> 文档与证据归档。
- 回滚方案：回退 `server.js` 与 `test:p4` 本轮改动，恢复 Step3-B2 状态。
- 验证计划：`node --check server.js`、`node --check tests/api_tests/test-p4-failure-paths.js`、`npm run test:gates`。
- 证据输出路径：`evidence/observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`
- 结论：允许启动。

## 20. 当前执行记录补充（Step3-B3）
1. 已完成：`/api/config/amap` 的不可用场景返回结构化降级信息（`error_code` + `degrade.fallback`）。
2. 已完成：`/api/admin/settings/runtime` 新增 `observability` 快照（最近安全事件统计、活跃告警、依赖健康）。
3. 已完成：`test:p4` 新增降级契约断言与限流告警联动断言。
4. 已完成：`npm run test:gates` 全通过，`test:p4` 输出 `observability=rate-limit-alert-linked`。
5. 已完成：证据归档 `evidence/observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`。
6. 下一入口：Step3-B4（告警演练脚本与可观测门禁模板固化）。

## 21. 任务启动确认（2026-04-20，Step3-B4）
- 任务名称：Step3-B4（告警演练脚本与可观测门禁模板固化）
- 负责人：kk
- 目标：将可观测告警演练纳入固定门禁，并固化可复用证据模板。
- 范围：`tests/api_tests/test-p5-observability-alert-drill.js` + `tests/api_tests/run-step3-b2-gates.js` + `13-step3-b2-merged-gates-runbook-2026-04-20.md` + Step3 文档证据同步。
- 风险等级：中（涉及门禁范围扩展与阈值注入策略，需保持运行稳定）。
- 前置依赖检查：通过（Step3-B3 已完成，`test:gates` 与 `test:p4` 稳定）。
- 执行步骤：新增 `test:p5` -> 扩展 `test:gates` -> fresh 实例全量回归 -> 文档证据同步。
- 回滚方案：回退 `test:p5` 与 `test:gates` 的 p5 注入配置，恢复 B3 门禁基线。
- 验证计划：`node --check tests/api_tests/test-p5-observability-alert-drill.js`、`node --check tests/api_tests/run-step3-b2-gates.js`、`npm run test:gates`。
- 证据输出路径：`evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`
- 结论：允许启动。

## 22. 当前执行记录补充（Step3-B4）
1. 已完成：新增 `tests/api_tests/test-p5-observability-alert-drill.js`，覆盖 `401/403/429` 告警演练与三类告警码断言。
2. 已完成：`tests/api_tests/run-step3-b2-gates.js` 扩展为 `test:p0~test:p5`，并为 p5 注入低阈值演练环境变量。
3. 已完成：`npm run test:gates` 全通过，`test:p5` 输出 `Observability alert drill passed`。
4. 已完成：更新执行手册 `13-step3-b2-merged-gates-runbook-2026-04-20.md`，将 p5 纳入固定门禁。
5. 已完成：新增执行文档 `15-step3-b4-observability-drill-and-gate-template-2026-04-20.md` 与证据 `evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`。
6. 下一入口：Step4-B1（可观测性补齐：指标面板与值班告警说明）。

## 23. Step3 收官判定（2026-04-20）
1. 判定结果
- 判定：`Completed`。
- 依据：`test:p0~test:p5` 合并门禁稳定通过，失败路径与可观测告警演练均完成自动化验证。

2. 对齐检查
- `00-index.md`、`04-rescan-and-progress-2026-04-17.md`、`05-release-readiness-phase-plan-2026-04-17.md`、`evidence/README.md` 已同步到 Step3 收官状态。

3. 阶段移交
- 下一阶段：Step4（可观测性补齐）。
- 执行文档：`16-step4-entry-and-b1-observability-baseline-2026-04-20.md`。
