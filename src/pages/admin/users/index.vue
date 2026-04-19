<template>
  <view class="container">
    <view class="header">
      <text class="title">👥 用户管理</text>
      <text class="desc">查看平台用户、角色结构与基础业务活跃度</text>
    </view>

    <view class="search-card">
      <input
        v-model.trim="keyword"
        class="search-input"
        placeholder="搜索用户名/姓名/手机号…"
        @confirm="loadUsers"
      />
      <button class="btn-refresh" @click="loadUsers" :disabled="loading">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </view>

    <view class="role-tabs">
      <view
        v-for="item in roleTabs"
        :key="item.value"
        class="role-tab"
        :class="{ active: selectedRole === item.value }"
        @click="selectedRole = item.value"
      >
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view class="stats-grid">
      <view class="stat-card" v-for="item in roleSummary" :key="item.key">
        <text class="stat-label">{{ item.label }}</text>
        <text class="stat-value">{{ item.value }}</text>
      </view>
    </view>

    <view v-if="fetchError" class="state-card error-card">
      <text class="state-text">{{ fetchError }}</text>
    </view>

    <view v-else-if="loading" class="state-card">
      <text class="state-text">用户数据加载中…</text>
    </view>

    <view v-else class="list-container">
      <view class="user-card" v-for="item in filteredUsers" :key="item.id">
        <view class="card-header">
          <view>
            <text class="name">{{ item.full_name || item.username || '未命名用户' }}</text>
            <text class="username">@{{ item.username || '-' }}</text>
          </view>
          <text class="role-tag" :class="`role-${item.role_label}`">{{ roleLabel(item.role_label) }}</text>
        </view>

        <view class="meta-row">
          <text class="meta-item">手机号：{{ item.phone || '-' }}</text>
          <text class="meta-item">邮箱：{{ item.email || '-' }}</text>
        </view>

        <view class="metrics-row">
          <view class="metric-pill">
            <text class="pill-label">申报</text>
            <text class="pill-value">{{ item.farmer_report_count || 0 }}</text>
          </view>
          <view class="metric-pill">
            <text class="pill-label">回收求购</text>
            <text class="pill-value">{{ item.recycler_request_count || 0 }}</text>
          </view>
          <view class="metric-pill">
            <text class="pill-label">处理求购</text>
            <text class="pill-value">{{ item.processor_request_count || 0 }}</text>
          </view>
          <view class="metric-pill">
            <text class="pill-label">订单</text>
            <text class="pill-value">{{ item.order_count || 0 }}</text>
          </view>
        </view>

        <text class="created-at">注册时间：{{ formatDate(item.created_at) }}</text>
      </view>

      <view class="state-card" v-if="filteredUsers.length === 0">
        <text class="state-text">当前筛选条件下暂无用户</text>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import request from '@/utils/request.js';
import { roleAllowed, syncSessionFromServer } from '@/utils/session';

const users = ref([]);
const loading = ref(false);
const fetchError = ref('');
const keyword = ref('');
const selectedRole = ref('all');

const roleTabs = [
  { label: '全部', value: 'all' },
  { label: '农户', value: 'farmer' },
  { label: '回收商', value: 'merchant' },
  { label: '处理商', value: 'processor' },
  { label: '管理员', value: 'admin' }
];

const roleLabel = (role) => {
  const map = {
    admin: '管理员',
    farmer: '农户',
    merchant: '回收商',
    recycler: '回收商',
    processor: '处理商'
  };
  return map[role] || role;
};

const formatDate = (value) => {
  if (!value) return '-';
  return String(value).replace('T', ' ').replace(/\.\d+Z$/, '');
};

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

const filteredUsers = computed(() => {
  return users.value.filter((item) => {
    if (selectedRole.value !== 'all' && item.role_label !== selectedRole.value) {
      return false;
    }

    if (!normalizedKeyword.value) {
      return true;
    }

    const text = [
      item.username,
      item.full_name,
      item.phone,
      item.email
    ].filter(Boolean).join(' ').toLowerCase();

    return text.includes(normalizedKeyword.value);
  });
});

const roleSummary = computed(() => {
  const source = users.value;
  const countBy = (role) => source.filter((item) => item.role_label === role).length;
  return [
    { key: 'all', label: '总用户', value: source.length },
    { key: 'farmer', label: '农户', value: countBy('farmer') },
    { key: 'merchant', label: '回收商', value: countBy('merchant') },
    { key: 'processor', label: '处理商', value: countBy('processor') },
    { key: 'admin', label: '管理员', value: countBy('admin') }
  ];
});

const loadUsers = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const query = new URLSearchParams({ page: '1', page_size: '200' });
    if (keyword.value.trim()) {
      query.set('keyword', keyword.value.trim());
    }

    const data = await request.get(`/api/admin/users?${query.toString()}`);
    users.value = (data?.items || []).map((item) => ({
      ...item,
      role_label: item.role_label || item.role || 'unknown'
    }));
  } catch (err) {
    users.value = [];
    fetchError.value = err?.message || '用户列表加载失败';
  } finally {
    loading.value = false;
  }
};

onShow(async () => {
  try {
    const me = await syncSessionFromServer();
    if (!roleAllowed(me.role, 'admin', false)) {
      uni.showToast({ title: '仅管理员可访问', icon: 'none' });
      return uni.reLaunch({ url: '/pages/index/index' });
    }
    await loadUsers();
  } catch (err) {
    fetchError.value = err?.message || '管理员身份校验失败';
  }
});
</script>
<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background: #FAFAF5;
}

.header {
  margin-bottom: 24rpx;
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

.search-card {
  display: flex;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
  border: 2rpx solid #e0e0e0;
}

.btn-refresh {
  background: #1565C0;
  color: #fff;
  border-radius: 12rpx;
  font-size: 24rpx;
  padding: 0 20rpx;
}

.role-tabs {
  display: flex;
  gap: 10rpx;
  overflow-x: auto;
  margin-bottom: 18rpx;
}

.role-tab {
  white-space: nowrap;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #666;
  font-size: 24rpx;
}

.role-tab.active {
  background: #1565C0;
  color: #fff;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.stat-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 14rpx;
  text-align: center;
}

.stat-label {
  font-size: 21rpx;
  color: #888;
  display: block;
  margin-bottom: 6rpx;
}

.stat-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #1B3A24;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.user-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.name {
  font-size: 30rpx;
  color: #1B3A24;
  font-weight: bold;
  display: block;
}

.username {
  font-size: 22rpx;
  color: #999;
}

.role-tag {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  color: #fff;
}

.role-admin { background: #546E7A; }
.role-farmer { background: #2E7D32; }
.role-merchant { background: #EF6C00; }
.role-recycler { background: #EF6C00; }
.role-processor { background: #7B1FA2; }

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-bottom: 12rpx;
}

.meta-item {
  font-size: 23rpx;
  color: #666;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.metric-pill {
  background: #f7f9fc;
  border-radius: 10rpx;
  padding: 10rpx;
  text-align: center;
}

.pill-label {
  font-size: 20rpx;
  color: #888;
  display: block;
}

.pill-value {
  font-size: 24rpx;
  color: #1565C0;
  font-weight: bold;
}

.created-at {
  font-size: 22rpx;
  color: #999;
}

.state-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.error-card {
  border-left: 8rpx solid #E53935;
}

.state-text {
  font-size: 25rpx;
  color: #666;
}
</style>
