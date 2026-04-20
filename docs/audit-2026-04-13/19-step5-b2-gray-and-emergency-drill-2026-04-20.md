# Step5-B2 灰度与应急流程联合演练（2026-04-20）

- 状态：`Completed`
- 负责人：kk
- 关联阶段：`Step 5 - 预发布演练`
- 前置依据：`18-step5-entry-and-b1-release-drill-2026-04-20.md`

## 1. 目标
1. 验证灰度放量检查点（10%/30%/50%）在自动化脚本中可稳定执行。
2. 验证应急回滚决策链路与回滚命令可在同一演练中闭环。
3. 形成 Step5 收官证据并移交 Step6 小流量验证。

## 2. 启动确认
- 任务名称：Step5-B2（灰度放量 + 应急回滚联合演练）
- 范围：灰度检查点脚本、回滚触发策略、回滚演练证据。
- 风险等级：中（涉及连续门禁与回滚命令联动）。
- 前置依赖：Step5-B1 迁移回滚脚本已落地并可复跑。
- 验证计划：`npm run test:p7`。
- 证据输出：`evidence/release-drill/2026-04-20_step5-b2-gray-emergency-drill_kk.md`
- 结论：允许启动。

## 3. 本轮交付
1. 新增联合演练脚本：`tests/api_tests/test-p7-gray-rollback-drill.js`。
2. 新增命令入口：
- `npm run test:p7`
- `npm run test:gray-drill`
3. 演练能力：
- 灰度检查点：10%（`test:p0`）、30%（`test:p2 + test:p3`）、50%（`test:p4 + test:p5`）
- 阈值控制：每个检查点具备耗时上限判定
- 回滚链路：值班负责人 -> 开发负责人 -> `npm run test:release-drill`

## 4. 验证结果
1. `npm run test:p7`：通过。
2. 检查点结果：
- 10%：PASS（3.4s）
- 30%：PASS（3.7s）
- 50%：PASS（4.3s）
3. 回滚演练：PASS（2.9s）
- 触发原因：`scheduled-drill-after-50%`
- `test:p6` 哈希摘要：`before=4584b1256434, afterInit=b1b5dd7ac050, afterRollback=4584b1256434`
4. `test:p5` 告警统计（本轮）：`recent401=39, recent403=31, recent429=27`

## 5. Step5 收官判定
1. 判定：`Closed`。
2. 依据：
- Step5-B1 已完成迁移/回滚脚本化与演练。
- Step5-B2 已完成灰度检查点与应急回滚联合演练。
- 发布演练门禁证据已归档。
3. 阶段移交：进入 Step6-B1（小流量上线测试准备）。

## 6. 下一入口
1. Step6-B1：小流量观察基线与放量门槛确认。
2. Step6-B2：真实小流量窗口执行与放量/回滚决策记录。
