<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Uploader;
use App\Middleware\GuestAuth;
use App\Middleware\AdminAuth;

class PhotoController
{
    /**
     * GET /api/events/{id}/photos
     * Public (no auth) — returns approved, non-deleted photos for the gallery.
     * Admins get all statuses if they pass a valid token.
     */
    public static function index(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        // Admins see everything; guests/public see only approved
        $isAdmin = AdminAuth::attemptEventAccess($request, $eventId) !== null;

        $statusClause = $isAdmin
            ? "AND p.status != 'deleted'"
            : "AND p.status = 'approved'";

        $stmt = $db->prepare(
            "SELECT p.id, p.guest_id, p.filename, p.mime_type, p.file_size,
                    p.thumbnail_url, p.preview_url, p.original_url,
                    p.caption, p.status, p.is_featured, p.created_at,
                    g.name AS uploader_name
             FROM   photos p
             LEFT JOIN guests g ON g.id = p.guest_id
             WHERE  p.event_id = ? AND p.deleted_at IS NULL $statusClause
             ORDER  BY p.created_at DESC"
        );
        $stmt->execute([$eventId]);
        $rows = $stmt->fetchAll();

        Response::json(array_map(fn($r) => self::format($r), $rows));
    }

    /**
     * POST /api/events/{id}/photos
     * Requires guest session token.
     * Multipart: files[] (required), caption (optional)
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
        if (!$event['photos_enabled']) {
            Response::error('Photo uploads are disabled for this event', 403, 'FEATURE_DISABLED');
        }

        $files = $_FILES['files'] ?? null;
        if (!$files || empty($files['name'][0])) {
            Response::error(['files' => 'At least one file is required'], 422);
        }

        // Check per-guest upload limit if set
        $limit = $event['max_uploads_per_guest'];
        if ($limit !== null) {
            $countStmt = $db->prepare(
                "SELECT COUNT(*) FROM photos WHERE event_id = ? AND guest_id = ? AND status != 'deleted' AND deleted_at IS NULL"
            );
            $countStmt->execute([$eventId, $guest['guest_id']]);
            $current = (int) $countStmt->fetchColumn();
            $incoming = count($files['name']);
            if ($current + $incoming > (int) $limit) {
                Response::error("Upload limit of {$limit} photos per guest reached", 422, 'UPLOAD_LIMIT_REACHED');
            }
        }

        $maxBytes = (int) $event['max_photo_size_mb'] * 1024 * 1024;
        $caption  = trim((string) ($_POST['caption'] ?? '')) ?: null;
        $appUrl   = rtrim($_ENV['APP_URL'] ?? '', '/');

        // Normalise $_FILES multi-upload into a flat list of single-file arrays
        $fileList = self::normaliseFiles($files);
        $created  = [];

        $defaultStatus = $event['moderation_enabled'] ? 'pending' : 'approved';

        foreach ($fileList as $fileEntry) {
            $stored = Uploader::store($fileEntry, 'photo', $eventId, $maxBytes);

            $db->prepare(
                'INSERT INTO photos
                    (event_id, guest_id, filename, mime_type, file_size,
                     thumbnail_url, preview_url, original_url, caption, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $eventId,
                $guest['guest_id'],
                $stored['filename'],
                $stored['mime'],
                $stored['size'],
                $appUrl . $stored['url'],
                $appUrl . $stored['url'],
                $appUrl . $stored['url'],
                $caption,
                $defaultStatus,
            ]);

            $photoId = (int) $db->lastInsertId();

            $stmt = $db->prepare('SELECT p.*, g.name AS uploader_name FROM photos p LEFT JOIN guests g ON g.id = p.guest_id WHERE p.id = ?');
            $stmt->execute([$photoId]);
            $created[] = self::format($stmt->fetch());
        }

        Response::created($created);
    }

    // --- helpers ---

    private static function activeEvent(\PDO $db, int $id): array|false
    {
        $stmt = $db->prepare(
            "SELECT id, photos_enabled, moderation_enabled, max_photo_size_mb, max_uploads_per_guest
             FROM events WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Normalise the multi-file $_FILES['files'] structure into a flat list
     * of single-file arrays that Uploader::store() expects.
     *
     * @return array<int, array<string,mixed>>
     */
    private static function normaliseFiles(array $files): array
    {
        $list = [];
        $count = count($files['name']);
        for ($i = 0; $i < $count; $i++) {
            $list[] = [
                'name'     => $files['name'][$i],
                'type'     => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error'    => $files['error'][$i],
                'size'     => $files['size'][$i],
            ];
        }
        return $list;
    }

    /**
     * Map DB row → the shape the frontend expects (mirrors mockData.js photo objects).
     *
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    public static function format(array $r): array
    {
        return [
            'id'           => (int) $r['id'],
            'type'         => 'photo',
            'uploaderName' => $r['uploader_name'] ?? 'Guest',
            'caption'      => $r['caption'],
            'thumbUrl'     => $r['thumbnail_url'] ?? '',
            'mediumUrl'    => $r['preview_url']   ?? '',
            'originalUrl'  => $r['original_url']  ?? '',
            // Keep 'url' for backward compat with any component still reading it
            'url'          => $r['original_url']  ?? '',
            'uploadedAt'   => $r['created_at'],
            'featured'     => (bool) $r['is_featured'],
            'hidden'       => $r['status'] === 'hidden',
            'status'       => $r['status'],
            'aspect'       => 1, // real aspect ratio requires image inspection — placeholder for now
        ];
    }
}
