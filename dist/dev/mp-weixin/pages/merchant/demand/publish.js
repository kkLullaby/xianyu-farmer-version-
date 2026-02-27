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
      description: ""
    });
    const bindVarietyChange = (e) => {
      formData.value.variety = varieties[e.detail.value];
    };
    const bindDateChange = (e) => {
      formData.value.deadline = e.detail.value;
    };
    const submitDemand = () => {
      if (!formData.value.variety || !formData.value.weight || !formData.value.price) {
        return common_vendor.index.showToast({ title: "请填写完整信息", icon: "none" });
      }
      isSubmitting.value = true;
      setTimeout(() => {
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
        l: formData.value.description,
        m: common_vendor.o(($event) => formData.value.description = $event.detail.value),
        n: isSubmitting.value,
        o: common_vendor.o(submitDemand)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-143b416e"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/merchant/demand/publish.vue"]]);
wx.createPage(MiniProgramPage);
