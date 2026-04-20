# Step5-B1 证据：迁移与回滚演练

- 日期：2026-04-20
- 执行人：kk
- 目标：验证数据库迁移与回滚链路至少各通过 1 次。

## 1. 执行命令

```bash
npm run test:p6
npm run test:gates
```

## 2. 输出摘要（节选）
1. `npm run test:p6`：通过。
- `[P6] Release drill passed.`
- `[P6] before=7abaa0acd52f, afterInit=d750040ff702, afterRollback=7abaa0acd52f`
2. `npm run test:gates`：通过。
- `test:p0~test:p5` 全部 `PASS`
- `test:p5` 告警统计：`recent401=39, recent403=33, recent429=27`

## 3. 判定
1. 迁移演练：通过（`afterInit` 生成新哈希且流程完成）。
2. 回滚演练：通过（`afterRollback` 与 `before` 一致）。
3. 回滚后服务可用：通过（健康检查成功）。

## 4. 结论
1. Step5-B1 达到阶段门禁中“迁移/回滚至少各 1 次通过”要求。
2. 可进入 Step5-B2（灰度与应急流程联合演练）。
