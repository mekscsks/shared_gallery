<?php

/**
 * Usage:
 *   php backend/cli/create-admin.php
 *
 * Run this once to create the first super admin account.
 * Never write passwords in plaintext anywhere — this script
 * hashes the password before inserting it.
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// --- Collect input ---
echo "=== Create Super Admin ===\n\n";

echo "Name: ";
$name = trim(fgets(STDIN));

echo "Email: ";
$email = trim(fgets(STDIN));

// Hide password input on Unix; plain on Windows
if (PHP_OS_FAMILY !== 'Windows') {
    echo "Password (hidden): ";
    system('stty -echo');
    $password = trim(fgets(STDIN));
    system('stty echo');
    echo "\n";
} else {
    echo "Password: ";
    $password = trim(fgets(STDIN));
}

if ($name === '' || $email === '' || $password === '') {
    echo "Error: all fields are required.\n";
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "Error: invalid email address.\n";
    exit(1);
}

if (strlen($password) < 8) {
    echo "Error: password must be at least 8 characters.\n";
    exit(1);
}

// --- Insert ---
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $_ENV['DB_HOST'],
    $_ENV['DB_PORT'] ?? 3306,
    $_ENV['DB_DATABASE']
);

try {
    $db = new PDO($dsn, $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// Check for duplicate email
$check = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
$check->execute([$email]);
if ($check->fetch()) {
    echo "Error: an admin with that email already exists.\n";
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $db->prepare(
    'INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$name, $email, $hash, 'super_admin']);

echo "\nSuper admin created successfully (id=" . $db->lastInsertId() . ").\n";
