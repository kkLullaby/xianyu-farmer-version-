const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpSms } = require('./smsClient');
const multer = require('multer');

const JWT_SECRET = 'agri_waste_super_secret_key_2026';
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || '';

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

            const hash = bcrypt.hashSync(u.password, 8);
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
    // Disable client-side caching for sensitive content
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
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
    keyGenerator: (req, res) => req.body.phone || req.ip, // Rate limit by phone number
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
    if (
        publicRoutes.includes(req.path) ||
        req.path.startsWith('/uploads') ||
        (req.method === 'GET' && publicPrefixes.some(p => req.path.startsWith(p)))
    ) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[Auth] 401 拒绝: ${req.method} ${req.originalUrl} (req.path=${req.path}, 无 Bearer Token)`);
        return res.status(401).json({ error: '未授权，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // SEC-014: Add security header for HSTS (enforce HTTPS)
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
    } catch (err) {
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

// 提供静态文件（HTML、CSS、JS等）
app.use(express.static(path.join(__dirname)));
// 提供上传文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/config/amap', (req, res) => {
    if (!AMAP_WEB_KEY) {
        return res.status(503).json({ error: '地图服务未配置，请联系管理员' });
    }
    return res.json({
        key: AMAP_WEB_KEY,
        version: '2.0',
        plugins: ['AMap.Driving'],
    });
});

app.post('/init', async (req, res) => {
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

    if (!agreementAccepted) return res.status(400).json({ error: '请先勾选协议' });
    if (!isValidPhone(phone)) return res.status(400).json({ error: '手机号格式不正确' });
    if (!otp) return res.status(400).json({ error: '缺少验证码' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });
    if (!role) return res.status(400).json({ error: '请选择身份' });

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
            db.get(`SELECT id FROM roles WHERE name = ?`, [role], (err2, roleRow) => {
                if (err2) { db.close(); return res.status(500).json({ error: err2.message }); }
                if (!roleRow) { db.close(); return res.status(400).json({ error: '无效的身份' }); }

                const hash = bcrypt.hashSync(password, 10);
                const username = phone;

                db.run(`INSERT INTO users(username,password_hash,role_id,full_name,phone) VALUES(?,?,?,?,?)`, [username, hash, roleRow.id, full_name || null, phone], function(err3) {
                    db.close();
                    if (err3) {
                        if (err3.message && err3.message.includes('UNIQUE')) {
                            return res.status(400).json({ error: '该手机号已注册' });
                        }
                        return res.status(500).json({ error: err3.message });
                    }
                    
                    const userPayload = { id: this.lastID, username, phone, role, full_name: full_name || null };
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
    if (!username || !password || !role) return res.status(400).json({ error: 'missing fields' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });

    const db = openDb();
    db.get(`SELECT id FROM roles WHERE name = ?`, [role], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: 'invalid role' });

        const hash = bcrypt.hashSync(password, 10);
        db.run(`INSERT INTO users(username,password_hash,role_id,full_name) VALUES(?,?,?,?)`, [username, hash, row.id, full_name || null], function(err2) {
            db.close();
            if (err2) return res.status(500).json({ error: err2.message });
            
            const userPayload = { id: this.lastID, username, role, full_name: full_name || null };
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
        if (!row) return res.status(401).json({ error: '用户不存在' });

        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) return res.status(401).json({ error: '密码错误' });

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

// Create order
app.post('/api/orders', (req, res) => {
    const { farmer_id, recycler_id, location_id, weight_kg, price_per_kg, notes } = req.body;
    if (!farmer_id || !weight_kg) return res.status(400).json({ error: 'missing required fields' });

    const orderNo = 'ORD-' + Date.now();
    const total = price_per_kg ? (price_per_kg * weight_kg) : null;

    const db = openDb();
    db.run(`INSERT INTO orders(order_no, farmer_id, recycler_id, location_id, weight_kg, price_per_kg, total_price, notes) VALUES(?,?,?,?,?,?,?,?)`,
        [orderNo, farmer_id, recycler_id || null, location_id || null, weight_kg, price_per_kg || null, total, notes || null], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, order_no: orderNo });
        });
});

// Get orders (optional filters: farmer_id, recycler_id, status)
app.get('/api/orders', (req, res) => {
    const { farmer_id, recycler_id, status } = req.query;
    const db = openDb();
    let q = `SELECT o.*, u.username as farmer_username, r.username as recycler_username FROM orders o LEFT JOIN users u ON o.farmer_id=u.id LEFT JOIN users r ON o.recycler_id=r.id`;
    const params = [];
    const conditions = [];
    if (farmer_id) { conditions.push('o.farmer_id = ?'); params.push(farmer_id); }
    if (recycler_id) { conditions.push('o.recycler_id = ?'); params.push(recycler_id); }
    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');

    db.all(q, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
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
                        phone: r.phone,
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
    
    if (!farmer_id) return res.status(400).json({ error: '缺少农户ID' });
    
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
             JSON.stringify(photo_urls || []), status || 'draft', notes, id, farmer_id],
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
            [reportNo, farmer_id, pickup_date, weight_kg, location_address, location_lat, location_lng,
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
    
    const db = openDb();
    let q = `SELECT fr.*, u.full_name as farmer_name, u.phone as farmer_phone 
             FROM farmer_reports fr 
             LEFT JOIN users u ON fr.farmer_id = u.id 
             WHERE 1=1`;
    const params = [];
    
    if (farmer_id) {
        q += ` AND fr.farmer_id = ?`;
        params.push(farmer_id);
    } else if (recycler_id) {
        q += ` AND fr.recycler_id = ?`;
        params.push(recycler_id);
    } else {
        // If neither is provided, maybe return error or empty? 
        // For security, let's require at least one.
        // Actually, existing frontend calls it with farmer_id.
        return res.status(400).json({ error: 'Need farmer_id or recycler_id' });
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
    const db = openDb();
    db.get(`SELECT * FROM farmer_reports WHERE id = ?`, [req.params.id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '申报不存在' });
        res.json({ ...row, photo_urls: JSON.parse(row.photo_urls || '[]') });
    });
});

// Get all published reports for recyclers (农户供应列表)
app.get('/api/farmer-supplies', (req, res) => {
    const { sort_by, recycler_lat, recycler_lng } = req.query;
    const db = openDb();
    
    db.all(`SELECT fr.*, u.full_name as farmer_name, u.phone as farmer_phone
            FROM farmer_reports fr
            JOIN users u ON fr.farmer_id = u.id
            WHERE fr.status = 'pending'
            ORDER BY fr.created_at DESC`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        let results = rows.map(r => ({
            ...r,
            photo_urls: JSON.parse(r.photo_urls || '[]'),
            distance: (recycler_lat && recycler_lng && r.location_lat && r.location_lng) 
                ? calculateDistance(parseFloat(recycler_lat), parseFloat(recycler_lng), r.location_lat, r.location_lng)
                : null
        }));
        
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
    const db = openDb();
    
    let query = `SELECT rs.*, u.full_name as recycler_name, u.phone as recycler_phone
                 FROM recycler_supplies rs
                 LEFT JOIN users u ON rs.recycler_id = u.id
                 WHERE 1=1`;
    const params = [];
    
    if (recycler_id) {
        query += ` AND rs.recycler_id = ?`;
        params.push(recycler_id);
    }
    
    if (status) {
        query += ` AND rs.status = ?`;
        params.push(status);
    } else {
        // 默认只显示激活状态
        query += ` AND rs.status = 'active'`;
    }
    
    query += ` AND (rs.valid_until IS NULL OR rs.valid_until >= date('now'))`;
    query += ` ORDER BY rs.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        
        const results = rows.map(r => ({
            ...r,
            photo_urls: JSON.parse(r.photo_urls || '[]')
        }));
        res.json(results);
    });
});

