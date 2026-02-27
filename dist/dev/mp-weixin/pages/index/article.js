"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "article",
  setup(__props) {
    const MOCK_ARTICLE = {
      title: "关于2025年柑肉回收补贴政策说明",
      publishTime: "2025-01-10 09:00",
      coverUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      content: `<h1>2025年柑肉回收补贴政策</h1>
<p>为鼓励环保处理，促进新会陈皮产业绿色可持续发展，现公布本年度柑肉回收专项补贴方案：</p>

<h2>一、补贴标准</h2>
<p><strong>合规回收商</strong>每回收处理一吨柑肉废料，可获得 <strong>50元/吨</strong> 的专项补贴。</p>
<ul>
  <li>补贴资金由市农业农村局统一拨付</li>
  <li>按季度核算，次月15日前发放</li>
  <li>需提供完整的回收凭证与处理记录</li>
</ul>

<h2>二、申请条件</h2>
<p>申请主体须满足以下条件：</p>
<ul>
  <li>持有有效的环保处理资质证书</li>
  <li>在本平台注册并通过实名认证</li>
  <li>上年度回收量达到 <strong>100吨</strong> 以上</li>
  <li>无环保违规记录</li>
</ul>

<h2>三、申报流程</h2>
<p>1. 登录"循果环生"平台，进入<strong>农户工作台</strong></p>
<p>2. 点击"发起申报"，上传相关证明材料</p>
<p>3. 平台管理员审核通过后，自动进入补贴发放队列</p>
<p>4. 资金到账后可在"财务中心"查看明细</p>

<h2>四、注意事项</h2>
<p><strong>严禁虚报回收数量</strong>，一经查实将取消补贴资格并追缴已发放补贴款。</p>
<p>如有疑问请拨打客服热线：<strong>400-888-6688</strong></p>

<p style="color:#999;margin-top:40px;">发布单位：新会区农业农村局<br/>文件编号：XH-2025-001</p>`
    };
    const article = common_vendor.ref({ ...MOCK_ARTICLE });
    common_vendor.onShow(() => {
      try {
        const current = common_vendor.index.getStorageSync("article_current");
        if (current && current.title) {
          article.value = {
            title: current.title || MOCK_ARTICLE.title,
            publishTime: current.publishTime || (current.date ? current.date + " 00:00" : MOCK_ARTICLE.publishTime),
            coverUrl: current.coverUrl || current.image_url || MOCK_ARTICLE.coverUrl,
            content: current.content || `<p>${current.summary || current.description || ""}</p>`
          };
        }
      } catch (e) {
        console.warn("[Article] 读取缓存失败", e);
      }
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(article.value.title),
        b: common_vendor.t(article.value.publishTime),
        c: article.value.coverUrl
      }, article.value.coverUrl ? {
        d: article.value.coverUrl
      } : {}, {
        e: article.value.content
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-0ced8760"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/index/article.vue"]]);
wx.createPage(MiniProgramPage);
