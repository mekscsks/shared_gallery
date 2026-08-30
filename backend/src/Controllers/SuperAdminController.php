<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Middleware\AdminAuth;

class SuperAdminController
{
    // -------------------------------------------------------------------------
    // Dashboard
    // -------------------------------------------------------------------------

    /** GET /api/super/dashboard */
    public static function dashboard(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $db = Database::get();

        $q = fn(string $sql) => (int) $db->query($sql)->fetchColumn();

        Response::json([
            'events' => [
                'total'    => $q("SELECT COUNT(*) FROM events WHERE deleted_at IS NULL"),
                'active'   => $q("SELECT COUNT(*) FROM events WHERE status='active'  AND deleted_at IS NULL"),
                'draft'    => $q("SELECT COUNT(*) FROM events WHERE status='draft'   AND deleted_at IS NULL"),
                'archived' => $q("SELECT COUNT(*) FROM events WHERE status='archived'"),
                'disabled' => $q("SELECT COUNT(*) FROM events WHERE status='disabled' AND deleted_at IS NULL"),
            ],
            'admins' => [
                'total'        => $q("SELECT COUNT(*) FROM admin_users WHERE role='event_admin'"),
                'active'       => $q("SELECT COUNT(*) FROM admin_users WHERE role='event_admin' AND is_active=1"),
            ],
            'guests'      => $q("SELECT COUNT(*) FROM guests"),
            'photos'      => $q("SELECT COUNT(*) FROM photos  WHERE status!='deleted' AND deleted_at IS NULL"),
            'videos'      => $q("SELECT COUNT(*) FROM videos  WHERE status!='deleted' AND deleted_at IS NULL"),
            'photoStrips' => $q("SELECT COUNT(*) FROM photo_strips WHERE status!='deleted' AND deleted_at IS NULL"),
            'storageMb'   => round(
                ($q("SELECT COALESCE(SUM(file_size),0) FROM photos WHERE deleted_at IS NULL") +
                 $q("SELECT COALESCE(SUM(file_size),0) FROM videos WHERE deleted_at IS NULL")) / 1048576,
                2
            ),
        ]);
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /** GET /api/super/events */
    public static function listEvents(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $db = Database::get();

        $status = $request->input('status', '');
        $search = trim((string) $request->input('search', ''));

        $where  = [];
        $params = [];

        if ($status && in_array($status, ['draft','active','archived','disabled'], true)) {
            $where[]  = 'e.status = ?';
            $params[] = $status;
        } elseif ($status !== 'archived') {
            // By default exclude hard-deleted rows; archived keeps deleted_at set
            $where[] = '(e.deleted_at IS NULL OR e.status = \'archived\')';
        }

        if ($search !== '') {
            $where[]  = '(e.name LIKE ? OR e.slug LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql = 'SELECT e.*,
                    (SELECT COUNT(*) FROM event_admins ea WHERE ea.event_id = e.id) AS assigned_admin_count,
                    (SELECT COUNT(*) FROM guests g WHERE g.event_id = e.id) AS guest_count,
                    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id AND p.status != \'deleted\' AND p.deleted_at IS NULL) AS photo_count,
                    (SELECT COUNT(*) FROM videos v WHERE v.event_id = e.id AND v.status != \'deleted\' AND v.deleted_at IS NULL) AS video_count,
                    (SELECT COUNT(*) FROM photo_strips ps WHERE ps.event_id = e.id AND ps.status != \'deleted\' AND ps.deleted_at IS NULL) AS photo_strip_count
                FROM events e'
            . (empty($where) ? '' : ' WHERE ' . implode(' AND ', $where))
            . ' ORDER BY e.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::json(array_map([self::class, 'formatEventRow'], $rows));
    }

    /** POST /api/super/events */
    public static function createEvent(Request $request): void
    {
        $admin = AdminAuth::requireSuperAdmin($request);
        $db    = Database::get();
        $body  = $request->all();

        $name = trim((string) ($body['name'] ?? ''));
        $slug = trim((string) ($body['slug'] ?? ''));

        if ($name === '') Response::error('name is required', 422, 'VALIDATION_ERROR');
        if ($slug === '') Response::error('slug is required', 422, 'VALIDATION_ERROR');
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            Response::error('slug must be lowercase letters, numbers, and hyphens only', 422, 'VALIDATION_ERROR');
        }

        $dup = $db->prepare('SELECT id FROM events WHERE slug = ? LIMIT 1');
        $dup->execute([$slug]);
        if ($dup->fetch()) Response::error('An event with that slug already exists', 409, 'CONFLICT');

        $cols = ['slug','name','description','welcome_message','event_date','event_start_time',
                 'event_end_time','location','primary_color','secondary_color',
                 'photos_enabled','videos_enabled','guestbook_enabled','photostrip_enabled',
                 'moderation_enabled','is_private','max_photo_size_mb','max_video_size_mb',
                 'max_uploads_per_guest','status'];

        $defaults = [
            'primary_color'   => '#C8102E',
            'secondary_color' => '#8E0B20',
            'photos_enabled'  => 1, 'videos_enabled' => 1,
            'guestbook_enabled' => 1, 'photostrip_enabled' => 1,
            'moderation_enabled' => 0, 'is_private' => 1,
            'max_photo_size_mb' => 10, 'max_video_size_mb' => 100,
            'status' => 'draft',
        ];

        $fields = []; $values = [];
        foreach ($cols as $col) {
            $val = $body[$col] ?? $defaults[$col] ?? null;
            if ($val !== null) {
                $fields[] = "`$col`";
                $values[] = is_bool($val) ? (int) $val : $val;
            }
        }

        $placeholders = implode(',', array_fill(0, count($fields), '?'));
        $db->prepare('INSERT INTO events (' . implode(',', $fields) . ') VALUES (' . $placeholders . ')')
           ->execute($values);

        $id    = (int) $db->lastInsertId();
        $event = $db->prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
        $event->execute([$id]);
        $row = $event->fetch();

        self::log($db, $request, $admin['id'], null, 'CREATE_EVENT', 'event', $id, "Created event: $name");
        Response::json(EventController::format($row), 201);
    }

    /** GET /api/super/events/{id} */
    public static function getEvent(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $id  = (int) ($request->params['id'] ?? 0);
        $db  = Database::get();
        $row = self::findEvent($db, $id);

        $admins = $db->prepare(
            'SELECT u.id, u.name, u.email, u.is_active, ea.created_at AS assigned_at
             FROM event_admins ea JOIN admin_users u ON u.id = ea.admin_id
             WHERE ea.event_id = ? ORDER BY ea.created_at'
        );
        $admins->execute([$id]);

        $data              = self::formatEventRow($row);
        $data['admins']    = $admins->fetchAll();
        Response::json($data);
    }

    /** PUT /api/super/events/{id} */
    public static function updateEvent(Request $request): void
    {
        $admin = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();
        self::findEvent($db, $id);

        $allowed = ['name','description','welcome_message','event_date','event_start_time',
                    'event_end_time','location','primary_color','secondary_color',
                    'photos_enabled','videos_enabled','guestbook_enabled','photostrip_enabled',
                    'moderation_enabled','is_private','max_photo_size_mb','max_video_size_mb',
                    'max_uploads_per_guest','status','slug'];

        $body = $request->all();

        if (isset($body['slug'])) {
            $slug = trim((string) $body['slug']);
            if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
                Response::error('slug must be lowercase letters, numbers, and hyphens only', 422, 'VALIDATION_ERROR');
            }
            $dup = $db->prepare('SELECT id FROM events WHERE slug = ? AND id != ? LIMIT 1');
            $dup->execute([$slug, $id]);
            if ($dup->fetch()) Response::error('An event with that slug already exists', 409, 'CONFLICT');
        }

        $fields = []; $values = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $body)) {
                $fields[] = "`$col` = ?";
                $values[] = is_bool($body[$col]) ? (int) $body[$col] : $body[$col];
            }
        }
        if (empty($fields)) Response::error('No valid fields provided', 422);

