"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const userInfo = common_vendor.ref({
      name: "测试管理员",
      role: "admin"
    });
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({
        url,
        fail: () => common_vendor.index.showToast({ title: "页面跳转失败", icon: "none" })
      });
    };
    const showToast = (msg) => {
      common_vendor.index.showToast({ title: msg, icon: "none" });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(userInfo.value.name),
        b: common_vendor.o(($event) => navigateTo("/pages/admin/users/index")),
        c: common_vendor.o(($event) => navigateTo("/pages/admin/audit/index")),
        d: common_vendor.o(($event) => showToast("数据统计功能建设中")),
        e: common_vendor.o(($event) => navigateTo("/pages/admin/cms/index")),
        f: common_vendor.o(($event) => navigateTo("/pages/admin/arbitration/index")),
        g: common_vendor.o(($event) => navigateTo("/pages/admin/settings/index"))
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-23ab96ab"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/dashboard/index.vue"]]);
wx.createPage(MiniProgramPage);
