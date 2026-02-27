<template>
  <view class="container">
    <view class="header">
      <text class="title">⚖️ 仲裁中心</text>
      <text class="desc">处理商端 · 提交纠纷申请，跟踪处理进度</text>
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
          <picker mode="selector" :range="disputeTypes" @change="onTypeChange">
            <view class="picker-view">
              <text>{{ form.dispute_type || '请选择纠纷类型' }}</text>
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
            <text class="info-value highlight-blue">{{ item.dispute_type }}</text>
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
import { onShow } from '@dcloudio/uni-app';

const showForm = ref(false);
const disputeTypes = ['质量不符', '重量争议', '合同违约', '货款纠纷', '原料污染', '其他'];

const form = ref({
  order_no: '',
  dispute_type: '',
  description: ''
});

const statusLabel = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭'
};

const arbitrationList = ref([
  {
    id: 'ARB20260225001',
    order_no: 'ORD20260222015',
    dispute_type: '质量不符',
    description: '收到批次柑橘含水量超标，不符合加工要求，已拍照存证，要求退货或赔偿。',
    status: 'processing',
    result: null,
    created_at: '2026-02-25 08:45'
  },
  {
    id: 'ARB20260218002',
    order_no: 'ORD20260212007',
    dispute_type: '合同违约',
    description: '供应商未能按约定时间交货，导致生产线停工两日，要求追偿违约损失。',
    status: 'pending',
    result: null,
    created_at: '2026-02-18 13:20'
  },
  {
    id: 'ARB20260105003',
    order_no: 'ORD20260101002',
    dispute_type: '原料污染',
    description: '原料中混入异物，疑似农药残留超标，要求全批次检测并赔偿损失。',
    status: 'resolved',
    result: '经检测机构检验，农药残留在国标范围内，异物属于自然夹杂，按合同条款赔偿少量损耗。',
    created_at: '2026-01-05 10:00'
  }
]);

const loadArbitrationList = () => {
  const globalList = uni.getStorageSync('global_arbitration_list') || [];
  if (!Array.isArray(globalList) || globalList.length === 0) return;
  arbitrationList.value = globalList.filter(item => item.role === '处理商');
};

onShow(() => {
  loadArbitrationList();
});

const toggleForm = () => {
  showForm.value = !showForm.value;
  if (!showForm.value) {
    form.value = { order_no: '', dispute_type: '', description: '' };
  }
};

const onTypeChange = (e) => {
  form.value.dispute_type = disputeTypes[e.detail.value];
};

const submitForm = () => {
  if (!form.value.order_no || !form.value.dispute_type || !form.value.description) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  const newItem = {
    id: 'ARB' + Date.now(),
    order_no: form.value.order_no,
    applicant: '处理商用户',
    role: '处理商',
    reason: form.value.dispute_type,
    dispute_type: form.value.dispute_type,
    description: form.value.description,
    status: 'pending',
    result: null,
    verdict_party: null,
    verdict_opinion: null,
    verdict_time: null,
    created_at: new Date().toLocaleString('zh-CN').replace(/\//g, '-')
  };

  const globalList = uni.getStorageSync('global_arbitration_list') || [];
  globalList.unshift(newItem);
  uni.setStorageSync('global_arbitration_list', globalList);

  arbitrationList.value.unshift(newItem);
  uni.showToast({ title: '仲裁申请已提交', icon: 'success' });
  toggleForm();
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
  background-color: #1565C0;
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
  box-shadow: 0 8rpx 32rpx rgba(21,101,192,0.10);
  border-left: 8rpx solid #1565C0;
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
  background: #1565C0;
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
  border-left: 8rpx solid #1565C0;
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
.status-processing { background: #e3f2fd; color: #1565C0; }
.status-resolved { background: #e8f5e9; color: #2E7D32; }
.status-closed { background: #f5f5f5; color: #999; }

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

.highlight-blue {
  color: #1565C0;
  font-weight: bold;
}

.result-text {
  color: #2E7D32;
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
