"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
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
    const demandList = common_vendor.ref([
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
      },
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
    const contactBuyer = (phone) => {
      common_vendor.index.makePhoneCall({
        phoneNumber: phone,
        fail: () => {
          common_vendor.index.showToast({
            title: "拨打电话失败",
            icon: "none"
          });
        }
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.f(demandList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.source_type === "processor" ? "🏭 处理商" : "🚛 回收商"),
            b: common_vendor.n(item.source_type === "processor" ? "bg-processor" : "bg-recycler"),
            c: common_vendor.t(gradeLabels[item.grade]),
            d: common_vendor.t(item.source_type === "processor" ? " " + citrusLabels[item.citrus_type] : "柑"),
            e: common_vendor.n(item.source_type === "processor" ? "tag-processor" : "tag-recycler"),
            f: common_vendor.t(item.request_no),
            g: common_vendor.t(item.valid_until ? `有效期至 ${item.valid_until}` : "长期有效"),
            h: !item.valid_until ? 1 : "",
            i: item.source_type === "processor"
          }, item.source_type === "processor" ? {
            j: common_vendor.t(item.weight_kg),
            k: common_vendor.t(item.price),
            l: common_vendor.t(item.location_address)
          } : {}, {
            m: common_vendor.t(item.contact_name),
            n: common_vendor.t(item.contact_phone),
            o: common_vendor.t(item.source_type === "processor" ? "处理商：" : "回收商："),
            p: common_vendor.t(item.buyer_name),
            q: item.source_type !== "processor"
          }, item.source_type !== "processor" ? {
            r: common_vendor.t(item.weight_kg)
          } : {}, {
            s: item.source_type !== "processor"
          }, item.source_type !== "processor" ? {
            t: common_vendor.t(item.price)
          } : {}, {
            v: item.notes
          }, item.notes ? {
            w: common_vendor.t(item.notes)
          } : {}, {
            x: common_vendor.n(item.source_type === "processor" ? "btn-processor" : "btn-recycler"),
            y: common_vendor.o(($event) => contactBuyer(item.contact_phone), item.id),
            z: item.id,
            A: common_vendor.n(item.source_type === "processor" ? "border-processor" : "border-recycler")
          });
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-b544bc31"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/merchant-demand/index.vue"]]);
wx.createPage(MiniProgramPage);
