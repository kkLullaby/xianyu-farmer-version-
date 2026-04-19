<template>
  <view class="container">
    <view class="header">
      <text class="title">📢 发布求购</text>
      <text class="desc">发布您的收购需求，吸引周边农户</text>
    </view>

    <view class="form-card">
      <form @submit="submitDemand">
        <view class="form-group">
          <text class="label">求购品级</text>
          <picker :range="gradeLabels" @change="bindGradeChange">
            <view class="picker-view">
              <text v-if="formData.grade_label">{{ formData.grade_label }}</text>
              <text v-else class="placeholder">请选择品级</text>
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
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const isSubmitting = ref(false);
const gradeOptions = [
  { label: '一级品', value: 'grade1' },
  { label: '二级品', value: 'grade2' },
  { label: '三级品', value: 'grade3' },
  { label: '等外级', value: 'offgrade' },
  { label: '不限', value: 'any' }
];
const gradeLabels = gradeOptions.map((item) => item.label);

const formData = ref({
  grade: '',
  grade_label: '',
  weight: '',
  price: '',
  deadline: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  description: ''
});

const bindGradeChange = (e) => {
  const option = gradeOptions[e.detail.value];
  formData.value.grade = option.value;
  formData.value.grade_label = option.label;
};

const bindDateChange = (e) => {
  formData.value.deadline = e.detail.value;
};

const submitDemand = async () => {
  if (!formData.value.grade || !formData.value.weight || !formData.value.price || !formData.value.contact_name || !formData.value.contact_phone || !formData.value.address) {
    return uni.showToast({ title: '请填写完整信息', icon: 'none' });
  }

  if (!/^1\d{10}$/.test(String(formData.value.contact_phone))) {
    return uni.showToast({ title: '请输入11位手机号', icon: 'none' });
  }

  const weight = Number(formData.value.weight);
  const price = Number(formData.value.price);
  if (!Number.isFinite(weight) || weight <= 0) {
    return uni.showToast({ title: '请输入有效重量', icon: 'none' });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return uni.showToast({ title: '请输入有效单价', icon: 'none' });
  }

  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const notesParts = [
      formData.value.description ? `需求说明：${formData.value.description}` : '',
      `需求重量：${weight}斤`,
      `参考单价：${price.toFixed(2)}元/斤`,
      `收货地址：${formData.value.address}`
    ].filter(Boolean);

    await request.post('/api/recycler-requests', {
      grade: formData.value.grade,
      contact_name: formData.value.contact_name,
      contact_phone: String(formData.value.contact_phone),
      notes: notesParts.join('\n'),
      valid_until: formData.value.deadline || null,
      status: 'draft'
    });

    isSubmitting.value = false;
    uni.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (err) {
    isSubmitting.value = false;
    // request.js 已统一提示
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'merchant', false)) {
      uni.showToast({ title: '仅回收商可发布求购', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }

    if (!formData.value.contact_name) {
      formData.value.contact_name = me.full_name || me.username || '';
    }
    if (!formData.value.contact_phone) {
      formData.value.contact_phone = me.phone || '';
    }
  } catch (err) {
    // request.js 已统一处理登录失效
  }
});
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
