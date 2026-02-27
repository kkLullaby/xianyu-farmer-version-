<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="logo-area">
        <text class="logo-text">循果环生</text>
        <text class="logo-sub">柑橘果肉废物回收平台</text>
      </view>
      <view class="nav-links">
        <navigator url="/pages/login/index" class="btn btn-login">登录</navigator>
        <navigator url="/pages/login/index?type=register" class="btn btn-signup">注册</navigator>
      </view>
    </view>

    <!-- 滚动公告 -->
    <view class="announcement-bar">
      <view class="announcement-tag">📢 公告</view>
      <swiper class="announcement-swiper" vertical autoplay circular interval="3000">
        <swiper-item v-for="(item, index) in announcements" :key="index">
          <text class="announcement-text">{{ item.title }}</text>
        </swiper-item>
      </swiper>
    </view>

    <!-- 核心功能入口区 -->
    <view class="role-entrance">
      <view class="section-header">
        <text class="section-title">🚀 快速进入</text>
        <text class="section-desc">选择您的身份角色，进入专属工作台</text>
      </view>
      
      <view class="role-grid">
        <view class="role-card farmer-card" @click="navigateTo('/pages/farmer/dashboard/index', 'farmer')">
          <view class="role-icon">🌾</view>
          <text class="role-name">我是农户</text>
          <text class="role-desc">柑肉申报 · 预约回收</text>
        </view>
        
        <view class="role-card merchant-card" @click="navigateTo('/pages/merchant/dashboard/index', 'merchant')">
          <view class="role-icon">♻️</view>
          <text class="role-name">我是回收商</text>
          <text class="role-desc">发布收购 · 订单管理</text>
        </view>

        <view class="role-card processor-card" @click="navigateToProcessor('processor')">
          <view class="role-icon">🏭</view>
          <text class="role-name">我是处理商</text>
          <text class="role-desc">原料采购 · 生产监控</text>
        </view>

        <view class="role-card admin-card" @click="navigateTo('/pages/admin/dashboard/index', 'admin')">
          <view class="role-icon">👨‍💼</view>
          <text class="role-name">我是管理员</text>
          <text class="role-desc">平台监管 · 数据审核</text>
        </view>
      </view>
    </view>

    <!-- 商业广告位 (联动 CMS 配置) -->
    <view class="ad-banner-section" v-if="adConfig.show" @click="navigateTo(adConfig.link)">
      <image class="ad-image" :src="adConfig.imageUrl" mode="aspectFill"></image>
      <view class="ad-overlay" v-if="adConfig.text">
        <text class="ad-text">{{ adConfig.text }}</text>
        <text class="ad-badge">广告</text>
      </view>
    </view>

    <!-- 政策公告区 -->
    <view class="content-section">
      <view class="section-header-blue">
        <text class="section-title-white">📋 政策公告</text>
        <text class="badge">最新发布</text>
      </view>
      <view class="card-container">
        <view v-if="announcements.length > 0" class="info-card" @click="goArticle(currentAnnouncement)">
          <image v-if="currentAnnouncement.image_url" :src="currentAnnouncement.image_url" class="card-image" mode="aspectFill"></image>
          <view class="card-content">
            <view class="card-tags">
              <text class="tag-primary">{{ currentAnnouncement.type }}</text>
              <text class="tag-text">{{ currentAnnouncement.doc_number }}</text>
            </view>
            <text class="card-title">{{ currentAnnouncement.title }}</text>
            <text class="card-summary">{{ currentAnnouncement.summary }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无公告</text>
        </view>
      </view>
    </view>

    <!-- 成功案例区 -->
    <view class="content-section">
      <view class="section-header-orange">
        <text class="section-title-white">🏆 成功案例</text>
        <text class="badge-transparent">真实展示</text>
      </view>
      <view class="card-container">
        <view v-for="(item, index) in cases" :key="index" class="case-card" @click="goArticle(item)">
          <view class="case-header">
            <image v-if="item.logo_url" :src="item.logo_url" class="case-logo" mode="aspectFill"></image>
            <view v-else class="case-logo-placeholder">🏆</view>
            <text class="case-title">{{ item.title }}</text>
          </view>
          <view class="case-data" v-if="item.trade_data">
            <text class="data-text">📊 {{ item.trade_data }}</text>
          </view>
          <text class="case-desc">{{ item.description }}</text>
        </view>
        <view v-if="cases.length === 0" class="empty-state">
          <text class="empty-icon">🏆</text>
          <text class="empty-text">暂无案例</text>
        </view>
      </view>
    </view>

    <!-- 底部信息 -->
    <view class="footer">
      <view class="footer-item">
        <text class="footer-icon">📞</text>
        <view>
          <text class="footer-label">联系我们</text>
          <text class="footer-value">{{ footerContact.phone }}</text>
        </view>
      </view>
      <view class="footer-links">
        <navigator url="/pages/common/privacy" class="link">隐私政策</navigator>
        <text class="divider">|</text>
        <navigator url="/pages/common/service" class="link">服务协议</navigator>
      </view>
      <text class="copyright">© 2025 循果环生 · 新会陈皮产业数字化管理系统</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

// ===== 默认 Mock 数据 =====
const DEFAULT_ANNOUNCEMENTS = [
  {
    type: '政策',
    title: '关于2025年柑肉回收补贴政策说明',
    summary: '为鼓励环保处理，本年度对合规回收商提供每吨50元的专项补贴...',
    doc_number: 'XH-2025-001',
    image_url: ''
  },
  {
    type: '平台',
    title: '循果环生平台正式上线公告',
    summary: '数字化赋能新会陈皮产业，打造绿色循环经济...',
    doc_number: 'XH-2025-002',
    image_url: ''
  }
];

const DEFAULT_CASES = [
  {
    title: '双水镇柑肉无害化处理示范点',
    trade_data: '年处理量 5000 吨',
    description: '通过生物发酵技术将废弃柑肉转化为有机肥料，实现零排放。',
    logo_url: ''
  },
  {
    title: '三江镇绿色循环农业基地',
    trade_data: '年处理量 3000 吨',
    description: '采用烘干制粉工艺，开发柑肉饲料添加剂，提升附加值。',
    logo_url: ''
  }
];

// ===== 响应式状态 =====
const adConfig = ref({
  show: true,
  imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
  text: '诚招环保设备合作商 / 优质果渣出售',
  link: '/pages/common/ad-detail'
});

const announcements = ref([...DEFAULT_ANNOUNCEMENTS]);
const cases = ref([...DEFAULT_CASES]);
const currentAnnouncement = ref(DEFAULT_ANNOUNCEMENTS[0]);
const footerContact = ref({
  phone: '400-888-6688',
  email: 'contact@xunguohs.com',
  address: '广东省江门市新会区陈皮产业园'
});

// ===== onShow：每次进入页面均从缓存拉取最新数据 =====
onShow(() => {
  try {
    // 读取 CMS 基础配置（包含广告位 + 联系方式）
    const cmsSettings = uni.getStorageSync('cms_settings');
    if (cmsSettings) {
      if (cmsSettings.adConfig) {
        Object.assign(adConfig.value, cmsSettings.adConfig);
      }
      if (cmsSettings.basicConfig) {
        const bc = cmsSettings.basicConfig;
        if (bc.phone) footerContact.value.phone = bc.phone;
        if (bc.email) footerContact.value.email = bc.email;
        if (bc.address) footerContact.value.address = bc.address;
        // 将 basicConfig 中的公告文本解析为 announcements 数组
        if (bc.topAnnouncements) {
          const lines = bc.topAnnouncements.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            const parsed = lines.map((line, i) => ({
              type: '公告',
              title: line.trim(),
              summary: '',
              doc_number: `XH-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
              image_url: ''
            }));
            announcements.value = parsed;
            currentAnnouncement.value = parsed[0];
          }
        }
      }
    }

    // 读取 CMS 文章列表（cms/edit.vue 保存至 cms_articles）
    const cmsArticles = uni.getStorageSync('cms_articles');
    if (cmsArticles && cmsArticles.length > 0) {
      // 将 cms_articles 映射为首页 announcements 格式（优先覆盖）
      const mapped = cmsArticles.map((a, i) => ({
        type: '文章',
        title: a.title,
        summary: a.content ? a.content.replace(/<[^>]+>/g, '').slice(0, 60) + '...' : '',
        doc_number: `ART-${String(i + 1).padStart(3, '0')}`,
        image_url: a.coverUrl || '',
        _raw: a
      }));
      announcements.value = [...mapped, ...announcements.value];
      currentAnnouncement.value = announcements.value[0];
    }
  } catch (e) {
    console.warn('[Index] 读取 CMS 缓存失败', e);
  }
});

// ===== 跳转文章详情 =====
const goArticle = (item) => {
  if (!item || !item.title) return;
  // 将文章数据存入临时缓存，详情页读取展示
  try {
    uni.setStorageSync('article_current', item._raw || item);
  } catch (e) {}
  uni.navigateTo({ url: '/pages/index/article' });
};

// ===== 通用导航 =====
const navigateTo = (url, role) => {
  if (role) {
    uni.setStorageSync('current_role', role);
  }
  uni.navigateTo({
    url,
    fail: (err) => {
      console.error('Navigation failed:', err);
      uni.showToast({ title: '跳转失败，请重试', icon: 'none' });
    }
  });
};

const navigateToProcessor = (role) => {
  if (role) {
    uni.setStorageSync('current_role', role);
  }
  uni.navigateTo({
    url: '/pages/processor/dashboard/index',
    fail: (err) => {
      console.error('跳转处理商工作台失败:', err);
      uni.showToast({ title: '跳转失败，请重试', icon: 'none' });
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FAFAF5;
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}

.logo-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #2E7D32;
  display: block;
}

.logo-sub {
  font-size: 20rpx;
  color: #45664E;
}

.nav-links {
  display: flex;
  gap: 20rpx;
}

.btn {
  font-size: 24rpx;
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  font-weight: 600;
}

.btn-login {
  color: #2E7D32;
  border: 2rpx solid #2E7D32;
  background: transparent;
}

.btn-signup {
  color: white;
  background: linear-gradient(135deg, #EF6C00, #FFB300);
  border: none;
}

/* 滚动公告 */
.announcement-bar {
  margin: 30rpx 40rpx;
  background: linear-gradient(90deg, #FFF8E1, #E8F5E9);
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.announcement-tag {
  background: linear-gradient(135deg, #EF6C00, #FF7043);
  color: white;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  font-weight: bold;
}

.announcement-swiper {
  flex: 1;
  height: 40rpx;
}

.announcement-text {
  font-size: 24rpx;
  color: #1B3A24;
  line-height: 40rpx;
}

/* 角色入口 */
.role-entrance {
  padding: 0 40rpx;
  margin-bottom: 40rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
}

.section-desc {
  font-size: 24rpx;
  color: #666;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.role-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
  transition: transform 0.2s;
}

.role-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
  display: block;
}

.role-name {
  font-size: 28rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 6rpx;
}

.role-desc {
  font-size: 20rpx;
  color: #888;
}

.farmer-card .role-name { color: #2E7D32; }
.merchant-card .role-name { color: #EF6C00; }
.processor-card .role-name { color: #FFB300; }
.admin-card .role-name { color: #1565C0; }

/* 内容区块通用 */
.content-section {
  margin: 0 40rpx 40rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}

.section-header-blue {
  background: linear-gradient(135deg, #1565C0, #0D47A1);
  padding: 24rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header-orange {
  background: linear-gradient(135deg, #F57C00, #E65100);
  padding: 24rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title-white {
  color: white;
  font-size: 30rpx;
  font-weight: bold;
}

.badge {
  background: rgba(255,255,255,0.25);
  color: white;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
}

.badge-transparent {
  color: rgba(255,255,255,0.9);
  font-size: 20rpx;
}

.card-container {
  background: white;
  padding: 30rpx;
  min-height: 200rpx;
}

.info-card {
  display: flex;
  flex-direction: column;
}

.card-image {
  width: 100%;
  height: 240rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  background-color: #eee;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.tag-primary {
  background: #2E7D32;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.tag-text {
  font-size: 20rpx;
  color: #999;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
  margin-bottom: 10rpx;
  display: block;
}

.card-summary {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 广告位样式 */
.ad-banner-section {
  margin: 0 30rpx 40rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  height: 200rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
}

.ad-image {
  width: 100%;
  height: 100%;
  background-color: #eee;
}

.ad-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.ad-text {
  color: white;
  font-size: 26rpx;
  font-weight: bold;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5);
}

.ad-badge {
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  backdrop-filter: blur(4px);
}

/* 案例卡片 */
.case-card {
  background: #f9f9f9;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.case-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.case-logo {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: #eee;
}

.case-logo-placeholder {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFE082, #FFAB91);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.case-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1B3A24;
}

.case-data {
  background: linear-gradient(90deg, #FFF3E0, #E8F5E9);
  padding: 10rpx 20rpx;
  border-radius: 10rpx;
  margin-bottom: 16rpx;
  display: inline-block;
}

.data-text {
  font-size: 22rpx;
  color: #F57C00;
  font-weight: bold;
}

.case-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.empty-icon {
  font-size: 60rpx;
  margin-bottom: 10rpx;
  display: block;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
}

/* 底部 */
.footer {
  background: linear-gradient(135deg, #1B3A24, #2E7D32);
  color: white;
  padding: 60rpx 40rpx;
  border-radius: 30rpx 30rpx 0 0;
  margin-top: 40rpx;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.footer-icon {
  font-size: 40rpx;
}

.footer-label {
  font-size: 24rpx;
  color: #A5D6A7;
  display: block;
}

.footer-value {
  font-size: 32rpx;
  font-weight: bold;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  font-size: 22rpx;
  color: #81C784;
  margin-bottom: 20rpx;
}

.link {
  color: #81C784;
}

.divider {
  color: rgba(255,255,255,0.2);
}

.copyright {
  display: block;
  text-align: center;
  font-size: 20rpx;
  color: #A5D6A7;
  opacity: 0.8;
}
</style>
