"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "list",
  setup(__props) {
    const originalMockList = [
      {
        id: "RPT-20240315-001",
        pickup_date: "2024-03-20",
        weight: 500,
        goods_type: "新会柑",
        address: "新会区三江镇xx村果园A区",
        status: "pending",
        // pending, approved, rejected, draft
        create_time: "2024-03-15 10:30"
      },
      {
        id: "RPT-20240310-005",
        pickup_date: "2024-03-12",
        weight: 1200,
        goods_type: "茶枝柑",
        address: "新会区双水镇处理中心旁",
        status: "approved",
        create_time: "2024-03-10 14:20"
      },
      {
        id: "RPT-20240301-002",
        pickup_date: "2024-03-05",
        weight: 300,
        goods_type: "新会柑",
        address: "新会区会城街道果园",
        status: "draft",
        create_time: "2024-03-01 09:15"
      }
    ];
    const reportList = common_vendor.ref([]);
    common_vendor.onShow(() => {
      const globalList = common_vendor.index.getStorageSync("global_report_list") || [];
      reportList.value = [...globalList, ...originalMockList];
    });
    const acceptedCount = common_vendor.computed(() => {
      return reportList.value.filter((item) => item.status === "approved").length;
    });
    const getStatusText = (status) => {
      const map = {
        "pending": "待处理",
        "approved": "已通过",
        "rejected": "已驳回",
        "draft": "草稿"
      };
      return map[status] || status;
    };
    const getStatusClass = (status) => {
      return `status-${status}`;
    };
    const viewDetail = (item) => {
      common_vendor.index.navigateTo({ url: "./detail?id=" + item.id });
    };
    const deleteReport = (id) => {
      common_vendor.index.showModal({
        title: "确认删除",
        content: "确定要删除这条申报记录吗？",
        success: (res) => {
          if (res.confirm) {
            reportList.value = reportList.value.filter((item) => item.id !== id);
            common_vendor.index.showToast({
              title: "已删除",
              icon: "success"
            });
          }
        }
      });
    };
    const navigateToCreate = () => {
      common_vendor.index.navigateTo({
        url: "/pages/farmer/report/create"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(reportList.value.length),
        b: common_vendor.t(common_vendor.unref(acceptedCount)),
        c: common_vendor.f(reportList.value, (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.id),
            b: common_vendor.t(getStatusText(item.status)),
            c: common_vendor.n(getStatusClass(item.status)),
            d: common_vendor.t(item.pickup_date || item.create_time),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.goods_type),
            g: common_vendor.t(item.address),
            h: common_vendor.t(item.create_time),
            i: common_vendor.o(($event) => viewDetail(item), item.id),
            j: item.status === "draft"
          }, item.status === "draft" ? {
            k: common_vendor.o(($event) => deleteReport(item.id), item.id)
          } : {}, {
            l: item.id
          });
        }),
        d: reportList.value.length === 0
      }, reportList.value.length === 0 ? {
        e: common_vendor.o(navigateToCreate)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-672a3bca"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/report/list.vue"]]);
wx.createPage(MiniProgramPage);
