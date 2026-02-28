<template>
  <view class="container">
    <view class="header">
      <text class="title">📨 收到的意向</text>
      <text class="desc">农户/供应商发来的报价意向，确认后自动生成采购订单</text>
    </view>

    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">待处理</text>
        <view class="tab-dot" v-if="pendingList.length > 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">已处理</text>
      </view>
    </view>

    <view class="list-container">
      <view class="intention-card" v-for="(item, index) in displayList" :key="item.id || index">
        <view class="card-top">
          <view class="sender-info">
            <text class="sender-name">{{ item.sender_name || '供应商' }}</text>
            <text class="sender-tag">原料供应意向</text>
          </view>
          <text class="status-badge" :class="'status-' + item.status">{{ statusLabel[item.status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">报价金额：</text>
            <text class="value price-text">¥ {{ item.price }} 元/斤</text>
          </view>
          <view class="info-row">
            <text class="label">供应重量：</text>
            <text class="value">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">期望交货：</text>
            <text class="value">{{ item.date || '待协商' }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起时间：</text>
            <text class="value time-text">{{ item.create_time }}</text>
          </view>
        </view>

        <view class="card-footer" v-if="item.status === 'pending'">
          <button class="btn-reject" size="mini" @click="handleReject(item)">❌ 拒绝</button>
          <button class="btn-accept" size="mini" @click="handleAccept(item)">✅ 接受并生成订单</button>
        </view>
        <view class="card-footer-done" v-else>
          <text class="done-tag" v-if="item.status === 'accepted'">✅ 已接受 · 采购订单已生成</text>
          <text class="done-tag rejected" v-else>❌ 已拒绝</text>
        </view>
      </view>

      <view class="empty-state" v-if="displayList.length === 0">
        <text class="empty-icon">📭</text>
        <text class="empty-text">{{ currentTab === 0 ? '暂无待处理意向' : '暂无已处理意向' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const currentTab = ref(0);
const allIntentions = ref([]);

const statusLabel = {
  pending: '待确认',
  accepted: '已转订单',
  rejected: '已拒绝'
};

onShow(() => {
  const list = uni.getStorageSync('global_intentions') || [];
  allIntentions.value = list.slice().reverse();
});

const pendingList = computed(() => allIntentions.value.filter(i => i.status === 'pending'));
const donelList = computed(() => allIntentions.value.filter(i => i.status !== 'pending'));
const displayList = computed(() => currentTab.value === 0 ? pendingList.value : donelList.value);

const handleAccept = (item) => {
  uni.showModal({
    title: '确认接受意向',
    content: `接受该供应意向并生成采购订单？\n报价：¥${item.price}元/斤，重量：${item.weight}斤`,
    success: (res) => {
      if (!res.confirm) return;

      const orderList = uni.getStorageSync('global_order_list') || [];
      const newOrder = {
        id: 'ORD' + Date.now(),
        order_no: 'PUR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(orderList.length + 1).padStart(3, '0'),
        intention_id: item.id,
        supplier: item.sender_name || '供应商',
        material: item.variety || '柑橘果肉',
        weight: item.weight,
        unit_price: item.price,
        total_price: (Number(item.price) * Number(item.weight)).toFixed(2),
        ship_from: item.address || '待确认',
        expected_delivery: item.date || '待协商',
        flow_status: 'pending_ship',
        status: '待发货',
        created_at: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
        timeline: [
          { time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc: '意向被接受，采购订单已创建' }
        ]
      };
      orderList.unshift(newOrder);
      uni.setStorageSync('global_order_list', orderList);

      const intentions = uni.getStorageSync('global_intentions') || [];
      const idx = intentions.findIndex(i => i.id === item.id);
      if (idx !== -1) intentions[idx].status = 'accepted';
      uni.setStorageSync('global_intentions', intentions);

      allIntentions.value = intentions.slice().reverse();
      uni.showToast({ title: '订单已生成，请前往订单管理查看', icon: 'success' });
    }
  });
};

const handleReject = (item) => {
  uni.showModal({
    title: '确认拒绝',
    content: '确定拒绝该供应意向？',
    success: (res) => {
      if (!res.confirm) return;
      const intentions = uni.getStorageSync('global_intentions') || [];
      const idx = intentions.findIndex(i => i.id === item.id);
      if (idx !== -1) intentions[idx].status = 'rejected';
      uni.setStorageSync('global_intentions', intentions);
      allIntentions.value = intentions.slice().reverse();
      uni.showToast({ title: '已拒绝该意向', icon: 'none' });
    }
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

.tab-bar {
  display: flex;
  background: white;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  position: relative;
  padding: 10rpx 0;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
}

.tab-item.active .tab-text {
  color: #1565C0;
  font-weight: bold;
}

.tab-dot {
  position: absolute;
  top: 4rpx;
  right: calc(50% - 36rpx);
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e53935;
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
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #1565C0;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.sender-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sender-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
}

.sender-tag {
  font-size: 22rpx;
  color: #999;
}

.status-badge {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-weight: bold;
}

.status-pending { background: #E3F2FD; color: #1565C0; }
.status-accepted { background: #E8F5E9; color: #2E7D32; }
.status-rejected { background: #FFEBEE; color: #C62828; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
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
  color: #1565C0;
  font-weight: bold;
  font-size: 30rpx;
}

.time-text {
  font-size: 24rpx;
  color: #999;
}

.card-footer {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
}

.btn-reject {
  background: white;
  color: #C62828;
  border: 1rpx solid #C62828;
  border-radius: 30rpx;
  font-size: 26rpx;
  padding: 0 28rpx;
  line-height: 60rpx;
  margin: 0;
}

.btn-accept {
  background: linear-gradient(135deg, #1565C0, #1976D2);
  color: white;
  border: none;
  border-radius: 30rpx;
  font-size: 26rpx;
  padding: 0 28rpx;
  line-height: 60rpx;
  margin: 0;
}

.card-footer-done {
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
  text-align: right;
}

.done-tag {
  font-size: 26rpx;
  color: #2E7D32;
}

.done-tag.rejected {
  color: #999;
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
  font-size: 30rpx;
  color: #999;
}
</style>
