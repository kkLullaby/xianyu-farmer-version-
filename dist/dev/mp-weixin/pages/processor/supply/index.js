"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const fuzzLocation = (loc) => loc ? loc.replace(/([\u9547\u8857\u9053\u5c71\u4e61].*)/u, "（具体地址经平台保护）") : "地址保护中";
    const showPopup = common_vendor.ref(false);
    const currentTarget = common_vendor.ref({});
    const intentionForm = common_vendor.ref({ price: "", weight: "", date: "" });
    const openIntentionPopup = (item) => {
      currentTarget.value = item;
      intentionForm.value = { price: "", weight: "", date: "" };
      showPopup.value = true;
    };
    const closePopup = () => {
      showPopup.value = false;
    };
    const onDateChange = (e) => {
      intentionForm.value.date = e.detail.value;
    };
    const submitIntention = () => {
      if (!intentionForm.value.price || !intentionForm.value.weight) {
        return common_vendor.index.showToast({ title: "请填写单价和重量", icon: "none" });
      }
      const entry = {
        id: "INT-" + Date.now(),
        target_merchant_id: currentTarget.value.id,
        target_name: currentTarget.value.provider,
        sender_name: common_vendor.index.getStorageSync("current_user_name") || "测试用户",
        sender_phone: common_vendor.index.getStorageSync("current_user_phone") || "13800000000",
        price: Number(intentionForm.value.price),
        weight: Number(intentionForm.value.weight),
        date: intentionForm.value.date || "待协商",
        status: "pending",
        create_time: (/* @__PURE__ */ new Date()).toLocaleString()
      };
      const list = common_vendor.index.getStorageSync("global_intentions") || [];
      list.unshift(entry);
      common_vendor.index.setStorageSync("global_intentions", list);
      closePopup();
      common_vendor.index.showToast({ title: "意向已发送，等待商家确认", icon: "success" });
    };
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
            g: common_vendor.t(fuzzLocation(item.location)),
            h: common_vendor.t(item.date),
            i: common_vendor.o(($event) => openIntentionPopup(item), item.id),
            j: item.id
          };
        }),
        h: common_vendor.unref(filteredList).length === 0
      }, common_vendor.unref(filteredList).length === 0 ? {} : {}, {
        i: showPopup.value
      }, showPopup.value ? {
        j: common_vendor.o(closePopup)
      } : {}, {
        k: showPopup.value
      }, showPopup.value ? common_vendor.e({
        l: common_vendor.t(currentTarget.value.provider),
        m: intentionForm.value.price,
        n: common_vendor.o(($event) => intentionForm.value.price = $event.detail.value),
        o: intentionForm.value.weight,
        p: common_vendor.o(($event) => intentionForm.value.weight = $event.detail.value),
        q: intentionForm.value.date
      }, intentionForm.value.date ? {
        r: common_vendor.t(intentionForm.value.date)
      } : {}, {
        s: intentionForm.value.date,
        t: common_vendor.o(onDateChange),
        v: common_vendor.o(closePopup),
        w: common_vendor.o(submitIntention)
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-c851e281"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/processor/supply/index.vue"]]);
wx.createPage(MiniProgramPage);
