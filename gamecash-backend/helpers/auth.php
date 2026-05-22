<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\helpers\auth.php

require_once __DIR__ . "/response.php";

class Auth {
    // Generate a secure token and save it to the DB
    public static function generateToken($db, $user_id) {
        $token = bin2hex(random_bytes(32)); // 64-character hex token
        $expires_at = date('Y-m-d H:i:s', strtotime('+30 days'));

        $query = "INSERT INTO user_tokens (user_id, token, expires_at) VALUES (:user_id, :token, :expires_at)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":token", $token);
        $stmt->bindParam(":expires_at", $expires_at);

        if ($stmt->execute()) {
            return [
                "token" => $token,
                "expires_at" => $expires_at
            ];
        }
        return false;
    }

    // Authenticate the request and return the logged-in user details
    public static function authenticate($db) {
        $headers = getallheaders();
        $token = null;

        // Try getting token from X-Auth-Token header
        if (isset($headers['X-Auth-Token'])) {
            $token = $headers['X-Auth-Token'];
        } 
        // Or try getting from Authorization header: Bearer <token>
        elseif (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
                $token = $matches[1];
            }
        }
        // Or from query parameters (fallback for easy debugging)
        elseif (isset($_GET['auth_token'])) {
            $token = $_GET['auth_token'];
        }

        if (!$token) {
            Response::unauthorized("بيانات المصادقة مفقودة. يرجى تسجيل الدخول أولاً.");
        }

        // Look up token in DB
        $query = "SELECT t.user_id, u.username, u.role, t.expires_at 
                  FROM user_tokens t 
                  JOIN users u ON t.user_id = u.id 
                  WHERE t.token = :token LIMIT 1";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();
        
        $token_data = $stmt->fetch();

        if (!$token_data) {
            Response::unauthorized("رمز المصادقة غير صالح أو منتهي الصلاحية.");
        }

        // Check if token has expired
        if (strtotime($token_data['expires_at']) < time()) {
            // Delete expired token
            $del_query = "DELETE FROM user_tokens WHERE token = :token";
            $del_stmt = $db->prepare($del_query);
            $del_stmt->bindParam(":token", $token);
            $del_stmt->execute();

            Response::unauthorized("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.");
        }

        return [
            "id" => $token_data['user_id'],
            "username" => $token_data['username'],
            "role" => $token_data['role']
        ];
    }

    // Delete token on logout
    public static function logout($db) {
        $headers = getallheaders();
        $token = null;

        if (isset($headers['X-Auth-Token'])) {
            $token = $headers['X-Auth-Token'];
        } elseif (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
                $token = $matches[1];
            }
        } elseif (isset($_GET['auth_token'])) {
            $token = $_GET['auth_token'];
        }

        if ($token) {
            $query = "DELETE FROM user_tokens WHERE token = :token";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":token", $token);
            $stmt->execute();
        }
        
        return true;
    }
}
