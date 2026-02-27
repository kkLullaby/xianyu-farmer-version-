<template>
  <view class="container">
    <view class="header-section">
      <text class="page-title">📢 柑肉求购</text>
      <text class="page-desc">查看回收商和处理商发布的求购信息，主动联系对接</text>
    </view>

    <view class="demands-list">
      <view class="glass-card" v-for="item in demandList" :key="item.id" :class="item.source_type === 'processor' ? 'border-processor' : 'border-recycler'">
        <view class="card-header">
          <view class="header-left">
            <view class="title-row">
              <text class="source-label" :class="item.source_type === 'processor' ? 'bg-processor' : 'bg-recycler'">
                {{ item.source_type === 'processor' ? '🏭 处理商' : '🚛 回收商' }}
              </text>
              <text class="tag" :class="item.source_type === 'processor' ? 'tag-processor' : 'tag-recycler'">
                {{ gradeLabels[item.grade] }}{{ item.source_type === 'processor' ? ' ' + citrusLabels[item.citrus_type] : '柑' }}
              </text>
            </view>
            <text class="request-no">求购编号：{{ item.request_no }}</text>
          </view>
          <view class="header-right">
            <text class="valid-text" :class="{ 'long-term': !item.valid_until }">
              {{ item.valid_until ? `有效期至 ${item.valid_until}` : '长期有效' }}
            </text>
          </view>
        </view>

        <view class="info-box" v-if="item.source_type === 'processor'">
          <view class="info-grid">
            <view class="info-item">
              <text class="label">需求量：</text>
              <text class="highlight-processor">{{ item.weight_kg }} 斤</text>
            </view>
            <view class="info-item">
              <text class="label">单价：</text>
              <text class="highlight-processor">{{ item.price }} 元/斤</text>
            </view>
            <view class="info-item full-width">
              <text class="label">📍 收货地址：</text>
              <text class="value">{{ item.location_address }}</text>
            </view>
          </view>
        </view>

        <view class="contact-box">
          <view class="contact-item">
            <text class="label">联系人：</text>
            <text class="value">{{ item.contact_name }}</text>
          </view>
          <view class="contact-item">
            <text class="label">联系电话：</text>
            <text class="value">{{ item.contact_phone }}</text>
          </view>
          <view class="contact-item">
            <text class="label">{{ item.source_type === 'processor' ? '处理商：' : '回收商：' }}</text>
            <text class="value">{{ item.buyer_name }}</text>
          </view>
          <view class="contact-item" v-if="item.source_type !== 'processor'">
            <text class="label">需求量：</text>
            <text class="value">{{ item.weight_kg }} 斤</text>
          </view>
          <view class="contact-item" v-if="item.source_type !== 'processor'">
            <text class="label">单价：</text>
            <text class="value">{{ item.price }} 元/斤</text>
          </view>
        </view>

        <view class="notes" v-if="item.notes">
          <text class="notes-text">💬 {{ item.notes }}</text>
        </view>

        <view class="action-row">
          <button class="action-btn" :class="item.source_type === 'processor' ? 'btn-processor' : 'btn-recycler'" @click="contactBuyer(item.contact_phone)">
            💬 联系买家
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const gradeLabels = {
  'grade1': '一级品',
  'grade2': '二级品',
  'grade3': '三级品',
  'offgrade': '等外级',
  'any': '不限品级'
};

const citrusLabels = {
  'mandarin': '柑橘',
  'orange': '橙子',
  'pomelo': '柚子',
  'tangerine': '橘子',
  'any': '不限种类'
};

// Mock Data
const demandList = ref([
  {
    id: 1,
    source_type: 'processor',
    request_no: 'REQ20260227001',
    grade: 'grade1',
    citrus_type: 'mandarin',
    weight_kg: 5000,
    price: '0.8',
    location_address: '四川省成都市蒲江县柑橘处理中心',
    contact_name: '张经理',
    contact_phone: '13800138000',
    buyer_name: '绿源果业处理厂',
    valid_until: '2026-03-15',
    notes: '需要新鲜采摘，无腐烂，可上门收货。'
  },
  {
    id: 2,
    source_type: 'recycler',
    request_no: 'REQ20260227002',
    grade: 'grade2',
    citrus_type: 'orange',
    weight_kg: 2000,
    price: '0.5',
    location_address: '四川省眉山市丹棱县',
    contact_name: '李老板',
    contact_phone: '13900139000',
    buyer_name: '李记农产品回收',
    valid_until: null,
    notes: '量大从优，上门收货。'
  },
  {
    id: 3,
    source_type: 'recycler',
    request_no: 'REQ20260227003',
    grade: 'any',
    citrus_type: 'pomelo',
    weight_kg: 10000,
    price: '0.3',
    location_address: '重庆市奉节县',
    contact_name: '王师傅',
    contact_phone: '13700137000',
    buyer_name: '奉节果皮回收站',
    valid_until: '2026-03-01',
    notes: '只要柚子皮，果肉不要。'
  }
]);

const contactBuyer = (phone) => {
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: () => {
      uni.showToast({
        title: '拨打电话失败',
        icon: 'none'
      });
    }
  });
};
</script>

<style scoped>
.container {
  padding: 40rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header-section {
  margin-bottom: 48rpx;
  animation: fadeIn 0.5s;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 16rpx;
}

.page-desc {
  font-size: 28rpx;
  color: #666666;
  display: block;
}

.demands-list {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 30rpx;
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.05);
  padding: 48rpx;
}

.border-processor {
  border-left: 8rpx solid #9b59b6;
}

.border-recycler {
  border-left: 8rpx solid #FF9800;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32rpx;
}

.title-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
  gap: 16rpx;
}

.source-label {
  color: white;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.bg-processor {
  background-color: #9b59b6;
}

.bg-recycler {
  background-color: #FF9800;
}

.tag {
  padding: 8rpx 20rpx;
  border-radius: 40rpx;
  font-size: 26rpx;
}

.tag-processor {
  background-color: #f0e6ff;
  color: #9b59b6;
}

.tag-recycler {
  background-color: #fff3e0;
  color: #FF9800;
}

.request-no {
  color: #666666;
  font-size: 26rpx;
  display: block;
}

.valid-text {
  font-size: 24rpx;
  color: #999999;
}

.long-term {
  color: #4CAF50;
}

.info-box {
  background-color: #f5f0ff;
  padding: 28rpx;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.info-item {
  width: 45%;
  font-size: 28rpx;
  display: flex;
  align-items: center;
}

.info-item.full-width {
  width: 100%;
}

.highlight-processor {
  color: #9b59b6;
  font-weight: bold;
}

.contact-box {
  background-color: #f9f9f9;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.contact-item {
  font-size: 28rpx;
  margin-bottom: 12rpx;
  display: flex;
}

.contact-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: bold;
  color: #333333;
}

.value {
  color: #333333;
}

.notes {
  margin-bottom: 32rpx;
}

.notes-text {
  color: #666666;
  font-size: 28rpx;
}

.action-row {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin: 0;
}

.action-btn::after {
  border: none;
}

.btn-processor {
  background-color: #9b59b6;
}

.btn-recycler {
  background-color: #FF9800;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>