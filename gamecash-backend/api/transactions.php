<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\transactions.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class TransactionsAPI {
    // GET api/transactions
    public static function list($db) {
        $user = Auth::authenticate($db);
        $tenant_id = $user['tenant_id'];

        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        if ($page < 1) $page = 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        if ($limit < 1) $limit = 20;
        if ($limit > 500) $limit = 500; // Hard cap
        $offset = ($page - 1) * $limit;
        
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        try {
            // Count query
            $count_sales_query = "SELECT COUNT(*) FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.tenant_id = :tenant_id";
            $count_payments_query = "SELECT COUNT(*) FROM customer_payments p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.tenant_id = :tenant_id";
            
            if ($search !== '') {
                $count_sales_query .= " AND c.name LIKE :search";
                $count_payments_query .= " AND c.name LIKE :search";
            }

            $count_sales_stmt = $db->prepare($count_sales_query);
            $count_payments_stmt = $db->prepare($count_payments_query);
            
            $count_sales_stmt->bindParam(":tenant_id", $tenant_id);
            $count_payments_stmt->bindParam(":tenant_id", $tenant_id);

            if ($search !== '') {
                $searchTerm = "%$search%";
                $count_sales_stmt->bindParam(":search", $searchTerm);
                $count_payments_stmt->bindParam(":search", $searchTerm);
            }

            $count_sales_stmt->execute();
            $count_payments_stmt->execute();

            $total_records = $count_sales_stmt->fetchColumn() + $count_payments_stmt->fetchColumn();
            $total_pages = ceil($total_records / $limit);

            // Data query
            $query = "
            SELECT * FROM (
                SELECT 
                    s.id, s.customer_id, s.total_amount, s.paid_amount, s.debt_amount, s.notes, s.created_at, c.name as customer_name, 'sale' as record_type
                FROM sales s 
                LEFT JOIN customers c ON s.customer_id = c.id 
                WHERE s.tenant_id = :tenant_id
                UNION ALL
                SELECT 
                    p.id, p.customer_id, 0 as total_amount, p.amount_paid as paid_amount, 0 as debt_amount, p.notes, p.created_at, c.name as customer_name, 'payment' as record_type
                FROM customer_payments p 
                LEFT JOIN customers c ON p.customer_id = c.id 
                WHERE p.tenant_id = :tenant_id
            ) as t
            ";

            if ($search !== '') {
                $query .= " WHERE t.customer_name LIKE :search ";
            }

            $query .= " ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($query);
            $stmt->bindParam(":tenant_id", $tenant_id);
            if ($search !== '') {
                $stmt->bindParam(":search", $searchTerm);
            }
            $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
            $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $transactions = $stmt->fetchAll();

            // Transform into the format expected by the app
            $formatted_transactions = [];
            foreach ($transactions as $tx) {
                // Determine if it's a payment
                $isPayment = ($tx['record_type'] === 'payment');
                
                $formatted_transactions[] = [
                    'id' => $tx['id'],
                    'customer_id' => $tx['customer_id'],
                    'customer_name' => $tx['customer_name'],
                    'total_amount' => floatval($tx['total_amount']),
                    'paid_amount' => floatval($tx['paid_amount']),
                    'debt_amount' => floatval($tx['debt_amount']),
                    'amount_paid' => floatval($tx['paid_amount']), // for payment backward compat
                    'notes' => $tx['notes'],
                    'created_at' => $tx['created_at'],
                    'is_payment' => $isPayment
                ];
            }

            Response::success([
                'data' => $formatted_transactions,
                'pagination' => [
                    'total' => $total_records,
                    'page' => $page,
                    'limit' => $limit,
                    'total_pages' => $total_pages
                ]
            ], "تم جلب السجلات بنجاح.");

        } catch (Exception $e) {
            Response::error("فشل جلب السجلات: " . $e->getMessage());
        }
    }
}
