# 数据库与后端快速说明

本目录提供一个最小可运行的 SQLite 后端用于演示和本地开发，包含用户、角色、地点与回收订单表结构。

- 数据库文件：`/data/agri.db`（由 `server.js` 初始化）
- 模式文件：`/db/schema.sql`
- 后端启动脚本：`server.js`
- 依赖：Node.js，npm

## 快速开始

1. 安装依赖：

```bash
cd /path/to/Project\ Ex-class
npm install
```

2. 初始化数据库（两种方式）：

- 方式 A（直接命令）：

```bash
npm run init
```

- 方式 B（运行服务并通过接口初始化）：

```bash
node server.js
# 在另一个终端初始化：
curl -X POST http://localhost:4000/init
```

初始化会创建表并插入示例角色（admin/farmer/recycler）、示例地点与 3 个测试用户：
- admin001 / admin123
- farmer001 / farmer123
- recycler001 / recycler123

3. 启动服务：

```bash
npm start
# 默认在 http://localhost:4000
```

## 可用 API（示例）

- 健康检查：
  - GET /health

- 初始化 DB：
  - POST /init

- 注册：
  - POST /api/register
  - Body: { username, password, role ("farmer" | "recycler" | "admin"), full_name }

- 手机号验证码注册：
  - POST /api/auth/request-otp
  - Body: { phone }
  - 说明: 阿里云短信通道，60s 冷却，验证码 5 分钟有效

  - POST /api/auth/register-phone
  - Body: { phone, otp, password, role, full_name, agreementAccepted }
  - 说明: 密码需 8-16 位且同时包含数字和字母；需勾选《隐私政策》《服务协议》；成功后返回用户基本信息（不返回密码/哈希）

- 登录：
  - POST /api/login
  - Body: { username, password }  // username 可为手机号或用户名
  - Response: { id, username, phone, full_name, role }

## 短信配置（阿里云）

设置环境变量（示例）：
```
ALIYUN_ACCESS_KEY_ID=xxx
ALIYUN_ACCESS_KEY_SECRET=xxx
ALIYUN_SMS_SIGN=农废宝
ALIYUN_SMS_TEMPLATE=SMS_XXXXXX   # 模板需包含 ${code}
```

注意：验证码 5 分钟过期，60s 发送冷却，最大 5 次校验失败后需重新获取。

- 创建订单：
  - POST /api/orders
  - Body: { farmer_id, recycler_id (optional), location_id (optional), weight_kg, price_per_kg (optional), notes }

- 查询订单：
  - GET /api/orders?farmer_id=..&recycler_id=..&status=..

- 附近订单（通过地点经纬度的简单边界查询）：
  - GET /api/orders/nearby?lat=23.12&lng=113.12&radius_km=5

- 查询地点列表：
  - GET /api/locations

## 前端集成示例（伪代码）

登录并把返回 user 存到 `sessionStorage`：

fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username,password}) })
  .then(r=>r.json())
  .then(user => sessionStorage.setItem('currentUser', JSON.stringify(user)));

创建订单：

const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ farmer_id: currentUser.id, location_id: 1, weight_kg: 120.5 }) })

查询附近订单示例：

fetch('/api/orders/nearby?lat=23.12&lng=113.12&radius_km=5')
  .then(r=>r.json()).then(list=>console.log(list));

## 安全与生产建议

- 当前为演示环境，密码使用 `bcryptjs` 哈希存储，但不要在生产中使用 SQLite 单机数据库作为唯一数据源。
- 所有注册流程均使用随机盐 + bcrypt 哈希；后端不会记录明文密码或验证码。
- 上线前请使用 HTTPS，并将敏感配置（如 DB 位置）放在环境变量。
- 推荐使用 PostgreSQL 或 MySQL 并在后端实现更加完善的认证机制（JWT、刷新机制等）。
- 对外接口务必有身份认证与权限校验（当前示例未实现 token 验证）。


## 文件说明

- `db/schema.sql` - 数据库表结构
- `server.js` - 启动与 API 实现（含 DB 初始化与种子）
- `package.json` - 依赖与脚本
- `data/` - 运行时生成的数据库文件

