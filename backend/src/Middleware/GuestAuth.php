<?php

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

class GuestAuth
{
    /**
     * Validate the guest bearer token and return the guest row.
     * Calls Response::error() + exit on failure.
     *
     * @return array<string,mixed>  guest row + session_id + event_id
     */
    public static function require(Request $request): array
    {
        $token = $request->bearerToken();

        if (!$token) {
            Response::error('Guest session required', 401, 'UNAUTHORIZED');
        }

        $hash = hash('sha256', $token);
        $db   = Database::get();

        $stmt = $db->prepare(
            'SELECT s.id AS session_id, s.guest_id, s.event_id, s.expires_at, s.revoked_at,
                    g.name AS guest_name
             FROM   guest_sessions s
             JOIN   guests g ON g.id = s.guest_id
             WHERE  s.token_hash = ?
             LIMIT  1'
        );
        $stmt->execute([$hash]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Invalid or expired guest session', 401, 'UNAUTHORIZED');
        }

        if ($row['revoked_at'] !== null) {
            Response::error('Guest session has been revoked', 401, 'UNAUTHORIZED');
        }

        if (new \DateTimeImmutable($row['expires_at']) <= new \DateTimeImmutable()) {
            Response::error('Guest session expired', 401, 'UNAUTHORIZED');
        }

        $db->prepare('UPDATE guest_sessions SET last_used_at = NOW() WHERE id = ?')
           ->execute([$row['session_id']]);

        return $row;
    }

    /**
     * Same as require() but also asserts the session belongs to the given event.
     *
     * @return array<string,mixed>
     */
    public static function requireForEvent(Request $request, int $eventId): array
    {
        $guest = self::require($request);

        if ((int) $guest['event_id'] !== $eventId) {
            Response::error('Guest session does not belong to this event', 403, 'FORBIDDEN');
        }

        return $guest;
    }
}
