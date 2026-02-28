"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "publish",
  setup(__props) {
    const isSubmitting = common_vendor.ref(false);
    const varieties = ["新会柑", "茶枝柑", "其他品种"];
    const formData = common_vendor.ref({
      variety: "",
      weight: "",
      price: "",
      deadline: "",
      contact_name: "",
      contact_phone: "",
      address: "",
      description: ""
    });
    const bindVarietyChange = (e) => {
      formData.value.variety = varieties[e.detail.value];
    };
    const bindDateChange = (e) => {
      formData.value.deadline = e.detail.value;
    };
    const submitDemand = () => {
      if (!formData.value.variety || !formData.value.weight || !formData.value.price || !formData.value.contact_name || !formData.value.contact_phone || !formData.value.address) {
        return common_vendor.index.showToast({ title: "请填写完整信息", icon: "none" });
      }
      isSubmitting.value = true;
      setTimeout(() => {
        const newItem = {
          id: "DEM" + Date.now(),
          source: "merchant",
          goods_type: formData.value.variety,
          weight: Number(formData.value.weight),
          unit: "斤",
          price: Number(formData.value.price),
          deadline: formData.value.deadline || "长期有效",
          contact_name: formData.value.contact_name,
          contact_phone: formData.value.contact_phone,
          address: formData.value.address,
          commissionRate: 10,
          description: formData.value.description || ""
        };
        const currentList = common_vendor.index.getStorageSync("global_demand_list") || [];
        currentList.unshift(newItem);
        common_vendor.index.setStorageSync("global_demand_list", currentList);
        const auditEntry = {
          id: "AUD-" + newItem.id,
          submitter: newItem.contact_name,
          role_label: "回收商",
          _role: "merchant",
          type_label: "回收求购发布",
          spec: newItem.goods_type,
          quantity: newItem.weight + " 斤",
          unit_price: newItem.price,
          audit_status: "pending",
          commission_type: null,
          commission_value: null,
          created_at: (/* @__PURE__ */ new Date()).toLocaleString()
        };
        const auditList = common_vendor.index.getStorageSync("global_audit_list") || [];
        auditList.unshift(auditEntry);
        common_vendor.index.setStorageSync("global_audit_list", auditList);
        isSubmitting.value = false;
        common_vendor.index.showToast({ title: "发布成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      }, 1500);
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: formData.value.variety
      }, formData.value.variety ? {
        b: common_vendor.t(formData.value.variety)
      } : {}, {
        c: varieties,
        d: common_vendor.o(bindVarietyChange),
        e: formData.value.weight,
        f: common_vendor.o(($event) => formData.value.weight = $event.detail.value),
        g: formData.value.price,
        h: common_vendor.o(($event) => formData.value.price = $event.detail.value),
        i: formData.value.deadline
      }, formData.value.deadline ? {
        j: common_vendor.t(formData.value.deadline)
      } : {}, {
        k: common_vendor.o(bindDateChange),
        l: formData.value.contact_name,
        m: common_vendor.o(($event) => formData.value.contact_name = $event.detail.value),
        n: formData.value.contact_phone,
        o: common_vendor.o(($event) => formData.value.contact_phone = $event.detail.value),
        p: formData.value.address,
        q: common_vendor.o(($event) => formData.value.address = $event.detail.value),
        r: formData.value.description,
        s: common_vendor.o(($event) => formData.value.description = $event.detail.value),
        t: isSubmitting.value,
        v: common_vendor.o(submitDemand)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-143b416e"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/demand/publish.vue"]]);
wx.createPage(MiniProgramPage);
