const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpSms, getSmsRuntimeStatus, ensureSmsRuntimeReady } = require('./smsClient');
const multer = require('multer');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET 环境变量未配置，生产环境禁止启动。');
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('[Security] JWT_SECRET 未配置，当前使用进程级临时密钥（重启后失效）。');
}

const smsRuntimeBootStatus = ensureSmsRuntimeReady(process.env);
if (smsRuntimeBootStatus.mockMode) {
    console.warn('[SMS] 当前使用 Mock 短信通道（非生产环境）。');
}

const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || '';
const LOG_DIR = path.join(__dirname, 'logs');
const SECURITY_AUDIT_LOG_PATH = path.join(LOG_DIR, 'security-audit.log');
const ENABLE_RUNTIME_DELAY_SIMULATION = process.env.NODE_ENV !== 'production';
const RUNTIME_DELAY_MAX_MS = 5000;

function parseRuntimeDelayMs(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return Math.min(RUNTIME_DELAY_MAX_MS, Math.floor(parsed));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveAuditLogMaxMb(value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0.01 && parsed <= 1024) {
        return parsed;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        console.warn(`[Security] SECURITY_AUDIT_LOG_MAX_MB 配置无效（${value}），已回退默认值 20MB`);
    }
    return 20;
}

function resolveAuditLogMaxFiles(value) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 30) {
        return parsed;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        console.warn(`[Security] SECURITY_AUDIT_LOG_MAX_FILES 配置无效（${value}），已回退默认值 7`);
    }
    return 7;
}

const SECURITY_AUDIT_LOG_MAX_MB = resolveAuditLogMaxMb(process.env.SECURITY_AUDIT_LOG_MAX_MB);
const SECURITY_AUDIT_LOG_MAX_BYTES = Math.max(1, Math.floor(SECURITY_AUDIT_LOG_MAX_MB * 1024 * 1024));
const SECURITY_AUDIT_LOG_MAX_FILES = resolveAuditLogMaxFiles(process.env.SECURITY_AUDIT_LOG_MAX_FILES);

function resolveAlertWindowMinutes(value) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 120) {
        return parsed;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        console.warn(`[Observability] SECURITY_ALERT_WINDOW_MINUTES 配置无效（${value}），已回退默认值 15`);
    }
    return 15;
}

function resolveAlertThreshold(value, fallback, envName) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000) {
        return parsed;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        console.warn(`[Observability] ${envName} 配置无效（${value}），已回退默认值 ${fallback}`);
    }
    return fallback;
}

const SECURITY_ALERT_WINDOW_MINUTES = resolveAlertWindowMinutes(process.env.SECURITY_ALERT_WINDOW_MINUTES);
const SECURITY_ALERT_AUTHN_THRESHOLD = resolveAlertThreshold(
    process.env.SECURITY_ALERT_AUTHN_THRESHOLD,
    12,
    'SECURITY_ALERT_AUTHN_THRESHOLD'
);
const SECURITY_ALERT_AUTHZ_THRESHOLD = resolveAlertThreshold(
    process.env.SECURITY_ALERT_AUTHZ_THRESHOLD,
    8,
    'SECURITY_ALERT_AUTHZ_THRESHOLD'
);
const SECURITY_ALERT_RATE_LIMIT_THRESHOLD = resolveAlertThreshold(
    process.env.SECURITY_ALERT_RATE_LIMIT_THRESHOLD,
    3,
    'SECURITY_ALERT_RATE_LIMIT_THRESHOLD'
);
const SECURITY_ALERT_SCAN_ROLLED_FILES = 1;

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.amap.com https://webapi.amap.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.amap.com https://restapi.amap.com",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const REFERRER_POLICY = 'strict-origin-when-cross-origin';
const PERMISSIONS_POLICY = 'geolocation=(self), camera=(), microphone=()';

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || (req.socket && req.socket.remoteAddress) || '';
}

function defaultAuditReason(statusCode) {
    if (statusCode === 401) return 'AUTHENTICATION_FAILED';
    if (statusCode === 403) return 'AUTHORIZATION_DENIED';
    if (statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
    return 'SECURITY_EVENT';
}

function safeAuditReason(reason, statusCode) {
    const normalized = String(reason || '').trim();
    if (!normalized) return defaultAuditReason(statusCode);
    return normalized.slice(0, 64).replace(/[^A-Z0-9_\-]/gi, '_');
}

function rotateSecurityAuditLogsIfNeeded() {
    if (!fs.existsSync(SECURITY_AUDIT_LOG_PATH)) return;

    const stat = fs.statSync(SECURITY_AUDIT_LOG_PATH);
    if (stat.size < SECURITY_AUDIT_LOG_MAX_BYTES) return;

    const maxFiles = SECURITY_AUDIT_LOG_MAX_FILES;
    const oldest = `${SECURITY_AUDIT_LOG_PATH}.${maxFiles}`;
    if (fs.existsSync(oldest)) {
        fs.unlinkSync(oldest);
    }

    for (let i = maxFiles - 1; i >= 1; i -= 1) {
        const src = `${SECURITY_AUDIT_LOG_PATH}.${i}`;
        const dest = `${SECURITY_AUDIT_LOG_PATH}.${i + 1}`;
        if (fs.existsSync(src)) {
            fs.renameSync(src, dest);
        }
    }

    fs.renameSync(SECURITY_AUDIT_LOG_PATH, `${SECURITY_AUDIT_LOG_PATH}.1`);
}

function writeSecurityAuditLog(entry) {
    try {
        ensureLogDir();
        rotateSecurityAuditLogsIfNeeded();
        fs.appendFileSync(SECURITY_AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (err) {
        console.warn('[SecurityAudit] 写入失败:', err.message);
    }
}

function readSecurityAuditEventsFromFile(filePath) {
    if (!fs.existsSync(filePath)) return [];

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content) return [];

        return content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return null;
                }
            })
            .filter(Boolean);
    } catch (err) {
        console.warn('[Observability] 读取审计日志失败:', err.message);
        return [];
    }
}

function collectRecentSecurityAuditStats(windowMinutes) {
    const nowMs = Date.now();
    const windowMs = Math.max(1, Number(windowMinutes || 1)) * 60 * 1000;
    const filePaths = [SECURITY_AUDIT_LOG_PATH];

    for (let i = 1; i <= SECURITY_ALERT_SCAN_ROLLED_FILES; i += 1) {
        filePaths.push(`${SECURITY_AUDIT_LOG_PATH}.${i}`);
    }

    const stats = {
        total: 0,
        status_401: 0,
        status_403: 0,
        status_429: 0,
    };

    for (const filePath of filePaths) {
        const events = readSecurityAuditEventsFromFile(filePath);
        for (const event of events) {
            const tsMs = Date.parse(String(event.ts || ''));
            if (!Number.isFinite(tsMs)) continue;
            if (nowMs - tsMs > windowMs) continue;

            stats.total += 1;
            if (Number(event.status) === 401) stats.status_401 += 1;
            if (Number(event.status) === 403) stats.status_403 += 1;
            if (Number(event.status) === 429) stats.status_429 += 1;
        }
    }

    return stats;
}

function buildSecurityAlertSnapshot(stats) {
    const alerts = [];

    if (Number(stats.status_429 || 0) >= SECURITY_ALERT_RATE_LIMIT_THRESHOLD) {
        alerts.push({
            code: 'SECURITY_RATE_LIMIT_SPIKE',
            level: 'warning',
            metric: 'status_429',
            count: Number(stats.status_429 || 0),
            threshold: SECURITY_ALERT_RATE_LIMIT_THRESHOLD,
        });
    }

    if (Number(stats.status_401 || 0) >= SECURITY_ALERT_AUTHN_THRESHOLD) {
        alerts.push({
            code: 'SECURITY_AUTHN_DENIED_SPIKE',
            level: 'warning',
            metric: 'status_401',
            count: Number(stats.status_401 || 0),
            threshold: SECURITY_ALERT_AUTHN_THRESHOLD,
        });
    }

    if (Number(stats.status_403 || 0) >= SECURITY_ALERT_AUTHZ_THRESHOLD) {
        alerts.push({
            code: 'SECURITY_AUTHZ_DENIED_SPIKE',
            level: 'warning',
            metric: 'status_403',
            count: Number(stats.status_403 || 0),
            threshold: SECURITY_ALERT_AUTHZ_THRESHOLD,
        });
    }

    return alerts;
}

function resolveBcryptRounds(value) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 8 && parsed <= 14) {
        return parsed;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        console.warn(`[Security] BCRYPT_ROUNDS 配置无效（${value}），已回退默认值 10`);
    }
    return 10;
}

const BCRYPT_ROUNDS = resolveBcryptRounds(process.env.BCRYPT_ROUNDS);

const DB_PATH = path.join(__dirname, 'data', 'agri.db');
const SCHEMA_SQL = path.join(__dirname, 'db', 'schema.sql');

// SEC-007: OTP store moved to database (see db schema for otp_store table)
// const otpStore = new Map();

// Validation helpers
function isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

function isValidPassword(pwd) {
    return typeof pwd === 'string' && pwd.length >= 8 && pwd.length <= 16 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
}

function ensureDataDir() {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

function openDb() {
    ensureDataDir();
    return new sqlite3.Database(DB_PATH);
}

function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function getActorId(req) {
    return toPositiveInt(req && req.user ? req.user.id : null);
}

function isAdmin(req) {
    return !!(req && req.user && req.user.role === 'admin');
}

function ensureSelfOrAdmin(req, targetId) {
    if (isAdmin(req)) return true;
    const actorId = getActorId(req);
    const parsedTarget = toPositiveInt(targetId);
    return !!actorId && !!parsedTarget && actorId === parsedTarget;
}

function maskPhone(phone) {
    const value = String(phone || '').trim();
    if (!value) return '';
    return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function isTargetUnderActiveArbitration(db, targetType, targetId, callback) {
    const parsedTargetId = toPositiveInt(targetId);
    if (!parsedTargetId || !targetType) return callback(null, false);

    db.get(
        `SELECT id FROM arbitration_requests
         WHERE order_type = ?
           AND order_id = ?
           AND status IN ('pending', 'investigating')
         LIMIT 1`,
        [targetType, parsedTargetId],
        (err, row) => {
            if (err) return callback(err, false);
            return callback(null, !!row);
        }
    );
}

function isRecyclerActor(req) {
    return !!(req && req.user && (req.user.role === 'recycler' || req.user.role === 'merchant'));
}

function isProcessorActor(req) {
    return !!(req && req.user && req.user.role === 'processor');
}

function requireAdmin(req, res) {
    if (!isAdmin(req)) {
        res.locals.securityAuditReason = 'ADMIN_ROLE_REQUIRED';
        res.status(403).json({ error: '仅管理员可操作' });
        return false;
    }
    return true;
}

function adminOnly(req, res, next) {
    if (!requireAdmin(req, res)) return;
    return next();
}

function canManageIntentionTarget(db, targetType, targetId, actorId, callback) {
    const parsedTargetId = toPositiveInt(targetId);
    if (!parsedTargetId) return callback(null, false);

    let sql = '';
    let evaluator = () => false;

    if (targetType === 'farmer_report') {
        sql = `SELECT farmer_id, recycler_id FROM farmer_reports WHERE id = ?`;
        evaluator = (row) => !!row && (toPositiveInt(row.farmer_id) === actorId || toPositiveInt(row.recycler_id) === actorId);
    } else if (targetType === 'recycler_request') {
        sql = `SELECT recycler_id FROM recycler_requests WHERE id = ?`;
        evaluator = (row) => !!row && toPositiveInt(row.recycler_id) === actorId;
    } else if (targetType === 'processor_request') {
        sql = `SELECT processor_id, recycler_id FROM processor_requests WHERE id = ?`;
        evaluator = (row) => !!row && (toPositiveInt(row.processor_id) === actorId || toPositiveInt(row.recycler_id) === actorId);
    } else {
        return callback(null, false);
    }

    db.get(sql, [parsedTargetId], (err, row) => {
        if (err) return callback(err, false);
        return callback(null, evaluator(row));
    });
}

function normalizeRoleInput(role) {
    return String(role || '').trim().toLowerCase();
}

function isPrivilegedRole(role) {
    return normalizeRoleInput(role) === 'admin';
}

function runSqlFromFile(db, filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function initDb() {
    const db = openDb();
    try {
        await runSqlFromFile(db, SCHEMA_SQL);

        // Insert default roles
        await new Promise((res, rej) => {
            const stmt = db.prepare(`INSERT OR IGNORE INTO roles(name, description) VALUES(?, ?)`);
            const roles = [
                ['admin', '系统管理员'],
                ['farmer', '农户'],
                ['recycler', '回收商'],
                ['processor', '果肉处理商']
            ];
            let i = 0;
            roles.forEach(r => {
                stmt.run(r[0], r[1], (err) => {
                    if (err) console.error('seed role error', err);
                    i++;
                    if (i === roles.length) { stmt.finalize(); res(); }
                });
            });
        });

        // Insert sample locations (check first to avoid duplicates)
        const locCount = await new Promise((res, rej) => {
            db.get(`SELECT COUNT(*) as cnt FROM locations`, [], (err, row) => {
                if (err) return rej(err);
                res(row.cnt);
            });
        });

        if (locCount === 0) {
            await new Promise((res, rej) => {
                const stmt = db.prepare(`INSERT INTO locations(name,address,latitude,longitude,type) VALUES(?,?,?,?,?)`);
                const locs = [
                    ['第一无害化处理厂','陈皮镇处理厂','23.12345', '113.12345','processing_plant'],
                    ['三江镇集散中心','三江镇','23.22345', '113.22345','collection_center'],
                    ['双水镇处理点','双水镇','23.32345', '113.32345','processing_plant']
                ];
                let i = 0;
                locs.forEach(l => {
                    stmt.run(l[0], l[1], l[2], l[3], l[4], (err) => {
                        if (err) console.error('seed location error', err);
                        i++;
                        if (i === locs.length) { stmt.finalize(); res(); }
                    });
                });
            });
        }

        // Insert sample users with hashed passwords
        const users = [
            { username: 'admin001', password: 'admin123', role: 'admin', full_name: '系统管理员' },
            { username: 'farmer001', password: 'farmer123', role: 'farmer', full_name: '李农户' },
            { username: 'recycler001', password: 'recycler123', role: 'recycler', full_name: '王回收商' },
            { username: 'processor001', password: 'processor123', role: 'processor', full_name: '赵处理商' }
        ];

        for (const u of users) {
            // get role id
            const roleId = await new Promise((res, rej) => {
                db.get(`SELECT id FROM roles WHERE name = ?`, [u.role], (err, row) => {
                    if (err) return rej(err);
                    res(row ? row.id : null);
                });
            });

            const hash = bcrypt.hashSync(u.password, BCRYPT_ROUNDS);
            await new Promise((res, rej) => {
                db.run(`INSERT OR IGNORE INTO users(username,password_hash,role_id,full_name) VALUES(?,?,?,?)`, [u.username, hash, roleId, u.full_name], (err) => {
                    if (err) console.error('seed user error', err);
                    res();
                });
            });
        }

        // Insert a sample order (check first)
        const orderCount = await new Promise((res, rej) => {
            db.get(`SELECT COUNT(*) as cnt FROM orders`, [], (err, row) => {
                if (err) return rej(err);
                res(row.cnt);
            });
        });

        if (orderCount === 0) {
            await new Promise((res, rej) => {
                db.get(`SELECT id FROM users WHERE username = ?`, ['farmer001'], (err, farmerRow) => {
                    db.get(`SELECT id FROM locations LIMIT 1`, [], (err2, locRow) => {
                        if (farmerRow && locRow) {
                            const orderNo = 'ORD-' + Date.now();
                            db.run(`INSERT INTO orders(order_no, farmer_id, location_id, weight_kg, price_per_kg, total_price, status) VALUES(?,?,?,?,?,?,?)`,
                                [orderNo, farmerRow.id, locRow.id, 120.5, 0.5, 60.25, 'pending'], (err3) => {
                                    if (err3) console.error('seed order error', err3);
                                    res();
                                });
                        } else res();
                    });
                });
            });
        }

        db.close();
        console.log('DB initialized and seeded.');
    } catch (e) {
        db.close();
        throw e;
    }
}

// --------- Express API ---------
const app = express();
const server = http.createServer(app);

// SEC-006: Configure CORS with whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4000,http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without origin (like mobile apps or curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// SEC-014: Add security headers middleware
app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Mitigate XSS/data exfiltration with baseline CSP policy.
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    res.setHeader('Referrer-Policy', REFERRER_POLICY);
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    // Disable client-side caching for sensitive content
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

    // HSTS should only be sent on HTTPS requests.
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    if (req.secure || forwardedProto === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
});

// 统一响应格式中间件
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        // 如果已经是标准格式，直接返回
        if (body && typeof body === 'object' && 'code' in body && 'msg' in body && 'data' in body) {
            return originalJson.call(this, body);
        }
        
        let code = res.statusCode || 200;
        let msg = 'success';
        let data = body;

        if (code >= 400) {
            msg = (body && (body.error || body.message)) || 'error';
            data = null;
        } else if (body && body.error) {
            code = 400;
            msg = body.error;
            data = null;
            res.status(code);
        }

        return originalJson.call(this, {
            code,
            msg,
            data
        });
    };
    next();
});

