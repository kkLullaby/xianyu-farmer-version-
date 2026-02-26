"use strict";
const common_vendor = require("../common/vendor.js");
const BASE_URL = "http://localhost:4000/api";
const TOKEN_KEY = "agri_auth_token";
const getToken = () => {
  try {
    return common_vendor.index.getStorageSync(TOKEN_KEY);
  } catch (e) {
    return "";
  }
};
const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const header = {
      "Content-Type": "application/json",
      ...options.header
    };
    if (token) {
      header["Authorization"] = `Bearer ${token}`;
    }
    common_vendor.index.request({
      url: options.url.startsWith("http") ? options.url : `${BASE_URL}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header,
      timeout: options.timeout || 1e4,
      success: (res) => {
        const { statusCode, data } = res;
        if (statusCode >= 200 && statusCode < 300) {
          if (data.error) {
            common_vendor.index.showToast({ title: data.error, icon: "none" });
            reject(data);
          } else {
            resolve(data);
          }
        } else if (statusCode === 401) {
          common_vendor.index.removeStorageSync(TOKEN_KEY);
          common_vendor.index.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/login/index" });
          }, 1500);
          reject(new Error("Unauthorized"));
        } else {
          const errorMsg = data.error || data.message || "请求失败，请稍后重试";
          common_vendor.index.showToast({ title: errorMsg, icon: "none" });
          reject(res);
        }
      },
      fail: (err) => {
        common_vendor.index.showToast({ title: "网络请求失败，请检查网络", icon: "none" });
        reject(err);
      }
    });
  });
};
const request$1 = {
  get: (url, data, options = {}) => request({ ...options, url, data, method: "GET" }),
  post: (url, data, options = {}) => request({ ...options, url, data, method: "POST" }),
  put: (url, data, options = {}) => request({ ...options, url, data, method: "PUT" }),
  delete: (url, data, options = {}) => request({ ...options, url, data, method: "DELETE" }),
  patch: (url, data, options = {}) => request({ ...options, url, data, method: "PATCH" })
};
exports.request = request$1;
