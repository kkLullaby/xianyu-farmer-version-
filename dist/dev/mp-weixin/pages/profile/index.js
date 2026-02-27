"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const userInfo = common_vendor.ref({
      avatar: "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
      nickname: "张三",
      role: "farmer",
      roleName: "认证农户",
      isRealName: true,
      balance: "8500.00",
      pendingAmount: "1200.00"
    });
    common_vendor.onShow(() => {
      const currentRole = common_vendor.index.getStorageSync("current_role") || "farmer";
      switch (currentRole) {
        case "merchant":
          userInfo.value = {
            avatar: "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
            nickname: "李老板",
            role: "merchant",
            roleName: "优选回收商",
            isRealName: true,
            balance: "24000.00",
            pendingAmount: "3500.00"
          };
          break;
        case "processor":
          userInfo.value = {
            avatar: "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
            nickname: "新会处理厂",
            role: "processor",
            roleName: "官方处理商",
            isRealName: true,
            balance: "50000.00",
            pendingAmount: "12000.00"
          };
          break;
        case "admin":
          userInfo.value = {
            avatar: "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
            nickname: "管理员",
            role: "admin",
            roleName: "系统管理员",
            isRealName: true,
            balance: "0.00",
            pendingAmount: "0.00"
          };
          break;
        case "farmer":
        default:
          userInfo.value = {
            avatar: "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
            nickname: "张三",
            role: "farmer",
            roleName: "认证农户",
            isRealName: true,
            balance: "8500.00",
            pendingAmount: "1200.00"
          };
          break;
      }
    });
    const goToAddress = () => {
      common_vendor.index.navigateTo({ url: "/pages/profile/address/list" });
    };
    const handleComingSoon = () => {
      common_vendor.index.showToast({ title: "功能开发中", icon: "none" });
    };
    const callAdmin = () => {
      common_vendor.index.makePhoneCall({
        phoneNumber: "400-888-6688",
        fail: () => {
          common_vendor.index.showToast({
            title: "拨打失败，请重试",
            icon: "none"
          });
        }
      });
    };
    const handleLogout = () => {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.clearStorageSync();
            common_vendor.index.reLaunch({
              url: "/pages/login/index"
            });
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: userInfo.value.avatar,
        b: common_vendor.t(userInfo.value.nickname),
        c: common_vendor.t(userInfo.value.role === "farmer" ? "🟢" : userInfo.value.role === "merchant" ? "🟠" : "🔵"),
        d: common_vendor.t(userInfo.value.roleName),
        e: common_vendor.n("role-" + userInfo.value.role),
        f: userInfo.value.isRealName
      }, userInfo.value.isRealName ? {} : {}, {
        g: common_vendor.o(handleComingSoon),
        h: common_vendor.t(userInfo.value.balance),
        i: common_vendor.t(userInfo.value.pendingAmount),
        j: common_vendor.o(goToAddress),
        k: common_vendor.o(handleComingSoon),
        l: common_vendor.o(handleComingSoon),
        m: common_vendor.o(callAdmin),
        n: common_vendor.o(handleComingSoon),
        o: common_vendor.o(handleLogout)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-f97f9319"], ["__file", "C:/Users/lkf12/WeChatProjects/project-recycle/xianyu-farmer-version-/src/pages/profile/index.vue"]]);
wx.createPage(MiniProgramPage);
