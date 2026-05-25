<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\setup.php

require_once __DIR__ . "/config/database.php";
require_once __DIR__ . "/helpers/response.php";

try {
    $db_host = "localhost";
    $db_name = "gamecash";
    $db_user = "root";
    $db_pass = "";

    // Connect without DB to run DROP/CREATE commands safely first
    $pdo = new PDO("mysql:host=" . $db_host, $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $schema_file = __DIR__ . "/config/schema.sql";
    if (!file_exists($schema_file)) {
        die(json_encode(["success" => false, "message" => "schema.sql not found"]));
    }

    $sql = file_get_contents($schema_file);

    // Execute the full schema (assuming XAMPP root without password)
    $pdo->exec($sql);

    echo json_encode(["success" => true, "message" => "Database schema updated successfully for Multi-Tenant architecture. All default data seeded."]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Setup failed: " . $e->getMessage()]);
}
