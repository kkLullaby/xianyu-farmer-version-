# Step6-B2 登录收口与文档对齐（2026-04-20）

- 状态：`Completed（B2-3）`
- 负责人：kk
- 关联阶段：`Step 6 - 小流量上线测试`
- 前置依据：`22-step6-b2-sms-runtime-guard-hardening-2026-04-20.md`

## 1. 本轮目标
1. 关闭阻断项 TODO-001（登录页面仍为占位）。
2. 关闭阻断项 TODO-009（认证实现与验收文档未对齐）。
3. 在不依赖真实手机号账号的范围内完成收口上线测试。

## 2. 实施范围
1. `tests/api_tests/test-p11-login-readiness.js`
2. `package.json`
3. `docs/ai_logs/INTEGRATION_TEST_REPORT.md`
4. `docs/audit-2026-04-13/03-unfinished-items.md`
5. `docs/audit-2026-04-13/04-rescan-and-progress-2026-04-17.md`
6. `docs/audit-2026-04-13/02-bug-findings.md`
7. `docs/audit-2026-04-13/00-index.md`
8. `docs/audit-2026-04-13/05-release-readiness-phase-plan-2026-04-17.md`
9. `docs/audit-2026-04-13/evidence/README.md`

## 3. 实施内容
1. 登录收口自动化补齐
- 新增 `tests/api_tests/test-p11-login-readiness.js`。
- `package.json` 新增 `test:p11` 与 `test:login-readiness`。
- 检查项覆盖：登录页静态非占位、`/api/login` 成功链路、`/api/me` 会话可读、错误密码 `401`。

2. 集成验收文档重写对齐
- 重写 `docs/ai_logs/INTEGRATION_TEST_REPORT.md` 为当前口径。
- 明确当前主链路为 uni-app 页面 + 服务端会话回源。
- 移除旧版 H5（`index.html/auth.js`）作为验收依据的历史歧义。

3. 台账与索引状态同步
- `03-unfinished-items.md`：TODO-001、TODO-009 变更为已完成。
- `02-bug-findings.md`：BUG-003、BUG-004 状态同步为已完成。
- `04-rescan-and-progress-2026-04-17.md`：进度矩阵与 TODO 表更新。
- `00-index.md`、`05-release-readiness-phase-plan-2026-04-17.md`：阶段焦点更新。
- `evidence/README.md`：补登本轮证据与文档门禁条目。

## 4. 验证结果
1. `node --check tests/api_tests/test-p11-login-readiness.js`：通过。
2. `npm run test:p11`：通过（`[P11] userId=2, role=farmer`）。
3. `npm run test:gray-drill`：通过（灰度 10%/30%/50% + 回滚演练全绿）。
4. `npm run test:processor-lifecycle`：通过。
5. `npm run test:auth-boundary`：通过。
6. `npm run test:sms-runtime`：通过。
7. `npm run test:login-readiness`：通过。
8. `npm run test:gates`：通过（`test:p0~test:p5` 全绿）。

## 5. 证据归档
1. `evidence/regression/2026-04-20_step6-b2-login-readiness-and-doc-alignment_kk.md`

## 6. 结论与下一步
1. TODO-001 已完成：登录入口可用且已纳入自动化回归。
2. TODO-009 已完成：认证实现与验收文档口径一致。
3. 当前“不依赖真实手机号鉴权”的收口目标已完成。
4. 下一阶段建议：引入真实用户账号与短信注册真实链路，执行 Step6 真实小流量窗口验证。