// SEC-008: Rate limiting for sensitive endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: '登录尝试过多，请在 15 分钟后重试',
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: '注册过于频繁，请在 1 小时后重试',
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 OTP requests per minute per phone
    message: '请求过于频繁，请在 1 分钟后重试',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body.phone || rateLimit.ipKeyGenerator(req.ip), // Rate limit by phone number
});

// 审计中间件：统一记录 /api 下 401/403/429 安全事件。
app.use('/api', (req, res, next) => {
    const startedAt = Date.now();
    let emitted = false;

    const emit = () => {
        if (emitted) return;
        emitted = true;

        const statusCode = Number(res.statusCode || 0);
        if (![401, 403, 429].includes(statusCode)) return;

        const actorId = getActorId(req);
        const role = req && req.user && req.user.role ? String(req.user.role) : 'anonymous';
        const userAgent = String(req.headers['user-agent'] || '');
        const reason = safeAuditReason(res.locals.securityAuditReason, statusCode);
        const eventType = statusCode === 401
            ? 'AUTHN_DENIED'
            : (statusCode === 403 ? 'AUTHZ_DENIED' : 'RATE_LIMITED');

        writeSecurityAuditLog({
            ts: new Date().toISOString(),
            event_type: eventType,
            reason,
            status: statusCode,
            method: req.method,
            path: req.originalUrl || req.url,
            actor_id: actorId || null,
            role,
            ip: getClientIp(req),
            user_agent_hash: userAgent ? crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 16) : '',
            duration_ms: Math.max(0, Date.now() - startedAt),
        });
    };

    res.on('finish', emit);
    res.on('close', emit);
    next();
});

// JWT 鉴权中间件
// ⚠️ 注意：此中间件通过 app.use('/api', ...) 挂载，
//    Express 会自动剥离 /api 前缀，所以 req.path 里不含 /api！
//    例如：请求 /api/login → 中间件内 req.path = '/login'
const authMiddleware = (req, res, next) => {
    // 排除不需要鉴权的路由（路径已被 Express 剥离 /api 前缀！）
    const publicRoutes = ['/health', '/init', '/auth/request-otp', '/auth/register-phone', '/register', '/login', '/config/amap'];
    // CMS 内容读接口（首页展示，游客可见）
    const publicPrefixes = ['/cms/', '/farmer-nearby', '/config/'];
    const authHeader = req.headers.authorization;
    if (
        publicRoutes.includes(req.path) ||
        (req.method === 'GET' && publicPrefixes.some(p => req.path.startsWith(p)))
    ) {
        // 公共读接口允许匿名访问；若携带 token 则解析用户上下文，供路由做细粒度授权。
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
            } catch (err) {
                // 公共接口下忽略无效 token，保持匿名访问行为。
            }
        }
        return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.locals.securityAuditReason = 'AUTH_HEADER_MISSING';
        console.warn(`[Auth] 401 拒绝: ${req.method} ${req.originalUrl} (req.path=${req.path}, 无 Bearer Token)`);
        return res.status(401).json({ error: '未授权，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.locals.securityAuditReason = 'AUTH_TOKEN_INVALID';
        console.warn(`[Auth] 401 Token无效: ${req.method} ${req.originalUrl}`);
        return res.status(401).json({ error: 'Token 无效或已过期' });
    }
};

app.use('/api', authMiddleware);

// 配置文件上传
const uploadDir = path.join(__dirname, 'uploads', 'arbitration');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|mp4|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持图片、PDF、视频和文档文件'));
        }
    }
});

function getFileExtension(filename) {
    return path.extname(filename || '').toLowerCase().replace('.', '');
}

function startsWithSignature(buffer, signature, offset = 0) {
    if (!buffer || buffer.length < offset + signature.length) return false;
    for (let i = 0; i < signature.length; i += 1) {
        if (buffer[offset + i] !== signature[i]) return false;
    }
    return true;
}

function isValidMagicByExt(buffer, ext) {
    if (!buffer || buffer.length === 0) return false;

    if (ext === 'jpg' || ext === 'jpeg') {
        return startsWithSignature(buffer, [0xff, 0xd8, 0xff]);
    }
    if (ext === 'png') {
        return startsWithSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    }
    if (ext === 'pdf') {
        return startsWithSignature(buffer, [0x25, 0x50, 0x44, 0x46]);
    }
    if (ext === 'doc') {
        return startsWithSignature(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    }
    if (ext === 'docx') {
        return startsWithSignature(buffer, [0x50, 0x4b, 0x03, 0x04]);
    }
    if (ext === 'mp4') {
        return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    }
    if (ext === 'avi') {
        return buffer.length >= 12
            && buffer.toString('ascii', 0, 4) === 'RIFF'
            && buffer.toString('ascii', 8, 12) === 'AVI ';
    }
    return false;
}

function deleteFileQuietly(filePath) {
    if (!filePath) return;
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn('删除非法上传文件失败:', err.message);
    }
}

function createMagicValidator(allowedExts) {
    return (req, res, next) => {
        const files = [];
        if (req.file) files.push(req.file);
        if (Array.isArray(req.files)) files.push(...req.files);
        if (req.files && !Array.isArray(req.files)) {
            Object.values(req.files).forEach((entry) => {
                if (Array.isArray(entry)) files.push(...entry);
            });
        }

        if (files.length === 0) return next();

        for (const file of files) {
            const ext = getFileExtension(file.originalname || file.filename);
            if (!allowedExts.includes(ext)) {
                files.forEach((f) => deleteFileQuietly(f.path));
                return res.status(400).json({
                    success: false,
                    error: `不支持的文件类型: ${ext || 'unknown'}`,
                });
            }

            let fileHead;
            try {
                const fd = fs.openSync(file.path, 'r');
                const buf = Buffer.alloc(32);
                const bytesRead = fs.readSync(fd, buf, 0, 32, 0);
                fs.closeSync(fd);
                fileHead = buf.slice(0, bytesRead);
            } catch (err) {
                files.forEach((f) => deleteFileQuietly(f.path));
                return res.status(400).json({
                    success: false,
                    error: '上传文件读取失败，请重试',
                });
            }

            if (!isValidMagicByExt(fileHead, ext)) {
                files.forEach((f) => deleteFileQuietly(f.path));
                return res.status(400).json({
                    success: false,
                    error: '文件内容与扩展名不匹配，已拒绝上传',
                });
            }
        }

        return next();
    };
}

const validateArbitrationUploadMagic = createMagicValidator(['jpeg', 'jpg', 'png', 'pdf', 'doc', 'docx', 'mp4', 'avi']);
const validateCmsUploadMagic = createMagicValidator(['jpeg', 'jpg', 'png']);

function getBearerTokenFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

function normalizeArbitrationFilePath(candidate) {
    const marker = '/uploads/arbitration/';
    const value = String(candidate || '').trim().replace(/\\/g, '/');
    if (!value) return '';

    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) return '';

    const tail = value.slice(markerIndex + marker.length);
    const filename = path.basename(tail);
    if (!filename || filename === '.' || filename === '..') return '';

    return `${marker}${filename}`;
}

function parseJsonArraySafely(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'string') return [];

    const text = raw.trim();
    if (!text) return [];

    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function extractArbitrationFilePath(entry) {
    if (!entry) return '';

    if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (!trimmed) return '';

        try {
            const parsed = JSON.parse(trimmed);
            return extractArbitrationFilePath(parsed);
        } catch (err) {
            return normalizeArbitrationFilePath(trimmed);
        }
    }

    if (Array.isArray(entry)) {
        for (const item of entry) {
            const filePath = extractArbitrationFilePath(item);
            if (filePath) return filePath;
        }
        return '';
    }

    if (typeof entry === 'object') {
        const candidates = [
            entry.path,
            entry.url,
            entry.filePath,
            entry.filename ? `/uploads/arbitration/${entry.filename}` : '',
        ];

        for (const candidate of candidates) {
            const normalized = normalizeArbitrationFilePath(candidate);
            if (normalized) return normalized;
        }
    }

    return '';
}

function collectArbitrationFileRefs(source = {}) {
    const refs = [];
    const seen = new Set();

    const pushRef = (fileGroup, entry) => {
        const filePath = extractArbitrationFilePath(entry);
        if (!filePath) return;

        const key = `${fileGroup}|${filePath}`;
        if (seen.has(key)) return;

        seen.add(key);
        refs.push({ file_group: fileGroup, file_path: filePath });
    };

    const parseEvidenceGroup = (fileGroup, raw) => {
        const list = Array.isArray(raw) ? raw : parseJsonArraySafely(raw);
        list.forEach((entry) => pushRef(fileGroup, entry));
    };

    parseEvidenceGroup('evidence_trade', source.evidence_trade);
    parseEvidenceGroup('evidence_material', source.evidence_material);
    parseEvidenceGroup('evidence_payment', source.evidence_payment);
    parseEvidenceGroup('evidence_communication', source.evidence_communication);
    parseEvidenceGroup('evidence_other', source.evidence_other);
    pushRef('penalty_proof', source.penalty_proof);

    return refs;
}

function saveArbitrationFileRefs(db, arbitrationId, refs, callback) {
    const parsedArbitrationId = toPositiveInt(arbitrationId);
    if (!parsedArbitrationId) {
        return callback(new Error('仲裁ID无效'));
    }

    const seen = new Set();
    const normalizedRefs = [];

    (Array.isArray(refs) ? refs : []).forEach((ref) => {
        const fileGroup = String(ref && ref.file_group ? ref.file_group : '').trim();
        const filePath = normalizeArbitrationFilePath(ref && ref.file_path ? ref.file_path : '');
        if (!fileGroup || !filePath) return;

        const key = `${fileGroup}|${filePath}`;
        if (seen.has(key)) return;

        seen.add(key);
        normalizedRefs.push({ file_group: fileGroup, file_path: filePath });
    });

    if (normalizedRefs.length === 0) return callback(null);

    let idx = 0;
    const insertNext = () => {
        if (idx >= normalizedRefs.length) return callback(null);

        const ref = normalizedRefs[idx++];
        db.run(
            `INSERT OR IGNORE INTO arbitration_file_refs (arbitration_id, file_group, file_path)
             VALUES (?, ?, ?)`,
            [parsedArbitrationId, ref.file_group, ref.file_path],
            (err) => {
                if (err) return callback(err);
                return insertNext();
            }
        );
    };

    insertNext();
}

function verifyArbitrationFileAccess(req, res, next) {
    const rawName = String(req.params.filename || '').trim();
    const safeName = path.basename(rawName);
    if (!safeName || safeName !== rawName) {
        return res.status(400).json({ error: '非法文件名' });
    }

    const token = getBearerTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: '访问文件需要登录' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Token 无效或已过期' });
    }

    const actorId = toPositiveInt(decoded.id);
    if (!actorId) {
        return res.status(401).json({ error: '无效用户身份' });
    }

    const fullPath = path.join(uploadDir, safeName);
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件不存在' });
    }

    if (decoded.role === 'admin') {
        req.secureFilePath = fullPath;
        return next();
    }

        const fileRef = `/uploads/arbitration/${safeName}`;
    const db = openDb();
    db.get(
                `SELECT ar.id
                 FROM arbitration_file_refs afr
                 JOIN arbitration_requests ar ON ar.id = afr.arbitration_id
                 WHERE afr.file_path = ?
                     AND (ar.applicant_id = ? OR ar.respondent_id = ?)
         LIMIT 1`,
                [fileRef, actorId, actorId],
        (err, row) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(403).json({ error: '无权访问该文件' });
            req.secureFilePath = fullPath;
            return next();
        }
    );
}

// 仅公开白名单根资源，避免暴露 server/db/docs 等敏感目录。
const PUBLIC_ROOT_FILE_MAP = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/farmer-nearby-recyclers': 'farmer-nearby-recyclers.html',
    '/farmer-nearby-recyclers.html': 'farmer-nearby-recyclers.html',
    '/privacy-policy.html': 'privacy-policy.html',
    '/service-agreement.html': 'service-agreement.html',
    '/auth.js': 'auth.js',
    '/main_code.js': 'main_code.js',
    '/userProfile.js': 'userProfile.js',
};

app.get(Object.keys(PUBLIC_ROOT_FILE_MAP), (req, res) => {
    const mappedFile = PUBLIC_ROOT_FILE_MAP[req.path];
    if (!mappedFile) {
        return res.status(404).send('Not Found');
    }
    return res.sendFile(path.join(__dirname, mappedFile));
});

// 仲裁证据文件必须通过 token + 归属校验后访问。
// 路由需在静态资源中间件之前，防止被静态直出绕过。
app.get('/uploads/arbitration/:filename', verifyArbitrationFileAccess, (req, res) => {
    return res.sendFile(req.secureFilePath);
});

// 仅公开构建产物与 CMS 素材，不公开项目根目录。
app.use('/dist', express.static(path.join(__dirname, 'dist'), {
    dotfiles: 'deny',
}));
app.use('/uploads/cms', express.static(path.join(__dirname, 'uploads', 'cms'), {
    dotfiles: 'deny',
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/config/amap', (req, res) => {
    const forceUnavailable = ENABLE_RUNTIME_DELAY_SIMULATION
        && String(req.query.force_unavailable || '').trim() === '1';

    if (forceUnavailable || !AMAP_WEB_KEY) {
        return res.status(503).json({
            code: 503,
            msg: '地图服务未配置，请联系管理员',
            data: {
                error_code: 'AMAP_UNAVAILABLE',
                reason: forceUnavailable ? 'FORCED_DEPENDENCY_UNAVAILABLE' : 'AMAP_KEY_NOT_CONFIGURED',
                degrade: {
                    fallback: 'manual-address',
                    message: '地图服务暂不可用，请切换文字地址输入。',
                },
            },
        });
    }
    return res.json({
        key: AMAP_WEB_KEY,
        version: '2.0',
        plugins: ['AMap.Driving'],
    });
});

app.get('/api/me', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) {
        return res.status(401).json({ error: '未授权，请先登录' });
    }

    const db = openDb();
    db.get(
        `SELECT u.id, u.username, u.phone, u.full_name, r.name AS role
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?
         LIMIT 1`,
        [actorId],
        (err, row) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: '用户不存在' });
            return res.json(row);
        }
    );
});

