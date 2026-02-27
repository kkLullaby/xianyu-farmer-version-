<template>
  <view class="container">
    <view class="header">
      <text class="title">附近的柑橘果肉回收点</text>
    </view>

    <map 
      class="map-area"
      :latitude="latitude" 
      :longitude="longitude" 
      :markers="markers"
      scale="12"
    ></map>

    <view class="list-container">
      <view class="recycler-card" v-for="(item, index) in recyclers" :key="index">
        <view class="info">
          <text class="name">{{ item.name }}</text>
          <text class="address">{{ item.address }}</text>
          <text class="distance">距离您: {{ item.distance }} km</text>
        </view>
        <button class="call-btn" size="mini" @click="callPhone(item.phone)">联系</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const latitude = ref(22.543099)
const longitude = ref(114.057868)

const markers = ref([
  {
    id: 1,
    latitude: 22.543099,
    longitude: 114.057868,
    title: '您的位置'
  }
])

const recyclers = ref([
  { 
    name: '绿源农业废弃物处理厂', 
    address: 'xx镇xx路1号',
    distance: 2.5, 
    phone: '13800138000' 
  },
  { 
    name: '循果环保科技回收站', 
    address: 'xx区xx工业园',
    distance: 5.2, 
    phone: '13900139000' 
  }
])

const callPhone = (phoneNumber) => {
  uni.makePhoneCall({
    phoneNumber: phoneNumber
  })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 20rpx;
}
.header {
  padding: 20rpx 0;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}
.map-area {
  width: 100%;
  height: 500rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}
.recycler-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.name {
  font-size: 32rpx;
  font-weight: bold;
  color: #2E7D32;
  margin-bottom: 10rpx;
}
.address {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}
.distance {
  font-size: 24rpx;
  color: #FF8C00;
}
.call-btn {
  background-color: #2E7D32;
  color: white;
  margin: 0;
}
</style>