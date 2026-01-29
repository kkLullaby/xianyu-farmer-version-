# 🌾 农户"附近处理点"功能使用指南

## 📋 功能概述

农户可以通过"附近处理点"页面：
- 📍 查看最近的3-5个废品处理点
- 📞 直接拨打处理点联系电话
- 🗺️ 查看到达处理点的驾车路线
- 📊 查看距离、营业时间等详细信息

---

## 🚀 快速开始

### 1. 启动服务

#### 启动后端API服务
```bash
cd "/home/kk/code/Project Ex-class"
node server.js
```

服务将在 `http://localhost:4000` 启动

#### 启动前端Web服务
```bash
cd "/home/kk/code/Project Ex-class"
python3 -m http.server 8080 --bind 127.0.0.1
```

前端将在 `http://127.0.0.1:8080` 启动

### 2. 配置地图API（重要）

在使用地图路线功能前，需要配置高德地图API Key：

1. 参考 [`MAP_API_GUIDE.md`](MAP_API_GUIDE.md) 注册并获取API Key
2. 打开 `farmer-nearby-recyclers.html`
3. 找到第241行，将 `YOUR_AMAP_KEY` 替换为你的实际Key：
   ```html
   <script src="https://webapi.amap.com/maps?v=2.0&key=你的Key&plugin=AMap.Driving"></script>
   ```

### 3. 访问页面

在浏览器打开：
```
http://127.0.0.1:8080/farmer-nearby-recyclers.html
```

---

## 🎯 功能演示

### 页面加载流程

1. **获取位置** - 页面自动获取用户当前位置
   - 如果浏览器支持定位，使用真实位置
   - 如果定位失败，使用默认位置（北京）

2. **查询处理点** - 向后端API请求附近的回收商
   - API会计算每个回收商与用户的距离
   - 按距离从近到远排序
   - 返回最近的5个处理点

3. **显示结果** - 以卡片形式展示处理点信息
   - 名称、距离、电话、地址、营业时间

### 交互功能

#### 📞 拨打电话
- 点击"拨打电话"按钮
- 移动设备会直接调起拨号界面
- PC端会提示使用支持的应用

#### 🗺️ 查看路线
- 点击"查看路线"按钮
- 页面下方显示地图
- 自动规划从当前位置到处理点的驾车路线
- 显示预计时间和距离

#### 🔙 返回主页
- 点击右上角"返回主页"按钮
- 返回到系统首页

---

## 🗄️ 数据库结构

### 回收商信息存储

回收商的位置和联系信息存储在 `users` 表的 `meta` 字段（JSON格式）：

```json
{
  "latitude": 39.9042,
  "longitude": 116.4074,
  "address": "北京市朝阳区回收中心",
  "business_hours": "8:00-18:00"
}
```

### 测试数据

系统已包含5个测试回收商：

| ID | 名称 | 电话 | 位置 | 营业时间 |
|----|------|------|------|----------|
| 3 | 王回收商 | 13800138001 | 北京市朝阳区 | 8:00-18:00 |
| 12 | 张回收商 | 13800138002 | 上海市浦东新区 | 7:00-19:00 |
| 13 | 李回收站 | 13800138003 | 广州市天河区 | 6:00-20:00 |
| 14 | 赵处理厂 | 13800138004 | 成都市武侯区 | 9:00-17:00 |
| 15 | 刘环保中心 | 13800138005 | 深圳市福田区 | 8:30-18:30 |

---

## 🔌 API接口

### GET /api/recyclers/nearby

获取附近的回收商（处理点）

**请求参数**:
- `lat` (必需): 用户纬度
- `lng` (必需): 用户经度
- `limit` (可选): 返回数量，默认5

**请求示例**:
```bash
GET http://localhost:4000/api/recyclers/nearby?lat=39.9042&lng=116.4074&limit=5
```

**返回示例**:
```json
[
  {
    "id": 3,
    "name": "王回收商",
    "phone": "13800138001",
    "address": "北京市朝阳区回收中心",
    "businessHours": "8:00-18:00",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "distance": 0
  },
  ...
]
```

**距离计算**: 使用Haversine公式计算地球表面两点间的实际距离（单位：km）

---

## 🎨 界面设计

### 设计特点

- **渐变背景**: 紫色渐变（#667eea → #764ba2）营造现代感
- **卡片布局**: 响应式网格，自动适配不同屏幕
- **悬停效果**: 卡片抬升动画，增强交互感
- **距离徽章**: 醒目显示距离信息
- **图标化信息**: 使用SVG图标美化界面

### 响应式设计

- **桌面端**: 3列网格布局
- **平板**: 2列网格布局
- **手机**: 单列布局

---

## 🧪 测试指南

### 测试场景1: 基本功能测试

1. 打开页面，确认能看到"正在获取您的位置..."
2. 等待2-3秒，应显示"找到X个附近的处理点"
3. 查看是否显示处理点卡片（应有3-5个）
4. 确认每个卡片包含：名称、距离、电话、地址、营业时间

