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
          <picker :range="materialLabels" @change="bindMaterialChange">
            <view class="picker-view">
              <text v-if="formData.material_label">{{ formData.material_label }}</text>
              <text v-else class="placeholder">请选择原料类型</text>
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
          <text class="label">质量要求</text>
          <picker :range="qualityLabels" @change="bindQualityChange">
            <view class="picker-view">
              <text v-if="formData.grade_label">{{ formData.grade_label }}</text>
              <text v-else class="placeholder">请选择质量等级</text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="label">期望价格 (元/斤)</text>
          <input 
            type="digit" 
            class="input" 
            placeholder="请输入期望单价" 
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

        <view class="form-group transport-group">
          <text class="label">具备运输能力</text>
          <switch :checked="formData.has_transport" color="#1565C0" @change="bindTransportChange" />
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
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const isSubmitting = ref(false);
const materialOptions = [
  { label: '柑橘', value: 'mandarin' },
  { label: '橙子', value: 'orange' },
  { label: '柚子', value: 'pomelo' },
  { label: '橘子', value: 'tangerine' },
  { label: '不限种类', value: 'any' }
];
const qualityOptions = [
  { label: '一级品', value: 'grade1' },
  { label: '二级品', value: 'grade2' },
  { label: '三级品', value: 'grade3' },
  { label: '等外级', value: 'offgrade' },
  { label: '不限品级', value: 'any' }
];

const materialLabels = materialOptions.map((item) => item.label);
const qualityLabels = qualityOptions.map((item) => item.label);

const formData = ref({
  material: '',
  material_label: '',
  weight: '',
  grade: '',
  grade_label: '',
  price: '',
  deadline: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  has_transport: false,
  description: ''
});

const bindMaterialChange = (e) => {
  const option = materialOptions[e.detail.value];
  formData.value.material = option.value;
  formData.value.material_label = option.label;
};

const bindQualityChange = (e) => {
  const option = qualityOptions[e.detail.value];
  formData.value.grade = option.value;
  formData.value.grade_label = option.label;
};

const bindDateChange = (e) => {
  formData.value.deadline = e.detail.value;
};

const bindTransportChange = (e) => {
  formData.value.has_transport = !!e.detail.value;
};

const submitDemand = async () => {
  if (!formData.value.material || !formData.value.grade || !formData.value.weight || !formData.value.price || !formData.value.contact_name || !formData.value.contact_phone || !formData.value.address) {
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
      `期望单价：${price.toFixed(2)}元/斤`
    ].filter(Boolean);

    await request.post('/api/processor-requests', {
      weight_kg: weight,
      grade: formData.value.grade,
      citrus_type: formData.value.material,
      location_address: formData.value.address,
      contact_name: formData.value.contact_name,
      contact_phone: String(formData.value.contact_phone),
      has_transport: formData.value.has_transport,
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
    if (!roleAllowed(me.role, 'processor', false)) {
      uni.showToast({ title: '仅处理商可发布求购', icon: 'none' });
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

.transport-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
