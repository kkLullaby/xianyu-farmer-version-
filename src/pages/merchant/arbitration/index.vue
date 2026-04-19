<template>
  <view class="container">
    <view class="header">
      <text class="title">⚖️ 仲裁中心</text>
      <text class="desc">回收商端 · 提交纠纷申请，跟踪处理进度</text>
    </view>

    <view class="action-bar">
      <button class="btn-submit" @click="toggleForm">
        {{ showForm ? '✕ 收起表单' : '📝 发起仲裁申请' }}
      </button>
    </view>

    <view class="form-panel" v-if="showForm">
      <view class="form-title">
        <text class="form-title-text">填写仲裁申请</text>
      </view>
      <view class="form-item">
        <text class="label">相关订单号</text>
        <input class="input" v-model="form.order_no" placeholder="请输入订单编号" />
      </view>
      <view class="form-item">
        <text class="label">纠纷类型</text>
        <view class="picker-box">
          <picker mode="selector" :range="disputeLabels" @change="onTypeChange">
            <view class="picker-view">
              <text>{{ form.reason_label || '请选择纠纷类型' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
      <view class="form-item">
        <text class="label">问题描述</text>
        <textarea class="textarea" v-model="form.description" placeholder="请详细描述争议情况..." />
      </view>
      <view class="form-actions">
        <button class="btn-cancel" @click="toggleForm">取消</button>
        <button class="btn-confirm" @click="submitForm">确认提交</button>
      </view>
    </view>

    <view class="section-title-row">
      <text class="section-label">历史仲裁记录</text>
      <text class="section-count">共 {{ arbitrationList.length }} 条</text>
    </view>

    <view class="list-container">
      <view class="arb-card" v-for="item in arbitrationList" :key="item.id">
        <view class="card-top">
          <text class="arb-no">{{ item.id }}</text>
          <text class="status-badge" :class="'status-' + item.status">{{ statusLabel[item.status] }}</text>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="info-label">相关订单：</text>
            <text class="info-value">{{ item.order_no }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">纠纷类型：</text>
            <text class="info-value highlight-orange">{{ item.reason_label }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">描述：</text>
            <text class="info-value">{{ item.description }}</text>
          </view>
          <view class="info-row" v-if="item.result">
            <text class="info-label">裁决结果：</text>
            <text class="info-value result-text">{{ item.result }}</text>
          </view>
        </view>
        <view class="card-footer">
          <text class="time-text">申请时间：{{ item.created_at }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="arbitrationList.length === 0">
        <text class="empty-text">暂无仲裁记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow, onLoad } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const showForm = ref(false);
const disputeOptions = [
  { label: '重量争议', value: 'quantity' },
  { label: '质量不符', value: 'quality' },
  { label: '货款纠纷', value: 'payment' },
  { label: '运输损耗', value: 'delivery' },
  { label: '合同违约', value: 'breach' },
  { label: '其他', value: 'other' }
];
const disputeLabels = disputeOptions.map((item) => item.label);

const reasonLabelMap = disputeOptions.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const form = ref({
  order_no: '',
  reason: '',
  reason_label: '',
  description: ''
});

onLoad((options) => {
  const orderNo = options?.order_no ? decodeURIComponent(options.order_no) : '';
  if (orderNo) {
    form.value.order_no = orderNo;
    showForm.value = true;
  }
});

const statusLabel = {
  pending: '待处理',
  investigating: '调查中',
  resolved: '已裁决',
  rejected: '已驳回'
};

const arbitrationList = ref([]);

const formatDate = (value) => {
  if (!value) return '--';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const normalizeArbitration = (row = {}) => ({
  id: row.arbitration_no || `ARB-${row.id}`,
  order_no: row.order_no || '--',
  reason_label: reasonLabelMap[row.reason] || row.reason || '其他',
  description: row.description || '',
  status: row.status || 'pending',
  result: row.decision || '',
  created_at: formatDate(row.created_at)
});

const loadArbitrationList = async () => {
  try {
    const rows = await request.get('/api/arbitration-requests?status=all');
    arbitrationList.value = Array.isArray(rows) ? rows.map(normalizeArbitration) : [];
  } catch (err) {
    arbitrationList.value = [];
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'merchant', false)) {
      uni.showToast({ title: '仅回收商可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadArbitrationList();
  } catch (err) {
    arbitrationList.value = [];
  }
});

const toggleForm = () => {
  showForm.value = !showForm.value;
  if (!showForm.value) {
    form.value = { order_no: '', reason: '', reason_label: '', description: '' };
  }
};

const onTypeChange = (e) => {
  const option = disputeOptions[e.detail.value];
  form.value.reason = option.value;
  form.value.reason_label = option.label;
};

const submitForm = async () => {
  if (!form.value.order_no || !form.value.reason || !form.value.description) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }

  try {
    const order = await request.get(`/api/orders/${encodeURIComponent(form.value.order_no.trim())}`);
    if (!order?.id) {
      throw new Error('关联订单不存在');
    }

    await request.post('/api/arbitration-requests', {
      order_type: 'order',
      order_id: order.id,
      order_no: order.order_no || form.value.order_no.trim(),
      reason: form.value.reason,
      description: form.value.description.trim(),
      evidence_trade: ['移动端提交：交易凭证待补充'],
      evidence_material: ['移动端提交：货物凭证待补充'],
      evidence_payment: ['移动端提交：付款凭证待补充'],
      evidence_communication: [],
      evidence_other: []
    });

    uni.showToast({ title: '仲裁申请已提交', icon: 'success' });
    toggleForm();
    await loadArbitrationList();
  } catch (err) {
    // request.js 已统一提示
  }
};
</script>

<style scoped>
.container {
  padding: 40rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header {
  margin-bottom: 40rpx;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 10rpx;
}

.desc {
  font-size: 26rpx;
  color: #666;
}

.action-bar {
  margin-bottom: 30rpx;
}

.btn-submit {
  background-color: #EF6C00;
  color: white;
  border: none;
  border-radius: 16rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  font-weight: bold;
  width: 100%;
  margin: 0;
}

.form-panel {
  background: white;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(239,108,0,0.10);
  border-left: 8rpx solid #EF6C00;
}

.form-title {
  margin-bottom: 30rpx;
}

.form-title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
}

.form-item {
  margin-bottom: 28rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.input {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
}

.picker-box {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
}

.picker-view {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  color: #333;
}

.arrow {
  color: #999;
  font-size: 24rpx;
}

.textarea {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  height: 180rpx;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 10rpx;
}

.btn-cancel {
  flex: 1;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  margin: 0;
}

.btn-confirm {
  flex: 2;
  background: #EF6C00;
  color: white;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin: 0;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-label {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
}

.section-count {
  font-size: 26rpx;
  color: #999;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.arb-card {
  background: white;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #EF6C00;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.arb-no {
  font-size: 26rpx;
  color: #999;
}

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: 30rpx;
}

.status-pending { background: #fff3e0; color: #EF6C00; }
.status-investigating { background: #e3f2fd; color: #1565C0; }
.status-resolved { background: #e8f5e9; color: #2E7D32; }
.status-rejected { background: #ffebee; color: #c62828; }

.card-body {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 12rpx;
}

.info-label {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
  min-width: 160rpx;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.highlight-orange {
  color: #EF6C00;
  font-weight: bold;
}

.result-text {
  color: #1565C0;
}

.card-footer {
  border-top: 2rpx solid #f0f0f0;
  padding-top: 16rpx;
}

.time-text {
  font-size: 24rpx;
  color: #bbb;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #bbb;
}
</style>
