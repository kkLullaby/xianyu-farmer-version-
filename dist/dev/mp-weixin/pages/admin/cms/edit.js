"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "edit",
  setup(__props) {
    const form = common_vendor.ref({
      title: "",
      coverUrl: "",
      content: ""
    });
    const handlePublish = () => {
      if (!form.value.title.trim()) {
        common_vendor.index.showToast({ title: "请输入文章标题", icon: "none" });
        return;
      }
      if (!form.value.content.trim()) {
        common_vendor.index.showToast({ title: "请输入正文内容", icon: "none" });
        return;
      }
      const article = {
        title: form.value.title,
        coverUrl: form.value.coverUrl,
        content: form.value.content,
        publishTime: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ")
      };
      try {
        const list = common_vendor.index.getStorageSync("cms_articles") || [];
        list.unshift(article);
        common_vendor.index.setStorageSync("cms_articles", list);
      } catch (e) {
        console.warn("[CMS] 保存文章失败", e);
      }
      common_vendor.index.showToast({ title: "发布成功", icon: "success" });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1500);
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: form.value.title,
        b: common_vendor.o(($event) => form.value.title = $event.detail.value),
        c: form.value.coverUrl,
        d: common_vendor.o(($event) => form.value.coverUrl = $event.detail.value),
        e: form.value.coverUrl
      }, form.value.coverUrl ? {
        f: form.value.coverUrl
      } : {}, {
        g: -1,
        h: form.value.content,
        i: common_vendor.o(($event) => form.value.content = $event.detail.value),
        j: common_vendor.o(handlePublish)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a0c596fa"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/cms/edit.vue"]]);
wx.createPage(MiniProgramPage);
