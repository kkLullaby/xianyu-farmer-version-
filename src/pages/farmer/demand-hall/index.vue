<template>
  <view class="container">
    <view class="header-section">
      <text class="page-title">供需大厅</text>
      <text class="page-desc">查看回收商与处理商的求购需求，一键对接</text>
    </view>

    <!-- 顶部 Tab 栏 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">回收商求购</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">处理商求购</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">需求加载中…</text>
    </view>

    <view v-else-if="fetchError" class="state-card error-card">
      <text class="state-text">{{ fetchError }}</text>
    </view>

    <!-- 内容区域 A：回收商求购 (Tab 0) -->
    <view class="content-area" v-else-if="currentTab === 0">
      <view class="demands-list" v-if="merchantList.length > 0">
        <view class="glass-card border-recycler" v-for="item in merchantList" :key="item.id">
          <view class="card-header">
            <view class="header-left">
              <view class="title-row">
                <text class="source-label bg-recycler">🚛 回收商</text>
                <text class="tag tag-recycler">
                  {{ item.goods_type }}
                </text>
              </view>
              <text class="request-no">求购编号：{{ item.request_no }}</text>
            </view>
            <view class="header-right">
              <text class="valid-text" :class="{ 'long-term': item.deadline === '长期有效' }">
                {{ item.deadline ? `有效期至 ${item.deadline}` : '长期有效' }}
              </text>
            </view>
          </view>

          <view class="contact-box">
            <view class="contact-item">
              <text class="label">联系人：</text>
              <text class="value">{{ item.contact_name }}</text>
            </view>
            <view class="contact-item">
              <text class="label">联系电话：</text>
              <text class="value">{{ fuzzPhone(item.contact_phone) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">收货信息：</text>
              <text class="value">{{ item.address }}</text>
            </view>
            <view class="contact-item">
              <text class="label">需求量：</text>
              <text class="value">{{ formatWeightText(item.weight, item.unit) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">单价：</text>
              <text class="value">{{ formatPriceText(item.price, item.unit) }}</text>
            </view>
          </view>

          <view class="price-box price-box-recycler">
            <view class="price-row">
              <text class="price-label">买方出价：</text>
              <text class="price-original">{{ formatPriceText(item.price, item.unit) }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">平台服务费：</text>
              <text class="price-fee">{{ item.commissionRate ? item.commissionRate + '%' : '待平台确认' }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">预估到手：</text>
              <text class="price-final">{{ calcFarmerPrice(item) }}</text>
            </view>
            <text class="price-tip">* 价格字段缺失时以双方沟通确认为准</text>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-recycler" @click="openIntentionPopup(item)">
              💬 发起意向
            </button>
          </view>
        </view>
      </view>
      <view v-else class="state-card">
        <text class="state-text">当前暂无回收商求购</text>
      </view>
    </view>

    <!-- 内容区域 B：处理商求购 -->
    <view class="content-area" v-else>
      <view class="demands-list" v-if="processorList.length > 0">
        <view class="glass-card border-processor" v-for="item in processorList" :key="item.id">
          <view class="card-header">
            <view class="header-left">
              <view class="title-row">
                <text class="source-label bg-processor">🏭 处理商</text>
                <text class="tag tag-processor">
                  {{ item.goods_type }}
                </text>
              </view>
              <text class="request-no">求购编号：{{ item.request_no }}</text>
            </view>
            <view class="header-right">
              <text class="valid-text" :class="{ 'long-term': item.deadline === '长期有效' }">
                {{ item.deadline ? `有效期至 ${item.deadline}` : '长期有效' }}
              </text>
            </view>
          </view>

          <view class="info-box">
            <view class="info-grid">
              <view class="info-item">
                <text class="label">需求量：</text>
                <text class="highlight-processor">{{ formatWeightText(item.weight, item.unit) }}</text>
              </view>
              <view class="info-item">
                <text class="label">单价：</text>
                <text class="highlight-processor">{{ formatPriceText(item.price, item.unit) }}</text>
              </view>
              <view class="info-item full-width">
                <text class="label">📍 收货地址：</text>
                <text class="value">{{ fuzzAddress(item.address) }}</text>
              </view>
            </view>
          </view>

          <view class="price-box price-box-processor">
            <view class="price-row">
              <text class="price-label">买方出价：</text>
              <text class="price-original">{{ formatPriceText(item.price, item.unit) }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">平台服务费：</text>
              <text class="price-fee">{{ item.commissionRate ? item.commissionRate + '%' : '待平台确认' }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">预估到手：</text>
              <text class="price-final-purple">{{ calcFarmerPrice(item) }}</text>
            </view>
            <text class="price-tip">* 价格字段缺失时以双方沟通确认为准</text>
          </view>

          <view class="contact-box">
            <view class="contact-item">
              <text class="label">联系人：</text>
              <text class="value">{{ item.contact_name }}</text>
            </view>
            <view class="contact-item">
              <text class="label">联系电话：</text>
              <text class="value">{{ fuzzPhone(item.contact_phone) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">收货地址：</text>
              <text class="value">{{ fuzzAddress(item.address) }}</text>
            </view>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-processor" @click="openIntentionPopup(item)">
              💬 发起意向
            </button>
          </view>
        </view>
      </view>
      <view v-else class="state-card">
        <text class="state-text">当前暂无处理商求购</text>
      </view>
    </view>

    <view class="popup-mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">发起交易意向</text>
        <text class="popup-sub">向 {{ currentTarget.name }} 协商供货意向</text>
      </view>
      <view class="popup-form">
        <view class="form-item">
          <text class="form-label">意向单价（元/{{ currentTarget.unit || '斤' }}）</text>
          <input class="form-input" type="digit" v-model="intentionForm.price" placeholder="请输入你的报价" />
        </view>
        <view class="form-item">
          <text class="form-label">预计重量（{{ currentTarget.unit || '斤' }}）</text>
          <input class="form-input" type="number" v-model="intentionForm.weight" placeholder="请输入预计重量" />
        </view>
        <view class="form-item">
          <text class="form-label">期望交接日期</text>
          <picker mode="date" :value="intentionForm.date" @change="onDateChange">
            <view class="picker-view">
              <text v-if="intentionForm.date">{{ intentionForm.date }}</text>
              <text v-else class="picker-placeholder">请选择日期</text>
            </view>
          </picker>
        </view>
      </view>
      <view class="popup-actions">
        <button class="pop-cancel" @click="closePopup">取消</button>
        <button class="pop-confirm" @click="submitIntention">提交意向</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const currentTab = ref(0);
const loading = ref(false);
const fetchError = ref('');
const merchantList = ref([]);
const processorList = ref([]);

const gradeLabelMap = {
  grade1: '一级品',
  grade2: '二级品',
  grade3: '三级品',
  offgrade: '等外级',
  any: '不限品级'
};

const citrusLabelMap = {
  mandarin: '柑橘',
  orange: '橙子',
  pomelo: '柚子',
  tangerine: '橘子',
  any: '不限种类'
};

const fuzzPhone = (phone) => String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
const fuzzAddress = (addr) => {
  if (!addr) return '（地址保护中）';
  const parts = addr.split(/[市县区]/u);
  return parts.length > 1 ? addr.substring(0, addr.search(/[县区市]/u) + 2) + '（详细地址经平台保护）' : addr.substring(0, 6) + '…（保护）';
};

const formatWeightText = (weight, unit = '斤') => {
  const amount = Number(weight || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '待沟通';
  return `${amount} ${unit}`;
};

const formatPriceText = (price, unit = '斤') => {
  const amount = Number(price || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '待沟通';
  return `${amount.toFixed(2)} 元/${unit}`;
};

const calcFarmerPrice = (item) => {
  const price = Number(item.price || 0);
  if (!Number.isFinite(price) || price <= 0) return '待沟通';
  if (item.commissionRate) {
    return `${(price * (1 - item.commissionRate / 100)).toFixed(2)} 元/${item.unit || '斤'}`;
  }
  if (item.commissionFee) {
    return `${(price - item.commissionFee).toFixed(2)} 元/${item.unit || '斤'}`;
  }
  return `${price.toFixed(2)} 元/${item.unit || '斤'}`;
};

const normalizeRecyclerRequest = (row = {}) => ({
  id: `recycler-${row.id}`,
  raw_id: row.id,
  target_type: 'recycler_request',
  request_no: row.request_no || `RR-${row.id}`,
  goods_type: gradeLabelMap[row.grade] || row.grade || '回收求购',
  deadline: row.valid_until || '长期有效',
  contact_name: row.contact_name || row.recycler_name || '回收商',
  contact_phone: row.contact_phone || row.recycler_phone || '',
  address: row.notes ? '详见需求说明' : '以需求方沟通为准',
  weight: null,
  unit: '斤',
  price: null,
  commissionRate: 0,
  notes: row.notes || ''
});

const normalizeProcessorRequest = (row = {}) => ({
  id: `processor-${row.id}`,
  raw_id: row.id,
  target_type: 'processor_request',
  request_no: row.request_no || `PR-${row.id}`,
  goods_type: citrusLabelMap[row.citrus_type] || row.citrus_type || '处理商求购',
  deadline: row.valid_until || '长期有效',
  contact_name: row.contact_name || row.processor_name || '处理商',
  contact_phone: row.contact_phone || row.processor_phone || '',
  address: row.location_address || '以需求方沟通为准',
  weight: Number(row.weight_kg || 0),
  unit: '斤',
  price: null,
  commissionRate: 0,
  notes: row.notes || ''
});

const loadDemands = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const [recyclerResult, processorResult] = await Promise.allSettled([
      request.get('/api/purchase-requests'),
      request.get('/api/processor-requests?for_farmers=true')
    ]);

    merchantList.value = recyclerResult.status === 'fulfilled' && Array.isArray(recyclerResult.value)
      ? recyclerResult.value.map(normalizeRecyclerRequest)
      : [];

    processorList.value = processorResult.status === 'fulfilled' && Array.isArray(processorResult.value)
      ? processorResult.value.map(normalizeProcessorRequest)
      : [];

    if (recyclerResult.status === 'rejected' && processorResult.status === 'rejected') {
      throw new Error('需求列表加载失败');
    }
  } catch (err) {
    merchantList.value = [];
    processorList.value = [];
    fetchError.value = err?.message || '需求列表加载失败';
  } finally {
    loading.value = false;
  }
};

const showPopup = ref(false);
const currentTarget = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });

const openIntentionPopup = (item) => {
  currentTarget.value = { ...item, name: item.contact_name || item.request_no || item.id };
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};

const closePopup = () => { showPopup.value = false; };
const onDateChange = (e) => { intentionForm.value.date = e.detail.value; };

const submitIntention = async () => {
  if (!intentionForm.value.price || !intentionForm.value.weight) {
    return uni.showToast({ title: '请填写单价和重量', icon: 'none' });
  }

  const price = Number(intentionForm.value.price);
  const weight = Number(intentionForm.value.weight);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(weight) || weight <= 0) {
    return uni.showToast({ title: '请输入有效单价与重量', icon: 'none' });
  }

  try {
    await request.post('/api/intentions', {
      target_type: currentTarget.value.target_type,
      target_id: currentTarget.value.raw_id,
      target_no: currentTarget.value.request_no,
      target_name: `${currentTarget.value.name}求购`,
      estimated_weight: weight,
      expected_date: intentionForm.value.date || null,
      notes: `农户报价：${price.toFixed(2)} 元/${currentTarget.value.unit || '斤'}`
    });
    closePopup();
    uni.showToast({ title: '意向已发送，等待对方确认', icon: 'success' });
  } catch (err) {
    // request.js 已统一提示
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'farmer', false)) {
      uni.showToast({ title: '仅农户可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadDemands();
  } catch (err) {
    fetchError.value = err?.message || '身份校验失败';
  }
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header-section {
  margin-bottom: 20rpx;
}

.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
}

.page-desc {
  font-size: 26rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 40rpx;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-text {
  font-size: 30rpx;
  color: #666;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #2E7D32;
  font-weight: bold;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  background: #2E7D32;
  border-radius: 4rpx;
}

/* 列表样式 */
.demands-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.state-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.state-text {
  font-size: 26rpx;
  color: #666;
}

.error-card {
  border-left: 8rpx solid #e53935;
}

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24rpx;
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.05);
  padding: 40rpx;
}

.border-processor { border-left: 8rpx solid #9b59b6; }
.border-recycler { border-left: 8rpx solid #FF9800; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.title-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
  gap: 12rpx;
}

.source-label {
  color: white;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
}

.bg-processor { background-color: #9b59b6; }
.bg-recycler { background-color: #FF9800; }

.tag {
  padding: 4rpx 16rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.tag-processor { background-color: #f0e6ff; color: #9b59b6; }
.tag-recycler { background-color: #fff3e0; color: #FF9800; }

.request-no {
  color: #999;
  font-size: 24rpx;
  display: block;
}

.valid-text {
  font-size: 24rpx;
  color: #999;
}
.long-term { color: #4CAF50; }

.info-box {
  background-color: #f5f0ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.info-item {
  width: 45%;
  font-size: 26rpx;
  display: flex;
  align-items: center;
}
.info-item.full-width { width: 100%; }

.highlight-processor {
  color: #9b59b6;
  font-weight: bold;
}

.contact-box {
  background-color: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.contact-item {
  font-size: 26rpx;
  margin-bottom: 8rpx;
  display: flex;
}

.label { font-weight: bold; color: #333; }
.value { color: #333; margin-left: 10rpx; }

.notes { margin-bottom: 24rpx; }
.notes-text { color: #666; font-size: 26rpx; }

/* 价格盒子 */
.price-box {
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.price-box-recycler {
  background: #fff8f0;
  border-left: 6rpx solid #FF9800;
}

.price-box-processor {
  background: #f8f0ff;
  border-left: 6rpx solid #9b59b6;
}

.price-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.price-label { font-size: 26rpx; color: #666; }
.price-original { font-size: 26rpx; color: #333; }
.price-fee { font-size: 26rpx; color: #e74c3c; }

.price-final {
  font-size: 32rpx;
  color: #FF9800;
  font-weight: bold;
}

.price-final-purple {
  font-size: 32rpx;
  color: #9b59b6;
  font-weight: bold;
}

.price-tip {
  font-size: 22rpx;
  color: #bbb;
  display: block;
  margin-top: 4rpx;
}

.action-row { display: flex; justify-content: flex-end; }
.action-btn {
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 0 32rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: bold;
  margin: 0;
}
.btn-processor { background-color: #9b59b6; }
.btn-recycler { background-color: #FF9800; }

.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
}
.intention-popup {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  z-index: 101;
}
.popup-header { margin-bottom: 30rpx; }
.popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}
.popup-sub { font-size: 26rpx; color: #666; }
.popup-form { margin-bottom: 30rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  border: 2rpx solid #E0E0E0;
}
.picker-view {
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #E0E0E0;
}
.picker-placeholder { color: #999; }
.popup-actions { display: flex; gap: 20rpx; }
.pop-cancel {
  flex: 1;
  background: #F5F5F5;
  color: #666;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
}
.pop-confirm {
  flex: 2;
  background: #2E7D32;
  color: #fff;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