// Admin user list (支持关键词/角色分页)
app.get('/api/admin/users', adminOnly, (req, res) => {
    const keyword = String(req.query.keyword || '').trim();
    const requestedRole = String(req.query.role || 'all').trim().toLowerCase();
    const roleFilter = requestedRole === 'merchant' ? 'recycler' : requestedRole;
    const page = Math.max(1, toPositiveInt(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, toPositiveInt(req.query.page_size) || 50));
    const offset = (page - 1) * pageSize;

    const where = [];
    const whereParams = [];

    if (keyword) {
        const like = `%${keyword}%`;
        where.push('(u.username LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ? OR IFNULL(u.email, "") LIKE ?)');
        whereParams.push(like, like, like, like);
    }

    if (roleFilter && roleFilter !== 'all') {
        where.push('r.name = ?');
        whereParams.push(roleFilter);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
        SELECT COUNT(1) AS total
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ${whereSql}
    `;

    const listSql = `
        SELECT
            u.id,
            u.username,
            u.full_name,
            u.phone,
            u.email,
            IFNULL(u.meta, '{}') AS meta,
            u.created_at,
            u.updated_at,
            r.name AS role,
            (SELECT COUNT(1) FROM farmer_reports fr WHERE fr.farmer_id = u.id) AS farmer_report_count,
            (SELECT COUNT(1) FROM recycler_requests rr WHERE rr.recycler_id = u.id) AS recycler_request_count,
            (SELECT COUNT(1) FROM processor_requests pr WHERE pr.processor_id = u.id) AS processor_request_count,
            (SELECT COUNT(1) FROM orders o WHERE o.farmer_id = u.id OR o.recycler_id = u.id) AS order_count
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const db = openDb();
    db.get(countSql, whereParams, (countErr, countRow) => {
        if (countErr) {
            db.close();
            return res.status(500).json({ error: countErr.message });
        }

        const listParams = [...whereParams, pageSize, offset];
        db.all(listSql, listParams, (listErr, rows) => {
            db.close();
            if (listErr) return res.status(500).json({ error: listErr.message });

            const items = (rows || []).map((row) => ({
                ...row,
                role_label: row.role === 'recycler' ? 'merchant' : row.role,
                farmer_report_count: Number(row.farmer_report_count || 0),
                recycler_request_count: Number(row.recycler_request_count || 0),
                processor_request_count: Number(row.processor_request_count || 0),
                order_count: Number(row.order_count || 0),
            }));

            return res.json({
                items,
                pagination: {
                    page,
                    page_size: pageSize,
                    total: Number((countRow && countRow.total) || 0),
                },
            });
        });
    });
});

// Admin statistics overview
app.get('/api/admin/statistics/overview', adminOnly, (req, res) => {
    const db = openDb();
    const sql = `
        SELECT
            (SELECT COUNT(1) FROM users) AS users_total,
            (SELECT COUNT(1) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin') AS users_admin,
            (SELECT COUNT(1) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'farmer') AS users_farmer,
            (SELECT COUNT(1) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'recycler') AS users_recycler,
            (SELECT COUNT(1) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'processor') AS users_processor,
            (SELECT COUNT(1) FROM users WHERE created_at >= datetime('now', '-7 day')) AS users_new_7d,

            (SELECT COUNT(1) FROM orders) AS orders_total,
            (SELECT COUNT(1) FROM orders WHERE status = 'pending') AS orders_pending,
            (SELECT COUNT(1) FROM orders WHERE status = 'accepted') AS orders_accepted,
            (SELECT COUNT(1) FROM orders WHERE status = 'completed') AS orders_completed,
            (SELECT COUNT(1) FROM orders WHERE status = 'cancelled') AS orders_cancelled,
            (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed') AS orders_turnover,

            (SELECT COUNT(1) FROM farmer_reports) AS reports_total,
            (SELECT COUNT(1) FROM farmer_reports WHERE status = 'pending') AS reports_pending,
            (SELECT COUNT(1) FROM farmer_reports WHERE status = 'accepted') AS reports_accepted,
            (SELECT COUNT(1) FROM farmer_reports WHERE status = 'completed') AS reports_completed,
            (SELECT COUNT(1) FROM farmer_reports WHERE status = 'rejected') AS reports_rejected,
            (SELECT COALESCE(SUM(weight_kg), 0) FROM farmer_reports WHERE status IN ('accepted', 'completed')) AS reports_weight_processed,

            (SELECT COUNT(1) FROM intentions) AS intentions_total,
            (SELECT COUNT(1) FROM intentions WHERE status = 'pending') AS intentions_pending,
            (SELECT COUNT(1) FROM intentions WHERE status = 'accepted') AS intentions_accepted,
            (SELECT COUNT(1) FROM intentions WHERE status = 'rejected') AS intentions_rejected,

            (SELECT COUNT(1) FROM arbitration_requests) AS arbitrations_total,
            (SELECT COUNT(1) FROM arbitration_requests WHERE status = 'pending') AS arbitrations_pending,
            (SELECT COUNT(1) FROM arbitration_requests WHERE status = 'investigating') AS arbitrations_investigating,
            (SELECT COUNT(1) FROM arbitration_requests WHERE status = 'resolved') AS arbitrations_resolved,
            (SELECT COUNT(1) FROM arbitration_requests WHERE status = 'rejected') AS arbitrations_rejected
    `;

    db.get(sql, [], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });

        const data = Object.entries(row || {}).reduce((acc, [key, value]) => {
            const asNumber = Number(value);
            acc[key] = Number.isFinite(asNumber) ? asNumber : 0;
            return acc;
        }, {});

        return res.json(data);
    });
});

// Admin runtime/security settings snapshot
app.get('/api/admin/settings/runtime', adminOnly, async (req, res) => {
    if (ENABLE_RUNTIME_DELAY_SIMULATION) {
        const simulatedDelayMs = parseRuntimeDelayMs(req.query.simulate_delay_ms);
        if (simulatedDelayMs > 0) {
            await sleep(simulatedDelayMs);
        }
    }

    const allowedOriginsList = (allowedOrigins || []).map((item) => String(item).trim()).filter(Boolean);
    const smsRuntimeStatus = getSmsRuntimeStatus(process.env);
    const recentSecurityStats = collectRecentSecurityAuditStats(SECURITY_ALERT_WINDOW_MINUTES);
    const activeSecurityAlerts = buildSecurityAlertSnapshot(recentSecurityStats);

    return res.json({
        runtime: {
            node_env: process.env.NODE_ENV || 'development',
            port: Number(process.env.PORT || 4000),
            runtime_delay_simulation_enabled: ENABLE_RUNTIME_DELAY_SIMULATION,
            runtime_delay_max_ms: RUNTIME_DELAY_MAX_MS,
        },
        security: {
            jwt_from_env: Boolean(process.env.JWT_SECRET),
            bcrypt_rounds: BCRYPT_ROUNDS,
            cors_allowlist_count: allowedOriginsList.length,
            cors_allowlist: allowedOriginsList,
            hsts_enabled: true,
            x_content_type_options: true,
            x_frame_options: true,
            cache_control_no_store: true,
            csp_configured: true,
            referrer_policy_configured: true,
            permissions_policy_configured: true,
            security_audit_log_enabled: true,
            security_audit_log_file: 'logs/security-audit.log',
            security_audit_log_rotation_enabled: true,
            security_audit_log_max_mb: SECURITY_AUDIT_LOG_MAX_MB,
            security_audit_log_max_files: SECURITY_AUDIT_LOG_MAX_FILES,
        },
        integrations: {
            amap_configured: Boolean(AMAP_WEB_KEY),
            sms_provider: smsRuntimeStatus.providerResolved,
            sms_provider_configured: smsRuntimeStatus.providerConfigured,
            sms_aliyun_configured: smsRuntimeStatus.aliyunConfigured,
            sms_mock_mode: smsRuntimeStatus.mockMode,
            sms_runtime_ready: smsRuntimeStatus.runtimeReady,
            sms_runtime_block_reason: smsRuntimeStatus.blockReason || '',
        },
        observability: {
            security_alert_window_minutes: SECURITY_ALERT_WINDOW_MINUTES,
            security_alert_thresholds: {
                status_401: SECURITY_ALERT_AUTHN_THRESHOLD,
                status_403: SECURITY_ALERT_AUTHZ_THRESHOLD,
                status_429: SECURITY_ALERT_RATE_LIMIT_THRESHOLD,
            },
            recent_security_events: recentSecurityStats,
            active_alert_count: activeSecurityAlerts.length,
            active_alerts: activeSecurityAlerts,
            dependency_health: {
                amap: AMAP_WEB_KEY ? 'up' : 'degraded-unconfigured',
            },
        },
    });
});

app.post('/init', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: '生产环境禁用初始化接口' });
    }

    const configuredKey = process.env.INIT_API_KEY;
    if (configuredKey) {
        const requestKey = req.get('x-init-key') || '';
        if (requestKey !== configuredKey) {
            return res.status(403).json({ error: '初始化密钥无效' });
        }
    }

    try {
        await initDb();
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Request OTP via Aliyun SMS
app.post('/api/auth/request-otp', otpLimiter, async (req, res) => {
    try {
        const { phone } = req.body;
        if (!isValidPhone(phone)) return res.status(400).json({ error: '手机号格式不正确' });

        // SEC-007: Check existing OTP from database
        const db = openDb();
        db.get(
            `SELECT last_sent_at FROM otp_store WHERE phone = ? AND expires_at > datetime('now') LIMIT 1`,
            [phone],
            (err, row) => {
                if (err) {
                    console.error('check OTP error', err.message);
                    db.close();
                    return res.status(500).json({ error: '系统错误' });
                }

                // Check if recently sent within 60 seconds
                if (row && row.last_sent_at) {
                    const lastSent = new Date(row.last_sent_at).getTime();
                    const now = Date.now();
                    if (now - lastSent < 60 * 1000) {
                        db.close();
                        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
                    }
                }

                // Generate new OTP code
                const code = (Math.floor(100000 + Math.random() * 900000)).toString();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

                // Clear old OTPs for this phone
                db.run(`DELETE FROM otp_store WHERE phone = ? AND expires_at <= datetime('now')`, [phone], (delErr) => {
                    if (delErr) console.warn('Delete expired OTP error:', delErr.message);

                    // Insert new OTP
                    db.run(
                        `INSERT INTO otp_store(phone, code, expires_at, attempts, last_sent_at) VALUES(?, ?, ?, ?, datetime('now'))`,
                        [phone, code, expiresAt, 0],
                        async (insertErr) => {
                            db.close();
                            if (insertErr) {
                                console.error('Insert OTP error', insertErr.message);
                                return res.status(500).json({ error: '验证码生成失败' });
                            }

                            // Send SMS
                            try {
                                await sendOtpSms(phone, code);
                                res.json({ success: true });
                            } catch (smsErr) {
                                console.error('SMS send error', smsErr.message);
                                const cleanupDb = openDb();
                                cleanupDb.run(
                                    `DELETE FROM otp_store WHERE phone = ? AND code = ?`,
                                    [phone, code],
                                    () => cleanupDb.close()
                                );
                                res.status(500).json({ error: '验证码发送失败，请稍后重试' });
                            }
                        }
                    );
                });
            }
        );
    } catch (err) {
        console.error('request-otp error', err.message);
        res.status(500).json({ error: '验证码发送失败，请稍后重试' });
    }
});

// Phone + OTP registration
app.post('/api/auth/register-phone', registerLimiter, (req, res) => {
    const { phone, otp, password, role, full_name, agreementAccepted } = req.body;
    const requestedRole = normalizeRoleInput(role);

    if (!agreementAccepted) return res.status(400).json({ error: '请先勾选协议' });
    if (!isValidPhone(phone)) return res.status(400).json({ error: '手机号格式不正确' });
    if (!otp) return res.status(400).json({ error: '缺少验证码' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });
    if (!requestedRole) return res.status(400).json({ error: '请选择身份' });
    if (isPrivilegedRole(requestedRole)) return res.status(403).json({ error: '不允许自助注册管理员账号' });

    // SEC-007: Query OTP from database
    const db = openDb();
    db.get(
        `SELECT id, code, expires_at, attempts, max_attempts FROM otp_store WHERE phone = ? ORDER BY created_at DESC LIMIT 1`,
        [phone],
        (err, record) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: '系统错误' });
            }

            if (!record) {
                db.close();
                return res.status(400).json({ error: '验证码已失效，请重新获取' });
            }

            // Check expiry
            if (new Date(record.expires_at) < new Date()) {
                db.run(`DELETE FROM otp_store WHERE id = ?`, [record.id]);
                db.close();
                return res.status(400).json({ error: '验证码已过期，请重新获取' });
            }

            // Check max attempts
            if (record.attempts >= record.max_attempts) {
                db.run(`DELETE FROM otp_store WHERE id = ?`, [record.id]);
                db.close();
                return res.status(429).json({ error: '验证码错误次数过多，请重新获取' });
            }

            // Check OTP code
            if (record.code !== otp) {
                db.run(`UPDATE otp_store SET attempts = attempts + 1 WHERE id = ?`, [record.id]);
                db.close();
                return res.status(400).json({ error: '验证码不正确' });
            }

            // OTP verified, delete it
            db.run(`DELETE FROM otp_store WHERE id = ?`, [record.id]);

            // Proceed with registration
            db.get(`SELECT id FROM roles WHERE name = ? AND name <> 'admin'`, [requestedRole], (err2, roleRow) => {
                if (err2) { db.close(); return res.status(500).json({ error: err2.message }); }
                if (!roleRow) { db.close(); return res.status(400).json({ error: '无效的身份' }); }

                const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
                const username = phone;

                db.run(`INSERT INTO users(username,password_hash,role_id,full_name,phone) VALUES(?,?,?,?,?)`, [username, hash, roleRow.id, full_name || null, phone], function(err3) {
                    db.close();
                    if (err3) {
                        if (err3.message && err3.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: '该手机号已注册' });
                        }
                        return res.status(500).json({ error: err3.message });
                    }
                    
                    const userPayload = { id: this.lastID, username, phone, role: requestedRole, full_name: full_name || null };
                    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
                    
                    res.json({ ...userPayload, token });
                });
            });
        }
    );
});

// Register
app.post('/api/register', registerLimiter, (req, res) => {
    const { username, password, role, full_name } = req.body;
    const requestedRole = normalizeRoleInput(role);
    if (!username || !password || !requestedRole) return res.status(400).json({ error: 'missing fields' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });
    if (isPrivilegedRole(requestedRole)) return res.status(403).json({ error: '不允许自助注册管理员账号' });

    const db = openDb();
    db.get(`SELECT id FROM roles WHERE name = ? AND name <> 'admin'`, [requestedRole], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: 'invalid role' });

        const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        db.run(`INSERT INTO users(username,password_hash,role_id,full_name) VALUES(?,?,?,?)`, [username, hash, row.id, full_name || null], function(err2) {
            db.close();
            if (err2) return res.status(500).json({ error: err2.message });
            
            const userPayload = { id: this.lastID, username, role: requestedRole, full_name: full_name || null };
            const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });
            
            res.json({ ...userPayload, token });
        });
    });
});

// Login (support username or phone)
app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'missing fields' });
    const db = openDb();

    db.get(`SELECT u.id,u.username,u.phone,u.password_hash,u.full_name,r.name as role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.username = ? OR u.phone = ?`, [username, username], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            res.locals.securityAuditReason = 'LOGIN_BAD_CREDENTIALS';
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) {
            res.locals.securityAuditReason = 'LOGIN_BAD_CREDENTIALS';
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const userPayload = { id: row.id, username: row.username, phone: row.phone, full_name: row.full_name, role: row.role };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2h' });

        res.json({ ...userPayload, token });
    });
});

// SEC-013: Token Refresh Endpoint (allows users to refresh before expiry)
app.post('/api/auth/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '缺少有效的 token' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        // Verify current token (will fail if expired, which is intended)
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Issue new token with fresh expiry
        const newToken = jwt.sign(
            { id: decoded.id, username: decoded.username, phone: decoded.phone, full_name: decoded.full_name, role: decoded.role },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        
        res.json({ token: newToken, message: 'token refreshed' });
    } catch (err) {
        return res.status(401).json({ error: 'Token 无效或已过期，请重新登录' });
    }
});

// Stateless JWT logout endpoint for client-side session cleanup flow.
app.post('/api/auth/logout', (req, res) => {
    return res.json({ success: true, message: 'logged out' });
});

// Create order
app.post('/api/orders', (req, res) => {
    const { farmer_id, recycler_id, location_id, weight_kg, price_per_kg, notes } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && req.user.role !== 'farmer') {
        return res.status(403).json({ error: '仅农户可创建订单' });
    }

    const finalFarmerId = isAdmin(req) ? toPositiveInt(farmer_id) : actorId;
    if (!finalFarmerId || !weight_kg) return res.status(400).json({ error: 'missing required fields' });

    if (!isAdmin(req) && farmer_id && !ensureSelfOrAdmin(req, farmer_id)) {
        return res.status(403).json({ error: '禁止使用他人 farmer_id 创建订单' });
    }

    const orderNo = 'ORD-' + Date.now();
    const total = price_per_kg ? (price_per_kg * weight_kg) : null;

    const db = openDb();
    db.run(`INSERT INTO orders(order_no, farmer_id, recycler_id, location_id, weight_kg, price_per_kg, total_price, notes) VALUES(?,?,?,?,?,?,?,?)`,
        [orderNo, finalFarmerId, recycler_id || null, location_id || null, weight_kg, price_per_kg || null, total, notes || null], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, order_no: orderNo });
        });
});

