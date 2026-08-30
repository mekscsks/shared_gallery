<?php

namespace App\Core;

class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function created(mixed $data): never
    {
        self::json($data, 201);
    }

    /**
     * @param string|array<string,string> $message  Plain string or field => message map for validation errors
     */
    public static function error(string|array $message, int $status = 400, string $code = ''): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        $error = is_array($message)
            ? ['code' => $code ?: 'VALIDATION_ERROR', 'fields' => $message]
            : ['code' => $code ?: self::defaultCode($status), 'message' => $message];

        echo json_encode(['success' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
        exit;
    }

    private static function defaultCode(int $status): string
    {
        return match ($status) {
            400 => 'BAD_REQUEST',
            401 => 'UNAUTHORIZED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            422 => 'UNPROCESSABLE',
            429 => 'TOO_MANY_REQUESTS',
            default => 'SERVER_ERROR',
        };
    }
}
