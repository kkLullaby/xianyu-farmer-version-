<template>
  <view class="container">
    <view class="header">
      <text class="title">⚙️ 系统设置</text>
      <text class="desc">查看运行配置、安全策略与第三方集成状态</text>
    </view>

    <view class="toolbar">
      <button class="btn-refresh" @click="refreshSnapshot" :disabled="loading">
        {{ loading ? '刷新中…' : '刷新状态' }}
      </button>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">正在读取系统配置…</text>
    </view>

    <view v-else-if="fetchError" class="state-card error-card">
      <text class="state-text">{{ fetchError }}</text>
    </view>

    <view v-else class="content-area">
      <view class="panel">
        <text class="panel-title">🔐 安全策略</text>
        <view class="kv-row" v-for="item in securityItems" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value" :class="item.statusClass">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">🧩 集成配置</text>
        <view class="kv-row" v-for="item in integrationItems" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value" :class="item.statusClass">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">🖥️ 运行时</text>
        <view class="kv-row" v-for="item in runtimeItems" :key="item.key">
          <text class="kv-label">{{ item.label }}</text>
          <text class="kv-value">{{ item.value }}</text>
        </view>
      </view>

      <view class="panel risk-panel">
        <text class="panel-title">⚠️ 仍需收敛项</text>
        <view v-if="pendingRisks.length === 0" class="risk-empty">
          <text class="risk-text ok-text">当前无待收敛项</text>
        </view>
        <view v-else class="risk-list">
          <text class="risk-text" v-for="(risk, idx) in pendingRisks" :key="idx">• {{ risk }}</text>
        </view>
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
const snapshot = ref({
  runtime: {},
  security: {},
  integrations: {}
});

const toStatusText = (value) => (value ? '已启用' : '未启用');
const toStatusClass = (value) => (value ? 'ok-text' : 'warn-text');

const securityItems = computed(() => {
  const security = snapshot.value.security || {};
  return [
    {
      key: 'jwt_from_env',
      label: 'JWT 环境变量',
      value: toStatusText(Boolean(security.jwt_from_env)),
      statusClass: toStatusClass(Boolean(security.jwt_from_env))
    },
    {
      key: 'hsts_enabled',
      label: 'HSTS',
      value: toStatusText(Boolean(security.hsts_enabled)),
      statusClass: toStatusClass(Boolean(security.hsts_enabled))
    },
    {
      key: 'x_content_type_options',
      label: 'X-Content-Type-Options',
      value: toStatusText(Boolean(security.x_content_type_options)),
      statusClass: toStatusClass(Boolean(security.x_content_type_options))
    },
    {
      key: 'x_frame_options',
      label: 'X-Frame-Options',
      value: toStatusText(Boolean(security.x_frame_options)),
      statusClass: toStatusClass(Boolean(security.x_frame_options))
    },
    {
      key: 'csp_configured',
      label: 'CSP',
      value: toStatusText(Boolean(security.csp_configured)),
      statusClass: toStatusClass(Boolean(security.csp_configured))
    },
    {
      key: 'bcrypt_rounds',
      label: 'Bcrypt 轮数',
      value: String(security.bcrypt_rounds || 10),
      statusClass: 'info-text'
    }
  ];
});

const integrationItems = computed(() => {
  const integrations = snapshot.value.integrations || {};
  const security = snapshot.value.security || {};
  return [
    {
      key: 'sms_provider',
      label: '短信通道',
      value: integrations.sms_provider || 'auto',
      statusClass: 'info-text'
    },
    {
      key: 'sms_aliyun_configured',
      label: '阿里云短信配置',
      value: toStatusText(Boolean(integrations.sms_aliyun_configured)),
      statusClass: toStatusClass(Boolean(integrations.sms_aliyun_configured))
    },
    {
      key: 'sms_mock_mode',
      label: '短信 Mock 模式',
      value: integrations.sms_mock_mode ? '是' : '否',
      statusClass: integrations.sms_mock_mode ? 'warn-text' : 'ok-text'
    },
    {
      key: 'amap_configured',
      label: '高德地图 Key',
      value: toStatusText(Boolean(integrations.amap_configured)),
      statusClass: toStatusClass(Boolean(integrations.amap_configured))
    },
    {
      key: 'cors_allowlist_count',
      label: 'CORS 白名单数量',
      value: String(security.cors_allowlist_count || 0),
      statusClass: 'info-text'
    }
  ];
});

const runtimeItems = computed(() => {
  const runtime = snapshot.value.runtime || {};
  return [
    { key: 'node_env', label: '运行环境', value: runtime.node_env || 'development' },
    { key: 'port', label: '服务端口', value: String(runtime.port || 4000) },
    { key: 'updated_at', label: '采集时间', value: new Date().toLocaleString('zh-CN') }
  ];
});

const pendingRisks = computed(() => {
  const security = snapshot.value.security || {};
  const integrations = snapshot.value.integrations || {};
  const risks = [];

  if (!security.csp_configured) risks.push('全局 CSP 仍未配置。');
  if (!security.referrer_policy_configured) risks.push('Referrer-Policy 未配置。');
  if (!security.permissions_policy_configured) risks.push('Permissions-Policy 未配置。');
  if (integrations.sms_mock_mode) risks.push('当前短信通道可降级 Mock，生产需锁定真实通道。');

  return risks;
});

const refreshSnapshot = async () => {
  loading.value = true;
  fetchError.value = '';
  try {
    const data = await request.get('/api/admin/settings/runtime');
    snapshot.value = {
      runtime: data?.runtime || {},
      security: data?.security || {},
      integrations: data?.integrations || {}
    };
  } catch (err) {
    fetchError.value = err?.message || '读取系统配置失败';
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
    await refreshSnapshot();
  } catch (err) {
    fetchError.value = err?.message || '管理员身份校验失败';
  }
});
</script>

<style scoped>
.container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #FAFAF5;
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

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20rpx;
}

.btn-refresh {
  background: #1565C0;
  color: #fff;
  border-radius: 12rpx;
  font-size: 24rpx;
  padding: 0 24rpx;
}

.state-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.error-card {
  border-left: 8rpx solid #E53935;
}

.state-text {
  font-size: 26rpx;
  color: #666;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.panel-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1B3A24;
  display: block;
  margin-bottom: 18rpx;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-label {
  font-size: 25rpx;
  color: #666;
}

.kv-value {
  font-size: 25rpx;
  font-weight: 600;
  color: #333;
}

.risk-panel {
  border-left: 8rpx solid #FFB300;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.risk-text {
  font-size: 24rpx;
  color: #8d6e63;
}

.risk-empty {
  padding: 10rpx 0;
}

.ok-text {
  color: #2E7D32;
}

.warn-text {
  color: #E65100;
}

.info-text {
  color: #1565C0;
}
</style>
