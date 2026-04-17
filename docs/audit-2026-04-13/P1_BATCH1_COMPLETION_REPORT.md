# P1 中危项修复进度报告（第一批）

## 阶段状态：⏸️ 第一批完成，等待测试验证

修复时间：2026-04-17
修复内容：P1 中危中的前 3 个项

## 修复明细

### ✅ SEC-006 - CORS 全放开
- **文件修改**：server.js:165-178
- **修改内容**：
  - 从 `cors()` 全放开改为配置白名单
  - 通过 `process.env.ALLOWED_ORIGINS` 读取允许的域名列表
  - 支持移动端/无 origin 请求（`curlfetch` 等）
  - 配置允许的 HTTP 方法和请求头
- **状态**：✅ 完成
- **验证**：
  ```bash
  # 测试 CORS 检查
  curl -i -X OPTIONS http://localhost:4000/api/login \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST"
  # 应该看到 CORS 相关響應頭
  ```

### ✅ SEC-008 - 缺少系统级接口限流
- **文件修改**：
  - server.js (导入 express-rate-limit、配置限流器、应用到路由)
  - package.json (自动依赖安装)
- **修改内容**：
  - 安装 `express-rate-limit` 包
  - `/api/auth/request-otp` - 限流 3 次/分钟（按phone号）
  - `/api/auth/register-phone` - 限流 3 次/小时（按IP）
  - `/api/register` - 限流 3 次/小时（按IP）
  - `/api/login` - 限流 5 次/15分钟（按IP）
- **状态**：✅ 完成
- **验证**：
  ```bash
  # 测试登录限流：连续 6 次请求应在第 6 次收到 429 响应
  for i in {1..6}; do
    curl -X POST http://localhost:4000/api/login \
      -H "Content-Type: application/json" \
      -d '{"username":"test","password":"test"}' 
    echo "Request $i"
    sleep 1
  done
  ```

### ✅ SEC-007 - OTP 存储在内存改为数据库
- **文件修改**：
  - server.js (修改 OTP 生成、存储、验证逻辑)
  - db/schema.sql (新增 otp_store 表)
- **修改内容**：
  - 新建 otp_store 表，包含 phone, code, expires_at, attempts 等字段
  - `/api/auth/request-otp` - 改为存储到 DB，自动清理过期记录
  - `/api/auth/register-phone` - 改为从 DB 读取和验证 OTP
  - 保留 60 秒防刷机制和 5 次错误限制
- **状态**：✅ 完成
- **新增表跟踪**：
  ```sql
  CREATE TABLE otp_store (
      id, phone, code, expires_at, attempts, max_attempts, last_sent_at, created_at
  );
  CREATE INDEX idx_otp_phone_expires ON otp_store(phone, expires_at);
  ```
- **验证**：
  ```bash
  # 测试 OTP 流程
  curl -X POST http://localhost:4000/api/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"13800138000"}'
  
  # 查看数据库中是否生成了 OTP 记录
  sqlite3 data/agri.db "SELECT * FROM otp_store WHERE phone='13800138000';"
  ```

## 依赖的测试清单

### 关键测试用例
- [ ] 启动服务器验证无异常：`npm start`
- [ ] 测试 CORS 白名单是否生效
- [ ] 测试登录限流：连续 6 次请求，第 6 次应返回 429
- [ ] 测试 OTP 流程：请求验方码→查 DB→验证→注册
- [ ] 服务重启后，已生成的 OTP 应仍然存在（不会丢失）
- [ ] 过期 OTP 自动删除（验证时清理 + 下次请求前清理）

## 已安装依赖
- express-rate-limit ^1.11.0

## 下一步待修复（P1 后 3 项）
1. SEC-011 - 上传验证仅依赖 MIME（需安装 file-type 库做 magic bytes）
2. SEC-010 - API Key 前端暴露（需后端代理高德 API）
3. SEC-009 - 多处 innerHTML 注入面（最复杂，涉及多个文件）

---

## 暂停原因
已完成 P1 中危中风险最集中的 3 个项（CORS、限流、OTP 持久化），等待你进行以下操作：
1. 本地运行测试验证功能正常
2. 测试限流和 OTP 数据库功能
3. git add && git commit
4. 确认无问题后，我继续修复 P1 后 3 项 + 全部 P0 高危项

---

**修復實施者**：GitHub Copilot  
**複核狀態**：待用户确认与测试  
**Git 状态**：待提交
