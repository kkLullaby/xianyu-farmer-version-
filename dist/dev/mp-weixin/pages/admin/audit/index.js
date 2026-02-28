"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const showPopup = common_vendor.ref(false);
    const popupItem = common_vendor.ref({});
    const commissionForm = common_vendor.ref({
      type: "rate",
      value: ""
    });
    const auditStatusLabel = {
      pending: "待审核",
      approved: "已通过",
      rejected: "已驳回"
    };
    const originalFarmerMockList = [
      {
        id: "AUD20260226001",
        submitter: "张三",
        role_label: "农户",
        type_label: "柑肉处理申报",
        spec: "一级品 · 柑橘",
        quantity: "5000 斤",
        unit_price: 0.8,
        audit_status: "pending",
        commission_type: null,
        commission_value: null,
        created_at: "2026-02-26 09:00"
      },
      {
        id: "AUD20260225002",
        submitter: "王大姐",
        role_label: "农户",
        type_label: "果皮供应申报",
        spec: "三级品 · 橙子",
        quantity: "3000 斤",
        unit_price: 0.3,
        audit_status: "pending",
        commission_type: null,
        commission_value: null,
        created_at: "2026-02-25 14:30"
      },
      {
        id: "AUD20260220003",
        submitter: "老刘",
        role_label: "农户",
        type_label: "柑肉处理申报",
        spec: "二级品 · 柑橘",
        quantity: "8000 斤",
        unit_price: 0.5,
        audit_status: "approved",
        commission_type: "rate",
        commission_value: 10,
        created_at: "2026-02-20 10:00"
      }
    ];
    const farmerList = common_vendor.ref([]);
    common_vendor.onShow(() => {
      const globalList = common_vendor.index.getStorageSync("global_report_list") || [];
      const mappedGlobalList = globalList.map((item) => ({
        id: item.id,
        submitter: item.submitter,
        role_label: item.submitter_role,
        type_label: "柑肉处理申报",
        spec: item.goods_type,
        quantity: item.weight + " 斤",
        unit_price: 0,
        // 申报无单价
        audit_status: item.status,
        commission_type: null,
        commission_value: null,
        created_at: item.create_time,
        _isGlobal: true
      }));
      farmerList.value = [...mappedGlobalList, ...originalFarmerMockList];
      const auditList = common_vendor.index.getStorageSync("global_audit_list") || [];
      const merchantFromStorage = auditList.filter((i) => i._role === "merchant").map((item) => ({ ...item }));
      const processorFromStorage = auditList.filter((i) => i._role === "processor").map((item) => ({ ...item }));
      merchantPublishList.value = [...merchantFromStorage, ...originalMerchantMockList];
      processorPublishList.value = [...processorFromStorage, ...originalProcessorMockList];
    });
    const merchantPublishList = common_vendor.ref([]);
    const originalMerchantMockList = [
      {
        id: "AUD20260226004",
        submitter: "李记回收",
        role_label: "回收商",
        type_label: "回收求购发布",
        spec: "不限品级 · 柚子皮",
        quantity: "10000 斤",
        unit_price: 0.3,
        audit_status: "pending",
        commission_type: null,
        commission_value: null,
        created_at: "2026-02-26 11:00"
      },
      {
        id: "AUD20260224005",
        submitter: "奉节果皮站",
        role_label: "回收商",
        type_label: "回收求购发布",
        spec: "二级品 · 橙子",
        quantity: "2000 斤",
        unit_price: 0.5,
        audit_status: "approved",
        commission_type: "fixed",
        commission_value: 0.03,
        created_at: "2026-02-24 08:45"
      }
    ];
    const processorPublishList = common_vendor.ref([]);
    const originalProcessorMockList = [
      {
        id: "AUD20260227006",
        submitter: "绿源果业",
        role_label: "处理商",
        type_label: "加工求购发布",
        spec: "一级品 · 柑橘",
        quantity: "5000 斤",
        unit_price: 0.8,
        audit_status: "pending",
        commission_type: null,
        commission_value: null,
        created_at: "2026-02-27 07:30"
      },
      {
        id: "AUD20260222007",
        submitter: "柑之源加工",
        role_label: "处理商",
        type_label: "加工求购发布",
        spec: "不限品级 · 柑橘",
        quantity: "20000 斤",
        unit_price: 0.6,
        audit_status: "approved",
        commission_type: "rate",
        commission_value: 8,
        created_at: "2026-02-22 16:00"
      }
    ];
    const currentList = common_vendor.computed(() => {
      if (currentTab.value === 0)
        return farmerList.value;
      if (currentTab.value === 1)
        return merchantPublishList.value;
      return processorPublishList.value;
    });
    const calcFinalPrice = (item) => {
      if (item.commission_type === "rate") {
        return (item.unit_price * (1 - item.commission_value / 100)).toFixed(2);
      }
      return (item.unit_price - item.commission_value).toFixed(2);
    };
    const openCommissionPopup = (item) => {
      popupItem.value = item;
      commissionForm.value = { type: "rate", value: "" };
      showPopup.value = true;
    };
    const closePopup = () => {
      showPopup.value = false;
    };
    const updateGlobalReportStatus = (id, status) => {
      let reports = common_vendor.index.getStorageSync("global_report_list") || [];
      const index = reports.findIndex((r) => r.id === id);
      if (index > -1) {
        reports[index].status = status;
        common_vendor.index.setStorageSync("global_report_list", reports);
      }
    };
    const confirmAudit = () => {
      const val = Number(commissionForm.value.value);
      if (!val || val <= 0) {
        common_vendor.index.showToast({ title: "请输入有效的抽成数值", icon: "none" });
        return;
      }
      if (commissionForm.value.type === "rate" && val >= 100) {
        common_vendor.index.showToast({ title: "比例不能超过100%", icon: "none" });
        return;
      }
      const lists = [farmerList, merchantPublishList, processorPublishList];
      for (const list of lists) {
        const target = list.value.find((i) => i.id === popupItem.value.id);
        if (target) {
          target.audit_status = "approved";
          target.commission_type = commissionForm.value.type;
          target.commission_value = val;
          if (target._isGlobal) {
            updateGlobalReportStatus(target.id, "approved");
          }
          break;
        }
      }
      showPopup.value = false;
      common_vendor.index.showToast({ title: "审核通过，抽成已设定", icon: "success" });
    };
    const rejectItem = (item) => {
      common_vendor.index.showModal({
        title: "确认驳回",
        content: `确定要驳回 ${item.submitter} 的申报吗？`,
        success: (res) => {
          if (res.confirm) {
            item.audit_status = "rejected";
            if (item._isGlobal) {
              updateGlobalReportStatus(item.id, "rejected");
            }
            common_vendor.index.showToast({ title: "已驳回", icon: "none" });
          }
        }
      });
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
        j: common_vendor.t(common_vendor.unref(currentList).filter((i) => i.audit_status === "pending").length),
        k: common_vendor.f(common_vendor.unref(currentList), (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.id),
            b: common_vendor.t(auditStatusLabel[item.audit_status]),
            c: common_vendor.n("audit-" + item.audit_status),
            d: common_vendor.t(item.submitter),
            e: common_vendor.t(item.role_label),
            f: common_vendor.t(item.type_label),
            g: common_vendor.t(item.spec),
            h: common_vendor.t(item.quantity),
            i: common_vendor.t(item.unit_price),
            j: item.audit_status === "approved"
          }, item.audit_status === "approved" ? {
            k: common_vendor.t(item.commission_type === "rate" ? item.commission_value + "%" : "¥" + item.commission_value + "/笔")
          } : {}, {
            l: item.audit_status === "approved"
          }, item.audit_status === "approved" ? {
            m: common_vendor.t(calcFinalPrice(item))
          } : {}, {
            n: common_vendor.t(item.created_at),
            o: item.audit_status === "pending"
          }, item.audit_status === "pending" ? {
            p: common_vendor.o(($event) => openCommissionPopup(item), item.id)
          } : {}, {
            q: item.audit_status === "pending"
          }, item.audit_status === "pending" ? {
            r: common_vendor.o(($event) => rejectItem(item), item.id)
          } : {}, {
            s: item.audit_status === "approved"
          }, item.audit_status === "approved" ? {} : {}, {
            t: item.audit_status === "rejected"
          }, item.audit_status === "rejected" ? {} : {}, {
            v: item.audit_status === "approved" ? 1 : "",
            w: item.id
          });
        }),
        l: common_vendor.unref(currentList).length === 0
      }, common_vendor.unref(currentList).length === 0 ? {} : {}, {
        m: showPopup.value
      }, showPopup.value ? {
        n: common_vendor.o(closePopup)
      } : {}, {
        o: showPopup.value
      }, showPopup.value ? common_vendor.e({
        p: common_vendor.t(popupItem.value.id),
        q: common_vendor.t(popupItem.value.submitter),
        r: common_vendor.t(popupItem.value.unit_price),
        s: common_vendor.t(popupItem.value.quantity),
        t: commissionForm.value.type === "rate" ? 1 : "",
        v: common_vendor.o(($event) => commissionForm.value.type = "rate"),
        w: commissionForm.value.type === "fixed" ? 1 : "",
        x: common_vendor.o(($event) => commissionForm.value.type = "fixed"),
        y: common_vendor.t(commissionForm.value.type === "rate" ? "抽成比例 (%)" : "固定金额 (元)"),
        z: commissionForm.value.type === "rate" ? "例：10 表示10%" : "例：0.05 表示每斤扣0.05元",
        A: commissionForm.value.value,
        B: common_vendor.o(($event) => commissionForm.value.value = $event.detail.value),
        C: commissionForm.value.value
      }, commissionForm.value.value ? common_vendor.e({
        D: commissionForm.value.type === "rate"
      }, commissionForm.value.type === "rate" ? {
        E: common_vendor.t(popupItem.value.unit_price),
        F: common_vendor.t(commissionForm.value.value),
        G: common_vendor.t((popupItem.value.unit_price * (1 - commissionForm.value.value / 100)).toFixed(2))
      } : {
        H: common_vendor.t(popupItem.value.unit_price),
        I: common_vendor.t(commissionForm.value.value),
        J: common_vendor.t((popupItem.value.unit_price - Number(commissionForm.value.value)).toFixed(2))
      }) : {}, {
        K: common_vendor.o(closePopup),
        L: common_vendor.o(confirmAudit)
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-ea810333"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/admin/audit/index.vue"]]);
wx.createPage(MiniProgramPage);
