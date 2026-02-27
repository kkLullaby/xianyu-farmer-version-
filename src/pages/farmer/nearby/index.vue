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
          <text class="address">{{ item.region }} {{ item.detail }}</text>
          <text class="phone-text">📞 {{ item.phone }}</text>
        </view>
        <button class="call-btn" size="mini" @click="callPhone(item.phone)">联系</button>
      </view>

      <view class="empty-state" v-if="publicAddresses.length === 0">
        <text class="empty-icon">📍</text>
        <text class="empty-text">暂无公开的回收/处理点</text>
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
  publicAddresses.value = filtered;

  const mapMarkers = filtered.map((item, index) => ({
    id: index + 1,
    latitude: item.latitude,
    longitude: item.longitude,
    title: item.name,
    callout: {
      content: item.name + (item.role === 'merchant' ? '（回收商）' : '（处理商）'),
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

const callPhone = (phoneNumber) => {
  uni.makePhoneCall({
    phoneNumber: phoneNumber,
    fail: () => {
      uni.showToast({ title: '拨号失败', icon: 'none' });
    }
  });
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

.call-btn {
  background-color: #2E7D32;
  color: white;
  margin: 0;
  flex-shrink: 0;
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