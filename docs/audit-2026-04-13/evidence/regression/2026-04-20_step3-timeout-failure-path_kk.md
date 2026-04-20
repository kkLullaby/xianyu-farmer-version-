# Step3-B1 证据：超时失败路径自动化验证

- 日期：2026-04-20
- 执行人：kk
- 目标：完成 FP-005（管理端关键查询超时）自动化，并复核 `test:p4` 全量场景。

## 1. 执行命令

```bash
PORT=4313 node server.js
BASE_URL=http://localhost:4313 npm run test:p4
```

## 2. 结果摘录

- `[P4] Failure-path tests passed.`
- `[P4] amap=unavailable-503, timeout=true, intentionId=35, loginStatuses=401,401,429,429,429,429`

## 3. FP-005 覆盖说明
1. `test:p4` 使用管理员 token 请求：`GET /api/admin/settings/runtime?simulate_delay_ms=1500`。
2. 客户端设置 `timeoutMs=300`，通过 `AbortController` 触发请求超时中止。
3. 断言 `timeout=true`，并在后续再次请求 `GET /api/admin/settings/runtime` 验证服务仍可用（HTTP 200）。

## 4. 结论

- FP-005 已完成自动化覆盖，失败路径矩阵 V1 不再存在“待补超时”缺口。
- `test:p4` 当前覆盖：资源不可用、依赖不可用、并发冲突、超时、限流五类失败场景。
