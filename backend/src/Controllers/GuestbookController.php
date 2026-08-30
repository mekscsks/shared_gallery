<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\GuestAuth;
use App\Middleware\AdminAuth;

class GuestbookController
{
    /**
     * GET /api/events/{id}/guestbook
     * Public — returns approved messages newest-first.
     * Admins get all non-deleted statuses.
     */
    public static function index(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        $isAdmin = AdminAuth::attemptEventAccess($request, $eventId) !== null;

        $statusClause = $isAdmin
            ? "AND g.status != 'deleted'"
            : "AND g.status = 'approved'";

        $stmt = $db->prepare(
            "SELECT g.id, g.message, g.status, g.created_at,
                    gu.name AS guest_name
             FROM   guestbook g
             LEFT JOIN guests gu ON gu.id = g.guest_id
             WHERE  g.event_id = ? AND g.deleted_at IS NULL $statusClause
             ORDER  BY g.created_at DESC"
        );
        $stmt->execute([$eventId]);

        Response::json(array_map(fn($r) => self::format($r), $stmt->fetchAll()));
    }

    /**
     * POST /api/events/{id}/guestbook
     * Requires guest session token.
     * Body: { message }
     */
    public static function store(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $guest   = GuestAuth::requireForEvent($request, $eventId);

        $db    = Database::get();
        $event = self::activeEvent($db, $eventId);

        if (!$event) {
            Response::error('Event not found or not active', 404);
        }
        if (!$event['guestbook_enabled']) {
            Response::error('Guestbook is disabled for this event', 403, 'FEATURE_DISABLED');
        }

        $message = trim((string) $request->input('message', ''));

        if ($message === '') {
            Response::error(['message' => 'Message is required'], 422);
        }
        if (mb_strlen($message) > 1000) {
            Response::error(['message' => 'Message must be 1000 characters or fewer'], 422);
        }

        $defaultStatus = $event['moderation_enabled'] ? 'pending' : 'approved';

        $db->prepare(
            'INSERT INTO guestbook (event_id, guest_id, message, status) VALUES (?, ?, ?, ?)'
        )->execute([$eventId, $guest['guest_id'], $message, $defaultStatus]);

        $id = (int) $db->lastInsertId();

        $stmt = $db->prepare(
            'SELECT g.id, g.message, g.status, g.created_at, gu.name AS guest_name
             FROM guestbook g LEFT JOIN guests gu ON gu.id = g.guest_id
             WHERE g.id = ?'
        );
        $stmt->execute([$id]);

        Response::created(self::format($stmt->fetch()));
    }

    // --- helpers ---

    private static function activeEvent(\PDO $db, int $id): array|false
    {
        $stmt = $db->prepare(
            "SELECT id, guestbook_enabled, moderation_enabled
             FROM events WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Map DB row → the shape the frontend expects (mirrors mockData.js guestbook objects).
     *
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function format(array $r): array
    {
        return [
            'id'        => (int) $r['id'],
            'guestName' => $r['guest_name'] ?? 'Guest',
            'message'   => $r['message'],
            'createdAt' => $r['created_at'],
            'hidden'    => $r['status'] === 'hidden',
            'status'    => $r['status'],
        ];
    }
}
