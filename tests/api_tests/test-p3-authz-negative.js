#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const ROOT_DIR = path.resolve(__dirname, '../..');
const AUDIT_LOG_PATH = path.join(ROOT_DIR, 'logs', 'security-audit.log');

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

function readAuditLogSize() {
    try {
        return fs.statSync(AUDIT_LOG_PATH).size;
    } catch (err) {
        return 0;
    }
}

function readAuditDelta(fromSize) {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return '';
    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    return content.slice(Math.max(0, fromSize));
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

async function main() {
    console.log(`[P3] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const auditSizeBefore = readAuditLogSize();

    const farmer = await login('farmer001', 'farmer123');
    const recycler = await login('recycler001', 'recycler123');
    const processor = await login('processor001', 'processor123');

    const createdOrder = await apiRequest('/api/orders', {
        method: 'POST',
        token: farmer.token,
        body: {
            recycler_id: recycler.id,
            weight_kg: 77,
            price_per_kg: 1.15,
            notes: 'P3 authz negative baseline order',
        },
    });
    assert(createdOrder.status === 200, `创建订单失败，HTTP=${createdOrder.status}，msg=${createdOrder.msg}`);
    const orderId = createdOrder.data && createdOrder.data.id;
    assert(orderId, '创建订单返回缺少 id');

    const missingTokenRes = await apiRequest('/api/orders');
    assert(missingTokenRes.status === 401, `缺失 token 访问 /api/orders 应为 401，实际 ${missingTokenRes.status}`);

    const badTokenRes = await apiRequest('/api/orders', {
        token: 'bad.token.value',
    });
    assert(badTokenRes.status === 401, `无效 token 访问 /api/orders 应为 401，实际 ${badTokenRes.status}`);

    const farmerAdminListRes = await apiRequest('/api/admin/users', {
        token: farmer.token,
    });
    assert(farmerAdminListRes.status === 403, `农户访问管理员用户列表应为 403，实际 ${farmerAdminListRes.status}`);

    const recyclerCreateProcessorRequest = await apiRequest('/api/processor-requests', {
        method: 'POST',
        token: recycler.token,
        body: {
            weight_kg: 88,
            grade: 'grade1',
            citrus_type: 'p3-negative',
            location_address: 'P3 test location',
            contact_name: 'P3 recycler should fail',
            contact_phone: '13900005555',
            has_transport: false,
            notes: 'should be denied',
        },
    });
    assert(
        recyclerCreateProcessorRequest.status === 403,
        `回收商创建处理商求购应为 403，实际 ${recyclerCreateProcessorRequest.status}`
    );

    const processorCreateRecyclerRequest = await apiRequest('/api/recycler-requests', {
        method: 'POST',
        token: processor.token,
        body: {
            grade: 'grade2',
            contact_name: 'P3 processor should fail',
            contact_phone: '13600006666',
            notes: 'should be denied',
        },
    });
    assert(
        processorCreateRecyclerRequest.status === 403,
        `处理商创建回收商求购应为 403，实际 ${processorCreateRecyclerRequest.status}`
    );

    const farmerPatchOrderStatus = await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        token: farmer.token,
        body: { status: 'shipped' },
    });
    assert(
        farmerPatchOrderStatus.status === 403,
        `农户更新订单状态应为 403，实际 ${farmerPatchOrderStatus.status}`
    );

    const auditDelta = readAuditDelta(auditSizeBefore);
    assert(auditDelta.trim().length > 0, '负向权限测试后未检测到新增审计日志');
    assert(auditDelta.includes('"status":401'), '审计日志缺少 401 事件');
    assert(auditDelta.includes('"status":403'), '审计日志缺少 403 事件');
    assert(auditDelta.includes('/api/admin/users'), '审计日志缺少管理员越权访问路径记录');

    console.log('\n[P3] Authz negative tests passed.');
    console.log(`[P3] orderId=${orderId}, auditLog=${AUDIT_LOG_PATH}`);
}

main().catch((err) => {
    console.error(`\n[P3] Authz negative tests FAILED: ${err.message}`);
    process.exit(1);
});
