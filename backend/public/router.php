<?php
// Router script for PHP built-in server.
// Usage: php -S localhost:8000 -t backend/public backend/public/router.php

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Let the built-in server serve real static files (if any exist in public/)
if ($path !== '/' && file_exists(__DIR__ . $path)) {
    return false;
}

// Everything else goes through index.php
require __DIR__ . '/index.php';
