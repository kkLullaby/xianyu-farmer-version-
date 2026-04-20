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

async function apiRequest(path, { method = 'GET', token, body, headers = {} } = {}) {
    const finalHeaders = { ...headers };
    let finalBody;

    if (body !== undefined) {
        finalHeaders['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
    }

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(`${BASE_URL}${path}`, {
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

async function apiRequestWithTimeout(path, {
    method = 'GET',
    token,
    body,
    headers = {},
    timeoutMs = 500,
} = {}) {
    const finalHeaders = { ...headers };
    let finalBody;

    if (body !== undefined) {
        finalHeaders['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
    }

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: finalHeaders,
            body: finalBody,
            signal: controller.signal,
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
            timeout: false,
        };
    } catch (err) {
        if (err && err.name === 'AbortError') {
            return {
                status: 0,
                payload: null,
                data: null,
                msg: 'REQUEST_TIMEOUT',
                timeout: true,
            };
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
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

function futureDate(days = 7) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
}

async function main() {
    console.log(`[P4] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const admin = await login('admin001', 'admin123');
    const farmer = await login('farmer001', 'farmer123');
    const recycler = await login('recycler001', 'recycler123');

    // 1) 资源不可用：访问不存在的仲裁文件应返回 404
    const missingFileRes = await apiRequest(`/uploads/arbitration/not-exist-${Date.now()}.png`, {
        token: farmer.token,
    });
    assert(missingFileRes.status === 404, `不存在仲裁文件应返回 404，实际 ${missingFileRes.status}`);

    // 2) 依赖不可用降级：地图 key 未配置时应返回 503；若已配置则返回 200（记录环境差异）
    const amapRes = await apiRequest('/api/config/amap');
    const amapOutcome = amapRes.status === 503 ? 'unavailable-503' : (amapRes.status === 200 ? 'configured-200' : 'unexpected');
    assert(amapOutcome !== 'unexpected', `/api/config/amap 状态异常，HTTP=${amapRes.status}`);

    // 2.1) 降级回退：强制依赖不可用（仅非生产）时，核心管理接口仍可用
    const forcedAmapUnavailableRes = await apiRequest('/api/config/amap?force_unavailable=1');
    assert(
        forcedAmapUnavailableRes.status === 503,
        `强制依赖不可用应返回 503，实际 ${forcedAmapUnavailableRes.status}`
    );
    assert(
        forcedAmapUnavailableRes.data && forcedAmapUnavailableRes.data.error_code === 'AMAP_UNAVAILABLE',
        '强制依赖不可用返回缺少 AMAP_UNAVAILABLE 错误码'
    );
    assert(
        forcedAmapUnavailableRes.data
        && forcedAmapUnavailableRes.data.degrade
        && forcedAmapUnavailableRes.data.degrade.fallback === 'manual-address',
        '强制依赖不可用返回缺少降级回退提示'
    );
    const degradeRuntimeRes = await apiRequest('/api/admin/settings/runtime', {
        token: admin.token,
    });
    assert(degradeRuntimeRes.status === 200, `降级场景下管理端运行时接口异常，HTTP=${degradeRuntimeRes.status}`);
    const degradeOutcome = 'forced-503-core-ok';

    // 3) 并发冲突：同一意向并发接受应出现 [200, 409]
    const recyclerRequestRes = await apiRequest('/api/recycler-requests', {
        method: 'POST',
        token: recycler.token,
        body: {
            grade: 'grade2',
            contact_name: 'P4 Recycler Contact',
            contact_phone: '13700008888',
            notes: 'P4 failure-path concurrency target',
            valid_until: futureDate(15),
            status: 'active',
        },
    });
    assert(recyclerRequestRes.status === 200, `创建回收商求购失败，HTTP=${recyclerRequestRes.status}，msg=${recyclerRequestRes.msg}`);

    const recyclerRequestId = recyclerRequestRes.data && recyclerRequestRes.data.id;
    const recyclerRequestNo = recyclerRequestRes.data && recyclerRequestRes.data.request_no;
    assert(recyclerRequestId, '创建回收商求购返回缺少 id');

    const intentionRes = await apiRequest('/api/intentions', {
        method: 'POST',
        token: farmer.token,
        body: {
            target_type: 'recycler_request',
            target_id: recyclerRequestId,
            target_no: recyclerRequestNo || `REQ-${recyclerRequestId}`,
            target_name: 'P4 Intent Target',
            estimated_weight: 38,
            expected_date: futureDate(3),
            notes: 'P4 concurrency case',
        },
    });
    assert(intentionRes.status === 200, `创建意向失败，HTTP=${intentionRes.status}，msg=${intentionRes.msg}`);

    const intentionId = intentionRes.data && intentionRes.data.id;
    assert(intentionId, '创建意向返回缺少 id');

    const [acceptA, acceptB] = await Promise.all([
        apiRequest(`/api/intentions/${intentionId}/status`, {
            method: 'PATCH',
            token: recycler.token,
            body: { status: 'accepted' },
        }),
        apiRequest(`/api/intentions/${intentionId}/status`, {
            method: 'PATCH',
            token: recycler.token,
            body: { status: 'accepted' },
        }),
    ]);

    const statuses = [acceptA.status, acceptB.status].sort((a, b) => a - b);
    assert(statuses[0] === 200 && statuses[1] === 409, `并发接受防冲突失败，期望 [200,409]，实际 [${statuses.join(',')}]`);

    // 4) 超时失败路径：管理端关键查询在慢响应下应被客户端超时中止
    const runtimeTimeoutRes = await apiRequestWithTimeout('/api/admin/settings/runtime?simulate_delay_ms=1500', {
        token: admin.token,
        timeoutMs: 300,
    });
    assert(runtimeTimeoutRes.timeout === true, `管理端关键查询超时路径未触发，status=${runtimeTimeoutRes.status}`);

    // 4.1) 重试恢复：首次超时后立即重试，应恢复成功
    const runtimeRetryRes = await apiRequest('/api/admin/settings/runtime', {
        token: admin.token,
    });
    assert(runtimeRetryRes.status === 200, `超时后重试恢复失败，HTTP=${runtimeRetryRes.status}`);
    const retryOutcome = 'timeout-then-success';

    // 5) 限流失败路径：连续错误登录应触发 429
    const rateStatuses = [];
    for (let i = 0; i < 6; i += 1) {
        const badLoginRes = await apiRequest('/api/login', {
            method: 'POST',
            body: {
                username: 'farmer001',
                password: `wrong-password-${i}`,
            },
        });
        rateStatuses.push(badLoginRes.status);
    }

    assert(rateStatuses.some((s) => s === 429), `登录限流未触发，状态序列=${rateStatuses.join(',')}`);
    assert(rateStatuses.every((s) => s === 401 || s === 429), `登录限流状态异常，状态序列=${rateStatuses.join(',')}`);

    // 管理员 token 保持可用（在限流场景后验证认证路径未被污染）
    const runtimeRes = await apiRequest('/api/admin/settings/runtime', {
        token: admin.token,
    });
    assert(runtimeRes.status === 200, `管理员运行时配置接口异常，HTTP=${runtimeRes.status}`);

    // 6) 可观测告警联动：限流事件应体现在运行时观测快照中
    const observability = runtimeRes.data && runtimeRes.data.observability;
    assert(observability && typeof observability === 'object', '运行时观测快照缺失 observability 字段');
    const recentSecurityEvents = observability.recent_security_events || {};
    const recentRateLimitedCount = Number(recentSecurityEvents.status_429 || 0);
    assert(recentRateLimitedCount >= 1, `运行时观测快照中未记录限流事件，status_429=${recentRateLimitedCount}`);
    const activeAlertCodes = Array.isArray(observability.active_alerts)
        ? observability.active_alerts.map((item) => String(item.code || ''))
        : [];
    assert(activeAlertCodes.includes('SECURITY_RATE_LIMIT_SPIKE'), '运行时观测快照缺少限流告警联动');
    const observabilityOutcome = 'rate-limit-alert-linked';

    console.log('\n[P4] Failure-path tests passed.');
    console.log(`[P4] amap=${amapOutcome}, degrade=${degradeOutcome}, timeout=true, retry=${retryOutcome}, observability=${observabilityOutcome}, intentionId=${intentionId}, loginStatuses=${rateStatuses.join(',')}`);
}

main().catch((err) => {
    console.error(`\n[P4] Failure-path tests FAILED: ${err.message}`);
    process.exit(1);
});