        $values[] = $id;
        $db->prepare('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

        self::log($db, $request, $admin['id'], $id, 'UPDATE_EVENT', 'event', $id, "Updated event id=$id");

        $stmt = $db->prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        Response::json(EventController::format($stmt->fetch()));
    }

    /** DELETE /api/super/events/{id} — soft archive */
    public static function archiveEvent(Request $request): void
    {
        $admin = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();
        self::findEvent($db, $id);

        $db->prepare("UPDATE events SET status='archived', deleted_at=NOW() WHERE id = ?")
           ->execute([$id]);

        self::log($db, $request, $admin['id'], $id, 'ARCHIVE_EVENT', 'event', $id, "Archived event id=$id");
        Response::json(['id' => $id, 'archived' => true]);
    }

    /** PATCH /api/super/events/{id}/restore */
    public static function restoreEvent(Request $request): void
    {
        $admin = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();

        $stmt = $db->prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::error('Event not found', 404);

        $db->prepare("UPDATE events SET status='draft', deleted_at=NULL WHERE id = ?")
           ->execute([$id]);

        self::log($db, $request, $admin['id'], $id, 'RESTORE_EVENT', 'event', $id, "Restored event id=$id");
        Response::json(['id' => $id, 'restored' => true]);
    }

    // -------------------------------------------------------------------------
    // Admins
    // -------------------------------------------------------------------------

