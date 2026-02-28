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
                  {{ item.goods_type }}
                </text>
              </view>
              <text class="request-no">求购编号：{{ item.id }}</text>
            </view>
            <view class="header-right">
              <text class="valid-text" :class="{ 'long-term': item.deadline === '长期有效' }">
                {{ item.deadline ? `有效期至 ${item.deadline}` : '长期有效' }}
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
              <text class="value">{{ fuzzPhone(item.contact_phone) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">收货地址：</text>
              <text class="value">{{ fuzzAddress(item.address) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">需求量：</text>
              <text class="value">{{ item.weight }} {{ item.unit }}</text>
            </view>
            <view class="contact-item">
              <text class="label">单价：</text>
              <text class="value">{{ item.price }} 元/{{ item.unit }}</text>
            </view>
          </view>

          <view class="price-box price-box-recycler">
            <view class="price-row">
              <text class="price-label">买方出价：</text>
              <text class="price-original">{{ item.price }} 元/{{ item.unit }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">平台服务费：</text>
              <text class="price-fee">{{ item.commissionRate ? item.commissionRate + '%' : '¥0/' + item.unit }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">预估到手：</text>
              <text class="price-final">{{ calcFarmerPrice(item) }} 元/{{ item.unit }}</text>
            </view>
            <text class="price-tip">* 扣除平台服务费后预估到手价</text>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-recycler" @click="openIntentionPopup(item)">
              💬 发起意向
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
                  {{ item.goods_type }}
                </text>
              </view>
              <text class="request-no">求购编号：{{ item.id }}</text>
            </view>
            <view class="header-right">
              <text class="valid-text" :class="{ 'long-term': item.deadline === '长期有效' }">
                {{ item.deadline ? `有效期至 ${item.deadline}` : '长期有效' }}
              </text>
            </view>
          </view>

          <!-- 处理商特有信息 info-box -->
          <view class="info-box">
            <view class="info-grid">
              <view class="info-item">
                <text class="label">需求量：</text>
                <text class="highlight-processor">{{ item.weight }} {{ item.unit }}</text>
              </view>
              <view class="info-item">
                <text class="label">单价：</text>
                <text class="highlight-processor">{{ item.price }} 元/{{ item.unit }}</text>
              </view>
              <view class="info-item full-width">
                <text class="label">📍 收货地址：</text>
                <text class="value">{{ fuzzAddress(item.address) }}</text>
              </view>
            </view>
          </view>

          <view class="price-box price-box-processor">
            <view class="price-row">
              <text class="price-label">买方出价：</text>
              <text class="price-original">{{ item.price }} 元/{{ item.unit }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">平台服务费：</text>
              <text class="price-fee">{{ item.commissionRate ? item.commissionRate + '%' : '¥0/' + item.unit }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">预估到手：</text>
              <text class="price-final-purple">{{ calcFarmerPrice(item) }} 元/{{ item.unit }}</text>
            </view>
            <text class="price-tip">* 扣除平台服务费后预估到手价</text>
          </view>

          <view class="contact-box">
            <view class="contact-item">
              <text class="label">联系人：</text>
              <text class="value">{{ item.contact_name }}</text>
            </view>
            <view class="contact-item">
              <text class="label">联系电话：</text>
              <text class="value">{{ fuzzPhone(item.contact_phone) }}</text>
            </view>
            <view class="contact-item">
              <text class="label">收货地址：</text>
              <text class="value">{{ fuzzAddress(item.address) }}</text>
            </view>
          </view>

          <view class="notes" v-if="item.notes">
            <text class="notes-text">💬 {{ item.notes }}</text>
          </view>

          <view class="action-row">
            <button class="action-btn btn-processor" @click="openIntentionPopup(item)">
              💬 发起意向
            </button>
          </view>
        </view>
      </view>
    </view>

    <view class="popup-mask" v-if="showPopup" @click="closePopup"></view>
    <view class="intention-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">发起交易意向</text>
        <text class="popup-sub">向 {{ currentTarget.name }} 协商供货意向</text>
      </view>
      <view class="popup-form">
        <view class="form-item">
          <text class="form-label">意向单价（元/{{ currentTarget.unit || '斤' }}）</text>
          <input class="form-input" type="digit" v-model="intentionForm.price" placeholder="请输入你的报价" />
        </view>
        <view class="form-item">
          <text class="form-label">预计重量（{{ currentTarget.unit || '斤' }}）</text>
          <input class="form-input" type="number" v-model="intentionForm.weight" placeholder="请输入预计重量" />
        </view>
        <view class="form-item">
          <text class="form-label">期望交接日期</text>
          <picker mode="date" :value="intentionForm.date" @change="onDateChange">
            <view class="picker-view">
              <text v-if="intentionForm.date">{{ intentionForm.date }}</text>
              <text v-else class="picker-placeholder">请选择日期</text>
            </view>
          </picker>
        </view>
      </view>
      <view class="popup-actions">
        <button class="pop-cancel" @click="closePopup">取消</button>
        <button class="pop-confirm" @click="submitIntention">提交意向</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const currentTab = ref(0);

/**
 * 计算农户到手价
 * 比例抽成: farmerPrice = price × (1 - commissionRate / 100)
 * 固定抽成: farmerPrice = price - commissionFee
 */
const calcFarmerPrice = (item) => {
  const price = Number(item.price);
  if (item.commissionRate) {
    return (price * (1 - item.commissionRate / 100)).toFixed(2);
  }
  if (item.commissionFee) {
    return (price - item.commissionFee).toFixed(2);
  }
  return price.toFixed(2);
};

const fuzzPhone = (phone) => String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
const fuzzAddress = (addr) => {
  if (!addr) return '（地址保护中）';
  const parts = addr.split(/[市县区]/u);
  return parts.length > 1 ? addr.substring(0, addr.search(/[县区市]/u) + 2) + '（详细地址经平台保护）' : addr.substring(0, 6) + '…（保护）';
};

const showPopup = ref(false);
const currentTarget = ref({});
const intentionForm = ref({ price: '', weight: '', date: '' });

const openIntentionPopup = (item) => {
  currentTarget.value = { ...item, name: item.contact_name || item.id };
  intentionForm.value = { price: '', weight: '', date: '' };
  showPopup.value = true;
};
const closePopup = () => { showPopup.value = false; };
const onDateChange = (e) => { intentionForm.value.date = e.detail.value; };
const submitIntention = () => {
  if (!intentionForm.value.price || !intentionForm.value.weight) {
    return uni.showToast({ title: '请填写单价和重量', icon: 'none' });
  }
  const entry = {
    id: 'INT-' + Date.now(),
    target_merchant_id: currentTarget.value.id,
    target_name: currentTarget.value.name,
    sender_name: uni.getStorageSync('current_user_name') || '测试用户',
    sender_phone: uni.getStorageSync('current_user_phone') || '13800000000',
    price: Number(intentionForm.value.price),
    weight: Number(intentionForm.value.weight),
    date: intentionForm.value.date || '待协商',
    status: 'pending',
    create_time: new Date().toLocaleString()
  };
  const list = uni.getStorageSync('global_intentions') || [];
  list.unshift(entry);
  uni.setStorageSync('global_intentions', list);
  closePopup();
  uni.showToast({ title: '意向已发送，等待商家确认', icon: 'success' });
};

// --- 公共方法 ---
const contactBuyer = () => {};

// --- Tab 0: 回收商数据 ---
const merchantList = ref([
  {
    id: 'DEM20260227002',
    source: 'merchant',
    goods_type: '茶枝柑',
    weight: 2000,
    unit: '斤',
    price: 0.5,
    deadline: '2026-03-01',
    contact_name: '李老板',
    contact_phone: '13900139000',
    address: '四川省眉山市丹棱县',
    commissionRate: 10,
    notes: '量大从优，上门收货。'
  },
  {
    id: 'DEM20260227003',
    source: 'merchant',
    goods_type: '柚子皮',
    weight: 10000,
    unit: '斤',
    price: 0.3,
    deadline: '长期有效',
    contact_name: '王师傅',
    contact_phone: '13700137000',
    address: '重庆市奉节县',
    commissionRate: 10,
    notes: '只要柚子皮，果肉不要。'
  }
]);

// --- Tab 1: 处理商数据 ---
const processorList = ref([
  {
    id: 'DEM20260227001',
    source: 'processor',
    goods_type: '柑肉原料',
    weight: 8,
    unit: '吨',
    price: 800,
    deadline: '2026-03-15',
    contact_name: '张经理',
    contact_phone: '13800138000',
    address: '四川省成都市蒲江县柑橘处理中心',
    commissionRate: 8,
    notes: '需要新鲜采摘，无腐烂，可上门收货。'
  }
]);

const loadGlobalDemandList = () => {
  const globalList = uni.getStorageSync('global_demand_list') || [];
  if (!Array.isArray(globalList) || globalList.length === 0) return;

  merchantList.value = globalList
    .filter(item => item.source === 'merchant')
    .map(item => ({
      ...item,
      commissionRate: item.commissionRate || 10
    }));

  processorList.value = globalList
    .filter(item => item.source === 'processor')
    .map(item => ({
      ...item,
      commissionRate: item.commissionRate || 8
    }));
};

onShow(() => {
  loadGlobalDemandList();
});
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

/* 价格盒子 */
.price-box {
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.price-box-recycler {
  background: #fff8f0;
  border-left: 6rpx solid #FF9800;
}

.price-box-processor {
  background: #f8f0ff;
  border-left: 6rpx solid #9b59b6;
}

.price-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.price-label { font-size: 26rpx; color: #666; }
.price-original { font-size: 26rpx; color: #333; }
.price-fee { font-size: 26rpx; color: #e74c3c; }

.price-final {
  font-size: 32rpx;
  color: #FF9800;
  font-weight: bold;
}

.price-final-purple {
  font-size: 32rpx;
  color: #9b59b6;
  font-weight: bold;
}

.price-tip {
  font-size: 22rpx;
  color: #bbb;
  display: block;
  margin-top: 4rpx;
}

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

.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
}
.intention-popup {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  z-index: 101;
}
.popup-header { margin-bottom: 30rpx; }
.popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}
.popup-sub { font-size: 26rpx; color: #666; }
.popup-form { margin-bottom: 30rpx; }
.form-item { margin-bottom: 24rpx; }
.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  border: 2rpx solid #E0E0E0;
}
.picker-view {
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  border: 2rpx solid #E0E0E0;
}
.picker-placeholder { color: #999; }
.popup-actions { display: flex; gap: 20rpx; }
.pop-cancel {
  flex: 1;
  background: #F5F5F5;
  color: #666;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
}
.pop-confirm {
  flex: 2;
  background: #2E7D32;
  color: #fff;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
