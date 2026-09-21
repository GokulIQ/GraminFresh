USE village_farm_db;

-- categories: add updated_at, created_by
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by INT NULL;

-- products: add updated_at, updated_by, discount_price, sku, weight
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_by INT NULL,
    ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS sku VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS weight VARCHAR(50) NULL;

-- orders: add assigned_delivery_partner, payment_status, expected_delivery_date
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS assigned_delivery_partner INT NULL,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS expected_delivery_date DATETIME NULL;

-- customers: add status, last_login
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS last_login DATETIME NULL;


-- ----------------------------------------------------------------------------
-- 2. CREATE NEW ADMIN MODULE TABLES
-- ----------------------------------------------------------------------------

-- Table: admin_roles
CREATE TABLE IF NOT EXISTS admin_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    permissions JSON NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admins
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(15) NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    avatar VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_admin_email (email),
    INDEX idx_admin_role (role),
    INDEX idx_admin_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: delivery_partners
CREATE TABLE IF NOT EXISTS delivery_partners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    partner_id VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Bike',
    vehicle_number VARCHAR(50) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_location VARCHAR(150) NULL,
    active_orders_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_delivery_status (status),
    INDEX idx_delivery_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: delivery_assignments
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(50) NOT NULL,
    partner_id INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME NULL,
    notes VARCHAR(255) NULL,

    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES delivery_partners(id) ON DELETE CASCADE,
    INDEX idx_assignment_order (order_id),
    INDEX idx_assignment_partner (partner_id),
    INDEX idx_assignment_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_activity_admin (admin_id),
    INDEX idx_activity_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_settings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    target_role VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notif_read (is_read),
    INDEX idx_notif_role (target_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_session_admin (admin_id),
    INDEX idx_session_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: report_cache
CREATE TABLE IF NOT EXISTS report_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_type VARCHAR(50) NOT NULL,
    date_range VARCHAR(50) NOT NULL,
    data JSON NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_report (report_type, date_range)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. SEED INITIAL ROLES, SUPER ADMIN, DELIVERY PARTNERS, SETTINGS
-- ----------------------------------------------------------------------------

INSERT INTO admin_roles (role_name, display_name, permissions, description)
VALUES 
('super_admin', 'Super Administrator', '["*"]', 'Full access to all system functions'),
('manager', 'Store Manager', '["categories.*", "products.*", "orders.*", "customers.read", "reports.read"]', 'Manages catalog, orders and reports'),
('delivery_coordinator', 'Delivery Coordinator', '["orders.read", "orders.update", "delivery.*"]', 'Manages delivery partners and assignments')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Default Super Admin: admin@villagefarm.com / admin@graminfresh.com
-- Password hash for 'Admin@123456' using bcrypt
INSERT INTO admins (admin_id, full_name, email, phone, password, role, status)
VALUES 
('ADM-2026-001', 'GraminFresh Super Admin', 'admin@villagefarm.com', '9876543210', '$2b$12$6t6I/o2F3Lz9E0v5x7P2veO93cTlyM6oM55r1wJjDkJN1xQf.Jbqq', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Sample Delivery Partners
INSERT INTO delivery_partners (partner_id, full_name, phone, vehicle_type, vehicle_number, status, current_location, active_orders_count)
VALUES 
('DP-001', 'Ramesh Kumar', '9876500001', 'Bike', 'TN-38-AB-1234', 'active', 'Central Hub - Thondamuthur', 0),
('DP-002', 'Suresh Patel', '9876500002', 'Mini Van', 'TN-38-CD-5678', 'active', 'East Route - Madampatti', 0),
('DP-003', 'Manoj Singh', '9876500003', 'Electric Scooter', 'TN-38-EF-9012', 'active', 'North Route - Alandurai', 0)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Default System Settings
INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES 
('store_name', 'GraminFresh', 'general', 'Platform Brand Name'),
('support_phone', '+91 98765 43210', 'general', 'Customer Support Helpline'),
('support_email', 'support@graminfresh.com', 'general', 'Customer Support Email'),
('delivery_fee_standard', '30.00', 'pricing', 'Standard Delivery Fee (INR)'),
('free_delivery_threshold', '499.00', 'pricing', 'Minimum order amount for free delivery'),
('low_stock_threshold', '10', 'inventory', 'Threshold for low stock warnings'),
('auto_assign_delivery', 'false', 'delivery', 'Automatically assign nearest delivery partner'),
('maintenance_mode', 'false', 'system', 'Put store in maintenance mode')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
