"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "list",
  setup(__props) {
    const reportList = common_vendor.ref([
      {
        id: 1,
        report_no: "RPT-20240315-001",
        pickup_date: "2024-03-20",
        weight_kg: 500,
        citrus_variety: "新会柑",
        location_address: "新会区三江镇xx村果园A区",
        status: "pending",
        // pending, accepted, completed, draft
        created_at: "2024-03-15 10:30"
      },
      {
        id: 2,
        report_no: "RPT-20240310-005",
        pickup_date: "2024-03-12",
        weight_kg: 1200,
        citrus_variety: "茶枝柑",
        location_address: "新会区双水镇处理中心旁",
        status: "completed",
        created_at: "2024-03-10 14:20"
      },
      {
        id: 3,
        report_no: "RPT-20240301-002",
        pickup_date: "2024-03-05",
        weight_kg: 300,
        citrus_variety: "新会柑",
        location_address: "新会区会城街道果园",
        status: "draft",
        created_at: "2024-03-01 09:15"
      }
    ]);
    const acceptedCount = common_vendor.computed(() => {
      return reportList.value.filter((item) => item.status === "accepted" || item.status === "completed").length;
    });
    const getStatusText = (status) => {
      const map = {
        "pending": "待受理",
        "accepted": "已受理",
        "completed": "已完成",
        "draft": "草稿"
      };
      return map[status] || status;
    };
    const getStatusClass = (status) => {
      return `status-${status}`;
    };
    const viewDetail = (item) => {
      common_vendor.index.showToast({
        title: "查看详情功能开发中",
        icon: "none"
      });
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
            a: common_vendor.t(item.report_no),
            b: common_vendor.t(getStatusText(item.status)),
            c: common_vendor.n(getStatusClass(item.status)),
            d: common_vendor.t(item.pickup_date),
            e: common_vendor.t(item.weight_kg),
            f: common_vendor.t(item.citrus_variety),
            g: common_vendor.t(item.location_address),
            h: common_vendor.t(item.created_at),
            i: common_vendor.o(($event) => viewDetail(), item.id),
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
