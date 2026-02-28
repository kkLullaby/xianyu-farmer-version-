<template>
  <view class="container">
    <view class="header">
      <text class="title">附近的柑橘果肉回收点</text>
      <text class="desc">展示已公开地址的回收商与处理商</text>
    </view>

    <map 
      class="map-area"
      :latitude="latitude" 
      :longitude="longitude" 
      :markers="markers"
      scale="12"
    ></map>

    <view class="list-container">
      <view class="recycler-card" v-for="(item, index) in publicAddresses" :key="item.id">
        <view class="info">
          <view class="name-row">
            <text class="name">{{ item.name }}</text>
            <text class="role-badge" :class="item.role === 'merchant' ? 'badge-merchant' : 'badge-processor'">
              {{ item.role === 'merchant' ? '回收商' : '处理商' }}
            </text>
          </view>
          <text class="address">{{ item.region }}</text>
          <text class="phone-text">📞 {{ item.phone }}</text>
        </view>
        <button class="intention-btn" size="mini" @click="openIntentionPopup(item)">发起意向</button>
      </view>

      <view class="empty-state" v-if="publicAddresses.length === 0">
        <text class="empty-icon">📍</text>
        <text class="empty-text">暂无公开的回收/处理点</text>
      </view>
    </view>

    <view class="popup-mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">发起交易意向</text>
        <text class="popup-sub">向 {{ currentTarget.name }} 报价</text>
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

const latitude = ref(22.5431);
const longitude = ref(113.0350);
const markers = ref([]);
const publicAddresses = ref([]);
const showPopup = ref(false);
const currentTarget = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });

const fuzzPhone = (phone) => String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
const fuzzName = (name, role) => {
  const surname = name ? name.charAt(0) : '某';
  return role === 'merchant' ? surname + '氏回收站' : surname + '氏处理厂';
};
const fuzzDetail = () => '（详细地址经平台保护，签约后可见）';

const initSeedData = () => {
  const existing = uni.getStorageSync('global_addresses');
  if (!existing || existing.length === 0) {
    const seedData = [
      {
        id: 'ADDR-SEED-001',
        role: 'merchant',
        name: '李记回收站',
        phone: '13800001111',
        region: '广东省 江门市 新会区',
        detail: '三江镇银洲湖大道88号',
        is_default: true,
        is_public: true,
        latitude: 22.5580,
        longitude: 113.0340
      },
      {
        id: 'ADDR-SEED-002',
        role: 'processor',
        name: '新会绿源处理厂',
        phone: '13900002222',
        region: '广东省 江门市 新会区',
        detail: '双水镇工业园区A栋2层',
        is_default: true,
        is_public: true,
        latitude: 22.4920,
        longitude: 113.0580
      }
    ];
    uni.setStorageSync('global_addresses', seedData);
  }
};

onShow(() => {
  initSeedData();
  const allAddresses = uni.getStorageSync('global_addresses') || [];
  const filtered = allAddresses.filter(
    a => a.is_public === true && (a.role === 'merchant' || a.role === 'processor')
  );
  publicAddresses.value = filtered.map(item => ({
    ...item,
    phone: fuzzPhone(item.phone),
    name: fuzzName(item.name, item.role),
    detail: fuzzDetail()
  }));

  const mapMarkers = filtered.map((item, index) => ({
    id: index + 1,
    latitude: item.latitude,
    longitude: item.longitude,
    title: fuzzName(item.name, item.role),
    callout: {
        content: fuzzName(item.name, item.role) + (item.role === 'merchant' ? '（回收商）' : '（处理商）'),
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
  }));

  markers.value = mapMarkers;

  if (filtered.length > 0) {
    latitude.value = filtered[0].latitude;
    longitude.value = filtered[0].longitude;
  }
});

const openIntentionPopup = (item) => {
  currentTarget.value = item;
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};

const closePopup = () => { showPopup.value = false; };

const onDateChange = (e) => { intentionForm.value.date = e.detail.value; };

const submitIntention = () => {
  if (!intentionForm.value.price || !intentionForm.value.weight) {
    return uni.showToast({ title: '请填写单价和重量', icon: 'none' });
  }
  const entry = {
    id: 'INT-' + Date.now(),
    target_merchant_id: currentTarget.value.id,
    target_name: currentTarget.value.name,
    sender_name: uni.getStorageSync('current_user_name') || '测试用户',
    sender_phone: uni.getStorageSync('current_user_phone') || '13800000000',
    price: Number(intentionForm.value.price),
    weight: Number(intentionForm.value.weight),
    date: intentionForm.value.date || '待协商',
    status: 'pending',
    create_time: new Date().toLocaleString()
  };
  const list = uni.getStorageSync('global_intentions') || [];
  list.unshift(entry);
  uni.setStorageSync('global_intentions', list);
  closePopup();
  uni.showToast({ title: '意向已发送，等待商家确认', icon: 'success' });
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

.intention-btn {
  background-color: #1565C0;
  color: white;
  margin: 0;
  flex-shrink: 0;
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