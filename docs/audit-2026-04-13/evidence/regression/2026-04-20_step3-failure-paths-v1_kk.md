# Step3-B1 证据：失败路径矩阵 V1 自动化验证

- 日期：2026-04-20
- 执行人：kk
- 目标：验证 Step3-B1 第二段失败路径自动化（资源不可用、依赖不可用、并发冲突、限流）。

## 1. 执行命令

```bash
PORT=4312 node server.js
BASE_URL=http://localhost:4312 npm run test:p4
```

## 2. 结果摘录

- `[P4] Failure-path tests passed.`
- `[P4] amap=unavailable-503, intentionId=34, loginStatuses=401,401,429,429,429,429`

## 3. 覆盖场景
1. 资源不可用：不存在仲裁文件访问返回 `404`。
2. 依赖不可用：地图配置缺失时 `/api/config/amap` 返回 `503`。
3. 并发冲突：并发接受同一意向返回 `[200,409]`。
4. 限流保护：连续错误登录触发 `429`。

## 4. 结论

- Step3-B1 第二段失败路径自动化脚本可稳定通过。
- 失败路径矩阵 V1 的核心场景已具备自动化验证基础。
