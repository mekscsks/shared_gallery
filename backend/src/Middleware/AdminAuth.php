<?php

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

class AdminAuth
{
    /**
     * Validate the bearer token and return the admin row.
     * Calls Response::error() + exit on failure — never returns null.
     *
     * @return array<string,mixed>
     */
    /**
     * Try to authenticate without aborting. Returns the admin row or null.
     * Use this for endpoints that are public but show more data to admins.
     *
     * @return array<string,mixed>|null
     */
    public static function attempt(Request $request): ?array
    {
        if (empty($_SESSION['admin_id'])) return null;

        $db   = Database::get();
        $stmt = $db->prepare(
            'SELECT id, name, email, role, is_active FROM admin_users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$_SESSION['admin_id']]);
        $row = $stmt->fetch();

        if (!$row || !$row['is_active']) return null;
        return $row;
    }

    public static function require(Request $request): array
    {
        if (empty($_SESSION['admin_id'])) {
            Response::error('Authentication required', 401, 'UNAUTHORIZED');
        }

        $db   = Database::get();
        $stmt = $db->prepare(
            'SELECT id, name, email, role, is_active FROM admin_users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$_SESSION['admin_id']]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Invalid session', 401, 'UNAUTHORIZED');
        }

        if (!$row['is_active']) {
            Response::error('Account is disabled', 403, 'FORBIDDEN');
        }

        return $row;
    }

    /**
     * Same as require() but also asserts the caller is a super_admin.
     *
     * @return array<string,mixed>
     */
    public static function requireSuperAdmin(Request $request): array
    {
        $admin = self::require($request);

        if ($admin['role'] !== 'super_admin') {
            Response::error('Super admin access required', 403, 'FORBIDDEN');
        }

        return $admin;
    }

    /**
     * For event-scoped routes: asserts the admin is either a super_admin
     * or is assigned to the given event.
     *
     * @return array<string,mixed>
     */
    public static function requireEventAccess(Request $request, int $eventId): array
    {
        $admin = self::require($request);

        if ($admin['role'] === 'super_admin') {
            return $admin;
        }

        $stmt = Database::get()->prepare(
            'SELECT 1 FROM event_admins WHERE event_id = ? AND admin_id = ? LIMIT 1'
        );
        $stmt->execute([$eventId, $admin['id']]);

        if (!$stmt->fetch()) {
            Response::error('You do not have access to this event', 403, 'FORBIDDEN');
        }

        return $admin;
    }

    /**
     * Non-aborting event access check — returns the admin row or null.
     * Use on public endpoints that show extra data to admins.
     *
     * @return array<string,mixed>|null
     */
    public static function attemptEventAccess(Request $request, int $eventId): ?array
    {
        $admin = self::attempt($request);
        if (!$admin) return null;
        if ($admin['role'] === 'super_admin') return $admin;

        $stmt = Database::get()->prepare(
            'SELECT 1 FROM event_admins WHERE event_id = ? AND admin_id = ? LIMIT 1'
        );
        $stmt->execute([$eventId, $admin['id']]);
        return $stmt->fetch() ? $admin : null;
    }
}
