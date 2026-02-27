<template>
  <view class="container">
    <view class="header">
      <text class="title">🧭 回收商工作台</text>
      <text class="subtitle">欢迎回来，{{ userInfo.name }}</text>
      <text class="desc">一站式管理您的全部业务功能</text>
    </view>

    <!-- 交易管理 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">📦 交易管理</text>
      </view>
      <view class="card-grid">
        <view class="card border-gold" @click="navigateTo('/pages/merchant/orders/index')">
          <text class="card-title text-gold">📦 订单管理</text>
          <text class="card-desc">管理订单与交易流程，跟踪订单状态</text>
        </view>
        <view class="card border-dark" @click="navigateTo('/pages/merchant/finance/index')">
          <text class="card-title text-dark">💰 财务中心</text>
          <text class="card-desc">查看账单与结算，管理财务信息</text>
        </view>
      </view>
    </view>

    <!-- 供需协作 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">🌾 供需协作</text>
      </view>
      <view class="card-grid">
        <view class="card border-green" @click="navigateTo('/pages/processor/supply/index')">
          <text class="card-title text-green">🌾 农户供应</text>
          <text class="card-desc">对接农户供应，查看农户货源信息</text>
        </view>
        <view class="card border-orange" @click="navigateTo('/pages/merchant/demand/publish')">
          <text class="card-title text-orange">📢 发布求购</text>
          <text class="card-desc">发布收购需求，吸引农户供应</text>
        </view>
        <view class="card border-blue" @click="navigateTo('/pages/processor/orders/index')">
          <text class="card-title text-blue">🏭 处理商需求</text>
          <text class="card-desc">对接处理商订单，查看采购需求</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">⚖️ 售后与账户</text>
      </view>
      <view class="card-grid">
        <view class="card border-red" @click="navigateTo('/pages/merchant/arbitration/index')">
          <text class="card-title text-red">⚖️ 仲裁中心</text>
          <text class="card-desc">提交仲裁申请，查看处理进度</text>
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
  name: '测试回收商',
  role: 'merchant'
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
  color: #EF6C00;
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

.border-dark { border-left-color: #1B3A24; }
.text-dark { color: #1B3A24; }

.border-green { border-left-color: #2E7D32; }
.text-green { color: #2E7D32; }

.border-orange { border-left-color: #EF6C00; }
.text-orange { color: #EF6C00; }

.border-blue { border-left-color: #1565C0; }
.text-blue { color: #1565C0; }

.border-red { border-left-color: #e74c3c; }
.text-red { color: #e74c3c; }
</style>
