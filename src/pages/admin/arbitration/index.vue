<template>
  <view class="container">
    <view class="header">
      <text class="title">⚖️ 仲裁管理</text>
      <text class="desc">处理平台订单纠纷，查看仲裁请求并做出裁决</text>
    </view>

    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ pendingCount }}</text>
        <text class="stat-label">待处理</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-blue">{{ investigatingCount }}</text>
        <text class="stat-label">调查中</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-green">{{ resolvedCount }}</text>
        <text class="stat-label">已裁决</text>
      </view>
    </view>

    <view class="list-container">
      <view class="order-card" :class="{ 'card-resolved': item.status === 'resolved' }" v-for="item in arbitrationList" :key="item.raw_id">
        <view class="card-header">
          <text class="order-no">纠纷单号：{{ item.id }}</text>
          <text class="status-badge" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">相关订单：</text>
            <text class="value">{{ item.order_no }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请人：</text>
            <text class="value">{{ item.applicant }} ({{ item.role_label }})</text>
          </view>
          <view class="info-row">
            <text class="label">纠纷类型：</text>
            <text class="value highlight">{{ item.reason_label }}</text>
          </view>
          <view class="info-row">
            <text class="label">详情描述：</text>
            <text class="value address">{{ item.description }}</text>
          </view>
          <view class="result-box" v-if="item.status === 'resolved'">
            <view class="info-row">
              <text class="label">责任方：</text>
              <text class="value text-red">{{ item.verdict_party }}</text>
            </view>
            <view class="info-row">
              <text class="label">裁决意见：</text>
              <text class="value">{{ item.verdict_opinion }}</text>
            </view>
            <view class="info-row">
              <text class="label">裁决时间：</text>
              <text class="value">{{ item.verdict_time }}</text>
            </view>
          </view>
        </view>

        <view class="card-footer">
          <text class="time">{{ item.created_at }}</text>
          <view class="actions">
            <button v-if="item.status !== 'resolved'" class="btn btn-primary" size="mini" @click="openPanel(item)">立即处理</button>
            <text v-else class="resolved-tag">✅ 已裁决</text>
          </view>
        </view>
      </view>

      <view v-if="arbitrationList.length === 0" class="empty-state">
        <text class="empty-text">暂无仲裁记录</text>
      </view>
    </view>

    <view class="mask" v-if="showPanel" @click="closePanel"></view>
    <view class="verdict-panel" v-if="showPanel">
      <view class="panel-header">
        <text class="panel-title">⚖️ 做出裁决</text>
        <text class="panel-sub">纠纷单号：{{ currentItem.id }}</text>
      </view>

      <view class="panel-body">
        <view class="panel-section">
          <text class="panel-label">纠纷摘要</text>
          <view class="panel-summary">
            <text class="summary-text">{{ currentItem.reason_label }} — {{ currentItem.applicant }}({{ currentItem.role_label }}) 发起</text>
          </view>
        </view>

        <view class="panel-section">
          <text class="panel-label">责任方判定</text>
          <view class="party-selector">
            <view class="party-option" :class="{ 'party-active': verdictForm.party === 'applicant' }" @click="verdictForm.party = 'applicant'">
              <text class="party-text">申请方</text>
            </view>
            <view class="party-option" :class="{ 'party-active': verdictForm.party === 'respondent' }" @click="verdictForm.party = 'respondent'">
              <text class="party-text">被申请方</text>
            </view>
            <view class="party-option" :class="{ 'party-active': verdictForm.party === 'both' }" @click="verdictForm.party = 'both'">
              <text class="party-text">双方共责</text>
            </view>
            <view class="party-option" :class="{ 'party-active': verdictForm.party === 'platform' }" @click="verdictForm.party = 'platform'">
              <text class="party-text">平台责任</text>
            </view>
          </view>
        </view>

        <view class="panel-section">
          <text class="panel-label">仲裁意见</text>
          <textarea class="panel-textarea" v-model="verdictForm.opinion" placeholder="请输入裁决意见、处理方案及赔偿要求..." />
        </view>
      </view>

      <view class="panel-actions">
        <button class="btn-cancel" @click="closePanel">取消</button>
        <button class="btn-verdict" @click="submitVerdict">确认裁决</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const showPanel = ref(false);
const currentItem = ref({});
const adminId = ref(null);

const verdictForm = ref({
  party: '',
  opinion: ''
});

const partyLabels = {
  applicant: '申请方责任',
  respondent: '被申请方责任',
  both: '双方共同责任',
  platform: '平台责任'
};

const arbitrationList = ref([]);

const reasonLabelMap = {
  quality: '质量不符',
  quantity: '重量争议',
  payment: '货款纠纷',
  delivery: '交付延迟',
  fraud: '欺诈行为',
  breach: '合同违约',
  other: '其他'
};

const roleLabelMap = {
  admin: '管理员',
  farmer: '农户',
  recycler: '回收商',
  merchant: '回收商',
  processor: '处理商'
};

const formatDate = (value) => {
  if (!value) return '--';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const extractVerdictParty = (notes = '') => {
  const matched = String(notes || '').match(/^责任判定：(.+)$/);
  return matched ? matched[1] : '--';
};

const normalizeArbitration = (row = {}) => {
  const roleRaw = row.applicant_role === 'recycler' ? 'merchant' : row.applicant_role;
  return {
    raw_id: row.id,
    id: row.arbitration_no || `ARB-${row.id}`,
    order_no: row.order_no || '--',
    applicant: row.applicant_name || `用户#${row.applicant_id || '--'}`,
    role_label: roleLabelMap[roleRaw] || roleRaw || '用户',
    reason_label: reasonLabelMap[row.reason] || row.reason || '其他',
    description: row.description || '',
    status: row.status || 'pending',
    created_at: formatDate(row.created_at),
    verdict_party: extractVerdictParty(row.admin_notes),
    verdict_opinion: row.decision || '',
    verdict_time: formatDate(row.decided_at)
  };
};

const loadArbitrations = async () => {
  const rows = await request.get('/api/arbitration-requests/all?status=all');
  arbitrationList.value = Array.isArray(rows) ? rows.map(normalizeArbitration) : [];
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'admin', false)) {
      uni.showToast({ title: '仅管理员可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    adminId.value = me.id;
    await loadArbitrations();
  } catch (err) {
    arbitrationList.value = [];
  }
});

const pendingCount = computed(() => arbitrationList.value.filter(i => i.status === 'pending').length);
const investigatingCount = computed(() => arbitrationList.value.filter(i => i.status === 'investigating').length);
const resolvedCount = computed(() => arbitrationList.value.filter(i => i.status === 'resolved').length);

const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    investigating: '调查中',
    resolved: '已裁决',
    rejected: '已驳回'
  };
  return map[status] || status;
};

