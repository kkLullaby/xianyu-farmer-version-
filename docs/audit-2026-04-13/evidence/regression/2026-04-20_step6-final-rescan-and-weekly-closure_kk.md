# Step6 最终复扫证据：全项目漏洞/未完成项/安全隐患与周收尾

- 日期：2026-04-20
- 执行人：kk
- 目标：完成上线前最终复扫，并输出本周收尾决策证据。

## 1. 执行命令（本轮）

```bash
# 静态复扫
rg -n "express\.static|query\.token|getTokenFromRequest|Authorization" server.js
rg -n "Content-Security-Policy|Referrer-Policy|Permissions-Policy|Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options" server.js
rg -n "onclick=\"|onmouseover=\"|onmouseout=\"|onerror=\"|onsubmit=\"|onchange=\"|onload=\"" auth.js index.html main_code.js farmer-nearby-recyclers.html userProfile.js
rg -n "javascript:void\(0\)" auth.js index.html main_code.js farmer-nearby-recyclers.html userProfile.js
rg -c "innerHTML\s*=" auth.js index.html main_code.js farmer-nearby-recyclers.html userProfile.js

# 动态探测
PORT=4390 node server.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:4390/server.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:4390/data/agri.db
curl -s -o /dev/null -w "%{http_code}" http://localhost:4390/db/schema.sql

PORT=4391 node server.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:4391/auth.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:4391/main_code.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:4391/index.html

# 门禁与演练复验
npm run test:gates
npm run test:release-drill
npm run test:gray-drill
npm run test:processor-lifecycle
npm run test:auth-boundary
npm run test:sms-runtime
npm run test:login-readiness
```

## 2. 输出摘要（节选）
1. `npm run test:gates`：通过（`test:p0~test:p5` 全部 `PASS`）。
- `test:p4`: `amap=unavailable-503, degrade=forced-503-core-ok, timeout=true, retry=timeout-then-success, observability=rate-limit-alert-linked, intentionId=71, loginStatuses=401,401,429,429,429,429`
- `test:p5`: `alerts=SECURITY_RATE_LIMIT_SPIKE,SECURITY_AUTHN_DENIED_SPIKE,SECURITY_AUTHZ_DENIED_SPIKE, recent401=26, recent403=22, recent429=18`

2. `npm run test:release-drill`：通过。
- `[P6] before=e347dc476341, afterInit=3a3c5b70c8ca, afterRollback=e347dc476341`

3. `npm run test:gray-drill`：通过。
- 10%/30%/50% 检查点全部 `PASS`。
- 回滚演练通过：`rollback -> PASS (3.2s) reason=scheduled-drill-after-50%`

4. 专项链路复验：全部通过。
- `test:processor-lifecycle`: `[P8] requestId=67, recyclerId=3, secondAcceptStatus=400`
- `test:auth-boundary`: `[P9] Frontend auth trust-boundary checks passed.`
- `test:sms-runtime`: `[P10] SMS runtime guard checks passed.`
- `test:login-readiness`: `[P11] userId=2, role=farmer`

5. 根目录暴露动态探测。
- `[Probe] /server.js -> 404`
- `[Probe] /data/agri.db -> 404`
- `[Probe] /db/schema.sql -> 404`

6. 旧 H5 入口可达性探测。
- `[Probe] /auth.js -> 200`
- `[Probe] /main_code.js -> 200`
- `[Probe] /index.html -> 200`

7. 旧 H5 渲染残余量化。
- `innerHTML =` 命中：`auth.js:95`、`index.html:6`、`main_code.js:1`、`userProfile.js:9`
- 内联 HTML 事件属性（`onclick="..."` 等）未命中。
- `javascript:void(0)` 未命中。

## 3. 本轮复扫判定
1. 高危根目录静态暴露未回归（动态探测 404）。
2. query token 泄露入口未检出。
3. 门禁与发布演练链路本轮全绿，可支持上线测试前评审。
4. 风险余额集中在旧 H5 历史渲染残余与文档/台账漂移，不构成当前范围阻断。

## 4. 结论
1. 在“不依赖真实手机号鉴权”范围内，系统达到本周收尾放行条件。
2. 建议进入 Step6 上线测试窗口。
3. 下一窗口优先接入真实短信注册链路并继续压缩旧 H5 渲染残余。
