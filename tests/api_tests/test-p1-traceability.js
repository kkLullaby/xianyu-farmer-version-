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

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined) {
        if (isFormData) {
            finalBody = body;
        } else if (body !== null && typeof body === 'object' && !(body instanceof ArrayBuffer) && !(body instanceof Blob)) {
            finalHeaders['Content-Type'] = 'application/json';
            finalBody = JSON.stringify(body);
        } else {
            finalBody = body;
        }
    }

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: finalBody,
    });

    const contentType = String(resp.headers.get('content-type') || '');
    const text = await resp.text();
    let payload = {};

    if (contentType.includes('application/json')) {
        try {
            payload = text ? JSON.parse(text) : {};
        } catch (err) {
            payload = { raw: text };
        }
    } else if (text) {
        payload = { raw: text.slice(0, 200) };
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

function futureDate(days = 7) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
}

async function main() {
    console.log(`[P1] Base URL: ${BASE_URL}`);

    const health = await apiRequest('/health');
    assert(health.status === 200, `健康检查失败，HTTP=${health.status}`);

    const initRes = await apiRequest('/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}，msg=${initRes.msg}`);

    const farmer = await login('farmer001', 'farmer123');
    const recycler = await login('recycler001', 'recycler123');
    const processor = await login('processor001', 'processor123');

    const reportRes = await apiRequest('/api/farmer-reports', {
        method: 'POST',
        token: farmer.token,
        body: {
            pickup_date: futureDate(2),
            weight_kg: 156,
            location_address: 'P1 Test Farmer Address',
            location_lat: 23.123321,
            location_lng: 113.123321,
            citrus_variety: 'p1-variety',
            contact_name: 'P1 Farmer Contact',
            contact_phone: '13800006666',
            grade: 'grade2',
            photo_urls: [],
            status: 'pending',
            notes: 'P1 evidence and chat traceability test',
        },
    });
    assert(reportRes.status === 200, `创建 farmer_report 失败，HTTP=${reportRes.status}，msg=${reportRes.msg}`);
    const farmerReportId = reportRes.data && reportRes.data.id;
    const farmerReportNo = reportRes.data && reportRes.data.report_no;
    assert(farmerReportId, '创建 farmer_report 返回缺少 id');

    const pngBytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
        'base64'
    );
    const fileName = `p1-proof-${Date.now()}.png`;
    const form = new FormData();
    form.append('files', new Blob([pngBytes], { type: 'image/png' }), fileName);

    const uploadRes = await apiRequest('/api/upload-arbitration-files', {
        method: 'POST',
        token: farmer.token,
        body: form,
    });
    assert(uploadRes.status === 200, `上传仲裁证据失败，HTTP=${uploadRes.status}，msg=${uploadRes.msg}`);
    assert(uploadRes.data && uploadRes.data.success === true, '上传仲裁证据返回 success=false');
    const uploadedFile = Array.isArray(uploadRes.data.files) ? uploadRes.data.files[0] : null;
    assert(uploadedFile && typeof uploadedFile.path === 'string', '上传仲裁证据返回缺少文件路径');

    const arbitrationRes = await apiRequest('/api/arbitration-requests', {
        method: 'POST',
        token: farmer.token,
        body: {
            order_type: 'farmer_report',
            order_id: farmerReportId,
            order_no: farmerReportNo || `FR-${farmerReportId}`,
            reason: 'other',
            description: 'P1 structured evidence refs test',
            evidence_trade: [JSON.stringify(uploadedFile)],
            evidence_material: [uploadedFile.path],
            evidence_payment: [{ path: uploadedFile.path }],
            evidence_communication: [],
            evidence_other: [],
        },
    });
    assert(arbitrationRes.status === 200, `提交仲裁失败，HTTP=${arbitrationRes.status}，msg=${arbitrationRes.msg}`);

    const ownerAccess = await apiRequest(uploadedFile.path, {
        token: farmer.token,
    });
    assert(ownerAccess.status === 200, `申请人访问仲裁文件失败，HTTP=${ownerAccess.status}`);

    const outsiderAccess = await apiRequest(uploadedFile.path, {
        token: processor.token,
    });
    assert(outsiderAccess.status === 403, `非仲裁参与方访问仲裁文件应为 403，实际 ${outsiderAccess.status}`);

    const sendMessageRes = await apiRequest('/api/chats/messages', {
        method: 'POST',
        token: recycler.token,
        body: {
            target_type: 'farmer_report',
            target_id: farmerReportId,
            receiver_id: farmer.id,
            content: 'P1 chat traceability message',
        },
    });
    assert(sendMessageRes.status === 200, `发送聊天消息失败，HTTP=${sendMessageRes.status}，msg=${sendMessageRes.msg}`);
    assert(sendMessageRes.data && sendMessageRes.data.success === true, '发送聊天消息返回 success=false');

    const deniedSendRes = await apiRequest('/api/chats/messages', {
        method: 'POST',
        token: processor.token,
        body: {
            target_type: 'farmer_report',
            target_id: farmerReportId,
            receiver_id: recycler.id,
            content: 'should be denied',
        },
    });
    assert(deniedSendRes.status === 403, `非目标所有者沟通应被拒绝，实际 ${deniedSendRes.status}`);

    const ownerHistory = await apiRequest(`/api/chats/messages?target_type=farmer_report&target_id=${farmerReportId}`, {
        token: farmer.token,
    });
    assert(ownerHistory.status === 200, `所有者查询聊天记录失败，HTTP=${ownerHistory.status}，msg=${ownerHistory.msg}`);
    assert(ownerHistory.data && ownerHistory.data.success === true, '聊天历史返回 success=false');
    const ownerMessages = Array.isArray(ownerHistory.data.data) ? ownerHistory.data.data : [];
    assert(Array.isArray(ownerMessages) && ownerMessages.length >= 1, '所有者聊天历史为空');
    assert(ownerMessages.some((m) => m.content === 'P1 chat traceability message'), '聊天历史缺少目标消息');

    const outsiderHistory = await apiRequest(`/api/chats/messages?target_type=farmer_report&target_id=${farmerReportId}`, {
        token: processor.token,
    });
    assert(outsiderHistory.status === 400, `非目标所有者未传 peer_id 应为 400，实际 ${outsiderHistory.status}`);

    const peerHistory = await apiRequest(
        `/api/chats/messages?target_type=farmer_report&target_id=${farmerReportId}&peer_id=${farmer.id}`,
        {
            token: recycler.token,
        }
    );
    assert(peerHistory.status === 200, `发送方按 peer_id 查询聊天失败，HTTP=${peerHistory.status}`);
    const peerMessages = peerHistory.data && Array.isArray(peerHistory.data.data) ? peerHistory.data.data : [];
    assert(peerMessages.length >= 1, '按 peer_id 查询聊天历史为空');

    const markReadRes = await apiRequest('/api/chats/messages/read', {
        method: 'POST',
        token: farmer.token,
        body: {
            target_type: 'farmer_report',
            target_id: farmerReportId,
            peer_id: recycler.id,
        },
    });
    assert(markReadRes.status === 200, `标记聊天已读失败，HTTP=${markReadRes.status}，msg=${markReadRes.msg}`);
    assert(markReadRes.data && markReadRes.data.success === true, '标记聊天已读返回 success=false');
    assert(Number(markReadRes.data.changes || 0) >= 1, '标记聊天已读未更新任何记录');

    const afterReadHistory = await apiRequest(
        `/api/chats/messages?target_type=farmer_report&target_id=${farmerReportId}&peer_id=${farmer.id}`,
        {
            token: recycler.token,
        }
    );
    assert(afterReadHistory.status === 200, `已读后查询聊天失败，HTTP=${afterReadHistory.status}`);
    const afterReadMessages = afterReadHistory.data && Array.isArray(afterReadHistory.data.data)
        ? afterReadHistory.data.data
        : [];
    assert(afterReadMessages.some((m) => Number(m.is_read) === 1), '消息已读状态未更新');

    console.log('\n[P1] Traceability tests passed.');
    console.log(`[P1] farmerReportId=${farmerReportId}, filePath=${uploadedFile.path}`);
}

main().catch((err) => {
    console.error(`\n[P1] Traceability tests FAILED: ${err.message}`);
    process.exit(1);
});
