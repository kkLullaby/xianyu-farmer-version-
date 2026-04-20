# Step3-B2 证据：合并门禁执行验证

- 日期：2026-04-20
- 执行人：kk
- 目标：验证 `p0+p1+p2+p3+p4` 合并门禁一键执行能力与稳定性。

## 1. 执行命令

```bash
npm run test:gates
```

## 2. 结果摘录

- `[Gate] Step3-B2 合并门禁开始（fresh server instance）`
- `[P0] Guardrail negative tests passed.`
- `[P1] Traceability tests passed.`
- `[P2] Static de-mock checks passed.`
- `[P3] Authz negative tests passed.`
- `[P4] Failure-path tests passed.`
- `[Gate] Step3-B2 合并门禁通过。`

## 3. 执行矩阵

| 脚本 | Base URL | 结果 | 耗时 |
|---|---|---|---|
| `test:p0` | `http://localhost:4320` | PASS | 3.3s |
| `test:p1` | `http://localhost:4321` | PASS | 2.0s |
| `test:p2` | `http://localhost:4322` | PASS | 1.7s |
| `test:p3` | `http://localhost:4323` | PASS | 1.7s |
| `test:p4` | `http://localhost:4324` | PASS | 2.4s |

## 4. 关键输出
1. `test:p0`：`farmerReportId=85, recyclerSupplyId=33, recyclerRequestId=38, processorRequestId=44, intentionId=37`
2. `test:p1`：`farmerReportId=86, filePath=/uploads/arbitration/files-1776645647234-832068389.png`
3. `test:p3`：`orderId=71`
4. `test:p4`：`degrade=forced-503-core-ok, timeout=true, retry=timeout-then-success`

## 5. 结论
1. Step3-B2 合并门禁链路执行成功，`test:p0~test:p4` 全部通过。
2. fresh server instance 策略在合并执行中保持稳定，无额外限流噪声导致误判。
3. 可将 `npm run test:gates` 作为发布前固定门禁入口之一。
