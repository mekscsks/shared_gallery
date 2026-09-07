# Shared Event Gallery

## 1. Project Overview

Shared Event Gallery is a private, QR-code-accessed event memory platform.
Guests scan a code or open a link, type their name (no account), and can
immediately contribute photos, videos, and guestbook messages to a shared
gallery for that event — plus optionally generate a photobooth-style photo
strip as a keepsake.

It's designed to work for any single-day or multi-day gathering:

- RCY Training 2026 (the current sample event)
- School events, Foundation Days, Intramurals, Graduations
- Weddings, birthdays, community and organization events

The system is **multi-event**: each event gets its own slug-based URL and
independent configuration, branding, and content.

```
/event/rcy-training-2026
/event/graduation-2026
/event/foundation-day-2026
```

## 2. System Goals

- Simple guest experience — enter a name, nothing else
- No guest registration or password
- QR-code event access
- Mobile-first design
- One shared gallery per event (photos + videos)
- A guestbook for written messages
- An optional, clearly-secondary photo strip / photobooth feature
- Per-event branding (colors, logo, cover image, copy)
- Admin moderation (feature / hide / delete / filter)
- Multi-event support from a single codebase
- Local file storage for media uploads
- MySQL as the metadata store
- Secure, role-based admin authentication

## 3. System Architecture

```
Browser
    ↓
Tailwind CSS + Vanilla JavaScript   ← built
    ↓
PHP REST API                        ← built
    ↓
MySQL / MariaDB                     ← built
    ↓
Local filesystem storage            ← built (backend/storage/uploads/)
```

**MySQL** owns: events, admins, guests, sessions, media metadata,
moderation state, guestbook entries, photo strip configuration, activity
logs, system settings, storage usage cache.

**Local filesystem** owns the actual bytes: photos, videos, and event
assets (logo, cover photo) — organized per event under
`backend/storage/uploads/`.

**PHP** owns: authentication, authorization, input/file validation, the
REST API surface, and all business logic. The frontend is never trusted to
enforce anything security-relevant.

**Frontend** owns: the guest and admin UI, and all API calls, funneled
through one file (`js/api.js`) so the backend can be swapped in without
touching any page.

## 4. Technology Stack

**Frontend**
- HTML5
- Tailwind CSS (via CDN, no build step)
- Vanilla JavaScript (no framework)
- `localStorage` for guest session persistence

**Backend**
- PHP 8.2+
- Hand-rolled REST API (no framework)
- PDO for all database access
- Composer for dependency management (`vlucas/phpdotenv`)

**Database**
- MySQL 8+ / MariaDB 11.4

**Storage**
- Local filesystem (`backend/storage/uploads/`)

**Development / Deployment**
- Git
- Docker + Docker Compose (recommended)
- PHP CLI + MySQL CLI (for local dev without Docker)

## 5. Project Structure

```
shared-gallery/
├── index.html               Welcome screen (guest name entry)
├── gallery.html             Main masonry gallery
├── guestbook.html           Guestbook wall + composer
├── photostrip.html          4-step optional Photo Strip Builder
│
├── admin/
│   ├── login.html           Admin login screen
│   ├── dashboard.html       Event Admin — stats + recent activity
│   ├── gallery.html         Event Admin — moderate photos & videos
│   ├── guestbook.html       Event Admin — moderate guestbook messages
│   ├── settings.html        Event Admin — event profile, branding, feature toggles
│   ├── qrcode.html          Event Admin — QR preview, link, download/print
│   └── super/
│       ├── dashboard.html   Super Admin — platform stats
│       ├── events.html      Super Admin — event list + create
│       ├── event-detail.html Super Admin — per-event detail + admin assignment
│       ├── admins.html      Super Admin — admin user management
│       ├── guests.html      Super Admin — guest list across all events
│       ├── logs.html        Super Admin — activity log viewer
│       └── settings.html    Super Admin — system settings
│
├── js/
│   ├── tailwind-config.js   Theme tokens
│   ├── mockData.js          Sample event, photos, videos, guestbook, templates
│   ├── api.js               API abstraction + guest session helpers
│   ├── dev-config.js        LOCAL DEV ONLY — API base URL + dev login bypass
│   ├── components/
│   │   ├── header.js, bottomNav.js, galleryGrid.js, uploadModal.js
│   │   ├── guestbook.js, photoStrip.js, adminShell.js, superShell.js
│   │   └── sheetsAndToasts.js
│   └── pages/
│       ├── welcome.js, gallery.js, guestbook.js, photostrip.js
│       └── admin-dashboard.js, admin-gallery.js, admin-guestbook.js,
│           admin-settings.js, admin-qrcode.js
│
├── css/
│   └── styles.css
│
├── backend/
│   ├── public/
│   │   ├── index.php        Entry point
│   │   └── router.php       PHP built-in server router
│   ├── src/
│   │   ├── Controllers/     AuthController, EventController, GuestController,
│   │   │                    PhotoController, VideoController, GuestbookController,
│   │   │                    PhotoStripController, AdminController, SuperAdminController
│   │   ├── Core/            Database, Request, Response, Router, Uploader
│   │   └── Middleware/      AdminAuth, GuestAuth
│   ├── cli/
│   │   ├── create-admin.php       Seed a Super Admin account
│   │   └── create-event-admin.php Seed an Event Admin account
│   ├── storage/
│   │   └── uploads/         Uploaded media files, organized by event id
│   ├── vendor/              Composer dependencies
│   ├── .env                 Local environment config (not committed)
│   ├── .env.example         Template for .env
│   ├── .gitignore
│   ├── composer.json
│   └── composer.lock
│
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .htaccess
├── serve.json
└── README.md
```

