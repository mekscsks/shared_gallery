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

        // Generate a cryptographically random token; store only its hash
        $token     = bin2hex(random_bytes(32)); // 64-char hex
        $tokenHash = hash('sha256', $token);
        $lifetime  = (int) ($_ENV['SESSION_LIFETIME'] ?? 28800);
        $expiresAt = date('Y-m-d H:i:s', time() + $lifetime);

        $db->prepare(
            'INSERT INTO admin_sessions (admin_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $admin['id'],
            $tokenHash,
            $request->ip(),
            $request->userAgent(),
            $expiresAt,
        ]);

        $db->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?')
           ->execute([$admin['id']]);

        self::log($db, $admin['id'], null, null, 'admin_login', 'admin_user', $admin['id'], 'Admin logged in', $request->ip());

        Response::json([
            'token'      => $token,
            'expires_at' => $expiresAt,
            'admin'      => [
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
        $token = $request->bearerToken();

        if (!$token) {
            Response::error('Authentication required', 401, 'UNAUTHORIZED');
        }

        $hash = hash('sha256', $token);
        $db   = Database::get();

        $stmt = $db->prepare(
            'SELECT s.id, s.admin_id FROM admin_sessions s WHERE s.token_hash = ? AND s.revoked_at IS NULL LIMIT 1'
        );
        $stmt->execute([$hash]);
        $session = $stmt->fetch();

        if ($session) {
            $db->prepare('UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ?')
               ->execute([$session['id']]);

            self::log($db, $session['admin_id'], null, null, 'admin_logout', 'admin_session', $session['id'], 'Admin logged out', $request->ip());
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
