<?php

/**
 * Usage:
 *   php backend/cli/create-event-admin.php
 *
 * Creates an event_admin account and optionally assigns them to one or more events.
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

echo "=== Create Event Admin ===\n\n";

echo "Name: ";
$name = trim(fgets(STDIN));

echo "Email: ";
$email = trim(fgets(STDIN));

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

// --- DB ---
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $_ENV['DB_HOST'],
    $_ENV['DB_PORT'] ?? 3306,
    $_ENV['DB_DATABASE']
);

try {
    $db = new PDO($dsn, $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

$check = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
$check->execute([$email]);
if ($check->fetch()) {
    echo "Error: an admin with that email already exists.\n";
    exit(1);
}

// --- Show available events ---
$events = $db->query("SELECT id, name, slug, status FROM events WHERE deleted_at IS NULL ORDER BY id")->fetchAll();

if (empty($events)) {
    echo "\nWarning: no events found in the database. The account will be created but not assigned to any event.\n";
    echo "You can assign them later via the API: POST /api/events/{id}/admins\n\n";
    $selectedIds = [];
} else {
    echo "\nAvailable events:\n";
    foreach ($events as $e) {
        printf("  [%d] %s (%s) — %s\n", $e['id'], $e['name'], $e['slug'], $e['status']);
    }

    echo "\nEnter event IDs to assign (comma-separated), or press Enter to skip: ";
    $input = trim(fgets(STDIN));

    $selectedIds = [];
    if ($input !== '') {
        $validIds = array_column($events, 'id');
        foreach (explode(',', $input) as $raw) {
            $id = (int) trim($raw);
            if (in_array($id, $validIds, true)) {
                $selectedIds[] = $id;
            } else {
                echo "Warning: event id $id not found, skipping.\n";
            }
        }
    }
}

// --- Insert admin ---
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$db->prepare('INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
   ->execute([$name, $email, $hash, 'event_admin']);

$adminId = (int) $db->lastInsertId();

// --- Assign to events ---
if (!empty($selectedIds)) {
    $assign = $db->prepare('INSERT IGNORE INTO event_admins (event_id, admin_id) VALUES (?, ?)');
    foreach ($selectedIds as $eventId) {
        $assign->execute([$eventId, $adminId]);
    }
}

echo "\nEvent admin created (id=$adminId).\n";

if (!empty($selectedIds)) {
    echo "Assigned to event IDs: " . implode(', ', $selectedIds) . "\n";
} else {
    echo "Not assigned to any event yet.\n";
}
