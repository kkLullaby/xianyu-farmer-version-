"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const tabs = ["全部", "待发货", "运输中", "已入库"];
    const currentTab = common_vendor.ref(0);
    const orders = common_vendor.ref([
      {
        id: 1,
        order_no: "PUR-20240321-001",
        supplier: "绿野回收站",
        material: "柑肉原料",
        weight: 5.5,
        delivery_date: "2024-03-23",
        status: "待发货",
        created_at: "2024-03-21"
      },
      {
        id: 2,
        order_no: "PUR-20240320-003",
        supplier: "兴旺果业合作社",
        material: "陈皮原料",
        weight: 2,
        delivery_date: "2024-03-22",
        status: "运输中",
        created_at: "2024-03-20"
      },
      {
        id: 3,
        order_no: "PUR-20240315-008",
        supplier: "丰收农场",
        material: "果渣",
        weight: 10,
        delivery_date: "2024-03-18",
        status: "已入库",
        created_at: "2024-03-15"
      }
    ]);
    const filteredOrders = common_vendor.computed(() => {
      if (currentTab.value === 0)
        return orders.value;
      const statusMap = ["全部", "待发货", "运输中", "已入库"];
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
            c: common_vendor.t(item.supplier),
            d: common_vendor.t(item.material),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.delivery_date),
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
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-2ddd122a"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/orders/index.vue"]]);
wx.createPage(MiniProgramPage);
