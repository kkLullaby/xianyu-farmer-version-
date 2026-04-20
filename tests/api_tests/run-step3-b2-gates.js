#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const GATE_LIST = [
    { script: 'test:p0', port: 4320 },
    { script: 'test:p1', port: 4321 },
    { script: 'test:p2', port: 4322 },
    { script: 'test:p3', port: 4323 },
    { script: 'test:p4', port: 4324 },
    {
        script: 'test:p5',
        port: 4325,
        serverEnv: {
            SECURITY_ALERT_AUTHN_THRESHOLD: '5',
            SECURITY_ALERT_AUTHZ_THRESHOLD: '4',
            SECURITY_ALERT_RATE_LIMIT_THRESHOLD: '2',
            SECURITY_ALERT_WINDOW_MINUTES: '15',
        },
    },
];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms) {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
}

function waitChildExit(child, timeoutMs = 5000) {
    return new Promise((resolve) => {
        if (!child || child.killed || child.exitCode !== null) {
            resolve();
            return;
        }

        let done = false;

        const finalize = () => {
            if (done) return;
            done = true;
            resolve();
        };

        const timer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch (err) {
                // noop
            }
            finalize();
        }, timeoutMs);

        child.once('exit', () => {
            clearTimeout(timer);
            finalize();
        });
    });
}

async function waitForHealth(baseUrl, timeoutMs = 20000) {
    const startedAt = Date.now();
    let lastError = '';

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) {
                return;
            }
            lastError = `HTTP ${response.status}`;
        } catch (err) {
            lastError = err && err.message ? err.message : String(err);
        }

        await sleep(250);
    }

    throw new Error(`服务健康检查超时: ${baseUrl}/health (${lastError})`);
}

function collectProcessLogs(child, sink, label) {
    if (!child || !child.stdout || !child.stderr) return;

    const append = (prefix) => (chunk) => {
        const text = String(chunk || '').trimEnd();
        if (!text) return;
        sink.push(`[${label}] ${prefix}${text}`);
        if (sink.length > 120) {
            sink.splice(0, sink.length - 120);
        }
    };

    child.stdout.on('data', append(''));
    child.stderr.on('data', append('ERR '));
}

async function startServer(port, envOverrides = {}) {
    const env = {
        ...process.env,
        ...envOverrides,
        PORT: String(port),
    };

    const child = spawn(process.execPath, [SERVER_ENTRY], {
        cwd: ROOT_DIR,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const logs = [];
    collectProcessLogs(child, logs, `server:${port}`);

    const baseUrl = `http://localhost:${port}`;

    try {
        await waitForHealth(baseUrl);
        return {
            child,
            baseUrl,
            logs,
        };
    } catch (err) {
        await stopServer(child);
        const detail = logs.length ? `\n${logs.slice(-20).join('\n')}` : '';
        throw new Error(`服务启动失败: ${err.message}${detail}`);
    }
}

async function stopServer(child) {
    if (!child || child.killed || child.exitCode !== null) {
        return;
    }

    try {
        child.kill('SIGTERM');
    } catch (err) {
        // noop
    }

    await waitChildExit(child, 5000);
}

function runNpmScript(script, envOverrides = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(npmCommand, ['run', script], {
            cwd: ROOT_DIR,
            env: {
                ...process.env,
                ...envOverrides,
            },
            stdio: 'inherit',
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`命令失败: npm run ${script} (exit=${code})`));
        });
    });
}

async function runGate({ script, port, serverEnv = {}, testEnv = {} }) {
    const runStartedAt = Date.now();
    const server = await startServer(port, serverEnv);

    try {
        console.log(`\n[Gate] ${script} -> ${server.baseUrl}`);
        await runNpmScript(script, {
            BASE_URL: server.baseUrl,
            ...testEnv,
        });
        return {
            script,
            baseUrl: server.baseUrl,
            durationMs: Date.now() - runStartedAt,
            status: 'PASS',
        };
    } finally {
        await stopServer(server.child);
    }
}

async function main() {
    console.log('[Gate] Step3-B2 合并门禁开始（fresh server instance）');

    const results = [];

    for (const gate of GATE_LIST) {
        try {
            const result = await runGate(gate);
            results.push(result);
        } catch (err) {
            const failedResult = {
                script: gate.script,
                baseUrl: `http://localhost:${gate.port}`,
                durationMs: 0,
                status: 'FAIL',
                error: err.message,
            };
            results.push(failedResult);

            console.error(`\n[Gate] ${gate.script} 失败: ${err.message}`);
            console.log('\n[Gate] 汇总：');
            results.forEach((item) => {
                const detail = item.status === 'PASS'
                    ? `${item.status} (${formatDuration(item.durationMs)})`
                    : `${item.status} (${item.error})`;
                console.log(`- ${item.script} @ ${item.baseUrl} -> ${detail}`);
            });
            process.exit(1);
            return;
        }
    }

    console.log('\n[Gate] 汇总：');
    results.forEach((item) => {
        console.log(`- ${item.script} @ ${item.baseUrl} -> PASS (${formatDuration(item.durationMs)})`);
    });

    console.log('\n[Gate] Step3-B2 合并门禁通过。');
}

main().catch((err) => {
    console.error(`\n[Gate] 执行失败: ${err.message}`);
    process.exit(1);
});