## 6. User Roles

### Super Admin
Full system access. Can create events, manage all events, manage Event
Admins, assign admins to events, manage platform-level settings, and view
activity logs across every event.

### Event Admin
Scoped to the event(s) they're assigned to. Can edit their event's settings,
moderate photos/videos and guestbook messages, and manage the event's
QR/link. Cannot manage other admins, create Super Admins, or touch events
they aren't assigned to.

### Guest
No account. Can enter a name, browse the gallery, upload photos/videos,
post guestbook messages, build an optional photo strip, and download/share
memories.

```
SUPER ADMIN  →  All events + platform settings
EVENT ADMIN  →  Only assigned events
GUEST        →  One event, name-based session only
```

## 7. Authentication & Authorization

**Admin authentication:**
- Email + password, hashed with `password_hash()` / verified with `password_verify()`
- PHP server-side sessions (`$_SESSION`)
- Every admin request re-validated server-side via `AdminAuth` middleware
- `GET /api/admin/me` used on page load to check session and redirect accordingly
- Login page (`admin/login.html`) redirects Super Admins to `super/dashboard.html`
  and Event Admins to `dashboard.html`

**Dev-mode login bypass:**
- `js/dev-config.js` intercepts `App.api.adminLogin()` locally so the login
  page works without a running PHP server. This file must not be included in
  production.

**Guest "authentication":**
- A guest types a display name; the frontend stores a name, a locally-generated
  `guestId`, and a `sessionToken` slot in `localStorage`, scoped per event
- `POST /api/events/{id}/guests` issues a server-side guest session token that
  replaces the client-generated id on subsequent requests

**Role-based access control:** every admin-only PHP endpoint checks the
caller's role and, for Event Admins, checks that the target event is one
they're assigned to — enforced server-side via `AdminAuth`.

## 8. Database

Schema lives in `shared_event_gallery (2).sql`. Run it to create all tables.

| Table | Purpose |
|---|---|
| `admin_users` | Super Admin & Event Admin accounts |
| `admin_sessions` | Server-side admin session tokens |
| `events` | One row per event |
| `event_admins` | Which admins can manage which events |
| `guests` | Guest identities scoped to an event |
| `guest_sessions` | Guest session tokens |
| `photos` | Photo metadata + file paths |
| `videos` | Video metadata + file paths |
| `guestbook` | Written messages |
| `photo_strips` | Generated strip configs |
| `activity_logs` | Audit trail for admin + moderation actions |
| `system_settings` | Platform-level config (Super Admin only) |
| `event_storage_usage` | Cached storage usage per event |

## 9. Event System

Every event is a row in `events` with its own slug, branding, feature
toggles, privacy settings, upload limits, moderation setting, and status.

Event statuses:

```
draft      — being configured, not yet visible to guests
active     — live, guests can access it via slug/QR
archived   — read-only, kept for posterity
disabled   — hidden entirely
```

## 10. Guest Experience

```
Scan QR / open link
   ↓
Event Welcome Screen   (index.html)
   ↓
Enter Name             (no registration, no password)
   ↓
Guest Session          (name + token in localStorage)
   ↓
Gallery                (gallery.html)
   ↓
Photos · Videos · Guestbook · Photo Strip (optional)
```

