<template>
  <view class="container">
    <view class="header">
      <text class="title">📋 申报审核</text>
      <text class="desc">审核各角色发布的交易/求购单据，设置平台抽成</text>
    </view>

    <view class="tab-bar">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <text class="tab-text">农户申报</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">
        <text class="tab-text">回收商发布</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <text class="tab-text">处理商发布</text>
        <view class="tab-line" v-if="currentTab === 2"></view>
      </view>
    </view>

    <view class="stats-row">
      <text class="stats-text">当前待审核：{{ currentList.filter(i => i.audit_status === 'pending').length }} 条</text>
    </view>

    <view class="list-container">
      <view class="audit-card" :class="{ 'card-approved': item.audit_status === 'approved' }" v-for="item in currentList" :key="item.id">
        <view class="card-top">
          <text class="card-no">{{ item.id }}</text>
          <text class="audit-badge" :class="'audit-' + item.audit_status">{{ auditStatusLabel[item.audit_status] }}</text>
        </view>

        <view class="card-body">
          <view class="info-row">
            <text class="label">提交人：</text>
            <text class="val">{{ item.submitter }} ({{ item.role_label }})</text>
          </view>
          <view class="info-row">
            <text class="label">类型：</text>
            <text class="val highlight">{{ item.type_label }}</text>
          </view>
          <view class="info-row">
            <text class="label">品种/规格：</text>
            <text class="val">{{ item.spec }}</text>
          </view>
          <view class="info-row">
            <text class="label">数量：</text>
            <text class="val">{{ item.quantity }}</text>
          </view>
          <view class="info-row">
            <text class="label">申报单价：</text>
            <text class="val price-text">{{ item.unit_price }} 元/斤</text>
          </view>
          <view class="info-row" v-if="item.audit_status === 'approved'">
            <text class="label">抽成设定：</text>
            <text class="val text-blue">{{ item.commission_type === 'rate' ? item.commission_value + '%' : '¥' + item.commission_value + '/笔' }}</text>
          </view>
          <view class="info-row" v-if="item.audit_status === 'approved'">
            <text class="label">实际到手：</text>
            <text class="val text-green">{{ calcFinalPrice(item) }} 元/斤</text>
          </view>
        </view>

        <view class="card-bottom">
          <text class="time-text">提交时间：{{ item.created_at }}</text>
          <view class="btn-group">
            <button v-if="item.audit_status === 'pending'" class="btn-audit" @click="openCommissionPopup(item)">审批</button>
            <button v-if="item.audit_status === 'pending'" class="btn-reject" @click="rejectItem(item)">驳回</button>
            <text v-if="item.audit_status === 'approved'" class="approved-tag">✅ 已通过</text>
            <text v-if="item.audit_status === 'rejected'" class="rejected-tag">❌ 已驳回</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="currentList.length === 0">
        <text class="empty-text">暂无审核数据</text>
      </view>
    </view>

    <view class="mask" v-if="showPopup" @click="closePopup"></view>
    <view class="commission-popup" v-if="showPopup">
      <view class="popup-header">
        <text class="popup-title">💰 设置平台抽成</text>
        <text class="popup-sub">单据：{{ popupItem.id }} · {{ popupItem.submitter }}</text>
      </view>

      <view class="popup-info">
        <view class="popup-info-row">
          <text class="popup-info-label">申报单价：</text>
          <text class="popup-info-value">{{ popupItem.unit_price }} 元/斤</text>
        </view>
        <view class="popup-info-row">
          <text class="popup-info-label">申报数量：</text>
          <text class="popup-info-value">{{ popupItem.quantity }}</text>
        </view>
      </view>

      <view class="popup-section">
        <text class="popup-label">抽成方式</text>
        <view class="type-selector">
          <view class="type-option" :class="{ 'type-active': commissionForm.type === 'rate' }" @click="commissionForm.type = 'rate'">
            <text class="type-text">比例抽成 (%)</text>
          </view>
          <view class="type-option" :class="{ 'type-active': commissionForm.type === 'fixed' }" @click="commissionForm.type = 'fixed'">
            <text class="type-text">固定金额 (¥)</text>
          </view>
        </view>
      </view>

      <view class="popup-section">
        <text class="popup-label">{{ commissionForm.type === 'rate' ? '抽成比例 (%)' : '固定金额 (元)' }}</text>
        <input class="popup-input" type="digit" v-model="commissionForm.value" :placeholder="commissionForm.type === 'rate' ? '例：10 表示10%' : '例：0.05 表示每斤扣0.05元'" />
      </view>

      <view class="popup-preview" v-if="commissionForm.value">
        <text class="preview-label">预览计算：</text>
        <text class="preview-formula" v-if="commissionForm.type === 'rate'">
          {{ popupItem.unit_price }} × (1 - {{ commissionForm.value }}%) = {{ (popupItem.unit_price * (1 - commissionForm.value / 100)).toFixed(2) }} 元/斤（卖方到手）
        </text>
        <text class="preview-formula" v-else>
          {{ popupItem.unit_price }} - {{ commissionForm.value }} = {{ (popupItem.unit_price - Number(commissionForm.value)).toFixed(2) }} 元/斤（卖方到手）
        </text>
      </view>

      <view class="popup-actions">
        <button class="btn-pop-cancel" @click="closePopup">取消</button>
        <button class="btn-pop-confirm" @click="confirmAudit">通过审核</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const currentTab = ref(0);
