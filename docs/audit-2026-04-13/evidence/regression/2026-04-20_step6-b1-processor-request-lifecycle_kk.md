# Step6-B1 证据：processor_requests 生命周期回归

- 日期：2026-04-20
- 执行人：kk
- 目标：验证 processor_requests 模型字段映射、接单与状态流转链路可用。

## 1. 执行命令

```bash
# lifecycle regression (with fresh server runner)
npm run test:processor-lifecycle

# baseline gates
npm run test:gates
```

## 2. 输出摘要（节选）
1. `npm run test:processor-lifecycle`：通过。
- `[P8] Processor request lifecycle tests passed.`
- `requestId=56, recyclerId=3, secondAcceptStatus=400`
2. `npm run test:gates`：通过。
- `test:p0~test:p5` 全部 `PASS`

## 3. 本轮覆盖断言
1. 创建/更新使用 API 字段 `citrus_type/location_address`，查询详情映射正确。
2. 回收商可接单，重复接单被拒绝（400/409）。
3. 非处理商不可更新处理商求购状态（403）。
4. 关闭后的求购不出现在 `for_recyclers=true` 市场列表中。

## 4. 结论
1. TODO-004 对应的 BUG-001/BUG-002（字段错配与接单链路）已通过自动化验证。
2. processor_requests 模型收敛与生命周期链路具备稳定回归基线。
