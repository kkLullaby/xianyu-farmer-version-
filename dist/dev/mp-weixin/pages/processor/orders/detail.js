"use strict";
const common_vendor = require("../../../common/vendor.js");
const utils_request = require("../../../utils/request.js");
const _sfc_main = {
  __name: "detail",
  setup(__props) {
    const order = common_vendor.ref({
      id: "",
      order_no: "",
      supplier: "",
      supplier_phone: "",
      ship_from: "",
      material: "",
      weight: 0,
      unit_price: 0,
      total_price: 0,
      status: "",
      logistics_no: "",
      logistics_company: "",
      expected_delivery: "",
      receive_address: "",
      created_at: "",
      timeline: []
    });
    const statusKey = common_vendor.computed(() => {
      const map = { "待发货": "pending", "运输中": "active", "已入库": "done" };
      return map[order.value.status] || "pending";
    });
    const statusIcon = common_vendor.computed(() => {
      const map = { "待发货": "⏳", "运输中": "🚚", "已入库": "✅" };
      return map[order.value.status] || "⏳";
    });
    const statusTip = common_vendor.computed(() => {
      const map = {
        "待发货": "等待供应商安排发货",
        "运输中": "货物运输中，请关注到货时间",
        "已入库": "货物已入库，交易完成"
      };
      return map[order.value.status] || "";
    });
    const fetchOrderDetail = async (id) => {
      try {
        const res = await utils_request.request({ url: `/api/processor/orders/${id}`, method: "GET" });
        if (res && res.data) {
          order.value = res.data;
        }
      } catch (e) {
        useMockData(id);
      }
    };
    const useMockData = (id) => {
      order.value = {
        id,
        order_no: "PUR-20240321-" + String(id).padStart(3, "0"),
        supplier: "绿野回收站",
        supplier_phone: "13900139001",
        ship_from: "广东省江门市新会区双水镇工业园区",
        material: "柑肉原料",
        weight: 5.5,
        unit_price: 1200,
        total_price: 6600,
        status: "运输中",
        logistics_no: "YT9876543210",
        logistics_company: "圆通速递",
        expected_delivery: "2024-03-23",
        receive_address: "广东省江门市新会区会城街道绿源处理厂",
        created_at: "2024-03-21 09:00",
        timeline: [
          { time: "2024-03-21 14:20", desc: "货物已发出，正在运输途中" },
          { time: "2024-03-21 09:00", desc: "采购订单创建，等待供应商发货" }
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
      common_vendor.index.makePhoneCall({
        phoneNumber: phone,
        fail: () => common_vendor.index.showToast({ title: "拨号失败", icon: "none" })
      });
    };
    const handleConfirmReceive = () => {
      common_vendor.index.showModal({
        title: "确认收货",
        content: "确认已收到货物？",
        success: (res) => {
          if (res.confirm) {
            order.value.status = "运输中";
            order.value.timeline.unshift({ time: (/* @__PURE__ */ new Date()).toLocaleString(), desc: "已确认收货，货物运输中" });
            common_vendor.index.showToast({ title: "确认成功", icon: "success" });
          }
        }
      });
    };
    const handleConfirmInbound = () => {
      common_vendor.index.showModal({
        title: "确认入库",
        content: "确认货物已完成入库验收？",
        success: (res) => {
          if (res.confirm) {
            order.value.status = "已入库";
            order.value.timeline.unshift({ time: (/* @__PURE__ */ new Date()).toLocaleString(), desc: "货物已完成入库验收，订单结束" });
            common_vendor.index.showToast({ title: "入库确认成功", icon: "success" });
          }
        }
      });
    };
    const handleArbitration = () => {
      common_vendor.index.navigateTo({ url: "/pages/processor/arbitration/index" });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(common_vendor.unref(statusIcon)),
        b: common_vendor.t(order.value.status),
        c: common_vendor.t(common_vendor.unref(statusTip)),
        d: common_vendor.n("status-bg-" + common_vendor.unref(statusKey)),
        e: common_vendor.t(order.value.supplier),
        f: common_vendor.t(order.value.supplier_phone),
        g: common_vendor.o(($event) => callPhone(order.value.supplier_phone)),
        h: common_vendor.t(order.value.ship_from),
        i: common_vendor.t(order.value.material),
        j: common_vendor.t(order.value.weight),
        k: common_vendor.t(order.value.unit_price),
        l: common_vendor.t(order.value.total_price),
        m: common_vendor.t(order.value.logistics_no || "暂未填写"),
        n: common_vendor.t(order.value.logistics_company || "暂未填写"),
        o: common_vendor.t(order.value.expected_delivery || "暂未确认"),
        p: common_vendor.t(order.value.receive_address),
        q: common_vendor.f(order.value.timeline, (event, i, i0) => {
          return {
            a: common_vendor.n(i === 0 ? "dot-active" : ""),
            b: common_vendor.t(event.time),
            c: common_vendor.t(event.desc),
            d: i
          };
        }),
        r: common_vendor.t(order.value.order_no),
        s: common_vendor.t(order.value.created_at),
        t: order.value.status === "待发货"
      }, order.value.status === "待发货" ? {
        v: common_vendor.o(handleConfirmReceive)
      } : {}, {
        w: order.value.status === "运输中"
      }, order.value.status === "运输中" ? {
        x: common_vendor.o(handleConfirmInbound)
      } : {}, {
        y: order.value.status === "待发货" || order.value.status === "运输中"
      }, order.value.status === "待发货" || order.value.status === "运输中" ? {
        z: common_vendor.o(handleArbitration)
      } : {}, {
        A: order.value.status === "已入库"
      }, order.value.status === "已入库" ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-38135539"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/orders/detail.vue"]]);
wx.createPage(MiniProgramPage);
