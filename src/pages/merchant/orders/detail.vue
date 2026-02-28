<template>
  <view class="container">
    <view class="status-header" :class="'status-bg-' + statusKey">
      <text class="status-icon">{{ statusIcon }}</text>
      <text class="status-label">{{ order.status }}</text>
      <text class="status-tip">{{ statusTip }}</text>
    </view>

    <view class="card">
      <view class="card-title">🧑‍🌾 农户信息</view>
      <view class="info-row">
        <text class="label">农户姓名</text>
        <text class="value">{{ order.farmer_name }}</text>
      </view>
      <view class="info-row">
        <text class="label">联系电话</text>
        <text class="value link" @click="callPhone(order.farmer_phone)">{{ order.farmer_phone || '暂无电话' }}</text>
      </view>
      <view class="info-row">
        <text class="label">回收地址</text>
        <text class="value">{{ order.address }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">🍊 商品明细</view>
      <view class="info-row">
        <text class="label">果肉品种</text>
        <text class="value">{{ order.variety }}</text>
      </view>
      <view class="info-row">
        <text class="label">预估重量</text>
        <text class="value highlight">{{ order.weight }} 斤</text>
      </view>
      <view class="info-row">
        <text class="label">收购单价</text>
        <text class="value">¥ {{ order.unit_price }} / 斤</text>
      </view>
      <view class="divider"></view>
      <view class="info-row">
        <text class="label total-label">预估总价</text>
        <text class="value total-value">¥ {{ order.total_price }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">🚚 物流信息</view>
      <view class="info-row">
        <text class="label">物流单号</text>
        <text class="value">{{ order.logistics_no || '暂未填写' }}</text>
      </view>
      <view class="info-row">
        <text class="label">承运方</text>
        <text class="value">{{ order.logistics_company || '暂未填写' }}</text>
      </view>
      <view class="info-row">
        <text class="label">预计到货</text>
        <text class="value">{{ order.expected_delivery || '暂未确认' }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">🕐 订单时间轴</view>
      <view class="timeline">
        <view class="timeline-item" v-for="(event, i) in order.timeline" :key="i">
          <view class="dot" :class="i === 0 ? 'dot-active' : ''"></view>
          <view class="timeline-content">
            <text class="tl-time">{{ event.time }}</text>
            <text class="tl-desc">{{ event.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">📋 订单信息</view>
      <view class="info-row">
        <text class="label">订单编号</text>
        <text class="value small">{{ order.order_no }}</text>
      </view>
      <view class="info-row">
        <text class="label">创建时间</text>
        <text class="value">{{ order.created_at }}</text>
      </view>
    </view>

    <view class="action-bar">
      <button
        v-if="order.status === '待接单'"
        class="action-btn btn-primary"
        @click="handleConfirmReceive"
      >✅ 确认接单</button>
      <button
        v-if="order.status === '进行中'"
        class="action-btn btn-primary"
        @click="handleConfirmShip"
      >🚚 确认已取货</button>
      <button
        v-if="order.status === '进行中' || order.status === '待接单'"
        class="action-btn btn-danger"
        @click="handleArbitration"
      >⚖️ 发起仲裁</button>
      <button
        v-if="order.status === '已完成'"
        class="action-btn btn-disabled"
        disabled
      >✔ 订单已完成</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import request from '@/utils/request.js';

const order = ref({
  id: '',
  order_no: '',
  farmer_name: '',
  farmer_phone: '',
  address: '',
  variety: '',
  weight: 0,
  unit_price: 0,
  total_price: 0,
  status: '',
  logistics_no: '',
  logistics_company: '',
  expected_delivery: '',
  created_at: '',
  timeline: []
});

const statusKey = computed(() => {
  const map = { '待接单': 'pending', '进行中': 'active', '已完成': 'done' };
  return map[order.value.status] || 'pending';
});

const statusIcon = computed(() => {
  const map = { '待接单': '⏳', '进行中': '🚚', '已完成': '✅' };
  return map[order.value.status] || '⏳';
});

const statusTip = computed(() => {
  const map = {
    '待接单': '请尽快确认接单，农户正在等待',
    '进行中': '已接单，请安排取货',
    '已完成': '交易已完成，感谢您的合作'
  };
  return map[order.value.status] || '';
});

const fetchOrderDetail = async (id) => {
  const stored = uni.getStorageSync('global_order_list') || [];
  const found = stored.find(o => String(o.id) === String(id) || o.order_no === id);
  if (found) {
    order.value = { ...order.value, ...found };
    return;
  }
  try {
    const res = await request({ url: `/api/merchant/orders/${id}`, method: 'GET' });
    if (res && res.data) {
      order.value = res.data;
    } else {
      useMockData(id);
    }
  } catch (e) {
    useMockData(id);
  }
};

const persistOrderStatus = (newStatus, timelineDesc) => {
  const stored = uni.getStorageSync('global_order_list') || [];
  const idx = stored.findIndex(o => String(o.id) === String(order.value.id) || o.order_no === order.value.order_no);
  if (idx !== -1) {
    stored[idx].status = newStatus;
    stored[idx].timeline = stored[idx].timeline || [];
    stored[idx].timeline.unshift({ time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc: timelineDesc });
    uni.setStorageSync('global_order_list', stored);
  }
};

const useMockData = (id) => {
  order.value = {
    id: id,
    order_no: 'ORD-20240320-' + String(id).padStart(3, '0'),
    farmer_name: '张三',
    farmer_phone: '13800138001',
    address: '广东省江门市新会区三江镇银洲大道88号',
    variety: '新会柑',
    weight: 500,
    unit_price: 0.8,
    total_price: 400,
    status: '进行中',
    logistics_no: 'SF1234567890',
    logistics_company: '顺丰速运',
    expected_delivery: '2024-03-22',
    created_at: '2024-03-20 10:00',
    timeline: [
      { time: '2024-03-20 10:00', desc: '订单创建，等待回收商接单' },
      { time: '2024-03-20 10:35', desc: '回收商已接单，安排取货中' }
    ]
  };
};

onLoad((options) => {
  const id = options?.id;
  if (id) {
    fetchOrderDetail(id);
  }
});

const callPhone = (phone) => {
  if (!phone) { uni.showToast({ title: '暂无联系方式', icon: 'none' }); return; }
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: () => uni.showToast({ title: '拨号失败', icon: 'none' })
  });
};

const handleConfirmReceive = () => {
  uni.showModal({
    title: '确认接单',
    content: '确认接收此订单并安排取货？',
    success: (res) => {
      if (res.confirm) {
        const desc = '回收商已接单，安排取货中';
        order.value.status = '进行中';
        order.value.timeline = order.value.timeline || [];
        order.value.timeline.unshift({ time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc });
        persistOrderStatus('进行中', desc);
        uni.showToast({ title: '接单成功', icon: 'success' });
      }
    }
  });
};

const handleConfirmShip = () => {
  uni.showModal({
    title: '确认取货',
    content: '确认已完成取货？',
    success: (res) => {
      if (res.confirm) {
        const desc = '回收商已完成取货，订单结束';
        order.value.status = '已完成';
        order.value.timeline = order.value.timeline || [];
        order.value.timeline.unshift({ time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc });
        persistOrderStatus('已完成', desc);
        uni.showToast({ title: '取货确认成功', icon: 'success' });
      }
    }
  });
};

const handleArbitration = () => {
  uni.navigateTo({
    url: '/pages/merchant/arbitration/index?order_no=' + encodeURIComponent(order.value.order_no)
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding-bottom: 160rpx;
}

.status-header {
  padding: 60rpx 40rpx 50rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.status-bg-pending { background: linear-gradient(135deg, #FFB300, #EF6C00); }
.status-bg-active  { background: linear-gradient(135deg, #1565C0, #0D47A1); }
.status-bg-done    { background: linear-gradient(135deg, #2E7D32, #1B5E20); }

.status-icon { font-size: 72rpx; }
.status-label {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
}
.status-tip {
  font-size: 26rpx;
  color: rgba(255,255,255,0.85);
}

.card {
  background: #fff;
  border-radius: 20rpx;
  margin: 24rpx 24rpx 0;
  padding: 32rpx 36rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04);
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14rpx 0;
}

.label {
  font-size: 28rpx;
  color: #999;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.value {
  font-size: 28rpx;
  color: #333;
  text-align: right;
  flex: 1;
}

.value.highlight { color: #EF6C00; font-weight: bold; }
.value.link { color: #1565C0; text-decoration: underline; }
.value.small { font-size: 24rpx; color: #666; }
.total-label { font-weight: bold; color: #333; font-size: 30rpx; }
.total-value { font-weight: bold; color: #E53935; font-size: 36rpx; }

.divider {
  height: 2rpx;
  background-color: #F5F5F5;
  margin: 10rpx 0;
}

.timeline {
  padding-left: 10rpx;
}

.timeline-item {
  display: flex;
  gap: 24rpx;
  padding-bottom: 28rpx;
  position: relative;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 13rpx;
  top: 28rpx;
  bottom: 0;
  width: 2rpx;
  background-color: #E0E0E0;
}

.dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background-color: #BDBDBD;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.dot-active { background-color: #2E7D32; }

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.tl-time { font-size: 24rpx; color: #999; }
.tl-desc { font-size: 28rpx; color: #333; }

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
}

.action-btn {
  flex: 1;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 12rpx;
  border: none;
  padding: 20rpx 0;
}

.btn-primary { background-color: #2E7D32; color: #fff; }
.btn-danger  { background-color: #E53935; color: #fff; }
.btn-disabled { background-color: #BDBDBD; color: #fff; }
</style>
