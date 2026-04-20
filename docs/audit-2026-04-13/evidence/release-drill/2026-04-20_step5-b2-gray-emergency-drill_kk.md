# Step5-B2 证据：灰度与应急流程联合演练

- 日期：2026-04-20
- 执行人：kk
- 目标：验证灰度检查点与应急回滚链路可在同一轮演练中闭环。

## 1. 执行命令

```bash
npm run test:p7
```

## 2. 输出摘要（节选）
1. `npm run test:p7`：通过。
2. 灰度检查点：
- checkpoint 10% -> PASS（3.4s）
- checkpoint 30% -> PASS（3.7s）
- checkpoint 50% -> PASS（4.3s）
3. 回滚演练：
- rollback -> PASS（2.9s）
- reason = `scheduled-drill-after-50%`
4. 回滚内部 `test:p6` 哈希摘要：
- `before=4584b1256434`
- `afterInit=b1b5dd7ac050`
- `afterRollback=4584b1256434`
5. `test:p5` 告警统计（本轮）：
- `recent401=39, recent403=31, recent429=27`

## 3. 判定
1. 灰度检查点演练：通过。
2. 应急回滚链路：通过。
3. 回滚后服务可用：通过（由 `test:p6` 健康检查保证）。

## 4. 结论
1. Step5-B2 达到“灰度流程 + 应急回滚”联合演练要求。
2. Step5 可收官并进入 Step6-B1。
