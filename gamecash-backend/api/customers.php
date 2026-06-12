<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\customers.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class CustomersAPI {
    // GET api/customers
    public static function list($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $query = "SELECT * FROM customers WHERE tenant_id = :tenant_id ORDER BY name ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":tenant_id", $tenant_id);
        $stmt->execute();
        $customers = $stmt->fetchAll();

        Response::success($customers, "تم جلب قائمة العملاء بنجاح.");
    }

    // POST api/customers (Create)
    public static function create($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $name = isset($data['name']) ? trim($data['name']) : '';
        $phone = isset($data['phone']) ? trim($data['phone']) : null;

        if (empty($name)) {
            Response::error("يرجى إدخال اسم العميل.");
        }

        // Check uniqueness per tenant
        $check_query = "SELECT id FROM customers WHERE name = :name AND tenant_id = :tenant_id LIMIT 1";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":name", $name);
        $check_stmt->bindParam(":tenant_id", $tenant_id);
        $check_stmt->execute();
        if ($check_stmt->fetch()) {
            Response::error("اسم العميل موجود بالفعل.");
        }

        $query = "INSERT INTO customers (tenant_id, name, phone, total_debt) VALUES (:tenant_id, :name, :phone, 0.00)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":tenant_id", $tenant_id);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":phone", $phone);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            Response::success([
                "id" => $new_id,
                "name" => $name,
                "phone" => $phone,
                "total_debt" => 0.00
            ], "تم إضافة العميل بنجاح.", 201);
        } else {
            Response::error("فشل إضافة العميل.");
        }
    }

    // PUT api/customers (Update)
    public static function update($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $id = isset($data['id']) ? intval($data['id']) : 0;
        $name = isset($data['name']) ? trim($data['name']) : '';
        $phone = isset($data['phone']) ? trim($data['phone']) : null;

        if ($id <= 0 || empty($name)) {
            Response::error("بيانات غير صالحة لتعديل العميل.");
        }

        // Check uniqueness per tenant
        $check_query = "SELECT id FROM customers WHERE name = :name AND id != :id AND tenant_id = :tenant_id LIMIT 1";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":name", $name);
        $check_stmt->bindParam(":id", $id);
        $check_stmt->bindParam(":tenant_id", $tenant_id);
        $check_stmt->execute();
        if ($check_stmt->fetch()) {
            Response::error("اسم العميل مستخدم بالفعل لدى زبون آخر.");
        }

        $query = "UPDATE customers SET name = :name, phone = :phone WHERE id = :id AND tenant_id = :tenant_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":phone", $phone);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":tenant_id", $tenant_id);

        if ($stmt->execute()) {
            Response::success([
                "id" => $id,
                "name" => $name,
                "phone" => $phone
            ], "تم تحديث بيانات العميل بنجاح.");
        } else {
            Response::error("فشل تحديث العميل.");
        }
    }

    // DELETE api/customers
    public static function delete($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $id = isset($data['id']) ? intval($data['id']) : 0;

        if ($id <= 0) {
            Response::error("معرف العميل غير صالح.");
        }

        $query = "DELETE FROM customers WHERE id = :id AND tenant_id = :tenant_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":tenant_id", $tenant_id);

        if ($stmt->execute()) {
            Response::success(null, "تم حذف العميل بنجاح.");
        } else {
            Response::error("فشل حذف العميل.");
        }
    }

    // GET api/customers/payments (List payoffs)
    public static function getPayments($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $customer_id = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : 0;

        if ($customer_id > 0) {
            $query = "SELECT p.*, c.name as customer_name 
                      FROM customer_payments p 
                      JOIN customers c ON p.customer_id = c.id 
                      WHERE p.customer_id = :customer_id AND p.tenant_id = :tenant_id 
                      ORDER BY p.created_at DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":customer_id", $customer_id);
            $stmt->bindParam(":tenant_id", $tenant_id);
        } else {
            $query = "SELECT p.*, c.name as customer_name 
                      FROM customer_payments p 
                      JOIN customers c ON p.customer_id = c.id 
                      WHERE p.tenant_id = :tenant_id 
                      ORDER BY p.created_at DESC LIMIT 5000";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":tenant_id", $tenant_id);
        }

        $stmt->execute();
        $payments = $stmt->fetchAll();

        Response::success($payments, "تم جلب دفعات سداد الديون.");
    }

    // POST api/customers/payments (Log a payoff)
    public static function logPayment($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $customer_id = isset($data['customer_id']) ? intval($data['customer_id']) : 0;
        $amount_paid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0.00;
        $notes = isset($data['notes']) ? trim($data['notes']) : null;

        if ($customer_id <= 0 || $amount_paid <= 0) {
            Response::error("بيانات سداد غير صالحة. يجب تحديد العميل والمبلغ المدفوع.");
        }

        // Start transaction for safe math updates
        try {
            $db->beginTransaction();

            // 1. Get customer and verify debt
            $cust_query = "SELECT name, total_debt FROM customers WHERE id = :customer_id AND tenant_id = :tenant_id FOR UPDATE";
            $cust_stmt = $db->prepare($cust_query);
            $cust_stmt->bindParam(":customer_id", $customer_id);
            $cust_stmt->bindParam(":tenant_id", $tenant_id);
            $cust_stmt->execute();
            $customer = $cust_stmt->fetch();

            if (!$customer) {
                throw new Exception("العميل غير موجود.");
            }

            $current_debt = floatval($customer['total_debt']);
            $new_debt = $current_debt - $amount_paid;

            // 2. Update Customer's total debt balance
            $up_query = "UPDATE customers SET total_debt = :new_debt WHERE id = :customer_id AND tenant_id = :tenant_id";
            $up_stmt = $db->prepare($up_query);
            $up_stmt->bindParam(":new_debt", $new_debt);
            $up_stmt->bindParam(":customer_id", $customer_id);
            $up_stmt->bindParam(":tenant_id", $tenant_id);
            $up_stmt->execute();

            // 3. Log into customer payments
            $pay_query = "INSERT INTO customer_payments (tenant_id, customer_id, amount_paid, notes) 
                          VALUES (:tenant_id, :customer_id, :amount_paid, :notes)";
            $pay_stmt = $db->prepare($pay_query);
            $pay_stmt->bindParam(":tenant_id", $tenant_id);
            $pay_stmt->bindParam(":customer_id", $customer_id);
            $pay_stmt->bindParam(":amount_paid", $amount_paid);
            $pay_stmt->bindParam(":notes", $notes);
            $pay_stmt->execute();

            $payment_id = $db->lastInsertId();

            $db->commit();

            Response::success([
                "payment_id" => $payment_id,
                "customer_id" => $customer_id,
                "customer_name" => $customer['name'],
                "amount_paid" => $amount_paid,
                "remaining_debt" => $new_debt,
                "notes" => $notes
            ], "تم تسجيل دفعة السداد بنجاح وتحديث رصيد الدين.");

        } catch (Exception $e) {
            $db->rollBack();
            Response::error("فشل تسجيل دفعة السداد: " . $e->getMessage());
        }
    }
}

