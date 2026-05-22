<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\sales.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class SalesAPI {
    // GET api/sales (Lists past sales with detail items)
    public static function list($db) {
        Auth::authenticate($db);

        try {
            // Get past 150 sales
            $query = "SELECT s.*, c.name as customer_name 
                      FROM sales s 
                      LEFT JOIN customers c ON s.customer_id = c.id 
                      ORDER BY s.created_at DESC LIMIT 150";
            $stmt = $db->prepare($query);
            $stmt->execute();
            $sales = $stmt->fetchAll();

            // For each sale, fetch its items
            $sales_list = [];
            foreach ($sales as $sale) {
                $items_query = "SELECT si.*, p.name as product_name, tc.name as telecom_name 
                                FROM sale_items si 
                                LEFT JOIN products p ON si.product_id = p.id 
                                LEFT JOIN telecom_companies tc ON si.telecom_company_id = tc.id 
                                WHERE si.sale_id = :sale_id";
                $items_stmt = $db->prepare($items_query);
                $items_stmt->bindParam(":sale_id", $sale['id']);
                $items_stmt->execute();
                $items = $items_stmt->fetchAll();

                $sale['items'] = $items;
                $sales_list[] = $sale;
            }

            Response::success($sales_list, "تم جلب المبيعات بنجاح.");
        } catch (Exception $e) {
            Response::error("فشل جلب قائمة المبيعات: " . $e->getMessage());
        }
    }

    // POST api/sales (Create unified multi-item sale)
    public static function create($db, $data) {
        Auth::authenticate($db);

        $customer_id = isset($data['customer_id']) && $data['customer_id'] !== '' ? intval($data['customer_id']) : null;
        $paid_amount = isset($data['paid_amount']) ? floatval($data['paid_amount']) : 0.00;
        $debt_amount = isset($data['debt_amount']) ? floatval($data['debt_amount']) : 0.00;
        $notes = isset($data['notes']) ? trim($data['notes']) : null;
        $items = isset($data['items']) ? $data['items'] : [];

        if (empty($items)) {
            Response::error("سلة البيع فارغة! يرجى إضافة عناصر أولاً.");
        }

        if ($debt_amount > 0 && empty($customer_id)) {
            Response::error("يرجى اختيار عميل لتسجيل مبلغ الدين المتبقي عليه.");
        }

        try {
            $db->beginTransaction();

            // 1. Calculate and verify totals
            $calculated_total = 0.00;
            $processed_items = [];

            foreach ($items as $index => $item) {
                $type = isset($item['type']) ? trim($item['type']) : '';
                $qty = isset($item['quantity']) ? intval($item['quantity']) : 1;
                $price = isset($item['price_per_unit']) ? floatval($item['price_per_unit']) : 0.00;

                if ($qty <= 0) {
                    throw new Exception("الكمية غير صالحة للعنصر رقم " . ($index + 1));
                }

                $item_total = $price * $qty;
                $calculated_total += $item_total;

                $processed_item = [
                    "type" => $type,
                    "quantity" => $qty,
                    "price_per_unit" => $price,
                    "total_price" => $item_total,
                    "product_id" => null,
                    "telecom_company_id" => null,
                    "telecom_phone" => null,
                    "telecom_amount" => null,
                    "custom_name" => null
                ];

                if ($type === 'product') {
                    $product_id = isset($item['product_id']) ? intval($item['product_id']) : 0;
                    if ($product_id <= 0) {
                        throw new Exception("معرف المنتج غير صالح.");
                    }

                    // Get product details and check stock
                    $prod_query = "SELECT name, stock FROM products WHERE id = :id FOR UPDATE";
                    $prod_stmt = $db->prepare($prod_query);
                    $prod_stmt->bindParam(":id", $product_id);
                    $prod_stmt->execute();
                    $product = $prod_stmt->fetch();

                    if (!$product) {
                        throw new Exception("المنتج ذو المعرف $product_id غير موجود.");
                    }

                    if ($product['stock'] < $qty) {
                        throw new Exception("المخزون غير كافي للمنتج: " . $product['name'] . " (المتوفر: " . $product['stock'] . ").");
                    }

                    // Deduct stock
                    $deduct_query = "UPDATE products SET stock = stock - :qty WHERE id = :id";
                    $deduct_stmt = $db->prepare($deduct_query);
                    $deduct_stmt->bindParam(":qty", $qty);
                    $deduct_stmt->bindParam(":id", $product_id);
                    $deduct_stmt->execute();

                    $processed_item['product_id'] = $product_id;

                } elseif ($type === 'telecom') {
                    $company_id = isset($item['telecom_company_id']) ? intval($item['telecom_company_id']) : 0;
                    $phone = isset($item['telecom_phone']) ? trim($item['telecom_phone']) : '';
                    $amount = isset($item['telecom_amount']) ? floatval($item['telecom_amount']) : 0.00;

                    if ($company_id <= 0 || empty($phone) || $amount <= 0) {
                        throw new Exception("بيانات تحويل الرصيد غير مكتملة.");
                    }

                    // Check company exists
                    $comp_query = "SELECT name FROM telecom_companies WHERE id = :id";
                    $comp_stmt = $db->prepare($comp_query);
                    $comp_stmt->bindParam(":id", $company_id);
                    $comp_stmt->execute();
                    if (!$comp_stmt->fetch()) {
                        throw new Exception("شركة الاتصالات المحددة غير موجودة.");
                    }

                    $processed_item['telecom_company_id'] = $company_id;
                    $processed_item['telecom_phone'] = $phone;
                    $processed_item['telecom_amount'] = $amount;

                } elseif ($type === 'custom') {
                    $custom_name = isset($item['custom_name']) ? trim($item['custom_name']) : '';
                    if (empty($custom_name)) {
                        throw new Exception("يرجى إدخال اسم الخدمة/اللعب المخصص.");
                    }
                    $processed_item['custom_name'] = $custom_name;

                } else {
                    throw new Exception("نوع العنصر غير مدعوم.");
                }

                $processed_items[] = $processed_item;
            }

            // Verify total sum matches paid + debt
            $total_paid_debt = $paid_amount + $debt_amount;
            if (abs($calculated_total - $total_paid_debt) > 0.05) {
                // If there's a discrepancy, enforce mathematics: total_amount = calculated_total
                // And adjust debt if client selected, or error
                $debt_amount = $calculated_total - $paid_amount;
                if ($debt_amount < 0) {
                    $paid_amount = $calculated_total;
                    $debt_amount = 0;
                }
                if ($debt_amount > 0 && empty($customer_id)) {
                    throw new Exception("القيم الحسابية غير متطابقة. يرجى اختيار زبون للتسجيل كدين أو تعديل المدفوع كاش.");
                }
            }

            // 2. Write to Sales table
            $sale_query = "INSERT INTO sales (customer_id, total_amount, paid_amount, debt_amount, notes) 
                           VALUES (:customer_id, :total_amount, :paid_amount, :debt_amount, :notes)";
            $sale_stmt = $db->prepare($sale_query);
            $sale_stmt->bindParam(":customer_id", $customer_id);
            $sale_stmt->bindParam(":total_amount", $calculated_total);
            $sale_stmt->bindParam(":paid_amount", $paid_amount);
            $sale_stmt->bindParam(":debt_amount", $debt_amount);
            $sale_stmt->bindParam(":notes", $notes);
            $sale_stmt->execute();

            $sale_id = $db->lastInsertId();

            // 3. Write items to sale_items table
            $item_query = "INSERT INTO sale_items (sale_id, item_type, product_id, telecom_company_id, 
                                                telecom_phone, telecom_amount, custom_name, quantity, 
                                                price_per_unit, total_price) 
                           VALUES (:sale_id, :item_type, :product_id, :telecom_company_id, 
                                   :telecom_phone, :telecom_amount, :custom_name, :quantity, 
                                   :price_per_unit, :total_price)";
            $item_stmt = $db->prepare($item_query);

            foreach ($processed_items as $item) {
                $item_stmt->bindParam(":sale_id", $sale_id);
                $item_stmt->bindParam(":item_type", $item['type']);
                $item_stmt->bindParam(":product_id", $item['product_id']);
                $item_stmt->bindParam(":telecom_company_id", $item['telecom_company_id']);
                $item_stmt->bindParam(":telecom_phone", $item['telecom_phone']);
                $item_stmt->bindParam(":telecom_amount", $item['telecom_amount']);
                $item_stmt->bindParam(":custom_name", $item['custom_name']);
                $item_stmt->bindParam(":quantity", $item['quantity']);
                $item_stmt->bindParam(":price_per_unit", $item['price_per_unit']);
                $item_stmt->bindParam(":total_price", $item['total_price']);
                $item_stmt->execute();
            }

            // 4. Update Customer's total debt balance if applicable
            if ($debt_amount > 0 && $customer_id) {
                $debt_query = "UPDATE customers SET total_debt = total_debt + :debt_amount WHERE id = :customer_id";
                $debt_stmt = $db->prepare($debt_query);
                $debt_stmt->bindParam(":debt_amount", $debt_amount);
                $debt_stmt->bindParam(":customer_id", $customer_id);
                $debt_stmt->execute();
            }

            $db->commit();

            Response::success([
                "sale_id" => $sale_id,
                "total_amount" => $calculated_total,
                "paid_amount" => $paid_amount,
                "debt_amount" => $debt_amount
            ], "تم تسجيل عملية البيع بنجاح وتحديث الحسابات والمخزن.");

        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage());
        }
    }
}
