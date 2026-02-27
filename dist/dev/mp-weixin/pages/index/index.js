"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const announcements = common_vendor.ref([
      {
        type: "政策",
        title: "关于2025年柑肉回收补贴政策说明",
        summary: "为鼓励环保处理，本年度对合规回收商提供每吨50元的专项补贴...",
        doc_number: "XH-2025-001",
        image_url: ""
      },
      {
        type: "平台",
        title: "循果环生平台正式上线公告",
        summary: "数字化赋能新会陈皮产业，打造绿色循环经济...",
        doc_number: "XH-2025-002",
        image_url: ""
      }
    ]);
    const cases = common_vendor.ref([
      {
        title: "双水镇柑肉无害化处理示范点",
        trade_data: "年处理量 5000 吨",
        description: "通过生物发酵技术将废弃柑肉转化为有机肥料，实现零排放。",
        logo_url: ""
      },
      {
        title: "三江镇绿色循环农业基地",
        trade_data: "年处理量 3000 吨",
        description: "采用烘干制粉工艺，开发柑肉饲料添加剂，提升附加值。",
        logo_url: ""
      }
    ]);
    const currentAnnouncement = common_vendor.ref(announcements.value[0]);
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({
        url,
        fail: (err) => {
          console.error("Navigation failed:", err);
          common_vendor.index.showToast({
            title: "跳转失败，请重试",
            icon: "none"
          });
        }
      });
    };
    const navigateToProcessor = () => {
      common_vendor.index.navigateTo({
        url: "/pages/processor/dashboard/index",
        fail: (err) => {
          console.error("跳转处理商工作台失败:", err);
          common_vendor.index.showToast({
            title: "跳转失败，请重试",
            icon: "none"
          });
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(announcements.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.title),
            b: index
          };
        }),
        b: common_vendor.o(($event) => navigateTo("/pages/farmer/dashboard/index")),
        c: common_vendor.o(($event) => navigateTo("/pages/merchant/dashboard/index")),
        d: common_vendor.o(navigateToProcessor),
        e: common_vendor.o(($event) => navigateTo("/pages/admin/dashboard/index")),
        f: announcements.value.length > 0
      }, announcements.value.length > 0 ? common_vendor.e({
        g: currentAnnouncement.value.image_url
      }, currentAnnouncement.value.image_url ? {
        h: currentAnnouncement.value.image_url
      } : {}, {
        i: common_vendor.t(currentAnnouncement.value.type),
        j: common_vendor.t(currentAnnouncement.value.doc_number),
        k: common_vendor.t(currentAnnouncement.value.title),
        l: common_vendor.t(currentAnnouncement.value.summary)
      }) : {}, {
        m: common_vendor.f(cases.value, (item, index, i0) => {
          return common_vendor.e({
            a: item.logo_url
          }, item.logo_url ? {
            b: item.logo_url
          } : {}, {
            c: common_vendor.t(item.title),
            d: item.trade_data
          }, item.trade_data ? {
            e: common_vendor.t(item.trade_data)
          } : {}, {
            f: common_vendor.t(item.description),
            g: index
          });
        }),
        n: cases.value.length === 0
      }, cases.value.length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-83a5a03c"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