const showPopup = ref(false);
const popupItem = ref({});

const commissionForm = ref({
  type: 'rate',
  value: ''
});

const auditStatusLabel = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回'
};

const originalFarmerMockList = [
  {
    id: 'AUD20260226001',
    submitter: '张三',
    role_label: '农户',
    type_label: '柑肉处理申报',
    spec: '一级品 · 柑橘',
    quantity: '5000 斤',
    unit_price: 0.8,
    audit_status: 'pending',
    commission_type: null,
    commission_value: null,
    created_at: '2026-02-26 09:00'
  },
  {
    id: 'AUD20260225002',
    submitter: '王大姐',
    role_label: '农户',
    type_label: '果皮供应申报',
    spec: '三级品 · 橙子',
    quantity: '3000 斤',
    unit_price: 0.3,
    audit_status: 'pending',
    commission_type: null,
    commission_value: null,
    created_at: '2026-02-25 14:30'
  },
  {
    id: 'AUD20260220003',
    submitter: '老刘',
    role_label: '农户',
    type_label: '柑肉处理申报',
    spec: '二级品 · 柑橘',
    quantity: '8000 斤',
    unit_price: 0.5,
    audit_status: 'approved',
    commission_type: 'rate',
    commission_value: 10,
    created_at: '2026-02-20 10:00'
  }
];

const farmerList = ref([]);

onShow(() => {
  const globalList = uni.getStorageSync('global_report_list') || [];
  const mappedGlobalList = globalList.map(item => ({
    id: item.id,
    submitter: item.submitter,
    role_label: item.submitter_role,
    type_label: '柑肉处理申报',
    spec: item.goods_type,
    quantity: item.weight + ' 斤',
    unit_price: 0, // 申报无单价
    audit_status: item.status,
    commission_type: null,
    commission_value: null,
    created_at: item.create_time,
    _isGlobal: true
  }));
  farmerList.value = [...mappedGlobalList, ...originalFarmerMockList];

  const auditList = uni.getStorageSync('global_audit_list') || [];
  const merchantFromStorage = auditList
    .filter(i => i._role === 'merchant')
    .map(item => ({ ...item }));
  const processorFromStorage = auditList
    .filter(i => i._role === 'processor')
    .map(item => ({ ...item }));
  merchantPublishList.value = [...merchantFromStorage, ...originalMerchantMockList];
  processorPublishList.value = [...processorFromStorage, ...originalProcessorMockList];
});

const merchantPublishList = ref([]);

