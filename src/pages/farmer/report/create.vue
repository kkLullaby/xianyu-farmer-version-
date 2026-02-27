<template>
  <view class="container">
    <view class="header">
      <text class="title">📝 发起柑肉申报</text>
      <text class="desc">请如实填写柑橘果肉处理信息，提交后将生成申报记录</text>
    </view>

    <view class="form-card">
      <form @submit="submitForm">
        <!-- 基础信息 -->
        <view class="form-group">
          <text class="label">处理日期</text>
          <picker mode="date" :value="formData.pickup_date" @change="bindDateChange">
            <view class="picker-view">
              <text v-if="formData.pickup_date">{{ formData.pickup_date }}</text>
              <text v-else class="placeholder">请选择日期</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">预估重量 (斤)</text>
          <input 
            type="number" 
            class="input" 
            placeholder="请输入预估重量" 
            v-model="formData.weight_kg" 
          />
        </view>

        <view class="form-group">
          <text class="label">柑橘品种</text>
          <picker :range="varietyOptions" @change="bindVarietyChange">
            <view class="picker-view">
              <text v-if="formData.citrus_variety">{{ formData.citrus_variety }}</text>
              <text v-else class="placeholder">请选择品种</text>
            </view>
          </picker>
        </view>

        <!-- 联系信息 -->
        <view class="form-group">
          <text class="label">联系人</text>
          <input 
            type="text" 
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
            maxlength="11"
          />
        </view>

        <view class="form-group">
          <text class="label">处理地点</text>
          <input 
            type="text" 
            class="input" 
            placeholder="请输入详细地址" 
            v-model="formData.location_address" 
          />
          <view class="location-btn" @click="chooseLocation">
            <text>📍 获取定位</text>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-group">
          <text class="label">备注说明</text>
          <textarea 
            class="textarea" 
            placeholder="如有特殊说明请在此填写..." 
            v-model="formData.notes"
          ></textarea>
        </view>

        <!-- 提交按钮 -->
        <button form-type="submit" class="submit-btn" :loading="isSubmitting">立即申报</button>
      </form>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const isSubmitting = ref(false);

const formData = ref({
  pickup_date: '',
  weight_kg: '',
  citrus_variety: '',
  contact_name: '',
  contact_phone: '',
  location_address: '',
  notes: ''
});

const varietyOptions = ['新会柑', '茶枝柑', '其他品种'];

const bindDateChange = (e) => {
  formData.value.pickup_date = e.detail.value;
};

const bindVarietyChange = (e) => {
  formData.value.citrus_variety = varietyOptions[e.detail.value];
};

const chooseLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      formData.value.location_address = res.address + ' ' + res.name;
    },
    fail: () => {
      uni.showToast({
        title: '获取位置失败',
        icon: 'none'
      });
    }
  });
};

const submitForm = () => {
  // 验证必填项
  if (!formData.value.pickup_date) return showToast('请选择处理日期');
  if (!formData.value.weight_kg) return showToast('请输入预估重量');
  if (!formData.value.citrus_variety) return showToast('请选择柑橘品种');
  if (!formData.value.contact_name) return showToast('请输入联系人');
  if (!formData.value.contact_phone) return showToast('请输入联系电话');
  if (!formData.value.location_address) return showToast('请输入处理地点');

  isSubmitting.value = true;

  const newReport = {
    id: 'RPT-' + Date.now(),
    submitter: formData.value.contact_name,
    submitter_role: '农户',
    goods_type: formData.value.citrus_variety,
    weight: formData.value.weight_kg,
    address: formData.value.location_address,
    status: 'pending',
    create_time: new Date().toLocaleString(),
    pickup_date: formData.value.pickup_date,
    contact_phone: formData.value.contact_phone,
    notes: formData.value.notes
  };

  const globalList = uni.getStorageSync('global_report_list') || [];
  globalList.unshift(newReport);
  uni.setStorageSync('global_report_list', globalList);

  // 模拟提交请求
  setTimeout(() => {
    isSubmitting.value = false;
    uni.showToast({
      title: '申报提交成功',
      icon: 'success'
    });
    
    // 延迟返回上一页
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }, 1500);
};

const showToast = (title) => {
  uni.showToast({
    title,
    icon: 'none'
  });
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

.input {
  background: #F8F9FA;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
}

.picker-view {
  background: #F8F9FA;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
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

.location-btn {
  margin-top: 10rpx;
  padding: 10rpx 0;
  font-size: 26rpx;
  color: #2E7D32;
  text-align: right;
}

.submit-btn {
  background: linear-gradient(135deg, #2E7D32, #1B3A24);
  color: white;
  border-radius: 50rpx;
  margin-top: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(46, 125, 50, 0.3);
}

.submit-btn:active {
  transform: scale(0.98);
}
</style>
