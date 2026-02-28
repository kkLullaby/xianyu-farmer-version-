"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const showPopup = common_vendor.ref(false);
    const popupItem = common_vendor.ref({});
    const intentionForm = common_vendor.ref({ price: "", weight: "", date: "" });
    const fuzzName = (name) => {
      if (!name)
        return "***处理厂";
      return name.charAt(0) + "氏处理厂";
    };
    const originalMockList = [
      {
        id: "SUP-MOCK-001",
        buyer_name: "新会生物科技处理厂",
        variety: "柑肉原料",
        weight: 50,
        price: 300,
        has_transport: true,
        phone: "07506688999",
        deadline: "2026-04-01",
        description: "急需大量新鲜柑肉原料，要求无霉变，提供专业运输车辆上门拉货。"
      },
      {
        id: "SUP-MOCK-002",
        buyer_name: "绿源有机肥加工中心",
        variety: "果渣/废果",
        weight: 20,
        price: 150,
        has_transport: false,
        phone: "13800138000",
        deadline: "2026-03-30",
        description: "长期收购加工后的果渣，需农户自行送货至双水镇加工点。"
      },
      {
        id: "SUP-MOCK-003",
        buyer_name: "陈皮村深加工基地",
        variety: "陈皮原料",
        weight: 10,
        price: 800,
        has_transport: true,
        phone: "13900139000",
        deadline: "2026-04-15",
        description: "高价收购优质二红皮原料，品质要求高，现场结款。"
      }
    ];
    const demandList = common_vendor.ref([]);
    common_vendor.onShow(() => {
      const globalList = common_vendor.index.getStorageSync("global_demand_list") || [];
      const processorDemands = globalList.filter((i) => i._role === "processor").map((item) => ({
        id: item.id,
        buyer_name: item.submitter || "处理商",
        variety: item.goods_type || item.variety || "柑肉原料",
        weight: item.weight || 0,
        price: item.price || 0,
        has_transport: item.has_transport || false,
        phone: item.contact_phone || "",
        deadline: item.deadline || item.create_time || "",
        description: item.description || ""
      }));
      demandList.value = [...processorDemands, ...originalMockList];
    });
    const filteredList = common_vendor.computed(() => {
      let list = [...demandList.value];
      if (currentTab.value === 1) {
        list = list.filter((item) => item.has_transport);
      } else if (currentTab.value === 2) {
        list.sort((a, b) => b.price - a.price);
      }
      return list;
    });
    const openIntentionPopup = (item) => {
      popupItem.value = item;
      intentionForm.value = { price: "", weight: "", date: "" };
      showPopup.value = true;
    };
    const closePopup = () => {
      showPopup.value = false;
    };
    const submitIntention = () => {
      if (!intentionForm.value.price) {
        common_vendor.index.showToast({ title: "请填写报价", icon: "none" });
        return;
      }
      if (!intentionForm.value.weight) {
        common_vendor.index.showToast({ title: "请填写预估重量", icon: "none" });
        return;
      }
      const intention = {
        id: "INT" + Date.now(),
        target_merchant_id: popupItem.value.id,
        target_name: popupItem.value.buyer_name,
        sender_name: common_vendor.index.getStorageSync("current_user_name") || "农户用户",
        sender_phone: common_vendor.index.getStorageSync("current_user_phone") || "13800000000",
        price: intentionForm.value.price,
        weight: intentionForm.value.weight,
        date: intentionForm.value.date,
        status: "pending",
        create_time: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN")
      };
      const list = common_vendor.index.getStorageSync("global_intentions") || [];
      list.push(intention);
      common_vendor.index.setStorageSync("global_intentions", list);
      showPopup.value = false;
      common_vendor.index.showToast({ title: "意向已发送", icon: "success" });
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
          return common_vendor.e({
            a: common_vendor.t(fuzzName(item.buyer_name)),
            b: common_vendor.t(item.deadline),
            c: common_vendor.t(item.variety),
            d: common_vendor.t(item.weight),
            e: common_vendor.t(item.price),
            f: item.has_transport
          }, item.has_transport ? {} : {}, {
            g: common_vendor.t(item.description),
            h: common_vendor.o(($event) => openIntentionPopup(item), item.id || index),
            i: item.id || index
          });
        }),
        h: common_vendor.unref(filteredList).length === 0
      }, common_vendor.unref(filteredList).length === 0 ? {} : {}, {
        i: showPopup.value
      }, showPopup.value ? {
        j: common_vendor.o(closePopup)
      } : {}, {
        k: showPopup.value
      }, showPopup.value ? {
        l: common_vendor.t(popupItem.value.buyer_name ? fuzzName(popupItem.value.buyer_name) : ""),
        m: intentionForm.value.price,
        n: common_vendor.o(($event) => intentionForm.value.price = $event.detail.value),
        o: intentionForm.value.weight,
        p: common_vendor.o(($event) => intentionForm.value.weight = $event.detail.value),
        q: intentionForm.value.date,
        r: common_vendor.o(($event) => intentionForm.value.date = $event.detail.value),
        s: common_vendor.o(closePopup),
        t: common_vendor.o(submitIntention)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-dd3a9fa7"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/supply/index.vue"]]);
wx.createPage(MiniProgramPage);
