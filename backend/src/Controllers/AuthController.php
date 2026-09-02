<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\AdminAuth;

class AuthController
{
    /**
     * POST /api/admin/login
     * Body: { email, password }
     */
    public static function login(Request $request): void
    {
        $email    = trim((string) $request->input('email', ''));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            Response::error('Email and password are required', 422, 'VALIDATION_ERROR');
        }

        $db   = Database::get();
        $stmt = $db->prepare(
            'SELECT id, name, email, password_hash, role, is_active
             FROM   admin_users
             WHERE  email = ?
             LIMIT  1'
        );
        $stmt->execute([$email]);
        $admin = $stmt->fetch();

        // Constant-time check even when the user doesn't exist
        $hash = $admin['password_hash'] ?? '$2y$12$invalidhashpadding000000000000000000000000000000000000000';
        if (!$admin || !password_verify($password, $hash)) {
            Response::error('Invalid email or password', 401, 'UNAUTHORIZED');
        }

        if (!$admin['is_active']) {
            Response::error('This account has been disabled', 403, 'FORBIDDEN');
        }

        session_regenerate_id(true);
        $_SESSION['admin_id']   = $admin['id'];
        $_SESSION['admin_role'] = $admin['role'];
        $_SESSION['admin_name'] = $admin['name'];

        $db->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?')
           ->execute([$admin['id']]);

        self::log($db, $admin['id'], null, null, 'admin_login', 'admin_user', $admin['id'], 'Admin logged in', $request->ip());

        Response::json([
            'admin' => [
                'id'    => $admin['id'],
                'name'  => $admin['name'],
                'email' => $admin['email'],
                'role'  => $admin['role'],
            ],
        ]);
    }

    /**
     * POST /api/admin/logout
     * Requires: Bearer token
     */
    public static function logout(Request $request): void
    {
        $adminId = $_SESSION['admin_id'] ?? null;
        session_unset();
        session_destroy();

        if ($adminId) {
            self::log(Database::get(), $adminId, null, null, 'admin_logout', 'admin_user', $adminId, 'Admin logged out', $request->ip());
        }

        Response::json(['message' => 'Logged out successfully']);
    }

    /**
     * GET /api/admin/me
     * Returns the currently authenticated admin's profile.
     */
    public static function me(Request $request): void
    {
        $admin = AdminAuth::require($request);

        Response::json([
            'id'    => $admin['id'],
            'name'  => $admin['name'],
            'email' => $admin['email'],
            'role'  => $admin['role'],
        ]);
    }

    /**
     * GET /api/admin/my-events
     * Returns events assigned to the current admin (or all events for super_admin).
     */
    public static function myEvents(Request $request): void
    {
        $admin = AdminAuth::require($request);
        $db    = Database::get();

        if ($admin['role'] === 'super_admin') {
            $stmt = $db->query(
                "SELECT id, name, slug, status, primary_color FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC"
            );
        } else {
            $stmt = $db->prepare(
                'SELECT e.id, e.name, e.slug, e.status, e.primary_color
                 FROM events e
                 JOIN event_admins ea ON ea.event_id = e.id
                 WHERE ea.admin_id = ? AND e.deleted_at IS NULL
                 ORDER BY e.status = \'active\' DESC, e.created_at DESC'
            );
            $stmt->execute([$admin['id']]);
        }

        Response::json($stmt->fetchAll());
    }

    private static function log(
        \PDO $db,
        ?int $adminId,
        ?int $eventId,
        ?int $guestId,
        string $action,
        ?string $entityType,
        ?int $entityId,
        string $description,
        string $ip
    ): void {
        $db->prepare(
            'INSERT INTO activity_logs
                (event_id, admin_id, guest_id, action, entity_type, entity_id, description, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$eventId, $adminId, $guestId, $action, $entityType, $entityId, $description, $ip]);
    }
}
