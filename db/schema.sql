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
