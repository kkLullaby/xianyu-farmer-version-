"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const arbitrationList = common_vendor.ref([
      {
        id: "ARB20240325001",
        order_no: "ORD20240320001",
        applicant: "张三",
        role: "农户",
        reason: "重量争议",
        description: "实际称重与回收商记录不符，相差约50斤。",
        status: "pending",
        created_at: "2024-03-25 10:00"
      },
      {
        id: "ARB20240324002",
        order_no: "ORD20240319005",
        applicant: "李四",
        role: "回收商",
        reason: "品质不符",
        description: "农户提供的柑肉含有大量杂质，不符合收购标准。",
        status: "pending",
        created_at: "2024-03-24 15:30"
      },
      {
        id: "ARB20240323003",
        order_no: "ORD20240318002",
        applicant: "王五",
        role: "农户",
        reason: "付款延迟",
        description: "确认收货后超过48小时未收到结算款项。",
        status: "urgent",
        created_at: "2024-03-23 09:15"
      }
    ]);
    const getStatusText = (status) => {
      const map = {
        "pending": "待处理",
        "urgent": "紧急",
        "resolved": "已解决"
      };
      return map[status] || status;
    };
    const handleArbitration = (item) => {
      common_vendor.index.showToast({
        title: "处理功能开发中",
        icon: "none"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(arbitrationList.value.length),
        b: common_vendor.f(arbitrationList.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.id),
            b: common_vendor.t(getStatusText(item.status)),
            c: common_vendor.n("status-" + item.status),
            d: common_vendor.t(item.order_no),
            e: common_vendor.t(item.applicant),
            f: common_vendor.t(item.role),
            g: common_vendor.t(item.reason),
            h: common_vendor.t(item.description),
            i: common_vendor.t(item.created_at),
            j: common_vendor.o(($event) => handleArbitration(), item.id),
            k: item.id
          };
        }),
        c: arbitrationList.value.length === 0
      }, arbitrationList.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7372aa48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/arbitration/index.vue"]]);
wx.createPage(MiniProgramPage);
