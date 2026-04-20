# Step3-B2 门禁合并执行手册（2026-04-20）

- 状态：`Approved`
- 负责人：kk
- 关联阶段：`Step 3 - 鲁棒性专项`
- 关联脚本：`tests/api_tests/run-step3-b2-gates.js`
- 关联命令：`npm run test:gates`

## 1. 目标
1. 将 `p0+p1+p2+p3+p4+p5` 固化为一次可复跑的合并门禁执行流程。
2. 保持每个门禁脚本使用 fresh server instance，降低登录限流等环境噪声影响。
3. 统一输出可审计证据，减少发布前人工拼接回归结果成本。

## 2. 适用范围
1. 发布前全量回归。
2. Step3 阶段每轮关键改动后的稳定性验收。
3. 需要统一归档回归证据的里程碑节点。

## 3. 执行前检查
1. 工作目录位于仓库根目录。
2. `node` 与 `npm` 可用。
3. 端口 `4320~4325` 未被长驻服务占用。
4. 不在 `NODE_ENV=production` 下执行失败路径测试。

## 4. 执行步骤

### 4.1 一键执行

```bash
npm run test:gates
```

### 4.2 执行器行为
1. 顺序执行 `test:p0` 到 `test:p5`。
2. 每个脚本启动独立实例并使用独立 `BASE_URL`：

| 门禁脚本 | 端口 | Base URL |
|---|---:|---|
| `test:p0` | 4320 | `http://localhost:4320` |
| `test:p1` | 4321 | `http://localhost:4321` |
| `test:p2` | 4322 | `http://localhost:4322` |
| `test:p3` | 4323 | `http://localhost:4323` |
| `test:p4` | 4324 | `http://localhost:4324` |
| `test:p5` | 4325 | `http://localhost:4325` |

3. 任一脚本失败会立即停止后续执行并输出失败汇总。

## 5. 成功判定标准
1. 控制台出现 `Step3-B2 合并门禁通过`。
2. 汇总区 `test:p0~test:p5` 全部为 `PASS`。
3. 对应回归证据文件已归档到 `evidence/regression/`。

## 6. 失败处理与重跑
1. 先按失败项单独复跑，例如：

```bash
BASE_URL=http://localhost:4323 npm run test:p3
```

2. 如为环境冲突，释放端口后重跑 `npm run test:gates`。
3. 如为脚本逻辑回归，先修复代码并补充证据，再重新执行全量合并门禁。

## 7. 证据模板（建议）
1. 命令：`npm run test:gates`。
2. 记录项：
- 每个脚本的端口、结果、耗时。
- 每个脚本关键输出摘录（ID、状态序列、降级/重试标记等）。
- 最终结论（通过/失败）与后续动作。

## 8. 当前基线
1. 基线执行时间：2026-04-20。
2. Step3-B2 基线证据：`evidence/regression/2026-04-20_step3-b2-merged-gates_kk.md`。
3. Step3-B4 增量证据：`evidence/observability/2026-04-20_step3-b4-observability-alert-drill_kk.md`。
4. 当前结论：合并门禁已覆盖 `test:p0~test:p5`，可用于发布前固定回归。
