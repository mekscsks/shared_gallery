<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\AdminAuth;

class AdminController
{
    // -------------------------------------------------------------------------
    // Asset uploads (logo, cover)
    // -------------------------------------------------------------------------

    /** POST /api/admin/events/{id}/assets
     * Multipart: file (required), type = 'logo' | 'cover'
     */
    public static function uploadAsset(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        AdminAuth::requireEventAccess($request, $eventId);

        $type = $_POST['type'] ?? '';
        if (!in_array($type, ['logo', 'cover'], true)) {
            Response::error('type must be logo or cover', 422);
        }

        $file = $_FILES['file'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('File is required', 422);
        }

        $maxBytes = 5 * 1024 * 1024; // 5 MB for assets
        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mime     = $finfo->file($file['tmp_name']);
        $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (!in_array($mime, $allowed, true)) {
            Response::error('Only JPEG, PNG, WebP, or GIF images are allowed', 422);
        }
        if ($file['size'] > $maxBytes) {
            Response::error('File exceeds the 5 MB limit', 422);
        }

        $ext      = match ($mime) { 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', default => 'jpg' };
        $filename = $type . '_' . $eventId . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $dir = dirname(__DIR__, 2) . '/storage/uploads/assets';

        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            Response::error('Storage error', 500);
        }

        $dest = $dir . DIRECTORY_SEPARATOR . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Could not save file', 500);
        }

        $appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
        $url    = $appUrl . '/storage/uploads/assets/' . $filename;

        $col = $type === 'logo' ? 'logo_drive_file_id' : 'cover_drive_file_id';
        Database::get()
            ->prepare("UPDATE events SET `$col` = ? WHERE id = ?")
            ->execute([$url, $eventId]);

