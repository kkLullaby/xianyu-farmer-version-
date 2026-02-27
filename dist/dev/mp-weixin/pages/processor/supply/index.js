"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const supplyList = common_vendor.ref([
      {
        id: 1,
        type: "farmer",
        provider: "张大伯",
        variety: "新会柑 (核心产区)",
        weight: 2e3,
        price: 3.5,
        location: "新会区三江镇",
        phone: "13800138000",
        date: "2024-03-25"
      },
      {
        id: 2,
        type: "merchant",
        provider: "绿源回收站",
        variety: "茶枝柑",
        weight: 5e3,
        price: 2.8,
        location: "新会区双水镇",
        phone: "13900139000",
        date: "2024-03-24"
      },
      {
        id: 3,
        type: "farmer",
        provider: "李阿姨",
        variety: "新会柑",
        weight: 800,
        price: 3.2,
        location: "新会区会城街道",
        phone: "13700137000",
        date: "2024-03-23"
      }
    ]);
    const filteredList = common_vendor.computed(() => {
      if (currentTab.value === 0)
        return supplyList.value;
      const type = currentTab.value === 1 ? "farmer" : "merchant";
      return supplyList.value.filter((item) => item.type === type);
    });
    const makeCall = (phone) => {
      common_vendor.index.makePhoneCall({
        phoneNumber: phone
      });
    };
    const handlePurchase = (item) => {
      common_vendor.index.showToast({
        title: "意向已提交",
        icon: "success"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: currentTab.value === 0 ? 1 : "",
        b: common_vendor.o(($event) => currentTab.value = 0),
        c: currentTab.value === 1 ? 1 : "",
        d: common_vendor.o(($event) => currentTab.value = 1),
        e: currentTab.value === 2 ? 1 : "",
        f: common_vendor.o(($event) => currentTab.value = 2),
        g: common_vendor.f(common_vendor.unref(filteredList), (item, index, i0) => {
          return {
            a: common_vendor.t(item.type === "farmer" ? "农户" : "回收商"),
            b: common_vendor.n("type-" + item.type),
            c: common_vendor.t(item.variety),
            d: common_vendor.t(item.provider),
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.price),
            g: common_vendor.t(item.location),
            h: common_vendor.t(item.date),
            i: common_vendor.o(($event) => makeCall(item.phone), item.id),
            j: common_vendor.o(($event) => handlePurchase(), item.id),
            k: item.id
          };
        }),
        h: common_vendor.unref(filteredList).length === 0
      }, common_vendor.unref(filteredList).length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-c851e281"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/supply/index.vue"]]);
wx.createPage(MiniProgramPage);
