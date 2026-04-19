<template>
  <view class="container">
    <view class="header">
      <text class="title">📨 收到的意向</text>
      <text class="desc">农户/供应商发来的报价意向，确认后自动生成订单</text>
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

    <view v-if="loading" class="empty-state">
      <text class="empty-text">意向加载中…</text>
    </view>

    <view v-else-if="fetchError" class="empty-state">
      <text class="empty-text">{{ fetchError }}</text>
    </view>

    <view v-else class="list-container">
      <view class="intention-card" v-for="item in displayList" :key="item.id">
        <view class="card-top">
          <view class="sender-info">
            <text class="sender-name">{{ item.sender_name || '农户用户' }}</text>
            <text class="sender-tag">意向报价</text>
          </view>
          <text class="status-badge" :class="'status-' + item.status">{{ statusLabel[item.status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">报价金额：</text>
            <text class="value price-text">{{ item.price_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">预估重量：</text>
            <text class="value">{{ item.weight_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">期望交货：</text>
            <text class="value">{{ item.date_text }}</text>
          </view>
          <view class="info-row" v-if="item.notes">
            <text class="label">意向备注：</text>
            <text class="value">{{ item.notes }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起时间：</text>
            <text class="value time-text">{{ item.created_text }}</text>
          </view>
        </view>

        <view class="card-footer" v-if="item.status === 'pending'">
          <button class="btn-reject" size="mini" @click="handleReject(item)">❌ 拒绝</button>
          <button class="btn-accept" size="mini" @click="handleAccept(item)">✅ 接受并生成订单</button>
        </view>
        <view class="card-footer-done" v-else>
          <text class="done-tag" v-if="item.status === 'accepted'">✅ 已接受 · 订单已生成</text>
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
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const currentTab = ref(0);
const allIntentions = ref([]);
const loading = ref(false);
const fetchError = ref('');

const statusLabel = {
  pending: '待确认',
  accepted: '已转订单',
  rejected: '已拒绝'
};

const formatDate = (value) => {
  if (!value) return '--';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const parsePriceFromNotes = (notes = '') => {
  const matched = String(notes || '').match(/([0-9]+(?:\.[0-9]+)?)\s*元\s*\/\s*斤/);
  if (!matched) return null;
  const amount = Number(matched[1]);
  return Number.isFinite(amount) ? amount : null;
};

const normalizeIntention = (row = {}, target = {}) => {
  const price = parsePriceFromNotes(row.notes);
  const weight = Number(row.estimated_weight || 0);
  const createdTs = Date.parse(row.created_at || '') || 0;
  return {
    id: row.id,
    sender_name: row.applicant_name || '农户用户',
    status: row.status || 'pending',
    target_name: row.target_name || target.request_no || '回收求购',
    price_text: price !== null ? `¥ ${price.toFixed(2)} 元/斤` : '待协商',
    weight_text: Number.isFinite(weight) && weight > 0 ? `${weight} 斤` : '待协商',
    date_text: row.expected_date || '待协商',
    notes: row.notes || '',
    created_ts: createdTs,
    created_text: formatDate(row.created_at)
  };
};

const loadIntentions = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'merchant', false)) {
      uni.showToast({ title: '仅回收商可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }

    const targets = await request.get('/api/recycler-requests?status=all');
    const targetRows = Array.isArray(targets) ? targets : [];

    const results = await Promise.allSettled(
      targetRows.map((target) => request.get(`/api/intentions?target_type=recycler_request&target_id=${target.id}`))
    );

    const merged = [];
    results.forEach((result, idx) => {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
      const target = targetRows[idx] || {};
      result.value.forEach((row) => {
        merged.push(normalizeIntention(row, target));
      });
    });

    allIntentions.value = merged.sort((a, b) => (b.created_ts || 0) - (a.created_ts || 0));
  } catch (err) {
    allIntentions.value = [];
    fetchError.value = err?.message || '意向加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadIntentions();
});

const pendingList = computed(() => allIntentions.value.filter(i => i.status === 'pending'));
const donelList = computed(() => allIntentions.value.filter(i => i.status !== 'pending'));
const displayList = computed(() => currentTab.value === 0 ? pendingList.value : donelList.value);

const handleAccept = (item) => {
  uni.showModal({
    title: '确认接受意向',
    content: '接受该报价意向并自动生成订单？',
    success: async (res) => {
      if (!res.confirm) return;

      try {
        const result = await request.patch(`/api/intentions/${item.id}/status`, { status: 'accepted' });
        const orderNo = result?.order_no;
        uni.showToast({ title: orderNo ? `订单已生成：${orderNo}` : '订单已生成', icon: 'success' });
        await loadIntentions();
      } catch (err) {
        // request.js 已统一提示
      }
    }
  });
};

const handleReject = (item) => {
  uni.showModal({
    title: '确认拒绝',
    content: '确定拒绝该报价意向？',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request.patch(`/api/intentions/${item.id}/status`, { status: 'rejected' });
        uni.showToast({ title: '已拒绝该意向', icon: 'none' });
        await loadIntentions();
      } catch (err) {
        // request.js 已统一提示
      }
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
  color: #EF6C00;
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
  border-left: 8rpx solid #EF6C00;
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

.status-pending { background: #FFF8E1; color: #EF6C00; }
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
  color: #E65100;
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
  background: linear-gradient(135deg, #EF6C00, #F57C00);
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
