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
      deadline: "",
      contact_name: "",
      contact_phone: "",
      address: "",
      description: ""
    });
    const bindMaterialChange = (e) => {
      formData.value.material = materials[e.detail.value];
    };
    const bindQualityChange = (e) => {
      formData.value.quality = qualityLevels[e.detail.value];
    };
    const bindDateChange = (e) => {
      formData.value.deadline = e.detail.value;
    };
    const submitDemand = () => {
      if (!formData.value.material || !formData.value.weight || !formData.value.price || !formData.value.contact_name || !formData.value.contact_phone || !formData.value.address) {
        return common_vendor.index.showToast({ title: "请填写完整信息", icon: "none" });
      }
      isSubmitting.value = true;
      setTimeout(() => {
        const newItem = {
          id: "DEM" + Date.now(),
          source: "processor",
          goods_type: formData.value.material,
          weight: Number(formData.value.weight),
          unit: "吨",
          price: Number(formData.value.price),
          deadline: formData.value.deadline || "长期有效",
          contact_name: formData.value.contact_name,
          contact_phone: formData.value.contact_phone,
          address: formData.value.address,
          commissionRate: 8,
          description: formData.value.description || ""
        };
        const currentList = common_vendor.index.getStorageSync("global_demand_list") || [];
        currentList.unshift(newItem);
        common_vendor.index.setStorageSync("global_demand_list", currentList);
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
        m: formData.value.deadline
      }, formData.value.deadline ? {
        n: common_vendor.t(formData.value.deadline)
      } : {}, {
        o: common_vendor.o(bindDateChange),
        p: formData.value.contact_name,
        q: common_vendor.o(($event) => formData.value.contact_name = $event.detail.value),
        r: formData.value.contact_phone,
        s: common_vendor.o(($event) => formData.value.contact_phone = $event.detail.value),
        t: formData.value.address,
        v: common_vendor.o(($event) => formData.value.address = $event.detail.value),
        w: formData.value.description,
        x: common_vendor.o(($event) => formData.value.description = $event.detail.value),
        y: isSubmitting.value,
        z: common_vendor.o(submitDemand)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-d7c1ac10"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/demand/publish.vue"]]);
wx.createPage(MiniProgramPage);
