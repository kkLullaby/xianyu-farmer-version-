#!/usr/bin/env node
'use strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function hasDataEnvelope(payload) {
    return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data');
}

function unwrapData(payload) {
    return hasDataEnvelope(payload) ? payload.data : payload;
}

function unwrapMsg(payload) {
    if (!payload || typeof payload !== 'object') return '';
    if (typeof payload.msg === 'string') return payload.msg;
    if (typeof payload.error === 'string') return payload.error;
    if (typeof payload.message === 'string') return payload.message;
    return '';
}

async function apiRequest(pathname, { method = 'GET', token, body, headers = {} } = {}) {
    const finalHeaders = { ...headers };
    let finalBody;

    if (body !== undefined) {
        finalHeaders['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
    }

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(`${BASE_URL}${pathname}`, {
        method,
        headers: finalHeaders,
        body: finalBody,
    });

    const text = await resp.text();
    let payload;
    try {
        payload = text ? JSON.parse(text) : {};
    } catch (err) {
        payload = { raw: text };
    }

    return {
        status: resp.status,
        payload,
        data: unwrapData(payload),
        msg: unwrapMsg(payload),
    };
}

async function login(username, password) {
    const res = await apiRequest('/api/login', {
        method: 'POST',
        body: { username, password },
    });

    assert(res.status === 200, `登录失败(${username})，HTTP=${res.status}，msg=${res.msg}`);
    assert(res.data && typeof res.data.token === 'string', `登录返回缺少 token(${username})`);

    return {
        username,
        id: res.data.id,
        token: res.data.token,
    };
}

function toPositiveInt(value, fallback = 1) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    return fallback;
}

async function main() {
    console.log(`[P5] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const admin = await login('admin001', 'admin123');
    const farmer = await login('farmer001', 'farmer123');

    const runtimeBeforeRes = await apiRequest('/api/admin/settings/runtime', {
        token: admin.token,
    });
    assert(runtimeBeforeRes.status === 200, `读取运行时配置失败，HTTP=${runtimeBeforeRes.status}`);

    const observabilityBefore = runtimeBeforeRes.data && runtimeBeforeRes.data.observability;
    assert(observabilityBefore && typeof observabilityBefore === 'object', '运行时配置缺少 observability 字段');

    const thresholds = observabilityBefore.security_alert_thresholds || {};
    const authnThreshold = toPositiveInt(thresholds.status_401, 5);
    const authzThreshold = toPositiveInt(thresholds.status_403, 4);
    const rateLimitThreshold = toPositiveInt(thresholds.status_429, 2);

    // 1) 触发认证失败峰值（401）
    const authnStatuses = [];
    for (let i = 0; i < authnThreshold + 1; i += 1) {
        const res = await apiRequest('/api/orders');
        authnStatuses.push(res.status);
    }
    assert(authnStatuses.every((s) => s === 401), `认证失败演练状态异常: ${authnStatuses.join(',')}`);

    // 2) 触发越权失败峰值（403）
    const authzStatuses = [];
    for (let i = 0; i < authzThreshold + 1; i += 1) {
        const res = await apiRequest('/api/admin/users', {
            token: farmer.token,
        });
        authzStatuses.push(res.status);
    }
    assert(authzStatuses.every((s) => s === 403), `越权失败演练状态异常: ${authzStatuses.join(',')}`);

    // 3) 触发限流峰值（429）
    const loginStatuses = [];
    for (let i = 0; i < rateLimitThreshold + 6; i += 1) {
        const res = await apiRequest('/api/login', {
            method: 'POST',
            body: {
                username: 'farmer001',
                password: `wrong-password-p5-${i}`,
            },
        });
        loginStatuses.push(res.status);
    }
    assert(loginStatuses.some((s) => s === 429), `限流演练未触发 429: ${loginStatuses.join(',')}`);

    const runtimeAfterRes = await apiRequest('/api/admin/settings/runtime', {
        token: admin.token,
    });
    assert(runtimeAfterRes.status === 200, `二次读取运行时配置失败，HTTP=${runtimeAfterRes.status}`);

    const observabilityAfter = runtimeAfterRes.data && runtimeAfterRes.data.observability;
    assert(observabilityAfter && typeof observabilityAfter === 'object', '演练后运行时配置缺少 observability 字段');

    const recent = observabilityAfter.recent_security_events || {};
    assert(Number(recent.status_401 || 0) >= authnThreshold, `status_401 统计不足: ${recent.status_401}`);
    assert(Number(recent.status_403 || 0) >= authzThreshold, `status_403 统计不足: ${recent.status_403}`);
    assert(Number(recent.status_429 || 0) >= rateLimitThreshold, `status_429 统计不足: ${recent.status_429}`);

    const alertCodes = Array.isArray(observabilityAfter.active_alerts)
        ? observabilityAfter.active_alerts.map((item) => String(item.code || ''))
        : [];

    assert(alertCodes.includes('SECURITY_AUTHN_DENIED_SPIKE'), '缺少 SECURITY_AUTHN_DENIED_SPIKE 告警');
    assert(alertCodes.includes('SECURITY_AUTHZ_DENIED_SPIKE'), '缺少 SECURITY_AUTHZ_DENIED_SPIKE 告警');
    assert(alertCodes.includes('SECURITY_RATE_LIMIT_SPIKE'), '缺少 SECURITY_RATE_LIMIT_SPIKE 告警');

    const dependencyHealth = observabilityAfter.dependency_health || {};
    const amapHealth = String(dependencyHealth.amap || '');
    assert(
        amapHealth === 'up' || amapHealth === 'degraded-unconfigured',
        `amap 健康字段异常: ${amapHealth}`
    );

    console.log('\n[P5] Observability alert drill passed.');
    console.log(`[P5] alerts=${alertCodes.join(',')}, recent401=${recent.status_401 || 0}, recent403=${recent.status_403 || 0}, recent429=${recent.status_429 || 0}, loginStatuses=${loginStatuses.join(',')}`);
}

main().catch((err) => {
    console.error(`\n[P5] Observability alert drill FAILED: ${err.message}`);
    process.exit(1);
});