## 11. Photo & Video System

Upload flow:

```
Guest
 ↓
Frontend (FormData)
 ↓
PHP API — validate guest, event, file type, file size
 ↓
Save to backend/storage/uploads/{event_id}/
 ↓
Store metadata + file path in MySQL
 ↓
Gallery reflects the new item
```

Files are served directly from `backend/storage/uploads/`. The frontend
uses `thumbnail_url`, `preview_url`, and `original_url` per item so the
gallery grid, lightbox, and downloads each load an appropriately-sized file.

## 12. Storage

Media files are stored locally under `backend/storage/uploads/`, organized
by event id. MySQL stores each file's path and metadata — never the file
bytes themselves.

Google Drive integration is not implemented. The `events` table has Drive
folder id columns reserved for a future migration if needed.

## 13. Guestbook

Statuses: `pending`, `approved`, `hidden`, `deleted`. When
`moderation_enabled` is on for an event, new messages land as `pending`
until an admin approves them.

## 14. Optional Photo Strip

```
Gallery → Create Photo Strip
 ↓
Step 1 — Choose 3–4 photos
 ↓
Step 2 — Choose a template (Classic · Minimal · Event Branded · Playful)
 ↓
Step 3 — Customize (logo, event name, custom text, background, stickers)
 ↓
Step 4 — Preview
 ↓
Download · Share · Add to Event Gallery   (each independent)
```

`exportStripAsImage()` in `js/pages/photostrip.js` is the marked hook for
a future Canvas API rasterization — the rest of the flow needs no changes
once that lands.

## 15. Feature Toggles

Per-event toggles stored in the `events` table:

```
photos_enabled        — photo uploads on/off
videos_enabled        — video uploads on/off
guestbook_enabled     — guestbook on/off
photostrip_enabled    — photo strip builder on/off
moderation_enabled    — pending-queue moderation on/off
is_private            — gallery visible to guests or not
```

These are enforced both client-side (UI) and server-side (API).

## 16. Moderation

```
If moderation_enabled = false:
Upload → approved → Gallery

If moderation_enabled = true:
Upload → pending → Admin review → approved / hidden / deleted
```

Admins moderate via `admin/gallery.html` and `admin/guestbook.html`.

## 17. API

### Implemented endpoints

```
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/me
GET    /api/admin/my-events

GET    /api/events/default
GET    /api/events/slug/{slug}
GET    /api/events/{id}
PATCH  /api/events/{id}
GET    /api/events/{id}/admins
POST   /api/events/{id}/admins
DELETE /api/events/{id}/admins/{adminId}

POST   /api/events/{id}/guests

GET    /api/events/{id}/photos
POST   /api/events/{id}/photos
GET    /api/events/{id}/videos
POST   /api/events/{id}/videos
GET    /api/events/{id}/guestbook
POST   /api/events/{id}/guestbook
POST   /api/events/{id}/photostrips

PATCH  /api/admin/photos/{id}/feature
PATCH  /api/admin/photos/{id}/visibility
DELETE /api/admin/photos/{id}
PATCH  /api/admin/videos/{id}/feature
PATCH  /api/admin/videos/{id}/visibility
DELETE /api/admin/videos/{id}
PATCH  /api/admin/guestbook/{id}/visibility
DELETE /api/admin/guestbook/{id}

GET    /api/super/dashboard
GET    /api/super/events
POST   /api/super/events
GET    /api/super/events/{id}
PUT    /api/super/events/{id}
DELETE /api/super/events/{id}
PATCH  /api/super/events/{id}/restore
GET    /api/super/admins
POST   /api/super/admins
GET    /api/super/admins/{id}
PUT    /api/super/admins/{id}
PATCH  /api/super/admins/{id}/disable
PATCH  /api/super/admins/{id}/enable
PATCH  /api/super/admins/{id}/password
GET    /api/super/guests
GET    /api/super/logs
GET    /api/super/settings
PATCH  /api/super/settings
```

## 18. API Response Format

**Success**
```json
{ "success": true, "data": {} }
```

**Error**
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "You do not have permission." } }
```

Status codes: `200` success, `201` created, `400` validation error,
`401` not authenticated, `403` forbidden, `404` not found, `409` conflict,
`422` invalid input, `429` rate limited, `500` server error.

## 19. Security

- PDO prepared statements for every query
- `password_hash()` / `password_verify()` for admin credentials
- PHP server-side sessions; session id regenerated on login
- `AdminAuth` middleware on every admin route, checking role + event assignment
- Input validation and file-type/size validation on every upload
- Secrets only in `.env`, never committed
- `js/dev-config.js` must not be deployed to production

## 20. Environment Variables

`.env.example` (copy to `.env` and fill in):

```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=shared_event_gallery
DB_USERNAME=root
DB_PASSWORD=

