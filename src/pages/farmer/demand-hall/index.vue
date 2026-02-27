<template>
  <view class="container">
    <view class="header-section">
      <text class="page-title">供需大厅</text>
      <text class="page-desc">查看回收商与处理商的求购需求，一键对接</text>
    </view>

    <!-- 顶部 Tab 栏 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">回收商求购</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">处理商求购</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
    </view>

    <!-- 内容区域 A：回收商求购 (Tab 0) -->
    <view class="content-area" v-if="currentTab === 0">
      <view class="demands-list">
        <view class="glass-card border-recycler" v-for="item in merchantList" :key="item.id">
          <view class="card-header">
            <view class="header-left">
              <view class="title-row">
                <text class="source-label bg-recycler">🚛 回收商</text>
                <text class="tag tag-recycler">
                  {{ gradeLabels[item.grade] }}柑
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

          <!-- 回收商只有基础信息，没有 info-box -->
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
              <text class="label">回收商：</text>
              <text class="value">{{ item.buyer_name }}</text>
            </view>
            <view class="contact-item">
              <text class="label">需求量：</text>
              <text class="value">{{ item.weight_kg }} 斤</text>
            </view>
            <view class="contact-item">
              <text class="label">单价：</text>
              <text class="value">{{ item.price }} 元/斤</text>
            </view>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-recycler" @click="contactBuyer(item.contact_phone)">
              💬 联系买家
            </button>
          </view>
        </view>
      </view>
    </view>

    <!-- 内容区域 B：处理商求购 (Tab 1) - 使用真实的处理商卡片结构 -->
    <view class="content-area" v-if="currentTab === 1">
      <view class="demands-list">
        <view class="glass-card border-processor" v-for="item in processorList" :key="item.id">
          <view class="card-header">
            <view class="header-left">
              <view class="title-row">
                <text class="source-label bg-processor">🏭 处理商</text>
                <text class="tag tag-processor">
                  {{ gradeLabels[item.grade] }} {{ citrusLabels[item.citrus_type] }}
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

          <!-- 处理商特有信息 info-box -->
          <view class="info-box">
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
              <text class="label">处理商：</text>
              <text class="value">{{ item.buyer_name }}</text>
            </view>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-processor" @click="contactBuyer(item.contact_phone)">
              💬 联系买家
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const currentTab = ref(0);

// --- 公共方法 ---
const contactBuyer = (phone) => {
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: () => {
      uni.showToast({ title: '拨打电话失败', icon: 'none' });
    }
  });
};

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

// --- Tab 0: 回收商数据 (仅保留 source_type: recycler) ---
const merchantList = ref([
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

// --- Tab 1: 处理商数据 (从原数组剥离，仅保留 source_type: processor) ---
const processorList = ref([
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
  }
]);
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
}

.header-section {
  margin-bottom: 20rpx;
}

.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
}

.page-desc {
  font-size: 26rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 40rpx;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-text {
  font-size: 30rpx;
  color: #666;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #2E7D32;
  font-weight: bold;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  background: #2E7D32;
  border-radius: 4rpx;
}

/* 列表样式 */
.demands-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24rpx;
  box-shadow: 0 16rpx 64rpx rgba(0, 0, 0, 0.05);
  padding: 40rpx;
}

.border-processor { border-left: 8rpx solid #9b59b6; }
.border-recycler { border-left: 8rpx solid #FF9800; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.title-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
  gap: 12rpx;
}

.source-label {
  color: white;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
}

.bg-processor { background-color: #9b59b6; }
.bg-recycler { background-color: #FF9800; }

.tag {
  padding: 4rpx 16rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.tag-processor { background-color: #f0e6ff; color: #9b59b6; }
.tag-recycler { background-color: #fff3e0; color: #FF9800; }

.request-no {
  color: #999;
  font-size: 24rpx;
  display: block;
}

.valid-text {
  font-size: 24rpx;
  color: #999;
}
.long-term { color: #4CAF50; }

.info-box {
  background-color: #f5f0ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.info-item {
  width: 45%;
  font-size: 26rpx;
  display: flex;
  align-items: center;
}
.info-item.full-width { width: 100%; }

.highlight-processor {
  color: #9b59b6;
  font-weight: bold;
}

.contact-box {
  background-color: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.contact-item {
  font-size: 26rpx;
  margin-bottom: 8rpx;
  display: flex;
}

.label { font-weight: bold; color: #333; }
.value { color: #333; margin-left: 10rpx; }

.notes { margin-bottom: 24rpx; }
.notes-text { color: #666; font-size: 26rpx; }

.action-row { display: flex; justify-content: flex-end; }
.action-btn {
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 0 32rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: bold;
  margin: 0;
}
.btn-processor { background-color: #9b59b6; }
.btn-recycler { background-color: #FF9800; }
</style>
