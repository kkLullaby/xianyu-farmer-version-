<template>
  <view class="container">
    <view class="header">
      <text class="title">📋 申报审核</text>
      <text class="desc">审核各角色发布的业务单据并推进状态流转</text>
    </view>

    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">农户申报</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">回收商发布</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text class="tab-text">处理商发布</text>
        <view class="tab-line" v-if="currentTab === 2"></view>
      </view>
    </view>

    <view class="toolbar">
      <text class="stats-text">当前待审核：{{ pendingCount }} 条</text>
      <button class="btn-refresh" @click="loadCurrentTab" :disabled="loading">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </view>

    <view class="list-container">
      <view v-if="loading" class="empty-state">
        <text class="empty-text">审核数据加载中…</text>
      </view>

      <view v-else-if="fetchError" class="empty-state">
        <text class="empty-text">{{ fetchError }}</text>
      </view>

      <view
        v-else
        class="audit-card"
        :class="{ 'card-approved': item.audit_status === 'approved' }"
        v-for="item in currentList"
        :key="item.id"
      >
        <view class="card-top">
          <text class="card-no">{{ item.display_no }}</text>
          <text class="audit-badge" :class="'audit-' + item.audit_status">{{ auditStatusLabel[item.audit_status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">提交人：</text>
            <text class="val">{{ item.submitter }} ({{ item.role_label }})</text>
          </view>
          <view class="info-row">
            <text class="label">类型：</text>
            <text class="val highlight">{{ item.type_label }}</text>
          </view>
          <view class="info-row">
            <text class="label">品种/规格：</text>
            <text class="val">{{ item.spec }}</text>
          </view>
          <view class="info-row">
            <text class="label">数量：</text>
            <text class="val">{{ item.quantity }}</text>
          </view>
          <view class="info-row" v-if="item.unit_price_text !== '—'">
            <text class="label">申报单价：</text>
            <text class="val price-text">{{ item.unit_price_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">后端状态：</text>
            <text class="val text-blue">{{ backendStatusLabel(item.backend_status) }}</text>
          </view>
        </view>

        <view class="card-bottom">
          <text class="time-text">提交时间：{{ item.created_at }}</text>
          <view class="btn-group">
            <button v-if="item.audit_status === 'pending'" class="btn-audit" @click="confirmReview(item, 'approved')">通过</button>
            <button v-if="item.audit_status === 'pending'" class="btn-reject" @click="confirmReview(item, 'rejected')">驳回</button>
            <text v-if="item.audit_status === 'approved'" class="approved-tag">✅ 已通过</text>
            <text v-if="item.audit_status === 'rejected'" class="rejected-tag">❌ 已驳回</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="!loading && !fetchError && currentList.length === 0">
        <text class="empty-text">暂无审核数据</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const currentTab = ref(0);
const loading = ref(false);
const fetchError = ref('');

const auditStatusLabel = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回'
};

const farmerList = ref([]);
const merchantPublishList = ref([]);
const processorPublishList = ref([]);

const gradeLabelMap = {
  grade1: '一级品',
  grade2: '二级品',
  grade3: '三级品',
  offgrade: '等外级',
  any: '不限品级',
  mixed: '混合级'
};

const citrusLabelMap = {
  mandarin: '柑橘',
  orange: '橙子',
  pomelo: '柚子',
  tangerine: '橘子',
  any: '不限种类'
};

const normalizeAuditStatus = (backendStatus = '', sourceType = '') => {
  const status = String(backendStatus || '').toLowerCase();
  if (sourceType === 'farmer_report') {
    if (status === 'accepted' || status === 'completed') return 'approved';
    if (status === 'cancelled' || status === 'rejected' || status === 'expired') return 'rejected';
    return 'pending';
  }

  if (status === 'active' || status === 'accepted' || status === 'completed') return 'approved';
  if (status === 'cancelled' || status === 'rejected' || status === 'expired') return 'rejected';
  return 'pending';
};

const formatDate = (value) => {
  if (!value) return '--';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const formatUnitPrice = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `${amount.toFixed(2)} 元/斤`;
};

const backendStatusLabel = (status) => {
  const map = {
    draft: '草稿',
    pending: '待处理',
    accepted: '已受理',
    active: '生效中',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已驳回',
    expired: '已过期'
  };
  return map[String(status || '').toLowerCase()] || (status || '未知');
};

const normalizeFarmerAuditItem = (row = {}) => {
  const unitPrice = Number(row.price_per_kg || 0);
  const variety = row.citrus_variety || '未填写品种';
  const grade = gradeLabelMap[row.grade] || row.grade || '未分级';
  return {
    id: `farmer-${row.id}`,
    raw_id: row.id,
    source_type: 'farmer_report',
    display_no: row.report_no || `FR-${row.id}`,
    submitter: row.farmer_name || row.contact_name || '农户',
    role_label: '农户',
    type_label: '柑肉处理申报',
    spec: `${grade} · ${variety}`,
    quantity: `${Number(row.weight_kg || 0)} 斤`,
    unit_price_text: formatUnitPrice(unitPrice),
    backend_status: row.status || 'pending',
    audit_status: normalizeAuditStatus(row.status, 'farmer_report'),
    created_at: formatDate(row.created_at)
  };
};

const normalizeRecyclerAuditItem = (row = {}) => {
  const grade = gradeLabelMap[row.grade] || row.grade || '未分级';
  return {
    id: `recycler-${row.id}`,
    raw_id: row.id,
    source_type: 'recycler_request',
    display_no: row.request_no || `RR-${row.id}`,
    submitter: row.contact_name || `回收商#${row.recycler_id || ''}`,
    role_label: '回收商',
    type_label: '回收求购发布',
    spec: `${grade} · 联系方式${row.contact_phone ? '已填写' : '未填写'}`,
    quantity: '--',
    unit_price_text: '—',
    backend_status: row.status || 'draft',
    audit_status: normalizeAuditStatus(row.status, 'recycler_request'),
    created_at: formatDate(row.created_at)
  };
};

const normalizeProcessorAuditItem = (row = {}) => {
  const grade = gradeLabelMap[row.grade] || row.grade || '未分级';
  const citrus = citrusLabelMap[row.citrus_type || row.citrus_variety] || row.citrus_type || row.citrus_variety || '未填种类';
  return {
    id: `processor-${row.id}`,
    raw_id: row.id,
    source_type: 'processor_request',
    display_no: row.request_no || `PR-${row.id}`,
    submitter: row.processor_name || row.contact_name || `处理商#${row.processor_id || ''}`,
    role_label: '处理商',
    type_label: '处理商求购发布',
    spec: `${grade} · ${citrus}`,
    quantity: `${Number(row.weight_kg || 0)} 斤`,
    unit_price_text: '—',
    backend_status: row.status || 'draft',
    audit_status: normalizeAuditStatus(row.status, 'processor_request'),
    created_at: formatDate(row.created_at)
  };
};

const currentList = computed(() => {
  if (currentTab.value === 0) return farmerList.value;
  if (currentTab.value === 1) return merchantPublishList.value;
  return processorPublishList.value;
});

const pendingCount = computed(() => currentList.value.filter((item) => item.audit_status === 'pending').length);

const loadFarmerAudits = async () => {
  const rows = await request.get('/api/farmer-reports?status=all');
  farmerList.value = Array.isArray(rows) ? rows.map(normalizeFarmerAuditItem) : [];
};

const loadRecyclerAudits = async () => {
  const rows = await request.get('/api/recycler-requests?status=all');
  merchantPublishList.value = Array.isArray(rows) ? rows.map(normalizeRecyclerAuditItem) : [];
};

const loadProcessorAudits = async () => {
  const rows = await request.get('/api/processor-requests?status=all');
  processorPublishList.value = Array.isArray(rows) ? rows.map(normalizeProcessorAuditItem) : [];
};

const loadCurrentTab = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    if (currentTab.value === 0) {
      await loadFarmerAudits();
    } else if (currentTab.value === 1) {
      await loadRecyclerAudits();
    } else {
      await loadProcessorAudits();
    }
  } catch (err) {
    fetchError.value = err?.message || '审核数据加载失败';
  } finally {
    loading.value = false;
  }
};

const applyReviewStatus = async (item, reviewStatus) => {
  if (item.source_type === 'farmer_report') {
    const nextStatus = reviewStatus === 'approved' ? 'accepted' : 'rejected';
    await request.patch(`/api/farmer-reports/${item.raw_id}/status`, { status: nextStatus });
    return;
  }

  if (item.source_type === 'recycler_request') {
    const nextStatus = reviewStatus === 'approved' ? 'active' : 'cancelled';
    await request.patch(`/api/recycler-requests/${item.raw_id}/status`, { status: nextStatus });
    return;
  }

  if (item.source_type === 'processor_request') {
    const nextStatus = reviewStatus === 'approved' ? 'active' : 'cancelled';
    await request.patch(`/api/processor-requests/${item.raw_id}/status`, { status: nextStatus });
  }
};

const confirmReview = (item, reviewStatus) => {
  const actionText = reviewStatus === 'approved' ? '通过' : '驳回';
  uni.showModal({
    title: `确认${actionText}`,
    content: `确定要${actionText}${item.submitter}的单据吗？`,
    success: async (res) => {
      if (!res.confirm) return;

      try {
        await applyReviewStatus(item, reviewStatus);
        uni.showToast({ title: `${actionText}成功`, icon: 'success' });
        await loadCurrentTab();
      } catch (err) {
        // request.js 已统一提示
      }
    }
  });
};

watch(currentTab, () => {
  loadCurrentTab();
});

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'admin', false)) {
      uni.showToast({ title: '仅管理员可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadCurrentTab();
  } catch (err) {
    fetchError.value = err?.message || '管理员身份校验失败';
  }
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header { margin-bottom: 30rpx; }

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 10rpx;
}

.desc { font-size: 26rpx; color: #45664E; }

.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-text { font-size: 28rpx; color: #666; font-weight: 500; }
.tab-item.active .tab-text { color: #1565C0; font-weight: bold; }

.tab-line {
  position: absolute;
  bottom: 0; left: 50%; transform: translateX(-50%);
  width: 40rpx; height: 6rpx;
  background: #1565C0; border-radius: 4rpx;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.stats-text { font-size: 26rpx; color: #999; }

.btn-refresh {
  background: #1565C0;
  color: #fff;
  font-size: 24rpx;
  border-radius: 30rpx;
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  margin: 0;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.audit-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #EF6C00;
}

.card-approved { border-left-color: #2E7D32; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.card-no { font-size: 26rpx; color: #999; }

.audit-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: bold;
}

.audit-pending { background: #FFF3E0; color: #EF6C00; }
.audit-approved { background: #e8f5e9; color: #2E7D32; }
.audit-rejected { background: #fce4ec; color: #c62828; }

.card-body { margin-bottom: 16rpx; }

.info-row {
  display: flex;
  margin-bottom: 10rpx;
  font-size: 27rpx;
}

.label { color: #888; width: 170rpx; }
.val { color: #333; flex: 1; }
.highlight { color: #1565C0; font-weight: bold; }
.price-text { color: #e74c3c; font-weight: bold; }
.text-blue { color: #1565C0; font-weight: bold; }

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx dashed #eee;
}

.time-text { font-size: 24rpx; color: #bbb; }

.btn-group { display: flex; gap: 12rpx; }

.btn-audit {
  background: #1565C0;
  color: white;
  font-size: 24rpx;
  padding: 0 28rpx;
  border-radius: 30rpx;
  height: 56rpx;
  line-height: 56rpx;
  margin: 0;
  border: none;
}

.btn-reject {
  background: #fff;
  color: #c62828;
  font-size: 24rpx;
  padding: 0 28rpx;
  border-radius: 30rpx;
  height: 56rpx;
  line-height: 56rpx;
  border: 2rpx solid #c62828;
  margin: 0;
}

.approved-tag { font-size: 24rpx; color: #2E7D32; }
.rejected-tag { font-size: 24rpx; color: #c62828; }

.empty-state { text-align: center; padding: 80rpx 0; }
.empty-text { font-size: 28rpx; color: #bbb; }
</style>
