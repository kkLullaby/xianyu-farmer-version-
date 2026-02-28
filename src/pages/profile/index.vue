<template>
  <view class="container">
    <view class="profile-header">
      <image class="avatar" :src="userInfo.avatar" mode="aspectFill"></image>
      <view class="info-right">
        <text class="nickname">{{ userInfo.nickname }}</text>
        <view class="tags">
          <text class="tag role-tag" :class="'role-' + userInfo.role">
            {{ userInfo.role === 'farmer' ? '🟢' : userInfo.role === 'merchant' ? '🟠' : '🔵' }} {{ userInfo.roleName }}
          </text>
          <text class="tag realname-tag" v-if="userInfo.isRealName">✅ 已实名</text>
          <text class="tag unverified-tag" v-else>❌ 未实名</text>
        </view>
      </view>
    </view>

    <view class="wallet-card">
      <view class="wallet-header">
        <text class="wallet-title">我的钱包</text>
        <view class="wallet-link" @click="handleComingSoon">
          <text>账单明细</text>
          <text class="arrow">></text>
        </view>
      </view>
      <view class="wallet-body">
        <view class="wallet-item">
          <text class="wallet-label">账户余额 (元)</text>
          <text class="wallet-value highlight">{{ userInfo.balance }}</text>
        </view>
        <view class="wallet-divider"></view>
        <view class="wallet-item">
          <text class="wallet-label">待结算 (元)</text>
          <text class="wallet-value">{{ userInfo.pendingAmount }}</text>
        </view>
      </view>
    </view>

    <view class="business-section">
      <view class="list-item" @click="goToAddress">
        <view class="item-content">
          <text class="item-title">📍 地址管理</text>
          <text class="item-desc">管理收发货与果园/厂区地址</text>
        </view>
        <text class="arrow">></text>
      </view>
      <view class="list-item" @click="goToIntentions">
        <view class="item-content">
          <text class="item-title">📨 我的意向</text>
          <text class="item-desc">查看已发起的所有报价意向及状态</text>
        </view>
        <text class="arrow">></text>
      </view>
      <view class="list-item" @click="handleComingSoon">
        <view class="item-content">
          <text class="item-title">⭐ 我的收藏</text>
          <text class="item-desc">关注的优质买家/卖家</text>
        </view>
        <text class="arrow">></text>
      </view>
    </view>

    <view class="service-section">
      <view class="list-item" @click="handleComingSoon">
        <view class="item-content">
          <text class="item-title">🛡️ 资质与安全</text>
          <text class="item-desc">修改密码、上传营业执照/实名证件</text>
        </view>
        <text class="arrow">></text>
      </view>
      <view class="list-item" @click="callAdmin">
        <view class="item-content">
          <text class="item-title">🎧 联系平台客服</text>
          <text class="item-desc">工作时间：9:00 - 18:00</text>
        </view>
        <text class="arrow">></text>
      </view>
      <view class="list-item" @click="handleComingSoon">
        <view class="item-content">
          <text class="item-title">📜 规则与协议</text>
          <text class="item-desc">用户协议、隐私政策与交易规则</text>
        </view>
        <text class="arrow">></text>
      </view>
    </view>

    <button class="logout-btn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const userInfo = ref({
  avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
  nickname: '张三',
  role: 'farmer',
  roleName: '认证农户',
  isRealName: true,
  balance: '8500.00',
  pendingAmount: '1200.00'
});

onShow(() => {
  const currentRole = uni.getStorageSync('current_role') || 'farmer';
  
  switch (currentRole) {
    case 'merchant':
      userInfo.value = {
        avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        nickname: '李老板',
        role: 'merchant',
        roleName: '优选回收商',
        isRealName: true,
        balance: '24000.00',
        pendingAmount: '3500.00'
      };
      break;
    case 'processor':
      userInfo.value = {
        avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        nickname: '新会处理厂',
        role: 'processor',
        roleName: '官方处理商',
        isRealName: true,
        balance: '50000.00',
        pendingAmount: '12000.00'
      };
      break;
    case 'admin':
      userInfo.value = {
        avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        nickname: '管理员',
        role: 'admin',
        roleName: '系统管理员',
        isRealName: true,
        balance: '0.00',
        pendingAmount: '0.00'
      };
      break;
    case 'farmer':
    default:
      userInfo.value = {
        avatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        nickname: '张三',
        role: 'farmer',
        roleName: '认证农户',
        isRealName: true,
        balance: '8500.00',
        pendingAmount: '1200.00'
      };
      break;
  }
});

const goToAddress = () => {
  uni.navigateTo({ url: '/pages/profile/address/list' });
};

const goToIntentions = () => {
  uni.navigateTo({ url: '/pages/profile/intentions/index' });
};

const handleComingSoon = () => {
  uni.showToast({ title: '该功能将在正式版开放', icon: 'none' });
};

const callAdmin = () => {
  uni.makePhoneCall({
    phoneNumber: '400-888-6688',
    fail: () => {
      uni.showToast({
        title: '拨打失败，请重试',
        icon: 'none'
      });
    }
  });
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync();
        uni.reLaunch({
          url: '/pages/login/index'
        });
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding: 30rpx;
  padding-bottom: 60rpx;
}

.profile-header {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  padding: 40rpx 30rpx;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 30rpx;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  margin-right: 32rpx;
  background-color: #EEEEEE;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
}

.info-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

.tags {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
}

.role-tag {
  font-weight: bold;
}

.role-farmer {
  background-color: #E8F5E9;
  color: #2E7D32;
}

.role-merchant {
  background-color: #FFF3E0;
  color: #EF6C00;
}

.role-processor {
  background-color: #E3F2FD;
  color: #1565C0;
}

.realname-tag {
  background-color: #F0FDF4;
  color: #1B5E20;
}

.unverified-tag {
  background-color: #FFEBEE;
  color: #C62828;
}

/* 钱包卡片 */
.wallet-card {
  background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
  border-radius: 24rpx;
  padding: 30rpx 40rpx;
  color: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(46, 125, 50, 0.2);
  margin-bottom: 30rpx;
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.wallet-title {
  font-size: 30rpx;
  font-weight: bold;
  opacity: 0.9;
}

.wallet-link {
  font-size: 24rpx;
  opacity: 0.8;
  display: flex;
  align-items: center;
}

.wallet-body {
  display: flex;
  align-items: center;
}

.wallet-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.wallet-label {
  font-size: 24rpx;
  opacity: 0.8;
  margin-bottom: 10rpx;
}

.wallet-value {
  font-size: 36rpx;
  font-weight: bold;
}

.wallet-value.highlight {
  font-size: 48rpx;
}

.wallet-divider {
  width: 2rpx;
  height: 60rpx;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0 40rpx;
}

/* 业务管理列表 */
.business-section, .service-section {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
  margin-bottom: 30rpx;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 2rpx solid #F0F0F0;
}

.list-item:last-child {
  border-bottom: none;
}

.item-content {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 8rpx;
}

.item-desc {
  font-size: 24rpx;
  color: #999999;
}

.arrow {
  color: #CCCCCC;
  font-size: 32rpx;
  margin-left: 10rpx;
}

/* 退出登录按钮 */
.logout-btn {
  margin-top: 60rpx;
  background-color: #FFFFFF;
  color: #E53935;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 24rpx;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.logout-btn::after {
  border: none;
}
</style>