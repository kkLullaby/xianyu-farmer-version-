# Step6-B2 证据：认证信任边界收敛（TODO-003）

- 日期：2026-04-20
- 执行人：kk
- 目标：验证前端认证信任边界从“本地角色缓存驱动”收敛为“服务端会话同步驱动”。

## 1. 执行命令

```bash
node --check tests/api_tests/test-p9-auth-trust-boundary.js
npm run test:p9
npm run test:gates
```

## 2. 输出摘要（节选）
1. `npm run test:p9`：通过。
- `[P9] Frontend auth trust-boundary checks passed.`

2. `npm run test:gates`：通过。
- `test:p0~test:p5` 全部 `PASS`
- `test:p4`: `intentionId=59, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `recent401=26, recent403=24, recent429=18`

## 3. 本轮覆盖断言
1. 首页认证入口必须使用 `syncSessionFromServer`，不得保留手写 `/api/me` 请求逻辑。
2. 首页权限判断必须复用 `roleAllowed`，不得维护本地重复鉴权函数。
3. 工作台页面保持 `syncSessionFromServer + roleAllowed` 防线。
4. `src/pages/**` 不允许直接读取 `current_role` 作为鉴权输入。
5. 请求 401 后统一清理会话缓存，避免失效身份残留。

## 4. 结论
1. TODO-003 对应风险已完成闭环：角色缓存不再作为信任源，服务端会话成为唯一身份依据。
2. 已具备可复跑防回退基线（`test:p9`）。
