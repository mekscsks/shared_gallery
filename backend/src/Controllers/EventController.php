<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\AdminAuth;

class EventController
{
    /**
     * GET /api/events/slug/{slug}
     * Public — used by the guest welcome screen to load event data.
     */
    public static function getBySlug(Request $request): void
    {
        $slug  = $request->params['slug'] ?? '';

        // Admins can view events in any status; guests only see active/archived
        $admin = AdminAuth::attempt($request);
        $event = $admin
            ? self::findBySlugAny($slug)
            : self::findActiveBySlug($slug);

        if (!$event) {
            Response::error('Event not found', 404);
        }

        Response::json(self::format($event));
    }

    /**
     * GET /api/events/{id}
     * Admin only.
     */
    public static function getById(Request $request): void
    {
        $admin = AdminAuth::require($request);
        $id    = (int) ($request->params['id'] ?? 0);

        AdminAuth::requireEventAccess($request, $id);

        $event = self::findById($id);
        if (!$event) {
            Response::error('Event not found', 404);
        }

        Response::json(self::format($event));
    }

    /**
     * PATCH /api/events/{id}
     * Admin only — updates event settings fields.
     */
    public static function update(Request $request): void
    {
        $id = (int) ($request->params['id'] ?? 0);
        AdminAuth::requireEventAccess($request, $id);

        $event = self::findById($id);
        if (!$event) {
            Response::error('Event not found', 404);
        }

        $allowed = [
            'name', 'description', 'welcome_message', 'event_date',
            'event_start_time', 'event_end_time', 'location',
            'primary_color', 'secondary_color',
            'photos_enabled', 'videos_enabled', 'guestbook_enabled',
            'photostrip_enabled', 'moderation_enabled', 'is_private',
            'max_photo_size_mb', 'max_video_size_mb', 'max_uploads_per_guest',
            'status',
        ];

        $body   = $request->all();
        $fields = [];
        $values = [];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $body)) {
                $fields[] = "`$col` = ?";
                $values[] = $body[$col];
            }
        }

        if (empty($fields)) {
            Response::error('No valid fields provided', 422);
        }

        $values[] = $id;
        Database::get()
            ->prepare('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ?')
            ->execute($values);

        $updated = self::findById($id);
        Response::json(self::format($updated));
    }

    /**
     * GET /api/events/{id}/admins
     * Super admin only.
     */
    public static function listAdmins(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $id = (int) ($request->params['id'] ?? 0);

        $stmt = Database::get()->prepare(
            'SELECT u.id, u.name, u.email, u.role, u.is_active, ea.created_at AS assigned_at
             FROM   event_admins ea
             JOIN   admin_users u ON u.id = ea.admin_id
             WHERE  ea.event_id = ?
             ORDER  BY ea.created_at'
        );
        $stmt->execute([$id]);
        Response::json($stmt->fetchAll());
    }

    /**
     * POST /api/events/{id}/admins
     * Body: { admin_id } — super admin only.
     */
    public static function assignAdmin(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $eventId = (int) ($request->params['id'] ?? 0);
        $adminId = (int) $request->input('admin_id', 0);

        if (!$adminId) {
            Response::error('admin_id is required', 422, 'VALIDATION_ERROR');
        }

        $db = Database::get();

        $check = $db->prepare('SELECT id FROM admin_users WHERE id = ? AND role = ? AND is_active = 1 LIMIT 1');
        $check->execute([$adminId, 'event_admin']);
        if (!$check->fetch()) {
            Response::error('Active event_admin not found', 404);
        }

        try {
            $db->prepare('INSERT INTO event_admins (event_id, admin_id) VALUES (?, ?)')->execute([$eventId, $adminId]);
        } catch (\PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                Response::error('Admin is already assigned to this event', 409, 'CONFLICT');
            }
            throw $e;
        }

        Response::json(['event_id' => $eventId, 'admin_id' => $adminId, 'assigned' => true], 201);
    }

    /**
     * DELETE /api/events/{id}/admins/{adminId}
     * Super admin only.
     */
    public static function removeAdmin(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $eventId = (int) ($request->params['id'] ?? 0);
        $adminId = (int) ($request->params['adminId'] ?? 0);

        $db   = Database::get();
        $stmt = $db->prepare('DELETE FROM event_admins WHERE event_id = ? AND admin_id = ?');
        $stmt->execute([$eventId, $adminId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Assignment not found', 404);
        }

        Response::json(['event_id' => $eventId, 'admin_id' => $adminId, 'removed' => true]);
    }

    // --- helpers ---

    private static function findActiveBySlug(string $slug): array|false
    {
        $stmt = Database::get()->prepare(
            "SELECT * FROM events WHERE slug = ? AND status IN ('active','archived') AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$slug]);
        return $stmt->fetch();
    }

    private static function findBySlugAny(string $slug): array|false
    {
        $stmt = Database::get()->prepare(
            'SELECT * FROM events WHERE slug = ? AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$slug]);
        return $stmt->fetch();
    }

    private static function findById(int $id): array|false
    {
        $stmt = Database::get()->prepare(
            'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Map DB row → the shape api.js / frontend expects.
     * Mirrors the mock event object in mockData.js so the frontend
     * needs zero changes when the real endpoint is wired in.
     *
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function format(array $row): array
    {
        return [
            'id'           => (int) $row['id'],
            'slug'         => $row['slug'],
            'name'         => $row['name'],
            'tagline'      => $row['welcome_message'] ?? '',
            'description'  => $row['description'] ?? '',
            'date'         => $row['event_date'] ?? '',
            'dateLabel'    => $row['event_date']
                ? date('F j, Y', strtotime($row['event_date']))
                : '',
            'timeLabel'    => self::formatTimeLabel($row),
            'location'     => $row['location'] ?? '',
            'logoInitials' => self::initials($row['name']),
            'logoUrl'      => $row['logo_drive_file_id'] ?? '',
            'heroImage'    => $row['cover_drive_file_id'] ?? '',
            'isPrivate'    => (bool) $row['is_private'],
            'status'       => $row['status'],
            'theme'        => [
                'primary' => $row['primary_color'],
                'accent'  => $row['secondary_color'],
            ],
            'settings'     => [
                'galleryVisible'       => !(bool) $row['is_private'],
                'photoUploadsEnabled'  => (bool) $row['photos_enabled'],
                'videoUploadsEnabled'  => (bool) $row['videos_enabled'],
                'guestbookEnabled'     => (bool) $row['guestbook_enabled'],
                'photoStripEnabled'    => (bool) $row['photostrip_enabled'],
                'moderationEnabled'    => (bool) $row['moderation_enabled'],
                'guestUploadsOpen'     => true,
                'maxPhotoSizeMb'       => (int) $row['max_photo_size_mb'],
                'maxVideoSizeMb'       => (int) $row['max_video_size_mb'],
                'maxUploadsPerGuest'   => $row['max_uploads_per_guest'] !== null
                    ? (int) $row['max_uploads_per_guest']
                    : null,
            ],
        ];
    }

    private static function formatTimeLabel(array $row): string
    {
        $start = $row['event_start_time'] ?? null;
        $end   = $row['event_end_time']   ?? null;
        if (!$start) return '';
        $fmt = fn($t) => date('g:i A', strtotime($t));
        return $end ? $fmt($start) . ' – ' . $fmt($end) : $fmt($start);
    }

    private static function initials(string $name): string
    {
        $words = preg_split('/\s+/', trim($name));
        // If the first word is all-caps (an acronym like RCY), use it as-is
        if (isset($words[0]) && $words[0] === strtoupper($words[0]) && strlen($words[0]) <= 4) {
            return $words[0];
        }
        return strtoupper(implode('', array_map(fn($w) => $w[0] ?? '', array_slice($words, 0, 2))));
    }
}