// Get orders (optional filters: farmer_id, recycler_id, status)
app.get('/api/orders', (req, res) => {
    const { farmer_id, recycler_id, status } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    let q = `SELECT o.*, 
                u.username as farmer_username,
                u.full_name as farmer_full_name,
                u.phone as farmer_phone,
                r.username as recycler_username,
                r.full_name as recycler_full_name,
                r.phone as recycler_phone,
                loc.name as location_name,
                loc.address as location_address,
                loc.latitude as location_lat,
                loc.longitude as location_lng
             FROM orders o
             LEFT JOIN users u ON o.farmer_id = u.id
             LEFT JOIN users r ON o.recycler_id = r.id
             LEFT JOIN locations loc ON o.location_id = loc.id`;
    const params = [];
    const conditions = [];

    if (isAdmin(req)) {
        if (farmer_id) { conditions.push('o.farmer_id = ?'); params.push(farmer_id); }
        if (recycler_id) { conditions.push('o.recycler_id = ?'); params.push(recycler_id); }
    } else if (req.user.role === 'farmer') {
        conditions.push('o.farmer_id = ?');
        params.push(actorId);
    } else if (req.user.role === 'recycler' || req.user.role === 'merchant' || req.user.role === 'processor') {
        // 兼容历史数据：处理商订单沿用 recycler_id 字段
        conditions.push('o.recycler_id = ?');
        params.push(actorId);
    } else {
        db.close();
        return res.status(403).json({ error: '当前角色无权查看订单' });
    }

    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
    q += ' ORDER BY o.created_at DESC';

    db.all(q, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get single order detail
app.get('/api/orders/:id', (req, res, next) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (String(req.params.id || '').trim() === 'nearby') {
        return next();
    }

    const idOrNo = String(req.params.id || '').trim();
    if (!idOrNo) return res.status(400).json({ error: '缺少订单标识' });

    const db = openDb();
    db.get(
        `SELECT o.*,
                u.username as farmer_username,
                u.full_name as farmer_full_name,
                u.phone as farmer_phone,
                r.username as recycler_username,
                r.full_name as recycler_full_name,
                r.phone as recycler_phone,
                loc.name as location_name,
                loc.address as location_address,
                loc.latitude as location_lat,
                loc.longitude as location_lng
         FROM orders o
         LEFT JOIN users u ON o.farmer_id = u.id
         LEFT JOIN users r ON o.recycler_id = r.id
         LEFT JOIN locations loc ON o.location_id = loc.id
         WHERE o.id = ? OR o.order_no = ?
         LIMIT 1`,
        [idOrNo, idOrNo],
        (err, row) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: '订单不存在' });

            if (!isAdmin(req)) {
                if (req.user.role === 'farmer') {
                    if (toPositiveInt(row.farmer_id) !== actorId) {
                        return res.status(403).json({ error: '无权查看该订单' });
                    }
                } else if (req.user.role === 'recycler' || req.user.role === 'merchant' || req.user.role === 'processor') {
                    if (toPositiveInt(row.recycler_id) !== actorId) {
                        return res.status(403).json({ error: '无权查看该订单' });
                    }
                } else {
                    return res.status(403).json({ error: '当前角色无权查看订单' });
                }
            }

            return res.json(row);
        }
    );
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const idOrNo = String(req.params.id || '').trim();
    const nextStatus = String(req.body && req.body.status ? req.body.status : '').trim();
    const note = String(req.body && req.body.note ? req.body.note : '').trim();
    const allowedStatuses = new Set(['pending', 'accepted', 'pending_ship', 'shipped', 'completed', 'cancelled']);

    if (!idOrNo) return res.status(400).json({ error: '缺少订单标识' });
    if (!allowedStatuses.has(nextStatus)) {
        return res.status(400).json({ error: '无效状态值' });
    }

    const db = openDb();
    db.get(
        `SELECT id, farmer_id, recycler_id, status, order_no
         FROM orders
         WHERE id = ? OR order_no = ?
         LIMIT 1`,
        [idOrNo, idOrNo],
        (err, row) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                db.close();
                return res.status(404).json({ error: '订单不存在' });
            }

            if (!isAdmin(req)) {
                const actorCanUpdate = (req.user.role === 'recycler' || req.user.role === 'merchant' || req.user.role === 'processor')
                    && toPositiveInt(row.recycler_id) === actorId;
                if (!actorCanUpdate) {
                    db.close();
                    return res.status(403).json({ error: '当前账号无权更新该订单状态' });
                }
            }

            isTargetUnderActiveArbitration(db, 'order', row.id, (lockErr, locked) => {
                if (lockErr) {
                    db.close();
                    return res.status(500).json({ error: lockErr.message });
                }
                if (locked) {
                    db.close();
                    return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可变更状态' });
                }

                db.run(
                    `UPDATE orders
                     SET status = ?, updated_at = datetime('now')
                     WHERE id = ?`,
                    [nextStatus, row.id],
                    function(updateErr) {
                        if (updateErr) {
                            db.close();
                            return res.status(500).json({ error: updateErr.message });
                        }
                        if (this.changes === 0) {
                            db.close();
                            return res.status(404).json({ error: '订单不存在或状态未更新' });
                        }

                        db.run(
                            `INSERT INTO order_status_history (order_id, status, note)
                             VALUES (?, ?, ?)`,
                            [row.id, nextStatus, note || null],
                            () => {
                                db.close();
                                return res.json({ success: true, id: row.id, order_no: row.order_no, status: nextStatus });
                            }
                        );
                    }
                );
            });
        }
    );
});

// Nearby orders by location (simple bounding box)
// query params: lat, lng, radius_km
app.get('/api/orders/nearby', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius_km = parseFloat(req.query.radius_km || '5');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat & lng required' });

    // approximate degree offset (not accurate for large radii) -> ~111 km per degree latitude
    const deg = radius_km / 111.0;
    const minLat = lat - deg; const maxLat = lat + deg;
    const minLng = lng - deg; const maxLng = lng + deg;

    const db = openDb();
    const q = `SELECT o.*, loc.latitude, loc.longitude, loc.name as location_name FROM orders o LEFT JOIN locations loc ON o.location_id = loc.id WHERE loc.latitude BETWEEN ? AND ? AND loc.longitude BETWEEN ? AND ?`;
    db.all(q, [minLat, maxLat, minLng, maxLng], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get locations
app.get('/api/locations', (req, res) => {
    const db = openDb();
    db.all(`SELECT * FROM locations`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get nearby recyclers (processing points)
// query params: lat, lng, limit (default 5)
app.get('/api/recyclers/nearby', (req, res) => {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);
    const limit = parseInt(req.query.limit || '5');
    
    if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ error: 'lat and lng required' });
    }

    const db = openDb();
    // Get all recyclers with location info in meta
    db.all(`SELECT u.id, u.username, u.full_name, u.phone, u.meta 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE r.name = 'recycler' AND u.meta IS NOT NULL`,
        [], (err, rows) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            
            // Calculate distance for each recycler using Haversine formula
            const recyclers = rows.map(r => {
                try {
                    const meta = JSON.parse(r.meta);
                    if (!meta.latitude || !meta.longitude) return null;
                    
                    const distance = calculateDistance(
                        userLat, userLng,
                        meta.latitude, meta.longitude
                    );
                    
                    return {
                        id: r.id,
                        name: r.full_name || r.username,
                        phone: isAdmin(req) ? (r.phone || '') : maskPhone(r.phone),
                        address: meta.address || '未提供地址',
                        businessHours: meta.business_hours || '营业时间未知',
                        latitude: meta.latitude,
                        longitude: meta.longitude,
                        distance: parseFloat(distance.toFixed(2)) // km
                    };
                } catch (e) {
                    return null;
                }
            }).filter(r => r !== null);
            
            // Sort by distance and limit results
            recyclers.sort((a, b) => a.distance - b.distance);
            const nearest = recyclers.slice(0, limit);
            
            res.json(nearest);
        });
});

// Helper function: Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ========== Farmer Reports API ==========

// Create or update farmer report (支持草稿和发布)
app.post('/api/farmer-reports', (req, res) => {
    const { farmer_id, pickup_date, weight_kg, location_address, location_lat, location_lng,
            citrus_variety, contact_name, contact_phone, grade, photo_urls, status, notes, id } = req.body;

    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && req.user.role !== 'farmer') {
        return res.status(403).json({ error: '仅农户可提交申报' });
    }

    const finalFarmerId = isAdmin(req) ? toPositiveInt(farmer_id) : actorId;
    if (!finalFarmerId) return res.status(400).json({ error: '缺少农户ID' });
    if (!isAdmin(req) && farmer_id && !ensureSelfOrAdmin(req, farmer_id)) {
        return res.status(403).json({ error: '禁止提交他人申报' });
    }
    
    const db = openDb();
    
    if (id) {
        // Update existing report
        db.run(`UPDATE farmer_reports SET 
            pickup_date = ?, weight_kg = ?, location_address = ?, location_lat = ?, location_lng = ?,
            citrus_variety = ?, contact_name = ?, contact_phone = ?, grade = ?, photo_urls = ?,
            status = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ? AND farmer_id = ?`,
            [pickup_date, weight_kg, location_address, location_lat, location_lng,
             citrus_variety, contact_name, contact_phone, grade || 'grade2', 
             JSON.stringify(photo_urls || []), status || 'draft', notes, id, finalFarmerId],
            function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '申报不存在或无权修改' });
                res.json({ id, updated: true });
            });
    } else {
        // Create new report
        const reportNo = 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        db.run(`INSERT INTO farmer_reports (report_no, farmer_id, pickup_date, weight_kg, location_address,
            location_lat, location_lng, citrus_variety, contact_name, contact_phone, grade, photo_urls, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reportNo, finalFarmerId, pickup_date, weight_kg, location_address, location_lat, location_lng,
             citrus_variety, contact_name, contact_phone, grade || 'grade2',
             JSON.stringify(photo_urls || []), status || 'draft', notes],
            function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, report_no: reportNo });
            });
    }
});

// Get farmer reports (supports filtering by farmer_id OR recycler_id)
app.get('/api/farmer-reports', (req, res) => {
    const { farmer_id, recycler_id, status } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });
    
    const db = openDb();
    let q = `SELECT fr.*, u.full_name as farmer_name, u.phone as farmer_phone 
             FROM farmer_reports fr 
             LEFT JOIN users u ON fr.farmer_id = u.id 
             WHERE 1=1`;
    const params = [];

    if (isAdmin(req)) {
        if (farmer_id) {
            q += ` AND fr.farmer_id = ?`;
            params.push(farmer_id);
        }
        if (recycler_id) {
            q += ` AND fr.recycler_id = ?`;
            params.push(recycler_id);
        }
        if (!farmer_id && !recycler_id) {
            // 管理员允许查询全部
        }
    } else if (req.user.role === 'farmer') {
        q += ` AND fr.farmer_id = ?`;
        params.push(actorId);
    } else if (req.user.role === 'recycler' || req.user.role === 'merchant') {
        q += ` AND fr.recycler_id = ?`;
        params.push(actorId);
    } else {
        db.close();
        return res.status(403).json({ error: '当前角色无权查看申报' });
    }
    
    if (status && status !== 'all') {
        q += ` AND fr.status = ?`;
        params.push(status);
    }
    q += ` ORDER BY fr.created_at DESC`;
    
    db.all(q, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, photo_urls: JSON.parse(r.photo_urls || '[]') })));
    });
});

// Get single report by ID
app.get('/api/farmer-reports/:id', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    db.get(`SELECT * FROM farmer_reports WHERE id = ?`, [req.params.id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '申报不存在' });

        if (!isAdmin(req)) {
            const ownFarmer = toPositiveInt(row.farmer_id) === actorId;
            const ownRecycler = toPositiveInt(row.recycler_id) === actorId;
            if (!ownFarmer && !ownRecycler) {
                return res.status(403).json({ error: '无权查看该申报' });
            }
        }

        res.json({ ...row, photo_urls: JSON.parse(row.photo_urls || '[]') });
    });
});

// Get all published reports for recyclers (农户供应列表)
app.get('/api/farmer-supplies', (req, res) => {
    const { sort_by, recycler_lat, recycler_lng } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    
    db.all(`SELECT fr.*, u.full_name as farmer_name, u.phone as farmer_phone
            FROM farmer_reports fr
            JOIN users u ON fr.farmer_id = u.id
            WHERE fr.status = 'pending'
            ORDER BY fr.created_at DESC`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        let results = rows.map((r) => {
            const ownFarmer = toPositiveInt(r.farmer_id) === actorId;
            const ownRecycler = toPositiveInt(r.recycler_id) === actorId;
            const canViewFullPhone = isAdmin(req) || ownFarmer || ownRecycler;

            return {
                ...r,
                farmer_phone: canViewFullPhone ? (r.farmer_phone || '') : maskPhone(r.farmer_phone),
                contact_phone: canViewFullPhone ? (r.contact_phone || '') : maskPhone(r.contact_phone),
                photo_urls: JSON.parse(r.photo_urls || '[]'),
                distance: (recycler_lat && recycler_lng && r.location_lat && r.location_lng)
                    ? calculateDistance(parseFloat(recycler_lat), parseFloat(recycler_lng), r.location_lat, r.location_lng)
                    : null
            };
        });
        
        // Sort based on sort_by parameter
        if (sort_by === 'distance' && recycler_lat && recycler_lng) {
            results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else if (sort_by === 'weight') {
            results.sort((a, b) => b.weight_kg - a.weight_kg);
        } else {
            // Default: sort by time (newest first)
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        res.json(results);
    });
});

// ===== Recycler Supplies API (回收商供应 - 面向处理商) =====

// Get recycler supplies list
app.get('/api/recycler-supplies', (req, res) => {
    const { recycler_id, status } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    
    let query = `SELECT rs.*, u.full_name as recycler_name, u.phone as recycler_phone
                 FROM recycler_supplies rs
                 LEFT JOIN users u ON rs.recycler_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (isAdmin(req)) {
        if (recycler_id) {
            query += ` AND rs.recycler_id = ?`;
            params.push(recycler_id);
        }
        if (status && status !== 'all') {
            query += ` AND rs.status = ?`;
            params.push(status);
        } else if (!status) {
            // 管理员默认查看激活状态，避免一次返回过多历史数据
            query += ` AND rs.status = 'active'`;
        }
    } else if (isRecyclerActor(req)) {
        query += ` AND rs.recycler_id = ?`;
        params.push(actorId);
        if (status && status !== 'all') {
            query += ` AND rs.status = ?`;
            params.push(status);
        }
    } else if (isProcessorActor(req) || req.user.role === 'farmer') {
        // 非回收商仅可查看市场中可见的激活供应
        query += ` AND rs.status = 'active'`;
    } else {
        db.close();
        return res.status(403).json({ error: '当前角色无权查看回收商供应' });
    }
    
    query += ` AND (rs.valid_until IS NULL OR rs.valid_until >= date('now'))`;
    query += ` ORDER BY rs.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        const results = rows.map((r) => {
            const ownRecycler = toPositiveInt(r.recycler_id) === actorId;
            const canViewFullPhone = isAdmin(req) || ownRecycler;

            return {
                ...r,
                recycler_phone: canViewFullPhone ? (r.recycler_phone || '') : maskPhone(r.recycler_phone),
                contact_phone: canViewFullPhone ? (r.contact_phone || '') : maskPhone(r.contact_phone),
                photo_urls: JSON.parse(r.photo_urls || '[]')
            };
        });
        res.json(results);
    });
});

// Create recycler supply
app.post('/api/recycler-supplies', (req, res) => {
    const { recycler_id, grade, stock_weight, contact_name, contact_phone, address, notes, valid_until, status } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isRecyclerActor(req)) {
        return res.status(403).json({ error: '仅回收商可发布供应' });
    }

    const finalRecyclerId = isAdmin(req) ? toPositiveInt(recycler_id) : actorId;
    if (!finalRecyclerId) {
        return res.status(400).json({ error: '缺少有效回收商ID' });
    }
    if (!isAdmin(req) && recycler_id && !ensureSelfOrAdmin(req, recycler_id)) {
        return res.status(403).json({ error: '禁止为其他账号发布供应' });
    }
    
    if (!grade || !stock_weight || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    
    const db = openDb();
    const supplyNo = 'RSUP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    db.run(`INSERT INTO recycler_supplies (supply_no, recycler_id, grade, stock_weight, contact_name, contact_phone, address, notes, valid_until, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [supplyNo, finalRecyclerId, grade, stock_weight, contact_name, contact_phone, address || null, notes || null, valid_until || null, status || 'draft'],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID, supply_no: supplyNo });
        }
    );
});

// Update recycler supply status
app.patch('/api/recycler-supplies/:id/status', (req, res) => {
    const { status } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });
    if (!isAdmin(req) && !isRecyclerActor(req)) {
        return res.status(403).json({ error: '仅回收商可修改供应状态' });
    }

    const db = openDb();

    let sql = `UPDATE recycler_supplies SET status = ?, updated_at = datetime('now') WHERE id = ?`;
    const params = [status, req.params.id];
    if (!isAdmin(req)) {
        sql += ` AND recycler_id = ?`;
        params.push(actorId);
    }

    db.run(sql,
        params,
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '供应信息不存在' });
            res.json({ success: true });
        }
    );
});

