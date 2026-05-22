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
}
