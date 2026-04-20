# Step3-B4 告警演练与可观测门禁模板固化（2026-04-20）

- 状态：`Approved`
- 负责人：kk
- 关联阶段：`Step 3 - 鲁棒性专项`
- 关联执行文档：`10-step3-entry-and-workplan-2026-04-19.md`

## 1. 目标
1. 将可观测告警演练从“单次验证”升级为“可复跑门禁”。
2. 将 `401/403/429` 安全事件与运行时 `active_alerts` 建立稳定自动化断言链路。
3. 固化可复用的可观测证据模板，降低发布前取证成本。

## 2. 本轮改动
1. 新增 `tests/api_tests/test-p5-observability-alert-drill.js`：
- 读取运行时阈值并触发 `401/403/429`。
- 验证 `recent_security_events` 与三类告警码：
  - `SECURITY_AUTHN_DENIED_SPIKE`
  - `SECURITY_AUTHZ_DENIED_SPIKE`
  - `SECURITY_RATE_LIMIT_SPIKE`

2. 扩展合并门禁 `tests/api_tests/run-step3-b2-gates.js`：
- 门禁范围从 `p0~p4` 扩展到 `p0~p5`。
- 为 p5 注入低阈值演练环境变量，保证稳定复现。

3. 更新执行手册 `13-step3-b2-merged-gates-runbook-2026-04-20.md`：
- 端口池扩展到 `4320~4325`。
- 成功判定扩展为 `test:p0~test:p5` 全 `PASS`。

## 3. 验证结果
1. `node --check tests/api_tests/test-p5-observability-alert-drill.js`：通过。
2. `node --check tests/api_tests/run-step3-b2-gates.js`：通过。
3. `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
4. `test:p5` 输出包含：`Observability alert drill passed`。

## 4. 可观测证据模板（建议）
1. 记录命令：`npm run test:gates`。
2. 记录阈值：`status_401`、`status_403`、`status_429`。
3. 记录输出：`recent401/recent403/recent429` 与 `active_alerts` 告警码。
4. 记录结论：是否达到“可触发、可观测、可断言”的门禁标准。

## 5. 结论与下一步
1. Step3-B4 已完成“告警演练脚本 + 门禁纳管 + 证据模板”闭环。
2. 下一入口：Step4-B1（可观测性补齐：指标面板与值班告警说明）。
