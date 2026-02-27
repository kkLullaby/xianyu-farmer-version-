<template>
  <view class="container">
    <view class="header">
      <text class="title">{{ isEdit ? '✏️ 编辑地址' : '📍 新增地址' }}</text>
    </view>

    <view class="form-card">
      <view class="form-group">
        <text class="label">联系人</text>
        <input class="input" type="text" placeholder="请输入联系人姓名" v-model="form.name" />
      </view>

      <view class="form-group">
        <text class="label">手机号</text>
        <input class="input" type="number" placeholder="请输入手机号" v-model="form.phone" maxlength="11" />
      </view>

      <view class="form-group">
        <text class="label">所在地区</text>
        <picker mode="region" :value="regionArray" @change="onRegionChange">
          <view class="picker-view">
            <text v-if="form.region">{{ form.region }}</text>
            <text v-else class="placeholder">请选择省/市/区</text>
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">详细地址</text>
        <textarea class="textarea" placeholder="街道、门牌号、楼栋、果园/厂区名称等" v-model="form.detail"></textarea>
      </view>

      <view class="switch-group">
        <view class="switch-row">
          <view class="switch-left">
            <text class="switch-label">设为默认地址</text>
          </view>
          <switch :checked="form.is_default" @change="form.is_default = $event.detail.value" color="#2E7D32" />
        </view>
        <view class="switch-row">
          <view class="switch-left">
            <text class="switch-label">公开此地址</text>
            <text class="switch-hint">开启后，农户可在附近处理点地图中看到您的位置并联系您</text>
          </view>
          <switch :checked="form.is_public" @change="form.is_public = $event.detail.value" color="#1565C0" />
        </view>
      </view>
    </view>

    <button class="save-btn" @click="saveAddress">保存地址</button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const isEdit = ref(false);
const editId = ref('');
const regionArray = ref([]);

const form = ref({
  name: '',
  phone: '',
  region: '',
  detail: '',
  is_default: false,
  is_public: false
});

onLoad((query) => {
  if (query && query.id) {
    isEdit.value = true;
    editId.value = query.id;
    const cached = uni.getStorageSync('editing_address');
    if (cached && cached.id === query.id) {
      form.value.name = cached.name || '';
      form.value.phone = cached.phone || '';
      form.value.region = cached.region || '';
      form.value.detail = cached.detail || '';
      form.value.is_default = !!cached.is_default;
      form.value.is_public = !!cached.is_public;
      if (cached.region) {
        regionArray.value = cached.region.split(' ');
      }
    }
  }
});

const onRegionChange = (e) => {
  const val = e.detail.value;
  form.value.region = val.join(' ');
  regionArray.value = val;
};

const saveAddress = () => {
  if (!form.value.name) return showToast('请输入联系人');
  if (!form.value.phone) return showToast('请输入手机号');
  if (!form.value.region) return showToast('请选择所在地区');
  if (!form.value.detail) return showToast('请输入详细地址');

  const currentRole = uni.getStorageSync('current_role') || 'farmer';
  let allAddresses = uni.getStorageSync('global_addresses') || [];

  const baseLat = 22.5431;
  const baseLng = 113.0350;
  const randomLat = baseLat + (Math.random() - 0.5) * 0.12;
  const randomLng = baseLng + (Math.random() - 0.5) * 0.12;

  if (isEdit.value) {
    allAddresses = allAddresses.map(a => {
      if (a.id === editId.value) {
        return {
          ...a,
          name: form.value.name,
          phone: form.value.phone,
          region: form.value.region,
          detail: form.value.detail,
          is_default: form.value.is_default,
          is_public: form.value.is_public,
          latitude: a.latitude || randomLat,
          longitude: a.longitude || randomLng
        };
      }
      return a;
    });

    if (form.value.is_default) {
      allAddresses = allAddresses.map(a => {
        if (a.role === currentRole && a.id !== editId.value) {
          a.is_default = false;
        }
        return a;
      });
    }
  } else {
    const newAddress = {
      id: 'ADDR-' + Date.now(),
      role: currentRole,
      name: form.value.name,
      phone: form.value.phone,
      region: form.value.region,
      detail: form.value.detail,
      is_default: form.value.is_default,
      is_public: form.value.is_public,
      latitude: randomLat,
      longitude: randomLng
    };

    if (form.value.is_default) {
      allAddresses = allAddresses.map(a => {
        if (a.role === currentRole) {
          a.is_default = false;
        }
        return a;
      });
    }

    allAddresses.unshift(newAddress);
  }

  uni.setStorageSync('global_addresses', allAddresses);
  uni.removeStorageSync('editing_address');

  uni.showToast({ title: '保存成功', icon: 'success' });
  setTimeout(() => {
    uni.navigateBack();
  }, 1000);
};

const showToast = (title) => {
  uni.showToast({ title, icon: 'none' });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding: 30rpx;
}

.header {
  margin-bottom: 30rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1B3A24;
}

.form-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 40rpx;
}

.form-group {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.input {
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
}

.textarea {
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  height: 160rpx;
}

.picker-view {
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}

.placeholder {
  color: #BDBDBD;
}

.switch-group {
  margin-top: 20rpx;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-top: 2rpx solid #F0F0F0;
}

.switch-left {
  flex: 1;
  margin-right: 20rpx;
}

.switch-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.switch-hint {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
  line-height: 1.4;
}

.save-btn {
  background-color: #2E7D32;
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 16rpx;
  border: none;
}

.save-btn::after {
  border: none;
}
</style>
