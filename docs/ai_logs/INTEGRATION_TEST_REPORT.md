# 前后端集成测试报告（当前口径）

## 1. 文档状态
- 状态：`Current`
- 更新时间：2026-04-20
- 说明：本文件用于替换旧版 H5 流程结论。历史 `index.html/auth.js` 流程记录不再作为当前上线验收依据。

## 2. 当前系统口径
1. 前端主体：`uni-app`（`src/pages/**`）。
2. 登录入口：`src/pages/login/index.vue`。
3. 登录接口：`POST /api/login`。
4. 手机号注册接口：`POST /api/auth/register-phone`（需 OTP）。
5. 会话一致性：
- 请求层：`src/utils/request.js`（401 统一清理会话缓存）。
- 页面层：`src/utils/session.js`（`syncSessionFromServer + roleAllowed`）。

## 3. 认证与短信口径
1. 认证边界：前端 `current_role` 仅作展示缓存，最终权限判断依赖服务端会话回源（`/api/me`）。
2. 短信通道：生产环境禁止 Mock，启动阶段执行短信门禁校验。
3. 运行态观测：`/api/admin/settings/runtime` 提供 `sms_runtime_ready/sms_runtime_block_reason`。

## 4. 当前自动化验收基线（2026-04-20）

### 4.1 核心门禁
```bash
npm run test:gates
```
- 覆盖：`test:p0~test:p5`
- 最近结论：通过

### 4.2 发布与回滚演练
```bash
npm run test:release-drill
npm run test:gray-drill
```
- 覆盖：迁移/回滚、灰度检查点与应急回滚链路
- 最近结论：通过

### 4.3 专项回归
```bash
npm run test:processor-lifecycle
npm run test:auth-boundary
npm run test:sms-runtime
npm run test:login-readiness
```
- 覆盖：
  - `test:processor-lifecycle`：`processor_requests` 生命周期
  - `test:auth-boundary`：认证信任边界防回退
  - `test:sms-runtime`：短信运行态门禁（生产禁止 Mock）
  - `test:login-readiness`：登录页非占位 + 账号登录可用
- 最近结论：通过

## 5. 相关执行文档
1. `docs/audit-2026-04-13/21-step6-b2-auth-trust-boundary-hardening-2026-04-20.md`
2. `docs/audit-2026-04-13/22-step6-b2-sms-runtime-guard-hardening-2026-04-20.md`
3. `docs/audit-2026-04-13/23-step6-b2-login-and-doc-alignment-2026-04-20.md`
4. `docs/audit-2026-04-13/evidence/regression/2026-04-20_step6-b2-auth-trust-boundary_kk.md`
5. `docs/audit-2026-04-13/evidence/security/2026-04-20_step6-b2-sms-runtime-guard_kk.md`
6. `docs/audit-2026-04-13/evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md`

## 6. 结论
1. 旧版“前端本地 mock 认证已全部替换”的描述风险已消除，文档口径与当前实现一致。
2. 当前可在不依赖真实手机号账号的前提下完成主要上线收口验证。
3. 引入真实用户账号与短信注册功能前，建议继续以本文件中的自动化基线作为回归门禁。
