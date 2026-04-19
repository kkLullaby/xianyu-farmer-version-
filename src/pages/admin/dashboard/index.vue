<template>
  <view class="container">
    <view class="header">
      <text class="title">🧭 管理控制台</text>
      <text class="subtitle">欢迎回来，{{ userInfo.name }}</text>
      <text class="desc">一站式管理您的全部业务功能</text>
    </view>

    <!-- 管理中心 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">📊 管理中心</text>
      </view>
      <view class="card-grid">
        <view class="card border-green" @click="navigateTo('/pages/admin/users/index')">
          <text class="card-title text-green">👥 用户管理</text>
          <text class="card-desc">管理所有用户账户，审核、禁用、删除等操作</text>
        </view>
        <view class="card border-gold" @click="navigateTo('/pages/admin/audit/index')">
          <text class="card-title text-gold">📝 申报审核</text>
          <text class="card-desc">审核农户的处理申报，核实处理数据和文件</text>
        </view>
        <view class="card border-light" @click="navigateTo('/pages/admin/statistics/index')">
          <text class="card-title text-light">📈 数据统计</text>
          <text class="card-desc">查看平台各类数据，处理量、用户活跃度等</text>
        </view>
        <view class="card border-blue" @click="navigateTo('/pages/admin/cms/index')">
          <text class="card-title text-blue">📰 公告编辑中心</text>
          <text class="card-desc">编辑首页政策公告、案例展示与合作商推荐</text>
        </view>
        <view class="card border-red" @click="navigateTo('/pages/admin/arbitration/index')">
          <text class="card-title text-red">⚖️ 仲裁管理</text>
          <text class="card-desc">处理订单纠纷，查看仲裁请求并做出裁决</text>
        </view>
        <view class="card border-dark" @click="navigateTo('/pages/admin/settings/index')">
          <text class="card-title text-dark">⚙️ 系统设置</text>
          <text class="card-desc">配置平台参数，管理处理点、费用等</text>
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
  name: '测试管理员',
  role: 'admin'
});

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'admin', false)) {
      uni.showToast({ title: '仅管理员可访问该页面', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }

    userInfo.value.role = me.role;
    userInfo.value.name = me.full_name || me.username || '管理员';
  } catch (e) {
    console.warn('[AdminDashboard] syncSessionFromServer failed', e);
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
.border-green { border-left-color: #2E7D32; }
.text-green { color: #2E7D32; }

.border-gold { border-left-color: #FFB300; }
.text-gold { color: #FFB300; }

.border-light { border-left-color: #66BB6A; }
.text-light { color: #66BB6A; }

.border-blue { border-left-color: #1565C0; }
.text-blue { color: #1565C0; }

.border-red { border-left-color: #e74c3c; }
.text-red { color: #e74c3c; }

.border-dark { border-left-color: #45664E; }
.text-dark { color: #45664E; }
</style>
