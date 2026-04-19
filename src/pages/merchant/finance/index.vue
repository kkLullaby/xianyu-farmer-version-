<template>
  <view class="container">
    <view class="header">
      <text class="title">💰 财务中心</text>
      <text class="desc">查看您的收益与交易流水</text>
    </view>

    <!-- 资产卡片 -->
    <view class="asset-card">
      <view class="asset-item">
        <text class="asset-label">总收益 (元)</text>
        <text class="asset-num">{{ formatMoney(totalIncome) }}</text>
      </view>
      <view class="asset-row">
        <view class="sub-item">
          <text class="sub-label">本月收益</text>
          <text class="sub-num">{{ formatMoney(monthIncome) }}</text>
        </view>
        <view class="sub-item">
          <text class="sub-label">待结算</text>
          <text class="sub-num">{{ formatMoney(pendingIncome) }}</text>
        </view>
      </view>
      <button class="withdraw-btn" @click="handleWithdraw">提现</button>
    </view>

    <!-- 交易明细 -->
    <view class="transaction-list">
      <text class="section-title">交易明细</text>

      <view v-if="loading" class="empty-state">
        <text class="empty-text">流水加载中…</text>
      </view>

      <view v-else-if="fetchError" class="empty-state">
        <text class="empty-text">{{ fetchError }}</text>
      </view>
      
      <view v-else-if="transactions.length === 0" class="empty-state">
        <text class="empty-text">暂无可展示的交易流水</text>
      </view>
      
      <view class="transaction-item" v-for="item in transactions" :key="item.id">
        <view class="trans-icon" :class="item.typeClass">
          {{ item.typeLabel }}
        </view>
        <view class="trans-info">
          <text class="trans-title">{{ item.title }}</text>
          <text class="trans-date">{{ item.date }}</text>
        </view>
        <text class="trans-amount" :class="item.amountClass">
          {{ item.amountText }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const loading = ref(false);
const fetchError = ref('');
const orders = ref([]);

const toAmount = (row = {}) => {
  const total = Number(row.total_price || 0);
  if (Number.isFinite(total) && total > 0) return total;
  const weight = Number(row.weight_kg || 0);
  const unit = Number(row.price_per_kg || 0);
  return Number.isFinite(weight * unit) ? weight * unit : 0;
};

const formatDate = (value) => {
  if (!value) return '-';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const formatMoney = (value) => `¥ ${Number(value || 0).toFixed(2)}`;

const totalIncome = computed(() => {
  return orders.value
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + toAmount(item), 0);
});

const monthIncome = computed(() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return orders.value
    .filter((item) => item.status === 'completed')
    .filter((item) => {
      const d = new Date(item.updated_at || item.created_at || 0);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((sum, item) => sum + toAmount(item), 0);
});

const pendingIncome = computed(() => {
  return orders.value
    .filter((item) => item.status === 'pending' || item.status === 'accepted')
    .reduce((sum, item) => sum + toAmount(item), 0);
});

const transactions = computed(() => {
  return [...orders.value]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 100)
    .map((item) => {
      const amount = toAmount(item);
      const status = item.status;

      if (status === 'completed') {
        return {
          id: `income-${item.id}`,
          title: `订单结算 - ${item.order_no || item.id}`,
          date: formatDate(item.updated_at || item.created_at),
          typeLabel: '收',
          typeClass: 'icon-income',
          amountClass: 'text-green',
          amountText: `+${amount.toFixed(2)}`
        };
      }

      if (status === 'cancelled') {
        return {
          id: `cancel-${item.id}`,
          title: `订单取消 - ${item.order_no || item.id}`,
          date: formatDate(item.updated_at || item.created_at),
          typeLabel: '退',
          typeClass: 'icon-expense',
          amountClass: 'text-red',
          amountText: `-${amount.toFixed(2)}`
        };
      }

      return {
        id: `pending-${item.id}`,
        title: `待结算订单 - ${item.order_no || item.id}`,
        date: formatDate(item.updated_at || item.created_at),
        typeLabel: '待',
        typeClass: 'icon-pending',
        amountClass: 'text-blue',
        amountText: `${amount.toFixed(2)}`
      };
    });
});

const loadOrders = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const rows = await request.get('/api/orders');
    orders.value = Array.isArray(rows) ? rows : [];
  } catch (err) {
    orders.value = [];
    fetchError.value = err?.message || '交易数据加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'merchant')) {
      uni.showToast({ title: '仅回收商可访问财务页', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadOrders();
  } catch (err) {
    fetchError.value = err?.message || '身份校验失败';
  }
});

const handleWithdraw = () => {
  uni.showToast({
    title: '当前版本仅提供账单展示，提现流程待接支付网关',
    icon: 'none'
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

.asset-card {
  background: linear-gradient(135deg, #1B3A24, #2E7D32);
  border-radius: 24rpx;
  padding: 40rpx;
  color: white;
  margin-bottom: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(46, 125, 50, 0.3);
}

.asset-item {
  margin-bottom: 40rpx;
}

.asset-label {
  font-size: 28rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 10rpx;
}

.asset-num {
  font-size: 60rpx;
  font-weight: bold;
}

.asset-row {
  display: flex;
  margin-bottom: 30rpx;
}

.sub-item {
  flex: 1;
}

.sub-label {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
  margin-bottom: 6rpx;
}

.sub-num {
  font-size: 32rpx;
  font-weight: bold;
}

.withdraw-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-top: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.transaction-list {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}

.transaction-item:last-child {
  border-bottom: none;
}

.trans-icon {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 20rpx;
}

.icon-income {
  background: #E8F5E9;
  color: #2E7D32;
}

.icon-expense {
  background: #FFF3E0;
  color: #EF6C00;
}

.icon-pending {
  background: #E3F2FD;
  color: #1565C0;
}

.trans-info {
  flex: 1;
}

.trans-title {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 6rpx;
}

.trans-date {
  font-size: 24rpx;
  color: #999;
}

.trans-amount {
  font-size: 32rpx;
  font-weight: bold;
}

.text-green { color: #2E7D32; }
.text-red { color: #EF6C00; }
.text-blue { color: #1565C0; }

.empty-state {
  padding: 36rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
}
</style>
