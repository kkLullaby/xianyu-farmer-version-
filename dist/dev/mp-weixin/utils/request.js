"use strict";
const common_vendor = require("../common/vendor.js");
const BASE_URL = "http://localhost:4000";
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
        if (statusCode === 401) {
          common_vendor.index.removeStorageSync(TOKEN_KEY);
          common_vendor.index.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/login/index" });
          }, 1500);
          reject(new Error("Unauthorized"));
          return;
        }
        if (statusCode >= 500) {
          common_vendor.index.showToast({ title: "服务器内部错误", icon: "none" });
          reject(new Error("Server Error"));
          return;
        }
        if (data && data.code === 200) {
          resolve(data.data);
        } else {
          const errorMsg = data && data.msg || "请求失败";
          common_vendor.index.showToast({ title: errorMsg, icon: "none" });
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        common_vendor.index.showToast({ title: "网络请求失败，请检查网络", icon: "none" });
        reject(err);
      }
    });
  });
};
Object.assign(request, {
  get: (url, data, options = {}) => request({ ...options, url, data, method: "GET" }),
  post: (url, data, options = {}) => request({ ...options, url, data, method: "POST" }),
  put: (url, data, options = {}) => request({ ...options, url, data, method: "PUT" }),
  delete: (url, data, options = {}) => request({ ...options, url, data, method: "DELETE" }),
  patch: (url, data, options = {}) => request({ ...options, url, data, method: "PATCH" }),
  // File upload wrapper
  upload: (url, filePath, name = "file", formData = {}) => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const header = {};
      if (token) {
        header["Authorization"] = `Bearer ${token}`;
      }
      common_vendor.index.uploadFile({
        url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
        filePath,
        name,
        formData,
        header,
        success: (res) => {
          if (res.statusCode === 401) {
            common_vendor.index.removeStorageSync(TOKEN_KEY);
            common_vendor.index.showToast({ title: "登录已过期，请重新登录", icon: "none" });
            setTimeout(() => {
              common_vendor.index.reLaunch({ url: "/pages/login/index" });
            }, 1500);
            reject(new Error("Unauthorized"));
            return;
          }
          try {
            const data = JSON.parse(res.data);
            if (data.code === 200) {
              resolve(data.data);
            } else {
              common_vendor.index.showToast({ title: data.msg || "上传失败", icon: "none" });
              reject(new Error(data.msg));
            }
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => {
          common_vendor.index.showToast({ title: "上传失败", icon: "none" });
          reject(err);
        }
      });
    });
  }
});
exports.request = request;
