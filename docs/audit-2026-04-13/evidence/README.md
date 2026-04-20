# 上线门禁证据目录说明

## 1. 目的
- 统一 Step 1 门禁证据存放方式，保证每条门禁都可回溯、可核验。

## 2. 目录结构
- regression/: 核心链路与回归执行记录
- security/: 复扫、漏洞复现与修复验证
- performance/: 压测数据与性能分析
- observability/: 日志、指标、告警与演练记录
- release-drill/: 迁移、回滚、灰度演练记录

## 3. 命名规范
- 建议格式: YYYY-MM-DD_topic_owner.ext
- 示例: 2026-04-17_auth-regression_kk.md

## 4. 门禁证据台账（持续更新）

| 门禁类别 | 证据文件路径 | 负责人 | 更新时间 | 结论 |
|---|---|---|---|---|
| 缺陷门禁 | `regression/2026-04-19_step2-final-gates_kk.md`、`regression/2026-04-20_step3-failure-paths-v1_kk.md`、`regression/2026-04-20_step3-timeout-failure-path_kk.md`、`regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`、`regression/2026-04-20_step3-b2-merged-gates_kk.md`、`regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md`、`regression/2026-04-20_step6-b2-auth-trust-boundary_kk.md`、`regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md`、`regression/2026-04-20_step6-final-rescan-and-weekly-closure_kk.md` | kk | 2026-04-20 | 通过（Step6最终复扫） |
| 安全门禁 | `security/2026-04-19_step2-authz-audit-log_kk.md`、`security/2026-04-20_step3-audit-log-rotation_kk.md`、`security/2026-04-20_step6-b2-sms-runtime-guard_kk.md` | kk | 2026-04-20 | 通过（Step6-B2增量） |
| 功能回归门禁 | `regression/2026-04-19_step2-final-gates_kk.md`、`regression/2026-04-20_step3-failure-paths-v1_kk.md`、`regression/2026-04-20_step3-timeout-failure-path_kk.md`、`regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`、`regression/2026-04-20_step3-b2-merged-gates_kk.md`、`regression/2026-04-20_step6-b1-processor-request-lifecycle_kk.md`、`regression/2026-04-20_step6-b2-auth-trust-boundary_kk.md`、`regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md`、`regression/2026-04-20_step6-final-rescan-and-weekly-closure_kk.md` | kk | 2026-04-20 | 通过（Step6最终复扫） |
| 鲁棒性门禁 | `security/2026-04-20_step3-audit-log-rotation_kk.md`、`regression/2026-04-20_step3-failure-paths-v1_kk.md`、`regression/2026-04-20_step3-timeout-failure-path_kk.md`、`regression/2026-04-20_step3-retry-degrade-failure-path_kk.md`、`regression/2026-04-20_step3-b2-merged-gates_kk.md`、`observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`、`observability/2026-04-20_step3-b4-observability-alert-drill_kk.md` | kk | 2026-04-20 | 通过（Step3收官） |
| 性能门禁 | 待补充 |  |  |  |
| 可观测性门禁 | `observability/2026-04-20_step3-b3-observability-alert-linkage_kk.md`、`observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`、`observability/2026-04-20_step4-b1-observability-baseline_kk.md`、`observability/2026-04-20_step4-b2-alert-routing-and-handover_kk.md` | kk | 2026-04-20 | 通过（Step4收官） |
| 发布演练门禁 | `release-drill/2026-04-20_step5-b1-migration-rollback-drill_kk.md`、`release-drill/2026-04-20_step5-b2-gray-emergency-drill_kk.md` | kk | 2026-04-20 | 通过（Step5收官） |
| 文档门禁 | `../09-step2-closure-2026-04-19.md`、`../10-step3-entry-and-workplan-2026-04-19.md`、`../12-step3-failure-path-matrix-v1-2026-04-20.md`、`../13-step3-b2-merged-gates-runbook-2026-04-20.md`、`../14-step3-b3-observability-alert-linkage-2026-04-20.md`、`../15-step3-b4-observability-drill-and-gate-template-2026-04-20.md`、`../16-step4-entry-and-b1-observability-baseline-2026-04-20.md`、`../17-step4-b2-alert-routing-and-handover-drill-2026-04-20.md`、`../18-step5-entry-and-b1-release-drill-2026-04-20.md`、`../19-step5-b2-gray-and-emergency-drill-2026-04-20.md`、`../20-step6-entry-and-b1-canary-readiness-2026-04-20.md`、`../21-step6-b2-auth-trust-boundary-hardening-2026-04-20.md`、`../22-step6-b2-sms-runtime-guard-hardening-2026-04-20.md`、`../23-step6-b2-login-and-doc-alignment-2026-04-20.md`、`../24-step6-final-weekly-closure-report-2026-04-20.md` | kk | 2026-04-20 | 通过（Step6最终收尾） |

## 5. 提交流程
1. 将证据文件放入对应子目录。
2. 在本文件台账中登记相对路径与结论。
3. 在门禁文档中引用该证据路径。
4. 提交后由对应责任人复核。
