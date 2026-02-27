<template>
  <view class="container">
    <view class="header">
      <text class="title">📦 采购订单管理</text>
      <text class="desc">管理原料采购订单，跟踪收货状态</text>
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
          <text class="order-no">单号：{{ item.order_no }}</text>
          <text class="status-text">{{ item.status }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">供应商：</text>
            <text class="value">{{ item.supplier }}</text>
          </view>
          <view class="info-row">
            <text class="label">原料类型：</text>
            <text class="value">{{ item.material }}</text>
          </view>
          <view class="info-row">
            <text class="label">采购重量：</text>
            <text class="value highlight">{{ item.weight }} 吨</text>
          </view>
          <view class="info-row">
            <text class="label">预计到货：</text>
            <text class="value">{{ item.delivery_date }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">创建于 {{ item.created_at }}</text>
          <view class="actions">
            <button class="btn btn-primary" size="mini" @click="handleOrder(item)">查看详情</button>
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

const tabs = ['全部', '待发货', '运输中', '已入库'];
const currentTab = ref(0);

// Mock Data
const orders = ref([
  {
    id: 1,
    order_no: 'PUR-20240321-001',
    supplier: '绿野回收站',
    material: '柑肉原料',
    weight: 5.5,
    delivery_date: '2024-03-23',
    status: '待发货',
    created_at: '2024-03-21'
  },
  {
    id: 2,
    order_no: 'PUR-20240320-003',
    supplier: '兴旺果业合作社',
    material: '陈皮原料',
    weight: 2.0,
    delivery_date: '2024-03-22',
    status: '运输中',
    created_at: '2024-03-20'
  },
  {
    id: 3,
    order_no: 'PUR-20240315-008',
    supplier: '丰收农场',
    material: '果渣',
    weight: 10.0,
    delivery_date: '2024-03-18',
    status: '已入库',
    created_at: '2024-03-15'
  }
]);

const filteredOrders = computed(() => {
  if (currentTab.value === 0) return orders.value;
  const statusMap = ['全部', '待发货', '运输中', '已入库'];
  return orders.value.filter(item => item.status === statusMap[currentTab.value]);
});

const handleOrder = (item) => {
  uni.navigateTo({
    url: '/pages/processor/orders/detail?id=' + item.id
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
  color: #1565C0;
  font-weight: bold;
}

.active-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #1565C0;
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
  color: #1565C0;
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
  color: #1565C0;
  font-weight: bold;
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
