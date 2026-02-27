"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "edit",
  setup(__props) {
    const isEdit = common_vendor.ref(false);
    const editId = common_vendor.ref("");
    const regionArray = common_vendor.ref([]);
    const form = common_vendor.ref({
      name: "",
      phone: "",
      region: "",
      detail: "",
      is_default: false,
      is_public: false
    });
    common_vendor.onLoad((query) => {
      if (query && query.id) {
        isEdit.value = true;
        editId.value = query.id;
        const cached = common_vendor.index.getStorageSync("editing_address");
        if (cached && cached.id === query.id) {
          form.value.name = cached.name || "";
          form.value.phone = cached.phone || "";
          form.value.region = cached.region || "";
          form.value.detail = cached.detail || "";
          form.value.is_default = !!cached.is_default;
          form.value.is_public = !!cached.is_public;
          if (cached.region) {
            regionArray.value = cached.region.split(" ");
          }
        }
      }
    });
    const onRegionChange = (e) => {
      const val = e.detail.value;
      form.value.region = val.join(" ");
      regionArray.value = val;
    };
    const saveAddress = () => {
      if (!form.value.name)
        return showToast("请输入联系人");
      if (!form.value.phone)
        return showToast("请输入手机号");
      if (!form.value.region)
        return showToast("请选择所在地区");
      if (!form.value.detail)
        return showToast("请输入详细地址");
      const currentRole = common_vendor.index.getStorageSync("current_role") || "farmer";
      let allAddresses = common_vendor.index.getStorageSync("global_addresses") || [];
      const baseLat = 22.5431;
      const baseLng = 113.035;
      const randomLat = baseLat + (Math.random() - 0.5) * 0.12;
      const randomLng = baseLng + (Math.random() - 0.5) * 0.12;
      if (isEdit.value) {
        allAddresses = allAddresses.map((a) => {
          if (a.id === editId.value) {
            return {
              ...a,
              name: form.value.name,
              phone: form.value.phone,
              region: form.value.region,
              detail: form.value.detail,
              is_default: form.value.is_default,
              is_public: form.value.is_public,
              latitude: a.latitude || randomLat,
              longitude: a.longitude || randomLng
            };
          }
          return a;
        });
        if (form.value.is_default) {
          allAddresses = allAddresses.map((a) => {
            if (a.role === currentRole && a.id !== editId.value) {
              a.is_default = false;
            }
            return a;
          });
        }
      } else {
        const newAddress = {
          id: "ADDR-" + Date.now(),
          role: currentRole,
          name: form.value.name,
          phone: form.value.phone,
          region: form.value.region,
          detail: form.value.detail,
          is_default: form.value.is_default,
          is_public: form.value.is_public,
          latitude: randomLat,
          longitude: randomLng
        };
        if (form.value.is_default) {
          allAddresses = allAddresses.map((a) => {
            if (a.role === currentRole) {
              a.is_default = false;
            }
            return a;
          });
        }
        allAddresses.unshift(newAddress);
      }
      common_vendor.index.setStorageSync("global_addresses", allAddresses);
      common_vendor.index.removeStorageSync("editing_address");
      common_vendor.index.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1e3);
    };
    const showToast = (title) => {
      common_vendor.index.showToast({ title, icon: "none" });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(isEdit.value ? "✏️ 编辑地址" : "📍 新增地址"),
        b: form.value.name,
        c: common_vendor.o(($event) => form.value.name = $event.detail.value),
        d: form.value.phone,
        e: common_vendor.o(($event) => form.value.phone = $event.detail.value),
        f: form.value.region
      }, form.value.region ? {
        g: common_vendor.t(form.value.region)
      } : {}, {
        h: regionArray.value,
        i: common_vendor.o(onRegionChange),
        j: form.value.detail,
        k: common_vendor.o(($event) => form.value.detail = $event.detail.value),
        l: form.value.is_default,
        m: common_vendor.o(($event) => form.value.is_default = $event.detail.value),
        n: form.value.is_public,
        o: common_vendor.o(($event) => form.value.is_public = $event.detail.value),
        p: common_vendor.o(saveAddress)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a2877727"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/profile/address/edit.vue"]]);
wx.createPage(MiniProgramPage);
