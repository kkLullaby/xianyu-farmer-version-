# Step2 安全审计日志证据

- 日期：2026-04-19
- 日志文件：`logs/security-audit.log`
- 证据来源：`tail -n 20 logs/security-audit.log`

## 1. 目标

验证 `/api` 范围内 `401/403/429` 事件已按策略写入结构化审计日志。

## 2. 样本事件（节选）

```json
{"ts":"2026-04-19T12:44:19.075Z","event_type":"AUTHN_DENIED","reason":"AUTH_HEADER_MISSING","status":401,"method":"GET","path":"/api/orders","actor_id":null,"role":"anonymous"}
{"ts":"2026-04-19T12:44:19.078Z","event_type":"AUTHN_DENIED","reason":"AUTH_TOKEN_INVALID","status":401,"method":"GET","path":"/api/orders","actor_id":null,"role":"anonymous"}
{"ts":"2026-04-19T12:44:19.082Z","event_type":"AUTHZ_DENIED","reason":"ADMIN_ROLE_REQUIRED","status":403,"method":"GET","path":"/api/admin/users","actor_id":2,"role":"farmer"}
{"ts":"2026-04-19T12:44:19.091Z","event_type":"AUTHZ_DENIED","reason":"AUTHORIZATION_DENIED","status":403,"method":"POST","path":"/api/processor-requests","actor_id":3,"role":"recycler"}
{"ts":"2026-04-19T12:44:19.095Z","event_type":"AUTHZ_DENIED","reason":"AUTHORIZATION_DENIED","status":403,"method":"POST","path":"/api/recycler-requests","actor_id":4,"role":"processor"}
{"ts":"2026-04-19T12:44:19.101Z","event_type":"AUTHZ_DENIED","reason":"AUTHORIZATION_DENIED","status":403,"method":"PATCH","path":"/api/orders/63/status","actor_id":2,"role":"farmer"}
```

## 3. 验证结论

- `401` 认证失败事件存在，且区分了缺失头与无效 token。
- `403` 越权事件存在，覆盖管理员接口越权与跨角色业务越权。
- 事件字段包含时间、状态、路径、角色、原因码，满足 Step2 审计可追溯要求。
