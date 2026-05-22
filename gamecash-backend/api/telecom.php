<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\telecom.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class TelecomAPI {
    // GET api/telecom
    public static function list($db) {
        Auth::authenticate($db);

        $query = "SELECT * FROM telecom_companies ORDER BY name ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $companies = $stmt->fetchAll();

        Response::success($companies, "تم جلب شركات الاتصال بنجاح.");
    }

    // POST api/telecom
    public static function createCompany($db, $data) {
        Auth::authenticate($db);

        $name = isset($data['name']) ? trim($data['name']) : '';
        $logo_color = isset($data['logo_color']) ? trim($data['logo_color']) : '#cccccc';

        if (empty($name)) {
            Response::error("يرجى إدخال اسم شركة الاتصال.");
        }

        // Check uniqueness
        $check_query = "SELECT id FROM telecom_companies WHERE name = :name LIMIT 1";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":name", $name);
        $check_stmt->execute();
        if ($check_stmt->fetch()) {
            Response::error("شركة الاتصال مضافة بالفعل.");
        }

        $query = "INSERT INTO telecom_companies (name, logo_color) VALUES (:name, :logo_color)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":logo_color", $logo_color);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            Response::success([
                "id" => $new_id,
                "name" => $name,
                "logo_color" => $logo_color
            ], "تم إضافة شركة الاتصال بنجاح.", 201);
        } else {
            Response::error("فشل إضافة شركة الاتصال.");
        }
    }
}
