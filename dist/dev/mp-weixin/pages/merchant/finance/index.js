"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const transactions = common_vendor.ref([
      { id: 1, type: "income", title: "订单结算 - ORD20240320001", date: "2024-03-20 16:30", amount: "500.00" },
      { id: 2, type: "expense", title: "提现至微信零钱", date: "2024-03-19 10:00", amount: "2000.00" },
      { id: 3, type: "income", title: "订单结算 - ORD20240318002", date: "2024-03-18 11:20", amount: "800.00" },
      { id: 4, type: "income", title: "订单结算 - ORD20240315005", date: "2024-03-15 09:45", amount: "1200.00" }
    ]);
    const handleWithdraw = () => {
      common_vendor.index.showToast({
        title: "该功能将在正式版开放",
        icon: "none"
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.o(handleWithdraw),
        b: common_vendor.f(transactions.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.type === "income" ? "收" : "支"),
            b: common_vendor.n(item.type === "income" ? "icon-income" : "icon-expense"),
            c: common_vendor.t(item.title),
            d: common_vendor.t(item.date),
            e: common_vendor.t(item.type === "income" ? "+" : "-"),
            f: common_vendor.t(item.amount),
            g: common_vendor.n(item.type === "income" ? "text-green" : "text-red"),
            h: item.id
          };
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1d4e0cfe"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/finance/index.vue"]]);
wx.createPage(MiniProgramPage);
