# Step4-B2 证据：告警路由与值班交接演练

- 日期：2026-04-20
- 执行人：kk
- 目标：验证告警触发后的路由、升级与值班交接流程可执行。

## 1. 执行命令

```bash
npm run test:gates
```

## 2. 输出摘要（节选）
1. `test:p0~test:p5` 全部 `PASS`。
2. `test:p5` 输出：`[P5] Observability alert drill passed.`
3. 本轮统计：
- `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
- `recent401=39, recent403=33, recent429=27`

## 3. 值班交接演练（模板实填）
- 告警时间：2026-04-20 14:30
- 告警级别：SEV-2
- 告警代码：SECURITY_RATE_LIMIT_SPIKE
- 影响范围：登录接口短时限流峰值
- 首次研判结论：疑似压测窗口叠加导致
- 已执行动作：
  1) 值班负责人确认告警并记录
  2) 升级开发负责人复测 `npm run test:gates`
- 回退/缓解措施：维持限流阈值，持续观察 15 分钟窗口
- 结果摘要：复测通过，告警演练闭环
- 负责人：kk
- 关闭时间：2026-04-20 14:48

## 4. 结论
1. 告警路由链路可执行，值班交接模板可直接落地。
2. Step4-B2 演练完成，满足 Step4 收官条件。
