#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { getSmsRuntimeStatus } = require('../../smsClient');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function attachLogs(child) {
    const lines = [];
    const append = (prefix) => (chunk) => {
        const text = String(chunk || '').trimEnd();
        if (!text) return;
        lines.push(`${prefix}${text}`);
        if (lines.length > 120) lines.splice(0, lines.length - 120);
    };
    child.stdout.on('data', append(''));
    child.stderr.on('data', append('ERR '));
    return lines;
}

async function waitForHealth(baseUrl, timeoutMs = 12000) {
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

async function stopProcess(child) {
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

function startServerWithEnv(envOverrides) {
    return spawn(process.execPath, [SERVER_ENTRY], {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            ...envOverrides,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

async function expectServerStart(envOverrides, label) {
    const port = String(envOverrides.PORT);
    const baseUrl = `http://localhost:${port}`;
    const child = startServerWithEnv(envOverrides);
    const logs = attachLogs(child);

    try {
        await waitForHealth(baseUrl, 12000);
    } catch (err) {
        throw new Error(`${label} 期望启动成功，但失败: ${err.message}\n${logs.slice(-20).join('\n')}`);
    } finally {
        await stopProcess(child);
    }
}

async function expectServerBootFail(envOverrides, label, expectedText) {
    const child = startServerWithEnv(envOverrides);
    const logs = attachLogs(child);

    const exitCode = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('等待进程退出超时')), 10000);

        child.once('exit', (code) => {
            clearTimeout(timer);
            resolve(code);
        });
    });

    assert(Number(exitCode) !== 0, `${label} 期望启动失败，但 exitCode=${exitCode}`);
    const mergedLogs = logs.join('\n');
    assert(mergedLogs.includes(expectedText), `${label} 未命中预期错误文案: ${expectedText}\n实际日志:\n${mergedLogs}`);
}

function runRuntimeStatusChecks() {
    const base = {
        NODE_ENV: 'development',
        SMS_PROVIDER: 'auto',
        ALIYUN_ACCESS_KEY_ID: '',
        ALIYUN_ACCESS_KEY_SECRET: '',
        ALIYUN_SMS_SIGN: '',
        ALIYUN_SMS_TEMPLATE: '',
    };

    const devAuto = getSmsRuntimeStatus(base);
    assert(devAuto.providerResolved === 'mock', '开发环境 auto 且无配置时应解析为 mock');
    assert(devAuto.runtimeReady === true, '开发环境 auto/mock 应允许启动');

    const prodMock = getSmsRuntimeStatus({
        ...base,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'mock',
    });
    assert(prodMock.runtimeReady === false, '生产环境 mock 应被阻断');
    assert(prodMock.blockReason.includes('生产环境禁止使用 Mock'), '生产环境 mock 阻断文案不符合预期');

    const prodAliyunReady = getSmsRuntimeStatus({
        ...base,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'aliyun',
        ALIYUN_ACCESS_KEY_ID: 'ak',
        ALIYUN_ACCESS_KEY_SECRET: 'sk',
        ALIYUN_SMS_SIGN: 'sign',
        ALIYUN_SMS_TEMPLATE: 'template',
    });
    assert(prodAliyunReady.runtimeReady === true, '生产环境 aliyun 配置完整时应允许启动');
}

async function main() {
    runRuntimeStatusChecks();

    const randomBasePort = 4370 + Math.floor(Math.random() * 200);

    await expectServerStart(
        {
            NODE_ENV: 'development',
            SMS_PROVIDER: 'mock',
            PORT: String(randomBasePort),
        },
        '开发环境 mock 模式'
    );

    await expectServerBootFail(
        {
            NODE_ENV: 'production',
            JWT_SECRET: 'p10-jwt-secret',
            SMS_PROVIDER: 'mock',
            ALIYUN_ACCESS_KEY_ID: '',
            ALIYUN_ACCESS_KEY_SECRET: '',
            ALIYUN_SMS_SIGN: '',
            ALIYUN_SMS_TEMPLATE: '',
            PORT: String(randomBasePort + 1),
        },
        '生产环境 mock 模式',
        '生产环境禁止使用 Mock 短信通道'
    );

    console.log('\n[P10] SMS runtime guard checks passed.');
}

main().catch((err) => {
    console.error(`\n[P10] SMS runtime guard checks FAILED: ${err.message}`);
    process.exit(1);
});
