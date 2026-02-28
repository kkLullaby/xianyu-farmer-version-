"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const calcFarmerPrice = (item) => {
      const price = Number(item.price);
      if (item.commissionRate) {
        return (price * (1 - item.commissionRate / 100)).toFixed(2);
      }
      if (item.commissionFee) {
        return (price - item.commissionFee).toFixed(2);
      }
      return price.toFixed(2);
    };
    const fuzzPhone = (phone) => String(phone || "").replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    const fuzzAddress = (addr) => {
      if (!addr)
        return "（地址保护中）";
      const parts = addr.split(/[市县区]/u);
      return parts.length > 1 ? addr.substring(0, addr.search(/[县区市]/u) + 2) + "（详细地址经平台保护）" : addr.substring(0, 6) + "…（保护）";
    };
    const showPopup = common_vendor.ref(false);
    const currentTarget = common_vendor.ref({});
    const intentionForm = common_vendor.ref({ price: "", weight: "", date: "" });
    const openIntentionPopup = (item) => {
      currentTarget.value = { ...item, name: item.contact_name || item.id };
      intentionForm.value = { price: "", weight: "", date: "" };
      showPopup.value = true;
    };
    const closePopup = () => {
      showPopup.value = false;
    };
    const onDateChange = (e) => {
      intentionForm.value.date = e.detail.value;
    };
    const submitIntention = () => {
      if (!intentionForm.value.price || !intentionForm.value.weight) {
        return common_vendor.index.showToast({ title: "请填写单价和重量", icon: "none" });
      }
      const entry = {
        id: "INT-" + Date.now(),
        target_merchant_id: currentTarget.value.id,
        target_name: currentTarget.value.name,
        price: Number(intentionForm.value.price),
        weight: Number(intentionForm.value.weight),
        date: intentionForm.value.date || "待协商",
        status: "pending",
        create_time: (/* @__PURE__ */ new Date()).toLocaleString()
      };
      const list = common_vendor.index.getStorageSync("global_intentions") || [];
      list.unshift(entry);
      common_vendor.index.setStorageSync("global_intentions", list);
      closePopup();
      common_vendor.index.showToast({ title: "意向已发送，等待商家确认", icon: "success" });
    };
    const merchantList = common_vendor.ref([
      {
        id: "DEM20260227002",
        source: "merchant",
        goods_type: "茶枝柑",
        weight: 2e3,
        unit: "斤",
        price: 0.5,
        deadline: "2026-03-01",
        contact_name: "李老板",
        contact_phone: "13900139000",
        address: "四川省眉山市丹棱县",
        commissionRate: 10,
        notes: "量大从优，上门收货。"
      },
      {
        id: "DEM20260227003",
        source: "merchant",
        goods_type: "柚子皮",
        weight: 1e4,
        unit: "斤",
        price: 0.3,
        deadline: "长期有效",
        contact_name: "王师傅",
        contact_phone: "13700137000",
        address: "重庆市奉节县",
        commissionRate: 10,
        notes: "只要柚子皮，果肉不要。"
      }
    ]);
    const processorList = common_vendor.ref([
      {
        id: "DEM20260227001",
        source: "processor",
        goods_type: "柑肉原料",
        weight: 8,
        unit: "吨",
        price: 800,
        deadline: "2026-03-15",
        contact_name: "张经理",
        contact_phone: "13800138000",
        address: "四川省成都市蒲江县柑橘处理中心",
        commissionRate: 8,
        notes: "需要新鲜采摘，无腐烂，可上门收货。"
      }
    ]);
    const loadGlobalDemandList = () => {
      const globalList = common_vendor.index.getStorageSync("global_demand_list") || [];
      if (!Array.isArray(globalList) || globalList.length === 0)
        return;
      merchantList.value = globalList.filter((item) => item.source === "merchant").map((item) => ({
        ...item,
        commissionRate: item.commissionRate || 10
      }));
      processorList.value = globalList.filter((item) => item.source === "processor").map((item) => ({
        ...item,
        commissionRate: item.commissionRate || 8
      }));
    };
    common_vendor.onShow(() => {
      loadGlobalDemandList();
    });
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
            a: common_vendor.t(item.goods_type),
            b: common_vendor.t(item.id),
            c: common_vendor.t(item.deadline ? `有效期至 ${item.deadline}` : "长期有效"),
            d: item.deadline === "长期有效" ? 1 : "",
            e: common_vendor.t(item.contact_name),
            f: common_vendor.t(fuzzPhone(item.contact_phone)),
            g: common_vendor.t(fuzzAddress(item.address)),
            h: common_vendor.t(item.weight),
            i: common_vendor.t(item.unit),
            j: common_vendor.t(item.price),
            k: common_vendor.t(item.unit),
            l: common_vendor.t(item.price),
            m: common_vendor.t(item.unit),
            n: common_vendor.t(item.commissionRate ? item.commissionRate + "%" : "¥0/" + item.unit),
            o: common_vendor.t(calcFarmerPrice(item)),
            p: common_vendor.t(item.unit),
            q: item.notes
          }, item.notes ? {
            r: common_vendor.t(item.notes)
          } : {}, {
            s: common_vendor.o(($event) => openIntentionPopup(item), item.id),
            t: item.id
          });
        })
      } : {}, {
        i: currentTab.value === 1
      }, currentTab.value === 1 ? {
        j: common_vendor.f(processorList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.goods_type),
            b: common_vendor.t(item.id),
            c: common_vendor.t(item.deadline ? `有效期至 ${item.deadline}` : "长期有效"),
            d: item.deadline === "长期有效" ? 1 : "",
            e: common_vendor.t(item.weight),
            f: common_vendor.t(item.unit),
            g: common_vendor.t(item.price),
            h: common_vendor.t(item.unit),
            i: common_vendor.t(fuzzAddress(item.address)),
            j: common_vendor.t(item.price),
            k: common_vendor.t(item.unit),
            l: common_vendor.t(item.commissionRate ? item.commissionRate + "%" : "¥0/" + item.unit),
            m: common_vendor.t(calcFarmerPrice(item)),
            n: common_vendor.t(item.unit),
            o: common_vendor.t(item.contact_name),
            p: common_vendor.t(fuzzPhone(item.contact_phone)),
            q: common_vendor.t(fuzzAddress(item.address)),
            r: item.notes
          }, item.notes ? {
            s: common_vendor.t(item.notes)
          } : {}, {
            t: common_vendor.o(($event) => openIntentionPopup(item), item.id),
            v: item.id
          });
        })
      } : {}, {
        k: showPopup.value
      }, showPopup.value ? {
        l: common_vendor.o(closePopup)
      } : {}, {
        m: showPopup.value
      }, showPopup.value ? common_vendor.e({
        n: common_vendor.t(currentTarget.value.name),
        o: common_vendor.t(currentTarget.value.unit || "斤"),
        p: intentionForm.value.price,
        q: common_vendor.o(($event) => intentionForm.value.price = $event.detail.value),
        r: common_vendor.t(currentTarget.value.unit || "斤"),
        s: intentionForm.value.weight,
        t: common_vendor.o(($event) => intentionForm.value.weight = $event.detail.value),
        v: intentionForm.value.date
      }, intentionForm.value.date ? {
        w: common_vendor.t(intentionForm.value.date)
      } : {}, {
        x: intentionForm.value.date,
        y: common_vendor.o(onDateChange),
        z: common_vendor.o(closePopup),
        A: common_vendor.o(submitIntention)
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-a2d3f174"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/demand-hall/index.vue"]]);
wx.createPage(MiniProgramPage);