const openPanel = (item) => {
  currentItem.value = item;
  verdictForm.value = { party: '', opinion: '' };
  showPanel.value = true;
};

const closePanel = () => {
  showPanel.value = false;
};

const submitVerdict = async () => {
  if (!verdictForm.value.party) {
    uni.showToast({ title: '请选择责任方', icon: 'none' });
    return;
  }
  if (!verdictForm.value.opinion.trim()) {
    uni.showToast({ title: '请输入仲裁意见', icon: 'none' });
    return;
  }

  try {
    await request.patch(`/api/arbitration-requests/${currentItem.value.raw_id}`, {
      status: 'resolved',
      admin_notes: `责任判定：${partyLabels[verdictForm.value.party]}`,
      decision: verdictForm.value.opinion.trim(),
      decided_by: adminId.value,
      decided_at: new Date().toISOString()
    });

    showPanel.value = false;
    uni.showToast({ title: '裁决已生效', icon: 'success' });
    await loadArbitrations();
  } catch (err) {
    // request.js 已统一提示
  }
};
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

.stats-bar {
  display: flex;
  background: white;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.stat-item {
  flex: 1;
  text-align: center;
  border-right: 1rpx solid #eee;
}
.stat-item:last-child { border-right: none; }

.stat-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
  display: block;
}

.text-red { color: #e74c3c; }
.text-blue { color: #1565C0; }
.text-green { color: #2E7D32; }

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #EF6C00;
}

.card-resolved { border-left-color: #2E7D32; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-no { font-size: 28rpx; color: #666; }

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: bold;
}

.status-pending { background: #FFF3E0; color: #EF6C00; }
.status-investigating { background: #E3F2FD; color: #1565C0; }
.status-resolved { background: #e8f5e9; color: #2E7D32; }
.status-rejected { background: #ffebee; color: #c62828; }

.card-body { margin-bottom: 0; }

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}

.label { color: #888; width: 160rpx; }
.value { color: #333; flex: 1; }
.highlight { color: #e74c3c; font-weight: bold; }

.address {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.result-box {
  background: #f0faf1;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-top: 16rpx;
  border-left: 6rpx solid #2E7D32;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
}

.time { font-size: 24rpx; color: #999; }

.btn-primary {
  background: #1565C0;
  color: white;
  font-size: 24rpx;
  padding: 0 30rpx;
  border-radius: 30rpx;
  margin: 0;
}

.resolved-tag { font-size: 24rpx; color: #2E7D32; }

.empty-state { text-align: center; padding: 100rpx 0; }
.empty-state .empty-text { color: #999; font-size: 28rpx; }

/* --- 裁决面板 --- */
.mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 998;
}

.verdict-panel {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: white;
  border-radius: 40rpx 40rpx 0 0;
  padding: 50rpx 40rpx;
  z-index: 999;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 -8rpx 40rpx rgba(0,0,0,0.12);
}

.panel-header { margin-bottom: 30rpx; }

.panel-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}

.panel-sub { font-size: 26rpx; color: #999; }

.panel-body { margin-bottom: 30rpx; }

.panel-section { margin-bottom: 30rpx; }

.panel-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.panel-summary {
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
}

.summary-text { font-size: 26rpx; color: #666; }

.party-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.party-option {
  padding: 16rpx 28rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
  background: #fafafa;
}

.party-active {
  border-color: #1565C0;
  background: #e3f2fd;
}

.party-text { font-size: 26rpx; color: #333; }
.party-active .party-text { color: #1565C0; font-weight: bold; }

.panel-textarea {
  width: 100%;
  height: 200rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.panel-actions {
  display: flex;
  gap: 20rpx;
}

.btn-cancel {
  flex: 1;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  margin: 0;
}

.btn-verdict {
  flex: 2;
  background: #1565C0;
  color: white;
  border: none;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin: 0;
}
</style>
