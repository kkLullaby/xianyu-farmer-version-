"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const currentTab = common_vendor.ref(0);
    const demandList = common_vendor.ref([
      {
        id: 1,
        buyer_name: "新会生物科技处理厂",
        variety: "柑肉原料",
        weight: 50,
        price: 300,
        has_transport: true,
        phone: "0750-6688999",
        deadline: "2024-04-01",
        description: "急需大量新鲜柑肉原料，要求无霉变，提供专业运输车辆上门拉货。"
      },
      {
        id: 2,
        buyer_name: "绿源有机肥加工中心",
        variety: "果渣/废果",
        weight: 20,
        price: 150,
        has_transport: false,
        phone: "13800138000",
        deadline: "2024-03-30",
        description: "长期收购加工后的果渣，需农户自行送货至双水镇加工点。"
      },
      {
        id: 3,
        buyer_name: "陈皮村深加工基地",
        variety: "陈皮原料",
        weight: 10,
        price: 800,
        has_transport: true,
        phone: "13900139000",
        deadline: "2024-04-15",
        description: "高价收购优质二红皮原料，品质要求高，现场结款。"
      }
    ]);
    const filteredList = common_vendor.computed(() => {
      let list = [...demandList.value];
      if (currentTab.value === 1) {
        list = list.filter((item) => item.has_transport);
      } else if (currentTab.value === 2) {
        list.sort((a, b) => b.price - a.price);
      }
      return list;
    });
    const makeCall = (phone) => {
      common_vendor.index.makePhoneCall({
        phoneNumber: phone
      });
    };
    const handleAccept = (item) => {
      common_vendor.index.showModal({
        title: "确认接单",
        content: `确定要接下 ${item.buyer_name} 的采购订单吗？接单后请尽快联系买家确认交货细节。`,
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({
              title: "接单成功",
              icon: "success"
            });
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: currentTab.value === 0 ? 1 : "",
        b: common_vendor.o(($event) => currentTab.value = 0),
        c: currentTab.value === 1 ? 1 : "",
        d: common_vendor.o(($event) => currentTab.value = 1),
        e: currentTab.value === 2 ? 1 : "",
        f: common_vendor.o(($event) => currentTab.value = 2),
        g: common_vendor.f(common_vendor.unref(filteredList), (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.buyer_name),
            b: common_vendor.t(item.deadline),
            c: common_vendor.t(item.variety),
            d: common_vendor.t(item.weight),
            e: common_vendor.t(item.price),
            f: item.has_transport
          }, item.has_transport ? {} : {}, {
            g: common_vendor.t(item.description),
            h: common_vendor.o(($event) => makeCall(item.phone), item.id),
            i: common_vendor.o(($event) => handleAccept(item), item.id),
            j: item.id
          });
        }),
        h: common_vendor.unref(filteredList).length === 0
      }, common_vendor.unref(filteredList).length === 0 ? {} : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-dd3a9fa7"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/farmer/supply/index.vue"]]);
wx.createPage(MiniProgramPage);
