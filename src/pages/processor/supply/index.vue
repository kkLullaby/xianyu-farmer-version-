<template>
  <view class="container">
    <view class="header">
      <text class="title">🌾 货源供应</text>
      <text class="desc">对接农户与回收商货源，查看供应信息并进行采购</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>全部货源</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>农户直供</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text>回收商转供</text>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-container">
      <view v-if="loading" class="empty-state">
        <text class="empty-text">货源数据加载中…</text>
      </view>

      <view v-else-if="fetchError" class="empty-state">
        <text class="empty-text">{{ fetchError }}</text>
      </view>

      <template v-else>
        <view class="supply-card" v-for="item in filteredList" :key="item.id">
          <view class="card-header">
            <text class="supply-type" :class="'type-' + item.type">{{ item.type === 'farmer' ? '农户' : '回收商' }}</text>
            <text class="variety">{{ item.variety }}</text>
          </view>
          
          <view class="card-body">
            <view class="info-row">
              <text class="label">供应商：</text>
              <text class="value">{{ item.provider }}</text>
            </view>
            <view class="info-row">
              <text class="label">可供重量：</text>
              <text class="value highlight">{{ item.weight }} 斤</text>
            </view>
            <view class="info-row">
              <text class="label">期望单价：</text>
              <text class="value price">{{ item.price > 0 ? `¥ ${item.price}/斤` : '待协商' }}</text>
            </view>
            <view class="info-row">
              <text class="label">所在地：</text>
              <text class="value address">{{ fuzzLocation(item.location) }}</text>
            </view>
          </view>

          <view class="card-footer">
            <text class="time">发布于 {{ item.date }}</text>
            <view class="actions">
              <button class="btn btn-primary" size="mini" @click="handlePrimaryAction(item)">
                {{ item.type === 'farmer' ? '发起意向' : '电话联系' }}
              </button>
            </view>
          </view>
        </view>

        <view v-if="filteredList.length === 0" class="empty-state">
          <text class="empty-text">暂无符合条件的货源</text>
        </view>
      </template>
    </view>

    <view class="popup-mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">发起采购意向</text>
        <text class="popup-sub">向 {{ currentTarget.provider }} 发起意向报价</text>
      </view>
      <view class="popup-form">
        <view class="form-item">
          <text class="form-label">意向单价（元/斤）</text>
          <input class="form-input" type="digit" v-model="intentionForm.price" placeholder="请输入你的报价" />
        </view>
        <view class="form-item">
          <text class="form-label">预计采购重量（斤）</text>
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
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const fuzzLocation = (loc) => loc ? loc.replace(/([\u9547\u8857\u9053\u5c71\u4e61].*)/u, '（具体地址经平台保护）') : '地址保护中';

const showPopup = ref(false);
const loading = ref(false);
const fetchError = ref('');
const currentTarget = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });

const openIntentionPopup = (item) => {
  if (item.type !== 'farmer') {
    return callPhone(item.phone);
  }
  currentTarget.value = item;
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};
const closePopup = () => { showPopup.value = false; };
const onDateChange = (e) => { intentionForm.value.date = e.detail.value; };
const submitIntention = async () => {
  if (currentTarget.value.type !== 'farmer') {
    uni.showToast({ title: '仅支持对农户货源发起线上意向', icon: 'none' });
    return;
  }
  if (!intentionForm.value.price || !intentionForm.value.weight) {
    return uni.showToast({ title: '请填写单价和重量', icon: 'none' });
  }
  try {
    await request.post('/api/intentions', {
      target_type: 'farmer_report',
      target_id: currentTarget.value.rawId,
      target_no: currentTarget.value.targetNo || '',
      target_name: `${currentTarget.value.provider || '农户'}货源`,
      estimated_weight: Number(intentionForm.value.weight),
      expected_date: intentionForm.value.date || null,
      notes: `处理商报价：${Number(intentionForm.value.price)} 元/斤`
    });
    closePopup();
    uni.showToast({ title: '意向已发送', icon: 'success' });
  } catch (err) {
    // request.js 已统一提示
  }
};

const currentTab = ref(0);
const supplyList = ref([]);

const gradeLabels = {
  grade1: '一级品',
  grade2: '二级品',
  grade3: '三级品',
  offgrade: '等外级',
  mixed: '混合级'
};

const normalizeFarmerSupply = (item = {}) => ({
  id: `farmer-${item.id}`,
  rawId: item.id,
  targetNo: item.report_no || '',
  type: 'farmer',
  provider: item.farmer_name || '农户',
  variety: item.citrus_variety || '柑橘果肉',
  weight: Number(item.weight_kg || 0),
  price: Number(item.price_per_kg || 0),
  location: item.location_address || '',
  phone: item.contact_phone || item.farmer_phone || '',
  date: item.created_at || ''
});

const normalizeRecyclerSupply = (item = {}) => ({
  id: `merchant-${item.id}`,
  rawId: item.id,
  targetNo: item.supply_no || '',
  type: 'merchant',
  provider: item.recycler_name || '回收商',
  variety: `${gradeLabels[item.grade] || item.grade || '混合级'}供应`,
  weight: Number(item.stock_weight || 0),
  price: Number(item.price_per_kg || 0),
  location: item.address || '',
  phone: item.contact_phone || item.recycler_phone || '',
  date: item.created_at || ''
});

const loadSupplies = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const [farmerResult, recyclerResult] = await Promise.allSettled([
      request.get('/api/farmer-supplies?sort_by=time'),
      request.get('/api/recycler-supplies')
    ]);

    const farmerRows = farmerResult.status === 'fulfilled' && Array.isArray(farmerResult.value)
      ? farmerResult.value
      : [];
    const recyclerRows = recyclerResult.status === 'fulfilled' && Array.isArray(recyclerResult.value)
      ? recyclerResult.value
      : [];

    supplyList.value = [
      ...farmerRows.map(normalizeFarmerSupply),
      ...recyclerRows.map(normalizeRecyclerSupply)
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (farmerResult.status === 'rejected' && recyclerResult.status === 'rejected') {
      throw new Error('农户与回收商货源均加载失败');
    }
  } catch (err) {
    supplyList.value = [];
    fetchError.value = err?.message || '货源列表加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'processor')) {
      uni.showToast({ title: '仅处理商可访问该页面', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadSupplies();
  } catch (err) {
    fetchError.value = err?.message || '身份校验失败';
  }
});

const callPhone = (phone) => {
  const normalized = String(phone || '').replace(/[^\d+]/g, '');
  if (!normalized) {
    uni.showToast({ title: '暂无联系方式', icon: 'none' });
    return;
  }
  uni.makePhoneCall({
    phoneNumber: normalized,
    fail: () => uni.showToast({ title: '拨号失败', icon: 'none' })
  });
};

const handlePrimaryAction = (item) => {
  if (item.type === 'farmer') {
    openIntentionPopup(item);
    return;
  }
  callPhone(item.phone);
};

const filteredList = computed(() => {
  if (currentTab.value === 0) return supplyList.value;
  const type = currentTab.value === 1 ? 'farmer' : 'merchant';
  return supplyList.value.filter(item => item.type === type);
});
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
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  padding: 10rpx 0;
}

.filter-item.active {
  color: #1565C0;
  font-weight: bold;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.supply-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.supply-type {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  color: white;
}

.type-farmer { background-color: #2E7D32; }
.type-merchant { background-color: #EF6C00; }

.variety {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
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
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.actions {
  display: flex;
  gap: 16rpx;
}

.btn-primary {
  background: #1565C0;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

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
  background: #1565C0;
  color: #fff;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
