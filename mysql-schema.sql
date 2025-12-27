-- MySQL Schema for MIS Project
-- This replaces the PostgreSQL schema with MySQL-compatible syntax

-- Create database (run this first)
-- CREATE DATABASE IF NOT EXISTS mis_db;
-- USE mis_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('operator', 'engineer', 'admin', 'manager') DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Profiles table (for authentication)
CREATE TABLE IF NOT EXISTS profiles (
    id INT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('operator', 'engineer', 'admin', 'manager') DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assets master table
CREATE TABLE IF NOT EXISTS assets_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    machine_no VARCHAR(100),
    location VARCHAR(255),
    category VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    install_date DATE,
    status ENUM('ACTIVE', 'UNDER_AMC', 'INACTIVE', 'DISPOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Breakdown logs table
CREATE TABLE IF NOT EXISTS breakdown_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    description TEXT NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    acknowledged_by VARCHAR(255),
    root_cause TEXT,
    action_taken TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    status ENUM('OPEN', 'ACK', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets_master(id) ON DELETE CASCADE
);

-- Spare parts inventory table
CREATE TABLE IF NOT EXISTS spare_parts_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_code VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    part_no VARCHAR(100),
    uom VARCHAR(20) DEFAULT 'NOS',
    stock_on_hand INT DEFAULT 0,
    min_level INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    location VARCHAR(255),
    unit_cost DECIMAL(10,2),
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Spare transactions table
CREATE TABLE IF NOT EXISTS spare_txn (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id INT NOT NULL,
    qty INT NOT NULL,
    direction ENUM('RECEIPT', 'ISSUE') NOT NULL,
    asset_id INT,
    related_breakdown_id INT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES spare_parts_inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets_master(id) ON DELETE SET NULL,
    FOREIGN KEY (related_breakdown_id) REFERENCES breakdown_logs(id) ON DELETE SET NULL
);

-- Utilities log table
CREATE TABLE IF NOT EXISTS utilities_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utility_type ENUM('POWER', 'GAS', 'WATER', 'AIR') NOT NULL,
    meter_point VARCHAR(255) NOT NULL,
    reading DECIMAL(10,2) NOT NULL,
    reading_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset QR codes table
CREATE TABLE IF NOT EXISTS asset_qr (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    qr_payload VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets_master(id) ON DELETE CASCADE
);

-- PM Schedule table
CREATE TABLE IF NOT EXISTS pm_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status ENUM('SCHEDULED', 'DUE', 'COMPLETED', 'OVERDUE') DEFAULT 'SCHEDULED',
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets_master(id) ON DELETE CASCADE
);

-- Insert sample data
INSERT INTO users (email, full_name, role) VALUES
('admin@mis.com', 'Admin User', 'admin'),
('engineer@mis.com', 'Engineer User', 'engineer'),
('operator@mis.com', 'Operator User', 'operator')
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO profiles (id, full_name, email, password, role) VALUES
(1, 'Admin User', 'admin@mis.com', 'admin123', 'admin'),
(2, 'Engineer User', 'engineer@mis.com', 'engineer123', 'engineer'),
(3, 'Operator User', 'operator@mis.com', 'operator123', 'operator')
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO assets_master (asset_code, asset_name, machine_no, location, category, manufacturer, model, serial_number, install_date, status) VALUES
('A001', 'CNC Machine 1', 'CNC-001', 'Production Floor', 'Machinery', 'Haas', 'VF-2', 'H123456', '2023-01-15', 'ACTIVE'),
('A002', 'Conveyor Belt', 'CONV-001', 'Assembly Line', 'Conveyor', 'Flexco', 'FB-500', 'F789012', '2023-03-20', 'ACTIVE'),
('A003', 'Press Machine', 'PRESS-001', 'Press Shop', 'Press', 'Schuler', 'P2H-400', 'S345678', '2023-05-10', 'UNDER_AMC')
ON DUPLICATE KEY UPDATE asset_code=asset_code;

INSERT INTO spare_parts_inventory (part_code, part_name, part_no, uom, stock_on_hand, min_level, reorder_level, location, unit_cost, supplier) VALUES
('SP001', 'Bearing 6205', 'BR-6205', 'NOS', 15, 5, 3, 'Store A', 25.50, 'Bearing Corp'),
('SP002', 'Belt A-45', 'BL-A45', 'MTR', 8, 3, 2, 'Store B', 12.75, 'Belt Solutions'),
('SP003', 'Motor 2HP', 'MOT-2HP', 'NOS', 2, 1, 1, 'Store C', 150.00, 'Motor Corp')
ON DUPLICATE KEY UPDATE part_code=part_code;
