<template>
  <view class="container">
    <view class="header">
      <text class="title">📢 发布原料求购</text>
      <text class="desc">发布您的原料采购需求，寻找优质供应商</text>
    </view>

    <view class="form-card">
      <form @submit="submitDemand">
        <view class="form-group">
          <text class="label">采购原料</text>
          <picker :range="materials" @change="bindMaterialChange">
            <view class="picker-view">
              <text v-if="formData.material">{{ formData.material }}</text>
              <text v-else class="placeholder">请选择原料类型</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">需求重量 (吨)</text>
          <input 
            type="number" 
            class="input" 
            placeholder="请输入需求重量" 
            v-model="formData.weight" 
          />
        </view>

        <view class="form-group">
          <text class="label">质量要求</text>
          <picker :range="qualityLevels" @change="bindQualityChange">
            <view class="picker-view">
              <text v-if="formData.quality">{{ formData.quality }}</text>
              <text v-else class="placeholder">请选择质量等级</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">期望价格 (元/吨)</text>
          <input 
            type="digit" 
            class="input" 
            placeholder="请输入期望单价" 
            v-model="formData.price" 
          />
        </view>

        <view class="form-group">
          <text class="label">详细说明</text>
          <textarea 
            class="textarea" 
            placeholder="对原料产地、运输方式等要求的详细说明..." 
            v-model="formData.description"
          ></textarea>
        </view>

        <button form-type="submit" class="submit-btn" :loading="isSubmitting">发布采购需求</button>
      </form>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const isSubmitting = ref(false);
const materials = ['柑肉原料', '陈皮原料', '果渣'];
const qualityLevels = ['特级', '一级', '二级', '普通'];

const formData = ref({
  material: '',
  weight: '',
  quality: '',
  price: '',
  description: ''
});

const bindMaterialChange = (e) => {
  formData.value.material = materials[e.detail.value];
};

const bindQualityChange = (e) => {
  formData.value.quality = qualityLevels[e.detail.value];
};

const submitDemand = () => {
  if (!formData.value.material || !formData.value.weight) {
    return uni.showToast({ title: '请填写完整信息', icon: 'none' });
  }

  isSubmitting.value = true;
  
  setTimeout(() => {
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
  background: linear-gradient(135deg, #1565C0, #1976D2);
  color: white;
  border-radius: 50rpx;
  margin-top: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(21, 101, 192, 0.3);
}
</style>
