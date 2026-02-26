<template>
  <view class="container">
    <!-- Header -->
    <view class="header">
      <text class="title">📍 附近处理点</text>
      <navigator url="/pages/index/index" open-type="reLaunch" class="back-btn">返回主页</navigator>
    </view>

    <!-- Status Area -->
    <view class="location-status" :class="{ loading: isLoading }">
      <view v-if="isLoading" class="spinner"></view>
      <text class="status-text">{{ statusMessage }}</text>
      <text v-if="userLocation && !isLoading" class="sub-text">
        纬度: {{ userLocation.lat.toFixed(4) }}, 经度: {{ userLocation.lng.toFixed(4) }}
      </text>
      <view v-if="error" class="error-message">
        <text class="error-text">⚠️ {{ error }}</text>
        <view class="retry-btn" @click="init">重新加载</view>
      </view>
    </view>

    <!-- Recyclers List -->
    <view class="recyclers-grid" v-if="!isLoading && !error">
      <view v-if="recyclers.length === 0" class="empty-state">
        <text class="empty-title">😔 附近暂无处理点</text>
        <text class="empty-desc">请稍后再试或联系客服</text>
      </view>

      <view 
        v-for="(recycler, index) in recyclers" 
        :key="recycler.id" 
        class="recycler-card"
        @click="showRoute(index)"
      >
        <view class="recycler-header">
          <text class="recycler-name">{{ recycler.name }}</text>
          <view class="distance-badge">
            <text>{{ recycler.distance }} km</text>
          </view>
        </view>
        
        <view class="recycler-info">
          <view class="info-item">
            <text class="info-icon">📞</text>
            <text class="phone-number">{{ recycler.phone || '未提供' }}</text>
          </view>
          <view class="info-item">
            <text class="info-icon">📍</text>
            <text class="info-text">{{ recycler.address }}</text>
          </view>
          <view class="info-item">
            <text class="info-icon">🕒</text>
            <text class="info-text">{{ recycler.businessHours || '营业时间未知' }}</text>
          </view>
        </view>

        <view class="action-buttons">
          <view class="btn btn-call" @click.stop="callPhone(recycler.phone)">
            <text>📞 拨打电话</text>
          </view>
          <view class="btn btn-route" @click.stop="showRoute(index)">
            <text>🗺️ 查看路线</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Map Container (H5 Only for now, MP uses native map API) -->
    <!-- #ifdef H5 -->
    <view v-if="showMap" class="map-container">
      <view class="map-header">
        <text class="map-title">到 {{ currentDestination?.name }} 的路线</text>
        <view class="close-map-btn" @click="closeMap">关闭地图</view>
      </view>
      <view id="amap-container" class="map-view"></view>
      <view id="route-info" class="route-info"></view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import request from '@/utils/request';

// State
const isLoading = ref(true);
const statusMessage = ref('正在获取您的位置...');
const error = ref(null);
const userLocation = ref(null);
const recyclers = ref([]);

// Map State (H5)
const showMap = ref(false);
const currentDestination = ref(null);
let amapInstance = null;

// Initialize using Uni-app lifecycle
onLoad(() => {
  init();
});

const init = async () => {
  isLoading.value = true;
  error.value = null;
  statusMessage.value = '正在获取您的位置...';
  
  try {
    userLocation.value = await getLocation();
    statusMessage.value = '正在查找附近的处理点...';
    
    const data = await request.get('/recyclers/nearby', {
      lat: userLocation.value.lat,
      lng: userLocation.value.lng,
      limit: 5
    });
    
    recyclers.value = data || [];
    statusMessage.value = `✓ 找到 ${recyclers.value.length} 个附近的处理点`;
  } catch (err) {
    console.error('Init failed:', err);
    error.value = err.message || '加载失败，请检查网络或定位权限';
    statusMessage.value = '加载失败';
  } finally {
    isLoading.value = false;
  }
};

// Get Location (Cross-platform)
const getLocation = () => {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02', // Use GCJ02 for better map compatibility in China
      success: (res) => {
        resolve({
          lat: res.latitude,
          lng: res.longitude
        });
      },
      fail: (err) => {
        console.warn('Location failed, using default (Beijing)', err);
        // Fallback to Beijing
        resolve({ lat: 39.9042, lng: 116.4074 });
      }
    });
  });
};

// Call Phone
const callPhone = (phone) => {
  if (!phone || phone === '未提供') {
    uni.showToast({ title: '该处理点未提供联系电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: (err) => {
      console.error('Make phone call failed:', err);
    }
  });
};

