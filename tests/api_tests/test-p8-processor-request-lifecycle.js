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

function futureDate(days = 7) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
}

function findById(list, id, label) {
    const rows = Array.isArray(list) ? list : [];
    const found = rows.find((item) => Number(item.id) === Number(id));
    assert(found, `${label} 未找到 id=${id}`);
    return found;
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
        id: Number(res.data.id),
        token: res.data.token,
        username,
    };
}

async function main() {
    console.log(`[P8] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const processor = await login('processor001', 'processor123');
    const recycler = await login('recycler001', 'recycler123');

    const createRes = await apiRequest('/api/processor-requests', {
        method: 'POST',
        token: processor.token,
        body: {
            weight_kg: 280,
            grade: 'grade2',
            citrus_type: 'p8-type-a',
            location_address: 'P8 Create Address',
            contact_name: 'P8 Processor Contact',
            contact_phone: '13600007777',
            has_transport: true,
            notes: 'P8 create lifecycle',
            valid_until: futureDate(15),
            status: 'active',
        },
    });
    assert(createRes.status === 200, `创建 processor_request 失败，HTTP=${createRes.status}，msg=${createRes.msg}`);

    const requestId = createRes.data && createRes.data.id;
    assert(requestId, '创建 processor_request 返回缺少 id');

    const listBeforeUpdate = await apiRequest('/api/processor-requests', {
        token: processor.token,
    });
    assert(listBeforeUpdate.status === 200, `查询 processor-requests 列表失败，HTTP=${listBeforeUpdate.status}`);

    const rowBeforeUpdate = findById(listBeforeUpdate.data, requestId, 'processor-requests 列表(更新前)');
    assert(rowBeforeUpdate.citrus_type === 'p8-type-a', `更新前 citrus_type 映射异常: ${rowBeforeUpdate.citrus_type}`);
    assert(rowBeforeUpdate.location_address === 'P8 Create Address', `更新前 location_address 映射异常: ${rowBeforeUpdate.location_address}`);

    const updateRes = await apiRequest('/api/processor-requests', {
        method: 'POST',
        token: processor.token,
        body: {
            id: requestId,
            weight_kg: 305,
            grade: 'grade1',
            citrus_type: 'p8-type-b',
            location_address: 'P8 Updated Address',
            contact_name: 'P8 Processor Contact Updated',
            contact_phone: '13600007778',
            has_transport: false,
            notes: 'P8 update lifecycle',
            valid_until: futureDate(20),
            status: 'active',
        },
    });
    assert(updateRes.status === 200, `更新 processor_request 失败，HTTP=${updateRes.status}，msg=${updateRes.msg}`);

    const detailAfterUpdate = await apiRequest(`/api/processor-requests/${requestId}`, {
        token: processor.token,
    });
    assert(detailAfterUpdate.status === 200, `查询 processor_request 详情失败，HTTP=${detailAfterUpdate.status}`);

    const detailRow = detailAfterUpdate.data || {};
    assert(detailRow.citrus_type === 'p8-type-b', `更新后 citrus_type 映射异常: ${detailRow.citrus_type}`);
    assert(detailRow.location_address === 'P8 Updated Address', `更新后 location_address 映射异常: ${detailRow.location_address}`);
    assert(Number(detailRow.recycler_id || 0) === 0, `更新后 recycler_id 应为空，实际 ${detailRow.recycler_id}`);

    const forbiddenStatusPatch = await apiRequest(`/api/processor-requests/${requestId}/status`, {
        method: 'PATCH',
        token: recycler.token,
        body: {
            status: 'closed',
            processor_id: processor.id,
        },
    });
    assert(forbiddenStatusPatch.status === 403, `回收商更新处理商求购状态应为 403，实际 ${forbiddenStatusPatch.status}`);

    const acceptRes = await apiRequest(`/api/processor-requests/${requestId}/accept`, {
        method: 'POST',
        token: recycler.token,
        body: { recycler_id: recycler.id },
    });
    assert(acceptRes.status === 200, `回收商接单失败，HTTP=${acceptRes.status}，msg=${acceptRes.msg}`);

    const detailAfterAccept = await apiRequest(`/api/processor-requests/${requestId}`, {
        token: processor.token,
    });
    assert(detailAfterAccept.status === 200, `接单后查询详情失败，HTTP=${detailAfterAccept.status}`);
    assert(Number(detailAfterAccept.data.recycler_id) === recycler.id, `接单后 recycler_id 未写入，实际 ${detailAfterAccept.data.recycler_id}`);

    const secondAcceptRes = await apiRequest(`/api/processor-requests/${requestId}/accept`, {
        method: 'POST',
        token: recycler.token,
        body: { recycler_id: recycler.id },
    });
    assert(
        secondAcceptRes.status === 400 || secondAcceptRes.status === 409,
        `重复接单应被拒绝，期望 400/409，实际 ${secondAcceptRes.status}`
    );

    const processorCloseRes = await apiRequest(`/api/processor-requests/${requestId}/status`, {
        method: 'PATCH',
        token: processor.token,
        body: { status: 'closed' },
    });
    assert(processorCloseRes.status === 200, `处理商关闭求购失败，HTTP=${processorCloseRes.status}，msg=${processorCloseRes.msg}`);

    const recyclerMarketList = await apiRequest('/api/processor-requests?for_recyclers=true', {
        token: recycler.token,
    });
    assert(recyclerMarketList.status === 200, `回收商查询市场求购失败，HTTP=${recyclerMarketList.status}`);
    const marketRows = Array.isArray(recyclerMarketList.data) ? recyclerMarketList.data : [];
    assert(!marketRows.some((row) => Number(row.id) === Number(requestId)), '关闭后的求购不应出现在 for_recyclers=true 市场列表');

    console.log('\n[P8] Processor request lifecycle tests passed.');
    console.log(`[P8] requestId=${requestId}, recyclerId=${recycler.id}, secondAcceptStatus=${secondAcceptRes.status}`);
}

main().catch((err) => {
    console.error(`\n[P8] Processor request lifecycle tests FAILED: ${err.message}`);
    process.exit(1);
});
