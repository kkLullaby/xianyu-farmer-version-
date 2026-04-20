# Step6-B2 短信运行态门禁收敛（2026-04-20）

- 状态：`Completed（B2-2）`
- 负责人：kk
- 关联阶段：`Step 6 - 小流量上线测试`
- 前置依据：`21-step6-b2-auth-trust-boundary-hardening-2026-04-20.md`

## 1. 本轮目标
1. 关闭阻断项 TODO-002（短信验证码服务为 Mock）。
2. 建立“生产环境短信通道不可降级为 Mock”的启动硬门禁。
3. 增加自动化回归，避免短信通道配置回退。

## 2. 实施范围
1. `smsClient.js`
2. `server.js`
3. `tests/api_tests/test-p10-sms-runtime-guard.js`
4. `package.json`

## 3. 实施内容
1. 短信运行态门禁建模
- 在 `smsClient.js` 新增 `getSmsRuntimeStatus` 与 `ensureSmsRuntimeReady`。
- 统一解析 `SMS_PROVIDER` 与阿里云配置完整性，输出 `runtimeReady/mockMode/blockReason`。

2. 服务启动硬阻断
- `server.js` 启动阶段调用 `ensureSmsRuntimeReady(process.env)`。
- 生产环境若命中 Mock 通道或阿里云配置缺失，服务启动即失败并给出明确错误信息。

3. 管理端运行态可观测性增强
- `/api/admin/settings/runtime` 改为复用 `getSmsRuntimeStatus` 输出：
  - `sms_provider`（解析后）
  - `sms_provider_configured`（配置值）
  - `sms_aliyun_configured`
  - `sms_mock_mode`
  - `sms_runtime_ready`
  - `sms_runtime_block_reason`

4. 自动化回归补齐
- 新增 `tests/api_tests/test-p10-sms-runtime-guard.js`，覆盖：
  - 运行态状态函数断言（dev/prod + auto/mock/aliyun）。
  - 开发环境 Mock 可启动。
  - 生产环境 Mock 启动失败（硬阻断生效）。
- `package.json` 新增 `test:p10` 与 `test:sms-runtime`。

## 4. 验证结果
1. `node --check tests/api_tests/test-p10-sms-runtime-guard.js`：通过。
2. `npm run test:p10`：通过。
3. `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
4. 本轮观测：
- `test:p4`: `intentionId=61, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `recent401=26, recent403=22, recent429=18`

## 5. 证据归档
1. `evidence/security/2026-04-20_step6-b2-sms-runtime-guard_kk.md`

## 6. 结论与下一步
1. TODO-002 已完成收口：生产环境短信通道不可回退到 Mock，启动阶段即可阻断错误配置。
2. Step6-B2 后续已完成 TODO-001（登录收口）与 TODO-009（文档对齐），见 `23-step6-b2-login-and-doc-alignment-2026-04-20.md`。
