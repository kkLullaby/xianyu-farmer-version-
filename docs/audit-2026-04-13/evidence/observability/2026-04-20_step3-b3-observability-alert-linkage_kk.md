# Step3-B3 证据：可观测告警联动验证

- 日期：2026-04-20
- 执行人：kk
- 目标：验证“失败路径 -> 运行时观测快照告警”链路可复现。

## 1. 执行命令

```bash
npm run test:gates
```

## 2. 核心结果
1. `test:p0~test:p4` 全部 `PASS`。
2. `test:p4` 输出包含：
- `degrade=forced-503-core-ok`
- `observability=rate-limit-alert-linked`
- `loginStatuses=401,401,429,429,429,429`

## 3. 联动断言说明
1. 降级契约断言
- 请求：`GET /api/config/amap?force_unavailable=1`
- 断言：`data.error_code=AMAP_UNAVAILABLE` 且 `data.degrade.fallback=manual-address`

2. 告警联动断言
- 在触发登录限流后请求：`GET /api/admin/settings/runtime`
- 断言：
  - `observability.recent_security_events.status_429 >= 1`
  - `observability.active_alerts` 包含 `SECURITY_RATE_LIMIT_SPIKE`

## 4. 结论
1. Step3-B3 可观测告警联动验证通过。
2. 失败路径异常已可在运行时观测快照中被识别并自动断言。