const originalMerchantMockList = [
  {
    id: 'AUD20260226004',
    submitter: '李记回收',
    role_label: '回收商',
    type_label: '回收求购发布',
    spec: '不限品级 · 柚子皮',
    quantity: '10000 斤',
    unit_price: 0.3,
    audit_status: 'pending',
    commission_type: null,
    commission_value: null,
    created_at: '2026-02-26 11:00'
  },
  {
    id: 'AUD20260224005',
    submitter: '奉节果皮站',
    role_label: '回收商',
    type_label: '回收求购发布',
    spec: '二级品 · 橙子',
    quantity: '2000 斤',
    unit_price: 0.5,
    audit_status: 'approved',
    commission_type: 'fixed',
    commission_value: 0.03,
    created_at: '2026-02-24 08:45'
  }
];

const processorPublishList = ref([]);

const originalProcessorMockList = [
  {
    id: 'AUD20260227006',
    submitter: '绿源果业',
    role_label: '处理商',
    type_label: '加工求购发布',
    spec: '一级品 · 柑橘',
    quantity: '5000 斤',
    unit_price: 0.8,
    audit_status: 'pending',
    commission_type: null,
    commission_value: null,
    created_at: '2026-02-27 07:30'
  },
  {
    id: 'AUD20260222007',
    submitter: '柑之源加工',
    role_label: '处理商',
    type_label: '加工求购发布',
    spec: '不限品级 · 柑橘',
    quantity: '20000 斤',
    unit_price: 0.6,
    audit_status: 'approved',
    commission_type: 'rate',
    commission_value: 8,
    created_at: '2026-02-22 16:00'
  }
];

const currentList = computed(() => {
  if (currentTab.value === 0) return farmerList.value;
  if (currentTab.value === 1) return merchantPublishList.value;
  return processorPublishList.value;
});

/**
 * 抽成计算公式：
 * 比例抽成: finalPrice = unit_price × (1 - commission_value / 100)
 * 固定抽成: finalPrice = unit_price - commission_value
 */
const calcFinalPrice = (item) => {
  if (item.commission_type === 'rate') {
    return (item.unit_price * (1 - item.commission_value / 100)).toFixed(2);
  }
  return (item.unit_price - item.commission_value).toFixed(2);
};

const openCommissionPopup = (item) => {
  popupItem.value = item;
  commissionForm.value = { type: 'rate', value: '' };
  showPopup.value = true;
};

const closePopup = () => {
  showPopup.value = false;
};

const updateGlobalReportStatus = (id, status) => {
  let reports = uni.getStorageSync('global_report_list') || [];
  const index = reports.findIndex(r => r.id === id);
  if (index > -1) {
    reports[index].status = status;
    uni.setStorageSync('global_report_list', reports);
  }
};

const confirmAudit = () => {
  const val = Number(commissionForm.value.value);
  if (!val || val <= 0) {
    uni.showToast({ title: '请输入有效的抽成数值', icon: 'none' });
    return;
  }
  if (commissionForm.value.type === 'rate' && val >= 100) {
    uni.showToast({ title: '比例不能超过100%', icon: 'none' });
    return;
  }
  const lists = [farmerList, merchantPublishList, processorPublishList];
  for (const list of lists) {
    const target = list.value.find(i => i.id === popupItem.value.id);
    if (target) {
      target.audit_status = 'approved';
      target.commission_type = commissionForm.value.type;
      target.commission_value = val;
      if (target._isGlobal) {
        updateGlobalReportStatus(target.id, 'approved');
      }
      break;
    }
  }
  showPopup.value = false;
  uni.showToast({ title: '审核通过，抽成已设定', icon: 'success' });
};

