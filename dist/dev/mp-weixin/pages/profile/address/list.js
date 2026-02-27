"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "list",
  setup(__props) {
    const addressList = common_vendor.ref([]);
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
      const currentRole = common_vendor.index.getStorageSync("current_role") || "farmer";
      const allAddresses = common_vendor.index.getStorageSync("global_addresses") || [];
      addressList.value = allAddresses.filter((a) => a.role === currentRole);
    });
    const goAddAddress = () => {
      common_vendor.index.navigateTo({ url: "/pages/profile/address/edit" });
    };
    const editAddress = (item) => {
      common_vendor.index.setStorageSync("editing_address", item);
      common_vendor.index.navigateTo({ url: "/pages/profile/address/edit?id=" + item.id });
    };
    const setDefault = (item) => {
      const currentRole = common_vendor.index.getStorageSync("current_role") || "farmer";
      let allAddresses = common_vendor.index.getStorageSync("global_addresses") || [];
      allAddresses = allAddresses.map((a) => {
        if (a.role === currentRole) {
          a.is_default = a.id === item.id;
        }
        return a;
      });
      common_vendor.index.setStorageSync("global_addresses", allAddresses);
      addressList.value = allAddresses.filter((a) => a.role === currentRole);
      common_vendor.index.showToast({ title: "已设为默认", icon: "success" });
    };
    const deleteAddress = (item) => {
      common_vendor.index.showModal({
        title: "确认删除",
        content: "确定删除该地址吗？",
        success: (res) => {
          if (res.confirm) {
            let allAddresses = common_vendor.index.getStorageSync("global_addresses") || [];
            allAddresses = allAddresses.filter((a) => a.id !== item.id);
            common_vendor.index.setStorageSync("global_addresses", allAddresses);
            const currentRole = common_vendor.index.getStorageSync("current_role") || "farmer";
            addressList.value = allAddresses.filter((a) => a.role === currentRole);
            common_vendor.index.showToast({ title: "已删除", icon: "success" });
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(addressList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.name),
            b: common_vendor.t(item.phone),
            c: item.is_default
          }, item.is_default ? {} : {}, {
            d: item.is_public
          }, item.is_public ? {} : {}, {
            e: common_vendor.t(item.region),
            f: common_vendor.t(item.detail),
            g: common_vendor.o(($event) => editAddress(item), item.id),
            h: !item.is_default
          }, !item.is_default ? {
            i: common_vendor.o(($event) => setDefault(item), item.id)
          } : {}, {
            j: common_vendor.o(($event) => deleteAddress(item), item.id),
            k: item.id
          });
        }),
        b: addressList.value.length === 0
      }, addressList.value.length === 0 ? {} : {}, {
        c: common_vendor.o(goAddAddress)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a12bd353"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/profile/address/list.vue"]]);
wx.createPage(MiniProgramPage);
