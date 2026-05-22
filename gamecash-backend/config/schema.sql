-- C:\xampp2\htdocs\gamecash\gamecash-backend\config\schema.sql

-- Create database if not exists and use it
CREATE DATABASE IF NOT EXISTS `gamecash` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `gamecash`;

-- 1. Users table (Admins/Staff)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User tokens for Bearer Auth
CREATE TABLE IF NOT EXISTS `user_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token` VARCHAR(255) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Customers & Debts table
CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) DEFAULT NULL,
    `total_debt` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_customer_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Customer Debt Payments (Payoffs)
CREATE TABLE IF NOT EXISTS `customer_payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `amount_paid` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
    INDEX `idx_payment_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Products table (Snacks/Drinks/Inventory)
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `category` VARCHAR(50) DEFAULT 'snack',
    `purchase_price` DECIMAL(10, 2) DEFAULT 0.00,
    `selling_price` DECIMAL(10, 2) DEFAULT 0.00,
    `stock` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_product_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Telecom Companies
CREATE TABLE IF NOT EXISTS `telecom_companies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `logo_color` VARCHAR(10) DEFAULT '#cccccc',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Sales Invoices
CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT DEFAULT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) NOT NULL,
    `debt_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    INDEX `idx_sales_customer` (`customer_id`),
    INDEX `idx_sales_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sale Items (Unified multi-item detail)
CREATE TABLE IF NOT EXISTS `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `item_type` ENUM('product', 'telecom', 'custom') NOT NULL,
    `product_id` INT DEFAULT NULL,
    `telecom_company_id` INT DEFAULT NULL,
    `telecom_phone` VARCHAR(20) DEFAULT NULL,
    `telecom_amount` DECIMAL(10, 2) DEFAULT NULL,
    `custom_name` VARCHAR(150) DEFAULT NULL,
    `quantity` INT DEFAULT 1,
    `price_per_unit` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`telecom_company_id`) REFERENCES `telecom_companies`(`id`) ON DELETE SET NULL,
    INDEX `idx_item_sale` (`sale_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Expenses table
CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_expense_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Seeding default data
-- Seed admin:username and password_hash = 'admin123'
-- Hash produced by password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`) VALUES
(1, 'admin', '$2y$10$D4AJ9ozSXBX682958mvXouFQbJ2k2XNNAeI0oiTSoKyEram3F6kZW', 'admin')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed default telecom operators
INSERT INTO `telecom_companies` (`id`, `name`, `logo_color`) VALUES
(1, 'Syriatel', '#e21a22'),
(2, 'MTN', '#fccb05')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed default products catalog
INSERT INTO `products` (`name`, `category`, `purchase_price`, `selling_price`, `stock`) VALUES
('Pepsi Cola', 'drink', 1500.00, 2000.00, 50),
('Coca Cola', 'drink', 1500.00, 2000.00, 48),
('Water 0.5L', 'drink', 700.00, 1000.00, 100),
('Lays Chips', 'snack', 1200.00, 1500.00, 30),
('Snickers Bar', 'snack', 2000.00, 2500.00, 20)
ON DUPLICATE KEY UPDATE `name`=`name`;
