<template>
  <view class="container">
    <view class="header">
      <text class="title">📈 数据统计</text>
      <text class="desc">查看平台用户、交易、申报与仲裁核心指标</text>
    </view>

    <view class="toolbar">
      <button class="btn-refresh" @click="loadOverview" :disabled="loading">
        {{ loading ? '刷新中…' : '刷新数据' }}
      </button>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">统计数据加载中…</text>
    </view>

    <view v-else-if="fetchError" class="state-card error-card">
      <text class="state-text">{{ fetchError }}</text>
    </view>

    <view v-else class="content-area">
      <view class="metrics-grid">
        <view class="metric-card" v-for="item in topMetrics" :key="item.key">
          <text class="metric-label">{{ item.label }}</text>
          <text class="metric-value" :class="item.className">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">👥 用户结构</text>
        <view class="kv-row" v-for="item in userMetrics" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">📦 订单状态</text>
        <view class="kv-row" v-for="item in orderMetrics" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">🧾 申报与意向</text>
        <view class="kv-row" v-for="item in reportIntentMetrics" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">⚖️ 仲裁进度</text>
        <view class="kv-row" v-for="item in arbitrationMetrics" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value">{{ item.value }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const loading = ref(false);
const fetchError = ref('');
const overview = ref({});

const numberText = (value) => Number(value || 0).toLocaleString('zh-CN');
const moneyText = (value) => `¥ ${Number(value || 0).toFixed(2)}`;

const topMetrics = computed(() => [
  { key: 'users_total', label: '总用户', value: numberText(overview.value.users_total), className: 'text-primary' },
  { key: 'orders_total', label: '总订单', value: numberText(overview.value.orders_total), className: 'text-green' },
  { key: 'reports_total', label: '总申报', value: numberText(overview.value.reports_total), className: 'text-orange' },
  { key: 'intentions_total', label: '总意向', value: numberText(overview.value.intentions_total), className: 'text-blue' },
  { key: 'arbitrations_total', label: '总仲裁', value: numberText(overview.value.arbitrations_total), className: 'text-red' },
  { key: 'orders_turnover', label: '累计成交额', value: moneyText(overview.value.orders_turnover), className: 'text-purple' }
]);

const userMetrics = computed(() => [
  { key: 'users_admin', label: '管理员', value: numberText(overview.value.users_admin) },
  { key: 'users_farmer', label: '农户', value: numberText(overview.value.users_farmer) },
  { key: 'users_recycler', label: '回收商', value: numberText(overview.value.users_recycler) },
  { key: 'users_processor', label: '处理商', value: numberText(overview.value.users_processor) },
  { key: 'users_new_7d', label: '近 7 天新增', value: numberText(overview.value.users_new_7d) }
]);

const orderMetrics = computed(() => [
  { key: 'orders_pending', label: '待处理', value: numberText(overview.value.orders_pending) },
  { key: 'orders_accepted', label: '进行中', value: numberText(overview.value.orders_accepted) },
  { key: 'orders_completed', label: '已完成', value: numberText(overview.value.orders_completed) },
  { key: 'orders_cancelled', label: '已取消', value: numberText(overview.value.orders_cancelled) }
]);

const reportIntentMetrics = computed(() => [
  { key: 'reports_pending', label: '申报待处理', value: numberText(overview.value.reports_pending) },
  { key: 'reports_accepted', label: '申报已受理', value: numberText(overview.value.reports_accepted) },
  { key: 'reports_completed', label: '申报已完成', value: numberText(overview.value.reports_completed) },
  { key: 'reports_weight_processed', label: '已处理重量(斤)', value: numberText(overview.value.reports_weight_processed) },
  { key: 'intentions_pending', label: '意向待处理', value: numberText(overview.value.intentions_pending) },
  { key: 'intentions_accepted', label: '意向已接受', value: numberText(overview.value.intentions_accepted) }
]);

const arbitrationMetrics = computed(() => [
  { key: 'arbitrations_pending', label: '待处理', value: numberText(overview.value.arbitrations_pending) },
  { key: 'arbitrations_investigating', label: '调查中', value: numberText(overview.value.arbitrations_investigating) },
  { key: 'arbitrations_resolved', label: '已裁决', value: numberText(overview.value.arbitrations_resolved) },
  { key: 'arbitrations_rejected', label: '已驳回', value: numberText(overview.value.arbitrations_rejected) }
]);

const loadOverview = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const data = await request.get('/api/admin/statistics/overview');
    overview.value = data || {};
  } catch (err) {
    fetchError.value = err?.message || '统计数据加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'admin', false)) {
      uni.showToast({ title: '仅管理员可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadOverview();
  } catch (err) {
    fetchError.value = err?.message || '管理员身份校验失败';
  }
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background: #FAFAF5;
}

.header {
  margin-bottom: 24rpx;
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

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20rpx;
}

.btn-refresh {
  background: #1565C0;
  color: #fff;
  border-radius: 12rpx;
  font-size: 24rpx;
  padding: 0 22rpx;
}

.state-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.error-card {
  border-left: 8rpx solid #E53935;
}

.state-text {
  font-size: 26rpx;
  color: #666;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.metric-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.metric-label {
  font-size: 24rpx;
  color: #777;
  display: block;
  margin-bottom: 10rpx;
}

.metric-value {
  font-size: 34rpx;
  font-weight: bold;
}

.panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.panel-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 14rpx;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-label {
  font-size: 25rpx;
  color: #666;
}

.kv-value {
  font-size: 25rpx;
  font-weight: 600;
  color: #333;
}

.text-primary { color: #1565C0; }
.text-green { color: #2E7D32; }
.text-orange { color: #EF6C00; }
.text-blue { color: #0277BD; }
.text-red { color: #D32F2F; }
.text-purple { color: #6A1B9A; }
</style>
