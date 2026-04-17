// Aliyun SMS client wrapper.
// Required env vars for Aliyun provider:
//   ALIYUN_ACCESS_KEY_ID
//   ALIYUN_ACCESS_KEY_SECRET
//   ALIYUN_SMS_SIGN
//   ALIYUN_SMS_TEMPLATE
// Optional env vars:
//   SMS_PROVIDER=auto|aliyun|mock (default: auto)

function normalizeProvider(value) {
    const provider = String(value || 'auto').trim().toLowerCase();
    if (provider === 'aliyun' || provider === 'mock') return provider;
    return 'auto';
}

function maskPhone(phone) {
    const value = String(phone || '').trim();
    if (value.length < 7) return '***';
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function getAliyunConfig() {
    return {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
        signName: process.env.ALIYUN_SMS_SIGN,
        templateCode: process.env.ALIYUN_SMS_TEMPLATE,
    };
}

function hasAliyunConfig(config) {
    return Boolean(
        config
        && config.accessKeyId
        && config.accessKeySecret
        && config.signName
        && config.templateCode
    );
}

function loadAliyunSdk() {
    return {
        Dysmsapi20170525: require('@alicloud/dysmsapi20170525'),
        OpenApi: require('@alicloud/openapi-client'),
        Util: require('@alicloud/tea-util'),
    };
}

function createAliyunClient(config, OpenApi, Dysmsapi20170525) {
    const openApiConfig = new OpenApi.Config({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
    });
    openApiConfig.endpoint = 'dysmsapi.aliyuncs.com';
    return new Dysmsapi20170525.default(openApiConfig);
}

function resolveProvider(config) {
    const provider = normalizeProvider(process.env.SMS_PROVIDER);
    if (provider === 'aliyun' || provider === 'mock') return provider;
    return hasAliyunConfig(config) ? 'aliyun' : 'mock';
}

async function sendOtpSmsByAliyun(phone, otpCode, config) {
    if (!hasAliyunConfig(config)) {
        throw new Error('Aliyun SMS 配置不完整，请检查 AccessKey、签名和模板配置');
    }

    let sdk;
    try {
        sdk = loadAliyunSdk();
    } catch (err) {
        throw new Error(`Aliyun SMS SDK 加载失败: ${err.message}`);
    }

    const client = createAliyunClient(config, sdk.OpenApi, sdk.Dysmsapi20170525);
    const request = new sdk.Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: config.signName,
        templateCode: config.templateCode,
        templateParam: JSON.stringify({ code: otpCode }),
    });

    const runtime = new sdk.Util.RuntimeOptions({});
    const response = await client.sendSmsWithOptions(request, runtime);
    const body = response && response.body ? response.body : {};
    const responseCode = body.code || 'UNKNOWN';

    if (responseCode !== 'OK') {
        const responseMessage = body.message || '短信网关返回异常';
        throw new Error(`Aliyun SMS 发送失败: ${responseCode} ${responseMessage}`.trim());
    }

    console.info(`[SMS][ALIYUN] 已发送验证码到 ${maskPhone(phone)}，RequestId=${body.requestId || '-'}`);
    return {
        provider: 'aliyun',
        requestId: body.requestId || null,
        bizId: body.bizId || null,
    };
}

function sendOtpSmsByMock(phone) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('生产环境禁止使用 Mock 短信通道，请配置 Aliyun SMS');
    }
    console.warn(`[SMS][MOCK] 已模拟发送验证码到 ${maskPhone(phone)}`);
    return Promise.resolve({ provider: 'mock' });
}

async function sendOtpSms(phone, code) {
    const aliyunConfig = getAliyunConfig();
    const provider = resolveProvider(aliyunConfig);

    if (provider === 'mock') {
        return sendOtpSmsByMock(phone);
    }

    try {
        return await sendOtpSmsByAliyun(phone, code, aliyunConfig);
    } catch (err) {
        const configuredProvider = normalizeProvider(process.env.SMS_PROVIDER);
        const canFallbackToMock = process.env.NODE_ENV !== 'production' && configuredProvider === 'auto';
        if (canFallbackToMock) {
            console.warn(`[SMS] Aliyun 发送失败，开发环境自动降级为 Mock: ${err.message}`);
            return sendOtpSmsByMock(phone);
        }
        throw err;
    }
}

module.exports = {
    sendOtpSms
};
