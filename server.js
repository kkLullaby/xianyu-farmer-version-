const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { sendOtpSms } = require('./smsClient');

const DB_PATH = path.join(__dirname, 'data', 'agri.db');
const SCHEMA_SQL = path.join(__dirname, 'db', 'schema.sql');

// In-memory OTP store { phone: { code, expiresAt, attempts, lastSentAt } }
const otpStore = new Map();

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
                ['recycler', '回收商']
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
            { username: 'recycler001', password: 'recycler123', role: 'recycler', full_name: '王回收商' }
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
app.use(cors());
app.use(bodyParser.json());

// 提供静态文件（HTML、CSS、JS等）
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

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
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!isValidPhone(phone)) return res.status(400).json({ error: '手机号格式不正确' });

        const existing = otpStore.get(phone);
        const now = Date.now();
        if (existing && existing.lastSentAt && now - existing.lastSentAt < 60 * 1000) {
            return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
        }

        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        otpStore.set(phone, {
            code,
            expiresAt: now + 5 * 60 * 1000,
            attempts: 0,
            lastSentAt: now
        });

        await sendOtpSms(phone, code);
        res.json({ success: true });
    } catch (err) {
        console.error('request-otp error', err.message);
        res.status(500).json({ error: '验证码发送失败，请稍后重试' });
    }
});

// Phone + OTP registration
app.post('/api/auth/register-phone', (req, res) => {
    const { phone, otp, password, role, full_name, agreementAccepted } = req.body;

    if (!agreementAccepted) return res.status(400).json({ error: '请先勾选协议' });
    if (!isValidPhone(phone)) return res.status(400).json({ error: '手机号格式不正确' });
    if (!otp) return res.status(400).json({ error: '缺少验证码' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });
    if (!role) return res.status(400).json({ error: '请选择身份' });

    const record = otpStore.get(phone);
    if (!record) return res.status(400).json({ error: '验证码已失效，请重新获取' });
    const now = Date.now();
    if (record.expiresAt < now) {
        otpStore.delete(phone);
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }
    if (record.attempts >= 5) {
        otpStore.delete(phone);
        return res.status(429).json({ error: '验证码错误次数过多，请重新获取' });
    }
    if (record.code !== otp) {
        record.attempts += 1;
        otpStore.set(phone, record);
        return res.status(400).json({ error: '验证码不正确' });
    }

    // OTP passed, remove entry
    otpStore.delete(phone);

    const db = openDb();
    db.get(`SELECT id FROM roles WHERE name = ?`, [role], (err, row) => {
        if (err) { db.close(); return res.status(500).json({ error: err.message }); }
        if (!row) { db.close(); return res.status(400).json({ error: '无效的身份' }); }

        const hash = bcrypt.hashSync(password, 10); // bcrypt 生成随机盐
        const username = phone; // 使用手机号作为唯一用户名

        db.run(`INSERT INTO users(username,password_hash,role_id,full_name,phone) VALUES(?,?,?,?,?)`, [username, hash, row.id, full_name || null, phone], function(err2) {
            db.close();
            if (err2) {
                if (err2.message && err2.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: '该手机号已注册' });
                }
                return res.status(500).json({ error: err2.message });
            }
            res.json({ id: this.lastID, phone, role, full_name: full_name || null });
        });
    });
});

// Register
app.post('/api/register', (req, res) => {
    const { username, password, role, full_name } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'missing fields' });
    if (!isValidPassword(password)) return res.status(400).json({ error: '密码需8-16位，包含数字和字母' });

    const db = openDb();
    db.get(`SELECT id FROM roles WHERE name = ?`, [role], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: 'invalid role' });

        const hash = bcrypt.hashSync(password, 8);
        db.run(`INSERT INTO users(username,password_hash,role_id,full_name) VALUES(?,?,?,?)`, [username, hash, row.id, full_name || null], function(err2) {
            db.close();
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ id: this.lastID, username });
        });
    });
});

// Login (support username or phone)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'missing fields' });
    const db = openDb();

    db.get(`SELECT u.id,u.username,u.phone,u.password_hash,u.full_name,r.name as role FROM users u JOIN roles r ON u.role_id=r.id WHERE u.username = ? OR u.phone = ?`, [username, username], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: '用户不存在' });

        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) return res.status(401).json({ error: '密码错误' });

        res.json({ id: row.id, username: row.username, phone: row.phone, full_name: row.full_name, role: row.role });
    });
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

// Start server
const PORT = process.env.PORT || 4000;
if (require.main === module) {
    (async () => {
        if (process.argv.includes('--init')) {
            console.log('Initializing DB...');
            try { await initDb(); } catch (e) { console.error(e); process.exit(1); }
        }

        app.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}`);
            console.log('Use POST /init to init DB, or run `node server.js --init`');
        });
    })();
}

module.exports = { app, initDb };