// Update report status (for recycler accepting or completing orders)
app.patch('/api/farmer-reports/:id/status', (req, res) => {
    const { status, recycler_id } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const parsedRecyclerId = recycler_id !== undefined ? toPositiveInt(recycler_id) : null;
    if (recycler_id !== undefined && !parsedRecyclerId) {
        return res.status(400).json({ error: '无效 recycler_id' });
    }
    if (!isAdmin(req) && parsedRecyclerId && !ensureSelfOrAdmin(req, parsedRecyclerId)) {
        return res.status(403).json({ error: '禁止将订单指派给其他账号' });
    }

    const db = openDb();
    isTargetUnderActiveArbitration(db, 'farmer_report', req.params.id, (lockErr, locked) => {
        if (lockErr) {
            db.close();
            return res.status(500).json({ error: lockErr.message });
        }
        if (locked) {
            db.close();
            return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可变更状态' });
        }

        let q = `UPDATE farmer_reports SET status = ?, updated_at = datetime('now')`;
        const params = [status];

        if (recycler_id !== undefined) {
            q += `, recycler_id = ?`;
            params.push(parsedRecyclerId);
        }

        q += ` WHERE id = ?`;
        params.push(req.params.id);

        if (!isAdmin(req)) {
            q += ` AND (farmer_id = ? OR recycler_id = ?)`;
            params.push(actorId, actorId);
        }

        db.run(q, params, function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '申报不存在' });
                res.json({ success: true });
            });
    });
});

// Accept report - recycler accepts a farmer's report
app.post('/api/farmer-reports/:id/accept', (req, res) => {
    const { recycler_id, processor_id } = req.body;
    const reportId = req.params.id;
    const actorId = getActorId(req);

    if (!actorId) {
        return res.status(401).json({ error: '未授权，请先登录' });
    }

    if (processor_id) {
        return res.status(400).json({ error: '当前版本 farmer_reports 仅支持回收商接单' });
    }
    
    // 必须有回收商或处理商ID
    if (!recycler_id && !processor_id) {
        return res.status(400).json({ error: '缺少接单方ID' });
    }

    const parsedRecyclerId = toPositiveInt(recycler_id);
    if (recycler_id && !parsedRecyclerId) return res.status(400).json({ error: '无效 recycler_id' });

    if (!isAdmin(req)) {
        if (parsedRecyclerId) {
            if ((req.user.role !== 'recycler' && req.user.role !== 'merchant') || !ensureSelfOrAdmin(req, parsedRecyclerId)) {
                return res.status(403).json({ error: '仅回收商本人可接单' });
            }
        }
    }
    
    const db = openDb();
    
    // 先检查申报是否存在且状态为 pending
    db.get(`SELECT * FROM farmer_reports WHERE id = ?`, [reportId], (err, report) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        if (!report) {
            db.close();
            return res.status(404).json({ error: '申报不存在' });
        }

        isTargetUnderActiveArbitration(db, 'farmer_report', reportId, (lockErr, locked) => {
            if (lockErr) {
                db.close();
                return res.status(500).json({ error: lockErr.message });
            }
            if (locked) {
                db.close();
                return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可接单' });
            }

            if (report.status !== 'pending') {
                db.close();
                return res.status(400).json({ error: '该订单已被接受或已完成' });
            }

            // SEC-003: 避免动态字段拼接，固定使用参数化 SQL
            db.run(
                `UPDATE farmer_reports
                 SET status = 'accepted', recycler_id = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [parsedRecyclerId, reportId],
                function(err2) {
                    db.close();
                    if (err2) return res.status(500).json({ error: err2.message });
                    return res.json({ success: true, message: '订单接受成功' });
                }
            );
        });
    });
});

// Delete report (only drafts can be deleted)
app.delete('/api/farmer-reports/:id', (req, res) => {
    const { farmer_id } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && farmer_id && !ensureSelfOrAdmin(req, farmer_id)) {
        return res.status(403).json({ error: '禁止删除他人申报' });
    }

    const parsedFarmerId = farmer_id !== undefined ? toPositiveInt(farmer_id) : null;
    if (farmer_id !== undefined && !parsedFarmerId) {
        return res.status(400).json({ error: '缺少有效 farmer_id' });
    }

    const db = openDb();

    let sql = `DELETE FROM farmer_reports WHERE id = ? AND status = 'draft'`;
    const params = [req.params.id];
    if (isAdmin(req)) {
        if (parsedFarmerId) {
            sql += ` AND farmer_id = ?`;
            params.push(parsedFarmerId);
        }
    } else {
        sql += ` AND farmer_id = ?`;
        params.push(actorId);
    }

    db.run(sql,
        params, function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: '无法删除：申报不存在或已提交' });
            res.json({ success: true });
        });
});

// ========== Recycler Purchase Requests APIs ==========

// Create or update purchase request
app.post('/api/recycler-requests', (req, res) => {
    const { id, recycler_id, grade, contact_name, contact_phone, notes, valid_until, status } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isRecyclerActor(req)) {
        return res.status(403).json({ error: '仅回收商可发布求购' });
    }

    const finalRecyclerId = isAdmin(req) ? toPositiveInt(recycler_id) : actorId;
    if (!finalRecyclerId) {
        return res.status(400).json({ error: '请填写有效回收商ID' });
    }
    if (!isAdmin(req) && recycler_id && !ensureSelfOrAdmin(req, recycler_id)) {
        return res.status(403).json({ error: '禁止为其他账号发布求购' });
    }
    
    if (!grade || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '请填写必填项' });
    }
    
    const db = openDb();
    
    if (id) {
        // Update existing
        db.run(`UPDATE recycler_requests 
                SET grade = ?, contact_name = ?, contact_phone = ?, notes = ?, 
                    valid_until = ?, status = ?, updated_at = datetime('now')
                WHERE id = ? AND recycler_id = ?`,
            [grade, contact_name, contact_phone, notes, valid_until, status || 'draft', id, finalRecyclerId],
            function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
                res.json({ success: true, id });
            });
    } else {
        // Create new
        const request_no = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        db.run(`INSERT INTO recycler_requests 
                (request_no, recycler_id, grade, contact_name, contact_phone, notes, valid_until, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [request_no, finalRecyclerId, grade, contact_name, contact_phone, notes, valid_until, status || 'draft'],
            function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: this.lastID, request_no });
            });
    }
});

// Get recycler's own requests
app.get('/api/recycler-requests', (req, res) => {
    const { recycler_id, status } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();

    let q = `SELECT * FROM recycler_requests WHERE 1=1`;
    const params = [];

    if (isAdmin(req)) {
        if (recycler_id) {
            q += ` AND recycler_id = ?`;
            params.push(recycler_id);
        }
    } else if (isRecyclerActor(req)) {
        q += ` AND recycler_id = ?`;
        params.push(actorId);
    } else {
        db.close();
        return res.status(403).json({ error: '当前角色无权查看回收商求购' });
    }
    
    if (status && status !== 'all') {
        q += ` AND status = ?`;
        params.push(status);
    }
    
    q += ` ORDER BY created_at DESC`;
    
    db.all(q, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all active purchase requests (for farmers)
app.get('/api/purchase-requests', (req, res) => {
    const db = openDb();
    
    db.all(`SELECT rr.*, u.full_name as recycler_name, u.phone as recycler_phone
            FROM recycler_requests rr
            JOIN users u ON rr.recycler_id = u.id
            WHERE rr.status = 'active'
            AND (rr.valid_until IS NULL OR rr.valid_until >= date('now'))
            ORDER BY rr.created_at DESC`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (isAdmin(req)) return res.json(rows);

        const sanitizedRows = (rows || []).map((row) => ({
            ...row,
            contact_phone: maskPhone(row.contact_phone),
            recycler_phone: maskPhone(row.recycler_phone)
        }));
        res.json(sanitizedRows);
    });
});

// Get single request by ID
app.get('/api/recycler-requests/:id', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    let sql = `SELECT rr.*, u.full_name as recycler_name, u.phone as recycler_phone
            FROM recycler_requests rr
            JOIN users u ON rr.recycler_id = u.id
            WHERE rr.id = ?`;
    const params = [req.params.id];

    if (!isAdmin(req)) {
        if (isRecyclerActor(req)) {
            sql += ` AND (rr.recycler_id = ? OR rr.status = 'active')`;
            params.push(actorId);
        } else {
            sql += ` AND rr.status = 'active'`;
        }
    }

    db.get(sql, params, (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '求购信息不存在' });

        const isOwner = toPositiveInt(row.recycler_id) === actorId;
        if (!isAdmin(req) && !isOwner) {
            row.contact_phone = maskPhone(row.contact_phone);
            row.recycler_phone = maskPhone(row.recycler_phone);
        }
        res.json(row);
    });
});

// Update request status
app.patch('/api/recycler-requests/:id/status', (req, res) => {
    const { status, recycler_id } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isRecyclerActor(req)) {
        return res.status(403).json({ error: '仅回收商可更新求购状态' });
    }

    if (!isAdmin(req) && recycler_id && !ensureSelfOrAdmin(req, recycler_id)) {
        return res.status(403).json({ error: '禁止更新他人求购状态' });
    }

    const parsedRecyclerId = recycler_id !== undefined ? toPositiveInt(recycler_id) : null;
    if (recycler_id !== undefined && !parsedRecyclerId) {
        return res.status(400).json({ error: '缺少有效回收商ID' });
    }

    const db = openDb();

    isTargetUnderActiveArbitration(db, 'recycler_request', req.params.id, (lockErr, locked) => {
        if (lockErr) {
            db.close();
            return res.status(500).json({ error: lockErr.message });
        }
        if (locked) {
            db.close();
            return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可变更状态' });
        }

        let sql = `UPDATE recycler_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`;
        const params = [status, req.params.id];
        if (isAdmin(req)) {
            if (parsedRecyclerId) {
                sql += ` AND recycler_id = ?`;
                params.push(parsedRecyclerId);
            }
        } else {
            sql += ` AND recycler_id = ?`;
            params.push(actorId);
        }

        db.run(sql,
            params, function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
                res.json({ success: true });
            });
    });
});

// Delete request (only drafts)
app.delete('/api/recycler-requests/:id', (req, res) => {
    const { recycler_id } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isRecyclerActor(req)) {
        return res.status(403).json({ error: '仅回收商可删除求购' });
    }

    if (!isAdmin(req) && recycler_id && !ensureSelfOrAdmin(req, recycler_id)) {
        return res.status(403).json({ error: '禁止删除他人求购' });
    }

    const parsedRecyclerId = recycler_id !== undefined ? toPositiveInt(recycler_id) : null;
    if (recycler_id !== undefined && !parsedRecyclerId) {
        return res.status(400).json({ error: '缺少有效回收商ID' });
    }

    const db = openDb();

    let sql = `DELETE FROM recycler_requests WHERE id = ? AND status = 'draft'`;
    const params = [req.params.id];
    if (isAdmin(req)) {
        if (parsedRecyclerId) {
            sql += ` AND recycler_id = ?`;
            params.push(parsedRecyclerId);
        }
    } else {
        sql += ` AND recycler_id = ?`;
        params.push(actorId);
    }

    db.run(sql,
        params, function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: '无法删除：求购信息不存在或已发布' });
            res.json({ success: true });
        });
});

// ========== Processor Purchase Requests APIs ==========

// Create or update processor request
app.post('/api/processor-requests', (req, res) => {
    const { id, processor_id, weight_kg, grade, citrus_type, location_address, contact_name, contact_phone, has_transport, notes, valid_until, status } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isProcessorActor(req)) {
        return res.status(403).json({ error: '仅处理商可发布求购' });
    }

    const finalProcessorId = isAdmin(req) ? toPositiveInt(processor_id) : actorId;
    if (!finalProcessorId) {
        return res.status(400).json({ error: '请填写有效处理商ID' });
    }
    if (!isAdmin(req) && processor_id && !ensureSelfOrAdmin(req, processor_id)) {
        return res.status(403).json({ error: '禁止为其他账号发布求购' });
    }
    
    if (!weight_kg || !grade || !citrus_type || !location_address || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '请填写必填项' });
    }
    
    const db = openDb();
    
    if (id) {
        // Update existing - use DB column names: citrus_variety, address
        db.run(`UPDATE processor_requests SET weight_kg = ?, grade = ?, citrus_variety = ?, address = ?, contact_name = ?, contact_phone = ?, has_transport = ?, notes = ?, valid_until = ?, status = ?, updated_at = datetime('now')
                WHERE id = ? AND processor_id = ?`,
            [weight_kg, grade, citrus_type, location_address, contact_name, contact_phone, has_transport ? 1 : 0, notes || null, valid_until || null, status || 'draft', id, finalProcessorId], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
                res.json({ success: true, id });
            });
    } else {
        // Create new - use DB column names: citrus_variety, address
        const requestNo = 'PREQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        db.run(`INSERT INTO processor_requests (request_no, processor_id, weight_kg, grade, citrus_variety, address, contact_name, contact_phone, has_transport, notes, valid_until, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [requestNo, finalProcessorId, weight_kg, grade, citrus_type, location_address, contact_name, contact_phone, has_transport ? 1 : 0, notes || null, valid_until || null, status || 'draft'], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: this.lastID, request_no: requestNo });
            });
    }
});

// Get processor requests (with filters) - return citrus_variety as citrus_type and address as location_address for API consistency
app.get('/api/processor-requests', (req, res) => {
    const { processor_id, recycler_id, status, for_recyclers, for_farmers } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    console.log('[API /api/processor-requests] Query params:', req.query);
    const db = openDb();
    
    let query = `SELECT pr.*, pr.citrus_variety as citrus_type, pr.address as location_address, u.full_name as processor_name, u.phone as processor_phone
                 FROM processor_requests pr
                 LEFT JOIN users u ON pr.processor_id = u.id`;
    const params = [];
    const conditions = [];
    
    if (isAdmin(req)) {
        if (processor_id) {
            conditions.push('pr.processor_id = ?');
            params.push(processor_id);
            console.log('[API /api/processor-requests] Added processor_id condition:', processor_id);
        }
        if (recycler_id) {
            conditions.push('pr.recycler_id = ?');
            params.push(recycler_id);
        }
        if (status) {
            conditions.push('pr.status = ?');
            params.push(status);
        }
    } else if (isProcessorActor(req)) {
        conditions.push('pr.processor_id = ?');
        params.push(actorId);
        if (status && status !== 'all') {
            conditions.push('pr.status = ?');
            params.push(status);
        }
    } else if (isRecyclerActor(req)) {
        if (for_recyclers === 'true') {
            conditions.push("pr.status = 'active'");
            conditions.push("pr.recycler_id IS NULL");
            conditions.push("(pr.valid_until IS NULL OR pr.valid_until >= date('now'))");
        } else {
            conditions.push('pr.recycler_id = ?');
            params.push(actorId);
            if (status && status !== 'all') {
                conditions.push('pr.status = ?');
                params.push(status);
            }
        }
    } else if (req.user.role === 'farmer') {
        if (for_farmers !== 'true') {
            db.close();
            return res.status(403).json({ error: '当前角色无权查看该请求列表' });
        }
        conditions.push("pr.status = 'active'");
        conditions.push("pr.has_transport = 1");
        conditions.push("(pr.valid_until IS NULL OR pr.valid_until >= date('now'))");
    } else {
        db.close();
        return res.status(403).json({ error: '当前角色无权查看处理商求购' });
    }
    
    if (conditions.length) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY pr.created_at DESC';
    
    console.log('[API /api/processor-requests] Final query:', query);
    console.log('[API /api/processor-requests] Params:', params);
    
    db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
            console.error('[API /api/processor-requests] Error:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('[API /api/processor-requests] Result rows:', rows.length);

        const sanitizedRows = (rows || []).map((row) => {
            const ownProcessor = toPositiveInt(row.processor_id) === actorId;
            const ownRecycler = toPositiveInt(row.recycler_id) === actorId;
            const canViewFullPhone = isAdmin(req) || ownProcessor || ownRecycler;

            return {
                ...row,
                processor_phone: canViewFullPhone ? (row.processor_phone || '') : maskPhone(row.processor_phone),
                contact_phone: canViewFullPhone ? (row.contact_phone || '') : maskPhone(row.contact_phone)
            };
        });

        res.json(sanitizedRows);
    });
});

// Get single processor request
app.get('/api/processor-requests/:id', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const db = openDb();
    // Return with aliased fields for API consistency
    db.get(`SELECT pr.*, 
            pr.citrus_variety as citrus_type,
            pr.address as location_address,
            u.full_name as processor_name, 
            u.phone as processor_phone
            FROM processor_requests pr
            LEFT JOIN users u ON pr.processor_id = u.id
            WHERE pr.id = ?`, [req.params.id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '求购信息不存在' });

        const ownProcessor = toPositiveInt(row.processor_id) === actorId;
        const ownRecycler = toPositiveInt(row.recycler_id) === actorId;

        if (!isAdmin(req)) {
            if (isProcessorActor(req)) {
                if (!ownProcessor) return res.status(403).json({ error: '无权查看该求购信息' });
            } else if (isRecyclerActor(req)) {
                if (!ownRecycler && row.status !== 'active') {
                    return res.status(403).json({ error: '无权查看该求购信息' });
                }
            } else if (req.user.role === 'farmer') {
                if (!(row.status === 'active' && Number(row.has_transport) === 1)) {
                    return res.status(403).json({ error: '无权查看该求购信息' });
                }
            } else {
                return res.status(403).json({ error: '无权查看该求购信息' });
            }
        }

        if (!isAdmin(req) && !ownProcessor && !ownRecycler) {
            row.contact_phone = maskPhone(row.contact_phone);
            row.processor_phone = maskPhone(row.processor_phone);
        }

        res.json(row);
    });
});

