<?php
// C:\xampp2\htdocs\gamecash\gamecash-backend\helpers\response.php

class Response {
    public static function json($data, $status_code = 200) {
        // Clear any previous output to avoid parsing errors in client
        if (ob_get_length()) ob_clean();

        http_response_code($status_code);
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }

    public static function success($data = null, $message = "Success", $status_code = 200) {
        self::json([
            "success" => true,
            "message" => $message,
            "data" => $data
        ], $status_code);
    }

    public static function error($message = "An error occurred", $status_code = 400, $errors = []) {
        $response = [
            "success" => false,
            "message" => $message
        ];
        if (!empty($errors)) {
            $response["errors"] = $errors;
        }
        self::json($response, $status_code);
    }

    public static function unauthorized($message = "Unauthorized access") {
        self::error($message, 401);
    }

    public static function notFound($message = "Resource not found") {
        self::error($message, 404);
    }
}
