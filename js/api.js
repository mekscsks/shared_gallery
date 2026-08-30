/**
 * API layer.
 *
 * Every function here mirrors a future REST call:
 *   getEvent(slug)            -> GET  /api/events/{slug}
 *   getPhotos(eventId)        -> GET  /api/events/{id}/photos
 *   getVideos(eventId)        -> GET  /api/events/{id}/videos
 *   getGuestbookMessages(id)  -> GET  /api/events/{id}/guestbook
 *   uploadMedia(id, payload)  -> POST /api/events/{id}/photos | /videos
 *   submitGuestbookMessage()  -> POST /api/events/{id}/guestbook
 *   createPhotoStrip(id, cfg) -> POST /api/events/{id}/photostrips
 *
 * Today they read/write window.MOCK_DB plus a thin localStorage layer
 * (so uploads/messages added during this session persist on refresh).
 * Swapping to a real backend later means rewriting the bodies of these
 * functions only — no page ever talks to MOCK_DB or localStorage directly.
 */
window.App = window.App || {};

App.api = (function () {
  const LATENCY = 450;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  // Base URL for the PHP backend. Change this to your production URL when deploying.
  const API_BASE = 'http://localhost:8000';

  /**
   * Thin fetch wrapper — always sends/receives JSON, attaches the admin or
   * guest bearer token if one is stored, and throws a plain Error with the
   * server's error message on non-2xx responses.
   */
  function _resolveToken(path) {
    const isAdminPath = /^\/api\/(admin|super)\//.test(path);
    if (isAdminPath) {
      return localStorage.getItem('rcy_gallery__admin_token') || '';
    }
    return (typeof App.session !== 'undefined')
      ? (App.session.getSessionToken() || '')
      : '';
  }

  async function apiFetch(path, options = {}) {
    const token = _resolveToken(path);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, { ...options, headers });
    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401 && window.location.pathname.includes('/admin/')) {
        localStorage.removeItem('rcy_gallery__admin_token');
        localStorage.removeItem('rcy_gallery__admin_expires');
        localStorage.removeItem('rcy_gallery__admin_role');
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        window.location.replace(depth >= 3 ? '../login.html' : 'login.html');
        return;
      }
      const msg = json?.error?.message || json?.error?.code || 'Request failed';
      const err = new Error(msg);
      err.code = json?.error?.code || 'API_ERROR';
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  function sessionKey(eventSlug, name) { return `rcy_gallery__${eventSlug}__${name}`; }

  function loadLocal(eventSlug, name, fallback) {
    try {
      const raw = localStorage.getItem(sessionKey(eventSlug, name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveLocal(eventSlug, name, value) {
    try { localStorage.setItem(sessionKey(eventSlug, name), JSON.stringify(value)); } catch (e) {}
  }

  function currentSlug() {
    return App.session.getEventSlug() || window.MOCK_DB.event.slug;
  }

  async function getEvent(slug) {
    return apiFetch(`/api/events/slug/${encodeURIComponent(slug)}`);
  }

  async function getPhotos(eventId) {
    return apiFetch(`/api/events/${eventId}/photos`);
  }

  async function getVideos(eventId) {
    return apiFetch(`/api/events/${eventId}/videos`);
  }

  async function getAllMedia(eventId) {
    const [photos, videos] = await Promise.all([getPhotos(eventId), getVideos(eventId)]);
    return [...photos, ...videos].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  async function getGuestbookMessages(eventId) {
    return apiFetch(`/api/events/${eventId}/guestbook`);
  }

  /**
   * PRODUCTION PATH: sends a real multipart FormData request.
   * The prototype base64/localStorage path is replaced — files go to
   * POST /api/events/{id}/photos or /videos.
   */
  async function uploadMedia(eventId, { file, type, caption, guestId }) {
    const endpoint = type === 'video'
      ? `/api/events/${eventId}/videos`
      : `/api/events/${eventId}/photos`;

    const formData = new FormData();
    formData.append('files[]', file);
    if (caption) formData.append('caption', caption);
    if (guestId) formData.append('guest_id', guestId);

    const token = _resolveToken(endpoint);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + endpoint, { method: 'POST', headers, body: formData });
    const json = await res.json();

    if (!res.ok) {
      const msg = json?.error?.message || json?.error?.code || 'Upload failed';
      const err = new Error(msg);
      err.code = json?.error?.code || 'UPLOAD_FAILED';
      throw err;
    }
    // Server returns an array (one entry per file); we sent one file so return the first
    return Array.isArray(json.data) ? json.data[0] : json.data;
  }

  /**
   * PRODUCTION PATH (not called yet): shapes the exact multipart request
   * `uploadMedia()` should send once `POST /api/events/{id}/photos|videos`
   * exists. Kept here so the migration is a one-function swap.
   *
   *   const formData = App.api.buildUploadFormData(files, caption, guestId);
   *   await fetch(`/api/events/${eventId}/photos`, { method: 'POST', body: formData,
   *     headers: { Authorization: `Bearer ${guestSessionToken}` } });
   */
  function buildUploadFormData(files, caption, guestId) {
    const formData = new FormData();
    formData.append('caption', caption || '');
    formData.append('guest_id', guestId || '');
    files.forEach((file) => formData.append('files[]', file));
    return formData;
  }

  // --- Future browser-photobooth hooks (UI/API shape only — not implemented) ---
  // Kept here so a camera-based capture flow can be dropped in later without
  // touching the Photo Strip Builder's step structure or API contract.
  async function openCamera() { throw new Error('openCamera() is not implemented yet — reserved for the in-browser photobooth flow.'); }
  async function capturePhoto() { throw new Error('capturePhoto() is not implemented yet.'); }
  async function captureSequence(count = 3) { throw new Error('captureSequence() is not implemented yet.'); }

  async function uploadAsset(eventId, type, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const token = localStorage.getItem('rcy_gallery__admin_token') || '';
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(API_BASE + `/api/admin/events/${eventId}/assets`, { method: 'POST', headers, body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || 'Upload failed');
    return json.data;
  }

  async function submitGuestbookMessage(eventId, { message }) {
    return apiFetch(`/api/events/${eventId}/guestbook`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async function getPhotoStripTemplates() {
    await wait(150);
    return window.MOCK_DB.photoStripTemplates;
  }

  async function createPhotoStrip(eventId, config) {
    return apiFetch(`/api/events/${eventId}/photostrips`, {
      method: 'POST',
      body: JSON.stringify({
        template:     config.templateId,
        config:       { customText: config.customText, background: config.background, sticker: config.sticker },
        addToGallery: config.addToGallery ?? false,
      }),
    });
  }

  // --- Admin auth ---
  async function adminLogin(email, password) {
    const data = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('rcy_gallery__admin_token', data.token);
    localStorage.setItem('rcy_gallery__admin_expires', data.expires_at);
    localStorage.setItem('rcy_gallery__admin_role', data.admin.role);
    return data;
  }

  async function adminLogout() {
    await apiFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('rcy_gallery__admin_token');
    localStorage.removeItem('rcy_gallery__admin_expires');
    localStorage.removeItem('rcy_gallery__admin_role');
  }

  // --- Super Admin API ---
  async function superDashboard() {
    return apiFetch('/api/super/dashboard');
  }
  async function superListEvents(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/api/super/events' + (q ? '?' + q : ''));
  }
  async function superCreateEvent(data) {
    return apiFetch('/api/super/events', { method: 'POST', body: JSON.stringify(data) });
  }
  async function superGetEvent(id) {
    return apiFetch(`/api/super/events/${id}`);
  }
  async function superUpdateEvent(id, data) {
    return apiFetch(`/api/super/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async function superArchiveEvent(id) {
    return apiFetch(`/api/super/events/${id}`, { method: 'DELETE' });
  }
  async function superRestoreEvent(id) {
    return apiFetch(`/api/super/events/${id}/restore`, { method: 'PATCH' });
  }
  async function superListAdmins(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/api/super/admins' + (q ? '?' + q : ''));
  }
  async function superCreateAdmin(data) {
    return apiFetch('/api/super/admins', { method: 'POST', body: JSON.stringify(data) });
  }
  async function superGetAdmin(id) {
    return apiFetch(`/api/super/admins/${id}`);
  }
  async function superUpdateAdmin(id, data) {
    return apiFetch(`/api/super/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async function superDisableAdmin(id) {
    return apiFetch(`/api/super/admins/${id}/disable`, { method: 'PATCH' });
  }
  async function superEnableAdmin(id) {
    return apiFetch(`/api/super/admins/${id}/enable`, { method: 'PATCH' });
  }
  async function superResetPassword(id, password) {
    return apiFetch(`/api/super/admins/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
  }
  async function superListGuests(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/api/super/guests' + (q ? '?' + q : ''));
  }
  async function superListLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch('/api/super/logs' + (q ? '?' + q : ''));
  }
  async function superListSettings() {
    return apiFetch('/api/super/settings');
  }
  async function superUpdateSettings(data) {
    return apiFetch('/api/super/settings', { method: 'PATCH', body: JSON.stringify(data) });
  }
  async function superAssignAdmin(eventId, adminId) {
    return apiFetch(`/api/events/${eventId}/admins`, { method: 'POST', body: JSON.stringify({ admin_id: adminId }) });
  }
  async function superRemoveAdmin(eventId, adminId) {
    return apiFetch(`/api/events/${eventId}/admins/${adminId}`, { method: 'DELETE' });
  }
  async function superListEventAdmins(eventId) {
    return apiFetch(`/api/events/${eventId}/admins`);
  }

  // --- Admin moderation actions ---
  async function hidePhoto(eventId, photoId, hidden = true) {
    return apiFetch(`/api/admin/photos/${photoId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ hidden }),
    });
  }
  async function featurePhoto(eventId, photoId, featured = true) {
    return apiFetch(`/api/admin/photos/${photoId}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ featured }),
    });
  }
  async function deletePhoto(eventId, photoId) {
    return apiFetch(`/api/admin/photos/${photoId}`, { method: 'DELETE' });
  }
  async function hideMessage(eventId, msgId, hidden = true) {
    return apiFetch(`/api/admin/guestbook/${msgId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ hidden }),
    });
  }
  async function deleteMessage(eventId, msgId) {
    return apiFetch(`/api/admin/guestbook/${msgId}`, { method: 'DELETE' });
  }
  async function updateEventSettings(eventId, patch) {
    return apiFetch(`/api/admin/events/${eventId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
  async function reportPhoto(eventId, photoId, reason) {
    // Not a moderation endpoint — kept as a no-op stub until a report queue exists
    return { ok: true };
  }

  return {
    getEvent, getPhotos, getVideos, getAllMedia, getGuestbookMessages,
    uploadMedia, uploadAsset, buildUploadFormData, submitGuestbookMessage, getPhotoStripTemplates, createPhotoStrip,
    hidePhoto, featurePhoto, deletePhoto, hideMessage, deleteMessage,
    updateEventSettings, reportPhoto, openCamera, capturePhoto, captureSequence,
    adminLogin, adminLogout,
    superDashboard, superListEvents, superCreateEvent, superGetEvent, superUpdateEvent,
    superArchiveEvent, superRestoreEvent,
    superListAdmins, superCreateAdmin, superGetAdmin, superUpdateAdmin,
    superDisableAdmin, superEnableAdmin, superResetPassword,
    superListGuests, superListLogs, superListSettings, superUpdateSettings,
    superAssignAdmin, superRemoveAdmin, superListEventAdmins,
    // exposed so App.session can call it during guest registration
    _apiFetch: apiFetch,
  };
})();

/**
 * Guest session helpers. No accounts — a guest is just a name plus a
 * locally-generated guest_id, scoped to one event.
 *
 * This is intentionally NOT authentication. It's a convenience so a
 * returning guest on the same device doesn't retype their name. Once the
 * backend exists, `setGuestName()` should call `POST /api/events/{id}/guests`
 * and store the server-issued session token here instead of trusting the
 * client-generated id — see `getSessionToken()` below for the seam.
 */
App.session = (function () {
  function getEventSlug() {
    const match = window.location.pathname.match(/event\/([^/]+)/);
    if (match) return match[1];
    const params = new URLSearchParams(window.location.search);
    return params.get('event') || window.MOCK_DB.event.slug;
  }
  function storageKey(field) { return `rcy_gallery__${getEventSlug()}__${field}`; }

  function getGuestName()    { return localStorage.getItem(storageKey('guestName'))    || ''; }
  function getGuestId()      { return localStorage.getItem(storageKey('guestId'))      || ''; }
  function getSessionToken() { return localStorage.getItem(storageKey('sessionToken')) || ''; }
  function getAdminToken()   { return localStorage.getItem('rcy_gallery__admin_token') || ''; }

  // Server returns 'YYYY-MM-DD HH:mm:ss' in Asia/Manila (UTC+8).
  // Appending +08:00 ensures the browser parses it as Manila time
  // regardless of the browser's own local timezone.
  function parseServerExpiry(str) {
    return new Date(str.replace(' ', 'T') + '+08:00');
  }

  function loginUrl() {
    // Works from both /admin/ and /admin/super/
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    return depth >= 3 ? '../login.html' : 'login.html';
  }

  function requireAdminOrRedirect() {
    const token   = localStorage.getItem('rcy_gallery__admin_token');
    const expires = localStorage.getItem('rcy_gallery__admin_expires');
    if (!token || !expires) {
      window.location.replace(loginUrl());
      return;
    }
    const expiresDate = parseServerExpiry(expires);
    if (isNaN(expiresDate) || expiresDate <= new Date()) {
      localStorage.removeItem('rcy_gallery__admin_token');
      localStorage.removeItem('rcy_gallery__admin_expires');
      localStorage.removeItem('rcy_gallery__admin_role');
      window.location.replace(loginUrl());
    }
  }

  function requireSuperAdminOrRedirect() {
    const token   = localStorage.getItem('rcy_gallery__admin_token');
    const expires = localStorage.getItem('rcy_gallery__admin_expires');
    if (!token || !expires) { window.location.replace(loginUrl()); return; }
    const expiresDate = parseServerExpiry(expires);
    if (isNaN(expiresDate) || expiresDate <= new Date()) {
      localStorage.removeItem('rcy_gallery__admin_token');
      localStorage.removeItem('rcy_gallery__admin_expires');
      localStorage.removeItem('rcy_gallery__admin_role');
      window.location.replace(loginUrl());
      return;
    }
    const role = localStorage.getItem('rcy_gallery__admin_role');
    if (role !== 'super_admin') {
      window.location.replace(loginUrl());
    }
  }

  /**
   * Registers the guest with the real backend and stores the server-issued
   * token. Falls back to the old client-only path if the API is unreachable
   * so the prototype still works without a running server.
   */
  async function setGuestName(name) {
    localStorage.setItem(storageKey('guestName'), name);

    // Derive event id from the slug via the already-loaded event object if
    // available, otherwise fall back to the mock id so offline dev still works.
    const eventId = window.__currentEventId || window.MOCK_DB?.event?.id;

    try {
      const data = await App.api._apiFetch(`/api/events/${eventId}/guests`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      localStorage.setItem(storageKey('guestId'),      String(data.guest_id));
      localStorage.setItem(storageKey('sessionToken'), data.token);
    } catch (e) {
      // Backend unreachable — keep the client-generated id as a fallback
      if (!getGuestId()) {
        const id = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(storageKey('guestId'), id);
      }
    }
  }

  function clearGuestName() {
    localStorage.removeItem(storageKey('guestName'));
    localStorage.removeItem(storageKey('guestId'));
    localStorage.removeItem(storageKey('sessionToken'));
  }
  function requireGuestOrRedirect() {
    if (!getGuestName()) window.location.href = `index.html?event=${getEventSlug()}`;
  }
  return { getEventSlug, getGuestName, getGuestId, getSessionToken, getAdminToken, requireAdminOrRedirect, requireSuperAdminOrRedirect, setGuestName, clearGuestName, requireGuestOrRedirect };
})();
