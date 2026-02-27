"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const showForm = common_vendor.ref(false);
    const disputeTypes = ["质量不符", "重量争议", "合同违约", "货款纠纷", "原料污染", "其他"];
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
        id: "ARB20260225001",
        order_no: "ORD20260222015",
        dispute_type: "质量不符",
        description: "收到批次柑橘含水量超标，不符合加工要求，已拍照存证，要求退货或赔偿。",
        status: "processing",
        result: null,
        created_at: "2026-02-25 08:45"
      },
      {
        id: "ARB20260218002",
        order_no: "ORD20260212007",
        dispute_type: "合同违约",
        description: "供应商未能按约定时间交货，导致生产线停工两日，要求追偿违约损失。",
        status: "pending",
        result: null,
        created_at: "2026-02-18 13:20"
      },
      {
        id: "ARB20260105003",
        order_no: "ORD20260101002",
        dispute_type: "原料污染",
        description: "原料中混入异物，疑似农药残留超标，要求全批次检测并赔偿损失。",
        status: "resolved",
        result: "经检测机构检验，农药残留在国标范围内，异物属于自然夹杂，按合同条款赔偿少量损耗。",
        created_at: "2026-01-05 10:00"
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
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-2736aa2a"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/arbitration/index.vue"]]);
wx.createPage(MiniProgramPage);