// Show Route (Cross-platform handling)
const showRoute = (index) => {
  const destination = recyclers.value[index];
  if (!destination || !userLocation.value) return;

  // #ifdef MP-WEIXIN
  // Mini Program: Use native map navigation
  uni.openLocation({
    latitude: Number(destination.latitude),
    longitude: Number(destination.longitude),
    name: destination.name,
    address: destination.address,
    scale: 15
  });
  // #endif

  // #ifdef H5
  // Web: Use AMap JS API
  currentDestination.value = destination;
  showMap.value = true;
  
  // Need to wait for DOM to render the map container
  setTimeout(() => {
    initAMap(destination);
  }, 100);
  // #endif
};

// #ifdef H5
const closeMap = () => {
  showMap.value = false;
  currentDestination.value = null;
};

const initAMap = (destination) => {
  // Ensure AMap is loaded (You should include AMap script in index.html)
  if (!window.AMap) {
    uni.showToast({ title: '地图加载失败，请检查网络', icon: 'none' });
    return;
  }

  if (amapInstance) {
    amapInstance.clearMap();
  } else {
    amapInstance = new window.AMap.Map('amap-container', {
      zoom: 12,
      center: [userLocation.value.lng, userLocation.value.lat]
    });
  }

  // Start Marker
  const startMarker = new window.AMap.Marker({
    position: [userLocation.value.lng, userLocation.value.lat],
    title: '您的位置'
  });
  amapInstance.add(startMarker);

  // End Marker
  const endMarker = new window.AMap.Marker({
    position: [destination.longitude, destination.latitude],
    title: destination.name
  });
  amapInstance.add(endMarker);

  // Driving Route
  window.AMap.plugin('AMap.Driving', function() {
    const driving = new window.AMap.Driving({
      map: amapInstance,
      panel: 'route-info'
    });

    driving.search(
      [userLocation.value.lng, userLocation.value.lat],
      [destination.longitude, destination.latitude],
      function(status, result) {
        if (status !== 'complete') {
          console.error('Route planning failed', result);
          uni.showToast({ title: '路线规划失败', icon: 'none' });
        }
      }
    );
  });
};
// #endif
</script>

<style scoped>
/* Using rpx for responsive sizing across platforms */
.container {
  min-height: 100vh;
  background-color: #FAFAF5;
  padding: 40rpx 20rpx;
  box-sizing: border-box;
}

.header {
  background: rgba(255, 255, 255, 0.8);
  padding: 30rpx 40rpx;
  border-radius: 24rpx;
  box-shadow: 0 10rpx 40rpx rgba(46, 125, 50, 0.08);
  margin-bottom: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  color: #2E7D32;
  font-size: 40rpx;
  font-weight: bold;
}

.back-btn {
  padding: 12rpx 30rpx;
  color: #2E7D32;
  border: 2rpx solid #2E7D32;
  border-radius: 50rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.location-status {
  background: rgba(255, 255, 255, 0.7);
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 40rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-text {
  color: #2E7D32;
  font-size: 32rpx;
  margin-top: 10rpx;
}

.sub-text {
  color: #666;
  font-size: 24rpx;
  margin-top: 10rpx;
}

.spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(46, 125, 50, 0.2);
  border-radius: 50%;
  border-top-color: #2E7D32;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: #FFF8E1;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-top: 20rpx;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

.error-text {
  color: #795548;
  font-size: 28rpx;
}

.retry-btn {
  background: #27ae60;
  color: white;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.recyclers-grid {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.recycler-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}

.recycler-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.recycler-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #1B3A24;
}

.distance-badge {
  background: rgba(239, 108, 0, 0.1);
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
}

.distance-badge text {
  color: #EF6C00;
  font-size: 24rpx;
  font-weight: bold;
}

.recycler-info {
  margin: 20rpx 0;
}

.info-item {
  display: flex;
  align-items: center;
  margin: 12rpx 0;
}

.info-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.phone-number {
  font-size: 30rpx;
  font-weight: 600;
  color: #2E7D32;
}

.info-text {
  font-size: 28rpx;
  color: #45664E;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 12rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn text {
  font-size: 28rpx;
  font-weight: 600;
}

.btn-call {
  border: 2rpx solid #2E7D32;
}

.btn-call text {
  color: #2E7D32;
}

.btn-route {
  background: linear-gradient(135deg, #2E7D32, #66BB6A);
}

.btn-route text {
  color: white;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-title {
  font-size: 40rpx;
  color: #EF6C00;
  display: block;
  margin-bottom: 20rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #666;
}

/* Map Styles (H5) */
.map-container {
  background: white;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-top: 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(46, 125, 50, 0.08);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #eee;
}

.map-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
}

.close-map-btn {
  padding: 10rpx 24rpx;
  background: #fff0f0;
  color: #d32f2f;
  border-radius: 50rpx;
  font-size: 26rpx;
}

.map-view {
  width: 100%;
  height: 600rpx;
  border-radius: 16rpx;
}

.route-info {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}
</style>
