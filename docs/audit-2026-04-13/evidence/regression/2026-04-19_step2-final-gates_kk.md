# Step2 收官回归证据（Final Gate）

- 日期：2026-04-19
- 执行人：kk
- 执行方式：fresh server instance（每个测试独立端口启动并回收）

## 1. 执行矩阵

| 用例 | 端口 | 命令 | 结果 |
|---|---:|---|---|
| P0 Guardrails | 4304 | `BASE_URL=http://localhost:4304 npm run test:p0` | Pass |
| P1 Traceability | 4301 | `BASE_URL=http://localhost:4301 npm run test:p1` | Pass |
| P2 Mock Cleanup | 4302 | `BASE_URL=http://localhost:4302 npm run test:p2` | Pass |
| P3 Authz Negative | 4303 | `BASE_URL=http://localhost:4303 npm run test:p3` | Pass |

## 2. 关键输出摘录

### 2.1 P0
- 输出：`[P0] Guardrail negative tests passed.`
- 输出：`farmerReportId=84, recyclerSupplyId=32, recyclerRequestId=34, processorRequestId=43, intentionId=33`

### 2.2 P1
- 输出：`[P1] Traceability tests passed.`
- 输出：`farmerReportId=83, filePath=/uploads/arbitration/files-1776602606505-939570637.png`

### 2.3 P2
- 输出：`[P2] Static de-mock checks passed.`
- 输出：`[P2] API checks passed.`

### 2.4 P3
- 输出：`[P3] Authz negative tests passed.`
- 输出：`orderId=63, auditLog=/home/kk/code/project/project-ex-class-web/logs/security-audit.log`

## 3. 结论

- `test:p0/test:p1/test:p2/test:p3` 在收官回归中全部通过。
- Step2 定义的最小放行门禁满足当前阶段“可进入 Step3”的判定条件。
