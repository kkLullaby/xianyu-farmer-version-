# Step6-B2 证据：登录收口与文档对齐（TODO-001 / TODO-009）

- 日期：2026-04-20
- 执行人：kk
- 目标：在“不依赖真实手机号鉴权”范围内，完成登录可用性收口与认证文档口径对齐。

## 1. 执行命令

```bash
node --check tests/api_tests/test-p11-login-readiness.js
npm run test:p11
npm run test:gray-drill
npm run test:processor-lifecycle
npm run test:auth-boundary
npm run test:sms-runtime
npm run test:login-readiness
npm run test:gates
```

## 2. 输出摘要（节选）
1. `npm run test:p11`：通过。
- `[P11] Login readiness checks passed.`
- `[P11] userId=2, role=farmer`

2. `npm run test:gray-drill`：通过。
- 灰度检查点 `10%/30%/50%` 全部 `PASS`。
- 回滚演练 `test:release-drill` 通过，哈希回滚一致。

3. `npm run test:processor-lifecycle`：通过。
- `[P8] Processor request lifecycle tests passed.`

4. `npm run test:auth-boundary`：通过。
- `[P9] Frontend auth trust-boundary checks passed.`

5. `npm run test:sms-runtime`：通过。
- `[P10] SMS runtime guard checks passed.`

6. `npm run test:gates`：通过。
- `test:p0~test:p5` 全部 `PASS`
- `test:p4`: `intentionId=67, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `recent401=45, recent403=38, recent429=31`

## 3. 本轮覆盖断言
1. 登录页已具备真实可调用链路，不是占位页。
2. 错误密码登录返回 `401`，未出现“伪成功”。
3. 认证边界、防回退、短信运行态门禁、主门禁与灰度回滚演练同时通过。
4. 集成测试报告已更新为当前 uni-app 与服务端会话回源口径，移除历史 H5 验收偏差。

## 4. 结论
1. TODO-001 已完成：登录收口可复跑、可验收。
2. TODO-009 已完成：认证实现与验收文档口径已对齐。
3. 在不依赖真实手机号账号的范围内，当前可进入上线前收口后的下一阶段（真实账号与短信注册接入）。
