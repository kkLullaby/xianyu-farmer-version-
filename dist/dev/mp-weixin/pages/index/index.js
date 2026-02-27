"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const DEFAULT_ANNOUNCEMENTS = [
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
    ];
    const DEFAULT_CASES = [
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
    ];
    const adConfig = common_vendor.ref({
      show: true,
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      text: "诚招环保设备合作商 / 优质果渣出售",
      link: "/pages/common/ad-detail"
    });
    const announcements = common_vendor.ref([...DEFAULT_ANNOUNCEMENTS]);
    const cases = common_vendor.ref([...DEFAULT_CASES]);
    const currentAnnouncement = common_vendor.ref(DEFAULT_ANNOUNCEMENTS[0]);
    const footerContact = common_vendor.ref({
      phone: "400-888-6688",
      email: "contact@xunguohs.com",
      address: "广东省江门市新会区陈皮产业园"
    });
    common_vendor.onShow(() => {
      try {
        const cmsSettings = common_vendor.index.getStorageSync("cms_settings");
        if (cmsSettings) {
          if (cmsSettings.adConfig) {
            Object.assign(adConfig.value, cmsSettings.adConfig);
          }
          if (cmsSettings.basicConfig) {
            const bc = cmsSettings.basicConfig;
            if (bc.phone)
              footerContact.value.phone = bc.phone;
            if (bc.email)
              footerContact.value.email = bc.email;
            if (bc.address)
              footerContact.value.address = bc.address;
            if (bc.topAnnouncements) {
              const lines = bc.topAnnouncements.split("\n").filter((l) => l.trim());
              if (lines.length > 0) {
                const parsed = lines.map((line, i) => ({
                  type: "公告",
                  title: line.trim(),
                  summary: "",
                  doc_number: `XH-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(i + 1).padStart(3, "0")}`,
                  image_url: ""
                }));
                announcements.value = parsed;
                currentAnnouncement.value = parsed[0];
              }
            }
          }
        }
        const cmsArticles = common_vendor.index.getStorageSync("cms_articles");
        if (cmsArticles && cmsArticles.length > 0) {
          const mapped = cmsArticles.map((a, i) => ({
            type: "文章",
            title: a.title,
            summary: a.content ? a.content.replace(/<[^>]+>/g, "").slice(0, 60) + "..." : "",
            doc_number: `ART-${String(i + 1).padStart(3, "0")}`,
            image_url: a.coverUrl || "",
            _raw: a
          }));
          announcements.value = [...mapped, ...announcements.value];
          currentAnnouncement.value = announcements.value[0];
        }
      } catch (e) {
        console.warn("[Index] 读取 CMS 缓存失败", e);
      }
    });
    const goArticle = (item) => {
      if (!item || !item.title)
        return;
      try {
        common_vendor.index.setStorageSync("article_current", item._raw || item);
      } catch (e) {
      }
      common_vendor.index.navigateTo({ url: "/pages/index/article" });
    };
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({
        url,
        fail: (err) => {
          console.error("Navigation failed:", err);
          common_vendor.index.showToast({ title: "跳转失败，请重试", icon: "none" });
        }
      });
    };
    const navigateToProcessor = () => {
      common_vendor.index.navigateTo({
        url: "/pages/processor/dashboard/index",
        fail: (err) => {
          console.error("跳转处理商工作台失败:", err);
          common_vendor.index.showToast({ title: "跳转失败，请重试", icon: "none" });
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
        f: adConfig.value.show
      }, adConfig.value.show ? common_vendor.e({
        g: adConfig.value.imageUrl,
        h: adConfig.value.text
      }, adConfig.value.text ? {
        i: common_vendor.t(adConfig.value.text)
      } : {}, {
        j: common_vendor.o(($event) => navigateTo(adConfig.value.link))
      }) : {}, {
        k: announcements.value.length > 0
      }, announcements.value.length > 0 ? common_vendor.e({
        l: currentAnnouncement.value.image_url
      }, currentAnnouncement.value.image_url ? {
        m: currentAnnouncement.value.image_url
      } : {}, {
        n: common_vendor.t(currentAnnouncement.value.type),
        o: common_vendor.t(currentAnnouncement.value.doc_number),
        p: common_vendor.t(currentAnnouncement.value.title),
        q: common_vendor.t(currentAnnouncement.value.summary),
        r: common_vendor.o(($event) => goArticle(currentAnnouncement.value))
      }) : {}, {
        s: common_vendor.f(cases.value, (item, index, i0) => {
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
            g: index,
            h: common_vendor.o(($event) => goArticle(item), index)
          });
        }),
        t: cases.value.length === 0
      }, cases.value.length === 0 ? {} : {}, {
        v: common_vendor.t(footerContact.value.phone)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-83a5a03c"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
