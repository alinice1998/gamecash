<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\api\auth.php

require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/response.php";

class AuthAPI {
    // POST api/auth/login
    public static function login($db, $data) {
        $username = isset($data['username']) ? trim($data['username']) : '';
        $password = isset($data['password']) ? $data['password'] : '';

        if (empty($username) || empty($password)) {
            Response::error("يرجى إدخال اسم المستخدم وكلمة المرور.");
        }

        // Fetch user from DB
        $query = "SELECT * FROM users WHERE username = :username LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->execute();
        
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // Generate login token
            $token_info = Auth::generateToken($db, $user['id']);
            if ($token_info) {
                Response::success([
                    "user" => [
                        "id" => $user['id'],
                        "username" => $user['username'],
                        "role" => $user['role']
                    ],
                    "token" => $token_info['token'],
                    "expires_at" => $token_info['expires_at']
                ], "تم تسجيل الدخول بنجاح.");
            } else {
                Response::error("فشل إنشاء رمز الجلسة. يرجى المحاولة لاحقاً.", 500);
            }
        } else {
            Response::error("اسم المستخدم أو كلمة المرور غير صحيحة.");
        }
    }

    // POST api/auth/logout
    public static function logout($db) {
        Auth::logout($db);
        Response::success(null, "تم تسجيل الخروج بنجاح.");
    }

    // GET api/auth/check
    public static function check($db) {
        $user = Auth::authenticate($db);
        Response::success($user, "رمز الجلسة صالح.");
    }

    // POST api/auth/register_tenant
    public static function registerTenant($db, $data) {
        // Only authenticated users can create new tenants
        $user = Auth::authenticate($db);

        $company_name = isset($data['company_name']) ? trim($data['company_name']) : '';
        $new_username = isset($data['username']) ? trim($data['username']) : '';
        $new_password = isset($data['password']) ? $data['password'] : '';

        if (empty($company_name) || empty($new_username) || empty($new_password)) {
            Response::error("يرجى إدخال اسم الشركة، اسم المستخدم، وكلمة المرور.");
        }

        try {
            $db->beginTransaction();

            // 1. Create new tenant
            $tenant_query = "INSERT INTO tenants (name) VALUES (:name)";
            $tenant_stmt = $db->prepare($tenant_query);
            $tenant_stmt->bindParam(":name", $company_name);
            $tenant_stmt->execute();
            $new_tenant_id = $db->lastInsertId();

            // 2. Hash password
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $role = 'admin'; // First user in new tenant is always admin

            // 3. Create new user linked to this tenant
            $user_query = "INSERT INTO users (tenant_id, username, password_hash, role) VALUES (:tenant_id, :username, :password_hash, :role)";
            $user_stmt = $db->prepare($user_query);
            $user_stmt->bindParam(":tenant_id", $new_tenant_id);
            $user_stmt->bindParam(":username", $new_username);
            $user_stmt->bindParam(":password_hash", $password_hash);
            $user_stmt->bindParam(":role", $role);
            $user_stmt->execute();

            $db->commit();

            Response::success([
                "tenant_name" => $company_name,
                "username" => $new_username
            ], "تم إنشاء حساب الشركة الجديد بنجاح.", 201);

        } catch (PDOException $e) {
            $db->rollBack();
            // 23000 is integrity constraint violation (e.g. duplicate username)
            if ($e->getCode() == 23000) {
                Response::error("اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر.");
            } else {
                Response::error("حدث خطأ أثناء إنشاء الحساب: " . $e->getMessage());
            }
        }
    }
}
