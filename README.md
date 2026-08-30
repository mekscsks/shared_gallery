# Shared Event Gallery

> **Scope note, read this first:** only the **frontend** described below has
> been built and is running code you can open in a browser today. The
> database schema, PHP API, admin authentication/RBAC, and Google Drive
> integration described in this document are the **planned** backend — none
> of that server-side code exists in this repository yet. Every checklist in
> [Section 27](#27-current-status) reflects that honestly. Treat the backend
> sections as a specification for the next phase of work, not a changelog of
> what's done.

---

## 1. Project Overview

Shared Event Gallery is a private, QR-code-accessed event memory platform.
Guests scan a code or open a link, type their name (no account), and can
immediately contribute photos, videos, and guestbook messages to a shared
gallery for that event — plus optionally generate a photobooth-style photo
strip as a keepsake.

It's designed to work for any single-day or multi-day gathering, not just
one event type:

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
- Google Drive as the media storage backend *(planned)*
- MySQL as the metadata store *(planned)*
- Secure, role-based admin authentication *(planned)*

## 3. System Architecture

```
Browser
    ↓
Tailwind CSS + Vanilla JavaScript   ← built (this repo)
    ↓
PHP REST API                        ← planned
    ↓
MySQL                               ← planned
    ↓
Google Drive API                    ← planned
    ↓
Google Drive                        ← planned
```

**MySQL** (planned) owns: events, admins, guests, sessions, media metadata,
moderation state, guestbook entries, photo strip configuration, activity
logs.

**Google Drive** (planned) owns the actual bytes: photos, videos, generated
photo strip images, and event assets (logo, cover photo) — organized one
folder tree per event.

**PHP** (planned) owns: authentication, authorization, input/file
validation, the REST API surface, talking to Drive, and all business logic.
The frontend is never trusted to enforce anything security-relevant.

**Frontend** (built) owns: the guest and admin UI, and all API calls,
funneled through one file (`js/api.js`) so the backend can be swapped in
without touching any page.

## 4. Technology Stack

**Frontend — built**
- HTML5
- Tailwind CSS (via CDN, no build step)
- Vanilla JavaScript (no framework)
- `localStorage` for prototype-only guest session & mock data persistence

**Backend — planned**
- PHP 8.2+
- Hand-rolled REST API (no framework assumed yet)
- PDO for all database access
- Composer for dependency management

**Database — planned**
- MySQL 8+

**Storage — planned**
- Google Drive API (server-side only, via a service account)

**Development**
- Git
- Composer, PHP CLI, MySQL CLI (once the backend exists)

## 5. Project Structure

This is the actual tree in this repository today:

```
rcy-gallery/
├── index.html               Welcome screen (guest name entry)
├── gallery.html              Main masonry gallery
├── guestbook.html            Guestbook wall + composer
├── photostrip.html           4-step optional Photo Strip Builder
│
├── admin/
│   ├── dashboard.html         Stats + recent activity
│   ├── gallery.html            Moderate photos & videos
│   ├── guestbook.html          Moderate guestbook messages
│   ├── settings.html           Event profile, branding, feature toggles
│   └── qrcode.html             QR preview, link, download/print
│
├── js/
│   ├── tailwind-config.js     Theme tokens (colors, type, shadows, motion)
│   ├── mockData.js             Sample event, photos, videos, guestbook, templates
│   ├── api.js                  API abstraction + guest session helpers
│   ├── components/             One file per reusable UI piece
│   │   ├── header.js, bottomNav.js, galleryGrid.js, uploadModal.js,
│   │   ├── guestbook.js, photoStrip.js, adminShell.js, sheetsAndToasts.js
│   └── pages/                  One controller per page, wires components + api
│       ├── welcome.js, gallery.js, guestbook.js, photostrip.js
│       └── admin-dashboard.js, admin-gallery.js, admin-guestbook.js,
│           admin-settings.js, admin-qrcode.js
│
├── css/
│   └── styles.css              Fonts, masonry layout, the "perf-edge"
│                                photobooth motif, skeleton shimmer,
│                                reduced-motion support
│
└── README.md
```

**Not present yet** (planned, described for reference in later sections):
`backend/`, `.env.example`, `.gitignore`, `composer.json`. These will be
added when backend work starts — this README will be updated to match at
that point, per the note at the top of this document.

## 6. User Roles

### Super Admin *(planned — no auth exists yet)*
Full system access. Can create events, manage all events, manage Event
Admins, assign admins to events, manage platform-level settings, and view
activity logs across every event.

### Event Admin *(planned)*
Scoped to the event(s) they're assigned to. Can edit their event's settings,
moderate photos/videos and guestbook messages, and manage the event's
QR/link. Cannot manage other admins, create Super Admins, or touch events
they aren't assigned to, or change system-level settings.

### Guest *(built, in the sense described below)*
No account. Can enter a name, browse the gallery, upload photos/videos,
post guestbook messages, build an optional photo strip, and download/share
memories. A guest is **not** a traditional authenticated user — see
Section 7.

```
SUPER ADMIN
    ↓
All events

EVENT ADMIN
    ↓
Only assigned events

GUEST
    ↓
One event, name-based session only
```

Today, the admin pages in this repo have **no login screen and no access
control** — they're open HTML files, meant to represent what an
authenticated admin would see once auth exists. Don't treat them as secured.

## 7. Authentication & Authorization

**Admin authentication (planned):**
- Email + password, hashed with `password_hash()` and checked with
  `password_verify()`
- Server-side sessions, referenced client-side by a hashed bearer token
- Every admin request re-validated against the token server-side

**Guest "authentication" (built, deliberately weak):**
- A guest types a display name; the frontend stores a name, a
  locally-generated `guestId`, and a slot for a future `sessionToken` in
  `localStorage`, scoped per event (see `App.session` in `js/api.js`)
- This is a convenience, not security — it only saves a returning guest on
  the same device from retyping their name
- The intended upgrade path: `setGuestName()` calls
  `POST /api/events/{id}/guests`, and the server-issued token replaces the
  client-generated id as the thing actually presented on later requests

**Role-based access control (planned):** every admin-only PHP endpoint
checks the caller's role and, for Event Admins, checks that the target
event is one they're assigned to — enforced server-side, never inferred
from what the UI happens to show or hide.

## 8. Database

**None of the tables below exist yet.** This is the planned schema.

| Table | Purpose | Key fields | Relationships |
|---|---|---|---|
| `admin_users` | Super Admin & Event Admin accounts | id, email, password_hash, role | has many `event_admins` |
| `admin_sessions` | Server-side admin session tokens | id, admin_user_id, token_hash, expires_at | belongs to `admin_users` |
| `events` | One row per event | id, slug, name, description, date, location, theme, status | has many photos/videos/guestbook/admins |
| `event_admins` | Which admins can manage which events | event_id, admin_user_id | joins `events` ↔ `admin_users` |
| `guests` | Guest identities scoped to an event | id, event_id, display_name, created_at | has many `guest_sessions`, photos, videos, guestbook rows |
| `guest_sessions` | Guest session tokens (once issued server-side) | id, guest_id, token_hash, expires_at | belongs to `guests` |
| `photos` | Photo metadata | id, event_id, guest_id, drive_file_id, caption, status, featured, created_at | belongs to `events`, `guests` |
| `videos` | Video metadata | id, event_id, guest_id, drive_file_id, duration, status, created_at | belongs to `events`, `guests` |
| `guestbook` | Written messages | id, event_id, guest_id, message, status, created_at | belongs to `events`, `guests` |
| `photo_strips` | Generated strip configs + optional gallery photo id | id, event_id, guest_id, template_id, config_json, added_to_gallery | belongs to `events`, `guests` |
| `activity_logs` | Audit trail for admin + moderation actions | id, actor_type, actor_id, action, target_type, target_id, created_at | polymorphic |
| `system_settings` | Platform-level config (Super Admin only) | key, value | none |
| `event_storage_usage` | Cached Drive usage per event | event_id, bytes_used, updated_at | belongs to `events` |

```
admin_users ──< event_admins >── events ──< photos
     │                              │    ──< videos
     └──< admin_sessions            │    ──< guestbook
                                     │    ──< photo_strips
                                     └──< event_storage_usage

guests ──< guest_sessions
guests ──< photos / videos / guestbook / photo_strips (guest_id)
```

## 9. Event System

Multi-event by design: every event is a row in `events` (planned) with its
own slug, branding, feature toggles, privacy settings, upload limits,
moderation setting, Drive folder reference, and status.

Planned event statuses:

```
draft      — being configured, not yet visible to guests
active     — live, guests can access it via slug/QR
archived   — read-only, kept for posterity
disabled   — hidden entirely, e.g. after an incident
```

Today, the frontend has exactly one event wired up (`rcy-training-2026`)
via `js/mockData.js`, with its settings editable through `admin/settings.html`
(stored in `localStorage`, not a database).

## 10. Guest Experience

```
Scan QR
   ↓
Event Welcome Screen   (index.html)
   ↓
Enter Name             (no registration, no password)
   ↓
Guest Session          (name + guestId in localStorage)
   ↓
Gallery                (gallery.html)
   ↓
Choose: Photos · Videos · Guestbook · Photo Strip (optional)
```

No account creation exists anywhere in this flow, by design.

## 11. Photo & Video System

Planned production flow:

```
Guest
 ↓
Frontend (FormData)
 ↓
PHP API — validate guest, event, file type, file size
 ↓
Upload to Google Drive
 ↓
Store metadata + Drive file id in MySQL
 ↓
Gallery reflects the new item
```

**Today**, `uploadMedia()` in `js/api.js` reads the file as a base64 data
URL purely so the browser can preview and "store" it in `localStorage` —
this is explicitly a prototype-only shortcut. Production uploads must not
use base64; see `App.api.buildUploadFormData()` in `js/api.js`, which
already builds the real multipart `FormData` shape (`caption`, `guest_id`,
`files[]`) that the production version of `uploadMedia()` should send
instead.

The frontend is written to support three derivative URLs per item —
`thumbnail_url`, `medium_url`, `original_url` — so the gallery grid, the
lightbox, and downloads can each load an appropriately-sized image instead
of always fetching the original. Mock data currently points all three at
the same source image since no thumbnailing pipeline exists yet.

## 12. Google Drive Storage

Planned folder structure:

```
Shared Event Gallery/
│
├── RCY Training 2026/
│   ├── Photos/
│   ├── Videos/
│   ├── Photo Strips/
│   └── Assets/
│
├── Graduation 2026/
│   ├── Photos/
│   ├── Videos/
│   ├── Photo Strips/
│   └── Assets/
```

MySQL stores each file's Drive file id and metadata — never the file bytes
themselves. Google service account credentials must live in server-side
environment variables only (see Section 20); they must never be stored in
MySQL, committed to the repo, or referenced from any frontend file. The
frontend never talks to Google Drive directly — see Section 17.

## 13. Guestbook

Fields (planned schema, already reflected in the frontend's data shape):
guest name, message, event id, moderation status, created timestamp.

Planned statuses: `pending`, `approved`, `hidden`, `deleted`. Today the
frontend only distinguishes `hidden` vs. not — there's no moderation queue
yet since there's no `moderation_enabled` concept wired to anything
server-side (see Section 16).

The guestbook page today has explicit states for: empty ("No messages yet"),
loading (skeleton), submitting ("Posting…"), success (toast + new card),
and error ("We couldn't load the guestbook" / "Couldn't post your message"
with retry).

## 14. Optional Photo Strip

Deliberately a bonus feature — one secondary button in the gallery
(`📷 Create Photo Strip`), never a required step.

```
Gallery
 ↓
Create Photo Strip
 ↓
Step 1 — Choose 3–4 photos (tap a selected photo to swap it)
 ↓
Step 2 — Choose a template (Classic · Minimal · Event Branded · Playful)
 ↓
Step 3 — Customize (logo, event name, custom text, background, stickers)
 ↓
Step 4 — Preview
 ↓
Download Photo Strip · Share · Add to Event Gallery   (each independent)
```

The guest is never forced to publish the strip: Download and Share don't
touch the gallery at all, and "Add to Event Gallery" is its own explicit
button, not a checkbox bundled into a "Done" action.

The strip currently renders as live HTML/CSS
(`App.components.photoStripFrame`), which is what makes the customize step
interactive without needing a canvas. There's no rasterized image to
actually download yet — `exportStripAsImage()` in `js/pages/photostrip.js`
is the marked hook for a future Canvas API implementation (draw each photo
+ text + background onto a `<canvas>`, then `canvas.toBlob()`); the rest of
the flow needs no changes once that lands.

The film-perforation edge motif (`.perf-edge` in `css/styles.css`) is used
**only** here, matching the design system's intent that this signature
visual detail stays exclusive to the photobooth feature.

### Future camera / photobooth mode

Not implemented. `js/api.js` reserves the shape of it so it can be added
without restructuring the builder:

```javascript
openCamera()       // throws "not implemented" today
capturePhoto()
captureSequence(count = 3)
```

The intended flow once built: open camera → countdown → capture → repeat →
feed the captured images into the existing Step 1 photo selection.

## 15. Feature Toggles

```json
{
  "photos": true,
  "videos": true,
  "guestbook": true,
  "photostrip": true
}
```

(In code these are `photoUploadsEnabled`, `videoUploadsEnabled`,
`guestbookEnabled`, `photoStripEnabled` on `event.settings`.)

The frontend already respects these:
- `guestbookEnabled: false` removes the Guestbook tab from the bottom nav
  and desktop tabs, and replaces `guestbook.html`'s content with a calm
  "Guestbook is off for this event" state instead of a composer that would
  just fail.
- `photoStripEnabled: false` removes the "Create Photo Strip" button and
  the "More" sheet entry, and `photostrip.html` itself shows a disabled
  state with a way back to the gallery if visited directly.
- `videoUploadsEnabled: false` removes the "Videos" filter chip from the
  gallery.
- `photoUploadsEnabled` / `videoUploadsEnabled` narrow the upload modal's
  `accept` attribute and its hint copy.

These are enforced client-side only right now — see Section 19 for why that
is explicitly **not** sufficient on its own.

## 16. Moderation

Planned `moderation_enabled` behavior:

```
If disabled:
Upload → Approved → Gallery

If enabled:
Upload → Pending → Admin review → Approved / Hidden / Deleted
```

**Today**, every upload is immediately visible (no pending queue exists),
and admin moderation is limited to Feature / Hide / Delete after the fact,
via `admin/gallery.html` and `admin/guestbook.html`. Building a real
pending-queue moderation mode is planned backend work.

## 17. API

### Implemented

None. There is no server, so there are no live endpoints. What exists is
the **frontend contract** for them, described below.

### Planned

```
POST   /api/admin/login
POST   /api/admin/logout

GET    /api/events
POST   /api/events
GET    /api/events/{id}
GET    /api/events/slug/{slug}
PATCH  /api/events/{id}
DELETE /api/events/{id}

GET    /api/events/{id}/admins
POST   /api/events/{id}/admins
DELETE /api/events/{id}/admins/{adminId}

GET    /api/admins
POST   /api/admins
GET    /api/admins/{id}
PATCH  /api/admins/{id}
DELETE /api/admins/{id}

POST   /api/events/{id}/guests

GET    /api/events/{id}/photos
POST   /api/events/{id}/photos

GET    /api/events/{id}/videos
POST   /api/events/{id}/videos

GET    /api/events/{id}/guestbook
POST   /api/events/{id}/guestbook

POST   /api/events/{id}/photostrips

GET    /api/admin/events/{id}
PATCH  /api/admin/events/{id}
DELETE /api/admin/photos/{id}
PATCH  /api/admin/photos/{id}/feature
PATCH  /api/admin/photos/{id}/visibility
DELETE /api/admin/guestbook/{id}
```

Every one of these has a matching function in `js/api.js` today
(`getEvent`, `getPhotos`, `uploadMedia`, `submitGuestbookMessage`,
`createPhotoStrip`, `hidePhoto`, `featurePhoto`, `deletePhoto`,
`hideMessage`, `deleteMessage`, `updateEventSettings`, …), currently backed
by mock data + `localStorage` instead of a real request.

## 18. API Response Format

Planned shape, once the PHP API exists:

**Success**
```json
{
  "success": true,
  "data": {}
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission."
  }
}
```

Planned status code usage: `200` success, `201` created, `400` validation
error, `401` not authenticated, `403` authenticated but not authorized,
`404` not found, `422` semantically invalid input, `429` rate limited,
`500` unexpected server error. None of this is implemented yet — the
frontend's mock `App.api` functions currently just resolve or throw a
plain `Error`.

## 19. Security

Planned requirements for the PHP backend:

- PDO prepared statements for every query — no string-built SQL
- `password_hash()` / `password_verify()` for admin credentials
- Cryptographically random session tokens, stored hashed, never in plaintext
- Authorization middleware on every admin route, checking role + event
  assignment
- Input validation on every field, file-type and file-size validation on
  every upload
- Rate limiting on auth and upload endpoints
- Explicit CORS allow-list, not a wildcard
- Secrets only in environment variables, never in Git
- No credentials of any kind in frontend code
- API error messages that never leak internals (stack traces, query text)

**Explicitly documented because it's a common mistake:** hiding a button
in the UI when `photoStripEnabled` is `false` is a UX nicety, not a
security boundary. Every one of those toggles, and every admin action,
**must** be re-checked server-side once the backend exists — a guest who
edits `localStorage` or calls a future endpoint directly must still be
correctly rejected.

## 20. Environment Variables

Planned `.env.example` (not created yet — added alongside the backend):

```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=shared_event_gallery
DB_USERNAME=root
DB_PASSWORD=

CORS_ALLOWED_ORIGINS=http://localhost:5500
```

Google Drive variables (service account path, folder root id, etc.) will
be added to this file when Drive integration is implemented. No real
credentials are ever committed to this repository or written into this
README.

## 21. Installation

**Frontend (available today):**

```bash
# no dependencies, no build step
open index.html
# or serve it so relative paths behave like production:
npx serve .
```

**Backend (planned — not runnable yet):**

```bash
composer install
mysql -u root -p shared_event_gallery < backend/database/schema.sql
cp .env.example .env
# edit .env with local DB credentials
php -S localhost:8000 -t backend/public
```

These backend commands describe the intended setup once `backend/`,
`composer.json`, and the schema exist — they will not work against this
repository as it stands today.

## 22. Initial Super Admin

Planned: a CLI script that hashes a password server-side rather than ever
writing one in plaintext anywhere, e.g.

```bash
php backend/cli/create-admin.php
```

Not implemented — there is no admin auth system yet for this to seed.

## 23. Development

**Frontend work:** edit files directly under `js/components/` (reusable
render functions) or `js/pages/` (page controllers that wire components to
`App.api`). Never have a page or component read `window.MOCK_DB` or
`localStorage` directly — always go through `js/api.js`, so swapping in the
real backend later is a change in one file per function, not a hunt across
every page.

**Backend work (once started):** schema changes should ship as versioned
migrations, not hand edits to a shared `schema.sql`. API changes should
update Section 17 of this README in the same change.

**Testing changes locally:** since there's no build step, a hard refresh
after any JS edit is enough — there's no cache-busting or bundling to
worry about.

## 24. Testing

**Today:** the only checks that apply are frontend ones —
`node --check` on every file under `js/` to catch syntax errors, and manual
click-through of each guest and admin flow (see Section 28's checklist).

**Planned, once the backend exists:**
- PHP syntax checks (`php -l`) on every file
- Database connection check
- Admin login (valid + invalid credentials)
- Session expiration and revocation
- Super Admin can reach any event; Event Admin cannot reach unassigned ones
- Event CRUD (create, read, update, soft-delete)
- Event ↔ admin assignment, including rejecting a duplicate assignment
- Guest session issuance and expiry

How to run them once they exist: documented here when the test suite is
added, rather than guessed at now.

## 25. Frontend / Backend Integration

`js/api.js` is the *only* place the frontend is allowed to reach for data.
Pages and components call `App.api.getPhotos()`, never `window.MOCK_DB`
directly, and never touch `localStorage` except through `App.session`.

```
Frontend (pages/components)
    ↓
js/api.js         ← the only integration seam
    ↓
PHP REST API (planned)
    ↓
MySQL / Google Drive (planned)
```

This means turning on the real backend is, by design, a rewrite of the
function *bodies* inside `js/api.js` — swap `wait()` + `localStorage` for
`fetch()` calls — with no changes required in `js/components/` or
`js/pages/`.

## 26. Development Roadmap

- **Phase 1 — Backend foundation:** database schema, admin auth, RBAC,
  event CRUD
- **Phase 2 — Guest sessions:** server-issued guest tokens replacing the
  client-generated `guestId`
- **Phase 3 — Photo/video uploads:** real `FormData` endpoint, validation
- **Phase 4 — Google Drive integration:** upload pipeline, thumbnailing
- **Phase 5 — Gallery and Guestbook:** wire the existing frontend to real
  data instead of mock/localStorage
- **Phase 6 — Photo Strip:** persist configs server-side, Canvas-based
  image export
- **Phase 7 — QR code / event links:** server-generated, slug-aware URLs
- **Phase 8 — Security hardening:** rate limiting, audit logging, CORS lock-down
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
- [x] Basic accessibility pass: aria-labels on icon buttons, focus return on modal close, `prefers-reduced-motion` respected, alt text on media, Escape-to-close and Tab focus-trapping on all sheets/modals

**Frontend (admin):**
- [x] Dashboard with stat cards + recent activity feed
- [x] Gallery moderation: feature/hide/delete, search, filter by guest and media type, confirmation modal
- [x] Guestbook moderation: hide/delete, confirmation modal
- [x] Event settings: Event Information / Branding / Features / Privacy sections, primary+secondary theme colors, feature toggles
- [x] QR code page: real scannable QR, copy link, download, print
- [ ] Admin login screen
- [ ] Any actual access control

**Backend:**
- [ ] Database schema
- [ ] Admin authentication
- [ ] Admin sessions
- [ ] Role-based authorization
- [ ] Event CRUD
- [ ] Event Admin assignment
- [ ] Activity logging
- [ ] Guest sessions (server-issued)
- [ ] Guest uploads (real endpoint)
- [ ] Guestbook (real endpoint)
- [ ] Gallery (real endpoint)

**Storage:**
- [ ] Google Drive integration

**Photo Strip:**
- [ ] Backend integration (persisting configs, generating a real image)

**Production:**
- [ ] Security hardening
- [ ] Deployment

## 28. Changelog / Development Notes

## Changelog

### 0.3.0
- Admin Settings reorganized into the four documented sections: **Event
  Information**, **Branding** (now with separate primary/secondary color
  pickers), **Features**, and a new **Privacy** section with Private
  gallery, Guest uploads, and Moderation toggles (Moderation is saved but
  has no effect yet — there's no pending-review queue until the backend
  exists; the settings page says so explicitly rather than implying it works)
- Generic overlay handling (`App.ui.initOverlays`) now closes the currently
  open sheet/modal on <kbd>Escape</kbd> and traps <kbd>Tab</kbd> focus
  within it, covering the "More" sheet, Event Info modal, and Upload modal
  the same way the lightbox already did
- Fixed a focus-trap edge case where closing the upload modal via Escape
  could leave its file queue in a stale state on reopen — Escape now
  reuses the modal's own close handler instead of bypassing it

### 0.2.0
- Feature toggles now hide disabled nav items/CTAs across guest pages
  instead of only being read on the settings screen
- Upload modal reworked: per-file retry, "Uploading N memories…" /
  "shared! ❤️" / per-file error states, failed files no longer discard
  already-successful ones
- Lightbox: native `navigator.share()` with clipboard fallback, real
  download trigger, touch swipe navigation, minimal focus trap, aria labels
- Photo Strip: final step decoupled into three independent actions
  (Download / Share / Add to Event Gallery) so the guest is never forced to
  publish; added the `exportStripAsImage()` hook for a future Canvas export;
  step 1 supports swapping an individual photo by tapping it again
- Added `openCamera()` / `capturePhoto()` / `captureSequence()` stubs in
  `js/api.js` reserved for a future in-browser photobooth mode
- Added `App.api.buildUploadFormData()` documenting the real multipart
  request shape production uploads should use instead of base64
- Mock media records now carry `thumbUrl` / `mediumUrl` / `originalUrl`
  so the frontend is ready for real image derivatives
- Admin: added search + media-type filter to gallery moderation; replaced
  native `confirm()` with an in-system confirmation modal
  (`App.ui.confirm()`) on both gallery and guestbook moderation
- Admin dashboard: added a grouped "recent activity" feed alongside the
  existing latest-messages panel
- Guestbook and gallery pages gained explicit network-error states with a
  retry button; gallery empty state now includes a "Share Memory" button
- Guest session (`App.session`) now tracks a `guestId` alongside the name,
  with a reserved slot for a server-issued `sessionToken`

### 0.1.0
- Initial frontend prototype: welcome screen, gallery, guestbook, photo
  strip builder, admin dashboard/gallery/guestbook/settings/QR pages, mock
  data layer, and the `js/api.js` contract these are built against

Future changes — especially anything that starts the backend — should be
added here, and Section 27 above updated in the same change so this
document never drifts from what's actually implemented.