CORS_ALLOWED_ORIGINS=http://localhost:5000,http://127.0.0.1:5000

# Admin session lifetime in seconds (default: 8 hours)
SESSION_LIFETIME=28800
```

## 21. Installation

### Option A — Docker (recommended)

```bash
docker-compose up -d
```

The app is served at `http://localhost:8081`. The database is initialized
automatically. Then seed a Super Admin:

```bash
docker exec -it shared-event-gallery-app php backend/cli/create-admin.php
```

### Option B — Local PHP + MySQL

```bash
cd backend
composer install
mysql -u root -p shared_event_gallery < ../shared_event_gallery\ \(2\).sql
cp .env.example .env
# edit .env with local DB credentials
php -S localhost:8000 -t public public/router.php
```

Open `index.html` directly or serve the frontend root:

```bash
npx serve .
```

## 22. Initial Super Admin

Use the CLI script to create the first Super Admin (hashes the password
server-side, never writes it in plaintext):

```bash
php backend/cli/create-admin.php
```

For an Event Admin:

```bash
php backend/cli/create-event-admin.php
```

## 23. Development

**Frontend work:** edit files under `js/components/` or `js/pages/`. Never
read `window.MOCK_DB` or `localStorage` directly from a page — always go
through `js/api.js`.

**Backend work:** schema changes should ship as versioned migrations. API
changes should update Section 17 of this README in the same change.

**Dev login:** `js/dev-config.js` provides a mock login so the admin UI
works without a running PHP server. Credentials: `super@admin.com` /
`admin123` (super_admin) and `event@admin.com` / `admin123` (event_admin).
Remove this file before deploying.

## 24. Testing

Frontend syntax check:

```bash
node --check js/api.js
node --check js/pages/gallery.js
# etc.
```

Backend:

```bash
php -l backend/src/Controllers/AuthController.php
# etc.
```

Manual flows to verify after any change:
- Guest: welcome → name entry → gallery → upload → guestbook → photo strip
- Event Admin: login → dashboard → moderate gallery/guestbook → settings → QR
- Super Admin: login → events list → create event → assign admin → logs

## 25. Frontend / Backend Integration

`js/api.js` is the only place the frontend reaches for data. Turning on
the real backend is a rewrite of the function bodies inside `js/api.js`
(swap `wait()` + `localStorage` for `fetch()` calls) with no changes
required in `js/components/` or `js/pages/`.

```
Frontend (pages/components)
    ↓
js/api.js         ← the only integration seam
    ↓
PHP REST API
    ↓
MySQL / local filesystem
```

## 26. Development Roadmap

- **Phase 1 — Backend foundation** ✅ database schema, admin auth, RBAC, event CRUD
- **Phase 2 — Guest sessions** ✅ server-issued guest tokens
- **Phase 3 — Photo/video uploads** ✅ real FormData endpoint, validation, local storage
- **Phase 4 — Gallery and Guestbook** ✅ real endpoints wired
- **Phase 5 — Super Admin panel** ✅ events, admins, guests, logs, system settings
- **Phase 6 — Photo Strip** — persist configs server-side, Canvas-based image export
- **Phase 7 — Wire frontend to real API** — replace mock/localStorage in `js/api.js`
- **Phase 8 — Security hardening** — rate limiting, audit logging, CORS lock-down
- **Phase 9 — Production deployment**

## 27. Current Status

**Frontend (guest experience):**
- [x] Welcome screen, name-only entry, no registration
- [x] Masonry gallery with photo/video/featured filters
- [x] Lightbox with keyboard nav, swipe nav, native share, download, report
- [x] Upload modal: drag/drop, per-file retry, feature-toggle-aware accept types
- [x] Guestbook: composer + wall, loading/empty/error/success states
- [x] Photo Strip Builder: 4 steps, 4 templates, independent download/share/add-to-gallery actions
- [x] Mobile bottom navigation + floating "Share Memory" button
- [x] Feature toggles hide disabled nav items and CTAs
- [x] Accessibility: aria-labels, focus return on modal close, `prefers-reduced-motion`, Escape + Tab trap on all sheets/modals

