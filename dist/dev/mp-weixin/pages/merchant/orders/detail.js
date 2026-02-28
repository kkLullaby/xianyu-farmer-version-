"use strict";
const common_vendor = require("../../../common/vendor.js");
const utils_request = require("../../../utils/request.js");
const _sfc_main = {
  __name: "detail",
  setup(__props) {
    const order = common_vendor.ref({
      id: "",
      order_no: "",
      farmer_name: "",
      farmer_phone: "",
      address: "",
      variety: "",
      weight: 0,
      unit_price: 0,
      total_price: 0,
      status: "",
      logistics_no: "",
      logistics_company: "",
      expected_delivery: "",
      created_at: "",
      timeline: []
    });
    const statusKey = common_vendor.computed(() => {
      const map = { "待接单": "pending", "进行中": "active", "已完成": "done" };
      return map[order.value.status] || "pending";
    });
    const statusIcon = common_vendor.computed(() => {
      const map = { "待接单": "⏳", "进行中": "🚚", "已完成": "✅" };
      return map[order.value.status] || "⏳";
    });
    const statusTip = common_vendor.computed(() => {
      const map = {
        "待接单": "请尽快确认接单，农户正在等待",
        "进行中": "已接单，请安排取货",
        "已完成": "交易已完成，感谢您的合作"
      };
      return map[order.value.status] || "";
    });
    const fetchOrderDetail = async (id) => {
      const stored = common_vendor.index.getStorageSync("global_order_list") || [];
      const found = stored.find((o) => String(o.id) === String(id) || o.order_no === id);
      if (found) {
        order.value = { ...order.value, ...found };
        return;
      }
      try {
        const res = await utils_request.request({ url: `/api/merchant/orders/${id}`, method: "GET" });
        if (res && res.data) {
          order.value = res.data;
        } else {
          useMockData(id);
        }
      } catch (e) {
        useMockData(id);
      }
    };
    const persistOrderStatus = (newStatus, timelineDesc) => {
      const stored = common_vendor.index.getStorageSync("global_order_list") || [];
      const idx = stored.findIndex((o) => String(o.id) === String(order.value.id) || o.order_no === order.value.order_no);
      if (idx !== -1) {
        stored[idx].status = newStatus;
        stored[idx].timeline = stored[idx].timeline || [];
        stored[idx].timeline.unshift({ time: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-"), desc: timelineDesc });
        common_vendor.index.setStorageSync("global_order_list", stored);
      }
    };
    const useMockData = (id) => {
      order.value = {
        id,
        order_no: "ORD-20240320-" + String(id).padStart(3, "0"),
        farmer_name: "张三",
        farmer_phone: "13800138001",
        address: "广东省江门市新会区三江镇银洲大道88号",
        variety: "新会柑",
        weight: 500,
        unit_price: 0.8,
        total_price: 400,
        status: "进行中",
        logistics_no: "SF1234567890",
        logistics_company: "顺丰速运",
        expected_delivery: "2024-03-22",
        created_at: "2024-03-20 10:00",
        timeline: [
          { time: "2024-03-20 10:00", desc: "订单创建，等待回收商接单" },
          { time: "2024-03-20 10:35", desc: "回收商已接单，安排取货中" }
        ]
      };
    };
    common_vendor.onLoad((options) => {
      const id = options == null ? void 0 : options.id;
      if (id) {
        fetchOrderDetail(id);
      }
    });
    const callPhone = (phone) => {
      if (!phone) {
        common_vendor.index.showToast({ title: "暂无联系方式", icon: "none" });
        return;
      }
      common_vendor.index.makePhoneCall({
        phoneNumber: phone,
        fail: () => common_vendor.index.showToast({ title: "拨号失败", icon: "none" })
      });
    };
    const handleConfirmReceive = () => {
      common_vendor.index.showModal({
        title: "确认接单",
        content: "确认接收此订单并安排取货？",
        success: (res) => {
          if (res.confirm) {
            const desc = "回收商已接单，安排取货中";
            order.value.status = "进行中";
            order.value.timeline = order.value.timeline || [];
            order.value.timeline.unshift({ time: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-"), desc });
            persistOrderStatus("进行中", desc);
            common_vendor.index.showToast({ title: "接单成功", icon: "success" });
          }
        }
      });
    };
    const handleConfirmShip = () => {
      common_vendor.index.showModal({
        title: "确认取货",
        content: "确认已完成取货？",
        success: (res) => {
          if (res.confirm) {
            const desc = "回收商已完成取货，订单结束";
            order.value.status = "已完成";
            order.value.timeline = order.value.timeline || [];
            order.value.timeline.unshift({ time: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-"), desc });
            persistOrderStatus("已完成", desc);
            common_vendor.index.showToast({ title: "取货确认成功", icon: "success" });
          }
        }
      });
    };
    const handleArbitration = () => {
      common_vendor.index.navigateTo({
        url: "/pages/merchant/arbitration/index?order_no=" + encodeURIComponent(order.value.order_no)
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(common_vendor.unref(statusIcon)),
        b: common_vendor.t(order.value.status),
        c: common_vendor.t(common_vendor.unref(statusTip)),
        d: common_vendor.n("status-bg-" + common_vendor.unref(statusKey)),
        e: common_vendor.t(order.value.farmer_name),
        f: common_vendor.t(order.value.farmer_phone || "暂无电话"),
        g: common_vendor.o(($event) => callPhone(order.value.farmer_phone)),
        h: common_vendor.t(order.value.address),
        i: common_vendor.t(order.value.variety),
        j: common_vendor.t(order.value.weight),
        k: common_vendor.t(order.value.unit_price),
        l: common_vendor.t(order.value.total_price),
        m: common_vendor.t(order.value.logistics_no || "暂未填写"),
        n: common_vendor.t(order.value.logistics_company || "暂未填写"),
        o: common_vendor.t(order.value.expected_delivery || "暂未确认"),
        p: common_vendor.f(order.value.timeline, (event, i, i0) => {
          return {
            a: common_vendor.n(i === 0 ? "dot-active" : ""),
            b: common_vendor.t(event.time),
            c: common_vendor.t(event.desc),
            d: i
          };
        }),
        q: common_vendor.t(order.value.order_no),
        r: common_vendor.t(order.value.created_at),
        s: order.value.status === "待接单"
      }, order.value.status === "待接单" ? {
        t: common_vendor.o(handleConfirmReceive)
      } : {}, {
        v: order.value.status === "进行中"
      }, order.value.status === "进行中" ? {
        w: common_vendor.o(handleConfirmShip)
      } : {}, {
        x: order.value.status === "进行中" || order.value.status === "待接单"
      }, order.value.status === "进行中" || order.value.status === "待接单" ? {
        y: common_vendor.o(handleArbitration)
      } : {}, {
        z: order.value.status === "已完成"
      }, order.value.status === "已完成" ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-372b5435"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/orders/detail.vue"]]);
wx.createPage(MiniProgramPage);
