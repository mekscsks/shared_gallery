<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

class GuestController
{
    /**
     * POST /api/events/{id}/guests
     * Body: { name }
     *
     * Creates or re-uses a guest record for this event + name pair,
     * then issues a fresh session token.
     *
     * This replaces the client-generated guestId in App.session.setGuestName().
     * The frontend stores the returned token and sends it as
     * Authorization: Bearer <token> on every subsequent request.
     */
    public static function register(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $name    = trim((string) $request->input('name', ''));

        if ($name === '') {
            Response::error(['name' => 'Name is required'], 422);
        }

        if (mb_strlen($name) > 150) {
            Response::error(['name' => 'Name must be 150 characters or fewer'], 422);
        }

        $db = Database::get();

        // Verify the event exists and is active
        $stmt = $db->prepare(
            "SELECT id FROM events WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$eventId]);
        if (!$stmt->fetch()) {
            Response::error('Event not found or not active', 404);
        }

        // Re-use an existing guest record for the same name + event so a
        // returning guest on a new device still gets the same guest_id.
        $stmt = $db->prepare(
            'SELECT id FROM guests WHERE event_id = ? AND name = ? LIMIT 1'
        );
        $stmt->execute([$eventId, $name]);
        $existing = $stmt->fetch();

        if ($existing) {
            $guestId = (int) $existing['id'];
            $db->prepare('UPDATE guests SET last_seen_at = NOW() WHERE id = ?')
               ->execute([$guestId]);
        } else {
            $db->prepare('INSERT INTO guests (event_id, name) VALUES (?, ?)')
               ->execute([$eventId, $name]);
            $guestId = (int) $db->lastInsertId();
        }

        // Always issue a fresh token — one active session per registration call
        $token     = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        // Guest sessions last 30 days
        $expiresAt = date('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30);

        $db->prepare(
            'INSERT INTO guest_sessions (guest_id, event_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
        )->execute([$guestId, $eventId, $tokenHash, $expiresAt]);

        Response::created([
            'guest_id'   => $guestId,
            'guest_name' => $name,
            'token'      => $token,
            'expires_at' => $expiresAt,
        ]);
    }
}
