const fs = require('fs');
const path = require('path');
const http = require('http'); // Import http for socket.io
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { Server } = require("socket.io"); // Import socket.io
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
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, { cors: { origin: "*" } }); // Init Socket.IO

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

// ========== Socket.IO Chat ==========
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a chat room defined by report ID
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room ${room}`);
    });

    // Send a message
    socket.on('send_message', (data) => {
        // data: { report_id, sender_id, receiver_id, content }
        const { report_id, sender_id, receiver_id, content } = data;
        const db = openDb();
        db.run(`INSERT INTO chat_messages (report_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)`,
            [report_id, sender_id, receiver_id, content], function(err) {
                db.close();
                if (err) return console.error(err);
                
                const msg = {
                    id: this.lastID,
                    report_id, sender_id, receiver_id, content,
                    created_at: new Date().toISOString(),
                    is_read: 0
                };
                // Broadcast to room (including sender for now, or use broadcast.to for others)
                io.to(`report_${report_id}`).emit('receive_message', msg);
                
                // Also could emit a notification event to specific user room if we tracked user sockets
            });
    });

    // Get chat history
    socket.on('get_history', (report_id, callback) => {
        const db = openDb();
        db.all(`SELECT * FROM chat_messages WHERE report_id = ? ORDER BY created_at ASC`, [report_id], (err, rows) => {
            db.close();
            if (callback) callback(rows || []);
        });
    });

    // Mark as read
    socket.on('mark_read', (data) => {
        const { report_id, user_id } = data; // user_id is the one READING (so receiver_id = user_id)
        const db = openDb();
        db.run(`UPDATE chat_messages SET is_read = 1 WHERE report_id = ? AND receiver_id = ?`, [report_id, user_id], (err) => {
            db.close();
        });
    });
    
    // Check unread count for a user
    socket.on('check_unread', (user_id, callback) => {
         const db = openDb();
         db.all(`SELECT report_id, COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND is_read = 0 GROUP BY report_id`, [user_id], (err, rows) => {
             db.close();
             if (callback) callback(rows || []);
         });
    });

    // ===== Purchase Request Chat =====
    
    // Join request chat room
    socket.on('join_request_room', (data) => {
        const { request_id } = data;
        socket.join(`request_${request_id}`);
        console.log(`Socket ${socket.id} joined request room: request_${request_id}`);
    });
    
    // Send message for purchase request
    socket.on('send_request_message', (data) => {
        const { request_id, sender_id, content, content_type } = data;
        const db = openDb();
        
        // First get the request info
        db.get(`SELECT recycler_id FROM recycler_requests WHERE id = ?`, [request_id], (err, request) => {
            if (err || !request) {
                db.close();
                return console.error('Request not found:', err);
            }
            
            // 确定接收者：如果发送者是回收商，需要找到对话中的农户
            let receiver_id;
            if (String(sender_id) === String(request.recycler_id)) {
                // 回收商发送，需要找到这个对话中的农户
                // 从消息历史中找出最近的非回收商发送者
                db.get(`SELECT DISTINCT sender_id FROM request_chat_messages 
                        WHERE request_id = ? AND sender_id != ? 
                        ORDER BY created_at DESC LIMIT 1`, 
                    [request_id, request.recycler_id], (err3, lastMsg) => {
                    
                    receiver_id = lastMsg ? lastMsg.sender_id : request.recycler_id;
                    saveChatMessage();
                });
            } else {
                // 农户发送，接收者是回收商
                receiver_id = request.recycler_id;
                saveChatMessage();
            }
            
            function saveChatMessage() {
                // Get sender name
                db.get(`SELECT full_name FROM users WHERE id = ?`, [sender_id], (err2, sender) => {
                    const sender_name = sender ? sender.full_name : 'Unknown';
                    
                    db.run(`INSERT INTO request_chat_messages (request_id, sender_id, receiver_id, content, content_type) VALUES (?, ?, ?, ?, ?)`,
                        [request_id, sender_id, receiver_id, content, content_type || 'text'], function(err4) {
                        db.close();
                        if (err4) return console.error(err4);
                        
                        const msg = {
                            id: this.lastID,
                            request_id, sender_id, receiver_id, content,
                            content_type: content_type || 'text',
                            sender_name,
                            created_at: new Date().toISOString(),
                            is_read: 0
                        };
                        io.to(`request_${request_id}`).emit('receive_request_message', msg);
                    });
                });
            }
        });
    });

    // Get request chat history
    socket.on('get_request_history', (data, callback) => {
        const { request_id } = data;
        const db = openDb();
        db.all(`SELECT rcm.*, u.full_name as sender_name 
                FROM request_chat_messages rcm
                JOIN users u ON rcm.sender_id = u.id
                WHERE rcm.request_id = ? 
                ORDER BY rcm.created_at ASC`, [request_id], (err, rows) => {
            db.close();
            if (callback) callback(rows || []);
        });
    });

    // Mark request messages as read
    socket.on('mark_request_read', (data) => {
        const { request_id, user_id } = data;
        const db = openDb();
        db.run(`UPDATE request_chat_messages SET is_read = 1 WHERE request_id = ? AND receiver_id = ?`, [request_id, user_id], (err) => {
            db.close();
        });
    });
    
    // Check unread request messages
    socket.on('check_request_unread', (user_id, callback) => {
         const db = openDb();
         db.all(`SELECT request_id, COUNT(*) as count FROM request_chat_messages WHERE receiver_id = ? AND is_read = 0 GROUP BY request_id`, [user_id], (err, rows) => {
             db.close();
             if (callback) callback(rows || []);
         });
    });

    // ===== Processor Request Chat (处理商求购聊天) =====
    
    // Join processor request chat room
    socket.on('join_processor_room', (data) => {
        const { request_id } = data;
        socket.join(`processor_${request_id}`);
        console.log(`Socket ${socket.id} joined processor room: processor_${request_id}`);
    });
    
    // Send message for processor request
    socket.on('send_processor_message', (data) => {
        const { request_id, sender_id, content, content_type } = data;
        console.log('[Socket send_processor_message] data:', data);
        console.log('[Socket send_processor_message] content_type:', content_type);
        const db = openDb();
        
        // Get the processor request info
        db.get(`SELECT processor_id FROM processor_requests WHERE id = ?`, [request_id], (err, request) => {
            if (err || !request) {
                db.close();
                return console.error('Processor request not found:', err);
            }
            
            // 确定接收者
            let receiver_id;
            if (String(sender_id) === String(request.processor_id)) {
                // 处理商发送，找对话中的农户或回收商
                db.get(`SELECT DISTINCT sender_id FROM processor_chat_messages 
                        WHERE request_id = ? AND sender_id != ? 
                        ORDER BY created_at DESC LIMIT 1`, 
                    [request_id, request.processor_id], (err2, lastMsg) => {
                    receiver_id = lastMsg ? lastMsg.sender_id : request.processor_id;
                    saveProcessorMessage();
                });
            } else {
                // 农户或回收商发送，接收者是处理商
                receiver_id = request.processor_id;
                saveProcessorMessage();
            }
            
            function saveProcessorMessage() {
                db.get(`SELECT full_name FROM users WHERE id = ?`, [sender_id], (err3, sender) => {
                    const sender_name = sender ? sender.full_name : 'Unknown';
                    
                    db.run(`INSERT INTO processor_chat_messages (request_id, sender_id, receiver_id, content, content_type) VALUES (?, ?, ?, ?, ?)`,
                        [request_id, sender_id, receiver_id, content, content_type || 'text'], function(err4) {
                        db.close();
                        if (err4) return console.error(err4);
                        
                        const msg = {
                            id: this.lastID,
                            request_id, sender_id, receiver_id, content,
                            content_type: content_type || 'text',
                            sender_name,
                            created_at: new Date().toISOString(),
                            is_read: 0
                        };
                        console.log('[Socket send_processor_message] Emitting message:', msg);
                        console.log('[Socket send_processor_message] content_type in msg:', msg.content_type);
                        io.to(`processor_${request_id}`).emit('receive_processor_message', msg);
                    });
                });
            }
        });
    });

    // Get processor chat history
    socket.on('get_processor_history', (data, callback) => {
        const { request_id } = data;
        const db = openDb();
        db.all(`SELECT pcm.*, u.full_name as sender_name 
                FROM processor_chat_messages pcm
                JOIN users u ON pcm.sender_id = u.id
                WHERE pcm.request_id = ? 
                ORDER BY pcm.created_at ASC`, [request_id], (err, rows) => {
            db.close();
            if (callback) callback(rows || []);
        });
    });

    // Mark processor messages as read
    socket.on('mark_processor_read', (data) => {
        const { request_id, user_id } = data;
        const db = openDb();
        db.run(`UPDATE processor_chat_messages SET is_read = 1 WHERE request_id = ? AND receiver_id = ?`, [request_id, user_id], (err) => {
            db.close();
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 4000;
if (require.main === module) {
    (async () => {
        if (process.argv.includes('--init')) {
            console.log('Initializing DB...');
            try { await initDb(); } catch (e) { console.error(e); process.exit(1); }
        }

        server.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}`);
            console.log('Use POST /init to init DB, or run `node server.js --init`');
        });
    })();
}

module.exports = { app, initDb };
