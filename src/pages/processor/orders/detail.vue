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
  backend_status: '',
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

const processorStatusMap = {
  pending_ship: '待发货',
  shipped: '运输中',
  completed: '已入库',
  pending: '待发货',
  accepted: '运输中',
};

const toDisplayTime = (value) => {
  if (!value) return '—';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const buildTimeline = (raw = {}) => {
  const timeline = [
    { time: toDisplayTime(raw.created_at), desc: '采购订单创建，等待供应方发货' },
  ];

  if (raw.status === 'shipped' || raw.status === 'accepted' || raw.status === 'completed') {
    timeline.unshift({
      time: toDisplayTime(raw.updated_at || raw.created_at),
      desc: '货物已发出，正在运输途中',
    });
  }

  if (raw.status === 'completed') {
    timeline.unshift({
      time: toDisplayTime(raw.updated_at || raw.created_at),
      desc: '货物已完成入库验收，订单结束',
    });
  }

  return timeline;
};

const normalizeOrder = (raw = {}) => ({
  id: raw.id,
  backend_status: raw.status || '',
  order_no: raw.order_no || '',
  supplier: raw.farmer_full_name || raw.farmer_username || `供应方#${raw.farmer_id || ''}`,
  supplier_phone: raw.farmer_phone || '',
  ship_from: raw.location_name || raw.location_address || '待确认',
  material: '柑橘果肉',
  weight: Number(raw.weight_kg || 0),
  unit_price: Number(raw.price_per_kg || 0),
  total_price: Number(raw.total_price || (Number(raw.weight_kg || 0) * Number(raw.price_per_kg || 0))).toFixed(2),
  status: processorStatusMap[raw.status] || raw.status || '待发货',
  logistics_no: raw.logistics_no || '',
  logistics_company: raw.logistics_company || '',
  expected_delivery: raw.expected_delivery || '待确认',
  receive_address: raw.location_name || raw.location_address || '待确认',
  created_at: toDisplayTime(raw.created_at),
  timeline: buildTimeline(raw),
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
  try {
    const res = await request.get(`/api/orders/${id}`);
    order.value = normalizeOrder(res || {});
  } catch (e) {
    uni.showToast({ title: '订单详情加载失败', icon: 'none' });
  }
};

const updateOrderStatus = async (nextStatus, successText) => {
  try {
    await request.patch(`/api/orders/${order.value.id}/status`, { status: nextStatus });
    await fetchOrderDetail(order.value.id);
    uni.showToast({ title: successText, icon: 'success' });
  } catch (e) {
    // request.js 已统一提示
  }
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
    success: async (res) => {
      if (res.confirm) {
        await updateOrderStatus('shipped', '确认成功');
      }
    }
  });
};

const handleConfirmInbound = () => {
  uni.showModal({
    title: '确认入库',
    content: '确认货物已完成入库验收？',
    success: async (res) => {
      if (res.confirm) {
        await updateOrderStatus('completed', '入库确认成功');
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
