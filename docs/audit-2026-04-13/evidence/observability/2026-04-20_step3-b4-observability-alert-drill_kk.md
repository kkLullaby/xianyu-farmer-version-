# Step3-B4 证据：可观测告警演练门禁验证

- 日期：2026-04-20
- 执行人：kk
- 目标：验证可观测告警演练（`test:p5`）已纳入合并门禁并稳定复跑。

## 1. 执行命令

```bash
npm run test:gates
```

## 2. 结果摘要
1. `test:p0~test:p5` 全部 `PASS`。
2. `test:p5` 输出：`[P5] Observability alert drill passed.`
3. `test:p5` 关键统计：
- `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE`
- `recent401=26, recent403=22, recent429=18`

## 3. 关键断言
1. 事件统计断言：
- `recent_security_events.status_401 >= threshold`。
- `recent_security_events.status_403 >= threshold`。
- `recent_security_events.status_429 >= threshold`。

2. 告警联动断言：
- `active_alerts` 包含 `SECURITY_AUTHN_DENIED_SPIKE`。
- `active_alerts` 包含 `SECURITY_AUTHZ_DENIED_SPIKE`。
- `active_alerts` 包含 `SECURITY_RATE_LIMIT_SPIKE`。

## 4. 结论
1. Step3-B4 告警演练门禁验证通过。
2. 可观测性门禁从“单点联动验证（B3）”升级为“固定演练门禁（B4）”。
