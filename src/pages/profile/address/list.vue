<template>
  <view class="container">
    <view class="header">
      <text class="title">📍 我的地址</text>
      <text class="desc">管理您的收发货与果园/厂区地址</text>
    </view>

    <view class="address-list">
      <view class="address-card" v-for="item in addressList" :key="item.id">
        <view class="card-top-row">
          <view class="contact-row">
            <text class="contact-name">{{ item.name }}</text>
            <text class="contact-phone">{{ item.phone }}</text>
            <text class="default-badge" v-if="item.is_default">默认</text>
          </view>
          <text class="public-badge public-on" v-if="item.is_public">👁️ 已公开展示</text>
          <text class="public-badge public-off" v-else>🔒 仅自己可见</text>
        </view>
        <view class="address-detail">
          <text class="region-text">{{ item.region }}</text>
          <text class="detail-text">{{ item.detail }}</text>
        </view>
        <view class="card-actions">
          <view class="action-btn" @click="editAddress(item)">
            <text class="action-text">✏️ 编辑</text>
          </view>
          <view class="action-btn" @click="setDefault(item)" v-if="!item.is_default">
            <text class="action-text">⭐ 设为默认</text>
          </view>
          <view class="action-btn action-delete" @click="deleteAddress(item)">
            <text class="action-text-red">🗑️ 删除</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="addressList.length === 0">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无地址，快去添加吧</text>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="add-btn" @click="goAddAddress">+ 新增收货地址</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { syncSessionFromServer } from '@/utils/session';

const addressList = ref([]);
const currentRole = ref('');

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

const reloadAddressList = () => {
  const allAddresses = uni.getStorageSync('global_addresses') || [];
  addressList.value = allAddresses.filter(a => a.role === currentRole.value);
};

onShow(async () => {
  initSeedData();
  try {
    const me = await syncSessionFromServer();
    currentRole.value = me.role;
    reloadAddressList();
  } catch (e) {
    console.warn('[AddressList] syncSessionFromServer failed', e);
  }
});

const goAddAddress = () => {
  uni.navigateTo({ url: '/pages/profile/address/edit' });
};

const editAddress = (item) => {
  uni.setStorageSync('editing_address', item);
  uni.navigateTo({ url: '/pages/profile/address/edit?id=' + item.id });
};

const setDefault = (item) => {
  if (!currentRole.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  let allAddresses = uni.getStorageSync('global_addresses') || [];
  allAddresses = allAddresses.map(a => {
    if (a.role === currentRole.value) {
      a.is_default = (a.id === item.id);
    }
    return a;
  });
  uni.setStorageSync('global_addresses', allAddresses);
  addressList.value = allAddresses.filter(a => a.role === currentRole.value);
  uni.showToast({ title: '已设为默认', icon: 'success' });
};

const deleteAddress = (item) => {
  uni.showModal({
    title: '确认删除',
    content: '确定删除该地址吗？',
    success: (res) => {
      if (res.confirm) {
        let allAddresses = uni.getStorageSync('global_addresses') || [];
        allAddresses = allAddresses.filter(a => a.id !== item.id);
        uni.setStorageSync('global_addresses', allAddresses);
        addressList.value = allAddresses.filter(a => a.role === currentRole.value);
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding: 30rpx;
  padding-bottom: 160rpx;
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

.address-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.address-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.contact-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.contact-phone {
  font-size: 28rpx;
  color: #666;
}

.default-badge {
  font-size: 22rpx;
  color: #FFFFFF;
  background-color: #EF6C00;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.public-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: bold;
}

.public-on {
  background-color: #E8F5E9;
  color: #2E7D32;
}

.public-off {
  background-color: #F5F5F5;
  color: #999;
}

.address-detail {
  margin-bottom: 20rpx;
}

.region-text {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 6rpx;
}

.detail-text {
  font-size: 28rpx;
  color: #333;
}

.card-actions {
  display: flex;
  gap: 24rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #F0F0F0;
}

.action-btn {
  padding: 8rpx 0;
}

.action-text {
  font-size: 26rpx;
  color: #666;
}

.action-text-red {
  font-size: 26rpx;
  color: #E53935;
}

.empty-state {
  text-align: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  padding-bottom: 40rpx;
  background-color: #FFFFFF;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.add-btn {
  background-color: #2E7D32;
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 16rpx;
  border: none;
}

.add-btn::after {
  border: none;
}
</style>
