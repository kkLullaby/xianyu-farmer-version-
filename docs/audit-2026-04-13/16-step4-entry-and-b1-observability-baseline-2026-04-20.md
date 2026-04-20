# Step4 进入与 B1 可观测性基线（2026-04-20）

- 状态：`Completed（B1）`
- 负责人：项目负责人 / 开发负责人 / 测试负责人（联合）
- 关联阶段：`Step 4 - 可观测性补齐`
- 前置依据：`10-step3-entry-and-workplan-2026-04-19.md`

## 1. 阶段目标
1. 让关键异常具备“可发现、可定位、可告警、可处置”的标准化闭环。
2. 统一指标定义、阈值来源、告警分级与值班响应模板。
3. 将可观测性证据纳入发布前固定台账，降低人工解释成本。

## 2. 进入检查（已确认）
1. Step3 已收官，`test:p0~test:p5` 合并门禁通过。
2. 可观测告警联动（B3）与告警演练门禁化（B4）已完成。
3. 证据台账与执行手册已具备可复跑基础。

## 3. Step4-B1 启动确认（2026-04-20）
- 任务名称：Step4-B1（指标面板映射 + 告警分级 + 值班模板）
- 负责人：kk
- 目标：形成可执行的可观测性基线文档，并沉淀值班响应模板。
- 范围：可观测文档与证据（不改业务接口行为）。
- 风险等级：低（文档与流程固化为主）。
- 前置依赖检查：通过。
- 执行步骤：定义指标映射 -> 固化告警分级 -> 输出值班模板 -> 归档证据。
- 回滚方案：回退 Step4 文档增量，恢复 Step3 收官状态。
- 验证计划：`npm run test:gates` + 证据台账一致性复核。
- 证据输出路径：`evidence/observability/2026-04-20_step4-b1-observability-baseline_kk.md`
- 结论：允许启动。

## 4. 指标面板映射（B1 基线）

| 指标键 | 数据来源 | 窗口/频率 | 阈值来源 | 告警码 | 责任角色 |
|---|---|---|---|---|---|
| `security.status_401.count` | `/api/admin/settings/runtime -> observability.recent_security_events.status_401` | 15 分钟窗口，1 分钟采样 | `SECURITY_ALERT_AUTHN_THRESHOLD` | `SECURITY_AUTHN_DENIED_SPIKE` | 开发 + 安全 |
| `security.status_403.count` | `/api/admin/settings/runtime -> observability.recent_security_events.status_403` | 15 分钟窗口，1 分钟采样 | `SECURITY_ALERT_AUTHZ_THRESHOLD` | `SECURITY_AUTHZ_DENIED_SPIKE` | 开发 + 安全 |
| `security.status_429.count` | `/api/admin/settings/runtime -> observability.recent_security_events.status_429` | 15 分钟窗口，1 分钟采样 | `SECURITY_ALERT_RATE_LIMIT_THRESHOLD` | `SECURITY_RATE_LIMIT_SPIKE` | 开发 + 安全 |
| `security.alerts.active` | `/api/admin/settings/runtime -> observability.active_alert_count` | 1 分钟采样 | 固定阈值 `> 0` 观察 | 多告警聚合 | 值班负责人 |
| `dependency.amap.health` | `/api/admin/settings/runtime -> observability.dependency_health.amap` | 1 分钟采样 | 状态枚举 | 依赖健康异常 | 运维/开发 |
| `gate.step3.pass_rate` | `npm run test:gates` 汇总 | 每次发布前 | 固定阈值 `100%` | 发布阻断 | 测试负责人 |

## 5. 告警分级（B1）
1. `SEV-2`：`SECURITY_RATE_LIMIT_SPIKE` 连续 2 个采样窗口出现，或与 `AUTHN/AUTHZ` 同时触发。
2. `SEV-3`：仅单一 `AUTHN_DENIED` 或 `AUTHZ_DENIED` 超阈值，且业务核心接口可用。
3. `SEV-4`：依赖健康 `degraded-unconfigured` 且存在明确降级回退路径。

## 6. 值班响应模板（B1）

```markdown
### 告警处置记录（模板）
- 告警时间：
- 告警级别：SEV-2 / SEV-3 / SEV-4
- 告警代码：
- 影响范围：
- 首次研判结论：
- 已执行动作：
  1) 
  2) 
- 回退/缓解措施：
- 复测命令：`npm run test:gates`
- 结果摘要：
- 负责人：
- 关闭时间：
```

## 7. B1 验证结论
1. `test:p5` 已纳入合并门禁，告警演练可复跑。
2. 指标、阈值、告警码已形成一一映射。
3. 值班响应模板可直接用于 Step4-B2 演练。

## 8. 下一入口（Step4-B2）
1. 告警路由演练：值班接警 -> 升级链路 -> 复测关闭。
2. 形成值班交接说明与升级 SLA 证据。

## 9. 收官补记（2026-04-20）
1. Step4-B2 已完成，详见 `17-step4-b2-alert-routing-and-handover-drill-2026-04-20.md`。
2. 阶段已移交至 Step5-B1，详见 `18-step5-entry-and-b1-release-drill-2026-04-20.md`。
