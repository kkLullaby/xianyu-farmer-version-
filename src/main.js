import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  // Uni-app 在 Vue 3 下必须使用 createSSRApp
  const app = createSSRApp(App)
  return {
    app
  }
}