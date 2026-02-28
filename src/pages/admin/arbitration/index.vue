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
        <text class="stat-num text-red">{{ urgentCount }}</text>
        <text class="stat-label">紧急</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-green">{{ resolvedCount }}</text>
        <text class="stat-label">已裁决</text>
      </view>
    </view>

    <view class="list-container">
      <view class="order-card" :class="{ 'card-resolved': item.status === 'resolved' }" v-for="item in arbitrationList" :key="item.id">
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
            <text class="value">{{ item.applicant }} ({{ item.role }})</text>
          </view>
          <view class="info-row">
            <text class="label">纠纷类型：</text>
            <text class="value highlight">{{ item.reason }}</text>
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
            <text class="summary-text">{{ currentItem.reason }} — {{ currentItem.applicant }}({{ currentItem.role }}) 发起</text>
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

const showPanel = ref(false);
const currentItem = ref({});

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

const arbitrationList = ref([
  {
    id: 'ARB20260225001',
    order_no: 'ORD20260220001',
    applicant: '张三',
    role: '农户',
    reason: '重量争议',
    description: '实际称重与回收商记录不符，相差约50斤，农户要求按实际重量重新结算。',
    status: 'pending',
    created_at: '2026-02-25 10:00',
    verdict_party: null,
    verdict_opinion: null,
    verdict_time: null
  },
  {
    id: 'ARB20260224002',
    order_no: 'ORD20260219005',
    applicant: '李四',
    role: '回收商',
    reason: '品质不符',
    description: '农户提供的柑肉含有大量杂质，不符合一级品收购标准，回收商要求降级处理。',
    status: 'pending',
    created_at: '2026-02-24 15:30',
    verdict_party: null,
    verdict_opinion: null,
    verdict_time: null
  },
  {
    id: 'ARB20260223003',
    order_no: 'ORD20260218002',
    applicant: '王五',
    role: '农户',
    reason: '付款延迟',
    description: '确认收货后超过48小时未收到结算款项，农户生活困难请求紧急处理。',
    status: 'urgent',
    created_at: '2026-02-23 09:15',
    verdict_party: null,
    verdict_opinion: null,
    verdict_time: null
  },
  {
    id: 'ARB20260210004',
    order_no: 'ORD20260205010',
    applicant: '赵六',
    role: '处理商',
    reason: '合同违约',
    description: '供应方未按合同约定时间交货，导致生产线停工。',
    status: 'resolved',
    created_at: '2026-02-10 08:00',
    verdict_party: '被申请方责任',
    verdict_opinion: '经核实，供应方确实延迟交货3日。裁定供应方赔偿停工损失2000元，并在5个工作日内完成交付。',
    verdict_time: '2026-02-12 14:30'
  }
]);

const loadGlobalArbitrationList = () => {
  const globalList = uni.getStorageSync('global_arbitration_list') || [];
  if (Array.isArray(globalList) && globalList.length > 0) {
    arbitrationList.value = globalList.map(item => ({
      ...item,
      reason: item.reason || item.dispute_type || '其他纠纷'
    }));
  }
};

onShow(() => {
  loadGlobalArbitrationList();
});

const pendingCount = computed(() => arbitrationList.value.filter(i => i.status === 'pending').length);
const urgentCount = computed(() => arbitrationList.value.filter(i => i.status === 'urgent').length);
const resolvedCount = computed(() => arbitrationList.value.filter(i => i.status === 'resolved').length);

const getStatusText = (status) => {
  const map = { pending: '待处理', urgent: '紧急', resolved: '已裁决' };
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

const submitVerdict = () => {
  if (!verdictForm.value.party) {
    uni.showToast({ title: '请选择责任方', icon: 'none' });
    return;
  }
  if (!verdictForm.value.opinion.trim()) {
    uni.showToast({ title: '请输入仲裁意见', icon: 'none' });
    return;
  }
  const target = arbitrationList.value.find(i => i.id === currentItem.value.id);
  if (target) {
    target.status = 'resolved';
    target.verdict_party = partyLabels[verdictForm.value.party];
    target.verdict_opinion = verdictForm.value.opinion;
    target.verdict_time = new Date().toLocaleString('zh-CN').replace(/\//g, '-');
    target.result = target.verdict_opinion;
  }

  const globalList = arbitrationList.value.map(item => ({ ...item }));
  uni.setStorageSync('global_arbitration_list', globalList);

  // Write verdict result back to the related order in global_order_list
  if (target && target.order_no) {
    const orderList = uni.getStorageSync('global_order_list') || [];
    const orderIdx = orderList.findIndex(o => o.order_no === target.order_no || String(o.id) === target.order_no);
    if (orderIdx !== -1) {
      orderList[orderIdx].arbitration_verdict = partyLabels[verdictForm.value.party];
      orderList[orderIdx].arbitration_opinion = verdictForm.value.opinion;
      orderList[orderIdx].arbitration_time = target.verdict_time;
      orderList[orderIdx].status = '仲裁完结';
      orderList[orderIdx].timeline = orderList[orderIdx].timeline || [];
      orderList[orderIdx].timeline.unshift({
        time: target.verdict_time,
        desc: '平台仲裁完成，责任方：' + partyLabels[verdictForm.value.party]
      });
      uni.setStorageSync('global_order_list', orderList);
    }
  }

  showPanel.value = false;
  uni.showToast({ title: '裁决已生效', icon: 'success' });
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
.status-urgent { background: #FFEBEE; color: #e74c3c; }
.status-resolved { background: #e8f5e9; color: #2E7D32; }

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
