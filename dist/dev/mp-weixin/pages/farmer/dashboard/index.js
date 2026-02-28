"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const userInfo = common_vendor.ref({
      name: "农户朋友",
      role: "farmer"
    });
    const roleNameMap = {
      farmer: "农户朋友",
      merchant: "回收商老板",
      processor: "处理商企业",
      admin: "管理员"
    };
    common_vendor.onShow(() => {
      const role = common_vendor.index.getStorageSync("current_role") || "farmer";
      userInfo.value.role = role;
      userInfo.value.name = roleNameMap[role] || "农户朋友";
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
        b: common_vendor.o(($event) => navigateTo("/pages/farmer/report/create")),
        c: common_vendor.o(($event) => navigateTo("/pages/farmer/report/list")),
        d: common_vendor.o(($event) => navigateTo("/pages/farmer/demand-hall/index")),
        e: common_vendor.o(($event) => navigateTo("/pages/farmer/supply/index")),
        f: common_vendor.o(($event) => navigateTo("/pages/farmer/nearby/index")),
        g: common_vendor.o(($event) => navigateTo("/pages/farmer/arbitration/index")),
        h: common_vendor.o(($event) => navigateTo("/pages/profile/index"))
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-33894e55"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/dashboard/index.vue"]]);
wx.createPage(MiniProgramPage);
