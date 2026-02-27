"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const showForm = common_vendor.ref(false);
    const disputeTypes = ["重量争议", "质量不符", "货款纠纷", "合同违约", "其他"];
    const form = common_vendor.ref({
      order_no: "",
      dispute_type: "",
      description: ""
    });
    const statusLabel = {
      pending: "待处理",
      processing: "处理中",
      resolved: "已解决",
      closed: "已关闭"
    };
    const arbitrationList = common_vendor.ref([
      {
        id: "ARB20260220001",
        order_no: "ORD20260218003",
        dispute_type: "重量争议",
        description: "实际称重与回收商登记数据相差约80斤，要求重新核实。",
        status: "processing",
        result: null,
        created_at: "2026-02-20 09:30"
      },
      {
        id: "ARB20260215002",
        order_no: "ORD20260210005",
        dispute_type: "质量不符",
        description: "回收商拒收一级品柑橘，称等级不符合标准，产生争议。",
        status: "resolved",
        result: "经仲裁委员会核查，认定货品符合一级标准，回收商需履行收购协议。",
        created_at: "2026-02-15 14:00"
      },
      {
        id: "ARB20260201003",
        order_no: "ORD20260128001",
        dispute_type: "货款纠纷",
        description: "货物交付已超15日，货款尚未到账，请求平台介入处理。",
        status: "resolved",
        result: "货款确认到账，纠纷已关闭。",
        created_at: "2026-02-01 11:00"
      }
    ]);
    const toggleForm = () => {
      showForm.value = !showForm.value;
      if (!showForm.value) {
        form.value = { order_no: "", dispute_type: "", description: "" };
      }
    };
    const onTypeChange = (e) => {
      form.value.dispute_type = disputeTypes[e.detail.value];
    };
    const submitForm = () => {
      if (!form.value.order_no || !form.value.dispute_type || !form.value.description) {
        common_vendor.index.showToast({ title: "请填写所有必填项", icon: "none" });
        return;
      }
      const newItem = {
        id: "ARB" + Date.now(),
        order_no: form.value.order_no,
        dispute_type: form.value.dispute_type,
        description: form.value.description,
        status: "pending",
        result: null,
        created_at: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-")
      };
      arbitrationList.value.unshift(newItem);
      common_vendor.index.showToast({ title: "仲裁申请已提交", icon: "success" });
      toggleForm();
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(showForm.value ? "✕ 收起表单" : "📝 发起仲裁申请"),
        b: common_vendor.o(toggleForm),
        c: showForm.value
      }, showForm.value ? {
        d: form.value.order_no,
        e: common_vendor.o(($event) => form.value.order_no = $event.detail.value),
        f: common_vendor.t(form.value.dispute_type || "请选择纠纷类型"),
        g: disputeTypes,
        h: common_vendor.o(onTypeChange),
        i: form.value.description,
        j: common_vendor.o(($event) => form.value.description = $event.detail.value),
        k: common_vendor.o(toggleForm),
        l: common_vendor.o(submitForm)
      } : {}, {
        m: common_vendor.t(arbitrationList.value.length),
        n: common_vendor.f(arbitrationList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.id),
            b: common_vendor.t(statusLabel[item.status]),
            c: common_vendor.n("status-" + item.status),
            d: common_vendor.t(item.order_no),
            e: common_vendor.t(item.dispute_type),
            f: common_vendor.t(item.description),
            g: item.result
          }, item.result ? {
            h: common_vendor.t(item.result)
          } : {}, {
            i: common_vendor.t(item.created_at),
            j: item.id
          });
        }),
        o: arbitrationList.value.length === 0
      }, arbitrationList.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-aae9f870"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/arbitration/index.vue"]]);
wx.createPage(MiniProgramPage);
