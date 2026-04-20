#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const PORT = Number(process.env.P8_PORT || 4362);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForHealth(baseUrl, timeoutMs = 20000) {
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

async function main() {
    const baseUrl = `http://localhost:${PORT}`;
    const server = spawn(process.execPath, [SERVER_ENTRY], {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            PORT: String(PORT),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const logs = [];
    const appendLog = (prefix) => (chunk) => {
        const text = String(chunk || '').trimEnd();
        if (!text) return;
        logs.push(`[p8-server] ${prefix}${text}`);
        if (logs.length > 80) logs.splice(0, logs.length - 80);
    };
    server.stdout.on('data', appendLog(''));
    server.stderr.on('data', appendLog('ERR '));

    try {
        await waitForHealth(baseUrl);
        await runNpmScript('test:p8', { BASE_URL: baseUrl });
        console.log(`\n[P8-Runner] Completed with fresh server ${baseUrl}`);
    } catch (err) {
        const tail = logs.length ? `\n${logs.slice(-20).join('\n')}` : '';
        throw new Error(`${err.message}${tail}`);
    } finally {
        await stopServer(server);
    }
}

main().catch((err) => {
    console.error(`\n[P8-Runner] FAILED: ${err.message}`);
    process.exit(1);
});