    /** GET /api/super/admins */
    public static function listAdmins(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $db = Database::get();

        $role   = $request->input('role', '');
        $search = trim((string) $request->input('search', ''));
        $active = $request->input('is_active', '');

        $where = []; $params = [];

        if ($role && in_array($role, ['super_admin','event_admin'], true)) {
            $where[] = 'role = ?'; $params[] = $role;
        }
        if ($search !== '') {
            $where[] = '(name LIKE ? OR email LIKE ?)';
            $params[] = "%$search%"; $params[] = "%$search%";
        }
        if ($active !== '') {
            $where[] = 'is_active = ?'; $params[] = (int) $active;
        }

        $sql = 'SELECT id, name, email, role, is_active, last_login_at, created_at, updated_at,
                    (SELECT COUNT(*) FROM event_admins ea WHERE ea.admin_id = admin_users.id) AS assigned_event_count
                FROM admin_users'
            . (empty($where) ? '' : ' WHERE ' . implode(' AND ', $where))
            . ' ORDER BY created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    /** POST /api/super/admins */
    public static function createAdmin(Request $request): void
    {
        $actor = AdminAuth::requireSuperAdmin($request);
        $db    = Database::get();
        $body  = $request->all();

        $name     = trim((string) ($body['name']     ?? ''));
        $email    = trim((string) ($body['email']    ?? ''));
        $password = (string)      ($body['password'] ?? '');
        $role     = (string)      ($body['role']     ?? 'event_admin');

        if ($name === '' || $email === '' || $password === '') {
            Response::error('name, email, and password are required', 422, 'VALIDATION_ERROR');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email address', 422, 'VALIDATION_ERROR');
        }
        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 422, 'VALIDATION_ERROR');
        }
        if (!in_array($role, ['super_admin','event_admin'], true)) {
            Response::error('role must be super_admin or event_admin', 422, 'VALIDATION_ERROR');
        }

        $dup = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
        $dup->execute([$email]);
        if ($dup->fetch()) Response::error('An admin with that email already exists', 409, 'CONFLICT');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare('INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
           ->execute([$name, $email, $hash, $role]);

        $newId = (int) $db->lastInsertId();
        self::log($db, $request, $actor['id'], null, 'CREATE_ADMIN', 'admin_user', $newId, "Created admin: $email ($role)");

        Response::json(['id' => $newId, 'name' => $name, 'email' => $email, 'role' => $role, 'is_active' => true], 201);
    }

    /** GET /api/super/admins/{id} */
    public static function getAdmin(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $id   = (int) ($request->params['id'] ?? 0);
        $db   = Database::get();
        $row  = self::findAdmin($db, $id);

        $events = $db->prepare(
            'SELECT e.id, e.name, e.slug, e.status, ea.created_at AS assigned_at
             FROM event_admins ea JOIN events e ON e.id = ea.event_id
             WHERE ea.admin_id = ? ORDER BY ea.created_at'
        );
        $events->execute([$id]);
        $row['assigned_events'] = $events->fetchAll();
        Response::json($row);
    }

