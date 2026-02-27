"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "publish",
  setup(__props) {
    const isSubmitting = common_vendor.ref(false);
    const materials = ["柑肉原料", "陈皮原料", "果渣"];
    const qualityLevels = ["特级", "一级", "二级", "普通"];
    const formData = common_vendor.ref({
      material: "",
      weight: "",
      quality: "",
      price: "",
      description: ""
    });
    const bindMaterialChange = (e) => {
      formData.value.material = materials[e.detail.value];
    };
    const bindQualityChange = (e) => {
      formData.value.quality = qualityLevels[e.detail.value];
    };
    const submitDemand = () => {
      if (!formData.value.material || !formData.value.weight) {
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
        a: formData.value.material
      }, formData.value.material ? {
        b: common_vendor.t(formData.value.material)
      } : {}, {
        c: materials,
        d: common_vendor.o(bindMaterialChange),
        e: formData.value.weight,
        f: common_vendor.o(($event) => formData.value.weight = $event.detail.value),
        g: formData.value.quality
      }, formData.value.quality ? {
        h: common_vendor.t(formData.value.quality)
      } : {}, {
        i: qualityLevels,
        j: common_vendor.o(bindQualityChange),
        k: formData.value.price,
        l: common_vendor.o(($event) => formData.value.price = $event.detail.value),
        m: formData.value.description,
        n: common_vendor.o(($event) => formData.value.description = $event.detail.value),
        o: isSubmitting.value,
        p: common_vendor.o(submitDemand)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-d7c1ac10"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/demand/publish.vue"]]);
wx.createPage(MiniProgramPage);
