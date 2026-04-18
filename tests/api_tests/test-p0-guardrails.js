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

function isMaskedPhone(value) {
    return typeof value === 'string' && /^1\d{2}\*{4}\d{4}$/.test(value);
}

function isFullPhone(value) {
    return typeof value === 'string' && /^1[3-9]\d{9}$/.test(value);
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

async function login(username, password) {
    const res = await apiRequest('/api/login', {
        method: 'POST',
        body: { username, password },
    });

    assert(res.status === 200, `登录失败(${username})，HTTP=${res.status}，msg=${res.msg}`);
    assert(res.data && typeof res.data.token === 'string', `登录返回缺少 token(${username})`);

    return {
        username,
        token: res.data.token,
        id: res.data.id,
    };
}

function findById(list, id, label) {
    const row = (Array.isArray(list) ? list : []).find((item) => Number(item.id) === Number(id));
    assert(row, `${label} 未在列表中找到 id=${id}`);
    return row;
}

function futureDate(days = 7) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
}

async function main() {
    console.log(`[P0] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const farmer = await login('farmer001', 'farmer123');
    const recycler = await login('recycler001', 'recycler123');
    const processor = await login('processor001', 'processor123');

    const reportPhone = '13800001111';
    const recyclerSupplyPhone = '13900002222';
    const recyclerRequestPhone = '13700003333';
    const processorRequestPhone = '13600004444';
    const validUntil = futureDate(15);

    // 1) Seed farmer report (pending)
    const reportRes = await apiRequest('/api/farmer-reports', {
        method: 'POST',
        token: farmer.token,
        body: {
            pickup_date: futureDate(2),
            weight_kg: 120,
            location_address: 'P0 Test Farmer Address',
            location_lat: 23.123456,
            location_lng: 113.123456,
            citrus_variety: 'test-variety',
            contact_name: 'Farmer Contact',
            contact_phone: reportPhone,
            grade: 'grade2',
            photo_urls: [],
            status: 'pending',
            notes: 'P0 masking test data',
        },
    });
    assert(reportRes.status === 200, `创建 farmer_report 失败，HTTP=${reportRes.status}，msg=${reportRes.msg}`);
    const farmerReportId = reportRes.data && reportRes.data.id;
    assert(farmerReportId, '创建 farmer_report 返回缺少 id');

    // 2) Seed recycler supply (active)
    const recyclerSupplyRes = await apiRequest('/api/recycler-supplies', {
        method: 'POST',
        token: recycler.token,
        body: {
            grade: 'grade2',
            stock_weight: 88,
            contact_name: 'Recycler Supply Contact',
            contact_phone: recyclerSupplyPhone,
            address: 'P0 Test Recycler Supply Address',
            notes: 'P0 masking test data',
            valid_until: validUntil,
            status: 'active',
        },
    });
    assert(recyclerSupplyRes.status === 200, `创建 recycler_supply 失败，HTTP=${recyclerSupplyRes.status}，msg=${recyclerSupplyRes.msg}`);
    const recyclerSupplyId = recyclerSupplyRes.data && recyclerSupplyRes.data.id;
    assert(recyclerSupplyId, '创建 recycler_supply 返回缺少 id');

    // 3) Seed recycler request (active) for intention conflict test
    const recyclerRequestRes = await apiRequest('/api/recycler-requests', {
        method: 'POST',
        token: recycler.token,
        body: {
            grade: 'grade2',
            contact_name: 'Recycler Request Contact',
            contact_phone: recyclerRequestPhone,
            notes: 'P0 intention concurrency target',
            valid_until: validUntil,
            status: 'active',
        },
    });
    assert(recyclerRequestRes.status === 200, `创建 recycler_request 失败，HTTP=${recyclerRequestRes.status}，msg=${recyclerRequestRes.msg}`);
    const recyclerRequestId = recyclerRequestRes.data && recyclerRequestRes.data.id;
    const recyclerRequestNo = recyclerRequestRes.data && recyclerRequestRes.data.request_no;
    assert(recyclerRequestId, '创建 recycler_request 返回缺少 id');

    // 4) Seed processor request (active, has_transport=1)
    const processorRequestRes = await apiRequest('/api/processor-requests', {
        method: 'POST',
        token: processor.token,
        body: {
            weight_kg: 300,
            grade: 'grade1',
            citrus_type: 'pulp-a',
            location_address: 'P0 Test Processor Address',
            contact_name: 'Processor Contact',
            contact_phone: processorRequestPhone,
            has_transport: true,
            notes: 'P0 masking/freeze test data',
            valid_until: validUntil,
            status: 'active',
        },
    });
    assert(processorRequestRes.status === 200, `创建 processor_request 失败，HTTP=${processorRequestRes.status}，msg=${processorRequestRes.msg}`);
    const processorRequestId = processorRequestRes.data && processorRequestRes.data.id;
    const processorRequestNo = processorRequestRes.data && processorRequestRes.data.request_no;
    assert(processorRequestId, '创建 processor_request 返回缺少 id');

    // ========== A. Masking Assertions ==========

    // A1: farmer-supplies list: recycler should see masked contact_phone
    const farmerSuppliesForRecycler = await apiRequest('/api/farmer-supplies', {
        token: recycler.token,
    });
    assert(farmerSuppliesForRecycler.status === 200, `查询 farmer-supplies(回收商)失败，HTTP=${farmerSuppliesForRecycler.status}`);
    const farmerSupplyItemForRecycler = findById(farmerSuppliesForRecycler.data, farmerReportId, 'farmer-supplies(回收商)');
    assert(isMaskedPhone(farmerSupplyItemForRecycler.contact_phone), 'farmer-supplies 在非所有者视角下 contact_phone 未脱敏');

    // A2: farmer-supplies list: owner farmer should see full contact_phone
    const farmerSuppliesForFarmer = await apiRequest('/api/farmer-supplies', {
        token: farmer.token,
    });
    assert(farmerSuppliesForFarmer.status === 200, `查询 farmer-supplies(农户)失败，HTTP=${farmerSuppliesForFarmer.status}`);
    const farmerSupplyItemForOwner = findById(farmerSuppliesForFarmer.data, farmerReportId, 'farmer-supplies(农户)');
    assert(farmerSupplyItemForOwner.contact_phone === reportPhone, 'farmer-supplies 在所有者视角下 contact_phone 应为明文');

    // A3: recycler-supplies list: farmer should see masked contact_phone
    const recyclerSuppliesForFarmer = await apiRequest('/api/recycler-supplies', {
        token: farmer.token,
    });
    assert(recyclerSuppliesForFarmer.status === 200, `查询 recycler-supplies(农户)失败，HTTP=${recyclerSuppliesForFarmer.status}`);
    const recyclerSupplyItemForFarmer = findById(recyclerSuppliesForFarmer.data, recyclerSupplyId, 'recycler-supplies(农户)');
    assert(isMaskedPhone(recyclerSupplyItemForFarmer.contact_phone), 'recycler-supplies 在非所有者视角下 contact_phone 未脱敏');

    // A4: recycler-supplies list: owner recycler should see full contact_phone
    const recyclerSuppliesForOwner = await apiRequest('/api/recycler-supplies', {
        token: recycler.token,
    });
    assert(recyclerSuppliesForOwner.status === 200, `查询 recycler-supplies(回收商)失败，HTTP=${recyclerSuppliesForOwner.status}`);
    const recyclerSupplyItemForOwner = findById(recyclerSuppliesForOwner.data, recyclerSupplyId, 'recycler-supplies(回收商)');
    assert(recyclerSupplyItemForOwner.contact_phone === recyclerSupplyPhone, 'recycler-supplies 在所有者视角下 contact_phone 应为明文');

    // A5: processor-requests list/details: farmer should see masked contact_phone
    const processorRequestsForFarmer = await apiRequest('/api/processor-requests?for_farmers=true', {
        token: farmer.token,
    });
    assert(processorRequestsForFarmer.status === 200, `查询 processor-requests(农户列表)失败，HTTP=${processorRequestsForFarmer.status}`);
    const processorRequestItemForFarmer = findById(processorRequestsForFarmer.data, processorRequestId, 'processor-requests(农户列表)');
    assert(isMaskedPhone(processorRequestItemForFarmer.contact_phone), 'processor-requests 列表在非所有者视角下 contact_phone 未脱敏');

    const processorRequestDetailForFarmer = await apiRequest(`/api/processor-requests/${processorRequestId}`, {
        token: farmer.token,
    });
    assert(processorRequestDetailForFarmer.status === 200, `查询 processor-request 详情(农户)失败，HTTP=${processorRequestDetailForFarmer.status}`);
    assert(isMaskedPhone(processorRequestDetailForFarmer.data.contact_phone), 'processor-requests/:id 在非所有者视角下 contact_phone 未脱敏');

    // A6: processor-requests detail: owner processor should see full contact_phone
    const processorRequestDetailForOwner = await apiRequest(`/api/processor-requests/${processorRequestId}`, {
        token: processor.token,
    });
    assert(processorRequestDetailForOwner.status === 200, `查询 processor-request 详情(处理商)失败，HTTP=${processorRequestDetailForOwner.status}`);
    assert(processorRequestDetailForOwner.data.contact_phone === processorRequestPhone, 'processor-requests/:id 在所有者视角下 contact_phone 应为明文');

    // ========== B. Arbitration Freeze Assertion ==========

    const arbitrationRes = await apiRequest('/api/arbitration-requests', {
        method: 'POST',
        token: processor.token,
        body: {
            order_type: 'processor_request',
            order_id: processorRequestId,
            order_no: processorRequestNo || `PREQ-${processorRequestId}`,
            reason: 'quality',
            description: 'P0 freeze guardrail test',
            evidence_trade: ['proof-trade-1'],
            evidence_material: ['proof-material-1'],
            evidence_payment: ['proof-payment-1'],
            evidence_communication: [],
            evidence_other: [],
        },
    });
    assert(arbitrationRes.status === 200, `创建仲裁失败，HTTP=${arbitrationRes.status}，msg=${arbitrationRes.msg}`);

    const frozenStatusPatch = await apiRequest(`/api/processor-requests/${processorRequestId}/status`, {
        method: 'PATCH',
        token: processor.token,
        body: { status: 'closed' },
    });
    assert(frozenStatusPatch.status === 409, `仲裁冻结拦截未生效，期望 409，实际 ${frozenStatusPatch.status}`);

    // ========== C. Intention Concurrency Assertion ==========

    const intentionCreateRes = await apiRequest('/api/intentions', {
        method: 'POST',
        token: farmer.token,
        body: {
            target_type: 'recycler_request',
            target_id: recyclerRequestId,
            target_no: recyclerRequestNo || `REQ-${recyclerRequestId}`,
            target_name: 'P0 Recycler Request',
            estimated_weight: 45,
            expected_date: futureDate(3),
            notes: 'P0 concurrency test',
        },
    });
    assert(intentionCreateRes.status === 200, `创建意向失败，HTTP=${intentionCreateRes.status}，msg=${intentionCreateRes.msg}`);
    const intentionId = intentionCreateRes.data && intentionCreateRes.data.id;
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
    assert(statuses[0] === 200 && statuses[1] === 409, `并发接受意向防重失败，期望 [200,409]，实际 [${statuses.join(',')}]`);

    console.log('\n[P0] Guardrail negative tests passed.');
    console.log(`[P0] farmerReportId=${farmerReportId}, recyclerSupplyId=${recyclerSupplyId}, recyclerRequestId=${recyclerRequestId}, processorRequestId=${processorRequestId}, intentionId=${intentionId}`);
}

main().catch((err) => {
    console.error(`\n[P0] Guardrail negative tests FAILED: ${err.message}`);
    process.exit(1);
});
