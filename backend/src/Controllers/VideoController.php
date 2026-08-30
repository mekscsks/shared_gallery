<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Uploader;
use App\Middleware\GuestAuth;
use App\Middleware\AdminAuth;

class VideoController
{
    /**
     * GET /api/events/{id}/videos
     * Public — returns approved videos. Admins see all non-deleted.
     */
    public static function index(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        $isAdmin = AdminAuth::attemptEventAccess($request, $eventId) !== null;

        $statusClause = $isAdmin
            ? "AND v.status != 'deleted'"
            : "AND v.status = 'approved'";

        $stmt = $db->prepare(
            "SELECT v.id, v.guest_id, v.filename, v.mime_type, v.file_size,
                    v.thumbnail_url, v.preview_url, v.original_url,
                    v.caption, v.duration_seconds, v.status, v.is_featured, v.created_at,
                    g.name AS uploader_name
             FROM   videos v
             LEFT JOIN guests g ON g.id = v.guest_id
             WHERE  v.event_id = ? AND v.deleted_at IS NULL $statusClause
             ORDER  BY v.created_at DESC"
        );
        $stmt->execute([$eventId]);
        $rows = $stmt->fetchAll();

        Response::json(array_map(fn($r) => self::format($r), $rows));
    }

    /**
     * POST /api/events/{id}/videos
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
        if (!$event['videos_enabled']) {
            Response::error('Video uploads are disabled for this event', 403, 'FEATURE_DISABLED');
        }

        $files = $_FILES['files'] ?? null;
        if (!$files || empty($files['name'][0])) {
            Response::error(['files' => 'At least one file is required'], 422);
        }

        $maxBytes = (int) $event['max_video_size_mb'] * 1024 * 1024;
        $caption  = trim((string) ($_POST['caption'] ?? '')) ?: null;
        $appUrl   = rtrim($_ENV['APP_URL'] ?? '', '/');

        $fileList      = self::normaliseFiles($files);
        $created       = [];
        $defaultStatus = $event['moderation_enabled'] ? 'pending' : 'approved';

        foreach ($fileList as $fileEntry) {
            $stored = Uploader::store($fileEntry, 'video', $eventId, $maxBytes);

            $db->prepare(
                'INSERT INTO videos
                    (event_id, guest_id, filename, mime_type, file_size,
                     thumbnail_url, preview_url, original_url, caption, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $eventId,
                $guest['guest_id'],
                $stored['filename'],
                $stored['mime'],
                $stored['size'],
                // No thumbnail until Drive/ffmpeg pipeline exists
                null,
                $appUrl . $stored['url'],
                $appUrl . $stored['url'],
                $caption,
                $defaultStatus,
            ]);

            $videoId = (int) $db->lastInsertId();

            $stmt = $db->prepare('SELECT v.*, g.name AS uploader_name FROM videos v LEFT JOIN guests g ON g.id = v.guest_id WHERE v.id = ?');
            $stmt->execute([$videoId]);
            $created[] = self::format($stmt->fetch());
        }

        Response::created($created);
    }

    // --- helpers ---

    private static function activeEvent(\PDO $db, int $id): array|false
    {
        $stmt = $db->prepare(
            "SELECT id, videos_enabled, moderation_enabled, max_video_size_mb
             FROM events WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    private static function normaliseFiles(array $files): array
    {
        $list  = [];
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
     * Map DB row → frontend shape (mirrors mockData.js video objects).
     *
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    public static function format(array $r): array
    {
        $duration = $r['duration_seconds'] !== null
            ? self::formatDuration((float) $r['duration_seconds'])
            : null;

        return [
            'id'            => (int) $r['id'],
            'type'          => 'video',
            'uploaderName'  => $r['uploader_name'] ?? 'Guest',
            'caption'       => $r['caption'],
            'thumbUrl'      => $r['thumbnail_url'] ?? '',
            'mediumUrl'     => $r['preview_url']   ?? '',
            'originalUrl'   => $r['original_url']  ?? '',
            'url'           => $r['original_url']  ?? '',
            'uploadedAt'    => $r['created_at'],
            'featured'      => (bool) $r['is_featured'],
            'hidden'        => $r['status'] === 'hidden',
            'status'        => $r['status'],
            'durationLabel' => $duration,
            'aspect'        => 9 / 16,
        ];
    }

    private static function formatDuration(float $seconds): string
    {
        $m = (int) floor($seconds / 60);
        $s = (int) ($seconds % 60);
        return $m . ':' . str_pad((string) $s, 2, '0', STR_PAD_LEFT);
    }
}
