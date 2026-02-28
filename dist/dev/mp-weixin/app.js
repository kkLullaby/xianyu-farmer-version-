"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/login/index.js";
  "./pages/profile/index.js";
  "./pages/index/article.js";
  "./pages/profile/address/list.js";
  "./pages/profile/address/edit.js";
  "./pages/profile/intentions/index.js";
  "./pages/farmer/dashboard/index.js";
  "./pages/farmer/report/create.js";
  "./pages/farmer/report/list.js";
  "./pages/farmer/nearby/index.js";
  "./pages/farmer/demand-hall/index.js";
  "./pages/farmer/supply/index.js";
  "./pages/farmer/arbitration/index.js";
  "./pages/farmer/report/detail.js";
  "./pages/merchant/dashboard/index.js";
  "./pages/merchant/demand/publish.js";
  "./pages/merchant/orders/index.js";
  "./pages/merchant/finance/index.js";
  "./pages/merchant/arbitration/index.js";
  "./pages/merchant/orders/detail.js";
  "./pages/merchant/intentions/index.js";
  "./pages/admin/dashboard/index.js";
  "./pages/admin/users/index.js";
  "./pages/admin/audit/index.js";
  "./pages/admin/cms/index.js";
  "./pages/admin/cms/edit.js";
  "./pages/admin/arbitration/index.js";
  "./pages/admin/settings/index.js";
  "./pages/admin/statistics/index.js";
  "./pages/processor/dashboard/index.js";
  "./pages/processor/demand/publish.js";
  "./pages/processor/supply/index.js";
  "./pages/processor/orders/index.js";
  "./pages/processor/arbitration/index.js";
  "./pages/processor/orders/detail.js";
  "./pages/processor/intentions/index.js";
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
