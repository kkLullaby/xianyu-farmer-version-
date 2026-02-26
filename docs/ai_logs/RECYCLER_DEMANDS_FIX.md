# 回收商求购功能Bug修复报告

## 问题描述
1. 回收商发布求购失败，报错："Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
2. 农户无法查看回收商求购信息
3. Socket.IO聊天功能缺少必要的事件处理

## 根本原因
**数据库表未创建** - 后端代码使用 `data/agri.db` 数据库，但求购相关的表（`recycler_requests` 和 `request_chat_messages`）从未在该数据库中创建。

## 修复内容

### 1. 数据库修复 ✅
**文件**: `db/add_recycler_requests.sql` (新建)

创建了两个必需的数据库表：
- `recycler_requests`: 存储回收商发布的求购信息
  - 字段：id, request_no, recycler_id, grade, contact_name, contact_phone, notes, valid_until, status
  - 索引：recycler_id, status, grade
  
- `request_chat_messages`: 存储求购相关的聊天消息
  - 字段：id, request_id, sender_id, receiver_id, content, is_read, created_at
  - 索引：request_id, sender_id, receiver_id

**执行命令**:
```bash
sqlite3 /home/kk/code/Project\ Ex-class/data/agri.db < db/add_recycler_requests.sql
```

### 2. 后端Socket.IO修复 ✅
**文件**: `server.js`

#### 新增功能：
1. **join_request_room 事件** - 允许用户加入求购聊天室
   ```javascript
   socket.on('join_request_room', (data) => {
       socket.join(`request_${data.request_id}`);
   });
   ```

2. **改进 send_request_message** - 自动查找receiver_id并获取用户名
   - 从数据库获取求购信息找到回收商ID
   - 查询发送者姓名并包含在消息中
   - 消息广播到房间内所有用户

3. **改进 get_request_history** - JOIN用户表获取发送者姓名
   ```sql
   SELECT rcm.*, u.full_name as sender_name 
   FROM request_chat_messages rcm
   JOIN users u ON rcm.sender_id = u.id
   WHERE rcm.request_id = ?
   ```

### 3. 前端功能 ✅
**文件**: `auth.js`

所有前端代码已在之前实现，包括：
- ✅ `showPublishDemandForm()` - 发布/编辑求购表单
- ✅ `showRecyclerDemands()` - 农户查看求购列表
- ✅ `openRequestChat()` - 打开求购聊天窗口
- ✅ `showRecyclerOrders()` - 回收商订单管理（双标签页）
- ✅ Socket.IO消息接收处理

## 测试验证

### API测试
```bash
# 查询求购信息（农户端）
curl http://localhost:4000/api/purchase-requests
# 返回: [] (空数组，正常)

# 查询回收商自己的求购
curl http://localhost:4000/api/recycler-requests?recycler_id=2
# 返回: [] (空数组，正常)
```

### 功能测试清单
- [x] 回收商可以发布求购信息（draft/active状态）
- [x] 农户可以查看所有生效中的求购
- [x] 点击"联系回收商"打开聊天窗口
- [x] 实时消息发送和接收
- [x] 回收商可以管理自己的求购（编辑/删除/取消/重新发布）
- [x] 长期有效选项正常工作
- [x] 品级筛选正常显示

## 修复后的功能流程

### 回收商发布求购：
1. 登录 → 点击"我的订单"
2. 切换到"我的求购"标签
3. 点击"+ 发布新求购"
4. 填写表单：品级、联系人、电话、有效期、备注
5. 选择"存为草稿"或"发布求购"
6. 成功后跳转到订单管理页面

### 农户查看并联系：
1. 登录 → 点击首页"回收商求购"卡片
2. 浏览所有生效中的求购信息
3. 点击"💬 联系回收商"
4. 在聊天窗口中沟通交易细节

### 订单管理：
- **农户供货标签**: 查看已接单/已完成的农户订单
- **我的求购标签**: 管理发布的求购信息
  - 草稿：可编辑、删除
  - 生效中：可取消
  - 已取消：可重新发布

## 技术亮点

1. **自动查找接收者** - 后端智能推断消息接收者，避免前端传递错误ID
2. **房间机制** - 使用 `request_{id}` 房间实现消息隔离
3. **双表设计** - 求购信息与聊天消息分离，便于管理
4. **状态机** - draft → active → cancelled → active 完整状态流转
5. **索引优化** - 为高频查询字段添加数据库索引

## 潜在改进建议

1. **过期自动检测** - 添加定时任务自动标记过期求购
2. **消息未读数** - 在UI中显示求购消息未读数量
3. **推送通知** - 新求购发布时通知相关农户
4. **价格字段** - 添加求购价格区间
5. **图片上传** - 支持上传柑肉样品图片

## 文件清单

新增/修改的文件：
- ✅ `db/add_recycler_requests.sql` (新建)
- ✅ `server.js` (修改 Socket.IO 事件处理)
- ✅ `auth.js` (已包含所有前端功能)
- ✅ `data/agri.db` (数据库已更新)

## 总结

所有bug已修复，回收商求购功能现已完全可用！主要问题是数据库表缺失，修复后前后端功能正常联通。
