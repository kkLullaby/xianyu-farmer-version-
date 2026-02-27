"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const showPanel = common_vendor.ref(false);
    const currentItem = common_vendor.ref({});
    const verdictForm = common_vendor.ref({
      party: "",
      opinion: ""
    });
    const partyLabels = {
      applicant: "申请方责任",
      respondent: "被申请方责任",
      both: "双方共同责任",
      platform: "平台责任"
    };
    const arbitrationList = common_vendor.ref([
      {
        id: "ARB20260225001",
        order_no: "ORD20260220001",
        applicant: "张三",
        role: "农户",
        reason: "重量争议",
        description: "实际称重与回收商记录不符，相差约50斤，农户要求按实际重量重新结算。",
        status: "pending",
        created_at: "2026-02-25 10:00",
        verdict_party: null,
        verdict_opinion: null,
        verdict_time: null
      },
      {
        id: "ARB20260224002",
        order_no: "ORD20260219005",
        applicant: "李四",
        role: "回收商",
        reason: "品质不符",
        description: "农户提供的柑肉含有大量杂质，不符合一级品收购标准，回收商要求降级处理。",
        status: "pending",
        created_at: "2026-02-24 15:30",
        verdict_party: null,
        verdict_opinion: null,
        verdict_time: null
      },
      {
        id: "ARB20260223003",
        order_no: "ORD20260218002",
        applicant: "王五",
        role: "农户",
        reason: "付款延迟",
        description: "确认收货后超过48小时未收到结算款项，农户生活困难请求紧急处理。",
        status: "urgent",
        created_at: "2026-02-23 09:15",
        verdict_party: null,
        verdict_opinion: null,
        verdict_time: null
      },
      {
        id: "ARB20260210004",
        order_no: "ORD20260205010",
        applicant: "赵六",
        role: "处理商",
        reason: "合同违约",
        description: "供应方未按合同约定时间交货，导致生产线停工。",
        status: "resolved",
        created_at: "2026-02-10 08:00",
        verdict_party: "被申请方责任",
        verdict_opinion: "经核实，供应方确实延迟交货3日。裁定供应方赔偿停工损失2000元，并在5个工作日内完成交付。",
        verdict_time: "2026-02-12 14:30"
      }
    ]);
    const loadGlobalArbitrationList = () => {
      const globalList = common_vendor.index.getStorageSync("global_arbitration_list") || [];
      if (Array.isArray(globalList) && globalList.length > 0) {
        arbitrationList.value = globalList.map((item) => ({
          ...item,
          reason: item.reason || item.dispute_type || "其他纠纷"
        }));
      }
    };
    common_vendor.onShow(() => {
      loadGlobalArbitrationList();
    });
    const pendingCount = common_vendor.computed(() => arbitrationList.value.filter((i) => i.status === "pending").length);
    const urgentCount = common_vendor.computed(() => arbitrationList.value.filter((i) => i.status === "urgent").length);
    const resolvedCount = common_vendor.computed(() => arbitrationList.value.filter((i) => i.status === "resolved").length);
    const getStatusText = (status) => {
      const map = { pending: "待处理", urgent: "紧急", resolved: "已裁决" };
      return map[status] || status;
    };
    const openPanel = (item) => {
      currentItem.value = item;
      verdictForm.value = { party: "", opinion: "" };
      showPanel.value = true;
    };
    const closePanel = () => {
      showPanel.value = false;
    };
    const submitVerdict = () => {
      if (!verdictForm.value.party) {
        common_vendor.index.showToast({ title: "请选择责任方", icon: "none" });
        return;
      }
      if (!verdictForm.value.opinion.trim()) {
        common_vendor.index.showToast({ title: "请输入仲裁意见", icon: "none" });
        return;
      }
      const target = arbitrationList.value.find((i) => i.id === currentItem.value.id);
      if (target) {
        target.status = "resolved";
        target.verdict_party = partyLabels[verdictForm.value.party];
        target.verdict_opinion = verdictForm.value.opinion;
        target.verdict_time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN").replace(/\//g, "-");
        target.result = target.verdict_opinion;
      }
      const globalList = arbitrationList.value.map((item) => ({ ...item }));
      common_vendor.index.setStorageSync("global_arbitration_list", globalList);
      showPanel.value = false;
      common_vendor.index.showToast({ title: "裁决已生效", icon: "success" });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(common_vendor.unref(pendingCount)),
        b: common_vendor.t(common_vendor.unref(urgentCount)),
        c: common_vendor.t(common_vendor.unref(resolvedCount)),
        d: common_vendor.f(arbitrationList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.id),
            b: common_vendor.t(getStatusText(item.status)),
            c: common_vendor.n("status-" + item.status),
            d: common_vendor.t(item.order_no),
            e: common_vendor.t(item.applicant),
            f: common_vendor.t(item.role),
            g: common_vendor.t(item.reason),
            h: common_vendor.t(item.description),
            i: item.status === "resolved"
          }, item.status === "resolved" ? {
            j: common_vendor.t(item.verdict_party),
            k: common_vendor.t(item.verdict_opinion),
            l: common_vendor.t(item.verdict_time)
          } : {}, {
            m: common_vendor.t(item.created_at),
            n: item.status !== "resolved"
          }, item.status !== "resolved" ? {
            o: common_vendor.o(($event) => openPanel(item), item.id)
          } : {}, {
            p: item.status === "resolved" ? 1 : "",
            q: item.id
          });
        }),
        e: arbitrationList.value.length === 0
      }, arbitrationList.value.length === 0 ? {} : {}, {
        f: showPanel.value
      }, showPanel.value ? {
        g: common_vendor.o(closePanel)
      } : {}, {
        h: showPanel.value
      }, showPanel.value ? {
        i: common_vendor.t(currentItem.value.id),
        j: common_vendor.t(currentItem.value.reason),
        k: common_vendor.t(currentItem.value.applicant),
        l: common_vendor.t(currentItem.value.role),
        m: verdictForm.value.party === "applicant" ? 1 : "",
        n: common_vendor.o(($event) => verdictForm.value.party = "applicant"),
        o: verdictForm.value.party === "respondent" ? 1 : "",
        p: common_vendor.o(($event) => verdictForm.value.party = "respondent"),
        q: verdictForm.value.party === "both" ? 1 : "",
        r: common_vendor.o(($event) => verdictForm.value.party = "both"),
        s: verdictForm.value.party === "platform" ? 1 : "",
        t: common_vendor.o(($event) => verdictForm.value.party = "platform"),
        v: verdictForm.value.opinion,
        w: common_vendor.o(($event) => verdictForm.value.opinion = $event.detail.value),
        x: common_vendor.o(closePanel),
        y: common_vendor.o(submitVerdict)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-7372aa48"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/arbitration/index.vue"]]);
wx.createPage(MiniProgramPage);