// Create recycler supply
app.post('/api/recycler-supplies', (req, res) => {
    const { recycler_id, grade, stock_weight, contact_name, contact_phone, address, notes, valid_until, status } = req.body;
    
    if (!recycler_id || !grade || !stock_weight || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '缺少必填字段' });
    }
    
    const db = openDb();
    const supplyNo = 'RSUP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    db.run(`INSERT INTO recycler_supplies (supply_no, recycler_id, grade, stock_weight, contact_name, contact_phone, address, notes, valid_until, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [supplyNo, recycler_id, grade, stock_weight, contact_name, contact_phone, address || null, notes || null, valid_until || null, status || 'draft'],
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
    const db = openDb();
    
    db.run(`UPDATE recycler_supplies SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, req.params.id],
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
    const db = openDb();
    
    let q = `UPDATE farmer_reports SET status = ?, updated_at = datetime('now')`;
    const params = [status];

    if (recycler_id !== undefined) {
        q += `, recycler_id = ?`;
        params.push(recycler_id);
    }
    
    q += ` WHERE id = ?`;
    params.push(req.params.id);

    db.run(q, params, function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '申报不存在' });
            res.json({ success: true });
        });
});

// Accept report - recycler accepts a farmer's report
app.post('/api/farmer-reports/:id/accept', (req, res) => {
    const { recycler_id, processor_id } = req.body;
    const reportId = req.params.id;
    
    // 必须有回收商或处理商ID
    if (!recycler_id && !processor_id) {
        return res.status(400).json({ error: '缺少接单方ID' });
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
        if (report.status !== 'pending') {
            db.close();
            return res.status(400).json({ error: '该订单已被接受或已完成' });
        }
        
        // 更新申报状态为 accepted，设置接单方
        const updateField = processor_id ? 'processor_id' : 'recycler_id';
        const updateValue = processor_id || recycler_id;
        
        db.run(`UPDATE farmer_reports SET status = 'accepted', ${updateField} = ?, updated_at = datetime('now') WHERE id = ?`,
            [updateValue, reportId], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: '订单接受成功' });
            });
    });
});

// Delete report (only drafts can be deleted)
app.delete('/api/farmer-reports/:id', (req, res) => {
    const { farmer_id } = req.query;
    const db = openDb();
    
    db.run(`DELETE FROM farmer_reports WHERE id = ? AND farmer_id = ? AND status = 'draft'`,
        [req.params.id, farmer_id], function(err) {
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
    
    if (!recycler_id || !grade || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '请填写必填项' });
    }
    
    const db = openDb();
    
    if (id) {
        // Update existing
        db.run(`UPDATE recycler_requests 
                SET grade = ?, contact_name = ?, contact_phone = ?, notes = ?, 
                    valid_until = ?, status = ?, updated_at = datetime('now')
                WHERE id = ? AND recycler_id = ?`,
            [grade, contact_name, contact_phone, notes, valid_until, status || 'draft', id, recycler_id],
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
            [request_no, recycler_id, grade, contact_name, contact_phone, notes, valid_until, status || 'draft'],
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
    const db = openDb();
    
    let q = `SELECT * FROM recycler_requests WHERE recycler_id = ?`;
    const params = [recycler_id];
    
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
        res.json(rows);
    });
});

// Get single request by ID
app.get('/api/recycler-requests/:id', (req, res) => {
    const db = openDb();
    db.get(`SELECT rr.*, u.full_name as recycler_name, u.phone as recycler_phone
            FROM recycler_requests rr
            JOIN users u ON rr.recycler_id = u.id
            WHERE rr.id = ?`, [req.params.id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '求购信息不存在' });
        res.json(row);
    });
});

// Update request status
app.patch('/api/recycler-requests/:id/status', (req, res) => {
    const { status, recycler_id } = req.body;
    const db = openDb();
    
    db.run(`UPDATE recycler_requests SET status = ?, updated_at = datetime('now')
            WHERE id = ? AND recycler_id = ?`,
        [status, req.params.id, recycler_id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
            res.json({ success: true });
        });
});

// Delete request (only drafts)
app.delete('/api/recycler-requests/:id', (req, res) => {
    const { recycler_id } = req.query;
    const db = openDb();
    
    db.run(`DELETE FROM recycler_requests WHERE id = ? AND recycler_id = ? AND status = 'draft'`,
        [req.params.id, recycler_id], function(err) {
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
    
    if (!processor_id || !weight_kg || !grade || !citrus_type || !location_address || !contact_name || !contact_phone) {
        return res.status(400).json({ error: '请填写必填项' });
    }
    
    const db = openDb();
    
    if (id) {
        // Update existing - use DB column names: citrus_variety, address
        db.run(`UPDATE processor_requests SET weight_kg = ?, grade = ?, citrus_variety = ?, address = ?, contact_name = ?, contact_phone = ?, has_transport = ?, notes = ?, valid_until = ?, status = ?, updated_at = datetime('now')
                WHERE id = ? AND processor_id = ?`,
            [weight_kg, grade, citrus_type, location_address, contact_name, contact_phone, has_transport ? 1 : 0, notes || null, valid_until || null, status || 'draft', id, processor_id], function(err) {
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
            [requestNo, processor_id, weight_kg, grade, citrus_type, location_address, contact_name, contact_phone, has_transport ? 1 : 0, notes || null, valid_until || null, status || 'draft'], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: this.lastID, request_no: requestNo });
            });
    }
});

// Get processor requests (with filters) - return citrus_variety as citrus_type and address as location_address for API consistency
app.get('/api/processor-requests', (req, res) => {
    const { processor_id, recycler_id, status, for_recyclers, for_farmers } = req.query;
    console.log('[API /api/processor-requests] Query params:', req.query);
    const db = openDb();
    
    let query = `SELECT pr.*, pr.citrus_variety as citrus_type, pr.address as location_address, u.full_name as processor_name, u.phone as processor_phone
                 FROM processor_requests pr
                 LEFT JOIN users u ON pr.processor_id = u.id`;
    const params = [];
    const conditions = [];
    
    if (processor_id) {
        conditions.push('pr.processor_id = ?');
        params.push(processor_id);
        console.log('[API /api/processor-requests] Added processor_id condition:', processor_id);
    }
    // 回收商查看自己接单的处理商订单
    if (recycler_id) {
        conditions.push('pr.recycler_id = ?');
        params.push(recycler_id);
    }
    if (status) {
        conditions.push('pr.status = ?');
        params.push(status);
    }
    // 回收商查看所有活跃的处理商求购（未被接单的）
    if (for_recyclers === 'true') {
        conditions.push("pr.status = 'active'");
        conditions.push("pr.recycler_id IS NULL");
        conditions.push("(pr.valid_until IS NULL OR pr.valid_until >= date('now'))");
    }
    // 农户只能看到有运输能力的处理商求购
    if (for_farmers === 'true') {
        conditions.push("pr.status = 'active'");
        conditions.push("pr.has_transport = 1");
        conditions.push("(pr.valid_until IS NULL OR pr.valid_until >= date('now'))");
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
        res.json(rows);
    });
});

// Get single processor request
app.get('/api/processor-requests/:id', (req, res) => {
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
        res.json(row);
    });
});

// Update processor request status
app.patch('/api/processor-requests/:id/status', (req, res) => {
    const { status, processor_id } = req.body;
    const db = openDb();
    
    db.run(`UPDATE processor_requests SET status = ?, updated_at = datetime('now')
            WHERE id = ? AND processor_id = ?`,
        [status, req.params.id, processor_id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '求购信息不存在' });
            res.json({ success: true });
        });
});

// Recycler accepts processor request
app.post('/api/processor-requests/:id/accept', (req, res) => {
    const { recycler_id } = req.body;
    if (!recycler_id) return res.status(400).json({ error: '缺少回收商ID' });
    
    const db = openDb();
    
    // Check if already accepted
    db.get(`SELECT * FROM processor_requests WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) { db.close(); return res.status(500).json({ error: err.message }); }
        if (!row) { db.close(); return res.status(404).json({ error: '求购信息不存在' }); }
        if (row.recycler_id) { db.close(); return res.status(400).json({ error: '该订单已被其他回收商接单' }); }
        
        db.run(`UPDATE processor_requests SET recycler_id = ?, updated_at = datetime('now') WHERE id = ?`,
            [recycler_id, req.params.id], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    });
});

