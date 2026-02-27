"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const contactBuyer = (phone) => {
      common_vendor.index.makePhoneCall({
        phoneNumber: phone,
        fail: () => {
          common_vendor.index.showToast({ title: "拨打电话失败", icon: "none" });
        }
      });
    };
    const gradeLabels = {
      "grade1": "一级品",
      "grade2": "二级品",
      "grade3": "三级品",
      "offgrade": "等外级",
      "any": "不限品级"
    };
    const citrusLabels = {
      "mandarin": "柑橘",
      "orange": "橙子",
      "pomelo": "柚子",
      "tangerine": "橘子",
      "any": "不限种类"
    };
    const merchantList = common_vendor.ref([
      {
        id: 2,
        source_type: "recycler",
        request_no: "REQ20260227002",
        grade: "grade2",
        citrus_type: "orange",
        weight_kg: 2e3,
        price: "0.5",
        location_address: "四川省眉山市丹棱县",
        contact_name: "李老板",
        contact_phone: "13900139000",
        buyer_name: "李记农产品回收",
        valid_until: null,
        notes: "量大从优，上门收货。"
      },
      {
        id: 3,
        source_type: "recycler",
        request_no: "REQ20260227003",
        grade: "any",
        citrus_type: "pomelo",
        weight_kg: 1e4,
        price: "0.3",
        location_address: "重庆市奉节县",
        contact_name: "王师傅",
        contact_phone: "13700137000",
        buyer_name: "奉节果皮回收站",
        valid_until: "2026-03-01",
        notes: "只要柚子皮，果肉不要。"
      }
    ]);
    const processorList = common_vendor.ref([
      {
        id: 1,
        source_type: "processor",
        request_no: "REQ20260227001",
        grade: "grade1",
        citrus_type: "mandarin",
        weight_kg: 5e3,
        price: "0.8",
        location_address: "四川省成都市蒲江县柑橘处理中心",
        contact_name: "张经理",
        contact_phone: "13800138000",
        buyer_name: "绿源果业处理厂",
        valid_until: "2026-03-15",
        notes: "需要新鲜采摘，无腐烂，可上门收货。"
      }
    ]);
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
        g: currentTab.value === 0
      }, currentTab.value === 0 ? {
        h: common_vendor.f(merchantList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(gradeLabels[item.grade]),
            b: common_vendor.t(item.request_no),
            c: common_vendor.t(item.valid_until ? `有效期至 ${item.valid_until}` : "长期有效"),
            d: !item.valid_until ? 1 : "",
            e: common_vendor.t(item.contact_name),
            f: common_vendor.t(item.contact_phone),
            g: common_vendor.t(item.buyer_name),
            h: common_vendor.t(item.weight_kg),
            i: common_vendor.t(item.price),
            j: item.notes
          }, item.notes ? {
            k: common_vendor.t(item.notes)
          } : {}, {
            l: common_vendor.o(($event) => contactBuyer(item.contact_phone), item.id),
            m: item.id
          });
        })
      } : {}, {
        i: currentTab.value === 1
      }, currentTab.value === 1 ? {
        j: common_vendor.f(processorList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(gradeLabels[item.grade]),
            b: common_vendor.t(citrusLabels[item.citrus_type]),
            c: common_vendor.t(item.request_no),
            d: common_vendor.t(item.valid_until ? `有效期至 ${item.valid_until}` : "长期有效"),
            e: !item.valid_until ? 1 : "",
            f: common_vendor.t(item.weight_kg),
            g: common_vendor.t(item.price),
            h: common_vendor.t(item.location_address),
            i: common_vendor.t(item.contact_name),
            j: common_vendor.t(item.contact_phone),
            k: common_vendor.t(item.buyer_name),
            l: item.notes
          }, item.notes ? {
            m: common_vendor.t(item.notes)
          } : {}, {
            n: common_vendor.o(($event) => contactBuyer(item.contact_phone), item.id),
            o: item.id
          });
        })
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a2d3f174"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/demand-hall/index.vue"]]);
wx.createPage(MiniProgramPage);
