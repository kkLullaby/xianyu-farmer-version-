"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const userInfo = common_vendor.ref({
      name: "处理商企业",
      role: "processor"
    });
    const roleNameMap = {
      farmer: "农户朋友",
      merchant: "回收商老板",
      processor: "处理商企业",
      admin: "管理员"
    };
    common_vendor.onShow(() => {
      const role = common_vendor.index.getStorageSync("current_role") || "processor";
      userInfo.value.role = role;
      userInfo.value.name = roleNameMap[role] || "处理商企业";
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
        b: common_vendor.o(($event) => navigateTo("/pages/processor/orders/index")),
        c: common_vendor.o(($event) => navigateTo("/pages/processor/intentions/index")),
        d: common_vendor.o(($event) => navigateTo("/pages/processor/demand/publish")),
        e: common_vendor.o(($event) => navigateTo("/pages/processor/supply/index")),
        f: common_vendor.o(($event) => navigateTo("/pages/processor/arbitration/index")),
        g: common_vendor.o(($event) => navigateTo("/pages/profile/index"))
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-60f6a030"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/dashboard/index.vue"]]);
wx.createPage(MiniProgramPage);
