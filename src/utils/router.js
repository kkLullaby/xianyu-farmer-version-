/**
 * Universal Router Wrapper for Uni-app
 * Provides a unified API for navigation and handles platform-specific quirks if needed.
 */

/**
 * Navigate to a new page (keeps current page in history)
 * @param {String} url - The page path (e.g., '/pages/index/index')
 * @param {Object} params - Query parameters
 */
export const navigateTo = (url, params = {}) => {
  const queryString = buildQueryString(params);
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  uni.navigateTo({
    url: fullUrl,
    fail: (err) => {
      console.error('navigateTo failed:', err);
      // Fallback to switchTab if it's a tabbar page
      uni.switchTab({ url });
    }
  });
};

/**
 * Redirect to a new page (replaces current page in history)
 * @param {String} url 
 * @param {Object} params 
 */
export const redirectTo = (url, params = {}) => {
  const queryString = buildQueryString(params);
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  uni.redirectTo({
    url: fullUrl,
    fail: (err) => console.error('redirectTo failed:', err)
  });
};

/**
 * Switch to a tab bar page (closes all non-tab pages)
 * @param {String} url 
 */
export const switchTab = (url) => {
  uni.switchTab({
    url,
    fail: (err) => console.error('switchTab failed:', err)
  });
};

/**
 * Relaunch the app to a specific page (closes all pages)
 * @param {String} url 
 * @param {Object} params 
 */
export const reLaunch = (url, params = {}) => {
  const queryString = buildQueryString(params);
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  uni.reLaunch({
    url: fullUrl,
    fail: (err) => console.error('reLaunch failed:', err)
  });
};

/**
 * Navigate back
 * @param {Number} delta - Number of pages to go back
 */
export const navigateBack = (delta = 1) => {
  uni.navigateBack({
    delta,
    fail: (err) => {
      console.error('navigateBack failed:', err);
      // Fallback to home if can't go back
      uni.reLaunch({ url: '/pages/index/index' });
    }
  });
};

/**
 * Helper to build query string from object
 */
function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) return '';
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

export default {
  navigateTo,
  redirectTo,
  switchTab,
  reLaunch,
  navigateBack
};
