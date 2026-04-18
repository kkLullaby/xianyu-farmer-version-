<template>
  <view class="container">
    <view class="header">
      <text class="title">📋 申报记录</text>
      <text class="desc">查看您的所有历史申报及处理状态</text>
    </view>

    <!-- 筛选/统计栏 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ reportList.length }}</text>
        <text class="stat-label">总申报数</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-green">{{ acceptedCount }}</text>
        <text class="stat-label">已受理</text>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-container">
      <view class="report-card" v-for="(item, index) in reportList" :key="item.id">
        <view class="card-header">
          <text class="report-no">单号：{{ item.report_no || ('ID-' + item.id) }}</text>
          <text class="status-badge" :class="getStatusClass(item.status)">
            {{ getStatusText(item.status) }}
          </text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">处理日期：</text>
            <text class="value">{{ item.pickup_date || item.create_time }}</text>
          </view>
          <view class="info-row">
            <text class="label">预估重量：</text>
            <text class="value highlight">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">柑橘品种：</text>
            <text class="value">{{ item.goods_type }}</text>
          </view>
          <view class="info-row">
            <text class="label">处理地点：</text>
            <text class="value address">{{ item.address }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">{{ item.create_time }}</text>
          <view class="actions">
            <button class="btn btn-detail" size="mini" @click="viewDetail(item)">查看详情</button>
            <button 
              v-if="item.status === 'draft'" 
              class="btn btn-delete" 
              size="mini" 
              @click="deleteReport(item.id)"
            >删除</button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="reportList.length === 0" class="empty-state">
        <text class="empty-icon">📂</text>
        <text class="empty-text">暂无申报记录</text>
        <button class="btn-create" @click="navigateToCreate">去申报</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import request from '@/utils/request.js';

const reportList = ref([]);

const normalizeReport = (row = {}) => ({
  id: row.id,
  report_no: row.report_no || '',
  pickup_date: row.pickup_date || '',
  weight: Number(row.weight_kg || 0),
  goods_type: row.citrus_variety || '未填写',
  address: row.location_address || '未填写',
  status: row.status || 'pending',
  create_time: row.created_at || '',
});

const loadReports = async () => {
  try {
    const rows = await request.get('/api/farmer-reports');
    reportList.value = Array.isArray(rows) ? rows.map(normalizeReport) : [];
  } catch (err) {
    reportList.value = [];
  }
};

onShow(loadReports);

onPullDownRefresh(async () => {
  await loadReports();
  uni.stopPullDownRefresh();
});

const acceptedCount = computed(() => {
  return reportList.value.filter((item) => item.status === 'accepted' || item.status === 'completed').length;
});

// Helper Methods
const getStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'accepted': '已受理',
    'completed': '已完成',
    'rejected': '已驳回',
    'cancelled': '已取消',
    'draft': '草稿'
  };
  return map[status] || status;
};

const getStatusClass = (status) => {
  return `status-${status}`;
};

// Actions
const viewDetail = (item) => {
  uni.navigateTo({ url: './detail?id=' + item.id });
};

const deleteReport = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条申报记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request.delete(`/api/farmer-reports/${id}`);
          await loadReports();
          uni.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          // request.js 已统一提示，这里避免重复弹窗
        }
      }
    }
  });
};

const navigateToCreate = () => {
  uni.navigateTo({
    url: '/pages/farmer/report/create'
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

/* 统计栏 */
.stats-bar {
  display: flex;
  background: white;
  padding: 30rpx;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.stat-item {
  flex: 1;
  text-align: center;
  border-right: 1px solid #eee;
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

.text-green { color: #2E7D32; }

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
  display: block;
}

/* 列表卡片 */
.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.report-card {
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

.report-no {
  font-size: 28rpx;
  color: #666;
  font-family: monospace;
}

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: bold;
}

.status-pending { background: #FFF3E0; color: #EF6C00; }
.status-accepted { background: #E3F2FD; color: #1565C0; }
.status-completed { background: #E8F5E9; color: #2E7D32; }
.status-draft { background: #F5F5F5; color: #999; }
.status-rejected { background: #FFEBEE; color: #C62828; }
.status-cancelled { background: #ECEFF1; color: #546E7A; }

.card-body {
  margin-bottom: 24rpx;
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

.actions {
  display: flex;
  gap: 16rpx;
}

.btn {
  font-size: 24rpx;
  padding: 0 24rpx;
  line-height: 50rpx;
  margin: 0;
}

.btn-detail {
  background: white;
  color: #2E7D32;
  border: 1px solid #2E7D32;
}

.btn-delete {
  background: white;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
  display: block;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
  display: block;
}

.btn-create {
  background: #2E7D32;
  color: white;
  width: 240rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
