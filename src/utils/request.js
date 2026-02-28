/**
 * Universal API Request Wrapper for Uni-app (Web & Mini Program)
 * Handles token injection, base URL configuration, and unified error interception.
 */

// Define Base URL based on environment
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:4000' 
  : 'https://api.yourdomain.com';

// Token key in storage
const TOKEN_KEY = 'agri_auth_token';

/**
 * Get token from storage (platform agnostic)
 */
const getToken = () => {
  try {
    return uni.getStorageSync(TOKEN_KEY);
  } catch (e) {
    return '';
  }
};

/**
 * Core request function
 * @param {Object} options - Request options (url, method, data, header, etc.)
 * @returns {Promise} - Resolves with response data, rejects with error
 */
const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const token = getToken();
    
    // Default headers
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    // Inject token if available
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    uni.request({
      url: options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      timeout: options.timeout || 10000,
      success: (res) => {
        const { statusCode, data } = res;
        
        // Handle HTTP status codes
        if (statusCode === 401) {
          // Unauthorized - clear token and redirect to login
          uni.removeStorageSync(TOKEN_KEY);
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/index' });
          }, 1500);
          
          reject(new Error('Unauthorized'));
          return;
        }
        
        if (statusCode >= 500) {
          uni.showToast({ title: '服务器内部错误', icon: 'none' });
          reject(new Error('Server Error'));
          return;
        }

        // Handle Business status codes (Standard JSON: { code, msg, data })
        if (data && data.code === 200) {
          resolve(data.data);
        } else {
          const errorMsg = (data && data.msg) || '请求失败';
          uni.showToast({ title: errorMsg, icon: 'none' });
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        // Network errors, timeout, etc.
        uni.showToast({ title: '网络请求失败，请检查网络', icon: 'none' });
        reject(err);
      }
    });
  });
};

// Convenience methods — merged onto request function so it is both callable and has .get/.post helpers
Object.assign(request, {
  get: (url, data, options = {}) => request({ ...options, url, data, method: 'GET' }),
  post: (url, data, options = {}) => request({ ...options, url, data, method: 'POST' }),
  put: (url, data, options = {}) => request({ ...options, url, data, method: 'PUT' }),
  delete: (url, data, options = {}) => request({ ...options, url, data, method: 'DELETE' }),
  patch: (url, data, options = {}) => request({ ...options, url, data, method: 'PATCH' }),
  
  // File upload wrapper
  upload: (url, filePath, name = 'file', formData = {}) => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const header = {};
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      uni.uploadFile({
        url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
        filePath: filePath,
        name: name,
        formData: formData,
        header: header,
        success: (res) => {
          if (res.statusCode === 401) {
            uni.removeStorageSync(TOKEN_KEY);
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/index' });
            }, 1500);
            reject(new Error('Unauthorized'));
            return;
          }
          
          try {
            const data = JSON.parse(res.data);
            if (data.code === 200) {
              resolve(data.data);
            } else {
              uni.showToast({ title: data.msg || '上传失败', icon: 'none' });
              reject(new Error(data.msg));
            }
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => {
          uni.showToast({ title: '上传失败', icon: 'none' });
          reject(err);
        }
      });
    });
  }
});

export default request;
