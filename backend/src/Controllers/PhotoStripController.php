<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\GuestAuth;

class PhotoStripController
{
    /**
     * POST /api/events/{id}/photostrips
     * Requires guest session token.
     * Body: { template, config, photoIds, addToGallery }
     */
    public static function store(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $guest   = GuestAuth::requireForEvent($request, $eventId);

        $db = Database::get();

        $stmt = $db->prepare(
            "SELECT id FROM events WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$eventId]);
        if (!$stmt->fetch()) {
            Response::error('Event not found or not active', 404);
        }

        $template      = trim((string) $request->input('template', 'classic'));
        $config        = $request->input('config', []);
        $addToGallery  = (bool) $request->input('addToGallery', false);

        $configJson = json_encode($config ?: new \stdClass());

        $db->prepare(
            'INSERT INTO photo_strips (event_id, guest_id, template, config_json, shared_to_gallery, status)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $eventId,
            $guest['guest_id'],
            $template,
            $configJson,
            $addToGallery ? 1 : 0,
            $addToGallery ? 'published' : 'created',
        ]);

        $id = (int) $db->lastInsertId();

        Response::created([
            'id'              => $id,
            'template'        => $template,
            'shared_to_gallery' => $addToGallery,
            'created_at'      => date('Y-m-d H:i:s'),
        ]);
    }
}
