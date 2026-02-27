<template>
  <view class="container">
    <view class="header">
      <text class="title">⚖️ 仲裁中心</text>
      <text class="desc">处理平台订单纠纷，查看仲裁请求并做出裁决</text>
    </view>

    <!-- 统计栏 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ arbitrationList.length }}</text>
        <text class="stat-label">待处理</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-red">1</text>
        <text class="stat-label">紧急</text>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-container">
      <view class="order-card" v-for="(item, index) in arbitrationList" :key="item.id">
        <view class="card-header">
          <text class="order-no">纠纷单号：{{ item.id }}</text>
          <text class="status-badge" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">相关订单：</text>
            <text class="value">{{ item.order_no }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请人：</text>
            <text class="value">{{ item.applicant }} ({{ item.role }})</text>
          </view>
          <view class="info-row">
            <text class="label">纠纷类型：</text>
            <text class="value highlight">{{ item.reason }}</text>
          </view>
          <view class="info-row">
            <text class="label">详情描述：</text>
            <text class="value address">{{ item.description }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">{{ item.created_at }}</text>
          <view class="actions">
            <button class="btn btn-primary" size="mini" @click="handleArbitration(item)">立即处理</button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="arbitrationList.length === 0" class="empty-state">
        <text class="empty-text">暂无待处理仲裁</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

// Mock Data
const arbitrationList = ref([
  {
    id: 'ARB20240325001',
    order_no: 'ORD20240320001',
    applicant: '张三',
    role: '农户',
    reason: '重量争议',
    description: '实际称重与回收商记录不符，相差约50斤。',
    status: 'pending',
    created_at: '2024-03-25 10:00'
  },
  {
    id: 'ARB20240324002',
    order_no: 'ORD20240319005',
    applicant: '李四',
    role: '回收商',
    reason: '品质不符',
    description: '农户提供的柑肉含有大量杂质，不符合收购标准。',
    status: 'pending',
    created_at: '2024-03-24 15:30'
  },
  {
    id: 'ARB20240323003',
    order_no: 'ORD20240318002',
    applicant: '王五',
    role: '农户',
    reason: '付款延迟',
    description: '确认收货后超过48小时未收到结算款项。',
    status: 'urgent',
    created_at: '2024-03-23 09:15'
  }
]);

const getStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'urgent': '紧急',
    'resolved': '已解决'
  };
  return map[status] || status;
};

const handleArbitration = (item) => {
  uni.showToast({
    title: '处理功能开发中',
    icon: 'none'
  });
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

.stats-bar {
  display: flex;
  background: white;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.stat-item {
  flex: 1;
  text-align: center;
  border-right: 1rpx solid #eee;
}

.stat-item:last-child {
  border-right: none;
}

.stat-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
  display: block;
}

.text-red { color: #e74c3c; }

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-no {
  font-size: 28rpx;
  color: #666;
}

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: bold;
}

.status-pending { background: #FFF3E0; color: #EF6C00; }
.status-urgent { background: #FFEBEE; color: #e74c3c; }

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}

.label {
  color: #888;
  width: 160rpx;
}

.value {
  color: #333;
  flex: 1;
}

.highlight {
  color: #e74c3c;
  font-weight: bold;
}

.address {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.btn-primary {
  background: #1565C0;
  color: white;
  font-size: 24rpx;
  padding: 0 30rpx;
  border-radius: 30rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
