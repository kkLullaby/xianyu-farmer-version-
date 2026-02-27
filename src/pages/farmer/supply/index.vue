<template>
  <view class="container">
    <view class="header">
      <text class="title">🌾 处理商求购大厅</text>
      <text class="desc">查看处理商发布的柑橘果肉收购需求</text>
    </view>

    <view class="filter-bar">
      <view class="filter-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text>全部需求</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text>提供运输</text>
      </view>
      <view class="filter-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text>高价优先</text>
      </view>
    </view>

    <view class="list-container">
      <view class="demand-card" v-for="(item, index) in filteredList" :key="item.id">
        <view class="card-header">
          <text class="buyer-name">{{ item.buyer_name }}</text>
          <text class="deadline-tag">截止: {{ item.deadline }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">需求品种：</text>
            <text class="value">{{ item.variety }}</text>
          </view>
          <view class="info-row">
            <text class="label">需求重量：</text>
            <text class="value highlight">{{ item.weight }} 吨</text>
          </view>
          <view class="info-row">
            <text class="label">收购单价：</text>
            <text class="value price">¥ {{ item.price }}/吨</text>
          </view>
          <view class="info-row">
            <text class="label">运输方式：</text>
            <text class="value tag-transport" v-if="item.has_transport">商家自提</text>
            <text class="value tag-self" v-else>农户送货</text>
          </view>
          <view class="info-row description">
            <text class="label">详细说明：</text>
            <text class="value">{{ item.description }}</text>
          </view>
        </view>

        <view class="card-footer">
          <view class="actions">
            <button class="btn btn-call" size="mini" @click="makeCall(item.phone)">📞 联系买家</button>
            <button class="btn btn-primary" size="mini" @click="handleAccept(item)">🚀 立即接单</button>
          </view>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty-state">
        <text class="empty-text">暂无符合条件的求购需求</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';

const currentTab = ref(0);

// Mock Data
const demandList = ref([
  {
    id: 1,
    buyer_name: '新会生物科技处理厂',
    variety: '柑肉原料',
    weight: 50,
    price: 300,
    has_transport: true,
    phone: '0750-6688999',
    deadline: '2024-04-01',
    description: '急需大量新鲜柑肉原料，要求无霉变，提供专业运输车辆上门拉货。'
  },
  {
    id: 2,
    buyer_name: '绿源有机肥加工中心',
    variety: '果渣/废果',
    weight: 20,
    price: 150,
    has_transport: false,
    phone: '13800138000',
    deadline: '2024-03-30',
    description: '长期收购加工后的果渣，需农户自行送货至双水镇加工点。'
  },
  {
    id: 3,
    buyer_name: '陈皮村深加工基地',
    variety: '陈皮原料',
    weight: 10,
    price: 800,
    has_transport: true,
    phone: '13900139000',
    deadline: '2024-04-15',
    description: '高价收购优质二红皮原料，品质要求高，现场结款。'
  }
]);

const filteredList = computed(() => {
  let list = [...demandList.value];
  if (currentTab.value === 1) {
    list = list.filter(item => item.has_transport);
  } else if (currentTab.value === 2) {
    list.sort((a, b) => b.price - a.price);
  }
  return list;
});

const makeCall = (phone) => {
  uni.makePhoneCall({
    phoneNumber: phone
  });
};

const handleAccept = (item) => {
  uni.showModal({
    title: '确认接单',
    content: `确定要接下 ${item.buyer_name} 的采购订单吗？接单后请尽快联系买家确认交货细节。`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({
          title: '接单成功',
          icon: 'success'
        });
      }
    }
  });
};
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
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

.filter-bar {
  display: flex;
  background: white;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  padding: 10rpx 0;
  position: relative;
}

.filter-item.active {
  color: #EF6C00;
  font-weight: bold;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.demand-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #EF6C00;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.buyer-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.deadline-tag {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}

.label {
  color: #888;
  width: 160rpx;
}

.value {
  color: #333;
  flex: 1;
}

.highlight {
  color: #EF6C00;
  font-weight: bold;
}

.price {
  color: #e74c3c;
  font-weight: bold;
  font-size: 30rpx;
}

.tag-transport {
  color: #2E7D32;
  background: #E8F5E9;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.tag-self {
  color: #EF6C00;
  background: #FFF3E0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.description .value {
  color: #666;
  font-size: 26rpx;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eee;
  margin-top: 20rpx;
}

.actions {
  display: flex;
  gap: 20rpx;
}

.btn {
  margin: 0;
  font-size: 26rpx;
  border-radius: 30rpx;
  padding: 0 30rpx;
  line-height: 60rpx;
}

.btn-call {
  background: white;
  color: #1B3A24;
  border: 1rpx solid #1B3A24;
}

.btn-primary {
  background: linear-gradient(135deg, #EF6C00, #F57C00);
  color: white;
  border: none;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>