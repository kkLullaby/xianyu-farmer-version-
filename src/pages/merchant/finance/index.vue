<template>
  <view class="container">
    <view class="header">
      <text class="title">💰 财务中心</text>
      <text class="desc">查看您的收益与交易流水</text>
    </view>

    <!-- 资产卡片 -->
    <view class="asset-card">
      <view class="asset-item">
        <text class="asset-label">总收益 (元)</text>
        <text class="asset-num">¥ 12,580.00</text>
      </view>
      <view class="asset-row">
        <view class="sub-item">
          <text class="sub-label">本月收益</text>
          <text class="sub-num">¥ 3,200.00</text>
        </view>
        <view class="sub-item">
          <text class="sub-label">待结算</text>
          <text class="sub-num">¥ 850.00</text>
        </view>
      </view>
      <button class="withdraw-btn" @click="handleWithdraw">提现</button>
    </view>

    <!-- 交易明细 -->
    <view class="transaction-list">
      <text class="section-title">交易明细</text>
      
      <view class="transaction-item" v-for="(item, index) in transactions" :key="item.id">
        <view class="trans-icon" :class="item.type === 'income' ? 'icon-income' : 'icon-expense'">
          {{ item.type === 'income' ? '收' : '支' }}
        </view>
        <view class="trans-info">
          <text class="trans-title">{{ item.title }}</text>
          <text class="trans-date">{{ item.date }}</text>
        </view>
        <text class="trans-amount" :class="item.type === 'income' ? 'text-green' : 'text-red'">
          {{ item.type === 'income' ? '+' : '-' }}{{ item.amount }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

// Mock Data
const transactions = ref([
  { id: 1, type: 'income', title: '订单结算 - ORD20240320001', date: '2024-03-20 16:30', amount: '500.00' },
  { id: 2, type: 'expense', title: '提现至微信零钱', date: '2024-03-19 10:00', amount: '2000.00' },
  { id: 3, type: 'income', title: '订单结算 - ORD20240318002', date: '2024-03-18 11:20', amount: '800.00' },
  { id: 4, type: 'income', title: '订单结算 - ORD20240315005', date: '2024-03-15 09:45', amount: '1200.00' }
]);

const handleWithdraw = () => {
  uni.showToast({
    title: '该功能将在正式版开放',
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

.asset-card {
  background: linear-gradient(135deg, #1B3A24, #2E7D32);
  border-radius: 24rpx;
  padding: 40rpx;
  color: white;
  margin-bottom: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(46, 125, 50, 0.3);
}

.asset-item {
  margin-bottom: 40rpx;
}

.asset-label {
  font-size: 28rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 10rpx;
}

.asset-num {
  font-size: 60rpx;
  font-weight: bold;
}

.asset-row {
  display: flex;
  margin-bottom: 30rpx;
}

.sub-item {
  flex: 1;
}

.sub-label {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
  margin-bottom: 6rpx;
}

.sub-num {
  font-size: 32rpx;
  font-weight: bold;
}

.withdraw-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-top: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.transaction-list {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}

.transaction-item:last-child {
  border-bottom: none;
}

.trans-icon {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 20rpx;
}

.icon-income {
  background: #E8F5E9;
  color: #2E7D32;
}

.icon-expense {
  background: #FFF3E0;
  color: #EF6C00;
}

.trans-info {
  flex: 1;
}

.trans-title {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 6rpx;
}

.trans-date {
  font-size: 24rpx;
  color: #999;
}

.trans-amount {
  font-size: 32rpx;
  font-weight: bold;
}

.text-green { color: #2E7D32; }
.text-red { color: #EF6C00; }
</style>
