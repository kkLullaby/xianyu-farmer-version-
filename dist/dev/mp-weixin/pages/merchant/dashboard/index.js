"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const userInfo = common_vendor.ref({
      name: "测试回收商",
      role: "merchant"
    });
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({
        url,
        fail: () => common_vendor.index.showToast({ title: "页面跳转失败", icon: "none" })
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(userInfo.value.name),
        b: common_vendor.o(($event) => navigateTo("/pages/merchant/orders/index")),
        c: common_vendor.o(($event) => navigateTo("/pages/merchant/demand/publish")),
        d: common_vendor.o(($event) => navigateTo("/pages/processor/supply/index")),
        e: common_vendor.o(($event) => navigateTo("/pages/processor/orders/index")),
        f: common_vendor.o(($event) => navigateTo("/pages/merchant/arbitration/index")),
        g: common_vendor.o(($event) => navigateTo("/pages/profile/index"))
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7bd6a976"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/dashboard/index.vue"]]);
wx.createPage(MiniProgramPage);