const rejectItem = (item) => {
  uni.showModal({
    title: '确认驳回',
    content: `确定要驳回 ${item.submitter} 的申报吗？`,
    success: (res) => {
      if (res.confirm) {
        item.audit_status = 'rejected';
        if (item._isGlobal) {
          updateGlobalReportStatus(item.id, 'rejected');
        }
        uni.showToast({ title: '已驳回', icon: 'none' });
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

.header { margin-bottom: 30rpx; }

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 10rpx;
}

.desc { font-size: 26rpx; color: #45664E; }

.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-text { font-size: 28rpx; color: #666; font-weight: 500; }
.tab-item.active .tab-text { color: #1565C0; font-weight: bold; }

.tab-line {
  position: absolute;
  bottom: 0; left: 50%; transform: translateX(-50%);
  width: 40rpx; height: 6rpx;
  background: #1565C0; border-radius: 4rpx;
}

.stats-row {
  margin-bottom: 20rpx;
}

.stats-text { font-size: 26rpx; color: #999; }

.list-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.audit-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  border-left: 8rpx solid #EF6C00;
}

.card-approved { border-left-color: #2E7D32; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.card-no { font-size: 26rpx; color: #999; }

.audit-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-weight: bold;
}

.audit-pending { background: #FFF3E0; color: #EF6C00; }
.audit-approved { background: #e8f5e9; color: #2E7D32; }
.audit-rejected { background: #fce4ec; color: #c62828; }

.card-body { margin-bottom: 16rpx; }

.info-row {
  display: flex;
  margin-bottom: 10rpx;
  font-size: 27rpx;
}

.label { color: #888; width: 170rpx; }
.val { color: #333; flex: 1; }
.highlight { color: #1565C0; font-weight: bold; }
.price-text { color: #e74c3c; font-weight: bold; }
.text-blue { color: #1565C0; font-weight: bold; }
.text-green { color: #2E7D32; font-weight: bold; }

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx dashed #eee;
}

.time-text { font-size: 24rpx; color: #bbb; }

.btn-group { display: flex; gap: 12rpx; }

.btn-audit {
  background: #1565C0;
  color: white;
  font-size: 24rpx;
  padding: 0 28rpx;
  border-radius: 30rpx;
  height: 56rpx;
  line-height: 56rpx;
  margin: 0;
  border: none;
}

.btn-reject {
  background: #fff;
  color: #c62828;
  font-size: 24rpx;
  padding: 0 28rpx;
  border-radius: 30rpx;
  height: 56rpx;
  line-height: 56rpx;
  border: 2rpx solid #c62828;
  margin: 0;
}

.approved-tag { font-size: 24rpx; color: #2E7D32; }
.rejected-tag { font-size: 24rpx; color: #c62828; }

.empty-state { text-align: center; padding: 80rpx 0; }
.empty-text { font-size: 28rpx; color: #bbb; }

/* --- 抽成弹窗 --- */
.mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 998;
}

.commission-popup {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: white;
  border-radius: 40rpx 40rpx 0 0;
  padding: 50rpx 40rpx;
  z-index: 999;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 -8rpx 40rpx rgba(0,0,0,0.12);
}

.popup-header { margin-bottom: 30rpx; }

.popup-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 8rpx;
}

.popup-sub { font-size: 26rpx; color: #999; }

.popup-info {
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}

.popup-info-row {
  display: flex;
  margin-bottom: 8rpx;
  font-size: 27rpx;
}

.popup-info-label { color: #888; width: 170rpx; }
.popup-info-value { color: #333; font-weight: bold; }

.popup-section { margin-bottom: 30rpx; }

.popup-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.type-selector { display: flex; gap: 16rpx; }

.type-option {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
  background: #fafafa;
}

.type-active { border-color: #1565C0; background: #e3f2fd; }
.type-text { font-size: 26rpx; color: #333; }
.type-active .type-text { color: #1565C0; font-weight: bold; }

.popup-input {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 30rpx;
  width: 100%;
  box-sizing: border-box;
}

.popup-preview {
  background: #f5f0ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
  border-left: 6rpx solid #1565C0;
}

.preview-label {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 8rpx;
}

.preview-formula { font-size: 26rpx; color: #1565C0; font-weight: bold; }

.popup-actions { display: flex; gap: 20rpx; }

.btn-pop-cancel {
  flex: 1;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  margin: 0;
}

.btn-pop-confirm {
  flex: 2;
  background: #1565C0;
  color: white;
  border: none;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin: 0;
}
</style>
