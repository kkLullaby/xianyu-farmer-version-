# 🚀 农业废品回收平台 - 快速测试指南

## ✅ 前后端已打通！

恭喜！前后端已完全集成，所有测试通过率 100%。

## 📡 服务状态

### 后端 API 服务
- **状态**: ✅ 运行中 (PID: 379311)
- **地址**: http://localhost:4000
- **框架**: Node.js + Express + SQLite

### 前端 Web 服务
- **状态**: ✅ 运行中 (PID: 385591)
- **地址**: http://127.0.0.1:8080
- **服务器**: Python HTTP Server

## 🎯 三种测试方式

### 方式 1: 自动化集成测试页面 (推荐)
**最快速的验证方法**

1. 在浏览器打开：http://127.0.0.1:8080/test-integration.html
2. 页面会自动检查后端健康状态
3. 点击各个测试按钮验证功能：
   - 🔐 测试三种角色登录
   - 📝 测试用户注册
   - 📦 测试数据查询
   - 🎯 一键运行完整测试

**优点**: 可视化结果，实时反馈，无需手动输入

---

### 方式 2: 测试实际用户界面
**模拟真实用户体验**

1. 在浏览器打开：http://127.0.0.1:8080/index.html
2. 点击页面上的"登录"按钮
3. 使用测试账号登录：

#### 🔑 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 👨‍💼 管理员 | admin001 | admin123 | 系统管理员 |
| 🌾 农户 | farmer001 | farmer123 | 李农户 |
| ♻️ 回收商 | recycler001 | recycler123 | 王回收商 |

4. 登录成功后会跳转到对应角色的仪表板

**优点**: 完整的用户体验，测试前端 UI 和路由

---

### 方式 3: 命令行 API 测试
**开发者验证方法**

使用 curl 或 wget 直接测试后端 API：

#### 测试登录
```bash
# 管理员登录
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin001","password":"admin123"}'

# 农户登录
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"farmer001","password":"farmer123"}'
```

#### 测试注册
```bash
curl -X POST http://localhost:4000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser123",
    "password":"test123",
    "role":"farmer",
    "full_name":"新用户"
  }'
```

#### 查询数据
```bash
# 查询订单
curl http://localhost:4000/api/orders

# 查询地点
curl http://localhost:4000/api/locations

# 健康检查
curl http://localhost:4000/health
```

**优点**: 快速验证 API，适合调试

---

## 🔧 如果服务没运行

### 启动后端
```bash
cd "/home/kk/code/Project Ex-class"
node server.js
```

### 启动前端
```bash
cd "/home/kk/code/Project Ex-class"
python3 -m http.server 8080 --bind 127.0.0.1
```

---

## 📝 注册新用户测试

1. 打开：http://127.0.0.1:8080/index.html
2. 点击"登录"按钮
3. 在登录框中点击"立即注册"
4. 填写注册信息：
   - 用户名: yourname (任意唯一用户名)
   - 密码: yourpassword
   - 确认密码: yourpassword
   - 姓名: 你的姓名
   - 角色: 选择 农户/回收商
5. 点击"注册"按钮
6. 注册成功后使用新账号登录

---

## ✅ 验证要点

### 登录功能
- ✅ 三种角色能正确登录
- ✅ 错误密码会被拒绝
- ✅ 登录后跳转到对应仪表板
- ✅ 用户信息正确显示

### 注册功能
- ✅ 能成功创建新账号
- ✅ 密码加密存储
- ✅ 新账号立即可以登录
- ✅ 角色正确分配

### 数据查询
- ✅ 能查询订单列表
- ✅ 能查询地点列表
- ✅ 数据格式正确

---

## 📊 测试结果

根据 [INTEGRATION_TEST_REPORT.md](INTEGRATION_TEST_REPORT.md)，所有测试均已通过：

- ✅ 管理员登录
- ✅ 农户登录
- ✅ 回收商登录
- ✅ 用户注册
- ✅ 新用户登录
- ✅ 错误登录拦截
- ✅ 健康检查
- ✅ 地点查询
- ✅ 订单查询

**通过率: 100% (9/9)**

---

## 🎉 下一步

前后端已完全打通！你现在可以：

1. 📱 测试完整的用户界面
2. 🔧 添加更多功能（订单创建、状态更新等）
3. 🎨 优化前端 UI/UX
4. 🔐 增强安全性（添加 JWT token）
5. 📦 部署到生产环境

---

## 📚 相关文档

- [集成测试报告](INTEGRATION_TEST_REPORT.md) - 详细测试结果
- [数据库文档](README_DB.md) - 数据库结构说明
- [项目架构](ARCHITECTURE.md) - 系统架构设计
- [测试指南](TEST_GUIDE.md) - 完整测试文档

---

## 💡 提示

- 测试账号密码在数据库中已加密存储
- 会话信息保存在浏览器 sessionStorage
- 关闭浏览器标签后需要重新登录
- 所有 API 支持 CORS 跨域请求

**祝测试顺利！** 🎊