// Delete processor request (only drafts)
app.delete('/api/processor-requests/:id', (req, res) => {
    const { processor_id } = req.query;
    const db = openDb();
    
    db.run(`DELETE FROM processor_requests WHERE id = ? AND processor_id = ? AND status = 'draft'`,
        [req.params.id, processor_id], function(err) {
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
    const activeOnly = req.query.active === '1';
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
    const { type, title, summary, image_url, link_url, doc_number, sort_order, is_active, created_by } = req.body;
    if (!type || !title) return res.status(400).json({ error: '类型和标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_announcements(type, title, summary, image_url, link_url, doc_number, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
        [type, title, summary || '', image_url || '', link_url || '', doc_number || '', sort_order || 0, is_active !== undefined ? is_active : 1, created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/announcements/:id', (req, res) => {
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
    const activeOnly = req.query.active === '1';
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
    const { title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active, created_by } = req.body;
    if (!title) return res.status(400).json({ error: '标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_cases(title, description, buyer_name, seller_name, trade_data, thumbnail_url, logo_url, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [title, description || '', buyer_name || '', seller_name || '', trade_data || '', thumbnail_url || '', logo_url || '', sort_order || 0, is_active !== undefined ? is_active : 1, created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/cases/:id', (req, res) => {
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
    const activeOnly = req.query.active === '1';
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
    const { title, company_name, description, image_url, contact_info, badge, sort_order, is_active, created_by } = req.body;
    if (!title) return res.status(400).json({ error: '标题为必填' });
    const db = openDb();
    db.run(`INSERT INTO cms_ads(title, company_name, description, image_url, contact_info, badge, sort_order, is_active, created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
        [title, company_name || '', description || '', image_url || '', contact_info || '', badge || '官方认证合作商', sort_order || 0, is_active !== undefined ? is_active : 1, created_by || null],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/cms/ads/:id', (req, res) => {
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

app.post('/api/cms/upload', cmsUpload.single('file'), validateCmsUploadMagic, (req, res) => {
    if (!req.file) return res.status(400).json({ error: '没有上传文件' });
    res.json({ success: true, url: `/uploads/cms/${req.file.filename}`, originalName: req.file.originalname });
});

// ============ Arbitration APIs ============

// Submit arbitration request
app.post('/api/arbitration-requests', (req, res) => {
    const { 
        applicant_id, order_type, order_id, order_no, reason, description,
        evidence_trade, evidence_material, evidence_payment, 
        evidence_communication, evidence_other 
    } = req.body;
    
    if (!applicant_id || !order_type || !order_id || !order_no || !reason || !description) {
        return res.status(400).json({ error: '请填写所有必填项' });
    }
    
    // 验证必须的证据材料
    if (!evidence_trade || !evidence_material || !evidence_payment) {
        return res.status(400).json({ error: '请上传必需的证据材料：平台交易凭证、废料相关证据、资金往来凭证' });
    }
    
    const db = openDb();
    const arbitrationNo = 'ARB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    db.run(`INSERT INTO arbitration_requests (
        arbitration_no, applicant_id, order_type, order_id, order_no, reason, description,
        evidence_trade, evidence_material, evidence_payment, evidence_communication, evidence_other
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        arbitrationNo, applicant_id, order_type, order_id, order_no, reason, description,
        JSON.stringify(evidence_trade || []),
        JSON.stringify(evidence_material || []),
        JSON.stringify(evidence_payment || []),
        JSON.stringify(evidence_communication || []),
        JSON.stringify(evidence_other || [])
    ], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID, arbitration_no: arbitrationNo });
    });
});

// Get arbitration requests (for applicant)
app.get('/api/arbitration-requests', (req, res) => {
    const { applicant_id, status } = req.query;
    
    if (!applicant_id) {
        return res.status(400).json({ error: '缺少申请人ID' });
    }
    
    const db = openDb();
    let sql = `
        SELECT ar.*, 
               u1.full_name as applicant_name,
               u2.full_name as respondent_name,
               u3.full_name as decided_by_name
        FROM arbitration_requests ar
        LEFT JOIN users u1 ON ar.applicant_id = u1.id
        LEFT JOIN users u2 ON ar.respondent_id = u2.id
        LEFT JOIN users u3 ON ar.decided_by = u3.id
        WHERE ar.applicant_id = ?
    `;
    
    const params = [applicant_id];
    
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
    const { status } = req.query;
    
    const db = openDb();
    let sql = `
        SELECT ar.*, 
               u1.full_name as applicant_name, u1.phone as applicant_phone,
               u2.full_name as respondent_name,
               u3.full_name as decided_by_name
        FROM arbitration_requests ar
        LEFT JOIN users u1 ON ar.applicant_id = u1.id
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

// Pay penalty (用户支付罚款)
app.post('/api/arbitration-requests/:id/pay-penalty', upload.single('proof'), validateArbitrationUploadMagic, (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: '缺少用户ID' });
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
            (row.penalty_party === 'applicant' && row.applicant_id == user_id) ||
            (row.penalty_party === 'respondent' && row.respondent_id == user_id)
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
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: '罚款已提交，等待管理员确认' });
        });
    });
});

// ─────────────────────────────────────────────
// 意向投递 API
// ─────────────────────────────────────────────

// POST /api/intentions — 提交意向
app.post('/api/intentions', (req, res) => {
    const { applicant_id, applicant_name, target_type, target_id, target_no, target_name, estimated_weight, expected_date, notes } = req.body;
    if (!applicant_id || !target_type || !target_id) {
        return res.status(400).json({ code: 400, msg: '缺少必填参数', data: null });
    }
    const db = openDb();
    // 防重复：同一用户对同一目标只能提交一次（pending 状态）
    db.get(
        `SELECT id FROM intentions WHERE applicant_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'`,
        [applicant_id, target_type, target_id],
        (err, row) => {
            if (err) { db.close(); return res.status(500).json({ code: 500, msg: err.message, data: null }); }
            if (row) { db.close(); return res.status(409).json({ code: 409, msg: '您已提交过意向，请等待对方回复', data: null }); }
            db.run(
                `INSERT INTO intentions (applicant_id, applicant_name, target_type, target_id, target_no, target_name, estimated_weight, expected_date, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [applicant_id, applicant_name || '', target_type, target_id, target_no || '', target_name || '', estimated_weight || null, expected_date || null, notes || ''],
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
    const db = openDb();
    let sql, params;
    if (applicant_id) {
        sql = `SELECT * FROM intentions WHERE applicant_id = ? ORDER BY created_at DESC`;
        params = [applicant_id];
    } else if (target_type && target_id) {
        sql = `SELECT * FROM intentions WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC`;
        params = [target_type, target_id];
    } else {
        db.close();
        return res.status(400).json({ code: 400, msg: '请提供 applicant_id 或 target_type+target_id', data: null });
    }
    db.all(sql, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ code: 500, msg: err.message, data: null });
        res.json({ code: 200, msg: 'ok', data: rows });
    });
});

// PATCH /api/intentions/:id/status — 更新意向状态（需求方操作：接受/拒绝）
// 当 status='accepted' 时，自动在 orders 表生成一笔真实订单
app.patch('/api/intentions/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['accepted', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ code: 400, msg: '无效状态值', data: null });
    }

    const db = openDb();

    // 1. 先拉取意向详情
    db.get(`SELECT * FROM intentions WHERE id = ?`, [id], (err, intention) => {
        if (err) { db.close(); return res.status(500).json({ code: 500, msg: err.message, data: null }); }
        if (!intention) { db.close(); return res.status(404).json({ code: 404, msg: '意向记录不存在', data: null }); }

        // 若不是接受操作，直接更新状态即可
        if (status !== 'accepted') {
            db.run(`UPDATE intentions SET status = ? WHERE id = ?`, [status, id], function(e2) {
                db.close();
                if (e2) return res.status(500).json({ code: 500, msg: e2.message, data: null });
                res.json({ code: 200, msg: '状态已更新', data: null });
            });
            return;
        }

        // ── 接受意向：查目标表 → 生成订单 ──────────────────────────────────
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
            db.close();
            return res.status(400).json({ code: 400, msg: '不支持的意向目标类型', data: null });
        }

        db.get(targetTableSql, [target_id], (err2, target) => {
            if (err2 || !target) {
                db.close();
                return res.status(500).json({ code: 500, msg: err2 ? err2.message : '目标记录不存在', data: null });
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
                    db.close();
                    return res.status(500).json({ code: 500, msg: '创建订单失败: ' + err3.message, data: null });
                }
                const order_id = this.lastID;

                // 更新意向状态
                db.run(`UPDATE intentions SET status = 'accepted' WHERE id = ?`, [id], (err4) => {
                    db.close();
                    if (err4) return res.status(500).json({ code: 500, msg: err4.message, data: null });
                    res.json({
                        code: 200,
                        msg: '意向已接受，订单已自动生成',
                        data: { order_no, order_id }
                    });
                });
            });
        });
    });
});

// Start server
const PORT = process.env.PORT || 4000;

// 自动迁移：每次启动都执行，确保新表存在
async function runMigrations() {
    const db = openDb();
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
        )`
    ];
    for (const sql of migrations) {
        await new Promise((resolve, reject) => {
            db.run(sql, (err) => { if (err) reject(err); else resolve(); });
        });
    }
    db.close();
    console.log('[migrations] Done');
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
