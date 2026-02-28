"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const intentionList = common_vendor.ref([]);
    const statusLabel = {
      pending: "待确认",
      accepted: "已转订单",
      rejected: "已拒绝"
    };
    common_vendor.onShow(() => {
      const list = common_vendor.index.getStorageSync("global_intentions") || [];
      intentionList.value = list.slice().reverse();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(intentionList.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.target_name),
            b: common_vendor.t(statusLabel[item.status]),
            c: common_vendor.n("status-" + item.status),
            d: common_vendor.t(item.price),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.date),
            g: common_vendor.t(item.create_time),
            h: item.id || index
          };
        }),
        b: intentionList.value.length === 0
      }, intentionList.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-8208bda3"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/profile/intentions/index.vue"]]);
wx.createPage(MiniProgramPage);
