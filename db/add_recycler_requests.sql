-- Add recycler purchase requests tables

CREATE TABLE IF NOT EXISTS recycler_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_no TEXT NOT NULL UNIQUE,
    recycler_id INTEGER NOT NULL,
    grade TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    notes TEXT,
    valid_until DATE,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(recycler_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recycler_requests_recycler ON recycler_requests(recycler_id);
CREATE INDEX IF NOT EXISTS idx_recycler_requests_status ON recycler_requests(status);
CREATE INDEX IF NOT EXISTS idx_recycler_requests_grade ON recycler_requests(grade);

CREATE TABLE IF NOT EXISTS request_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(request_id) REFERENCES recycler_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_request_chat_request ON request_chat_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_request_chat_sender ON request_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_request_chat_receiver ON request_chat_messages(receiver_id);
