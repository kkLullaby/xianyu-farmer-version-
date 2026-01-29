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
