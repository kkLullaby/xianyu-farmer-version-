"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "detail",
  setup(__props) {
    const report = common_vendor.ref({});
    const statusText = {
      pending: "待审核",
      approved: "已通过",
      rejected: "已驳回",
      draft: "草稿"
    };
    const statusIcon = {
      pending: "⏳",
      approved: "✅",
      rejected: "❌",
      draft: "📝"
    };
    common_vendor.onLoad((options) => {
      if (!options || !options.id)
        return;
      const id = options.id;
      const globalList = common_vendor.index.getStorageSync("global_report_list") || [];
      const found = globalList.find((item) => String(item.id) === String(id));
      if (found) {
        report.value = found;
      } else {
        report.value = {
          id,
          goods_type: "未知品种",
          weight: "—",
          address: "—",
          pickup_date: "—",
          status: "pending",
          create_time: "—"
        };
      }
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(statusIcon[report.value.status] || "⏳"),
        b: common_vendor.t(statusText[report.value.status] || "待处理"),
        c: common_vendor.n("banner-" + (report.value.status || "pending")),
        d: common_vendor.t(report.value.id),
        e: common_vendor.t(report.value.goods_type || "—"),
        f: common_vendor.t(report.value.weight),
        g: common_vendor.t(report.value.address || "—"),
        h: common_vendor.t(report.value.pickup_date || "—"),
        i: report.value.notes
      }, report.value.notes ? {
        j: common_vendor.t(report.value.notes)
      } : {}, {
        k: common_vendor.t(report.value.create_time || "—"),
        l: common_vendor.n(report.value.status !== "pending" ? "done-dot" : "pending-dot"),
        m: report.value.status === "approved"
      }, report.value.status === "approved" ? {} : report.value.status === "rejected" ? {} : {}, {
        n: report.value.status === "rejected",
        o: common_vendor.n(report.value.status !== "pending" ? "done" : "pending"),
        p: common_vendor.n(report.value.status === "approved" ? "done-dot" : "pending-dot"),
        q: common_vendor.t(report.value.status === "approved" ? "已开放对接" : "等待审核通过"),
        r: common_vendor.n(report.value.status === "approved" ? "done" : "pending"),
        s: common_vendor.o(($event) => _ctx.uni.navigateBack())
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-3fe1e48e"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/report/detail.vue"]]);
wx.createPage(MiniProgramPage);
