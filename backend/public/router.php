<?php
// Router script for PHP built-in server.
// Usage: php -S localhost:8000 -t backend/public backend/public/router.php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve real static files that exist in public/ (e.g. favicon)
if ($path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

// Everything else — including OPTIONS preflight — goes through index.php
require __DIR__ . '/index.php';
