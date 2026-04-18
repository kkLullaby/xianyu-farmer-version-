<template>
  <view class="container">
    <view class="header">
      <text class="title">🌾 处理商需求大厅</text>
      <text class="desc">查看处理商发布的柑橘果肉收购需求</text>
    </view>

    <view class="filter-bar">
      <view class="filter-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>全部需求</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>提供运输</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text>高价优先</text>
      </view>
    </view>

    <view class="list-container">
      <view class="demand-card" v-for="(item, index) in filteredList" :key="item.id || index">
        <view class="card-header">
          <text class="buyer-name">{{ fuzzName(item.buyer_name) }}</text>
          <text class="deadline-tag">截止: {{ item.deadline }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">需求品种：</text>
            <text class="value">{{ item.variety }}</text>
          </view>
          <view class="info-row">
            <text class="label">需求重量：</text>
            <text class="value highlight">{{ item.weight }} 斤</text>
          </view>
          <view class="info-row">
            <text class="label">收购单价：</text>
            <text class="value price">{{ item.price > 0 ? `¥ ${item.price}/斤` : '待协商' }}</text>
          </view>
          <view class="info-row">
            <text class="label">运输方式：</text>
            <text class="value tag-transport" v-if="item.has_transport">商家自提</text>
            <text class="value tag-self" v-else>农户送货</text>
          </view>
          <view class="info-row description">
            <text class="label">详细说明：</text>
            <text class="value">{{ item.description }}</text>
          </view>
        </view>

        <view class="card-footer">
          <view class="actions">
            <button class="btn btn-intention" size="mini" @click="openIntentionPopup(item)">📨 发起意向</button>
          </view>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty-state">
        <text class="empty-text">暂无符合条件的收购需求</text>
      </view>
    </view>

    <view class="mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">📨 发起报价意向</text>
        <text class="popup-sub">对象：{{ popupItem.buyer_name ? fuzzName(popupItem.buyer_name) : '' }}</text>
      </view>
      <view class="popup-body">
        <view class="popup-row">
          <text class="popup-label">我的报价（元/吨）</text>
          <input class="popup-input" type="digit" v-model="intentionForm.price" placeholder="请输入您的报价" />
        </view>
        <view class="popup-row">
          <text class="popup-label">预估重量（吨）</text>
          <input class="popup-input" type="digit" v-model="intentionForm.weight" placeholder="请输入预估重量" />
        </view>
        <view class="popup-row">
          <text class="popup-label">期望交货日期</text>
          <input class="popup-input" type="text" v-model="intentionForm.date" placeholder="例：2026-03-15" />
        </view>
      </view>
      <view class="popup-actions">
        <button class="btn-pop-cancel" @click="closePopup">取消</button>
        <button class="btn-pop-confirm" @click="submitIntention">发送意向</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';

const currentTab = ref(0);
const showPopup = ref(false);
const popupItem = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });

const fuzzName = (name) => {
  if (!name) return '***处理厂';
  return name.charAt(0) + '氏处理厂';
};

const demandList = ref([]);

const citrusTypeLabels = {
  mandarin: '柑橘',
  orange: '橙子',
  pomelo: '柚子',
  tangerine: '橘子',
  any: '不限种类',
};

const normalizeDemand = (item = {}) => ({
  id: item.id,
  request_no: item.request_no || '',
  buyer_name: item.processor_name || '处理商',
  variety: citrusTypeLabels[item.citrus_type] || item.citrus_type || '柑肉原料',
  weight: Number(item.weight_kg || 0),
  price: Number(item.price || 0),
  has_transport: Number(item.has_transport || 0) === 1,
  deadline: item.valid_until || '长期有效',
  description: item.notes || '',
});

const loadDemands = async () => {
  try {
    const rows = await request.get('/api/processor-requests?for_farmers=true');
    demandList.value = Array.isArray(rows) ? rows.map(normalizeDemand) : [];
  } catch (err) {
    demandList.value = [];
  }
};

onShow(loadDemands);

const filteredList = computed(() => {
  let list = [...demandList.value];
  if (currentTab.value === 1) {
    list = list.filter(item => item.has_transport);
  } else if (currentTab.value === 2) {
    list.sort((a, b) => b.price - a.price);
  }
  return list;
});

const openIntentionPopup = (item) => {
  popupItem.value = item;
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};

const closePopup = () => {
  showPopup.value = false;
};

const submitIntention = async () => {
  if (!intentionForm.value.price) {
    uni.showToast({ title: '请填写报价', icon: 'none' });
    return;
  }
  if (!intentionForm.value.weight) {
    uni.showToast({ title: '请填写预估重量', icon: 'none' });
    return;
  }
  try {
    await request.post('/api/intentions', {
      target_type: 'processor_request',
      target_id: popupItem.value.id,
      target_no: popupItem.value.request_no || '',
      target_name: popupItem.value.buyer_name || '处理商求购',
      estimated_weight: Number(intentionForm.value.weight),
      expected_date: intentionForm.value.date || null,
      notes: `农户报价：${intentionForm.value.price} 元/斤`,
    });
    showPopup.value = false;
    uni.showToast({ title: '意向已发送', icon: 'success' });
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

.filter-bar {
  display: flex;
  background: white;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  padding: 10rpx 0;
  position: relative;
}

.filter-item.active {
  color: #2E7D32;
  font-weight: bold;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.demand-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #2E7D32;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.buyer-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.deadline-tag {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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
  color: #2E7D32;
  font-weight: bold;
}

.price {
  color: #e74c3c;
  font-weight: bold;
  font-size: 30rpx;
}

.tag-transport {
  color: #2E7D32;
  background: #E8F5E9;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.tag-self {
  color: #EF6C00;
  background: #FFF3E0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.description .value {
  color: #666;
  font-size: 26rpx;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
  margin-top: 20rpx;
}

.actions {
  display: flex;
  gap: 20rpx;
}

.btn {
  margin: 0;
  font-size: 26rpx;
  border-radius: 30rpx;
  padding: 0 30rpx;
  line-height: 60rpx;
}

.btn-intention {
  background: linear-gradient(135deg, #2E7D32, #43A047);
  color: white;
  border: none;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 100;
}

.intention-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx 60rpx;
  z-index: 101;
}

.popup-header {
  margin-bottom: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 24rpx;
}

.popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}

.popup-sub {
  font-size: 26rpx;
  color: #999;
}

.popup-body {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 40rpx;
}

.popup-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.popup-label {
  font-size: 28rpx;
  color: #555;
}

.popup-input {
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #333;
}

.popup-actions {
  display: flex;
  gap: 24rpx;
}

.btn-pop-cancel {
  flex: 1;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 20rpx;
  font-size: 28rpx;
  line-height: 80rpx;
  height: 80rpx;
}

.btn-pop-confirm {
  flex: 2;
  background: linear-gradient(135deg, #2E7D32, #43A047);
  color: white;
  border: none;
  border-radius: 20rpx;
  font-size: 28rpx;
  line-height: 80rpx;
  height: 80rpx;
}
</style>
