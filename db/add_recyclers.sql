-- 添加更多测试回收商数据
-- 确保已经有基础的角色数据

-- 更新现有回收商的位置和联系信息
UPDATE users SET 
    phone = '13800138001',
    meta = json_object(
        'latitude', 39.9042, 
        'longitude', 116.4074, 
        'address', '北京市朝阳区回收中心',
        'business_hours', '8:00-18:00'
    )
WHERE username = 'recycler001';

-- 添加新的回收商（如果不存在）
INSERT OR IGNORE INTO users (username, password_hash, role_id, full_name, phone, meta)
SELECT 
    'recycler002',
    '$2a$08$dummyhash123456789012345678901234567890123456789012', -- 占位哈希
    (SELECT id FROM roles WHERE name = 'recycler'),
    '张回收商',
    '13800138002',
    json_object(
        'latitude', 31.2304,
        'longitude', 121.4737,
        'address', '上海市浦东新区环保站',
        'business_hours', '7:00-19:00'
    )
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'recycler002');

INSERT OR IGNORE INTO users (username, password_hash, role_id, full_name, phone, meta)
SELECT 
    'recycler003',
    '$2a$08$dummyhash123456789012345678901234567890123456789012',
    (SELECT id FROM roles WHERE name = 'recycler'),
    '李回收站',
    '13800138003',
    json_object(
        'latitude', 23.1291,
        'longitude', 113.2644,
        'address', '广州市天河区废品站',
        'business_hours', '6:00-20:00'
    )
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'recycler003');

INSERT OR IGNORE INTO users (username, password_hash, role_id, full_name, phone, meta)
SELECT 
    'recycler004',
    '$2a$08$dummyhash123456789012345678901234567890123456789012',
    (SELECT id FROM roles WHERE name = 'recycler'),
    '赵处理厂',
    '13800138004',
    json_object(
        'latitude', 30.5728,
        'longitude', 104.0668,
        'address', '成都市武侯区加工厂',
        'business_hours', '9:00-17:00'
    )
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'recycler004');

INSERT OR IGNORE INTO users (username, password_hash, role_id, full_name, phone, meta)
SELECT 
    'recycler005',
    '$2a$08$dummyhash123456789012345678901234567890123456789012',
    (SELECT id FROM roles WHERE name = 'recycler'),
    '刘环保中心',
    '13800138005',
    json_object(
        'latitude', 22.3964,
        'longitude', 114.1095,
        'address', '深圳市福田区回收点',
        'business_hours', '8:30-18:30'
    )
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'recycler005');

-- 查询确认
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.phone,
    json_extract(u.meta, '$.address') as address,
    json_extract(u.meta, '$.business_hours') as business_hours,
    json_extract(u.meta, '$.latitude') as latitude,
    json_extract(u.meta, '$.longitude') as longitude
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'recycler'
ORDER BY u.id;
