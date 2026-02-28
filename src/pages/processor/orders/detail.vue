<template>
  <view class="container">
    <view class="status-header" :class="'status-bg-' + statusKey">
      <text class="status-icon">{{ statusIcon }}</text>
      <text class="status-label">{{ order.status }}</text>
      <text class="status-tip">{{ statusTip }}</text>
    </view>

    <view class="card">
      <view class="card-title">🏭 供应商信息</view>
      <view class="info-row">
        <text class="label">供应商名称</text>
        <text class="value">{{ order.supplier }}</text>
      </view>
      <view class="info-row">
        <text class="label">联系电话</text>
        <text class="value link" @click="callPhone(order.supplier_phone)">{{ order.supplier_phone || '暂无电话' }}</text>
      </view>
      <view class="info-row">
        <text class="label">发货地址</text>
        <text class="value">{{ order.ship_from }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">🟤 原料明细</view>
      <view class="info-row">
        <text class="label">原料类型</text>
        <text class="value">{{ order.material }}</text>
      </view>
      <view class="info-row">
        <text class="label">采购重量</text>
        <text class="value highlight">{{ order.weight }} 吨</text>
      </view>
      <view class="info-row">
        <text class="label">单价</text>
        <text class="value">¥ {{ order.unit_price }} / 吨</text>
      </view>
      <view class="divider"></view>
      <view class="info-row">
        <text class="label total-label">采购总额</text>
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
      <view class="info-row">
        <text class="label">收货地址</text>
        <text class="value">{{ order.receive_address || '暂无地址' }}</text>
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
        v-if="order.status === '待发货'"
        class="action-btn btn-primary"
        @click="handleConfirmReceive"
      >📦 确认收货</button>
      <button
        v-if="order.status === '运输中'"
        class="action-btn btn-primary"
        @click="handleConfirmInbound"
      >🏭 确认入库</button>
      <button
        v-if="order.status === '待发货' || order.status === '运输中'"
        class="action-btn btn-danger"
        @click="handleArbitration"
      >⚖️ 发起仲裁</button>
      <button
        v-if="order.status === '已入库'"
        class="action-btn btn-disabled"
        disabled
      >✔ 已完成入库</button>
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
  supplier: '',
  supplier_phone: '',
  ship_from: '',
  material: '',
  weight: 0,
  unit_price: 0,
  total_price: 0,
  status: '',
  logistics_no: '',
  logistics_company: '',
  expected_delivery: '',
  receive_address: '',
  created_at: '',
  timeline: []
});

const statusKey = computed(() => {
  const map = { '待发货': 'pending', '运输中': 'active', '已入库': 'done' };
  return map[order.value.status] || 'pending';
});

const statusIcon = computed(() => {
  const map = { '待发货': '⏳', '运输中': '🚚', '已入库': '✅' };
  return map[order.value.status] || '⏳';
});

const statusTip = computed(() => {
  const map = {
    '待发货': '等待供应商安排发货',
    '运输中': '货物运输中，请关注到货时间',
    '已入库': '货物已入库，交易完成'
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
    const res = await request({ url: `/api/processor/orders/${id}`, method: 'GET' });
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
    order_no: 'PUR-20240321-' + String(id).padStart(3, '0'),
    supplier: '绿野回收站',
    supplier_phone: '13900139001',
    ship_from: '广东省江门市新会区双水镇工业园区',
    material: '柑肉原料',
    weight: 5.5,
    unit_price: 1200,
    total_price: 6600,
    status: '运输中',
    logistics_no: 'YT9876543210',
    logistics_company: '圆通速递',
    expected_delivery: '2024-03-23',
    receive_address: '广东省江门市新会区会城街道绿源处理厂',
    created_at: '2024-03-21 09:00',
    timeline: [
      { time: '2024-03-21 14:20', desc: '货物已发出，正在运输途中' },
      { time: '2024-03-21 09:00', desc: '采购订单创建，等待供应商发货' }
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
    title: '确认收货',
    content: '确认已收到货物？',
    success: (res) => {
      if (res.confirm) {
        const desc = '已确认收货，货物运输中';
        order.value.status = '运输中';
        order.value.timeline = order.value.timeline || [];
        order.value.timeline.unshift({ time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc });
        persistOrderStatus('运输中', desc);
        uni.showToast({ title: '确认成功', icon: 'success' });
      }
    }
  });
};

const handleConfirmInbound = () => {
  uni.showModal({
    title: '确认入库',
    content: '确认货物已完成入库验收？',
    success: (res) => {
      if (res.confirm) {
        const desc = '货物已完成入库验收，订单结束';
        order.value.status = '已入库';
        order.value.timeline = order.value.timeline || [];
        order.value.timeline.unshift({ time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'), desc });
        persistOrderStatus('已入库', desc);
        uni.showToast({ title: '入库确认成功', icon: 'success' });
      }
    }
  });
};

const handleArbitration = () => {
  uni.navigateTo({
    url: '/pages/processor/arbitration/index?order_no=' + encodeURIComponent(order.value.order_no)
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

.timeline { padding-left: 10rpx; }

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
