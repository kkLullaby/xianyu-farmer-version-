<template>
  <view class="container">
    <view class="header">
      <text class="title">📨 我的意向</text>
      <text class="desc">查看你发出的所有报价意向及其最新状态</text>
    </view>

    <view v-if="loading" class="empty-state">
      <text class="empty-text">意向加载中…</text>
    </view>

    <view v-else-if="fetchError" class="empty-state">
      <text class="empty-text">{{ fetchError }}</text>
    </view>

    <view v-else class="list-container">
      <view
        class="intention-card"
        v-for="item in intentionList"
        :key="item.id"
      >
        <view class="card-top">
          <text class="target-name">{{ item.target_name }}</text>
          <text class="status-badge" :class="'status-' + item.status">{{ statusLabel[item.status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">报价：</text>
            <text class="value price-text">{{ item.price_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">预估重量：</text>
            <text class="value">{{ item.weight_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">期望日期：</text>
            <text class="value">{{ item.date_text }}</text>
          </view>
          <view class="info-row" v-if="item.notes">
            <text class="label">备注：</text>
            <text class="value">{{ item.notes }}</text>
          </view>
          <view class="info-row">
            <text class="label">发送时间：</text>
            <text class="value time-text">{{ item.created_text }}</text>
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
import request from '@/utils/request.js';
import { syncSessionFromServer } from '@/utils/session';

const intentionList = ref([]);
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

const normalizeRow = (row = {}) => {
  const price = parsePriceFromNotes(row.notes);
  const weight = Number(row.estimated_weight || 0);
  return {
    id: row.id,
    target_name: row.target_name || row.target_no || row.target_type || '目标单据',
    status: row.status || 'pending',
    price_text: price !== null ? `¥ ${price.toFixed(2)} 元/斤` : '待协商',
    weight_text: Number.isFinite(weight) && weight > 0 ? `${weight} 斤` : '待协商',
    date_text: row.expected_date || '待协商',
    notes: row.notes || '',
    created_text: formatDate(row.created_at)
  };
};

const loadMyIntentions = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const me = await syncSessionFromServer();
    const rows = await request.get(`/api/intentions?applicant_id=${me.id}`);
    const list = Array.isArray(rows) ? rows : [];
    intentionList.value = list.map(normalizeRow);
  } catch (err) {
    intentionList.value = [];
    fetchError.value = err?.message || '意向加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadMyIntentions();
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
