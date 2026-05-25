<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\sales.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class SalesAPI {
    // GET api/sales (Lists past sales with detail items)
    public static function list($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        try {
            // Get past 150 sales
            $query = "SELECT s.*, c.name as customer_name 
                      FROM sales s 
                      LEFT JOIN customers c ON s.customer_id = c.id 
                      WHERE s.tenant_id = :tenant_id
                      ORDER BY s.created_at DESC LIMIT 150";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":tenant_id", $tenant_id);
            $stmt->execute();
            $sales = $stmt->fetchAll();

            // For each sale, fetch its items
            $sales_list = [];
            foreach ($sales as $sale) {
                $items_query = "SELECT si.*, p.name as product_name, tc.name as telecom_name 
                                FROM sale_items si 
                                LEFT JOIN products p ON si.product_id = p.id 
                                LEFT JOIN telecom_companies tc ON si.telecom_company_id = tc.id 
                                WHERE si.sale_id = :sale_id AND si.tenant_id = :tenant_id";
                $items_stmt = $db->prepare($items_query);
                $items_stmt->bindParam(":sale_id", $sale['id']);
                $items_stmt->bindParam(":tenant_id", $tenant_id);
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
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

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
                if ($type === 'playstation') {
                    $type = 'custom';
                }
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
                    $prod_query = "SELECT name, stock FROM products WHERE id = :id AND tenant_id = :tenant_id FOR UPDATE";
                    $prod_stmt = $db->prepare($prod_query);
                    $prod_stmt->bindParam(":id", $product_id);
                    $prod_stmt->bindParam(":tenant_id", $tenant_id);
                    $prod_stmt->execute();
                    $product = $prod_stmt->fetch();

                    if (!$product) {
                        throw new Exception("المنتج ذو المعرف $product_id غير موجود.");
                    }

                    if ($product['stock'] < $qty) {
                        throw new Exception("المخزون غير كافي للمنتج: " . $product['name'] . " (المتوفر: " . $product['stock'] . ").");
                    }

                    // Deduct stock
                    $deduct_query = "UPDATE products SET stock = stock - :qty WHERE id = :id AND tenant_id = :tenant_id";
                    $deduct_stmt = $db->prepare($deduct_query);
                    $deduct_stmt->bindParam(":qty", $qty);
                    $deduct_stmt->bindParam(":id", $product_id);
                    $deduct_stmt->bindParam(":tenant_id", $tenant_id);
                    $deduct_stmt->execute();

                    $processed_item['product_id'] = $product_id;

                } elseif ($type === 'telecom') {
                    $company_id = isset($item['telecom_company_id']) && intval($item['telecom_company_id']) > 0 ? intval($item['telecom_company_id']) : null;
                    $phone = isset($item['telecom_phone']) && trim($item['telecom_phone']) !== '' ? trim($item['telecom_phone']) : null;
                    $amount = isset($item['telecom_amount']) && floatval($item['telecom_amount']) > 0 ? floatval($item['telecom_amount']) : null;

                    // Check company exists only if company_id is provided
                    if ($company_id !== null) {
                        $comp_query = "SELECT name FROM telecom_companies WHERE id = :id AND tenant_id = :tenant_id";
                        $comp_stmt = $db->prepare($comp_query);
                        $comp_stmt->bindParam(":id", $company_id);
                        $comp_stmt->bindParam(":tenant_id", $tenant_id);
                        $comp_stmt->execute();
                        if (!$comp_stmt->fetch()) {
                            throw new Exception("شركة الاتصالات المحددة غير موجودة.");
                        }
                    }

                    $processed_item['telecom_company_id'] = $company_id;
                    $processed_item['telecom_phone'] = $phone;
                    $processed_item['telecom_amount'] = $amount;

                } elseif ($type === 'custom') {
                    $custom_name = '';
                    if (isset($item['custom_name']) && trim($item['custom_name']) !== '') {
                        $custom_name = trim($item['custom_name']);
                    } elseif (isset($item['ps_label']) && trim($item['ps_label']) !== '') {
                        $custom_name = trim($item['ps_label']);
                    }

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
            $sale_query = "INSERT INTO sales (tenant_id, customer_id, total_amount, paid_amount, debt_amount, notes) 
                           VALUES (:tenant_id, :customer_id, :total_amount, :paid_amount, :debt_amount, :notes)";
            $sale_stmt = $db->prepare($sale_query);
            $sale_stmt->bindParam(":tenant_id", $tenant_id);
            $sale_stmt->bindParam(":customer_id", $customer_id);
            $sale_stmt->bindParam(":total_amount", $calculated_total);
            $sale_stmt->bindParam(":paid_amount", $paid_amount);
            $sale_stmt->bindParam(":debt_amount", $debt_amount);
            $sale_stmt->bindParam(":notes", $notes);
            $sale_stmt->execute();

            $sale_id = $db->lastInsertId();

            // 3. Write items to sale_items table
            $item_query = "INSERT INTO sale_items (tenant_id, sale_id, item_type, product_id, telecom_company_id, 
                                                telecom_phone, telecom_amount, custom_name, quantity, 
                                                price_per_unit, total_price) 
                           VALUES (:tenant_id, :sale_id, :item_type, :product_id, :telecom_company_id, 
                                   :telecom_phone, :telecom_amount, :custom_name, :quantity, 
                                   :price_per_unit, :total_price)";
            $item_stmt = $db->prepare($item_query);

            foreach ($processed_items as $item) {
                $item_stmt->bindParam(":tenant_id", $tenant_id);
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
                $debt_query = "UPDATE customers SET total_debt = total_debt + :debt_amount WHERE id = :customer_id AND tenant_id = :tenant_id";
                $debt_stmt = $db->prepare($debt_query);
                $debt_stmt->bindParam(":debt_amount", $debt_amount);
                $debt_stmt->bindParam(":customer_id", $customer_id);
                $debt_stmt->bindParam(":tenant_id", $tenant_id);
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

    // PUT api/sales/update (Edit existing sale)
    public static function update($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $sale_id = isset($data['sale_id']) ? intval($data['sale_id']) : 0;
        if ($sale_id <= 0) {
            Response::error("معرف العملية غير صالح.");
        }

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

            // Fetch old sale
            $old_sale_stmt = $db->prepare("SELECT * FROM sales WHERE id = :id AND tenant_id = :tenant_id");
            $old_sale_stmt->bindParam(":id", $sale_id);
            $old_sale_stmt->execute();
            $old_sale = $old_sale_stmt->fetch();

            if (!$old_sale) {
                throw new Exception("العملية غير موجودة.");
            }

            // Fetch old items
            $old_items_stmt = $db->prepare("SELECT * FROM sale_items WHERE sale_id = :id AND tenant_id = :tenant_id");
            $old_items_stmt->bindParam(":id", $sale_id);
            $old_items_stmt->execute();
            $old_items = $old_items_stmt->fetchAll();

            // Revert old stock
            $revert_stock_stmt = $db->prepare("UPDATE products SET stock = stock + :qty WHERE id = :id AND tenant_id = :tenant_id");
            foreach ($old_items as $old_item) {
                if ($old_item['item_type'] === 'product' && $old_item['product_id']) {
                    $revert_stock_stmt->bindParam(":qty", $old_item['quantity']);
                    $revert_stock_stmt->bindParam(":id", $old_item['product_id']);
                    $revert_stock_stmt->execute();
                }
            }

            // Revert old debt
            if ($old_sale['debt_amount'] > 0 && $old_sale['customer_id']) {
                $revert_debt_stmt = $db->prepare("UPDATE customers SET total_debt = total_debt - :debt WHERE id = :cust_id AND tenant_id = :tenant_id");
                $revert_debt_stmt->bindParam(":debt", $old_sale['debt_amount']);
                $revert_debt_stmt->bindParam(":cust_id", $old_sale['customer_id']);
                $revert_debt_stmt->execute();
            }

            // Delete old items
            $delete_items_stmt = $db->prepare("DELETE FROM sale_items WHERE sale_id = :id AND tenant_id = :tenant_id");
            $delete_items_stmt->bindParam(":id", $sale_id);
            $delete_items_stmt->execute();

            // 1. Calculate and verify totals for new items
            $calculated_total = 0.00;
            $processed_items = [];

            foreach ($items as $index => $item) {
                $type = isset($item['type']) ? trim($item['type']) : '';
                if ($type === 'playstation') {
                    $type = 'custom';
                }
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
                    $prod_query = "SELECT name, stock FROM products WHERE id = :id AND tenant_id = :tenant_id FOR UPDATE";
                    $prod_stmt = $db->prepare($prod_query);
                    $prod_stmt->bindParam(":id", $product_id);
                    $prod_stmt->bindParam(":tenant_id", $tenant_id);
                    $prod_stmt->execute();
                    $product = $prod_stmt->fetch();

                    if (!$product) {
                        throw new Exception("المنتج ذو المعرف $product_id غير موجود.");
                    }

                    if ($product['stock'] < $qty) {
                        throw new Exception("المخزون غير كافي للمنتج: " . $product['name'] . " (المتوفر: " . $product['stock'] . ").");
                    }

                    // Deduct stock
                    $deduct_query = "UPDATE products SET stock = stock - :qty WHERE id = :id AND tenant_id = :tenant_id";
                    $deduct_stmt = $db->prepare($deduct_query);
                    $deduct_stmt->bindParam(":qty", $qty);
                    $deduct_stmt->bindParam(":id", $product_id);
                    $deduct_stmt->bindParam(":tenant_id", $tenant_id);
                    $deduct_stmt->execute();

                    $processed_item['product_id'] = $product_id;

                } elseif ($type === 'telecom') {
                    $company_id = isset($item['telecom_company_id']) && intval($item['telecom_company_id']) > 0 ? intval($item['telecom_company_id']) : null;
                    $phone = isset($item['telecom_phone']) && trim($item['telecom_phone']) !== '' ? trim($item['telecom_phone']) : null;
                    $amount = isset($item['telecom_amount']) && floatval($item['telecom_amount']) > 0 ? floatval($item['telecom_amount']) : null;

                    if ($company_id !== null) {
                        $comp_query = "SELECT name FROM telecom_companies WHERE id = :id AND tenant_id = :tenant_id";
                        $comp_stmt = $db->prepare($comp_query);
                        $comp_stmt->bindParam(":id", $company_id);
                        $comp_stmt->bindParam(":tenant_id", $tenant_id);
                        $comp_stmt->execute();
                        if (!$comp_stmt->fetch()) {
                            throw new Exception("شركة الاتصالات المحددة غير موجودة.");
                        }
                    }

                    $processed_item['telecom_company_id'] = $company_id;
                    $processed_item['telecom_phone'] = $phone;
                    $processed_item['telecom_amount'] = $amount;

                } elseif ($type === 'custom' || $type === 'chamcash') {
                    if ($type === 'chamcash') {
                        $processed_item['type'] = 'custom';
                        $custom_name = 'تحويل شام كاش';
                    } else {
                        $custom_name = '';
                        if (isset($item['custom_name']) && trim($item['custom_name']) !== '') {
                            $custom_name = trim($item['custom_name']);
                        } elseif (isset($item['ps_label']) && trim($item['ps_label']) !== '') {
                            $custom_name = trim($item['ps_label']);
                        } elseif (isset($item['name']) && trim($item['name']) !== '') {
                            $custom_name = trim($item['name']);
                        }

                        if (empty($custom_name)) {
                            throw new Exception("يرجى إدخال اسم الخدمة/اللعب المخصص.");
                        }
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
                $debt_amount = $calculated_total - $paid_amount;
                if ($debt_amount < 0) {
                    $paid_amount = $calculated_total;
                    $debt_amount = 0;
                }
                if ($debt_amount > 0 && empty($customer_id)) {
                    throw new Exception("القيم الحسابية غير متطابقة. يرجى اختيار زبون للتسجيل كدين أو تعديل المدفوع كاش.");
                }
            }

            // Update Sales table
            $sale_query = "UPDATE sales SET customer_id = :customer_id, total_amount = :total_amount, paid_amount = :paid_amount, debt_amount = :debt_amount, notes = :notes WHERE id = :sale_id AND tenant_id = :tenant_id";
            $sale_stmt = $db->prepare($sale_query);
            $sale_stmt->bindParam(":tenant_id", $tenant_id);
            $sale_stmt->bindParam(":customer_id", $customer_id);
            $sale_stmt->bindParam(":total_amount", $calculated_total);
            $sale_stmt->bindParam(":paid_amount", $paid_amount);
            $sale_stmt->bindParam(":debt_amount", $debt_amount);
            $sale_stmt->bindParam(":notes", $notes);
            $sale_stmt->bindParam(":sale_id", $sale_id);
            $sale_stmt->execute();

            // Write new items to sale_items table
            $item_query = "INSERT INTO sale_items (tenant_id, sale_id, item_type, product_id, telecom_company_id, 
                                                telecom_phone, telecom_amount, custom_name, quantity, 
                                                price_per_unit, total_price) 
                           VALUES (:tenant_id, :sale_id, :item_type, :product_id, :telecom_company_id, 
                                   :telecom_phone, :telecom_amount, :custom_name, :quantity, 
                                   :price_per_unit, :total_price)";
            $item_stmt = $db->prepare($item_query);

            foreach ($processed_items as $item) {
                $item_stmt->bindParam(":tenant_id", $tenant_id);
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

            // Update new Customer's total debt balance if applicable
            if ($debt_amount > 0 && $customer_id) {
                $debt_query = "UPDATE customers SET total_debt = total_debt + :debt_amount WHERE id = :customer_id AND tenant_id = :tenant_id";
                $debt_stmt = $db->prepare($debt_query);
                $debt_stmt->bindParam(":debt_amount", $debt_amount);
                $debt_stmt->bindParam(":customer_id", $customer_id);
                $debt_stmt->bindParam(":tenant_id", $tenant_id);
                $debt_stmt->execute();
            }

            $db->commit();

            Response::success([
                "sale_id" => $sale_id,
                "total_amount" => $calculated_total,
                "paid_amount" => $paid_amount,
                "debt_amount" => $debt_amount
            ], "تم تعديل عملية البيع بنجاح وتحديث الحسابات والمخزن.");

        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage());
        }
    }

    // DELETE api/sales (Delete existing sale)
    public static function delete($db, $data) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $sale_id = isset($data['sale_id']) ? intval($data['sale_id']) : 0;
        if ($sale_id <= 0) {
            Response::error("معرف العملية غير صالح.");
        }

        try {
            $db->beginTransaction();

            // Fetch old sale
            $old_sale_stmt = $db->prepare("SELECT * FROM sales WHERE id = :id AND tenant_id = :tenant_id");
            $old_sale_stmt->bindParam(":id", $sale_id);
            $old_sale_stmt->execute();
            $old_sale = $old_sale_stmt->fetch();

            if (!$old_sale) {
                throw new Exception("العملية غير موجودة.");
            }

            // Fetch old items
            $old_items_stmt = $db->prepare("SELECT * FROM sale_items WHERE sale_id = :id AND tenant_id = :tenant_id");
            $old_items_stmt->bindParam(":id", $sale_id);
            $old_items_stmt->execute();
            $old_items = $old_items_stmt->fetchAll();

            // Revert old stock
            $revert_stock_stmt = $db->prepare("UPDATE products SET stock = stock + :qty WHERE id = :id AND tenant_id = :tenant_id");
            foreach ($old_items as $old_item) {
                if ($old_item['item_type'] === 'product' && $old_item['product_id']) {
                    $revert_stock_stmt->bindParam(":qty", $old_item['quantity']);
                    $revert_stock_stmt->bindParam(":id", $old_item['product_id']);
                    $revert_stock_stmt->execute();
                }
            }

            // Revert old debt
            if ($old_sale['debt_amount'] > 0 && $old_sale['customer_id']) {
                $revert_debt_stmt = $db->prepare("UPDATE customers SET total_debt = total_debt - :debt WHERE id = :cust_id AND tenant_id = :tenant_id");
                $revert_debt_stmt->bindParam(":debt", $old_sale['debt_amount']);
                $revert_debt_stmt->bindParam(":cust_id", $old_sale['customer_id']);
                $revert_debt_stmt->execute();
            }

            // Delete items
            $delete_items_stmt = $db->prepare("DELETE FROM sale_items WHERE sale_id = :id AND tenant_id = :tenant_id");
            $delete_items_stmt->bindParam(":id", $sale_id);
            $delete_items_stmt->execute();

            // Delete sale
            $delete_sale_stmt = $db->prepare("DELETE FROM sales WHERE id = :id AND tenant_id = :tenant_id");
            $delete_sale_stmt->bindParam(":id", $sale_id);
            $delete_sale_stmt->execute();

            $db->commit();

            Response::success(null, "تم حذف عملية البيع بنجاح واسترجاع المخزون والديون.");

        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage());
        }
    }

    // DELETE api/sales/all (Delete all sales)
    public static function deleteAll($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        try {
            $db->beginTransaction();

            // Fetch all sales
            $old_sales_stmt = $db->prepare("SELECT * FROM sales WHERE tenant_id = :tenant_id");
            $old_sales_stmt->bindParam(":tenant_id", $tenant_id);
            $old_sales_stmt->execute();
            $old_sales = $old_sales_stmt->fetchAll();

            foreach ($old_sales as $old_sale) {
                $sale_id = $old_sale['id'];
                
                // Fetch items
                $old_items_stmt = $db->prepare("SELECT * FROM sale_items WHERE sale_id = :id AND tenant_id = :tenant_id");
                $old_items_stmt->bindParam(":id", $sale_id);
                $old_items_stmt->execute();
                $old_items = $old_items_stmt->fetchAll();

                // Revert stock
                $revert_stock_stmt = $db->prepare("UPDATE products SET stock = stock + :qty WHERE id = :id AND tenant_id = :tenant_id");
                foreach ($old_items as $old_item) {
                    if ($old_item['item_type'] === 'product' && $old_item['product_id']) {
                        $revert_stock_stmt->bindParam(":qty", $old_item['quantity']);
                        $revert_stock_stmt->bindParam(":id", $old_item['product_id']);
                        $revert_stock_stmt->execute();
                    }
                }

                // Revert debt
                if ($old_sale['debt_amount'] > 0 && $old_sale['customer_id']) {
                    $revert_debt_stmt = $db->prepare("UPDATE customers SET total_debt = total_debt - :debt WHERE id = :cust_id AND tenant_id = :tenant_id");
                    $revert_debt_stmt->bindParam(":debt", $old_sale['debt_amount']);
                    $revert_debt_stmt->bindParam(":cust_id", $old_sale['customer_id']);
                    $revert_debt_stmt->execute();
                }
            }

            // Delete all items and sales
            $del_items = $db->prepare("DELETE FROM sale_items WHERE tenant_id = :tenant_id");
            $del_items->bindParam(":tenant_id", $tenant_id);
            $del_items->execute();
            
            $del_sales = $db->prepare("DELETE FROM sales WHERE tenant_id = :tenant_id");
            $del_sales->bindParam(":tenant_id", $tenant_id);
            $del_sales->execute();

            $db->commit();

            Response::success(null, "تم حذف جميع العمليات بنجاح واسترجاع المخزون والديون المتعلقة بها.");

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error("فشل حذف العمليات: " . $e->getMessage());
        }
    }
}
