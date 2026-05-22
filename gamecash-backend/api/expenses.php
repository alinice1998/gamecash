<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\expenses.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class ExpensesAPI {
    // GET api/expenses
    public static function list($db) {
        Auth::authenticate($db);

        $query = "SELECT * FROM expenses ORDER BY created_at DESC LIMIT 200";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $expenses = $stmt->fetchAll();

        Response::success($expenses, "تم جلب المصاريف بنجاح.");
    }

    // POST api/expenses
    public static function create($db, $data) {
        Auth::authenticate($db);

        $category = isset($data['category']) ? trim($data['category']) : '';
        $amount = isset($data['amount']) ? floatval($data['amount']) : 0.00;
        $notes = isset($data['notes']) ? trim($data['notes']) : null;

        if (empty($category) || $amount <= 0) {
            Response::error("بيانات غير صالحة. يجب إدخال تصنيف الفئة وقيمة المصروف.");
        }

        $query = "INSERT INTO expenses (category, amount, notes) VALUES (:category, :amount, :notes)";
        $stmt = $db->prepare($query);
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
        Auth::authenticate($db);

        $id = isset($data['id']) ? intval($data['id']) : 0;

        if ($id <= 0) {
            Response::error("معرف المصروف غير صالح.");
        }

        $query = "DELETE FROM expenses WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);

        if ($stmt->execute()) {
            Response::success(null, "تم حذف المصروف بنجاح.");
        } else {
            Response::error("فشل حذف المصروف.");
        }
    }
}
