<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\index.php

// 1. Enable CORS for development (allowing all origins, custom headers)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token");
header("Access-Control-Max-Age: 86400");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Load Core Dependencies
require_once __DIR__ . "/config/database.php";
require_once __DIR__ . "/helpers/response.php";
require_once __DIR__ . "/helpers/auth.php";

// Initialize database
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    Response::error("تعذر الاتصال بقاعدة البيانات. تأكد من تشغيل MySQL في XAMPP.", 500);
}

// 3. Routing Logic
// We read "?route=..." (highly reliable in XAMPP) or parse the REQUEST_URI as a fallback
$route = isset($_GET['route']) ? $_GET['route'] : '';

if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    // Remove subfolder if running inside htdocs/gamecash/gamecash-backend/
    $base_path = '/gamecash/gamecash-backend/';
    if (strpos($uri, $base_path) === 0) {
        $uri = substr($uri, strlen($base_path));
    }
    // Alternatively, if accessed directly in gamecash-backend folder
    $base_path_alt = '/gamecash-backend/';
    if (strpos($uri, $base_path_alt) === 0) {
        $uri = substr($uri, strlen($base_path_alt));
    }
    $route = trim($uri, '/');
}

$route = trim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Parse input payload (JSON support)
$input_data = [];
if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $decoded = json_decode($raw_input, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $input_data = $decoded;
        } else {
            // Fallback to standard POST array if not valid JSON
            $input_data = $_POST;
        }
    }
}

// Route mapping
switch ($route) {
    // AUTHENTICATION ROUTES
    case 'api/auth/login':
        require_once __DIR__ . "/api/auth.php";
        AuthAPI::login($db, $input_data);
        break;

    case 'api/auth/logout':
        require_once __DIR__ . "/api/auth.php";
        AuthAPI::logout($db);
        break;

    case 'api/auth/check':
        require_once __DIR__ . "/api/auth.php";
        AuthAPI::check($db);
        break;

    case 'api/auth/register_tenant':
        require_once __DIR__ . "/api/auth.php";
        AuthAPI::registerTenant($db, $input_data);
        break;

    // DASHBOARD ROUTE
    case 'api/dashboard':
        require_once __DIR__ . "/api/dashboard.php";
        DashboardAPI::getSummary($db);
        break;

    // PRODUCTS (INVENTORY) ROUTES
    case 'api/products':
        require_once __DIR__ . "/api/products.php";
        if ($method === 'GET') {
            ProductsAPI::list($db);
        } elseif ($method === 'POST') {
            ProductsAPI::create($db, $input_data);
        } elseif ($method === 'PUT') {
            ProductsAPI::update($db, $input_data);
        } elseif ($method === 'DELETE') {
            ProductsAPI::delete($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    // CUSTOMERS & DEBTS ROUTES
    case 'api/customers':
        require_once __DIR__ . "/api/customers.php";
        if ($method === 'GET') {
            CustomersAPI::list($db);
        } elseif ($method === 'POST') {
            CustomersAPI::create($db, $input_data);
        } elseif ($method === 'PUT') {
            CustomersAPI::update($db, $input_data);
        } elseif ($method === 'DELETE') {
            CustomersAPI::delete($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    case 'api/customers/payments':
        require_once __DIR__ . "/api/customers.php";
        if ($method === 'GET') {
            CustomersAPI::getPayments($db);
        } elseif ($method === 'POST') {
            CustomersAPI::logPayment($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    // TELECOM API ROUTES
    case 'api/telecom':
        require_once __DIR__ . "/api/telecom.php";
        if ($method === 'GET') {
            TelecomAPI::list($db);
        } elseif ($method === 'POST') {
            TelecomAPI::createCompany($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    // SALES ROUTES
    case 'api/sales':
        require_once __DIR__ . "/api/sales.php";
        if ($method === 'GET') {
            SalesAPI::list($db);
        } elseif ($method === 'POST') {
            SalesAPI::create($db, $input_data);
        } elseif ($method === 'DELETE') {
            SalesAPI::delete($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    case 'api/sales/all':
        require_once __DIR__ . "/api/sales.php";
        if ($method === 'DELETE') {
            SalesAPI::deleteAll($db);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    case 'api/sales/update':
        require_once __DIR__ . "/api/sales.php";
        if ($method === 'POST' || $method === 'PUT') {
            SalesAPI::update($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    // EXPENSES ROUTES
    case 'api/expenses':
        require_once __DIR__ . "/api/expenses.php";
        if ($method === 'GET') {
            ExpensesAPI::list($db);
        } elseif ($method === 'POST') {
            ExpensesAPI::create($db, $input_data);
        } elseif ($method === 'DELETE') {
            ExpensesAPI::delete($db, $input_data);
        } else {
            Response::notFound("طريقة الطلب غير مدعومة.");
        }
        break;

    default:
        Response::notFound("الصفحة أو المسار المطلوب غير موجود: " . htmlspecialchars($route));
        break;
}
