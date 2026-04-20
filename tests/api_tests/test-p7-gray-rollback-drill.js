#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const CHECKPOINTS = [
    {
        name: '10%',
        scripts: ['test:p0'],
        maxDurationMs: 18000,
    },
    {
        name: '30%',
        scripts: ['test:p2', 'test:p3'],
        maxDurationMs: 26000,
    },
    {
        name: '50%',
        scripts: ['test:p4', 'test:p5'],
        maxDurationMs: 32000,
    },
];

const BASE_PORT = Number(process.env.GRAY_DRILL_BASE_PORT || 4340);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
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

    throw new Error(`健康检查超时: ${baseUrl}/health (${lastError})`);
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
        return { child, baseUrl, logs };
    } catch (err) {
        await stopServer(child);
        const detail = logs.length ? `\n${logs.slice(-20).join('\n')}` : '';
        throw new Error(`服务启动失败(${baseUrl}): ${err.message}${detail}`);
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

        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`命令失败: npm run ${script} (exit=${code})`));
        });
    });
}

function serverEnvForScript(script) {
    if (script !== 'test:p5') return {};
    return {
        SECURITY_ALERT_AUTHN_THRESHOLD: '5',
        SECURITY_ALERT_AUTHZ_THRESHOLD: '4',
        SECURITY_ALERT_RATE_LIMIT_THRESHOLD: '2',
        SECURITY_ALERT_WINDOW_MINUTES: '15',
    };
}

async function runScriptWithFreshServer(script, port) {
    const runStartedAt = Date.now();
    const server = await startServer(port, serverEnvForScript(script));

    try {
        console.log(`\n[P7] ${script} @ ${server.baseUrl}`);
        await runNpmScript(script, { BASE_URL: server.baseUrl });
        return {
            script,
            status: 'PASS',
            durationMs: Date.now() - runStartedAt,
        };
    } finally {
        await stopServer(server.child);
    }
}

async function runCheckpoint(checkpoint, startPort) {
    console.log(`\n[P7] 灰度检查点 ${checkpoint.name} 开始`);

    const startedAt = Date.now();
    const scriptResults = [];

    for (let i = 0; i < checkpoint.scripts.length; i += 1) {
        const script = checkpoint.scripts[i];
        const port = startPort + i;
        const result = await runScriptWithFreshServer(script, port);
        scriptResults.push(result);
    }

    const totalDurationMs = Date.now() - startedAt;
    const timeoutExceeded = totalDurationMs > checkpoint.maxDurationMs;

    return {
        name: checkpoint.name,
        scripts: checkpoint.scripts,
        scriptResults,
        totalDurationMs,
        maxDurationMs: checkpoint.maxDurationMs,
        status: timeoutExceeded ? 'FAIL' : 'PASS',
        failReason: timeoutExceeded
            ? `checkpoint-timeout(${formatDuration(totalDurationMs)} > ${formatDuration(checkpoint.maxDurationMs)})`
            : '',
    };
}

async function runRollbackDrill(triggerReason) {
    const startedAt = Date.now();

    console.log('\n[P7] 触发应急回滚演练。');
    console.log(`[P7] 触发原因: ${triggerReason}`);
    console.log('[P7] 决策链路: 值班负责人 -> 开发负责人 -> 执行回滚命令');

    await runNpmScript('test:release-drill');

    return {
        status: 'PASS',
        triggerReason,
        durationMs: Date.now() - startedAt,
    };
}

async function main() {
    console.log('[P7] Step5-B2 灰度与应急流程联合演练开始。');

    const checkpointResults = [];
    let currentPort = BASE_PORT;
    let rollbackTrigger = '';

    for (const checkpoint of CHECKPOINTS) {
        try {
            const result = await runCheckpoint(checkpoint, currentPort);
            checkpointResults.push(result);
            currentPort += 10;

            if (result.status !== 'PASS') {
                rollbackTrigger = `${checkpoint.name}-${result.failReason}`;
                break;
            }
        } catch (err) {
            rollbackTrigger = `${checkpoint.name}-script-failed(${err.message})`;
            checkpointResults.push({
                name: checkpoint.name,
                scripts: checkpoint.scripts,
                status: 'FAIL',
                failReason: err.message,
                totalDurationMs: 0,
                maxDurationMs: checkpoint.maxDurationMs,
                scriptResults: [],
            });
            break;
        }
    }

    const rollbackReason = rollbackTrigger || 'scheduled-drill-after-50%';
    const rollbackResult = await runRollbackDrill(rollbackReason);

    console.log('\n[P7] 演练汇总：');
    checkpointResults.forEach((item) => {
        const detail = item.status === 'PASS'
            ? `PASS (${formatDuration(item.totalDurationMs)} <= ${formatDuration(item.maxDurationMs)})`
            : `FAIL (${item.failReason})`;
        console.log(`- checkpoint ${item.name} -> ${detail}`);

        (item.scriptResults || []).forEach((scriptResult) => {
            console.log(`  - ${scriptResult.script}: ${scriptResult.status} (${formatDuration(scriptResult.durationMs)})`);
        });
    });

    console.log(`- rollback -> ${rollbackResult.status} (${formatDuration(rollbackResult.durationMs)}) reason=${rollbackResult.triggerReason}`);

    const allCheckpointPass = checkpointResults.length === CHECKPOINTS.length && checkpointResults.every((item) => item.status === 'PASS');
    if (!allCheckpointPass) {
        throw new Error('灰度检查点存在失败，已执行回滚演练，需人工复盘后再继续放量。');
    }

    console.log('\n[P7] Step5-B2 drill passed.');
}

main().catch((err) => {
    console.error(`\n[P7] Step5-B2 drill failed: ${err.message}`);
    process.exit(1);
});
