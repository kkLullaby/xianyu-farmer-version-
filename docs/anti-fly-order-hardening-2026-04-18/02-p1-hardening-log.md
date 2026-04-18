# P1 修复记录（2026-04-18）

## 本批次目标
1. 仲裁证据权限校验从 `JSON LIKE` 升级为结构化关联查询。
2. 补齐站内沟通留痕服务端能力，形成“写入-查询-已读”闭环。
3. 建立 P1 自动化验证脚本并归档执行结果。

## 1) 仲裁证据结构化治理（已完成）

### 1.1 数据模型
- 新增表：`arbitration_file_refs`
  - 字段：`arbitration_id`、`file_group`、`file_path`、`created_at`
  - 约束：`UNIQUE(arbitration_id, file_group, file_path)`
  - 索引：`idx_arb_file_refs_arbitration`、`idx_arb_file_refs_path`
- 已同步落地到：
  - `db/schema.sql`（全量初始化）
  - `server.js` `runMigrations()`（增量迁移）

### 1.2 迁移回填
- 启动迁移会扫描 `arbitration_requests` 历史记录，解析以下字段并回填到结构化表：
  - `evidence_trade`
  - `evidence_material`
  - `evidence_payment`
  - `evidence_communication`
  - `evidence_other`
  - `penalty_proof`
- 兼容历史数据形态：
  - 纯路径字符串
  - JSON 字符串
  - 对象（含 `path/url/filePath/filename`）

### 1.3 写入链路
- 仲裁提交 `POST /api/arbitration-requests`
  - 在 `arbitration_requests` 写入成功后，同步写入 `arbitration_file_refs`。
- 罚款凭证 `POST /api/arbitration-requests/:id/pay-penalty`
  - `penalty_proof` 更新成功后，同步写入 `arbitration_file_refs`。

### 1.4 鉴权链路
- `verifyArbitrationFileAccess` 已改为结构化精确校验：
  - 通过 `arbitration_file_refs.file_path` 精确匹配文件
  - 关联 `arbitration_requests` 校验 `applicant_id/respondent_id`
- 已移除原先的 `penalty_proof/evidence_* LIKE` 鉴权方式依赖。

## 2) 站内沟通留痕闭环（已完成）

### 2.1 新增 API
1. `POST /api/chats/messages`
- 发送并落库消息。
- 按 `target_type` 自动路由到对应表：
  - `farmer_report` -> `chat_messages`
  - `recycler_request` -> `request_chat_messages`
  - `processor_request` -> `processor_chat_messages`

2. `GET /api/chats/messages`
- 查询聊天历史，支持：
  - `target_type`
  - `target_id`
  - `peer_id`（可选）
  - `before_id`（可选）
  - `limit`（默认 50，最大 200）

3. `POST /api/chats/messages/read`
- 标记与指定 `peer_id` 的消息为已读。
- 支持可选 `before_id` 批量标记。

### 2.2 权限策略
- 非管理员发送消息时，要求会话双方至少一方是目标所有者。
- 非目标所有者查询历史时，必须传 `peer_id`，且 `peer_id` 必须是目标所有者。
- 已读标记同样遵循“仅目标所有者链路”约束。

## 3) 自动化验证（已完成）

### 3.1 新增脚本
- `tests/api_tests/test-p1-traceability.js`
- `package.json` 新增命令：`npm run test:p1`

### 3.2 覆盖断言
1. 证据结构化链路
- 上传仲裁文件成功。
- 发起仲裁后，申请人可访问证据文件（HTTP 200）。
- 非参与方访问同一文件被拒绝（HTTP 403）。

2. chat 留痕链路
- 发消息落库成功。
- 所有者可查询历史。
- 非所有者不带 `peer_id` 查询被拒绝（HTTP 400）。
- 按 `peer_id` 查询成功。
- 已读标记成功且状态可见。

### 3.3 本地执行结果
- `node --check server.js`：通过
- `npm run test:p0`（BASE_URL=http://localhost:4100）：通过
- `npm run test:p1`（BASE_URL=http://localhost:4100）：通过

> 说明：`express-rate-limit` 会累计登录频率，连续串行执行多脚本时建议分开进程执行，或在重启测试实例后运行下一组脚本。

## 4) 归档结论
- P1 两项任务已从“盘点待改”变更为“代码落地 + 自动化验证通过 + 文档归档完成”。
- 下一阶段可进入 P2（Mock 回退清理与页面侧一致性治理）。
