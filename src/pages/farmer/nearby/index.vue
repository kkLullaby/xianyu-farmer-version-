<template>
  <view class="container">
    <view class="header">
      <text class="title">附近的柑橘果肉回收点</text>
      <text class="desc">展示已公开地址的回收商，并支持对在架求购单发起意向</text>
    </view>

    <map 
      class="map-area"
      :latitude="latitude" 
      :longitude="longitude" 
      :markers="markers"
      scale="12"
    ></map>

    <view class="list-container" v-if="!loading && !fetchError">
      <view class="recycler-card" v-for="(item, index) in publicAddresses" :key="item.id">
        <view class="info">
          <view class="name-row">
            <text class="name">{{ item.name }}</text>
            <text class="role-badge badge-merchant">
              回收商
            </text>
          </view>
          <text class="address">{{ item.address }}</text>
          <text class="address">距你约 {{ item.distance_text }}</text>
          <text class="phone-text">📞 {{ item.phone }}</text>
          <text class="demand-hint" :class="item.targetRequest ? 'demand-open' : 'demand-closed'">
            {{ item.targetRequest ? '该回收点有在架求购单，可直接发起意向' : '该回收点暂无在架求购单' }}
          </text>
        </view>
        <button
          class="intention-btn"
          size="mini"
          :disabled="!item.targetRequest"
          @click="openIntentionPopup(item)"
        >
          {{ item.targetRequest ? '发起意向' : '暂无可投递单' }}
        </button>
      </view>

      <view class="empty-state" v-if="publicAddresses.length === 0">
        <text class="empty-icon">📍</text>
        <text class="empty-text">暂无公开的回收点</text>
      </view>
    </view>

    <view class="empty-state" v-if="loading">
      <text class="empty-text">附近回收点加载中…</text>
    </view>

    <view class="empty-state" v-if="!loading && fetchError">
      <text class="empty-text">{{ fetchError }}</text>
    </view>

    <view class="popup-mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">发起交易意向</text>
        <text class="popup-sub">向 {{ currentTarget.name }} 报价（{{ currentTarget.targetRequest?.request_no || '求购单' }}）</text>
      </view>
      <view class="popup-form">
        <view class="form-item">
          <text class="form-label">意向单价（元/斤）</text>
          <input class="form-input" type="digit" v-model="intentionForm.price" placeholder="请输入意向单价" />
        </view>
        <view class="form-item">
          <text class="form-label">预计重量（斤）</text>
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

const latitude = ref(22.5431);
const longitude = ref(113.0350);
const markers = ref([]);
const publicAddresses = ref([]);
const showPopup = ref(false);
const currentTarget = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });
const loading = ref(false);
const fetchError = ref('');

const DEFAULT_LOCATION = { latitude: 22.5431, longitude: 113.0350 };

const fuzzPhone = (phone) => String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
const fuzzName = (name, role) => {
  const surname = name ? name.charAt(0) : '某';
  return role === 'merchant' ? surname + '氏回收站' : surname + '氏处理厂';
};

const resolveLocation = () => new Promise((resolve) => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      resolve({ latitude: res.latitude, longitude: res.longitude });
    },
    fail: () => {
      resolve(DEFAULT_LOCATION);
    }
  });
});

const buildMarker = (item, index) => ({
  id: index + 1,
  latitude: item.latitude,
  longitude: item.longitude,
  title: item.name,
  callout: {
    content: `${item.name}（回收商）`,
    display: 'ALWAYS',
    fontSize: 12,
    color: '#333333',
    bgColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E7D32'
  },
  iconPath: '',
  width: 30,
  height: 30
});

