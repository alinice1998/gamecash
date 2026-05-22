<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\dashboard.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class DashboardAPI {
    // GET api/dashboard
    public static function getSummary($db) {
        Auth::authenticate($db);

        try {
            // 1. Calculate safe cash box: SUM(sales.paid_amount) + SUM(customer_payments.amount_paid) - SUM(expenses.amount)
            $sales_paid_stmt = $db->query("SELECT SUM(paid_amount) FROM sales");
            $sales_paid = floatval($sales_paid_stmt->fetchColumn());

            $payments_stmt = $db->query("SELECT SUM(amount_paid) FROM customer_payments");
            $payments = floatval($payments_stmt->fetchColumn());

            $expenses_stmt = $db->query("SELECT SUM(amount) FROM expenses");
            $expenses = floatval($expenses_stmt->fetchColumn());

            $cash_safe = ($sales_paid + $payments) - $expenses;

            // 2. Active outstanding debts (sum of customer debts)
            $debts_stmt = $db->query("SELECT SUM(total_debt) FROM customers");
            $total_debts = floatval($debts_stmt->fetchColumn());

            // 3. Today's stats (Sales, Cash, Debts, Payments, Expenses)
            $today_sales_stmt = $db->query("SELECT SUM(total_amount), SUM(paid_amount), SUM(debt_amount) FROM sales WHERE DATE(created_at) = CURDATE()");
            $today_sales_data = $today_sales_stmt->fetch();
            $today_sales_total = floatval($today_sales_data['SUM(total_amount)']);
            $today_sales_cash = floatval($today_sales_data['SUM(paid_amount)']);
            $today_sales_debt = floatval($today_sales_data['SUM(debt_amount)']);

            $today_payments_stmt = $db->query("SELECT SUM(amount_paid) FROM customer_payments WHERE DATE(created_at) = CURDATE()");
            $today_payments = floatval($today_payments_stmt->fetchColumn());

            $today_expenses_stmt = $db->query("SELECT SUM(amount) FROM expenses WHERE DATE(created_at) = CURDATE()");
            $today_expenses = floatval($today_expenses_stmt->fetchColumn());

            // Today's total cash flow surplus/deficit inside register
            $today_net_cash = ($today_sales_cash + $today_payments) - $today_expenses;

            // 4. Products low in stock warning count (stock <= 5)
            $low_stock_stmt = $db->query("SELECT COUNT(*) FROM products WHERE stock <= 5");
            $low_stock_count = intval($low_stock_stmt->fetchColumn());

            $low_stock_list_stmt = $db->query("SELECT name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10");
            $low_stock_items = $low_stock_list_stmt->fetchAll();

            // 5. Recent 5 Sales
            $recent_sales_query = "SELECT s.*, c.name as customer_name 
                                   FROM sales s 
                                   LEFT JOIN customers c ON s.customer_id = c.id 
                                   ORDER BY s.created_at DESC LIMIT 5";
            $recent_sales_stmt = $db->query($recent_sales_query);
            $recent_sales = $recent_sales_stmt->fetchAll();

            // 6. Recent 5 Payments
            $recent_payments_query = "SELECT p.*, c.name as customer_name 
                                      FROM customer_payments p 
                                      JOIN customers c ON p.customer_id = c.id 
                                      ORDER BY p.created_at DESC LIMIT 5";
            $recent_payments_stmt = $db->query($recent_payments_query);
            $recent_payments = $recent_payments_stmt->fetchAll();

            // 7. Recent 5 Expenses
            $recent_expenses_query = "SELECT * FROM expenses ORDER BY created_at DESC LIMIT 5";
            $recent_expenses_stmt = $db->query($recent_expenses_query);
            $recent_expenses = $recent_expenses_stmt->fetchAll();

            // 8. Weekly stats for chart reporting (Sales vs Expenses over past 7 days)
            $chart_data = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $label = date('m-d', strtotime("-$i days"));
                
                // Get sales on that day
                $s_stmt = $db->prepare("SELECT SUM(total_amount) FROM sales WHERE DATE(created_at) = :date");
                $s_stmt->execute([":date" => $date]);
                $s_val = floatval($s_stmt->fetchColumn());

                // Get expenses on that day
                $e_stmt = $db->prepare("SELECT SUM(amount) FROM expenses WHERE DATE(created_at) = :date");
                $e_stmt->execute([":date" => $date]);
                $e_val = floatval($e_stmt->fetchColumn());

                $chart_data[] = [
                    "label" => $label,
                    "sales" => $s_val,
                    "expenses" => $e_val
                ];
            }

            // Return aggregated package
            Response::success([
                "cash_safe" => $cash_safe,
                "total_debts" => $total_debts,
                "today" => [
                    "sales_total" => $today_sales_total,
                    "sales_cash" => $today_sales_cash,
                    "sales_debt" => $today_sales_debt,
                    "payments" => $today_payments,
                    "expenses" => $today_expenses,
                    "net_cash" => $today_net_cash
                ],
                "warnings" => [
                    "low_stock_count" => $low_stock_count,
                    "low_stock_items" => $low_stock_items
                ],
                "recent_sales" => $recent_sales,
                "recent_payments" => $recent_payments,
                "recent_expenses" => $recent_expenses,
                "chart_data" => $chart_data
            ], "تم احتساب إحصائيات لوحة التحكم بنجاح.");

        } catch (Exception $e) {
            Response::error("فشل احتساب البيانات الإحصائية للوحة التحكم: " . $e->getMessage());
        }
    }
}
