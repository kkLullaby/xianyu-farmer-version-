#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server.js');
const DB_PATH = path.join(ROOT_DIR, 'data', 'agri.db');
const INIT_PORT = Number(process.env.RELEASE_DRILL_INIT_PORT || 4336);
const HEALTH_PORT = Number(process.env.RELEASE_DRILL_HEALTH_PORT || 4337);

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function collectProcessLogs(child, sink, label) {
    const append = (prefix) => (chunk) => {
        const text = String(chunk || '').trimEnd();
        if (!text) return;
        sink.push(`[${label}] ${prefix}${text}`);
        if (sink.length > 120) {
            sink.splice(0, sink.length - 120);
        }
    };

    if (child.stdout) child.stdout.on('data', append(''));
    if (child.stderr) child.stderr.on('data', append('ERR '));
}

function waitChildExit(child, timeoutMs = 5000) {
    return new Promise((resolve) => {
        if (!child || child.exitCode !== null || child.killed) {
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

async function startServer({ port, args = [] }) {
    const env = {
        ...process.env,
        PORT: String(port),
    };

    const child = spawn(process.execPath, [SERVER_ENTRY, ...args], {
        cwd: ROOT_DIR,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const logs = [];
    collectProcessLogs(child, logs, `server:${port}`);

    const baseUrl = `http://localhost:${port}`;
    try {
        await waitForHealth(baseUrl);
        return { child, logs, baseUrl };
    } catch (err) {
        await stopServer(child);
        const tail = logs.length ? `\n${logs.slice(-20).join('\n')}` : '';
        throw new Error(`服务启动失败(${baseUrl}): ${err.message}${tail}`);
    }
}

async function main() {
    let tempDir = '';
    let backupPath = '';

    console.log('[P6] Release drill started.');

    try {
        if (!fs.existsSync(DB_PATH)) {
            console.log('[P6] DB 不存在，先执行一次初始化。');
            const bootstrap = await startServer({ port: INIT_PORT, args: ['--init'] });
            await stopServer(bootstrap.child);
        }

        assert(fs.existsSync(DB_PATH), `数据库文件不存在: ${DB_PATH}`);

        const beforeHash = sha256(DB_PATH);
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-drill-'));
        backupPath = path.join(tempDir, 'agri.db.bak');
        fs.copyFileSync(DB_PATH, backupPath);

        console.log(`[P6] Backup created: ${backupPath}`);

        console.log('[P6] 执行迁移演练（init + migrations）。');
        const initDrill = await startServer({ port: INIT_PORT, args: ['--init'] });
        await stopServer(initDrill.child);

        assert(fs.existsSync(DB_PATH), '迁移后数据库文件丢失。');
        const afterInitHash = sha256(DB_PATH);

        console.log('[P6] 执行回滚演练（恢复备份）。');
        fs.copyFileSync(backupPath, DB_PATH);
        const afterRollbackHash = sha256(DB_PATH);
        assert(afterRollbackHash === beforeHash, '回滚后数据库哈希不匹配，回滚失败。');

        console.log('[P6] 校验回滚后服务可启动。');
        const runtime = await startServer({ port: HEALTH_PORT });
        try {
            const healthResponse = await fetch(`${runtime.baseUrl}/health`);
            assert(healthResponse.status === 200, `回滚后健康检查失败，HTTP=${healthResponse.status}`);
        } finally {
            await stopServer(runtime.child);
        }

        console.log('[P6] Release drill passed.');
        console.log(
            `[P6] before=${beforeHash.slice(0, 12)}, afterInit=${afterInitHash.slice(0, 12)}, afterRollback=${afterRollbackHash.slice(0, 12)}`
        );
    } finally {
        if (backupPath && fs.existsSync(backupPath) && fs.existsSync(DB_PATH)) {
            // 确保任何异常路径都能恢复到演练前状态。
            fs.copyFileSync(backupPath, DB_PATH);
        }

        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

main().catch((err) => {
    console.error(`[P6] Release drill failed: ${err.message}`);
    process.exit(1);
});