// Update processor request status
app.patch('/api/processor-requests/:id/status', (req, res) => {
    const { status, processor_id } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isProcessorActor(req)) {
        return res.status(403).json({ error: '仅处理商可更新求购状态' });
    }

    if (!isAdmin(req) && processor_id && !ensureSelfOrAdmin(req, processor_id)) {
        return res.status(403).json({ error: '禁止更新他人求购状态' });
    }

    const parsedProcessorId = processor_id !== undefined ? toPositiveInt(processor_id) : null;
    if (processor_id !== undefined && !parsedProcessorId) {
        return res.status(400).json({ error: '缺少有效处理商ID' });
    }

    const db = openDb();

    isTargetUnderActiveArbitration(db, 'processor_request', req.params.id, (lockErr, locked) => {
        if (lockErr) {
            db.close();
            return res.status(500).json({ error: lockErr.message });
        }
        if (locked) {
            db.close();
            return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可变更状态' });
        }

        let sql = `UPDATE processor_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`;
        const params = [status, req.params.id];
        if (isAdmin(req)) {
            if (parsedProcessorId) {
                sql += ` AND processor_id = ?`;
                params.push(parsedProcessorId);
            }
        } else {
            sql += ` AND processor_id = ?`;
            params.push(actorId);
        }

        db.run(sql,
            params, function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
                res.json({ success: true });
            });
    });
});

// Recycler accepts processor request
app.post('/api/processor-requests/:id/accept', (req, res) => {
    const { recycler_id } = req.body;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const parsedRecyclerId = toPositiveInt(recycler_id);
    if (!parsedRecyclerId) return res.status(400).json({ error: '缺少回收商ID' });
    if (!isAdmin(req) && ((req.user.role !== 'recycler' && req.user.role !== 'merchant') || !ensureSelfOrAdmin(req, parsedRecyclerId))) {
        return res.status(403).json({ error: '仅回收商本人可接单' });
    }
    
    const db = openDb();
    
    // Check if already accepted
    db.get(`SELECT * FROM processor_requests WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) { db.close(); return res.status(500).json({ error: err.message }); }
        if (!row) { db.close(); return res.status(404).json({ error: '求购信息不存在' }); }

        isTargetUnderActiveArbitration(db, 'processor_request', req.params.id, (lockErr, locked) => {
            if (lockErr) {
                db.close();
                return res.status(500).json({ error: lockErr.message });
            }
            if (locked) {
                db.close();
                return res.status(409).json({ error: '仲裁处理中，相关订单已冻结，暂不可接单' });
            }

            if (row.status !== 'active') { db.close(); return res.status(400).json({ error: '仅可接单处于 active 状态的求购信息' }); }
            if (row.valid_until && new Date(row.valid_until) < new Date()) { db.close(); return res.status(400).json({ error: '该求购信息已过期，无法接单' }); }
            if (row.recycler_id) { db.close(); return res.status(400).json({ error: '该订单已被其他回收商接单' }); }

            // 使用条件更新降低并发下重复接单风险
            db.run(
                `UPDATE processor_requests
                 SET recycler_id = ?, updated_at = datetime('now')
                 WHERE id = ?
                   AND recycler_id IS NULL
                   AND status = 'active'
                   AND (valid_until IS NULL OR valid_until >= date('now'))`,
                [parsedRecyclerId, req.params.id], function(err) {
                    db.close();
                    if (err) return res.status(500).json({ error: err.message });
                    if (this.changes === 0) return res.status(409).json({ error: '该订单状态已变化，请刷新后重试' });
                    res.json({ success: true });
                }
            );
        });
    });
});

// Delete processor request (only drafts)
app.delete('/api/processor-requests/:id', (req, res) => {
    const { processor_id } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    if (!isAdmin(req) && !isProcessorActor(req)) {
        return res.status(403).json({ error: '仅处理商可删除求购' });
    }

    if (!isAdmin(req) && processor_id && !ensureSelfOrAdmin(req, processor_id)) {
        return res.status(403).json({ error: '禁止删除他人求购' });
    }

    const parsedProcessorId = processor_id !== undefined ? toPositiveInt(processor_id) : null;
    if (processor_id !== undefined && !parsedProcessorId) {
        return res.status(400).json({ error: '缺少有效处理商ID' });
    }

    const db = openDb();

    let sql = `DELETE FROM processor_requests WHERE id = ? AND status = 'draft'`;
    const params = [req.params.id];
    if (isAdmin(req)) {
        if (parsedProcessorId) {
            sql += ` AND processor_id = ?`;
            params.push(parsedProcessorId);
        }
    } else {
        sql += ` AND processor_id = ?`;
        params.push(actorId);
    }

    db.run(sql,
        params, function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: '无法删除：求购信息不存在或已发布' });
            res.json({ success: true });
        });
});


// Upload files for arbitration
app.post('/api/upload-arbitration-files', upload.array('files', 20), validateArbitrationUploadMagic, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: '没有上传文件' });
        }
        
        const fileInfos = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            path: `/uploads/arbitration/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype
        }));
        
        res.json({ success: true, files: fileInfos });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ CMS Content APIs ============

// --- 公告管理 ---
app.get('/api/cms/announcements', (req, res) => {
    const db = openDb();
    const activeOnly = req.query.active === '1' || !isAdmin(req);
    const sql = activeOnly
        ? `SELECT * FROM cms_announcements WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
        : `SELECT * FROM cms_announcements ORDER BY sort_order ASC, created_at DESC`;
    db.all(sql, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/cms/announcements', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { type, title, summary, image_url, link_url, doc_number, sort_order, is_active, created_by } = req.body;
    const actorId = getActorId(req);
    if (!type || !title) return res.status(400).json({ error: '类型和标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_announcements(type, title, summary, image_url, link_url, doc_number, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
        [type, title, summary || '', image_url || '', link_url || '', doc_number || '', sort_order || 0, is_active !== undefined ? is_active : 1, actorId || created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/announcements/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { type, title, summary, image_url, link_url, doc_number, sort_order, is_active } = req.body;
    const db = openDb();
    db.run(`UPDATE cms_announcements SET type=?, title=?, summary=?, image_url=?, link_url=?, doc_number=?, sort_order=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
        [type, title, summary, image_url, link_url, doc_number, sort_order, is_active, req.params.id],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        });
});

app.delete('/api/cms/announcements/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = openDb();
    db.run(`DELETE FROM cms_announcements WHERE id=?`, [req.params.id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- 成功案例管理 ---
app.get('/api/cms/cases', (req, res) => {
    const db = openDb();
    const activeOnly = req.query.active === '1' || !isAdmin(req);
    const sql = activeOnly
        ? `SELECT * FROM cms_cases WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
        : `SELECT * FROM cms_cases ORDER BY sort_order ASC, created_at DESC`;
    db.all(sql, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/cms/cases', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active, created_by } = req.body;
    const actorId = getActorId(req);
    if (!title) return res.status(400).json({ error: '标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_cases(title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [title, description || '', buyer_name || '', seller_name || '', trade_data || '', thumbnail_url || '', logo_url || '', sort_order || 0, is_active !== undefined ? is_active : 1, actorId || created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/cases/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active } = req.body;
    const db = openDb();
    db.run(`UPDATE cms_cases SET title=?, description=?, buyer_name=?, seller_name=?, trade_data=?, thumbnail_url=?, logo_url=?, sort_order=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
        [title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active, req.params.id],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        });
});

app.delete('/api/cms/cases/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = openDb();
    db.run(`DELETE FROM cms_cases WHERE id=?`, [req.params.id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- 广告位管理 ---
app.get('/api/cms/ads', (req, res) => {
    const db = openDb();
    const activeOnly = req.query.active === '1' || !isAdmin(req);
    const sql = activeOnly
        ? `SELECT * FROM cms_ads WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
        : `SELECT * FROM cms_ads ORDER BY sort_order ASC, created_at DESC`;
    db.all(sql, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/cms/ads', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, company_name, description, image_url, contact_info, badge, sort_order, is_active, created_by } = req.body;
    const actorId = getActorId(req);
    if (!title) return res.status(400).json({ error: '标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_ads(title, company_name, description, image_url, contact_info, badge, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
        [title, company_name || '', description || '', image_url || '', contact_info || '', badge || '官方认证合作商', sort_order || 0, is_active !== undefined ? is_active : 1, actorId || created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/ads/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { title, company_name, description, image_url, contact_info, badge, sort_order, is_active } = req.body;
    const db = openDb();
    db.run(`UPDATE cms_ads SET title=?, company_name=?, description=?, image_url=?, contact_info=?, badge=?, sort_order=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
        [title, company_name, description, image_url, contact_info, badge, sort_order, is_active, req.params.id],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        });
});

app.delete('/api/cms/ads/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = openDb();
    db.run(`DELETE FROM cms_ads WHERE id=?`, [req.params.id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- 底部信息管理 ---
app.get('/api/cms/site-info', (req, res) => {
    const db = openDb();
    db.all(`SELECT * FROM cms_site_info`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        const info = {};
        (rows || []).forEach(r => { info[r.info_key] = r.info_value; });
        res.json(info);
    });
});

app.put('/api/cms/site-info', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = openDb();
    const entries = Object.entries(req.body);
    let done = 0;
    entries.forEach(([key, value]) => {
        db.run(`INSERT INTO cms_site_info(info_key, info_value) VALUES(?,?) ON CONFLICT(info_key) DO UPDATE SET info_value=?, updated_at=datetime('now')`,
            [key, value, value], (err) => {
                done++;
                if (done === entries.length) {
                    db.close();
                    res.json({ success: true });
                }
            });
    });
    if (entries.length === 0) { db.close(); res.json({ success: true }); }
});

// --- CMS图片上传 ---
const cmsUploadDir = path.join(__dirname, 'uploads', 'cms');
if (!fs.existsSync(cmsUploadDir)) {
    fs.mkdirSync(cmsUploadDir, { recursive: true });
}

const cmsStorage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, cmsUploadDir); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cms-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const cmsUpload = multer({
    storage: cmsStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        return cb(new Error('CMS 上传仅支持 JPG/PNG 图片'));
    }
});

app.post('/api/cms/upload', adminOnly, cmsUpload.single('file'), validateCmsUploadMagic, (req, res) => {
    if (!req.file) return res.status(400).json({ error: '没有上传文件' });
    res.json({ success: true, url: `/uploads/cms/${req.file.filename}`, originalName: req.file.originalname });
});

// ============ Arbitration APIs ============

function getArbitrationTargetPartyIds(db, orderType, orderId, callback) {
    const targetConfigMap = {
        order: {
            sql: `SELECT farmer_id, recycler_id FROM orders WHERE id = ?`,
            resolvePartyIds: (row) => [toPositiveInt(row.farmer_id), toPositiveInt(row.recycler_id)]
        },
        farmer_report: {
            sql: `SELECT farmer_id, recycler_id FROM farmer_reports WHERE id = ?`,
            resolvePartyIds: (row) => [toPositiveInt(row.farmer_id), toPositiveInt(row.recycler_id)]
        },
        recycler_request: {
            sql: `SELECT recycler_id FROM recycler_requests WHERE id = ?`,
            resolvePartyIds: (row) => [toPositiveInt(row.recycler_id)]
        },
        processor_request: {
            sql: `SELECT processor_id, recycler_id FROM processor_requests WHERE id = ?`,
            resolvePartyIds: (row) => [toPositiveInt(row.processor_id), toPositiveInt(row.recycler_id)]
        }
    };

    const config = targetConfigMap[orderType];
    if (!config) return callback(null, null);

    db.get(config.sql, [orderId], (err, row) => {
        if (err) return callback(err, null);
        if (!row) return callback(null, null);

        const partyIds = config.resolvePartyIds(row).filter(Boolean);
        return callback(null, partyIds);
    });
}

// Submit arbitration request
app.post('/api/arbitration-requests', (req, res) => {
    const { 
        applicant_id, order_type, order_id, order_no, reason, description,
        evidence_trade, evidence_material, evidence_payment, 
        evidence_communication, evidence_other 
    } = req.body;

    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const finalApplicantId = isAdmin(req) ? toPositiveInt(applicant_id) : actorId;
    if (!finalApplicantId) {
        return res.status(400).json({ error: '缺少有效申请人ID' });
    }
    if (!isAdmin(req) && applicant_id && !ensureSelfOrAdmin(req, applicant_id)) {
        return res.status(403).json({ error: '禁止代他人提交仲裁' });
    }

    const parsedOrderId = toPositiveInt(order_id);
    if (!parsedOrderId) {
        return res.status(400).json({ error: '缺少有效订单ID' });
    }

    const allowedOrderTypes = ['order', 'farmer_report', 'recycler_request', 'processor_request'];
    if (!allowedOrderTypes.includes(order_type)) {
        return res.status(400).json({ error: '无效订单类型' });
    }
    
    if (!order_type || !order_id || !order_no || !reason || !description) {
        return res.status(400).json({ error: '请填写所有必填项' });
    }

    const normalizedEvidenceTrade = Array.isArray(evidence_trade) ? evidence_trade.filter(Boolean) : [];
    const normalizedEvidenceMaterial = Array.isArray(evidence_material) ? evidence_material.filter(Boolean) : [];
    const normalizedEvidencePayment = Array.isArray(evidence_payment) ? evidence_payment.filter(Boolean) : [];
    const normalizedEvidenceCommunication = Array.isArray(evidence_communication) ? evidence_communication.filter(Boolean) : [];
    const normalizedEvidenceOther = Array.isArray(evidence_other) ? evidence_other.filter(Boolean) : [];
    const arbitrationFileRefs = collectArbitrationFileRefs({
        evidence_trade: normalizedEvidenceTrade,
        evidence_material: normalizedEvidenceMaterial,
        evidence_payment: normalizedEvidencePayment,
        evidence_communication: normalizedEvidenceCommunication,
        evidence_other: normalizedEvidenceOther,
    });
    
    // 验证必须的证据材料
    if (normalizedEvidenceTrade.length === 0 || normalizedEvidenceMaterial.length === 0 || normalizedEvidencePayment.length === 0) {
        return res.status(400).json({ error: '请上传必需的证据材料：平台交易凭证、废料相关证据、资金往来凭证' });
    }
    
    const db = openDb();
    const arbitrationNo = 'ARB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    getArbitrationTargetPartyIds(db, order_type, parsedOrderId, (targetErr, partyIds) => {
        if (targetErr) {
            db.close();
            return res.status(500).json({ error: targetErr.message });
        }
        if (!partyIds) {
            db.close();
            return res.status(404).json({ error: '关联订单不存在，无法发起仲裁' });
        }

        isTargetUnderActiveArbitration(db, order_type, parsedOrderId, (lockErr, locked) => {
            if (lockErr) {
                db.close();
                return res.status(500).json({ error: lockErr.message });
            }
            if (locked) {
                db.close();
                return res.status(409).json({ error: '该订单已在仲裁处理中，请勿重复提交' });
            }

            const respondentId = partyIds.find((id) => id !== finalApplicantId) || null;

            db.run(`INSERT INTO arbitration_requests (
                arbitration_no, applicant_id, respondent_id, order_type, order_id, order_no, reason, description,
                evidence_trade, evidence_material, evidence_payment, evidence_communication, evidence_other
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                arbitrationNo, finalApplicantId, respondentId, order_type, parsedOrderId, order_no, reason, description,
                JSON.stringify(normalizedEvidenceTrade),
                JSON.stringify(normalizedEvidenceMaterial),
                JSON.stringify(normalizedEvidencePayment),
                JSON.stringify(normalizedEvidenceCommunication),
                JSON.stringify(normalizedEvidenceOther)
            ], function(err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }

                const arbitrationId = this.lastID;
                saveArbitrationFileRefs(db, arbitrationId, arbitrationFileRefs, (refErr) => {
                    db.close();
                    if (refErr) return res.status(500).json({ error: refErr.message });
                    return res.json({ success: true, id: arbitrationId, arbitration_no: arbitrationNo });
                });
            });
        });
    });
});

// Get arbitration requests (for applicant)
app.get('/api/arbitration-requests', (req, res) => {
    const { applicant_id, status } = req.query;
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const finalApplicantId = isAdmin(req) ? toPositiveInt(applicant_id || actorId) : actorId;
    if (!finalApplicantId) {
        return res.status(400).json({ error: '缺少有效申请人ID' });
    }
    if (!isAdmin(req) && applicant_id && !ensureSelfOrAdmin(req, applicant_id)) {
        return res.status(403).json({ error: '禁止查看他人仲裁申请' });
    }
    
    const db = openDb();
    let sql = `
        SELECT ar.*, 
               u1.full_name as applicant_name,
               r1.name as applicant_role,
               u2.full_name as respondent_name,
               u3.full_name as decided_by_name
        FROM arbitration_requests ar
        LEFT JOIN users u1 ON ar.applicant_id = u1.id
        LEFT JOIN roles r1 ON u1.role_id = r1.id
        LEFT JOIN users u2 ON ar.respondent_id = u2.id
        LEFT JOIN users u3 ON ar.decided_by = u3.id
        WHERE ar.applicant_id = ?
    `;
    
    const params = [finalApplicantId];
    
    if (status && status !== 'all') {
        sql += ' AND ar.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY ar.created_at DESC';
    
    db.all(sql, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse JSON fields
        const result = rows.map(row => ({
            ...row,
            evidence_trade: JSON.parse(row.evidence_trade || '[]'),
            evidence_material: JSON.parse(row.evidence_material || '[]'),
            evidence_payment: JSON.parse(row.evidence_payment || '[]'),
            evidence_communication: JSON.parse(row.evidence_communication || '[]'),
            evidence_other: JSON.parse(row.evidence_other || '[]')
        }));
        
        res.json(result);
    });
});

// Get all arbitration requests (for admin)
app.get('/api/arbitration-requests/all', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { status } = req.query;
    
    const db = openDb();
    let sql = `
        SELECT ar.*, 
               u1.full_name as applicant_name, u1.phone as applicant_phone,
               r1.name as applicant_role,
               u2.full_name as respondent_name,
               u3.full_name as decided_by_name
        FROM arbitration_requests ar
        LEFT JOIN users u1 ON ar.applicant_id = u1.id
        LEFT JOIN roles r1 ON u1.role_id = r1.id
        LEFT JOIN users u2 ON ar.respondent_id = u2.id
        LEFT JOIN users u3 ON ar.decided_by = u3.id
    `;
    
    const params = [];
    
    if (status && status !== 'all') {
        sql += ' WHERE ar.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY ar.created_at DESC';
    
    db.all(sql, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse JSON fields
        const result = rows.map(row => ({
            ...row,
            evidence_trade: JSON.parse(row.evidence_trade || '[]'),
            evidence_material: JSON.parse(row.evidence_material || '[]'),
            evidence_payment: JSON.parse(row.evidence_payment || '[]'),
            evidence_communication: JSON.parse(row.evidence_communication || '[]'),
            evidence_other: JSON.parse(row.evidence_other || '[]')
        }));
        
        res.json(result);
    });
});

// Update arbitration request (for admin)
app.patch('/api/arbitration-requests/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    const { status, admin_notes, decision, decided_by, respondent_id, decided_at,
            penalty_amount, penalty_party, penalty_reason, penalty_status, order_amount } = req.body;
    
    const db = openDb();
    const updates = [];
    const params = [];
    
    if (status) {
        updates.push('status = ?');
        params.push(status);
    }
    
    if (admin_notes !== undefined) {
        updates.push('admin_notes = ?');
        params.push(admin_notes);
    }
    
    if (decision !== undefined) {
        updates.push('decision = ?');
        params.push(decision);
    }
    
    if (decided_by !== undefined) {
        updates.push('decided_by = ?');
        params.push(decided_by);
    }
    
    if (decided_at !== undefined) {
        updates.push('decided_at = ?');
        params.push(decided_at);
    }
    
    if (respondent_id !== undefined) {
        updates.push('respondent_id = ?');
        params.push(respondent_id);
    }
    
    if (penalty_amount !== undefined) {
        updates.push('penalty_amount = ?');
        params.push(penalty_amount);
    }
    
    if (penalty_party !== undefined) {
        updates.push('penalty_party = ?');
        params.push(penalty_party);
    }
    
    if (penalty_reason !== undefined) {
        updates.push('penalty_reason = ?');
        params.push(penalty_reason);
    }
    
    if (penalty_status !== undefined) {
        updates.push('penalty_status = ?');
        params.push(penalty_status);
    }
    
    if (order_amount !== undefined) {
        updates.push('order_amount = ?');
        params.push(order_amount);
    }
    
    updates.push('updated_at = datetime("now")');
    params.push(id);
    
    const sql = `UPDATE arbitration_requests SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(sql, params, function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '仲裁记录不存在' });
        res.json({ success: true });
    });
});

// Set penalty for arbitration (管理员设置罚款)
app.post('/api/arbitration-requests/:id/penalty', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    const { penalty_party, penalty_amount, penalty_reason, order_amount } = req.body;
    
    if (!penalty_party || !penalty_amount || penalty_amount <= 0) {
        return res.status(400).json({ error: '请提供被罚方和罚款金额' });
    }
    
    if (!['applicant', 'respondent'].includes(penalty_party)) {
        return res.status(400).json({ error: '被罚方必须是申请人或被申请人' });
    }
    
    const db = openDb();
    
    // 如果没有提供订单金额，尝试从订单中获取
    if (!order_amount || order_amount === 0) {
        db.get(`SELECT order_amount FROM arbitration_requests WHERE id = ?`, [id], (err, row) => {
            if (err || !row) {
                db.close();
                return res.status(500).json({ error: '获取订单信息失败' });
            }
            
            const finalAmount = order_amount || row.order_amount || 0;
            updatePenalty(db, id, penalty_party, penalty_amount, penalty_reason, finalAmount, res);
        });
    } else {
        updatePenalty(db, id, penalty_party, penalty_amount, penalty_reason, order_amount, res);
    }
});

