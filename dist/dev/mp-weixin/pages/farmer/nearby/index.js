"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const latitude = common_vendor.ref(22.5431);
    const longitude = common_vendor.ref(113.035);
    const markers = common_vendor.ref([]);
    const publicAddresses = common_vendor.ref([]);
    const showPopup = common_vendor.ref(false);
    const currentTarget = common_vendor.ref({});
    const intentionForm = common_vendor.ref({ price: "", weight: "", date: "" });
    const fuzzPhone = (phone) => String(phone).replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    const fuzzName = (name, role) => {
      const surname = name ? name.charAt(0) : "某";
      return role === "merchant" ? surname + "氏回收站" : surname + "氏处理厂";
    };
    const fuzzDetail = () => "（详细地址经平台保护，签约后可见）";
    const initSeedData = () => {
      const existing = common_vendor.index.getStorageSync("global_addresses");
      if (!existing || existing.length === 0) {
        const seedData = [
          {
            id: "ADDR-SEED-001",
            role: "merchant",
            name: "李记回收站",
            phone: "13800001111",
            region: "广东省 江门市 新会区",
            detail: "三江镇银洲湖大道88号",
            is_default: true,
            is_public: true,
            latitude: 22.558,
            longitude: 113.034
          },
          {
            id: "ADDR-SEED-002",
            role: "processor",
            name: "新会绿源处理厂",
            phone: "13900002222",
            region: "广东省 江门市 新会区",
            detail: "双水镇工业园区A栋2层",
            is_default: true,
            is_public: true,
            latitude: 22.492,
            longitude: 113.058
          }
        ];
        common_vendor.index.setStorageSync("global_addresses", seedData);
      }
    };
    common_vendor.onShow(() => {
      initSeedData();
      const allAddresses = common_vendor.index.getStorageSync("global_addresses") || [];
      const filtered = allAddresses.filter(
        (a) => a.is_public === true && (a.role === "merchant" || a.role === "processor")
      );
      publicAddresses.value = filtered.map((item) => ({
        ...item,
        phone: fuzzPhone(item.phone),
        name: fuzzName(item.name, item.role),
        detail: fuzzDetail()
      }));
      const mapMarkers = filtered.map((item, index) => ({
        id: index + 1,
        latitude: item.latitude,
        longitude: item.longitude,
        title: fuzzName(item.name, item.role),
        callout: {
          content: fuzzName(item.name, item.role) + (item.role === "merchant" ? "（回收商）" : "（处理商）"),
          display: "ALWAYS",
          fontSize: 12,
          color: "#333333",
          bgColor: "#FFFFFF",
          padding: 8,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#2E7D32"
        },
        iconPath: "",
        width: 30,
        height: 30
      }));
      markers.value = mapMarkers;
      if (filtered.length > 0) {
        latitude.value = filtered[0].latitude;
        longitude.value = filtered[0].longitude;
      }
    });
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
        target_name: currentTarget.value.name,
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
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: latitude.value,
        b: longitude.value,
        c: markers.value,
        d: common_vendor.f(publicAddresses.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.name),
            b: common_vendor.t(item.role === "merchant" ? "回收商" : "处理商"),
            c: common_vendor.n(item.role === "merchant" ? "badge-merchant" : "badge-processor"),
            d: common_vendor.t(item.region),
            e: common_vendor.t(item.phone),
            f: common_vendor.o(($event) => openIntentionPopup(item), item.id),
            g: item.id
          };
        }),
        e: publicAddresses.value.length === 0
      }, publicAddresses.value.length === 0 ? {} : {}, {
        f: showPopup.value
      }, showPopup.value ? {
        g: common_vendor.o(closePopup)
      } : {}, {
        h: showPopup.value
      }, showPopup.value ? common_vendor.e({
        i: common_vendor.t(currentTarget.value.name),
        j: intentionForm.value.price,
        k: common_vendor.o(($event) => intentionForm.value.price = $event.detail.value),
        l: intentionForm.value.weight,
        m: common_vendor.o(($event) => intentionForm.value.weight = $event.detail.value),
        n: intentionForm.value.date
      }, intentionForm.value.date ? {
        o: common_vendor.t(intentionForm.value.date)
      } : {}, {
        p: intentionForm.value.date,
        q: common_vendor.o(onDateChange),
        r: common_vendor.o(closePopup),
        s: common_vendor.o(submitIntention)
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-08110e48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/nearby/index.vue"]]);
wx.createPage(MiniProgramPage);
