<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\setup.php

require_once __DIR__ . "/config/database.php";
require_once __DIR__ . "/helpers/response.php";

try {
    $database = new Database();
    $pdo = $database->getConnection();

    if (!$pdo) {
        die(json_encode(["success" => false, "message" => "Setup failed: Could not connect to database. Please check config/database.php."]));
    }

    $schema_file = __DIR__ . "/config/schema.sql";
    if (!file_exists($schema_file)) {
        die(json_encode(["success" => false, "message" => "schema.sql not found"]));
    }

    $sql = file_get_contents($schema_file);

    // Remove DROP DATABASE / CREATE DATABASE / USE as shared hosts don't allow it
    $sql = preg_replace('/DROP DATABASE IF EXISTS `gamecash`;/i', '', $sql);
    $sql = preg_replace('/CREATE DATABASE `gamecash`[^;]*;/i', '', $sql);
    $sql = preg_replace('/USE `gamecash`;/i', '', $sql);

    // Disable foreign keys to drop existing tables without errors
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0;");

    // Drop old tables to force recreating them with the new tenant_id columns
    $pdo->exec("DROP TABLE IF EXISTS `user_tokens`, `users`, `sale_items`, `sales`, `expenses`, `telecom_companies`, `customer_payments`, `customers`, `products`, `tenants`;");

    // Execute the modified schema
    $pdo->exec($sql);

    // Re-enable foreign keys
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1;");

    echo json_encode(["success" => true, "message" => "Database schema updated successfully for Multi-Tenant architecture. All tables recreated and default data seeded."]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Setup failed: " . $e->getMessage()]);
}
