# 私聊功能使用指南

## 功能概述

本系统实现了农户和回收商之间基于订单的实时私聊功能，支持：
- ✅ 实时消息推送（WebSocket）
- ✅ 历史消息记录
- ✅ 未读消息提示
- ✅ 订单上下文关联
- ✅ 优雅的聊天界面

## 使用场景

### 1. 农户端
- 在"我的申报记录"中，当申报被回收商接单后
- 点击"💬 联系回收商"按钮
- 可与该回收商就订单详情进行沟通

### 2. 回收商端
- 在"附近农户供应"或"我的订单"中
- 点击"💬 联系农户"按钮
- 可与农户就订单详情进行沟通

## 功能特点

### 实时通信
- 使用 Socket.IO 实现实时双向通信
- 消息即时送达，无需刷新页面
- 自动重连机制，保证连接稳定

### 消息管理
- 所有消息存储在数据库中
- 支持查看历史聊天记录
- 消息按时间顺序排列
- 自动滚动到最新消息

### 未读提示
- 红色圆点标记未读消息
- 显示未读消息数量
- 打开聊天窗口自动标记为已读

### 用户体验
- 美观的聊天气泡界面
- 流畅的动画效果
- 发送者和接收者消息区分显示
- 支持键盘 Enter 快捷发送

## 技术实现

### 前端 (auth.js)
```javascript
// 初始化 Socket
initSocket()

// 打开聊天窗口
openChat(reportId, targetUserId)

// 渲染聊天界面
renderChatWindow(reportId, targetUserId, messages)

// 添加消息到界面
appendChatMessage(msg)

// 检查未读消息
checkUnreadMessages()
```

### 后端 (server.js)
```javascript
// Socket.IO 事件处理
io.on('connection', (socket) => {
  // 加入聊天房间
  socket.on('join_room', (roomName))
  
  // 发送消息
  socket.on('send_message', (data))
  
  // 获取历史记录
  socket.on('get_history', (report_id, callback))
  
  // 标记已读
  socket.on('mark_read', (data))
  
  // 检查未读数量
  socket.on('check_unread', (user_id, callback))
})
```

### 数据库表 (chat_messages)
```sql
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,      -- 关联的申报单ID
    sender_id INTEGER NOT NULL,      -- 发送者用户ID
    receiver_id INTEGER NOT NULL,    -- 接收者用户ID
    content TEXT NOT NULL,           -- 消息内容
    is_read BOOLEAN DEFAULT 0,       -- 是否已读
    created_at DATETIME DEFAULT (datetime('now'))
);
```

## 使用步骤

### 农户使用流程

1. **登录系统**
   - 使用农户账号登录（例如：farmer001 / farmer123）

2. **提交申报**
   - 点击"提交申报"
   - 填写废料信息（重量、地址、联系方式等）
   - 提交申报单

3. **等待接单**
   - 在"我的申报记录"中查看申报状态
   - 状态变为"已接单"后，可以看到"💬 联系回收商"按钮

4. **开始聊天**
   - 点击"💬 联系回收商"
   - 聊天窗口在右下角弹出
   - 输入消息，按Enter或点击"发送"

5. **查看历史**
   - 再次点击聊天按钮可查看之前的对话记录
   - 未读消息会有红点提示

### 回收商使用流程

1. **登录系统**
   - 使用回收商账号登录（例如：recycler001 / recycler123）

2. **查看供应**
   - 点击"附近农户供应"
   - 查看待处理的农户申报

3. **接单**
   - 选择合适的申报单
   - 点击"✅ 接单"确认接单

4. **开始沟通**
   - 接单后自动显示"💬 联系农户"按钮
   - 点击打开聊天窗口
   - 与农户沟通订单细节（如具体时间、地点确认等）

5. **完成订单**
   - 在"我的订单"中管理已接单项
   - 通过聊天协调具体事项
   - 完成后可标记订单状态

## 常见问题

### Q: 聊天窗口打不开？
A: 请检查：
1. 是否已登录
2. 是否有网络连接
3. 浏览器控制台是否有错误
4. 刷新页面重试

### Q: 消息发送失败？
A: 可能原因：
1. Socket 连接断开 - 刷新页面重新连接
2. 网络问题 - 检查网络连接
3. 服务器错误 - 联系管理员

### Q: 看不到历史消息？
A: 确保：
1. 数据库表已正确创建
2. 之前确实有发送过消息
3. report_id 匹配正确

### Q: 未读消息数不准确？
A: 尝试：
1. 刷新页面
2. 重新登录
3. 检查 is_read 字段是否正确更新

## 测试流程

### 完整测试步骤

1. **准备两个浏览器窗口**
   - 窗口A：农户账号（farmer001 / farmer123）
   - 窗口B：回收商账号（recycler001 / recycler123）

2. **农户提交申报**（窗口A）
   - 登录后点击"提交申报"
   - 填写表单并提交
   - 记下申报单号

3. **回收商接单**（窗口B）
   - 在"附近农户供应"中找到该申报
   - 点击"接单"

4. **双向聊天测试**
   - 窗口A：点击"联系回收商"，发送消息
   - 窗口B：应实时收到消息，可以回复
   - 窗口A：实时收到回复
   - 测试多条消息

5. **未读提示测试**
   - 窗口A发送消息
   - 窗口B关闭聊天窗口
   - 窗口B应该看到未读红点
   - 打开聊天窗口，红点消失

## 扩展功能建议

### 未来可以添加

1. **消息类型扩展**
   - 图片消息
   - 语音消息
   - 位置分享

2. **通知增强**
   - 浏览器通知
   - 消息声音提示
   - 邮件/短信通知

3. **聊天功能**
   - 消息撤回
   - 消息转发
   - 表情包支持
   - 文件传输

4. **管理功能**
   - 消息搜索
   - 聊天记录导出
   - 敏感词过滤
   - 举报功能

## 技术栈

- **前端框架**: 原生 JavaScript
- **实时通信**: Socket.IO 4.8.3
- **后端**: Node.js + Express
- **数据库**: SQLite3
- **样式**: 内联 CSS（响应式设计）

## 性能优化

1. **消息分页加载**
   - 默认加载最近50条
   - 向上滚动加载更多

2. **连接管理**
   - 自动重连机制
   - 心跳检测
   - 超时处理

3. **UI优化**
   - 虚拟滚动（大量消息时）
   - 懒加载
   - 防抖节流

## 安全考虑

1. **权限验证**
   - 只能与订单相关方聊天
   - 发送者身份验证
   - SQL注入防护

2. **内容过滤**
   - XSS防护
   - 消息长度限制（500字符）
   - 敏感信息脱敏

3. **数据安全**
   - 消息加密存储（可选）
   - 定期备份
   - 访问日志记录

## 维护指南

### 数据库维护
```sql
-- 清理30天前的消息
DELETE FROM chat_messages WHERE created_at < datetime('now', '-30 days');

-- 查看消息统计
SELECT 
  report_id,
  COUNT(*) as message_count,
  MAX(created_at) as last_message_time
FROM chat_messages
GROUP BY report_id;

-- 查找未读消息
SELECT * FROM chat_messages 
WHERE receiver_id = ? AND is_read = 0;
```

### 日志监控
```bash
# 查看Socket连接数
tail -f /tmp/server.log | grep "connected"

# 监控消息发送
tail -f /tmp/server.log | grep "send_message"
```

## 联系支持

如有问题，请联系技术支持团队。

---

**版本**: 1.0.0  
**更新日期**: 2026-01-30  
**作者**: 农废宝技术团队
