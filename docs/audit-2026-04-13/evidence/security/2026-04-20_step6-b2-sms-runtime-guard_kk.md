# Step6-B2 证据：短信运行态门禁收敛（TODO-002）

- 日期：2026-04-20
- 执行人：kk
- 目标：验证短信通道在生产环境禁止 Mock，并形成可复跑防回退基线。

## 1. 执行命令

```bash
node --check tests/api_tests/test-p10-sms-runtime-guard.js
npm run test:p10
npm run test:gates
```

## 2. 输出摘要（节选）
1. `npm run test:p10`：通过。
- `[P10] SMS runtime guard checks passed.`

2. `npm run test:gates`：通过。
- `test:p0~test:p5` 全部 `PASS`
- `test:p4`: `intentionId=61, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `recent401=26, recent403=22, recent429=18`

## 3. 本轮覆盖断言
1. 运行态短信状态函数可区分 `providerConfigured/providerResolved/mockMode/runtimeReady`。
2. 开发环境允许 Mock 通道启动（便于本地联调）。
3. 生产环境配置为 Mock 时，服务启动失败并输出阻断原因。
4. 管理端运行态接口可返回短信门禁状态字段，支持值班排障。

## 4. 结论
1. TODO-002 已完成闭环：生产环境短信通道不再允许 Mock 降级。
2. 已建立自动化防回退基线（`test:p10` / `test:sms-runtime`）。
