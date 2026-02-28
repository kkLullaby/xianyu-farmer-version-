"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "create",
  setup(__props) {
    const isSubmitting = common_vendor.ref(false);
    const formData = common_vendor.ref({
      pickup_date: "",
      weight_kg: "",
      citrus_variety: "",
      contact_name: "",
      contact_phone: "",
      location_address: "",
      notes: ""
    });
    const varietyOptions = ["新会柑", "茶枝柑", "其他品种"];
    const bindDateChange = (e) => {
      formData.value.pickup_date = e.detail.value;
    };
    const bindVarietyChange = (e) => {
      formData.value.citrus_variety = varietyOptions[e.detail.value];
    };
    const chooseLocation = () => {
      common_vendor.index.chooseLocation({
        success: (res) => {
          formData.value.location_address = res.address + " " + res.name;
        },
        fail: () => {
          common_vendor.index.showToast({
            title: "获取位置失败",
            icon: "none"
          });
        }
      });
    };
    const submitForm = () => {
      if (!formData.value.pickup_date)
        return showToast("请选择处理日期");
      if (!formData.value.weight_kg)
        return showToast("请输入预估重量");
      if (!formData.value.citrus_variety)
        return showToast("请选择柑橘品种");
      if (!formData.value.contact_name)
        return showToast("请输入联系人");
      if (!formData.value.contact_phone)
        return showToast("请输入联系电话");
      if (!formData.value.location_address)
        return showToast("请输入处理地点");
      isSubmitting.value = true;
      const newReport = {
        id: "RPT-" + Date.now(),
        submitter: formData.value.contact_name,
        submitter_role: "农户",
        goods_type: formData.value.citrus_variety,
        weight: formData.value.weight_kg,
        address: formData.value.location_address,
        status: "pending",
        create_time: (/* @__PURE__ */ new Date()).toLocaleString(),
        pickup_date: formData.value.pickup_date,
        contact_phone: formData.value.contact_phone,
        notes: formData.value.notes
      };
      const globalList = common_vendor.index.getStorageSync("global_report_list") || [];
      globalList.unshift(newReport);
      common_vendor.index.setStorageSync("global_report_list", globalList);
      const auditEntry = {
        id: "AUD-" + newReport.id,
        submitter: newReport.submitter,
        role_label: "农户",
        _role: "farmer",
        type_label: "柑肉处理申报",
        spec: newReport.goods_type,
        quantity: newReport.weight + " 斤",
        unit_price: 0,
        audit_status: "pending",
        commission_type: null,
        commission_value: null,
        created_at: newReport.create_time
      };
      const auditList = common_vendor.index.getStorageSync("global_audit_list") || [];
      auditList.unshift(auditEntry);
      common_vendor.index.setStorageSync("global_audit_list", auditList);
      setTimeout(() => {
        isSubmitting.value = false;
        common_vendor.index.showToast({
          title: "申报提交成功",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      }, 1500);
    };
    const showToast = (title) => {
      common_vendor.index.showToast({
        title,
        icon: "none"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: formData.value.pickup_date
      }, formData.value.pickup_date ? {
        b: common_vendor.t(formData.value.pickup_date)
      } : {}, {
        c: formData.value.pickup_date,
        d: common_vendor.o(bindDateChange),
        e: formData.value.weight_kg,
        f: common_vendor.o(($event) => formData.value.weight_kg = $event.detail.value),
        g: formData.value.citrus_variety
      }, formData.value.citrus_variety ? {
        h: common_vendor.t(formData.value.citrus_variety)
      } : {}, {
        i: varietyOptions,
        j: common_vendor.o(bindVarietyChange),
        k: formData.value.contact_name,
        l: common_vendor.o(($event) => formData.value.contact_name = $event.detail.value),
        m: formData.value.contact_phone,
        n: common_vendor.o(($event) => formData.value.contact_phone = $event.detail.value),
        o: formData.value.location_address,
        p: common_vendor.o(($event) => formData.value.location_address = $event.detail.value),
        q: common_vendor.o(chooseLocation),
        r: formData.value.notes,
        s: common_vendor.o(($event) => formData.value.notes = $event.detail.value),
        t: isSubmitting.value,
        v: common_vendor.o(submitForm)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-72f73f60"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/report/create.vue"]]);
wx.createPage(MiniProgramPage);
