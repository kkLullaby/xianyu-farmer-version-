# Step6-B2 认证信任边界收敛（2026-04-20）

- 状态：`Completed（B2-1）`
- 负责人：kk
- 关联阶段：`Step 6 - 小流量上线测试`
- 前置依据：`20-step6-entry-and-b1-canary-readiness-2026-04-20.md`

## 1. 本轮目标
1. 继续推进 Step6-B2，先关闭 P0 级遗留 TODO-003（认证信任边界仍在前端）。
2. 统一前端认证入口，避免同一能力在多个页面分叉实现。
3. 为后续 TODO-001/TODO-002 改造建立可复跑回归基线。

## 2. 实施范围
1. `src/pages/index/index.vue`
2. `src/utils/request.js`
3. `tests/api_tests/test-p9-auth-trust-boundary.js`
4. `package.json`

## 3. 实施内容
1. 首页认证入口统一：
- 移除首页手写 `/api/me` 请求与本地角色判断逻辑。
- 统一复用 `src/utils/session.js`：`syncSessionFromServer + roleAllowed + clearSessionStorage`。

2. 会话失效清理补齐：
- 在请求拦截 401 分支（含上传）统一清理 `agri_auth_token/current_role/current_user_name/current_user_phone`。
- 降低 token 失效后角色缓存残留风险。

3. 自动化防回退：
- 新增 `test:p9` 静态回归，检查项包括：
  - 首页不得保留手写 `/api/me` 请求。
  - 首页必须复用 `session` 工具。
  - 工作台页面必须保留 `syncSessionFromServer + roleAllowed` 防线。
  - `src/pages/**` 不允许直接读取 `current_role` 作为鉴权输入。

## 4. 验证结果
1. `node --check tests/api_tests/test-p9-auth-trust-boundary.js`：通过。
2. `npm run test:p9`：通过。
3. `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
4. 本轮观测：
- `test:p4`: `intentionId=59, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `recent401=26, recent403=24, recent429=18`

## 5. 证据归档
1. `evidence/regression/2026-04-20_step6-b2-auth-trust-boundary_kk.md`

## 6. 结论与下一步
1. TODO-003 已完成收口：前端角色缓存仅作展示，权限判断依赖服务端会话同步结果。
2. Step6-B2 保持进行中，下一修复入口：TODO-001（登录页占位）与 TODO-002（短信通道真实化）。

## 7. 后续补记（同日）
1. TODO-002 已在后续批次完成，见 `22-step6-b2-sms-runtime-guard-hardening-2026-04-20.md`。
