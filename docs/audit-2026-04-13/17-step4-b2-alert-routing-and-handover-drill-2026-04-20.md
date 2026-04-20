# Step4-B2 告警路由演练与值班交接（2026-04-20）

- 状态：`Completed`
- 负责人：kk
- 关联阶段：`Step 4 - 可观测性补齐`
- 前置依据：`16-step4-entry-and-b1-observability-baseline-2026-04-20.md`

## 1. 目标
1. 验证告警事件从触发到响应的路由链路可执行。
2. 固化值班交接与升级动作，减少仅靠口头沟通造成的延迟。
3. 形成 Step4 收官证据，支持进入 Step5 预发布演练。

## 2. 启动确认
- 任务名称：Step4-B2（告警路由演练与值班交接）
- 范围：可观测门禁演练、响应模板实填、升级链路检查。
- 风险等级：低（不涉及业务逻辑改动）。
- 前置依赖：Step4-B1 已完成并有基线证据。
- 验证计划：`npm run test:gates` + 值班模板实填检查。
- 证据输出：`evidence/observability/2026-04-20_step4-b2-alert-routing-and-handover_kk.md`
- 结论：允许启动。

## 3. 演练场景
1. 触发场景：执行 `test:p5`，触发 `401/403/429` 告警组合。
2. 路由规则：
- `SEV-2`：值班负责人 5 分钟内确认，15 分钟内升级给开发负责人。
- `SEV-3`：值班负责人确认并在班次内闭环。
- `SEV-4`：记录并纳入下一次值班交接说明。
3. 交接模板：使用 Step4-B1 第 6 节模板实填一次演练记录。

## 4. 演练结果（基于本轮实跑）
1. `npm run test:gates` 通过（`test:p0~test:p5` 全部 PASS）。
2. `test:p5` 告警输出：
- `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
- `recent401=39, recent403=33, recent429=27`
3. 路由演练结论：
- 触发 -> 识别 -> 升级 -> 复测 -> 关闭 的流程可按模板执行。
- 交接字段完整性满足值班记录要求。

## 5. Step4 收官判定
1. 判定：`Closed`。
2. 依据：
- Step4-B1 指标映射、告警分级、模板已完成。
- Step4-B2 路由与交接演练已完成并有证据。
3. 阶段移交：进入 Step5-B1（预发布迁移/回滚演练）。

## 6. 下一入口
1. Step5-B1：预发布迁移与回滚演练自动化。
2. Step5-B2：灰度与应急流程联合演练（含放量/回滚判定）。
