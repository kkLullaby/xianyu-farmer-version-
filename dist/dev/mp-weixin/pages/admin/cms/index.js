"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const defaultBasicConfig = {
      topAnnouncements: "关于2025年柑肉回收补贴政策说明\n循果环生平台正式上线公告",
      phone: "400-888-6688",
      email: "contact@xunguohs.com",
      address: "广东省江门市新会区陈皮产业园"
    };
    const defaultAdConfig = {
      show: true,
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      text: "诚招环保设备合作商 / 优质果渣出售",
      link: "/pages/common/ad-detail"
    };
    const basicConfig = common_vendor.ref({ ...defaultBasicConfig });
    const articleConfig = common_vendor.ref({
      policies: [
        { title: "关于2025年柑肉回收补贴政策说明", date: "2025-01-10" },
        { title: "循果环生平台正式上线公告", date: "2025-01-01" }
      ],
      cases: [
        { title: "日处理50吨，某果业实现零排放", company: "绿源果业处理厂" },
        { title: "果皮变废为宝，农户增收新途径", company: "新会陈皮合作社" }
      ]
    });
    const adConfig = common_vendor.ref({ ...defaultAdConfig });
    common_vendor.onMounted(() => {
      try {
        const cached = common_vendor.index.getStorageSync("cms_settings");
        if (cached) {
          if (cached.basicConfig)
            Object.assign(basicConfig.value, cached.basicConfig);
          if (cached.adConfig)
            Object.assign(adConfig.value, cached.adConfig);
        }
      } catch (e) {
        console.warn("[CMS] 读取缓存失败", e);
      }
    });
    const saveConfig = (moduleName) => {
      try {
        const data = {
          basicConfig: { ...basicConfig.value },
          adConfig: { ...adConfig.value }
        };
        common_vendor.index.setStorageSync("cms_settings", data);
        common_vendor.index.showToast({ title: `${moduleName} 保存成功`, icon: "success" });
      } catch (e) {
        common_vendor.index.showToast({ title: "保存失败", icon: "error" });
      }
    };
    const goEdit = (type, index) => {
      let url = "/pages/admin/cms/edit?type=" + type;
      if (index !== void 0)
        url += "&index=" + index;
      common_vendor.index.navigateTo({ url });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: currentTab.value === 0
      }, currentTab.value === 0 ? {} : {}, {
        b: currentTab.value === 0 ? 1 : "",
        c: common_vendor.o(($event) => currentTab.value = 0),
        d: currentTab.value === 1
      }, currentTab.value === 1 ? {} : {}, {
        e: currentTab.value === 1 ? 1 : "",
        f: common_vendor.o(($event) => currentTab.value = 1),
        g: currentTab.value === 2
      }, currentTab.value === 2 ? {} : {}, {
        h: currentTab.value === 2 ? 1 : "",
        i: common_vendor.o(($event) => currentTab.value = 2),
        j: currentTab.value === 0
      }, currentTab.value === 0 ? {
        k: basicConfig.value.topAnnouncements,
        l: common_vendor.o(($event) => basicConfig.value.topAnnouncements = $event.detail.value),
        m: basicConfig.value.phone,
        n: common_vendor.o(($event) => basicConfig.value.phone = $event.detail.value),
        o: basicConfig.value.email,
        p: common_vendor.o(($event) => basicConfig.value.email = $event.detail.value),
        q: basicConfig.value.address,
        r: common_vendor.o(($event) => basicConfig.value.address = $event.detail.value),
        s: common_vendor.o(($event) => saveConfig("基础配置"))
      } : {}, {
        t: currentTab.value === 1
      }, currentTab.value === 1 ? {
        v: common_vendor.o(($event) => goEdit("policy")),
        w: common_vendor.f(articleConfig.value.policies, (item, index, i0) => {
          return {
            a: common_vendor.t(item.title),
            b: common_vendor.t(item.date),
            c: common_vendor.o(($event) => goEdit("policy", index), index),
            d: index
          };
        }),
        x: common_vendor.o(($event) => goEdit("case")),
        y: common_vendor.f(articleConfig.value.cases, (item, index, i0) => {
          return {
            a: common_vendor.t(item.title),
            b: common_vendor.t(item.company),
            c: common_vendor.o(($event) => goEdit("case", index), index),
            d: index
          };
        })
      } : {}, {
        z: currentTab.value === 2
      }, currentTab.value === 2 ? common_vendor.e({
        A: adConfig.value.show,
        B: common_vendor.o(($event) => adConfig.value.show = $event.detail.value),
        C: adConfig.value.show
      }, adConfig.value.show ? {
        D: adConfig.value.imageUrl,
        E: common_vendor.o(($event) => adConfig.value.imageUrl = $event.detail.value)
      } : {}, {
        F: adConfig.value.show
      }, adConfig.value.show ? {
        G: adConfig.value.text,
        H: common_vendor.o(($event) => adConfig.value.text = $event.detail.value)
      } : {}, {
        I: adConfig.value.show
      }, adConfig.value.show ? {
        J: adConfig.value.link,
        K: common_vendor.o(($event) => adConfig.value.link = $event.detail.value)
      } : {}, {
        L: adConfig.value.show && adConfig.value.imageUrl
      }, adConfig.value.show && adConfig.value.imageUrl ? {
        M: adConfig.value.imageUrl
      } : {}, {
        N: common_vendor.o(($event) => saveConfig("商业广告位"))
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e8dc0e98"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/cms/index.vue"]]);
wx.createPage(MiniProgramPage);
