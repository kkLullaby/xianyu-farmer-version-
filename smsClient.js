// Aliyun SMS client wrapper (Mock implementation - no external dependencies)
// Uses environment variables:
//   ALIYUN_ACCESS_KEY_ID
//   ALIYUN_ACCESS_KEY_SECRET
//   ALIYUN_SMS_SIGN
//   ALIYUN_SMS_TEMPLATE

// Mock SMS sending - in production, use real Aliyun SDK
async function sendOtpSms(phone, code) {
    const signName = process.env.ALIYUN_SMS_SIGN;
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE;
    
    if (!signName || !templateCode) {
        throw new Error('Aliyun SMS 未配置签名或模板');
    }
    
    // Mock: Log SMS (not including OTP code for security)
    console.log(`[SMS] 向 ${phone} 发送短信 (模板: ${templateCode})`);
    
    // In production environment with real Aliyun credentials:
    // const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
    // const OpenApi = require('@alicloud/openapi-client');
    // ... real SMS sending logic ...
    
    return Promise.resolve();
}

module.exports = {
    sendOtpSms
};