    /** PUT /api/super/admins/{id} */
    public static function updateAdmin(Request $request): void
    {
        $actor = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();
        self::findAdmin($db, $id);

        $body    = $request->all();
        $allowed = ['name','email','role','is_active'];
        $fields  = []; $values = [];

        if (isset($body['email'])) {
            if (!filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
                Response::error('Invalid email address', 422, 'VALIDATION_ERROR');
            }
            $dup = $db->prepare('SELECT id FROM admin_users WHERE email = ? AND id != ? LIMIT 1');
            $dup->execute([$body['email'], $id]);
            if ($dup->fetch()) Response::error('Email already in use', 409, 'CONFLICT');
        }
        if (isset($body['role']) && !in_array($body['role'], ['super_admin','event_admin'], true)) {
            Response::error('role must be super_admin or event_admin', 422, 'VALIDATION_ERROR');
        }

        foreach ($allowed as $col) {
            if (array_key_exists($col, $body)) {
                $fields[] = "`$col` = ?";
                $values[] = is_bool($body[$col]) ? (int) $body[$col] : $body[$col];
            }
        }
        if (empty($fields)) Response::error('No valid fields provided', 422);

        $values[] = $id;
        $db->prepare('UPDATE admin_users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

        self::log($db, $request, $actor['id'], null, 'UPDATE_ADMIN', 'admin_user', $id, "Updated admin id=$id");
        Response::json(self::findAdmin($db, $id));
    }

    /** PATCH /api/super/admins/{id}/disable */
    public static function disableAdmin(Request $request): void
    {
        $actor = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();
        self::findAdmin($db, $id);

        $db->prepare('UPDATE admin_users SET is_active = 0 WHERE id = ?')->execute([$id]);
        $db->prepare("UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND revoked_at IS NULL")
           ->execute([$id]);

        self::log($db, $request, $actor['id'], null, 'DISABLE_ADMIN', 'admin_user', $id, "Disabled admin id=$id");
        Response::json(['id' => $id, 'is_active' => false]);
    }

    /** PATCH /api/super/admins/{id}/enable */
    public static function enableAdmin(Request $request): void
    {
        $actor = AdminAuth::requireSuperAdmin($request);
        $id    = (int) ($request->params['id'] ?? 0);
        $db    = Database::get();
        self::findAdmin($db, $id);

        $db->prepare('UPDATE admin_users SET is_active = 1 WHERE id = ?')->execute([$id]);

        self::log($db, $request, $actor['id'], null, 'ENABLE_ADMIN', 'admin_user', $id, "Enabled admin id=$id");
        Response::json(['id' => $id, 'is_active' => true]);
    }

    /** PATCH /api/super/admins/{id}/password */
    public static function resetPassword(Request $request): void
    {
        $actor    = AdminAuth::requireSuperAdmin($request);
        $id       = (int) ($request->params['id'] ?? 0);
        $db       = Database::get();
        self::findAdmin($db, $id);

        $password = (string) $request->input('password', '');
        if (strlen($password) < 8) Response::error('Password must be at least 8 characters', 422, 'VALIDATION_ERROR');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')->execute([$hash, $id]);
        $db->prepare("UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND revoked_at IS NULL")
           ->execute([$id]);

        self::log($db, $request, $actor['id'], null, 'RESET_ADMIN_PASSWORD', 'admin_user', $id, "Reset password for admin id=$id");
        Response::json(['id' => $id, 'password_reset' => true]);
    }

    // -------------------------------------------------------------------------
    // Guests
    // -------------------------------------------------------------------------

    /** GET /api/super/guests */
    public static function listGuests(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $db = Database::get();

        $eventId = (int) $request->input('event_id', 0);
        $search  = trim((string) $request->input('search', ''));
        $limit   = min((int) $request->input('limit', 50), 200);
        $offset  = (int) $request->input('offset', 0);

        $where = []; $params = [];
        if ($eventId) { $where[] = 'g.event_id = ?'; $params[] = $eventId; }
        if ($search !== '') { $where[] = 'g.name LIKE ?'; $params[] = "%$search%"; }

        $sql = 'SELECT g.id, g.name, g.event_id, e.name AS event_name, e.slug AS event_slug,
                    g.created_at, g.last_seen_at
                FROM guests g
                JOIN events e ON e.id = g.event_id'
            . (empty($where) ? '' : ' WHERE ' . implode(' AND ', $where))
            . ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    // -------------------------------------------------------------------------
    // Activity Logs
    // -------------------------------------------------------------------------

    /** GET /api/super/logs */
    public static function listLogs(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $db = Database::get();

        $eventId = (int) $request->input('event_id', 0);
        $adminId = (int) $request->input('admin_id', 0);
        $action  = trim((string) $request->input('action', ''));
        $from    = trim((string) $request->input('from', ''));
        $to      = trim((string) $request->input('to', ''));
        $limit   = min((int) $request->input('limit', 50), 200);
        $offset  = (int) $request->input('offset', 0);

        $where = []; $params = [];
        if ($eventId) { $where[] = 'l.event_id = ?';  $params[] = $eventId; }
        if ($adminId) { $where[] = 'l.admin_id = ?';  $params[] = $adminId; }
        if ($action)  { $where[] = 'l.action = ?';    $params[] = $action; }
        if ($from)    { $where[] = 'l.created_at >= ?'; $params[] = $from; }
        if ($to)      { $where[] = 'l.created_at <= ?'; $params[] = $to; }

        $sql = 'SELECT l.id, l.event_id, l.admin_id, l.guest_id,
                    l.action, l.entity_type, l.entity_id,
                    l.description, l.ip_address, l.created_at,
                    u.name AS admin_name, u.email AS admin_email,
                    e.name AS event_name
                FROM activity_logs l
                LEFT JOIN admin_users u ON u.id = l.admin_id
                LEFT JOIN events e ON e.id = l.event_id'
            . (empty($where) ? '' : ' WHERE ' . implode(' AND ', $where))
            . ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    // -------------------------------------------------------------------------
    // System Settings
    // -------------------------------------------------------------------------

    /** GET /api/super/settings */
    public static function listSettings(Request $request): void
    {
        AdminAuth::requireSuperAdmin($request);
        $stmt = Database::get()->query('SELECT id, setting_key, setting_value, is_public, updated_at FROM system_settings ORDER BY id');
        Response::json($stmt->fetchAll());
    }

    /** PATCH /api/super/settings */
    public static function updateSettings(Request $request): void
    {
        $actor = AdminAuth::requireSuperAdmin($request);
        $db    = Database::get();
        $body  = $request->all();

        if (!is_array($body) || empty($body)) Response::error('No settings provided', 422);

        $stmt = $db->prepare('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?');
        $updated = [];
        foreach ($body as $key => $value) {
            $stmt->execute([(string) $value, (string) $key]);
            if ($stmt->rowCount()) {
                $updated[] = $key;
                self::log($db, $request, $actor['id'], null, 'UPDATE_SYSTEM_SETTING', 'system_settings', 0, "Updated setting: $key");
            }
        }

        Response::json(['updated' => $updated]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static function findEvent(\PDO $db, int $id): array
    {
        $stmt = $db->prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::error('Event not found', 404);
        return $row;
    }

    private static function findAdmin(\PDO $db, int $id): array
    {
        $stmt = $db->prepare(
            'SELECT id, name, email, role, is_active, last_login_at, created_at, updated_at FROM admin_users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) Response::error('Admin not found', 404);
        return $row;
    }

    private static function formatEventRow(array $row): array
    {
        $base = EventController::format($row);
        $base['created_at']           = $row['created_at'];
        $base['updated_at']           = $row['updated_at'];
        $base['deleted_at']           = $row['deleted_at'];
        $base['assigned_admin_count'] = (int) ($row['assigned_admin_count'] ?? 0);
        $base['guest_count']          = (int) ($row['guest_count']          ?? 0);
        $base['photo_count']          = (int) ($row['photo_count']          ?? 0);
        $base['video_count']          = (int) ($row['video_count']          ?? 0);
        $base['photo_strip_count']    = (int) ($row['photo_strip_count']    ?? 0);
        return $base;
    }

    private static function log(
        \PDO $db, Request $request, int $adminId,
        ?int $eventId, string $action,
        string $entityType, int $entityId, string $description
    ): void {
        $db->prepare(
            'INSERT INTO activity_logs (event_id, admin_id, action, entity_type, entity_id, description, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$eventId, $adminId, $action, $entityType, $entityId, $description, $request->ip()]);
    }
}
