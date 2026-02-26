<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch - 柑橘回收平台启动')
})

onShow(() => {
  console.log('App Show - 农户端切入前台')
})

onHide(() => {
  console.log('App Hide - 农户端切入后台')
})
</script>

<style>
/* 微信小程序的全局样式，统一浅灰底色 */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei',
    sans-serif;
}
</style>