<template>
  <view class="container">
    <view class="header">
      <text class="title">🧭 处理商工作台</text>
      <text class="subtitle">欢迎回来，{{ userInfo.name }}</text>
      <text class="desc">一站式管理您的全部业务功能</text>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📦 订单与业务</text>
      </view>
      <view class="card-grid">
        <view class="card border-gold" @click="navigateTo('/pages/processor/orders/index')">
          <text class="card-title text-gold">📦 订单管理</text>
          <text class="card-desc">采购订单与收货管理，跟踪订单状态</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🤝 市场与供需</text>
      </view>
      <view class="card-grid">
        <view class="card border-orange" @click="navigateTo('/pages/processor/demand/publish')">
          <text class="card-title text-orange">📢 发布求购</text>
          <text class="card-desc">发布原料采购需求，吸引供应商</text>
        </view>
        <view class="card border-green" @click="navigateTo('/pages/processor/supply/index')">
          <text class="card-title text-green">🌾 货源供应大厅</text>
          <text class="card-desc">对接农户/回收商货源，查看供应信息</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">⚖️ 售后与账户</text>
      </view>
      <view class="card-grid">
        <view class="card border-red" @click="navigateTo('/pages/processor/arbitration/index')">
          <text class="card-title text-red">⚖️ 仲裁中心</text>
          <text class="card-desc">提交仲裁申请，查看仲裁进度和结果</text>
        </view>
        <view class="card border-dark" @click="navigateTo('/pages/profile/index')">
          <text class="card-title text-dark">👤 我的账户</text>
          <text class="card-desc">账户信息与安全设置</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const userInfo = ref({
  name: '测试处理商',
  role: 'processor'
});

const navigateTo = (url) => {
  uni.navigateTo({
    url: url,
    fail: () => uni.showToast({ title: '页面跳转失败', icon: 'none' })
  });
};

const showToast = (msg) => {
  uni.showToast({ title: msg, icon: 'none' });
};
</script>

<style scoped>
/* --- 全局统一工作台样式 --- */
.container {
  padding: 40rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header {
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 32rpx;
  color: #1565C0;
  display: block;
  margin-bottom: 10rpx;
}

.desc {
  font-size: 26rpx;
  color: #45664E;
}

.section {
  margin-bottom: 50rpx;
}

.section-header {
  margin-bottom: 30rpx;
  border-bottom: 2rpx solid rgba(0,0,0,0.05);
  padding-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #1B3A24;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  background: white;
  border-radius: 24rpx;
  padding: 30rpx 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.04);
  border-left: 10rpx solid #eee;
  transition: transform 0.2s;
}

.card:active {
  transform: scale(0.98);
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.card-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

/* 状态色系 */
.border-gold { border-left-color: #FFB300; }
.text-gold { color: #FFB300; }

.border-orange { border-left-color: #EF6C00; }
.text-orange { color: #EF6C00; }

.border-green { border-left-color: #2E7D32; }
.text-green { color: #2E7D32; }

.border-red { border-left-color: #e74c3c; }
.text-red { color: #e74c3c; }

.border-dark { border-left-color: #455A64; }
.text-dark { color: #455A64; }
</style>
