"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const latitude = common_vendor.ref(22.5431);
    const longitude = common_vendor.ref(113.035);
    const markers = common_vendor.ref([]);
    const publicAddresses = common_vendor.ref([]);
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
      publicAddresses.value = filtered;
      const mapMarkers = filtered.map((item, index) => ({
        id: index + 1,
        latitude: item.latitude,
        longitude: item.longitude,
        title: item.name,
        callout: {
          content: item.name + (item.role === "merchant" ? "（回收商）" : "（处理商）"),
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
    const callPhone = (phoneNumber) => {
      common_vendor.index.makePhoneCall({
        phoneNumber,
        fail: () => {
          common_vendor.index.showToast({ title: "拨号失败", icon: "none" });
        }
      });
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
            e: common_vendor.t(item.detail),
            f: common_vendor.t(item.phone),
            g: common_vendor.o(($event) => callPhone(item.phone), item.id),
            h: item.id
          };
        }),
        e: publicAddresses.value.length === 0
      }, publicAddresses.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-08110e48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/nearby/index.vue"]]);
wx.createPage(MiniProgramPage);
