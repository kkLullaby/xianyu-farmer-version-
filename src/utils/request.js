/**
 * Universal API Request Wrapper for Uni-app (Web & Mini Program)
 * Handles token injection, base URL configuration, and unified error interception.
 */

// Define Base URL based on environment
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:4000/api' 
  : 'https://api.yourdomain.com/api';

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
        if (statusCode >= 200 && statusCode < 300) {
          // Assuming backend returns { success: true/false, data: ..., error: ... }
          // Adjust this based on your actual backend response structure
          if (data.error) {
             uni.showToast({ title: data.error, icon: 'none' });
             reject(data);
          } else {
             resolve(data);
          }
        } else if (statusCode === 401) {
          // Unauthorized - clear token and redirect to login
          uni.removeStorageSync(TOKEN_KEY);
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          
          // Use setTimeout to allow toast to show before redirect
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/index' });
          }, 1500);
          
          reject(new Error('Unauthorized'));
        } else {
          // Other server errors
          const errorMsg = data.error || data.message || '请求失败，请稍后重试';
          uni.showToast({ title: errorMsg, icon: 'none' });
          reject(res);
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

// Convenience methods
export default {
  get: (url, data, options = {}) => request({ ...options, url, data, method: 'GET' }),
  post: (url, data, options = {}) => request({ ...options, url, data, method: 'POST' }),
  put: (url, data, options = {}) => request({ ...options, url, data, method: 'PUT' }),
  delete: (url, data, options = {}) => request({ ...options, url, data, method: 'DELETE' }),
  patch: (url, data, options = {}) => request({ ...options, url, data, method: 'PATCH' })
};
