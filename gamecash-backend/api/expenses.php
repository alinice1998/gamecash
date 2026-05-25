<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\expenses.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class ExpensesAPI {
    // GET api/expenses
    public static function list($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $query = "SELECT * FROM expenses WHERE tenant_id = :tenant_id ORDER BY created_at DESC LIMIT 200";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":tenant_id", $tenant_id);
        $stmt->execute();
        $expenses = $stmt->fetchAll();

        Response::success($expenses, "تم جلب المصاريف بنجاح.");
    }

    // POST api/expenses
    public static function create($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $category = isset($data['category']) ? trim($data['category']) : '';
        $amount = isset($data['amount']) ? floatval($data['amount']) : 0.00;
        $notes = isset($data['notes']) ? trim($data['notes']) : null;

        if (empty($category) || $amount <= 0) {
            Response::error("بيانات غير صالحة. يجب إدخال تصنيف الفئة وقيمة المصروف.");
        }

        $query = "INSERT INTO expenses (tenant_id, category, amount, notes) VALUES (:tenant_id, :category, :amount, :notes)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":tenant_id", $tenant_id);
        $stmt->bindParam(":category", $category);
        $stmt->bindParam(":amount", $amount);
        $stmt->bindParam(":notes", $notes);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            Response::success([
                "id" => $new_id,
                "category" => $category,
                "amount" => $amount,
                "notes" => $notes,
                "created_at" => date('Y-m-d H:i:s')
            ], "تم إضافة المصروف بنجاح.", 201);
        } else {
            Response::error("فشل إضافة المصروف.");
        }
    }

    // DELETE api/expenses
    public static function delete($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $id = isset($data['id']) ? intval($data['id']) : 0;

        if ($id <= 0) {
            Response::error("معرف المصروف غير صالح.");
        }

        $query = "DELETE FROM expenses WHERE id = :id AND tenant_id = :tenant_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":tenant_id", $tenant_id);

        if ($stmt->execute()) {
            Response::success(null, "تم حذف المصروف بنجاح.");
        } else {
            Response::error("فشل حذف المصروف.");
        }
    }
}

