-- SQLite schema for agricultural waste recycling system
PRAGMA foreign_keys = ON;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    meta JSON,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- Locations table (processing points, collection points, farms...)
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    type TEXT,            -- e.g., 'processing_plant', 'collection_center', 'farm'
    meta JSON,
    created_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(name, latitude, longitude)
);

CREATE INDEX IF NOT EXISTS idx_locations_geo ON locations(latitude, longitude);

-- Orders table: records of waste transactions / pick-ups
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    farmer_id INTEGER NOT NULL,        -- who submitted (user id with farmer role)
    recycler_id INTEGER,               -- assigned recycler (can be null)
    location_id INTEGER,               -- where processed or picked up
    weight_kg REAL NOT NULL,           -- weight in kg
    price_per_kg REAL,                 -- optional price agreed
    total_price REAL,
    status TEXT DEFAULT 'pending',     -- pending, accepted, completed, cancelled
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(recycler_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_recycler ON orders(recycler_id);
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_id);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- A simple mapping table for geofences (optional future use)
CREATE TABLE IF NOT EXISTS geofences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    radius_m INTEGER NOT NULL,
    meta JSON,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Farmer reports table: agricultural waste supply declarations
CREATE TABLE IF NOT EXISTS farmer_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_no TEXT NOT NULL UNIQUE,
    farmer_id INTEGER NOT NULL,
    pickup_date DATE NOT NULL,              -- 回收时间
    weight_kg REAL NOT NULL,                -- 回收重量（斤）
    location_address TEXT NOT NULL,         -- 收获地点
    location_lat REAL,                      -- 纬度
    location_lng REAL,                      -- 经度
    citrus_variety TEXT NOT NULL,           -- 柑橘品种
    contact_name TEXT NOT NULL,             -- 联系人
    contact_phone TEXT NOT NULL,            -- 联系电话
    grade TEXT DEFAULT 'grade2',            -- 品级: grade1, grade2, grade3, offgrade
    photo_urls TEXT,                        -- 照片URL，JSON数组
    status TEXT DEFAULT 'draft',            -- draft, pending, accepted, completed, cancelled
    recycler_id INTEGER,                    -- 接单回收商
    notes TEXT,                             -- 备注
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(recycler_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_farmer_reports_farmer ON farmer_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_reports_status ON farmer_reports(status);
CREATE INDEX IF NOT EXISTS idx_farmer_reports_date ON farmer_reports(pickup_date);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,            -- Associated report (context)
    sender_id INTEGER NOT NULL,            -- User ID who sent the message
    receiver_id INTEGER NOT NULL,          -- User ID who receives the message
    content TEXT NOT NULL,                 -- Message text
    is_read BOOLEAN DEFAULT 0,             -- Read status
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(report_id) REFERENCES farmer_reports(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_report ON chat_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);

-- Recycler purchase requests table: 回收商求购信息
CREATE TABLE IF NOT EXISTS recycler_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_no TEXT NOT NULL UNIQUE,
    recycler_id INTEGER NOT NULL,
    grade TEXT NOT NULL,                    -- 要回收的品级: grade1, grade2, grade3, offgrade, any
    contact_name TEXT NOT NULL,             -- 联系人
    contact_phone TEXT NOT NULL,            -- 联系电话
    notes TEXT,                             -- 备注
    valid_until DATE,                       -- 有效期截止日期，NULL表示长期有效
    status TEXT DEFAULT 'draft',            -- draft, active, expired, cancelled
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(recycler_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recycler_requests_recycler ON recycler_requests(recycler_id);
CREATE INDEX IF NOT EXISTS idx_recycler_requests_status ON recycler_requests(status);
CREATE INDEX IF NOT EXISTS idx_recycler_requests_grade ON recycler_requests(grade);

-- Chat messages for purchase requests
CREATE TABLE IF NOT EXISTS request_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,           -- Associated purchase request
    sender_id INTEGER NOT NULL,            -- User ID who sent the message
    receiver_id INTEGER NOT NULL,          -- User ID who receives the message
    content TEXT NOT NULL,                 -- Message text
    is_read BOOLEAN DEFAULT 0,             -- Read status
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(request_id) REFERENCES recycler_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_request_chat_request ON request_chat_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_request_chat_sender ON request_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_request_chat_receiver ON request_chat_messages(receiver_id);

-- Processor purchase requests table: 处理商求购信息
CREATE TABLE IF NOT EXISTS processor_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_no TEXT NOT NULL UNIQUE,
    processor_id INTEGER NOT NULL,
    weight_kg REAL NOT NULL,                -- 需求重量（斤）
    grade TEXT NOT NULL,                    -- 品级: grade1, grade2, grade3, offgrade, any
    citrus_type TEXT NOT NULL,              -- 柑肉种类: mandarin, orange, pomelo, tangerine, any
    location_address TEXT NOT NULL,         -- 收货地址
    contact_name TEXT NOT NULL,             -- 联系人
    contact_phone TEXT NOT NULL,            -- 联系电话
    has_transport BOOLEAN DEFAULT 0,        -- 是否具备运输能力（1=是，向农户和回收商推送；0=否，仅向回收商推送）
    notes TEXT,                             -- 备注
    valid_until DATE,                       -- 有效期截止日期，NULL表示长期有效
    status TEXT DEFAULT 'draft',            -- draft, active, expired, cancelled
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(processor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_processor_requests_processor ON processor_requests(processor_id);
CREATE INDEX IF NOT EXISTS idx_processor_requests_status ON processor_requests(status);
CREATE INDEX IF NOT EXISTS idx_processor_requests_transport ON processor_requests(has_transport);

-- Chat messages for processor purchase requests
CREATE TABLE IF NOT EXISTS processor_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,           -- Associated processor request
    sender_id INTEGER NOT NULL,            -- User ID who sent the message
    receiver_id INTEGER NOT NULL,          -- User ID who receives the message
    content TEXT NOT NULL,                 -- Message text
    content_type TEXT DEFAULT 'text',      -- text, system
    is_read BOOLEAN DEFAULT 0,             -- Read status
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(request_id) REFERENCES processor_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_processor_chat_request ON processor_chat_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_processor_chat_sender ON processor_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_processor_chat_receiver ON processor_chat_messages(receiver_id);

-- Recycler supplies (回收商供应 - 面向处理商)
CREATE TABLE IF NOT EXISTS recycler_supplies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supply_no TEXT NOT NULL UNIQUE,         -- 供应编号
    recycler_id INTEGER NOT NULL,           -- 回收商ID
    grade TEXT NOT NULL,                    -- 品级: grade1, grade2, grade3, offgrade, mixed
    stock_weight REAL NOT NULL,             -- 库存重量（斤）
    contact_name TEXT NOT NULL,             -- 联系人
    contact_phone TEXT NOT NULL,            -- 联系电话
    address TEXT,                           -- 所在地址
    notes TEXT,                             -- 备注
    photo_urls TEXT DEFAULT '[]',           -- 照片URLs (JSON数组)
    valid_until DATE,                       -- 有效期截止日期，NULL表示长期有效
    status TEXT DEFAULT 'draft',            -- draft, active, cancelled
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(recycler_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recycler_supplies_recycler ON recycler_supplies(recycler_id);
CREATE INDEX IF NOT EXISTS idx_recycler_supplies_status ON recycler_supplies(status);
