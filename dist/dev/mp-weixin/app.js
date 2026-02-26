"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/profile/index.js";
  "./pages/farmer/nearby/index.js";
}
const _sfc_main = {
  __name: "App",
  setup(__props) {
    common_vendor.onLaunch(() => {
      console.log("App Launch - 柑橘回收平台启动");
    });
    common_vendor.onShow(() => {
      console.log("App Show - 农户端切入前台");
    });
    common_vendor.onHide(() => {
      console.log("App Hide - 农户端切入后台");
    });
    return () => {
    };
  }
};
const App = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/App.vue"]]);
function createApp() {
  const app = common_vendor.createSSRApp(App);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
