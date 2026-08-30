<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Controllers\AdminController;
use App\Controllers\AuthController;
use App\Controllers\EventController;
use App\Controllers\GuestController;
use App\Controllers\GuestbookController;
use App\Controllers\PhotoController;
use App\Controllers\PhotoStripController;
use App\Controllers\SuperAdminController;
use App\Controllers\VideoController;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use Dotenv\Dotenv;

// --- Environment ---
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();
$dotenv->required(['DB_HOST', 'DB_DATABASE', 'DB_USERNAME']);

// --- Timezone ---
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'Asia/Manila');

// --- CORS ---
$allowedOrigins = array_map('trim', explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? ''));
$origin         = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
} elseif (!$origin) {
    // No Origin header — same-origin or non-browser request, allow it
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Vary: Origin');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Route ---
$router  = new Router();
$request = new Request();

// Auth
$router->post('/api/admin/login',  [AuthController::class, 'login']);
$router->post('/api/admin/logout', [AuthController::class, 'logout']);
$router->get('/api/admin/me',      [AuthController::class, 'me']);

$router->get('/debug', function($req) {
    App\Core\Response::json([
        'path'   => $req->path(),
        'method' => $req->method(),
        'uri'    => $_SERVER['REQUEST_URI'] ?? 'none',
    ]);
});

// Phase 3 — Events + Guest sessions
$router->get('/api/events/slug/{slug}',  [EventController::class, 'getBySlug']);
$router->get('/api/events/{id}',          [EventController::class, 'getById']);
$router->patch('/api/events/{id}',        [EventController::class, 'update']);
$router->post('/api/events/{id}/guests',  [GuestController::class, 'register']);

// Phase 4 — Photo / Video uploads
$router->get('/api/events/{id}/photos',  [PhotoController::class, 'index']);
$router->post('/api/events/{id}/photos', [PhotoController::class, 'store']);
$router->get('/api/events/{id}/videos',  [VideoController::class, 'index']);
$router->post('/api/events/{id}/videos', [VideoController::class, 'store']);

// Phase 5 — Guestbook
$router->get('/api/events/{id}/guestbook',  [GuestbookController::class, 'index']);
$router->post('/api/events/{id}/guestbook', [GuestbookController::class, 'store']);

// Phase 6 — Photo strips
$router->post('/api/events/{id}/photostrips', [PhotoStripController::class, 'store']);

// Event admin assignment (super_admin only)
$router->get('/api/events/{id}/admins',              [EventController::class, 'listAdmins']);
$router->post('/api/events/{id}/admins',             [EventController::class, 'assignAdmin']);
$router->delete('/api/events/{id}/admins/{adminId}', [EventController::class, 'removeAdmin']);

// Super Admin — Dashboard
$router->get('/api/super/dashboard', [SuperAdminController::class, 'dashboard']);

// Super Admin — Events
$router->get('/api/super/events',              [SuperAdminController::class, 'listEvents']);
$router->post('/api/super/events',             [SuperAdminController::class, 'createEvent']);
$router->get('/api/super/events/{id}',         [SuperAdminController::class, 'getEvent']);
$router->put('/api/super/events/{id}',         [SuperAdminController::class, 'updateEvent']);
$router->delete('/api/super/events/{id}',      [SuperAdminController::class, 'archiveEvent']);
$router->patch('/api/super/events/{id}/restore', [SuperAdminController::class, 'restoreEvent']);

// Super Admin — Admins
$router->get('/api/super/admins',                    [SuperAdminController::class, 'listAdmins']);
$router->post('/api/super/admins',                   [SuperAdminController::class, 'createAdmin']);
$router->get('/api/super/admins/{id}',               [SuperAdminController::class, 'getAdmin']);
$router->put('/api/super/admins/{id}',               [SuperAdminController::class, 'updateAdmin']);
$router->patch('/api/super/admins/{id}/disable',     [SuperAdminController::class, 'disableAdmin']);
$router->patch('/api/super/admins/{id}/enable',      [SuperAdminController::class, 'enableAdmin']);
$router->patch('/api/super/admins/{id}/password',    [SuperAdminController::class, 'resetPassword']);

// Super Admin — Guests
$router->get('/api/super/guests', [SuperAdminController::class, 'listGuests']);

// Super Admin — Activity Logs
$router->get('/api/super/logs', [SuperAdminController::class, 'listLogs']);

// Super Admin — System Settings
$router->get('/api/super/settings',   [SuperAdminController::class, 'listSettings']);
$router->patch('/api/super/settings', [SuperAdminController::class, 'updateSettings']);

// Asset uploads (logo, cover)
$router->post('/api/admin/events/{id}/assets', [AdminController::class, 'uploadAsset']);

// Phase 6 — Admin moderation
$router->patch('/api/admin/photos/{id}/feature',      [AdminController::class, 'featurePhoto']);
$router->patch('/api/admin/photos/{id}/visibility',   [AdminController::class, 'hidePhoto']);
$router->delete('/api/admin/photos/{id}',             [AdminController::class, 'deletePhoto']);
$router->patch('/api/admin/guestbook/{id}/visibility',[AdminController::class, 'hideMessage']);
$router->delete('/api/admin/guestbook/{id}',          [AdminController::class, 'deleteMessage']);
$router->patch('/api/admin/events/{id}/settings',     [AdminController::class, 'updateSettings']);
$router->get('/api/admin/events/{id}/stats',          [AdminController::class, 'stats']);

// Serve uploaded files from storage/ — only reachable via this explicit
// path prefix so arbitrary files can't be served from the backend root.
$path = $request->path();
if (str_starts_with($path, '/storage/uploads/')) {
    $file = dirname(__DIR__) . $path;
    if (is_file($file)) {
        $mime = mime_content_type($file) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=31536000, immutable');
        readfile($file);
        exit;
    }
    Response::error('File not found', 404);
}

$router->dispatch($request);
