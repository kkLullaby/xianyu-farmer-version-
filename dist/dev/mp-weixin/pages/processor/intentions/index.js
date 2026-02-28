"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const allIntentions = common_vendor.ref([]);
    const statusLabel = {
      pending: "待确认",
      accepted: "已转订单",
      rejected: "已拒绝"
    };
    common_vendor.onShow(() => {
      const list = common_vendor.index.getStorageSync("global_intentions") || [];
      allIntentions.value = list.slice().reverse();
    });
    const pendingList = common_vendor.computed(() => allIntentions.value.filter((i) => i.status === "pending"));
    const donelList = common_vendor.computed(() => allIntentions.value.filter((i) => i.status !== "pending"));
    const displayList = common_vendor.computed(() => currentTab.value === 0 ? pendingList.value : donelList.value);
    const handleAccept = (item) => {
      common_vendor.index.showModal({
        title: "确认接受意向",
        content: `接受该供应意向并生成采购订单？
报价：¥${item.price}元/斤，重量：${item.weight}斤`,
        success: (res) => {
          if (!res.confirm)
            return;
          const orderList = common_vendor.index.getStorageSync("global_order_list") || [];
          const newOrder = {
            id: "ORD" + Date.now(),
            order_no: "PUR-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(orderList.length + 1).padStart(3, "0"),
            intention_id: item.id,
            supplier: item.sender_name || "供应商",
            material: item.variety || "柑橘果肉",
            weight: item.weight,
            unit_price: item.price,
            total_price: (Number(item.price) * Number(item.weight)).toFixed(2),
            ship_from: item.address || "待确认",
            expected_delivery: item.date || "待协商",
            flow_status: "pending_ship",
            status: "待发货",
            created_at: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-"),
            timeline: [
              { time: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-"), desc: "意向被接受，采购订单已创建" }
            ]
          };
          orderList.unshift(newOrder);
          common_vendor.index.setStorageSync("global_order_list", orderList);
          const intentions = common_vendor.index.getStorageSync("global_intentions") || [];
          const idx = intentions.findIndex((i) => i.id === item.id);
          if (idx !== -1)
            intentions[idx].status = "accepted";
          common_vendor.index.setStorageSync("global_intentions", intentions);
          allIntentions.value = intentions.slice().reverse();
          common_vendor.index.showToast({ title: "订单已生成，请前往订单管理查看", icon: "success" });
        }
      });
    };
    const handleReject = (item) => {
      common_vendor.index.showModal({
        title: "确认拒绝",
        content: "确定拒绝该供应意向？",
        success: (res) => {
          if (!res.confirm)
            return;
          const intentions = common_vendor.index.getStorageSync("global_intentions") || [];
          const idx = intentions.findIndex((i) => i.id === item.id);
          if (idx !== -1)
            intentions[idx].status = "rejected";
          common_vendor.index.setStorageSync("global_intentions", intentions);
          allIntentions.value = intentions.slice().reverse();
          common_vendor.index.showToast({ title: "已拒绝该意向", icon: "none" });
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.unref(pendingList).length > 0
      }, common_vendor.unref(pendingList).length > 0 ? {} : {}, {
        b: currentTab.value === 0 ? 1 : "",
        c: common_vendor.o(($event) => currentTab.value = 0),
        d: currentTab.value === 1 ? 1 : "",
        e: common_vendor.o(($event) => currentTab.value = 1),
        f: common_vendor.f(common_vendor.unref(displayList), (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.sender_name || "供应商"),
            b: common_vendor.t(statusLabel[item.status]),
            c: common_vendor.n("status-" + item.status),
            d: common_vendor.t(item.price),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.date || "待协商"),
            g: common_vendor.t(item.create_time),
            h: item.status === "pending"
          }, item.status === "pending" ? {
            i: common_vendor.o(($event) => handleReject(item), item.id || index),
            j: common_vendor.o(($event) => handleAccept(item), item.id || index)
          } : common_vendor.e({
            k: item.status === "accepted"
          }, item.status === "accepted" ? {} : {}), {
            l: item.id || index
          });
        }),
        g: common_vendor.unref(displayList).length === 0
      }, common_vendor.unref(displayList).length === 0 ? {
        h: common_vendor.t(currentTab.value === 0 ? "暂无待处理意向" : "暂无已处理意向")
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-8bd0f2c5"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/intentions/index.vue"]]);
wx.createPage(MiniProgramPage);