function updatePenalty(db, id, penalty_party, penalty_amount, penalty_reason, order_amount, res) {
    const sql = `
        UPDATE arbitration_requests 
        SET penalty_party = ?,
            penalty_amount = ?,
            penalty_reason = ?,
            penalty_status = 'pending',
            order_amount = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `;
    
    db.run(sql, [penalty_party, penalty_amount, penalty_reason, order_amount, id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '仲裁记录不存在' });
        res.json({ success: true, message: '罚款设置成功' });
    });
}

function verifyPenaltyPaymentAccess(req, res, next) {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    // 管理员保留代付排障能力，具体 payer_id 在处理函数内再次校验。
    if (isAdmin(req)) return next();

    const arbitrationId = toPositiveInt(req.params.id);
    if (!arbitrationId) return res.status(400).json({ error: '仲裁ID无效' });

    const db = openDb();
    db.get(
        `SELECT id, penalty_party, penalty_status, applicant_id, respondent_id
         FROM arbitration_requests
         WHERE id = ?`,
        [arbitrationId],
        (err, row) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: '仲裁记录不存在' });
            if (row.penalty_status !== 'pending') {
                return res.status(400).json({ error: '该罚款不需要支付或已支付' });
            }

            const canPay =
                (row.penalty_party === 'applicant' && toPositiveInt(row.applicant_id) === actorId) ||
                (row.penalty_party === 'respondent' && toPositiveInt(row.respondent_id) === actorId);
            if (!canPay) return res.status(403).json({ error: '您不是被罚方，无法支付罚款' });

            return next();
        }
    );
}

// Pay penalty (用户支付罚款)
app.post('/api/arbitration-requests/:id/pay-penalty', verifyPenaltyPaymentAccess, upload.single('proof'), validateArbitrationUploadMagic, (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const payerId = isAdmin(req) ? toPositiveInt(user_id) : actorId;
    if (!payerId) {
        return res.status(400).json({ error: '缺少有效用户ID' });
    }
    if (!isAdmin(req) && user_id && !ensureSelfOrAdmin(req, user_id)) {
        return res.status(403).json({ error: '禁止替他人支付罚款' });
    }
    
    const db = openDb();
    
    // 验证用户是否是被罚方
    db.get(`
        SELECT ar.*, 
               applicant.id as applicant_id,
               respondent.id as respondent_id
        FROM arbitration_requests ar
        LEFT JOIN users applicant ON ar.applicant_id = applicant.id
        LEFT JOIN users respondent ON ar.respondent_id = respondent.id
        WHERE ar.id = ?
    `, [id], (err, row) => {
        if (err || !row) {
            db.close();
            return res.status(500).json({ error: '获取仲裁信息失败' });
        }
        
        // 检查用户是否是被罚方
        const isPenaltyTarget = (
            (row.penalty_party === 'applicant' && toPositiveInt(row.applicant_id) === payerId) ||
            (row.penalty_party === 'respondent' && toPositiveInt(row.respondent_id) === payerId)
        );
        
        if (!isPenaltyTarget) {
            db.close();
            return res.status(403).json({ error: '您不是被罚方，无法支付罚款' });
        }
        
        if (row.penalty_status !== 'pending') {
            db.close();
            return res.status(400).json({ error: '该罚款不需要支付或已支付' });
        }
        
        // 获取上传的凭证路径
        const proofPath = req.file ? `/uploads/arbitration/${req.file.filename}` : null;
        
        const updateSql = `
            UPDATE arbitration_requests 
            SET penalty_status = 'paid',
                penalty_paid_at = datetime('now'),
                penalty_proof = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `;
        
        db.run(updateSql, [proofPath, id], function(err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }

            const refs = proofPath ? [{ file_group: 'penalty_proof', file_path: proofPath }] : [];
            saveArbitrationFileRefs(db, id, refs, (refErr) => {
                db.close();
                if (refErr) return res.status(500).json({ error: refErr.message });
                return res.json({ success: true, message: '罚款已提交，等待管理员确认' });
            });
        });
    });
});

// ─────────────────────────────────────────────
// 站内沟通留痕 API
// ─────────────────────────────────────────────

const CHAT_TARGET_CONFIG = {
    farmer_report: {
        table: 'chat_messages',
        targetColumn: 'report_id',
        ownerSql: `SELECT farmer_id AS owner_primary_id, recycler_id AS owner_secondary_id FROM farmer_reports WHERE id = ?`,
    },
    recycler_request: {
        table: 'request_chat_messages',
        targetColumn: 'request_id',
        ownerSql: `SELECT recycler_id AS owner_primary_id, NULL AS owner_secondary_id FROM recycler_requests WHERE id = ?`,
    },
    processor_request: {
        table: 'processor_chat_messages',
        targetColumn: 'request_id',
        ownerSql: `SELECT processor_id AS owner_primary_id, recycler_id AS owner_secondary_id FROM processor_requests WHERE id = ?`,
    },
};

function resolveChatTargetContext(db, targetType, targetId, callback) {
    const config = CHAT_TARGET_CONFIG[String(targetType || '').trim()];
    const parsedTargetId = toPositiveInt(targetId);
    if (!config || !parsedTargetId) {
        return callback(null, null);
    }

    db.get(config.ownerSql, [parsedTargetId], (err, row) => {
        if (err) return callback(err, null);
        if (!row) return callback(null, null);

        const ownerIds = [toPositiveInt(row.owner_primary_id), toPositiveInt(row.owner_secondary_id)].filter(Boolean);
        return callback(null, {
            config,
            targetId: parsedTargetId,
            ownerIds,
        });
    });
}

function isChatOwner(context, userId) {
    const parsedUserId = toPositiveInt(userId);
    if (!parsedUserId || !context || !Array.isArray(context.ownerIds)) return false;
    return context.ownerIds.includes(parsedUserId);
}

function toChatPageLimit(value, defaultValue = 50) {
    const parsed = toPositiveInt(value);
    if (!parsed) return defaultValue;
    return Math.min(parsed, 200);
}

// POST /api/chats/messages - 发送消息并落库
app.post('/api/chats/messages', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const { target_type, target_id, receiver_id, content } = req.body;
    if (!CHAT_TARGET_CONFIG[String(target_type || '').trim()]) {
        return res.status(400).json({ error: '无效的沟通目标类型' });
    }

    const parsedTargetId = toPositiveInt(target_id);
    const parsedReceiverId = toPositiveInt(receiver_id);
    const message = String(content || '').trim();
    if (!parsedTargetId || !parsedReceiverId || !message) {
        return res.status(400).json({ error: '缺少有效参数（target_id、receiver_id、content）' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ error: '消息长度不能超过 2000 字符' });
    }
    if (parsedReceiverId === actorId) {
        return res.status(400).json({ error: '不能给自己发送消息' });
    }

    const db = openDb();
    resolveChatTargetContext(db, target_type, parsedTargetId, (ctxErr, context) => {
        if (ctxErr) {
            db.close();
            return res.status(500).json({ error: ctxErr.message });
        }
        if (!context) {
            db.close();
            return res.status(404).json({ error: '沟通目标不存在' });
        }

        db.get(`SELECT id FROM users WHERE id = ?`, [parsedReceiverId], (userErr, userRow) => {
            if (userErr) {
                db.close();
                return res.status(500).json({ error: userErr.message });
            }
            if (!userRow) {
                db.close();
                return res.status(404).json({ error: '接收方用户不存在' });
            }

            if (!isAdmin(req)) {
                const actorIsOwner = isChatOwner(context, actorId);
                const receiverIsOwner = isChatOwner(context, parsedReceiverId);
                if (!actorIsOwner && !receiverIsOwner) {
                    db.close();
                    return res.status(403).json({ error: '仅允许与目标所有者沟通' });
                }
            }

            const insertSql = `
                INSERT INTO ${context.config.table} (${context.config.targetColumn}, sender_id, receiver_id, content)
                VALUES (?, ?, ?, ?)
            `;
            db.run(insertSql, [context.targetId, actorId, parsedReceiverId, message], function(insertErr) {
                if (insertErr) {
                    db.close();
                    return res.status(500).json({ error: insertErr.message });
                }

                const messageId = this.lastID;
                const detailSql = `
                    SELECT m.*, su.full_name AS sender_name, ru.full_name AS receiver_name
                    FROM ${context.config.table} m
                    LEFT JOIN users su ON su.id = m.sender_id
                    LEFT JOIN users ru ON ru.id = m.receiver_id
                    WHERE m.id = ?
                `;
                db.get(detailSql, [messageId], (detailErr, detailRow) => {
                    db.close();
                    if (detailErr) return res.status(500).json({ error: detailErr.message });
                    return res.json({ success: true, data: detailRow || { id: messageId } });
                });
            });
        });
    });
});

// GET /api/chats/messages - 查询消息历史
app.get('/api/chats/messages', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const { target_type, target_id, peer_id, limit, before_id } = req.query;
    if (!CHAT_TARGET_CONFIG[String(target_type || '').trim()]) {
        return res.status(400).json({ error: '无效的沟通目标类型' });
    }

    const parsedTargetId = toPositiveInt(target_id);
    const parsedPeerId = peer_id !== undefined ? toPositiveInt(peer_id) : null;
    const parsedBeforeId = before_id !== undefined ? toPositiveInt(before_id) : null;
    if (!parsedTargetId) {
        return res.status(400).json({ error: '缺少有效 target_id' });
    }
    if (peer_id !== undefined && !parsedPeerId) {
        return res.status(400).json({ error: 'peer_id 无效' });
    }

    const pageLimit = toChatPageLimit(limit);
    const db = openDb();
    resolveChatTargetContext(db, target_type, parsedTargetId, (ctxErr, context) => {
        if (ctxErr) {
            db.close();
            return res.status(500).json({ error: ctxErr.message });
        }
        if (!context) {
            db.close();
            return res.status(404).json({ error: '沟通目标不存在' });
        }

        const actorIsAdmin = isAdmin(req);
        const actorIsOwner = actorIsAdmin || isChatOwner(context, actorId);

        if (!actorIsOwner && !parsedPeerId) {
            db.close();
            return res.status(400).json({ error: '非目标所有者查询时必须提供 peer_id' });
        }

        if (!actorIsOwner && parsedPeerId && !isChatOwner(context, parsedPeerId)) {
            db.close();
            return res.status(403).json({ error: '仅允许查询与目标所有者之间的沟通记录' });
        }

        const where = [`m.${context.config.targetColumn} = ?`];
        const params = [context.targetId];

        if (parsedBeforeId) {
            where.push('m.id < ?');
            params.push(parsedBeforeId);
        }

        if (parsedPeerId) {
            where.push(`((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))`);
            params.push(actorId, parsedPeerId, parsedPeerId, actorId);
        } else if (!actorIsAdmin) {
            where.push('(m.sender_id = ? OR m.receiver_id = ?)');
            params.push(actorId, actorId);
        }

        const sql = `
            SELECT m.*, su.full_name AS sender_name, ru.full_name AS receiver_name
            FROM ${context.config.table} m
            LEFT JOIN users su ON su.id = m.sender_id
            LEFT JOIN users ru ON ru.id = m.receiver_id
            WHERE ${where.join(' AND ')}
            ORDER BY m.id DESC
            LIMIT ?
        `;
        params.push(pageLimit);

        db.all(sql, params, (listErr, rows) => {
            db.close();
            if (listErr) return res.status(500).json({ error: listErr.message });

            const items = Array.isArray(rows) ? rows.slice().reverse() : [];
            return res.json({ success: true, data: items });
        });
    });
});

