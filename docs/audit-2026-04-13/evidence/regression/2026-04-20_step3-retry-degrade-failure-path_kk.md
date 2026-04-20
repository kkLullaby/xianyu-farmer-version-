# Step3-B1 证据：重试与降级失败路径自动化验证

- 日期：2026-04-20
- 执行人：kk
- 目标：完成 FP-008（重试恢复）与 FP-009（依赖降级回退）自动化覆盖。

## 1. 执行命令

```bash
PORT=4314 node server.js
BASE_URL=http://localhost:4314 npm run test:p4
```

## 2. 结果摘录

- `[P4] Failure-path tests passed.`
- `[P4] amap=unavailable-503, degrade=forced-503-core-ok, timeout=true, retry=timeout-then-success, intentionId=36, loginStatuses=401,401,429,429,429,429`

## 3. FP-008 覆盖说明（重试恢复）
1. 首次请求：`GET /api/admin/settings/runtime?simulate_delay_ms=1500`，客户端 `timeoutMs=300`，触发超时中止。
2. 立即重试：`GET /api/admin/settings/runtime`，响应 `200`。
3. 判定：`retry=timeout-then-success`，满足“瞬时失败后恢复”。

## 4. FP-009 覆盖说明（降级回退）
1. 强制依赖不可用：`GET /api/config/amap?force_unavailable=1` 返回 `503`。
2. 回退可用性验证：`GET /api/admin/settings/runtime` 仍返回 `200`。
3. 判定：`degrade=forced-503-core-ok`，满足“依赖失败不阻断核心链路”。

## 5. 结论

- FP-008 与 FP-009 已完成自动化覆盖。
- `test:p4` 当前覆盖：资源不可用、依赖不可用、并发冲突、超时、重试、降级、限流。
