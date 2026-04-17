<template>
  <view class="container">
    <view class="header">
      <text class="title">🧭 农户工作台</text>
      <text class="subtitle">欢迎回来，{{ userInfo.name }}</text>
      <text class="desc">一站式管理您的全部业务功能</text>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📦 订单与业务</text>
      </view>
      <view class="card-grid">
        <view class="card border-orange" @click="navigateTo('/pages/farmer/report/create')">
          <text class="card-title text-orange">📝 发起申报</text>
          <text class="card-desc">申报新的柑肉处理，获取处理凭证</text>
        </view>
        <view class="card border-gold" @click="navigateTo('/pages/farmer/report/list')">
          <text class="card-title text-gold">📋 申报记录</text>
          <text class="card-desc">查看所有历史记录与申报状态</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🤝 市场与供需</text>
      </view>
      <view class="card-grid">
        <view class="card border-blue" @click="navigateTo('/pages/farmer/demand-hall/index')">
          <text class="card-title text-blue">📢 求购大厅</text>
          <text class="card-desc">查看回收商与处理商的求购需求</text>
        </view>
        <view class="card border-dark" @click="navigateTo('/pages/farmer/supply/index')">
          <text class="card-title text-dark">🌾 处理商需求大厅</text>
          <text class="card-desc">查看处理商发布的柑橘果肉收购需求</text>
        </view>
        <view class="card border-green" @click="navigateTo('/pages/farmer/nearby/index')">
          <text class="card-title text-green">🌍 附近处理点</text>
          <text class="card-desc">查找最近的回收/处理点，实时显示位置</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">⚖️ 售后与账户</text>
      </view>
      <view class="card-grid">
        <view class="card border-red" @click="navigateTo('/pages/farmer/arbitration/index')">
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
import { onShow } from '@dcloudio/uni-app';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const userInfo = ref({
  name: '农户朋友',
  role: 'farmer'
});

const roleNameMap = {
  farmer: '农户朋友',
  merchant: '回收商老板',
  recycler: '回收商老板',
  processor: '处理商企业',
  admin: '管理员'
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'farmer')) {
      uni.showToast({ title: '无权访问农户工作台', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }

    userInfo.value.role = me.role;
    userInfo.value.name = me.full_name || me.username || roleNameMap[me.role] || '农户朋友';
  } catch (e) {
    console.warn('[FarmerDashboard] syncSessionFromServer failed', e);
  }
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
  color: #2E7D32;
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
.border-orange { border-left-color: #EF6C00; }
.text-orange { color: #EF6C00; }

.border-gold { border-left-color: #FFB300; }
.text-gold { color: #FFB300; }

.border-green { border-left-color: #2E7D32; }
.text-green { color: #2E7D32; }

.border-blue { border-left-color: #1565C0; }
.text-blue { color: #1565C0; }

.border-red { border-left-color: #e74c3c; }
.text-red { color: #e74c3c; }

.border-dark { border-left-color: #455A64; }
.text-dark { color: #455A64; }
</style>