// POST /api/chats/messages/read - 标记与对端的消息为已读
app.post('/api/chats/messages/read', (req, res) => {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: '未授权，请先登录' });

    const { target_type, target_id, peer_id, before_id } = req.body;
    if (!CHAT_TARGET_CONFIG[String(target_type || '').trim()]) {
        return res.status(400).json({ error: '无效的沟通目标类型' });
    }

    const parsedTargetId = toPositiveInt(target_id);
    const parsedPeerId = toPositiveInt(peer_id);
    const parsedBeforeId = before_id !== undefined ? toPositiveInt(before_id) : null;
    if (!parsedTargetId || !parsedPeerId) {
        return res.status(400).json({ error: '缺少有效参数（target_id、peer_id）' });
    }
    if (parsedPeerId === actorId) {
        return res.status(400).json({ error: 'peer_id 不能是自己' });
    }

    const db = openDb();
    resolveChatTargetContext(db, target_type, parsedTargetId, (ctxErr, context) => {
        if (ctxErr) {
            db.close();
            return res.status(500).json({ error: ctxErr.message });
        }
        if (!context) {
            db.close();
            return res.status(404).json({ error: '沟通目标不存在' });
        }

        const actorIsOwner = isAdmin(req) || isChatOwner(context, actorId);
        if (!actorIsOwner && !isChatOwner(context, parsedPeerId)) {
            db.close();
            return res.status(403).json({ error: '仅允许标记与目标所有者的沟通消息' });
        }

        const params = [context.targetId, parsedPeerId, actorId];
        let sql = `
            UPDATE ${context.config.table}
            SET is_read = 1
            WHERE ${context.config.targetColumn} = ?
              AND sender_id = ?
              AND receiver_id = ?
        `;

        if (parsedBeforeId) {
            sql += ' AND id <= ?';
            params.push(parsedBeforeId);
        }

        db.run(sql, params, function(updateErr) {
            db.close();
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            return res.json({ success: true, changes: this.changes || 0 });
        });
    });
});

// ─────────────────────────────────────────────
// 意向投递 API
// ─────────────────────────────────────────────

// POST /api/intentions — 提交意向
app.post('/api/intentions', (req, res) => {
    const { applicant_id, applicant_name, target_type, target_id, target_no, target_name, estimated_weight, expected_date, notes } = req.body;
    const actorId = getActorId(req);
    if (!actorId) {
        return res.status(401).json({ code: 401, msg: '未授权，请先登录', data: null });
    }

    const finalApplicantId = isAdmin(req) ? toPositiveInt(applicant_id) : actorId;
    if (!finalApplicantId || !target_type || !target_id) {
        return res.status(400).json({ code: 400, msg: '缺少必填参数', data: null });
    }
    if (!isAdmin(req) && applicant_id && !ensureSelfOrAdmin(req, applicant_id)) {
        return res.status(403).json({ code: 403, msg: '禁止代他人提交意向', data: null });
    }

    const finalApplicantName =
        (req.user && (req.user.full_name || req.user.username)) || applicant_name || '';

    const db = openDb();
    // 防重复：同一用户对同一目标只能提交一次（pending 状态）
    db.get(
        `SELECT id FROM intentions WHERE applicant_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'`,
        [finalApplicantId, target_type, target_id],
        (err, row) => {
            if (err) { db.close(); return res.status(500).json({ code: 500, msg: err.message, data: null }); }
            if (row) { db.close(); return res.status(409).json({ code: 409, msg: '您已提交过意向，请等待对方回复', data: null }); }
            db.run(
                `INSERT INTO intentions (applicant_id, applicant_name, target_type, target_id, target_no, target_name, estimated_weight, expected_date, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [finalApplicantId, finalApplicantName, target_type, target_id, target_no || '', target_name || '', estimated_weight || null, expected_date || null, notes || ''],
                function(err2) {
                    db.close();
                    if (err2) return res.status(500).json({ code: 500, msg: err2.message, data: null });
                    res.json({ code: 200, msg: '意向提交成功', data: { id: this.lastID } });
                }
            );
        }
    );
});

// GET /api/intentions — 查询意向列表
//   ?applicant_id=X        → 查询我提交的意向
//   ?target_type=X&target_id=Y  → 查询某需求收到的所有意向（需求方使用）
app.get('/api/intentions', (req, res) => {
    const { applicant_id, target_type, target_id } = req.query;
    const actorId = getActorId(req);
    if (!actorId) {
        return res.status(401).json({ code: 401, msg: '未授权，请先登录', data: null });
    }

    const db = openDb();

    const queryAndReturn = (sql, params) => {
        db.all(sql, params, (err, rows) => {
            db.close();
            if (err) return res.status(500).json({ code: 500, msg: err.message, data: null });
            return res.json({ code: 200, msg: 'ok', data: rows });
        });
    };

    if (applicant_id) {
        const finalApplicantId = isAdmin(req) ? toPositiveInt(applicant_id) : actorId;
        if (!finalApplicantId) {
            db.close();
            return res.status(400).json({ code: 400, msg: '缺少有效 applicant_id', data: null });
        }
        if (!isAdmin(req) && !ensureSelfOrAdmin(req, applicant_id)) {
            db.close();
            return res.status(403).json({ code: 403, msg: '禁止查看他人意向记录', data: null });
        }
        return queryAndReturn(
            `SELECT * FROM intentions WHERE applicant_id = ? ORDER BY created_at DESC`,
            [finalApplicantId]
        );
    } else if (target_type && target_id) {
        const parsedTargetId = toPositiveInt(target_id);
        if (!parsedTargetId) {
            db.close();
            return res.status(400).json({ code: 400, msg: 'target_id 无效', data: null });
        }

        if (isAdmin(req)) {
            return queryAndReturn(
                `SELECT * FROM intentions WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC`,
                [target_type, parsedTargetId]
            );
        }

        return canManageIntentionTarget(db, target_type, parsedTargetId, actorId, (authErr, allowed) => {
            if (authErr) {
                db.close();
                return res.status(500).json({ code: 500, msg: authErr.message, data: null });
            }
            if (!allowed) {
                db.close();
                return res.status(403).json({ code: 403, msg: '无权查看该目标的意向列表', data: null });
            }

            return queryAndReturn(
                `SELECT * FROM intentions WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC`,
                [target_type, parsedTargetId]
            );
        });
    } else {
        db.close();
        return res.status(400).json({ code: 400, msg: '请提供 applicant_id 或 target_type+target_id', data: null });
    }
});

// PATCH /api/intentions/:id/status — 更新意向状态（需求方操作：接受/拒绝）
// 当 status='accepted' 时，自动在 orders 表生成一笔真实订单
app.patch('/api/intentions/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = getActorId(req);
    if (!actorId) {
        return res.status(401).json({ code: 401, msg: '未授权，请先登录', data: null });
    }

    if (!['accepted', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ code: 400, msg: '无效状态值', data: null });
    }

    const db = openDb();

    // 1. 先拉取意向详情
    db.get(`SELECT * FROM intentions WHERE id = ?`, [id], (err, intention) => {
        if (err) { db.close(); return res.status(500).json({ code: 500, msg: err.message, data: null }); }
        if (!intention) { db.close(); return res.status(404).json({ code: 404, msg: '意向记录不存在', data: null }); }

        const proceedWithIntention = () => {
            if (status === 'accepted') {
                if (intention.status === 'accepted') {
                    db.close();
                    return res.status(409).json({ code: 409, msg: '该意向已被接受，请勿重复操作', data: null });
                }
                if (intention.status !== 'pending') {
                    db.close();
                    return res.status(400).json({ code: 400, msg: '仅待处理意向可执行接受操作', data: null });
                }
            } else if (intention.status === 'accepted') {
                db.close();
                return res.status(400).json({ code: 400, msg: '已接受的意向不可再修改状态', data: null });
            }

            const continueUpdate = () => {
                // 若不是接受操作，直接更新状态即可
                if (status !== 'accepted') {
                    if (status === intention.status) {
                        db.close();
                        return res.json({ code: 200, msg: '状态未变化', data: null });
                    }
                    db.run(`UPDATE intentions SET status = ? WHERE id = ?`, [status, id], function(e2) {
                        db.close();
                        if (e2) return res.status(500).json({ code: 500, msg: e2.message, data: null });
                        res.json({ code: 200, msg: '状态已更新', data: null });
                    });
                    return;
                }

                // ── 接受意向：先抢占状态锁，再查目标表并生成订单 ─────────────────────────
                db.run(
                    `UPDATE intentions
                     SET status = 'accepted'
                     WHERE id = ? AND status = 'pending'`,
                    [id],
                    function(lockErr) {
                        if (lockErr) {
                            db.close();
                            return res.status(500).json({ code: 500, msg: lockErr.message, data: null });
                        }
                        if (this.changes === 0) {
                            db.close();
                            return res.status(409).json({ code: 409, msg: '该意向状态已变化，请刷新后重试', data: null });
                        }

                        const { applicant_id, target_type, target_id, estimated_weight } = intention;

                        // 根据 target_type 确定目标表和字段
                        let targetTableSql = '';
                        if (target_type === 'farmer_report') {
                            targetTableSql = `SELECT farmer_id, recycler_id, weight_kg FROM farmer_reports WHERE id = ?`;
                        } else if (target_type === 'recycler_request') {
                            targetTableSql = `SELECT recycler_id FROM recycler_requests WHERE id = ?`;
                        } else if (target_type === 'processor_request') {
                            targetTableSql = `SELECT processor_id FROM processor_requests WHERE id = ?`;
                        } else {
                            db.run(`UPDATE intentions SET status = 'pending' WHERE id = ? AND status = 'accepted'`, [id], () => {
                                db.close();
                                return res.status(400).json({ code: 400, msg: '不支持的意向目标类型', data: null });
                            });
                            return;
                        }

                        db.get(targetTableSql, [target_id], (err2, target) => {
                            if (err2 || !target) {
                                db.run(`UPDATE intentions SET status = 'pending' WHERE id = ? AND status = 'accepted'`, [id], () => {
                                    db.close();
                                    return res.status(500).json({ code: 500, msg: err2 ? err2.message : '目标记录不存在', data: null });
                                });
                                return;
                            }

                            // 推导 farmer_id / recycler_id（orders 表复用 recycler_id 存放处理商 ID）
                            let farmer_id, recycler_id;
                            if (target_type === 'farmer_report') {
                                // 投递人是回收商/处理商，目标是农户的申报
                                farmer_id  = target.farmer_id;
                                recycler_id = applicant_id;
                            } else if (target_type === 'recycler_request') {
                                // 投递人是农户，目标是回收商求购
                                farmer_id  = applicant_id;
                                recycler_id = target.recycler_id;
                            } else {
                                // processor_request: 投递人是农户或回收商
                                farmer_id  = applicant_id;
                                recycler_id = target.processor_id;
                            }

                            const weight    = estimated_weight || (target.weight_kg) || 0;
                            const order_no  = `ORD-${Date.now()}`;
                            const orderStatus = 'pending_ship';

                            const insertSql = `INSERT INTO orders (order_no, farmer_id, recycler_id, weight_kg, status, notes)
                                            VALUES (?, ?, ?, ?, ?, ?)`;
                            const notes = `由意向 #${id} 自动生成（${intention.target_no || target_type}）`;

                            db.run(insertSql, [order_no, farmer_id, recycler_id, weight, orderStatus, notes], function(err3) {
                                if (err3) {
                                    db.run(`UPDATE intentions SET status = 'pending' WHERE id = ? AND status = 'accepted'`, [id], () => {
                                        db.close();
                                        return res.status(500).json({ code: 500, msg: '创建订单失败: ' + err3.message, data: null });
                                    });
                                    return;
                                }
                                const order_id = this.lastID;

                                db.close();
                                res.json({
                                    code: 200,
                                    msg: '意向已接受，订单已自动生成',
                                    data: { order_no, order_id }
                                });
                            });
                        });
                    }
                );
            };

            if (isAdmin(req)) {
                return continueUpdate();
            }

            return canManageIntentionTarget(db, intention.target_type, intention.target_id, actorId, (authErr, allowed) => {
                if (authErr) {
                    db.close();
                    return res.status(500).json({ code: 500, msg: authErr.message, data: null });
                }
                if (!allowed) {
                    db.close();
                    return res.status(403).json({ code: 403, msg: '无权处理该意向', data: null });
                }
                return continueUpdate();
            });
        };

        isTargetUnderActiveArbitration(db, intention.target_type, intention.target_id, (lockErr, locked) => {
            if (lockErr) {
                db.close();
                return res.status(500).json({ code: 500, msg: lockErr.message, data: null });
            }
            if (locked) {
                db.close();
                return res.status(409).json({ code: 409, msg: '仲裁处理中，相关订单已冻结，暂不可处理意向', data: null });
            }
            return proceedWithIntention();
        });
    });
});

// Start server
const PORT = process.env.PORT || 4000;

// 自动迁移：每次启动都执行，确保新表存在
async function runMigrations() {
    const db = openDb();
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
    const all = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });

    const migrations = [
        `CREATE TABLE IF NOT EXISTS intentions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            applicant_id INTEGER NOT NULL,
            applicant_name TEXT,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            target_no TEXT,
            target_name TEXT,
            estimated_weight REAL,
            expected_date TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS arbitration_file_refs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            arbitration_id INTEGER NOT NULL,
            file_group TEXT NOT NULL,
            file_path TEXT NOT NULL,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY(arbitration_id) REFERENCES arbitration_requests(id) ON DELETE CASCADE,
            UNIQUE(arbitration_id, file_group, file_path)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_arb_file_refs_arbitration ON arbitration_file_refs(arbitration_id)`,
        `CREATE INDEX IF NOT EXISTS idx_arb_file_refs_path ON arbitration_file_refs(file_path)`
    ];

    try {
        for (const sql of migrations) {
            await run(sql);
        }

        // BUG-001/BUG-002 兼容迁移：修正 processor_requests 历史字段差异
        const processorCols = await all(`PRAGMA table_info(processor_requests)`);
        if (processorCols.length > 0) {
            const colSet = new Set(processorCols.map(c => c.name));

            if (!colSet.has('citrus_variety') && colSet.has('citrus_type')) {
                await run(`ALTER TABLE processor_requests ADD COLUMN citrus_variety TEXT`);
                await run(`UPDATE processor_requests SET citrus_variety = citrus_type WHERE citrus_variety IS NULL OR citrus_variety = ''`);
            }

            if (!colSet.has('address') && colSet.has('location_address')) {
                await run(`ALTER TABLE processor_requests ADD COLUMN address TEXT`);
                await run(`UPDATE processor_requests SET address = location_address WHERE address IS NULL OR address = ''`);
            }

            if (!colSet.has('recycler_id')) {
                await run(`ALTER TABLE processor_requests ADD COLUMN recycler_id INTEGER`);
            }

            await run(`CREATE INDEX IF NOT EXISTS idx_processor_requests_recycler ON processor_requests(recycler_id)`);
        }

        // P1 迁移：将仲裁证据从 JSON 字段回填到结构化引用表。
        const arbitrationCols = await all(`PRAGMA table_info(arbitration_requests)`);
        if (arbitrationCols.length > 0) {
            const arbitrationRows = await all(`
                SELECT id, evidence_trade, evidence_material, evidence_payment,
                       evidence_communication, evidence_other, penalty_proof
                FROM arbitration_requests
            `);

            for (const row of arbitrationRows) {
                const refs = collectArbitrationFileRefs(row);
                for (const ref of refs) {
                    await run(
                        `INSERT OR IGNORE INTO arbitration_file_refs (arbitration_id, file_group, file_path)
                         VALUES (?, ?, ?)`,
                        [row.id, ref.file_group, ref.file_path]
                    );
                }
            }
        }

        console.log('[migrations] Done');
    } finally {
        db.close();
    }
}

if (require.main === module) {
    (async () => {
        if (process.argv.includes('--init')) {
            console.log('Initializing DB...');
            try { await initDb(); } catch (e) { console.error(e); process.exit(1); }
        }

        // 每次启动运行增量迁移
        try { await runMigrations(); } catch (e) { console.error('[migrations] Error:', e.message); }

        server.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}`);
            console.log('Use POST /init to init DB, or run `node server.js --init`');
        });
    })();
}

module.exports = { app, initDb };
