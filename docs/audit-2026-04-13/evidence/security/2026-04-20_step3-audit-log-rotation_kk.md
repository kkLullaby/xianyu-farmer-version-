# Step3-B1 证据：审计日志轮转与留存策略验证

- 日期：2026-04-20
- 执行人：kk
- 目标：验证安全审计日志在低阈值条件下可触发轮转，且负向权限回归不受影响。

## 1. 代码改动范围
1. `server.js` 增加审计日志轮转与保留文件数控制。
2. 新增环境变量：
- `SECURITY_AUDIT_LOG_MAX_MB`（支持浮点）
- `SECURITY_AUDIT_LOG_MAX_FILES`
3. 管理端运行时配置返回新增字段：
- `security_audit_log_rotation_enabled`
- `security_audit_log_max_mb`
- `security_audit_log_max_files`

## 2. 轮转功能验证

### 2.1 验证命令

```bash
PORT=4310 SECURITY_AUDIT_LOG_MAX_MB=0.01 SECURITY_AUDIT_LOG_MAX_FILES=2 node server.js
curl http://localhost:4310/api/orders   # 无 token，触发 401 审计日志
curl http://localhost:4310/api/orders   # 第二次触发，验证轮转
ls -lh logs/security-audit.log*
wc -c logs/security-audit.log logs/security-audit.log.1
```

### 2.2 结果摘录
- `curl` 返回：`401`
- 轮转后文件：
  - `logs/security-audit.log`（241 bytes）
  - `logs/security-audit.log.1`（10566 bytes）
- 结论：轮转触发成功，归档文件生成正常。

## 3. 回归验证

### 3.1 命令

```bash
PORT=4311 node server.js
BASE_URL=http://localhost:4311 npm run test:p3
```

### 3.2 结果
- `[P3] Authz negative tests passed.`
- 结论：本轮改动未破坏现有负向权限用例。

## 4. 总结
1. 审计日志从“仅追加写入”升级为“可控增长 + 轮转归档”。
2. 修复符合 Step3 鲁棒性目标，已具备继续扩展留存策略文档的基础。
