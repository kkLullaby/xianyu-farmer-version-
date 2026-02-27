<template>
  <view class="container">
    <view class="header">
      <text class="title">🌾 货源供应</text>
      <text class="desc">对接农户与回收商货源，查看供应信息并进行采购</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>全部货源</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>农户直供</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text>回收商转供</text>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-container">
      <view class="supply-card" v-for="(item, index) in filteredList" :key="item.id">
        <view class="card-header">
          <text class="supply-type" :class="'type-' + item.type">{{ item.type === 'farmer' ? '农户' : '回收商' }}</text>
          <text class="variety">{{ item.variety }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">供应商：</text>
            <text class="value">{{ item.provider }}</text>
          </view>
          <view class="info-row">
            <text class="label">可供重量：</text>
            <text class="value highlight">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">期望单价：</text>
            <text class="value price">¥ {{ item.price }}/斤</text>
          </view>
          <view class="info-row">
            <text class="label">所在地：</text>
            <text class="value address">{{ item.location }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">发布于 {{ item.date }}</text>
          <view class="actions">
            <button class="btn btn-call" size="mini" @click="makeCall(item.phone)">拨号</button>
            <button class="btn btn-primary" size="mini" @click="handlePurchase(item)">意向采购</button>
          </view>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty-state">
        <text class="empty-text">暂无符合条件的货源</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';

const currentTab = ref(0);

// Mock Data
const supplyList = ref([
  {
    id: 1,
    type: 'farmer',
    provider: '张大伯',
    variety: '新会柑 (核心产区)',
    weight: 2000,
    price: 3.5,
    location: '新会区三江镇',
    phone: '13800138000',
    date: '2024-03-25'
  },
  {
    id: 2,
    type: 'merchant',
    provider: '绿源回收站',
    variety: '茶枝柑',
    weight: 5000,
    price: 2.8,
    location: '新会区双水镇',
    phone: '13900139000',
    date: '2024-03-24'
  },
  {
    id: 3,
    type: 'farmer',
    provider: '李阿姨',
    variety: '新会柑',
    weight: 800,
    price: 3.2,
    location: '新会区会城街道',
    phone: '13700137000',
    date: '2024-03-23'
  }
]);

const filteredList = computed(() => {
  if (currentTab.value === 0) return supplyList.value;
  const type = currentTab.value === 1 ? 'farmer' : 'merchant';
  return supplyList.value.filter(item => item.type === type);
});

const makeCall = (phone) => {
  uni.makePhoneCall({
    phoneNumber: phone
  });
};

const handlePurchase = (item) => {
  uni.showToast({
    title: '意向已提交',
    icon: 'success'
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
  padding: 10rpx 0;
}

.filter-item.active {
  color: #1565C0;
  font-weight: bold;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.supply-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.supply-type {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  color: white;
}

.type-farmer { background-color: #2E7D32; }
.type-merchant { background-color: #EF6C00; }

.variety {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
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
  color: #2E7D32;
  font-weight: bold;
}

.price {
  color: #e74c3c;
  font-weight: bold;
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

.actions {
  display: flex;
  gap: 16rpx;
}

.btn-call {
  background: white;
  color: #1565C0;
  border: 1rpx solid #1565C0;
}

.btn-primary {
  background: #1565C0;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
