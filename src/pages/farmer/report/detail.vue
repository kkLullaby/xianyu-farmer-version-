<template>
  <view class="container">
    <view class="status-banner" :class="'banner-' + getBannerStatus(report.status)">
      <text class="banner-icon">{{ statusIcon[report.status] || '⏳' }}</text>
      <text class="banner-label">{{ statusText[report.status] || '待处理' }}</text>
    </view>

    <view class="detail-card">
      <view class="card-title-row">
        <text class="card-title">📋 申报基本信息</text>
        <text class="report-no">{{ report.id }}</text>
      </view>
      <view class="info-row">
        <text class="label">柑橘品种：</text>
        <text class="value">{{ report.goods_type || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">预估重量：</text>
        <text class="value highlight">{{ report.weight }} 斤</text>
      </view>
      <view class="info-row">
        <text class="label">处理地点：</text>
        <text class="value">{{ report.address || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">期望处理日：</text>
        <text class="value">{{ report.pickup_date || '—' }}</text>
      </view>
      <view class="info-row" v-if="report.notes">
        <text class="label">备注：</text>
        <text class="value notes-text">{{ report.notes }}</text>
      </view>
    </view>

    <view class="detail-card">
      <view class="card-title-row">
        <text class="card-title">📅 申报时间线</text>
      </view>
      <view class="timeline">
        <view class="timeline-item done">
          <view class="dot done-dot"></view>
          <view class="timeline-content">
            <text class="tl-title">提交申报</text>
            <text class="tl-time">{{ report.create_time || '—' }}</text>
          </view>
        </view>
        <view class="timeline-item" :class="report.status !== 'pending' ? 'done' : 'pending'">
          <view class="dot" :class="report.status !== 'pending' ? 'done-dot' : 'pending-dot'"></view>
          <view class="timeline-content">
            <text class="tl-title">平台审核</text>
            <text class="tl-time" v-if="report.status === 'accepted' || report.status === 'completed'">已通过</text>
            <text class="tl-time" v-else-if="report.status === 'rejected'">已驳回</text>
            <text class="tl-time" v-else>待审核</text>
          </view>
        </view>
        <view class="timeline-item" :class="(report.status === 'accepted' || report.status === 'completed') ? 'done' : 'pending'">
          <view class="dot" :class="(report.status === 'accepted' || report.status === 'completed') ? 'done-dot' : 'pending-dot'"></view>
          <view class="timeline-content">
            <text class="tl-title">对接处理商</text>
            <text class="tl-time">{{ (report.status === 'accepted' || report.status === 'completed') ? '已开放对接' : '等待审核通过' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="action-bar">
      <button class="btn-back" @click="uni.navigateBack()">返回列表</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import request from '@/utils/request.js';

const report = ref({});

const statusText = {
  pending: '待审核',
  accepted: '已接单',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
  draft: '草稿'
};

const statusIcon = {
  pending: '⏳',
  accepted: '✅',
  completed: '✅',
  rejected: '❌',
  cancelled: '⏹️',
  draft: '📝'
};

const getBannerStatus = (status) => {
  if (status === 'accepted' || status === 'completed') return 'approved';
  if (status === 'cancelled') return 'rejected';
  return status || 'pending';
};

const normalizeReport = (row = {}) => ({
  id: row.id,
  report_no: row.report_no || '',
  goods_type: row.citrus_variety || '—',
  weight: row.weight_kg || 0,
  address: row.location_address || '—',
  pickup_date: row.pickup_date || '—',
  status: row.status || 'pending',
  create_time: row.created_at || '—',
  notes: row.notes || '',
});

const loadReportDetail = async (id) => {
  try {
    const row = await request.get(`/api/farmer-reports/${id}`);
    report.value = normalizeReport(row);
  } catch (err) {
    report.value = {
      id,
      goods_type: '—',
      weight: 0,
      address: '—',
      pickup_date: '—',
      status: 'pending',
      create_time: '—',
      notes: '',
    };
  }
};

onLoad((options) => {
  if (!options || !options.id) return;
  loadReportDetail(options.id);
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
  padding-bottom: 160rpx;
}

.status-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  margin-bottom: 30rpx;
}

.banner-pending {
  background: linear-gradient(135deg, #FFF8E1, #FFE082);
}

.banner-approved {
  background: linear-gradient(135deg, #E8F5E9, #A5D6A7);
}

.banner-rejected {
  background: linear-gradient(135deg, #FFEBEE, #EF9A9A);
}

.banner-draft {
  background: linear-gradient(135deg, #F5F5F5, #E0E0E0);
}

.banner-icon {
  font-size: 72rpx;
  margin-bottom: 16rpx;
}

.banner-label {
  font-size: 36rpx;
  font-weight: bold;
  color: #1B3A24;
}

.detail-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
}

.report-no {
  font-size: 22rpx;
  color: #999;
}

.info-row {
  display: flex;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  align-items: flex-start;
}

.label {
  color: #888;
  width: 180rpx;
  flex-shrink: 0;
}

.value {
  color: #333;
  flex: 1;
  line-height: 1.5;
}

.highlight {
  color: #2E7D32;
  font-weight: bold;
}

.notes-text {
  color: #666;
  font-size: 26rpx;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  position: relative;
  padding-bottom: 36rpx;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 19rpx;
  top: 32rpx;
  bottom: 0;
  width: 2rpx;
  background: #E0E0E0;
}

.timeline-item:last-child::before {
  display: none;
}

.dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 24rpx;
  margin-top: 4rpx;
}

.done-dot {
  background: #2E7D32;
}

.pending-dot {
  background: #E0E0E0;
  border: 2rpx solid #BDBDBD;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tl-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.tl-time {
  font-size: 24rpx;
  color: #999;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx 40rpx;
  background: white;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.06);
}

.btn-back {
  width: 100%;
  background: #1B3A24;
  color: white;
  border: none;
  border-radius: 20rpx;
  font-size: 30rpx;
  line-height: 88rpx;
  height: 88rpx;
}
</style>
