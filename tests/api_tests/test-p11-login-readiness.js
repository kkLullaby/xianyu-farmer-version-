#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const LOGIN_PAGE_FILE = path.join(ROOT_DIR, 'src/pages/login/index.vue');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function attachLogs(child) {
    const logs = [];
    const append = (prefix) => (chunk) => {
        const text = String(chunk || '').trimEnd();
        if (!text) return;
        logs.push(`${prefix}${text}`);
        if (logs.length > 120) logs.splice(0, logs.length - 120);
    };
    child.stdout.on('data', append(''));
    child.stderr.on('data', append('ERR '));
    return logs;
}

async function stopServer(child) {
    if (!child || child.killed || child.exitCode !== null) return;

    try {
        child.kill('SIGTERM');
    } catch (err) {
        // noop
    }

    await new Promise((resolve) => {
        const timer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch (err) {
                // noop
            }
            resolve();
        }, 4000);

        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

async function waitForHealth(baseUrl, timeoutMs = 15000) {
    const startedAt = Date.now();
    let lastError = '';

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) return;
            lastError = `HTTP ${response.status}`;
        } catch (err) {
            lastError = err && err.message ? err.message : String(err);
        }

        await sleep(250);
    }

    throw new Error(`健康检查超时: ${baseUrl}/health (${lastError})`);
}

async function apiRequest(baseUrl, urlPath, { method = 'GET', token, body } = {}) {
    const headers = {};
    let finalBody;

    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${urlPath}`, {
        method,
        headers,
        body: finalBody,
    });

    const text = await response.text();
    let payload = {};

    try {
        payload = text ? JSON.parse(text) : {};
    } catch (err) {
        payload = { raw: text };
    }

    return {
        status: response.status,
        payload,
    };
}

function unwrapData(payload) {
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data;
    }
    return payload;
}

function runStaticChecks() {
    const content = fs.readFileSync(LOGIN_PAGE_FILE, 'utf8');

    assert(content.includes('账号登录'), '登录页缺少账号登录入口文案');
    assert(content.includes('手机号注册'), '登录页缺少手机号注册入口文案');
    assert(content.includes("request.post('/api/login'"), '登录页未接入 /api/login');
    assert(content.includes("request.post('/api/auth/register-phone'"), '登录页未接入 /api/auth/register-phone');

    assert(!/正在开发中/.test(content), '登录页仍包含“正在开发中”占位文案');
    assert(!/TODO/.test(content), '登录页仍包含 TODO 占位标记');
}

async function runApiChecks(baseUrl) {
    const initRes = await apiRequest(baseUrl, '/init', { method: 'POST' });
    assert(initRes.status === 200, `初始化失败，HTTP=${initRes.status}`);

    const loginRes = await apiRequest(baseUrl, '/api/login', {
        method: 'POST',
        body: { username: 'farmer001', password: 'farmer123' },
    });
    assert(loginRes.status === 200, `登录失败，HTTP=${loginRes.status}`);
    const loginData = unwrapData(loginRes.payload);
    assert(loginData && typeof loginData.token === 'string', '登录返回缺少 token');

    const meRes = await apiRequest(baseUrl, '/api/me', {
        method: 'GET',
        token: loginData.token,
    });
    assert(meRes.status === 200, `查询 /api/me 失败，HTTP=${meRes.status}`);
    const meData = unwrapData(meRes.payload);
    assert(meData && meData.role === 'farmer', `角色校验失败，期望 farmer，实际 ${meData && meData.role}`);

    const badLoginRes = await apiRequest(baseUrl, '/api/login', {
        method: 'POST',
        body: { username: 'farmer001', password: 'wrong-password' },
    });
    assert(badLoginRes.status === 401, `错误密码应为 401，实际 ${badLoginRes.status}`);

    return {
        userId: loginData.id,
        role: meData.role,
    };
}

async function main() {
    runStaticChecks();

    const port = 4450 + Math.floor(Math.random() * 200);
    const baseUrl = `http://localhost:${port}`;
    const server = spawn(process.execPath, [SERVER_ENTRY], {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            PORT: String(port),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const logs = attachLogs(server);

    try {
        await waitForHealth(baseUrl);
        const summary = await runApiChecks(baseUrl);

        console.log('\n[P11] Login readiness checks passed.');
        console.log(`[P11] userId=${summary.userId}, role=${summary.role}`);
    } catch (err) {
        const tail = logs.length ? `\n${logs.slice(-20).join('\n')}` : '';
        throw new Error(`${err.message}${tail}`);
    } finally {
        await stopServer(server);
    }
}

main().catch((err) => {
    console.error(`\n[P11] Login readiness checks FAILED: ${err.message}`);
    process.exit(1);
});
