<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\products.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class ProductsAPI {
    // GET api/products
    public static function list($db) {
        Auth::authenticate($db);

        $query = "SELECT * FROM products ORDER BY name ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $products = $stmt->fetchAll();

        Response::success($products, "تم جلب قائمة المنتجات بنجاح.");
    }

    // POST api/products (Create)
    public static function create($db, $data) {
        Auth::authenticate($db);

        $name = isset($data['name']) ? trim($data['name']) : '';
        $category = isset($data['category']) ? trim($data['category']) : 'snack';
        $purchase_price = isset($data['purchase_price']) ? floatval($data['purchase_price']) : 0.00;
        $selling_price = isset($data['selling_price']) ? floatval($data['selling_price']) : 0.00;
        $stock = isset($data['stock']) ? intval($data['stock']) : 0;

        if (empty($name)) {
            Response::error("يرجى إدخال اسم المنتج.");
        }

        // Check unique name
        $check_query = "SELECT id FROM products WHERE name = :name LIMIT 1";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":name", $name);
        $check_stmt->execute();
        if ($check_stmt->fetch()) {
            Response::error("اسم المنتج موجود بالفعل.");
        }

        $query = "INSERT INTO products (name, category, purchase_price, selling_price, stock) 
                  VALUES (:name, :category, :purchase_price, :selling_price, :stock)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":category", $category);
        $stmt->bindParam(":purchase_price", $purchase_price);
        $stmt->bindParam(":selling_price", $selling_price);
        $stmt->bindParam(":stock", $stock);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            Response::success([
                "id" => $new_id,
                "name" => $name,
                "category" => $category,
                "purchase_price" => $purchase_price,
                "selling_price" => $selling_price,
                "stock" => $stock
            ], "تم إضافة المنتج بنجاح.", 201);
        } else {
            Response::error("فشل إضافة المنتج.");
        }
    }

    // PUT api/products (Update)
    public static function update($db, $data) {
        Auth::authenticate($db);

        $id = isset($data['id']) ? intval($data['id']) : 0;
        $name = isset($data['name']) ? trim($data['name']) : '';
        $category = isset($data['category']) ? trim($data['category']) : 'snack';
        $purchase_price = isset($data['purchase_price']) ? floatval($data['purchase_price']) : 0.00;
        $selling_price = isset($data['selling_price']) ? floatval($data['selling_price']) : 0.00;
        $stock = isset($data['stock']) ? intval($data['stock']) : 0;

        if ($id <= 0 || empty($name)) {
            Response::error("بيانات غير صالحة لتعديل المنتج.");
        }

        // Check unique name excluding self
        $check_query = "SELECT id FROM products WHERE name = :name AND id != :id LIMIT 1";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":name", $name);
        $check_stmt->bindParam(":id", $id);
        $check_stmt->execute();
        if ($check_stmt->fetch()) {
            Response::error("اسم المنتج مستخدم بالفعل في منتج آخر.");
        }

        $query = "UPDATE products 
                  SET name = :name, category = :category, purchase_price = :purchase_price, 
                      selling_price = :selling_price, stock = :stock 
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":category", $category);
        $stmt->bindParam(":purchase_price", $purchase_price);
        $stmt->bindParam(":selling_price", $selling_price);
        $stmt->bindParam(":stock", $stock);
        $stmt->bindParam(":id", $id);

        if ($stmt->execute()) {
            Response::success([
                "id" => $id,
                "name" => $name,
                "category" => $category,
                "purchase_price" => $purchase_price,
                "selling_price" => $selling_price,
                "stock" => $stock
            ], "تم تحديث المنتج بنجاح.");
        } else {
            Response::error("فشل تحديث المنتج.");
        }
    }

    // DELETE api/products (Delete)
    public static function delete($db, $data) {
        Auth::authenticate($db);

        $id = isset($data['id']) ? intval($data['id']) : 0;

        if ($id <= 0) {
            Response::error("معرف المنتج غير صالح.");
        }

        $query = "DELETE FROM products WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);

        if ($stmt->execute()) {
            Response::success(null, "تم حذف المنتج بنجاح.");
        } else {
            Response::error("فشل حذف المنتج.");
        }
    }
}