### 测试场景2: 电话拨打测试

1. 点击任意卡片的"拨打电话"按钮
2. 移动设备：应调起拨号界面
3. PC端：浏览器会提示选择应用或下载Skype等

### 测试场景3: 地图路线测试（需配置API Key）

1. 点击"查看路线"按钮
2. 页面滚动到地图区域
3. 地图应显示：
   - 起点标记（绿色）
   - 终点标记（红色）
   - 蓝色驾车路线
   - 路线详情面板

4. 点击"关闭地图"按钮，地图应隐藏

### 测试场景4: 错误处理测试

**模拟定位失败**:
- 浏览器设置中禁用位置权限
- 页面应使用默认位置（北京：39.9042, 116.4074）

**模拟API失败**:
- 关闭后端服务
- 页面应显示错误提示和"重新加载"按钮

---

## 🐛 常见问题

### Q1: 页面一直显示"正在获取位置"

**可能原因**:
1. 浏览器未授予位置权限
2. 后端服务未启动

**解决方案**:
1. 检查浏览器地址栏是否有位置权限提示，点击允许
2. 确认后端服务在4000端口运行：`ps aux | grep "node server.js"`

### Q2: 显示"找到0个附近的处理点"

**可能原因**:
1. 数据库中没有回收商数据
2. 回收商的meta字段为空

**解决方案**:
```bash
cd "/home/kk/code/Project Ex-class"
sqlite3 data/agri.db "SELECT id, full_name, phone, meta FROM users WHERE role_id=3;"
```

检查是否有数据，如果没有，运行：
```bash
sqlite3 data/agri.db < add_recyclers.sql
```

### Q3: 点击"查看路线"没反应

**可能原因**:
1. 未配置地图API Key
2. API Key配置错误
3. 域名白名单未包含localhost

**解决方案**:
1. 打开浏览器控制台（F12）查看错误信息
2. 如果显示"INVALID_USER_KEY"，检查API Key配置
3. 参考 [`MAP_API_GUIDE.md`](MAP_API_GUIDE.md) 重新配置

### Q4: 地图加载很慢

**可能原因**: 网络问题或地图资源加载慢

**解决方案**:
1. 检查网络连接
2. 使用国内网络（高德地图在国内访问较快）
3. 考虑使用CDN加速

---

## 🔧 自定义配置

### 修改返回数量

在 `farmer-nearby-recyclers.html` 中修改：

```javascript
const response = await fetch(
    `${API_BASE}/api/recyclers/nearby?lat=${lat}&lng=${lng}&limit=10` // 改为10个
);
```

### 修改默认位置

如果用户定位失败，使用的默认位置可以修改：

```javascript
resolve({ lat: 30.5728, lng: 104.0668 }); // 改为成都
```

### 添加更多筛选条件

在后端 `server.js` 中可以添加营业时间筛选：

```javascript
app.get('/api/recyclers/nearby', (req, res) => {
    const isOpen = req.query.open; // 是否只显示营业中的
    // ... 添加筛选逻辑
});
```

---

## 📱 移动端优化建议

### 1. 添加位置刷新功能

```javascript
function refreshLocation() {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            init(); // 重新加载
        }
    );
}
```

### 2. 添加分享功能

```javascript
if (navigator.share) {
    navigator.share({
        title: '附近的处理点',
        text: `${recycler.name} - ${recycler.phone}`,
        url: window.location.href
    });
}
```

### 3. 添加收藏功能

使用 localStorage 保存常用处理点：

```javascript
function addToFavorites(recyclerId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!favorites.includes(recyclerId)) {
        favorites.push(recyclerId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
}
```

---

## 🎓 扩展功能建议

1. **实时距离更新**: 定期刷新用户位置，更新距离
2. **路线偏好设置**: 提供步行、骑行、公交等多种方式
3. **处理点评价**: 允许用户对处理点评分和评论
4. **预约功能**: 支持在线预约回收时间
5. **优惠信息**: 显示各处理点的价格优惠
6. **历史记录**: 记录用户访问过的处理点

---

## ✅ 功能检查清单

- [ ] 后端服务正常运行（4000端口）
- [ ] 前端服务正常运行（8080端口）
- [ ] 数据库包含回收商测试数据
- [ ] 页面能正常获取用户位置
- [ ] API返回附近的回收商列表
- [ ] 卡片正确显示处理点信息
- [ ] 拨打电话功能正常
- [ ] 地图API Key已配置（可选）
- [ ] 地图和路线规划正常（可选）
- [ ] 移动端响应式布局正常

---

## 📚 相关文档

- [地图API接入指南](MAP_API_GUIDE.md)
- [数据库文档](README_DB.md)
- [集成测试报告](INTEGRATION_TEST_REPORT.md)
- [项目架构](ARCHITECTURE.md)

---

**功能已完整实现，祝使用愉快！** 🎉
