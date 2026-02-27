"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const latitude = common_vendor.ref(22.543099);
    const longitude = common_vendor.ref(114.057868);
    const markers = common_vendor.ref([
      {
        id: 1,
        latitude: 22.543099,
        longitude: 114.057868,
        title: "您的位置"
      }
    ]);
    const recyclers = common_vendor.ref([
      {
        name: "绿源农业废弃物处理厂",
        address: "xx镇xx路1号",
        distance: 2.5,
        phone: "13800138000"
      },
      {
        name: "循果环保科技回收站",
        address: "xx区xx工业园",
        distance: 5.2,
        phone: "13900139000"
      }
    ]);
    const callPhone = (phoneNumber) => {
      common_vendor.index.makePhoneCall({
        phoneNumber
      });
    };
    return (_ctx, _cache) => {
      return {
        a: latitude.value,
        b: longitude.value,
        c: markers.value,
        d: common_vendor.f(recyclers.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.name),
            b: common_vendor.t(item.address),
            c: common_vendor.t(item.distance),
            d: common_vendor.o(($event) => callPhone(item.phone), index),
            e: index
          };
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-08110e48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/nearby/index.vue"]]);
wx.createPage(MiniProgramPage);
