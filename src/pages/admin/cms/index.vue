<template>
  <view class="container">
    <view class="header">
      <text class="title">📝 内容编辑中心</text>
      <text class="desc">管理平台公告、成功案例及商业广告位</text>
    </view>

    <!-- 顶部 Tab 栏 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">基础配置</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">文章与案例</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text class="tab-text">商业广告位</text>
        <view class="tab-line" v-if="currentTab === 2"></view>
      </view>
    </view>

    <!-- Tab 0: 基础配置 -->
    <view class="content-area" v-if="currentTab === 0">
      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">顶部滚动公告</text>
        </view>
        <view class="form-item">
          <text class="label">公告内容 (多条用换行分隔)</text>
          <textarea class="textarea" v-model="basicConfig.topAnnouncements" placeholder="请输入滚动公告内容..." />
        </view>
      </view>

      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">底部联系我们</text>
        </view>
        <view class="form-item">
          <text class="label">客服电话</text>
          <input class="input" v-model="basicConfig.phone" placeholder="例如：400-888-6688" />
        </view>
        <view class="form-item">
          <text class="label">联系邮箱</text>
          <input class="input" v-model="basicConfig.email" placeholder="例如：contact@xunguohs.com" />
        </view>
        <view class="form-item">
          <text class="label">公司地址</text>
          <input class="input" v-model="basicConfig.address" placeholder="例如：广东省江门市新会区..." />
        </view>
      </view>

      <button class="btn-save" @click="saveConfig('基础配置')">保存基础配置</button>
    </view>

    <!-- Tab 1: 文章与案例 -->
    <view class="content-area" v-if="currentTab === 1">
      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">政策公告管理</text>
          <button class="btn-mini" size="mini" @click="goEdit('policy')">新增公告</button>
        </view>
        <view class="list-item" v-for="(item, index) in articleConfig.policies" :key="index">
          <view class="item-info">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-sub">{{ item.date }}</text>
          </view>
          <text class="item-action" @click="goEdit('policy', index)">编辑</text>
        </view>
      </view>

      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">成功案例管理</text>
          <button class="btn-mini" size="mini" @click="goEdit('case')">新增案例</button>
        </view>
        <view class="list-item" v-for="(item, index) in articleConfig.cases" :key="index">
          <view class="item-info">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-sub">{{ item.company }}</text>
          </view>
          <text class="item-action" @click="goEdit('case', index)">编辑</text>
        </view>
      </view>
    </view>

    <!-- Tab 2: 商业广告位 -->
    <view class="content-area" v-if="currentTab === 2">
      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">首页中部 Banner 广告</text>
          <switch :checked="adConfig.show" @change="adConfig.show = $event.detail.value" color="#1565C0" />
        </view>
        
        <view class="form-item" v-if="adConfig.show">
          <text class="label">广告图链接 (URL)</text>
          <input class="input" v-model="adConfig.imageUrl" placeholder="请输入图片网络地址 (16:5比例最佳)" />
        </view>
        
        <view class="form-item" v-if="adConfig.show">
          <text class="label">广告文案 (可选)</text>
          <input class="input" v-model="adConfig.text" placeholder="例如：诚招环保设备合作商" />
        </view>

        <view class="form-item" v-if="adConfig.show">
          <text class="label">跳转路由 (点击后跳转的页面)</text>
          <input class="input" v-model="adConfig.link" placeholder="例如：/pages/common/ad-detail" />
        </view>

        <view class="preview-box" v-if="adConfig.show && adConfig.imageUrl">
          <text class="preview-label">效果预览：</text>
          <image class="preview-img" :src="adConfig.imageUrl" mode="aspectFill"></image>
        </view>
      </view>

      <button class="btn-save" @click="saveConfig('商业广告位')">发布广告配置</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const currentTab = ref(0);

// ===== 默认值 =====
const defaultBasicConfig = {
  topAnnouncements: '关于2025年柑肉回收补贴政策说明\n循果环生平台正式上线公告',
  phone: '400-888-6688',
  email: 'contact@xunguohs.com',
  address: '广东省江门市新会区陈皮产业园'
};

const defaultAdConfig = {
  show: true,
  imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
  text: '诚招环保设备合作商 / 优质果渣出售',
  link: '/pages/common/ad-detail'
};

// ===== 响应式数据 =====
const basicConfig = ref({ ...defaultBasicConfig });

const articleConfig = ref({
  policies: [
    { title: '关于2025年柑肉回收补贴政策说明', date: '2025-01-10' },
    { title: '循果环生平台正式上线公告', date: '2025-01-01' }
  ],
  cases: [
    { title: '日处理50吨，某果业实现零排放', company: '绿源果业处理厂' },
    { title: '果皮变废为宝，农户增收新途径', company: '新会陈皮合作社' }
  ]
});

const adConfig = ref({ ...defaultAdConfig });

// ===== onMounted: 从缓存回显 =====
onMounted(() => {
  try {
    const cached = uni.getStorageSync('cms_settings');
    if (cached) {
      if (cached.basicConfig) Object.assign(basicConfig.value, cached.basicConfig);
      if (cached.adConfig) Object.assign(adConfig.value, cached.adConfig);
    }
  } catch (e) {
    console.warn('[CMS] 读取缓存失败', e);
  }
});

// ===== 持久化保存 =====
const saveConfig = (moduleName) => {
  try {
    const data = {
      basicConfig: { ...basicConfig.value },
      adConfig: { ...adConfig.value }
    };
    uni.setStorageSync('cms_settings', data);
    uni.showToast({ title: `${moduleName} 保存成功`, icon: 'success' });
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'error' });
  }
};

// ===== 跳转编辑页 =====
const goEdit = (type, index) => {
  let url = '/pages/admin/cms/edit?type=' + type;
  if (index !== undefined) url += '&index=' + index;
  uni.navigateTo({ url });
};
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header {
  margin-bottom: 30rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 10rpx;
}

.desc {
  font-size: 26rpx;
  color: #45664E;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #1565C0;
  font-weight: bold;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  background: #1565C0;
  border-radius: 4rpx;
}

/* 表单卡片 */
.form-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
  border-left: 8rpx solid #1565C0;
  padding-left: 16rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.input {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  background: #fafafa;
}

.textarea {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  height: 160rpx;
  box-sizing: border-box;
  background: #fafafa;
}

/* 列表项 */
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed #eee;
}

.list-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 6rpx;
}

.item-sub {
  font-size: 24rpx;
  color: #999;
}

.item-action {
  font-size: 26rpx;
  color: #1565C0;
}

.btn-mini {
  margin: 0;
  background: #e3f2fd;
  color: #1565C0;
  border: none;
}

/* 预览区 */
.preview-box {
  margin-top: 20rpx;
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
}

.preview-label {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 12rpx;
}

.preview-img {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background: #eee;
}

/* 保存按钮 */
.btn-save {
  background: #1565C0;
  color: white;
  border: none;
  border-radius: 16rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: bold;
  width: 100%;
  margin-top: 40rpx;
}
</style>
