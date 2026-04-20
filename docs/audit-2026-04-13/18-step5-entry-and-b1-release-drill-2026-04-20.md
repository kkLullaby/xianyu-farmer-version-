# Step5 进入与 B1 预发布迁移回滚演练（2026-04-20）

- 状态：`Completed（B1）`
- 负责人：项目负责人 / 开发负责人 / 测试负责人（联合）
- 关联阶段：`Step 5 - 预发布演练`
- 前置依据：`17-step4-b2-alert-routing-and-handover-drill-2026-04-20.md`

## 1. 阶段目标
1. 验证迁移、回滚流程在当前代码与数据库状态下可执行。
2. 把“手工步骤”收敛为可复跑脚本，降低演练波动。
3. 为 Step5-B2 灰度应急演练准备稳定基线。

## 2. 进入检查（已确认）
1. Step4 已收官（B1/B2 完成并有证据）。
2. `test:p0~test:p5` 合并门禁通过。
3. 可观测值班模板已可直接复用。

## 3. Step5-B1 启动确认
- 任务名称：Step5-B1（迁移/回滚演练自动化）
- 负责人：kk
- 范围：脚本 + 门禁命令 + 证据文档。
- 风险等级：中（涉及数据库备份恢复流程）。
- 执行步骤：新增演练脚本 -> 接入 npm -> 执行演练 -> 证据归档。
- 回滚方案：删除 `test:p6` 脚本与命令，恢复原门禁集。
- 验证计划：`npm run test:p6` + `npm run test:gates`。
- 证据输出：`evidence/release-drill/2026-04-20_step5-b1-migration-rollback-drill_kk.md`
- 结论：允许启动。

## 4. 本轮交付
1. 新增演练脚本：`tests/api_tests/test-p6-release-drill.js`。
2. 命令接入：
- `npm run test:p6`
- `npm run test:release-drill`
3. 演练能力：
- 数据库备份
- `--init` 迁移演练
- 备份回滚恢复
- 回滚后服务健康检查

## 5. 验证结果
1. `npm run test:p6`：通过。
- 输出摘要：`Release drill passed`
- 哈希摘要：`before=7abaa0acd52f, afterInit=d750040ff702, afterRollback=7abaa0acd52f`
2. `npm run test:gates`：通过（`test:p0~test:p5` 全部 PASS）。

## 6. B1 结论
1. Step5-B1 已完成“迁移演练 + 回滚演练 + 健康校验”闭环。
2. Step5 进入下一任务：B2（灰度与应急流程联合演练）。

## 7. 下一入口（Step5-B2）
1. 灰度放量演练：定义 10% -> 30% -> 50% 放量检查点。
2. 应急回滚演练：定义触发阈值、决策人、回滚耗时记录。
3. Runbook 修订：形成最终预发布演练手册。

## 8. 收官补记（2026-04-20）
1. Step5-B2 已完成，详见 `19-step5-b2-gray-and-emergency-drill-2026-04-20.md`。
2. Step5 阶段已收官，阶段入口切换至 Step6-B1：`20-step6-entry-and-b1-canary-readiness-2026-04-20.md`。
