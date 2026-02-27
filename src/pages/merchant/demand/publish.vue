<template>
  <view class="container">
    <view class="header">
      <text class="title">📢 发布求购</text>
      <text class="desc">发布您的收购需求，吸引周边农户</text>
    </view>

    <view class="form-card">
      <form @submit="submitDemand">
        <view class="form-group">
          <text class="label">求购品种</text>
          <picker :range="varieties" @change="bindVarietyChange">
            <view class="picker-view">
              <text v-if="formData.variety">{{ formData.variety }}</text>
              <text v-else class="placeholder">请选择品种</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">需求重量 (斤)</text>
          <input 
            type="number" 
            class="input" 
            placeholder="请输入需求重量" 
            v-model="formData.weight" 
          />
        </view>

        <view class="form-group">
          <text class="label">收购价格 (元/斤)</text>
          <input 
            type="digit" 
            class="input" 
            placeholder="请输入收购单价" 
            v-model="formData.price" 
          />
        </view>

        <view class="form-group">
          <text class="label">截止日期</text>
          <picker mode="date" @change="bindDateChange">
            <view class="picker-view">
              <text v-if="formData.deadline">{{ formData.deadline }}</text>
              <text v-else class="placeholder">请选择截止日期</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">联系人</text>
          <input
            class="input"
            placeholder="请输入联系人姓名"
            v-model="formData.contact_name"
          />
        </view>

        <view class="form-group">
          <text class="label">联系电话</text>
          <input
            type="number"
            class="input"
            placeholder="请输入联系电话"
            v-model="formData.contact_phone"
          />
        </view>

        <view class="form-group">
          <text class="label">收货地址</text>
          <input
            class="input"
            placeholder="请输入收货地址"
            v-model="formData.address"
          />
        </view>

        <view class="form-group">
          <text class="label">详细说明</text>
          <textarea 
            class="textarea" 
            placeholder="对品质、运输等要求的详细说明..." 
            v-model="formData.description"
          ></textarea>
        </view>

        <button form-type="submit" class="submit-btn" :loading="isSubmitting">发布需求</button>
      </form>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const isSubmitting = ref(false);
const varieties = ['新会柑', '茶枝柑', '其他品种'];

const formData = ref({
  variety: '',
  weight: '',
  price: '',
  deadline: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  description: ''
});

const bindVarietyChange = (e) => {
  formData.value.variety = varieties[e.detail.value];
};

const bindDateChange = (e) => {
  formData.value.deadline = e.detail.value;
};

const submitDemand = () => {
  if (!formData.value.variety || !formData.value.weight || !formData.value.price || !formData.value.contact_name || !formData.value.contact_phone || !formData.value.address) {
    return uni.showToast({ title: '请填写完整信息', icon: 'none' });
  }

  isSubmitting.value = true;
  
  setTimeout(() => {
    const newItem = {
      id: 'DEM' + Date.now(),
      source: 'merchant',
      goods_type: formData.value.variety,
      weight: Number(formData.value.weight),
      unit: '斤',
      price: Number(formData.value.price),
      deadline: formData.value.deadline || '长期有效',
      contact_name: formData.value.contact_name,
      contact_phone: formData.value.contact_phone,
      address: formData.value.address,
      commissionRate: 10,
      description: formData.value.description || ''
    };

    const currentList = uni.getStorageSync('global_demand_list') || [];
    currentList.unshift(newItem);
    uni.setStorageSync('global_demand_list', currentList);

    isSubmitting.value = false;
    uni.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  }, 1500);
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

.form-card {
  background: white;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}

.form-group {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #1B3A24;
  font-weight: bold;
  margin-bottom: 16rpx;
  display: block;
}

.input, .picker-view {
  background: #F8F9FA;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
}

.picker-view {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.placeholder {
  color: #999;
}

.textarea {
  background: #F8F9FA;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
  width: 100%;
  height: 200rpx;
  box-sizing: border-box;
}

.submit-btn {
  background: linear-gradient(135deg, #EF6C00, #F57C00);
  color: white;
  border-radius: 50rpx;
  margin-top: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(239, 108, 0, 0.3);
}
</style>
