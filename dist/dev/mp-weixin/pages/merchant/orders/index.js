"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const tabs = ["全部", "待接单", "进行中", "已完成"];
    const currentTab = common_vendor.ref(0);
    const orders = common_vendor.ref([
      {
        id: 1,
        order_no: "ORD-20240320-001",
        farmer_name: "张三",
        variety: "新会柑",
        weight: 500,
        address: "新会区三江镇xx村",
        status: "待接单",
        created_at: "2024-03-20 10:00"
      },
      {
        id: 2,
        order_no: "ORD-20240319-005",
        farmer_name: "李四",
        variety: "茶枝柑",
        weight: 1200,
        address: "新会区双水镇xx果园",
        status: "进行中",
        created_at: "2024-03-19 14:30"
      },
      {
        id: 3,
        order_no: "ORD-20240318-002",
        farmer_name: "王五",
        variety: "新会柑",
        weight: 800,
        address: "新会区会城街道",
        status: "已完成",
        created_at: "2024-03-18 09:15"
      }
    ]);
    common_vendor.onShow(() => {
      const stored = common_vendor.index.getStorageSync("global_order_list") || [];
      if (stored.length > 0) {
        orders.value = stored;
      }
    });
    const filteredOrders = common_vendor.computed(() => {
      if (currentTab.value === 0)
        return orders.value;
      const statusMap = ["全部", "待接单", "进行中", "已完成"];
      return orders.value.filter((item) => item.status === statusMap[currentTab.value]);
    });
    const goToDetail = (id) => {
      common_vendor.index.navigateTo({ url: "./detail?id=" + id });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(tabs, (tab, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(tab),
            b: currentTab.value === index
          }, currentTab.value === index ? {} : {}, {
            c: index,
            d: currentTab.value === index ? 1 : "",
            e: common_vendor.o(($event) => currentTab.value = index, index)
          });
        }),
        b: common_vendor.f(common_vendor.unref(filteredOrders), (item, index, i0) => {
          return {
            a: common_vendor.t(item.order_no),
            b: common_vendor.t(item.status),
            c: common_vendor.t(item.farmer_name),
            d: common_vendor.t(item.variety),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.address),
            g: common_vendor.t(item.created_at),
            h: common_vendor.o(($event) => goToDetail(item.id), item.id),
            i: item.id
          };
        }),
        c: common_vendor.unref(filteredOrders).length === 0
      }, common_vendor.unref(filteredOrders).length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-249550e5"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/orders/index.vue"]]);
wx.createPage(MiniProgramPage);
