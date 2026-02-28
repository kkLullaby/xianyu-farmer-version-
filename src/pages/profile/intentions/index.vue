<template>
  <view class="container">
    <view class="header">
      <text class="title">📨 我的意向</text>
      <text class="desc">查看你发出的所有报价意向及其最新状态</text>
    </view>

    <view class="list-container">
      <view
        class="intention-card"
        v-for="(item, index) in intentionList"
        :key="item.id || index"
      >
        <view class="card-top">
          <text class="target-name">{{ item.target_name }}</text>
          <text class="status-badge" :class="'status-' + item.status">{{ statusLabel[item.status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">报价：</text>
            <text class="value price-text">¥ {{ item.price }} 元/斤</text>
          </view>
          <view class="info-row">
            <text class="label">预估重量：</text>
            <text class="value">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">期望日期：</text>
            <text class="value">{{ item.date }}</text>
          </view>
          <view class="info-row">
            <text class="label">发送时间：</text>
            <text class="value time-text">{{ item.create_time }}</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="intentionList.length === 0">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无发出的意向</text>
        <text class="empty-hint">在求购大厅或附近处理点页面，点击"发起意向"即可发送</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const intentionList = ref([]);

const statusLabel = {
  pending: '待确认',
  accepted: '已转订单',
  rejected: '已拒绝'
};

onShow(() => {
  const list = uni.getStorageSync('global_intentions') || [];
  intentionList.value = list.slice().reverse();
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header {
  margin-bottom: 40rpx;
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

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.intention-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.target-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
}

.status-badge {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-weight: bold;
}

.status-pending {
  background-color: #FFF8E1;
  color: #EF6C00;
}

.status-accepted {
  background-color: #E8F5E9;
  color: #2E7D32;
}

.status-rejected {
  background-color: #FFEBEE;
  color: #C62828;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.label {
  font-size: 26rpx;
  color: #888;
  width: 160rpx;
  flex-shrink: 0;
}

.value {
  font-size: 28rpx;
  color: #333;
}

.price-text {
  color: #E65100;
  font-weight: bold;
}

.time-text {
  color: #999;
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #aaa;
  text-align: center;
  line-height: 1.6;
}
</style>