const loadNearbyRecyclers = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'farmer', false)) {
      uni.showToast({ title: '仅农户可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }

    const location = await resolveLocation();
    latitude.value = location.latitude;
    longitude.value = location.longitude;

    const [nearbyRows, purchaseRows] = await Promise.all([
      request.get(`/api/recyclers/nearby?lat=${location.latitude}&lng=${location.longitude}&limit=20`),
      request.get('/api/purchase-requests')
    ]);

    const requests = Array.isArray(purchaseRows) ? purchaseRows : [];
    const targetByRecyclerId = new Map();
    requests.forEach((row) => {
      const key = Number(row.recycler_id);
      if (!Number.isFinite(key) || targetByRecyclerId.has(key)) return;
      targetByRecyclerId.set(key, row);
    });

    const recyclerList = Array.isArray(nearbyRows) ? nearbyRows : [];
    publicAddresses.value = recyclerList.map((item) => {
      const recyclerId = Number(item.id);
      const targetRequest = targetByRecyclerId.get(recyclerId) || null;
      const distanceNumber = Number(item.distance);
      return {
        id: recyclerId,
        role: 'merchant',
        rawName: item.name || '回收商',
        name: fuzzName(item.name, 'merchant'),
        phone: fuzzPhone(item.phone),
        address: item.address || '地址待完善',
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        distance_text: Number.isFinite(distanceNumber) ? `${distanceNumber.toFixed(2)} km` : '--',
        targetRequest
      };
    }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    markers.value = publicAddresses.value.map((item, idx) => buildMarker(item, idx));

    if (publicAddresses.value.length > 0) {
      latitude.value = publicAddresses.value[0].latitude;
      longitude.value = publicAddresses.value[0].longitude;
    }
  } catch (err) {
    publicAddresses.value = [];
    markers.value = [];
    fetchError.value = err?.message || '附近回收点加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadNearbyRecyclers();
});

const openIntentionPopup = (item) => {
  if (!item?.targetRequest) {
    return uni.showToast({ title: '该回收点暂无可投递求购单', icon: 'none' });
  }
  currentTarget.value = item;
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};

const closePopup = () => { showPopup.value = false; };

const onDateChange = (e) => { intentionForm.value.date = e.detail.value; };

const submitIntention = async () => {
  const price = Number(intentionForm.value.price);
  const weight = Number(intentionForm.value.weight);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(weight) || weight <= 0) {
    return uni.showToast({ title: '请填写单价和重量', icon: 'none' });
  }
  const target = currentTarget.value?.targetRequest;
  if (!target?.id) {
    return uni.showToast({ title: '目标求购单不可用，请刷新后重试', icon: 'none' });
  }

  try {
    await request.post('/api/intentions', {
      target_type: 'recycler_request',
      target_id: target.id,
      target_no: target.request_no || '',
      target_name: target.title || currentTarget.value.rawName || currentTarget.value.name,
      estimated_weight: weight,
      expected_date: intentionForm.value.date || null,
      notes: `农户报价：${price} 元/斤`
    });
    closePopup();
    uni.showToast({ title: '意向已发送，等待商家确认', icon: 'success' });
  } catch (err) {
    // request.js 已统一提示
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding: 20rpx;
}

.header {
  padding: 20rpx 0;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}

.desc {
  font-size: 24rpx;
  color: #666;
}

.map-area {
  width: 100%;
  height: 500rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recycler-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}

.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-right: 20rpx;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  color: #2E7D32;
}

.role-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: bold;
}

.badge-merchant {
  background-color: #FFF3E0;
  color: #EF6C00;
}

.badge-processor {
  background-color: #E3F2FD;
  color: #1565C0;
}

.address {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  line-height: 1.4;
}

.phone-text {
  font-size: 24rpx;
  color: #999;
}

.demand-hint {
  font-size: 22rpx;
  margin-top: 8rpx;
}

.demand-open {
  color: #2E7D32;
}

.demand-closed {
  color: #C62828;
}

.intention-btn {
  background-color: #1565C0;
  color: white;
  margin: 0;
  flex-shrink: 0;
}

.intention-btn[disabled] {
  opacity: 0.55;
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

.popup-actions {
  display: flex;
  gap: 20rpx;
}
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

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>