**Frontend (Event Admin):**
- [x] Admin login screen with role-based redirect
- [x] Dashboard with stat cards + recent activity feed
- [x] Gallery moderation: feature/hide/delete, search, filter by guest and media type, confirmation modal
- [x] Guestbook moderation: hide/delete, confirmation modal
- [x] Event settings: Event Information / Branding / Features / Privacy sections
- [x] QR code page: real scannable QR, copy link, download, print

**Frontend (Super Admin):**
- [x] Platform dashboard with aggregate stats
- [x] Events list with search/filter + create event
- [x] Event detail with admin assignment
- [x] Admin user management (create, edit, enable/disable, reset password)
- [x] Guest list across all events
- [x] Activity log viewer
- [x] System settings

**Backend:**
- [x] Database schema (all tables, indexes, foreign keys)
- [x] Admin authentication (login, logout, session, `/api/admin/me`)
- [x] Role-based authorization (`AdminAuth` middleware)
- [x] Event CRUD
- [x] Event Admin assignment
- [x] Activity logging
- [x] Guest sessions (server-issued)
- [x] Guest uploads (photos + videos, local filesystem)
- [x] Guestbook endpoint
- [x] Gallery endpoints (photos + videos)
- [x] Photo strip endpoint
- [x] Super Admin API (events, admins, guests, logs, settings)
- [x] CLI scripts for seeding admins

**Storage:**
- [x] Local filesystem storage (`backend/storage/uploads/`)
- [ ] Google Drive integration (not planned for current phase)

**Photo Strip:**
- [ ] Canvas-based image export (hook exists in `exportStripAsImage()`)
- [ ] Frontend wired to real API (still using mock/localStorage)

**Frontend ↔ Backend wiring:**
- [ ] `js/api.js` still uses mock data + localStorage — needs to be switched to real `fetch()` calls

**Production:**
- [ ] Rate limiting
- [ ] Full security hardening
- [ ] Deployment

## 28. Changelog

### 0.4.0
- Backend fully implemented: PHP REST API, all controllers, `AdminAuth` /
  `GuestAuth` middleware, `Database` / `Request` / `Response` / `Router` /
  `Uploader` core classes
- Database schema created (`shared_event_gallery (2).sql`) — all tables,
  indexes, and foreign keys
- Admin login screen (`admin/login.html`) with role-based redirect:
  Super Admins → `super/dashboard.html`, Event Admins → `dashboard.html`
- Super Admin panel added: `admin/super/` with dashboard, events, event
  detail, admins, guests, logs, and settings pages; `js/components/superShell.js`
- `js/dev-config.js` added for local dev login bypass without a running
  PHP server
- `App.session.requireAdminOrRedirect()` added to all admin pages
- Docker support: `Dockerfile`, `docker-compose.yml` (app + MariaDB 11.4),
  `.dockerignore`
- CLI scripts: `backend/cli/create-admin.php`,
  `backend/cli/create-event-admin.php`
- Local filesystem storage replaces planned Google Drive integration for
  current phase; Drive folder id columns reserved in schema for future use
- `serve.json` added for `npx serve` frontend serving

### 0.3.0
- Admin Settings reorganized into four sections: Event Information,
  Branding (separate primary/secondary color pickers), Features, Privacy
- Generic overlay handling (`App.ui.initOverlays`) — Escape closes and Tab
  is trapped in any open sheet/modal
- Fixed focus-trap edge case on upload modal Escape close

### 0.2.0
- Feature toggles hide disabled nav items/CTAs across guest pages
- Upload modal reworked: per-file retry, uploading/success/error states
- Lightbox: native share, real download, swipe nav, focus trap, aria labels
- Photo Strip: three independent final actions; `exportStripAsImage()` hook;
  step 1 photo swap; `openCamera()` / `capturePhoto()` / `captureSequence()` stubs
- `App.api.buildUploadFormData()` documents the real multipart request shape
- Mock media records carry `thumbUrl` / `mediumUrl` / `originalUrl`
- Admin gallery: search + media-type filter; `App.ui.confirm()` modal
- Admin dashboard: grouped recent activity feed
- Guestbook + gallery: network-error states with retry
- Guest session tracks `guestId` + reserved `sessionToken` slot

### 0.1.0
- Initial frontend prototype: welcome, gallery, guestbook, photo strip
  builder, admin dashboard/gallery/guestbook/settings/QR, mock data layer,
  `js/api.js` contract