        self::log(Database::get(), $request, $eventId, $type . '_updated', 'event', $eventId);
        Response::json(['url' => $url]);
    }

    // -------------------------------------------------------------------------
    // Photos
    // -------------------------------------------------------------------------

    /** PATCH /api/admin/photos/{id}/feature */
    public static function featurePhoto(Request $request): void
    {
        $photoId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        $photo = self::findPhoto($db, $photoId);
        AdminAuth::requireEventAccess($request, (int) $photo['event_id']);

        $featured = (bool) $request->input('featured', true);
        $db->prepare('UPDATE photos SET is_featured = ? WHERE id = ?')
           ->execute([$featured ? 1 : 0, $photoId]);

        self::log($db, $request, $photo['event_id'], $featured ? 'photo_featured' : 'photo_unfeatured', 'photo', $photoId);
        Response::json(PhotoController::format(self::findPhoto($db, $photoId)));
    }

    /** PATCH /api/admin/photos/{id}/visibility */
    public static function hidePhoto(Request $request): void
    {
        $photoId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        $photo  = self::findPhoto($db, $photoId);
        AdminAuth::requireEventAccess($request, (int) $photo['event_id']);

        $hidden    = (bool) $request->input('hidden', true);
        $newStatus = $hidden ? 'hidden' : 'approved';
        $db->prepare('UPDATE photos SET status = ? WHERE id = ?')
           ->execute([$newStatus, $photoId]);

        self::log($db, $request, $photo['event_id'], $hidden ? 'photo_hidden' : 'photo_shown', 'photo', $photoId);
        Response::json(PhotoController::format(self::findPhoto($db, $photoId)));
    }

    /** DELETE /api/admin/photos/{id} */
    public static function deletePhoto(Request $request): void
    {
        $photoId = (int) ($request->params['id'] ?? 0);
        $db      = Database::get();

        $photo = self::findPhoto($db, $photoId);
        AdminAuth::requireEventAccess($request, (int) $photo['event_id']);

        $db->prepare("UPDATE photos SET status = 'deleted', deleted_at = NOW() WHERE id = ?")
           ->execute([$photoId]);

        self::log($db, $request, $photo['event_id'], 'photo_deleted', 'photo', $photoId);
        Response::json(['id' => $photoId, 'deleted' => true]);
    }

    // -------------------------------------------------------------------------
    // Guestbook
    // -------------------------------------------------------------------------

    /** PATCH /api/admin/guestbook/{id}/visibility */
    public static function hideMessage(Request $request): void
    {
        $msgId = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();

        $msg = self::findMessage($db, $msgId);
        AdminAuth::requireEventAccess($request, (int) $msg['event_id']);

        $hidden    = (bool) $request->input('hidden', true);
        $newStatus = $hidden ? 'hidden' : 'approved';
        $db->prepare('UPDATE guestbook SET status = ? WHERE id = ?')
           ->execute([$newStatus, $msgId]);

        self::log($db, $request, $msg['event_id'], $hidden ? 'message_hidden' : 'message_shown', 'guestbook', $msgId);
        Response::json(['id' => $msgId, 'hidden' => $hidden]);
    }

    /** DELETE /api/admin/guestbook/{id} */
    public static function deleteMessage(Request $request): void
    {
        $msgId = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();

        $msg = self::findMessage($db, $msgId);
        AdminAuth::requireEventAccess($request, (int) $msg['event_id']);

        $db->prepare("UPDATE guestbook SET status = 'deleted', deleted_at = NOW() WHERE id = ?")
           ->execute([$msgId]);

        self::log($db, $request, $msg['event_id'], 'message_deleted', 'guestbook', $msgId);
        Response::json(['id' => $msgId, 'deleted' => true]);
    }

    // -------------------------------------------------------------------------
    // Event settings
    // -------------------------------------------------------------------------

    /** PATCH /api/admin/events/{id}/settings */
    public static function updateSettings(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        AdminAuth::requireEventAccess($request, $eventId);

        $db   = Database::get();
        $body = $request->all();

        // Map the frontend's camelCase settings keys → DB columns
        $map = [
            'name'                 => 'name',
            'description'          => 'description',
            'tagline'              => 'welcome_message',
            'location'             => 'location',
            'date'                 => 'event_date',
            'primaryColor'         => 'primary_color',
            'secondaryColor'       => 'secondary_color',
            'photoUploadsEnabled'  => 'photos_enabled',
            'videoUploadsEnabled'  => 'videos_enabled',
            'guestbookEnabled'     => 'guestbook_enabled',
            'photoStripEnabled'    => 'photostrip_enabled',
            'moderationEnabled'    => 'moderation_enabled',
            'isPrivate'            => 'is_private',
        ];

        // The frontend sends a nested { settings: { ... }, theme: { ... } } shape
        $flat = $body;
        if (isset($body['settings']) && is_array($body['settings'])) {
            $flat = array_merge($flat, $body['settings']);
        }
        if (isset($body['theme']) && is_array($body['theme'])) {
            if (isset($body['theme']['primary'])) $flat['primaryColor']   = $body['theme']['primary'];
            if (isset($body['theme']['accent']))  $flat['secondaryColor'] = $body['theme']['accent'];
        }

        $fields = [];
        $values = [];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $flat)) {
                $fields[] = "`$col` = ?";
                $values[] = is_bool($flat[$jsKey]) ? (int) $flat[$jsKey] : $flat[$jsKey];
            }
        }

        if (empty($fields)) {
            Response::error('No valid fields provided', 422);
        }

        $values[] = $eventId;
        $db->prepare('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ?')
           ->execute($values);

        self::log($db, $request, $eventId, 'event_settings_updated', 'event', $eventId);

        $stmt = $db->prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
        $stmt->execute([$eventId]);
        Response::json(EventController::format($stmt->fetch()));
    }

    // -------------------------------------------------------------------------
    // Dashboard stats
    // -------------------------------------------------------------------------

    /** GET /api/admin/events/{id}/stats */
    public static function stats(Request $request): void
    {
        $eventId = (int) ($request->params['id'] ?? 0);
        AdminAuth::requireEventAccess($request, $eventId);

        $db = Database::get();

        $q = fn(string $sql, array $p = []) => (function () use ($db, $sql, $p) {
            $s = $db->prepare($sql); $s->execute($p); return (int) $s->fetchColumn();
        })();

        Response::json([
            'photos'   => $q("SELECT COUNT(*) FROM photos   WHERE event_id=? AND status!='deleted' AND deleted_at IS NULL", [$eventId]),
            'videos'   => $q("SELECT COUNT(*) FROM videos   WHERE event_id=? AND status!='deleted' AND deleted_at IS NULL", [$eventId]),
            'messages' => $q("SELECT COUNT(*) FROM guestbook WHERE event_id=? AND status!='deleted' AND deleted_at IS NULL", [$eventId]),
            'guests'   => $q("SELECT COUNT(*) FROM guests   WHERE event_id=?", [$eventId]),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** @return array<string,mixed> */
    private static function findPhoto(\PDO $db, int $id): array
    {
        $stmt = $db->prepare(
            'SELECT p.*, g.name AS uploader_name FROM photos p LEFT JOIN guests g ON g.id = p.guest_id WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::error('Photo not found', 404);
        return $row;
    }

    /** @return array<string,mixed> */
    private static function findMessage(\PDO $db, int $id): array
    {
        $stmt = $db->prepare(
            'SELECT * FROM guestbook WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::error('Message not found', 404);
        return $row;
    }

    private static function log(\PDO $db, Request $request, int $eventId, string $action, string $entityType, int $entityId): void
    {
        // Best-effort — resolve admin id from token
        $adminId = null;
        try {
            $token = $request->bearerToken();
            if ($token) {
                $hash = hash('sha256', $token);
                $s    = $db->prepare('SELECT admin_id FROM admin_sessions WHERE token_hash = ? LIMIT 1');
                $s->execute([$hash]);
                $row     = $s->fetch();
                $adminId = $row ? (int) $row['admin_id'] : null;
            }
        } catch (\Throwable) {}

        $db->prepare(
            'INSERT INTO activity_logs (event_id, admin_id, action, entity_type, entity_id, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$eventId, $adminId, $action, $entityType, $entityId, $request->ip()]);
    }
}
