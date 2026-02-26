"use strict";
const common_vendor = require("../../../common/vendor.js");
const utils_request = require("../../../utils/request.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const isLoading = common_vendor.ref(true);
    const statusMessage = common_vendor.ref("正在获取您的位置...");
    const error = common_vendor.ref(null);
    const userLocation = common_vendor.ref(null);
    const recyclers = common_vendor.ref([]);
    common_vendor.ref(false);
    common_vendor.ref(null);
    common_vendor.onLoad(() => {
      init();
    });
    const init = async () => {
      isLoading.value = true;
      error.value = null;
      statusMessage.value = "正在获取您的位置...";
      try {
        userLocation.value = await getLocation();
        statusMessage.value = "正在查找附近的处理点...";
        const data = await utils_request.request.get("/recyclers/nearby", {
          lat: userLocation.value.lat,
          lng: userLocation.value.lng,
          limit: 5
        });
        recyclers.value = data || [];
        statusMessage.value = `✓ 找到 ${recyclers.value.length} 个附近的处理点`;
      } catch (err) {
        console.error("Init failed:", err);
        error.value = err.message || "加载失败，请检查网络或定位权限";
        statusMessage.value = "加载失败";
      } finally {
        isLoading.value = false;
      }
    };
    const getLocation = () => {
      return new Promise((resolve, reject) => {
        common_vendor.index.getLocation({
          type: "gcj02",
          // Use GCJ02 for better map compatibility in China
          success: (res) => {
            resolve({
              lat: res.latitude,
              lng: res.longitude
            });
          },
          fail: (err) => {
            console.warn("Location failed, using default (Beijing)", err);
            resolve({ lat: 39.9042, lng: 116.4074 });
          }
        });
      });
    };
    const callPhone = (phone) => {
      if (!phone || phone === "未提供") {
        common_vendor.index.showToast({ title: "该处理点未提供联系电话", icon: "none" });
        return;
      }
      common_vendor.index.makePhoneCall({
        phoneNumber: phone,
        fail: (err) => {
          console.error("Make phone call failed:", err);
        }
      });
    };
    const showRoute = (index) => {
      const destination = recyclers.value[index];
      if (!destination || !userLocation.value)
        return;
      common_vendor.index.openLocation({
        latitude: Number(destination.latitude),
        longitude: Number(destination.longitude),
        name: destination.name,
        address: destination.address,
        scale: 15
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: isLoading.value
      }, isLoading.value ? {} : {}, {
        b: common_vendor.t(statusMessage.value),
        c: userLocation.value && !isLoading.value
      }, userLocation.value && !isLoading.value ? {
        d: common_vendor.t(userLocation.value.lat.toFixed(4)),
        e: common_vendor.t(userLocation.value.lng.toFixed(4))
      } : {}, {
        f: error.value
      }, error.value ? {
        g: common_vendor.t(error.value),
        h: common_vendor.o(init)
      } : {}, {
        i: isLoading.value ? 1 : "",
        j: !isLoading.value && !error.value
      }, !isLoading.value && !error.value ? common_vendor.e({
        k: recyclers.value.length === 0
      }, recyclers.value.length === 0 ? {} : {}, {
        l: common_vendor.f(recyclers.value, (recycler, index, i0) => {
          return {
            a: common_vendor.t(recycler.name),
            b: common_vendor.t(recycler.distance),
            c: common_vendor.t(recycler.phone || "未提供"),
            d: common_vendor.t(recycler.address),
            e: common_vendor.t(recycler.businessHours || "营业时间未知"),
            f: common_vendor.o(($event) => callPhone(recycler.phone), recycler.id),
            g: common_vendor.o(($event) => showRoute(index), recycler.id),
            h: recycler.id,
            i: common_vendor.o(($event) => showRoute(index), recycler.id)
          };
        })
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-08110e48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/nearby/index.vue"]]);
wx.createPage(MiniProgramPage);
