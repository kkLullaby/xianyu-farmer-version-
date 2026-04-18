<template>
  <view class="container">
    <view class="header">
      <text class="title">📦 订单管理</text>
      <text class="desc">管理所有回收订单，跟踪交易状态</text>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-bar">
      <view 
        v-for="(tab, index) in tabs" 
        :key="index" 
        class="filter-item" 
        :class="{ active: currentTab === index }"
        @click="currentTab = index"
      >
        <text>{{ tab }}</text>
        <view class="active-line" v-if="currentTab === index"></view>
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="list-container">
      <view class="order-card" v-for="(item, index) in filteredOrders" :key="item.id">
        <view class="card-header">
          <text class="order-no">订单号：{{ item.order_no }}</text>
          <text class="status-text">{{ item.status }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">农户姓名：</text>
            <text class="value">{{ item.farmer_name }}</text>
          </view>
          <view class="info-row">
            <text class="label">回收品种：</text>
            <text class="value">{{ item.variety }}</text>
          </view>
          <view class="info-row">
            <text class="label">预估重量：</text>
            <text class="value highlight">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">回收地址：</text>
            <text class="value address">{{ item.address }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">{{ item.created_at }}</text>
          <view class="actions">
            <button class="btn btn-primary" size="mini" @click="goToDetail(item.id)">处理订单</button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <text class="empty-text">暂无相关订单</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';

const tabs = ['全部', '待接单', '进行中', '已完成'];
const currentTab = ref(0);

const statusMap = {
  pending_ship: '待接单',
  shipped: '进行中',
  completed: '已完成',
  pending: '待接单',
  accepted: '进行中',
};

const orders = ref([]);

const normalizeOrder = (item = {}) => ({
  id: item.id,
  order_no: item.order_no || '',
  farmer_name: item.farmer_full_name || item.farmer_username || `农户#${item.farmer_id || ''}`,
  variety: '柑橘果肉',
  weight: Number(item.weight_kg || 0),
  address: item.location_name || item.location_address || '待确认',
  status: statusMap[item.status] || item.status || '待接单',
  created_at: item.created_at || '',
});

const loadOrders = async () => {
  try {
    const rows = await request.get('/api/orders');
    orders.value = Array.isArray(rows) ? rows.map(normalizeOrder) : [];
  } catch (err) {
    orders.value = [];
  }
};

onShow(loadOrders);

const filteredOrders = computed(() => {
  if (currentTab.value === 0) return orders.value;
  const tabStatusMap = ['全部', '待接单', '进行中', '已完成'];
  return orders.value.filter(item => item.status === tabStatusMap[currentTab.value]);
});

const goToDetail = (id) => {
  uni.navigateTo({ url: './detail?id=' + id });
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

.filter-bar {
  display: flex;
  background: white;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  position: relative;
  padding-bottom: 10rpx;
}

.filter-item.active {
  color: #EF6C00;
  font-weight: bold;
}

.active-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #EF6C00;
  border-radius: 2rpx;
}

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
  border-bottom: 1px solid #f5f5f5;
}

.order-no {
  font-size: 28rpx;
  color: #666;
}

.status-text {
  font-size: 28rpx;
  color: #EF6C00;
  font-weight: bold;
}

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
  color: #EF6C00;
  font-weight: bold;
}

.address {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1px dashed #eee;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.btn-primary {
  background: #EF6C00;
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
