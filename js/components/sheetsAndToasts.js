App.components = App.components || {};
App.ui = App.ui || {};

/** "More" bottom sheet: Photo Strip, Event Info, Share event, Report a problem. */
App.components.moreSheet = function renderMoreSheet(event) {
  return `
  <div id="moreSheetBackdrop" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-ink-900/40 backdrop-fade" data-close-sheet></div>
    <div class="absolute bottom-0 inset-x-0 bg-cream rounded-t-3xl shadow-soft p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slideUp">
      <div class="w-10 h-1.5 bg-ink-200 rounded-full mx-auto mb-5"></div>
      <div class="space-y-1.5">
        ${event.settings?.photoStripEnabled !== false ? `
        <a href="photostrip.html?event=${event.slug}" class="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-sand transition-colors">
          <span class="w-11 h-11 rounded-2xl bg-gold-500/15 text-gold-600 grid place-items-center text-xl">\ud83d\udcf7</span>
          <span class="text-left">
            <span class="block font-semibold text-ink-900">Create Photo Strip</span>
            <span class="block text-[13px] text-ink-400">Optional \u2014 build a keepsake from your photos</span>
          </span>
        </a>` : ''}
        <button type="button" data-open="eventInfoModal" class="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-sand transition-colors text-left">
          <span class="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 grid place-items-center text-xl">\u2139\ufe0f</span>
          <span>
            <span class="block font-semibold text-ink-900">Event Info</span>
            <span class="block text-[13px] text-ink-400">Date, location & details</span>
          </span>
        </button>
        <button type="button" id="shareEventBtn" class="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-sand transition-colors text-left">
          <span class="w-11 h-11 rounded-2xl bg-sand text-ink-600 grid place-items-center text-xl">\ud83d\udd17</span>
          <span>
            <span class="block font-semibold text-ink-900">Share This Event</span>
            <span class="block text-[13px] text-ink-400">Invite someone with the private link</span>
          </span>
        </button>
        <button type="button" id="switchGuestBtn" class="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-sand transition-colors text-left">
          <span class="w-11 h-11 rounded-2xl bg-sand text-ink-600 grid place-items-center text-xl">\ud83d\udc64</span>
          <span>
            <span class="block font-semibold text-ink-900">Not <span id="moreSheetGuestName">you</span>?</span>
            <span class="block text-[13px] text-ink-400">Switch guest name on this device</span>
          </span>
        </button>
      </div>
      <button type="button" data-close-sheet class="w-full mt-4 py-3 rounded-2xl border border-ink-200 font-semibold text-ink-600">Close</button>
    </div>
  </div>`;
};

/** Event info modal — date, location, description, organizer. */
App.components.eventInfoModal = function renderEventInfoModal(event) {
  return `
  <div id="eventInfoModal" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-ink-900/40 backdrop-fade" data-close-modal="eventInfoModal"></div>
    <div class="absolute bottom-0 sm:inset-0 sm:m-auto inset-x-0 sm:max-w-md sm:h-fit bg-cream rounded-t-3xl sm:rounded-3xl shadow-soft p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slideUp sm:animate-pop">
      <div class="w-10 h-1.5 bg-ink-200 rounded-full mx-auto mb-5 sm:hidden"></div>
      <div class="flex items-start gap-3.5 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-primary-500 text-white grid place-items-center font-display font-semibold shrink-0">${event.logoInitials}</div>
        <div>
          <h3 class="font-display font-semibold text-xl text-ink-900 leading-tight">${event.name}</h3>
          <p class="text-[13px] text-ink-400">${event.organizer}</p>
        </div>
      </div>
      <p class="text-[15px] text-ink-600 leading-relaxed mb-5">${event.description}</p>
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl bg-sand grid place-items-center shrink-0">\ud83d\udcc5</span>
          <span class="text-ink-700"><span class="font-semibold">${event.dateLabel}</span> \u00b7 ${event.timeLabel}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl bg-sand grid place-items-center shrink-0">\ud83d\udccd</span>
          <span class="text-ink-700">${event.location}</span>
        </div>
      </div>
      <button type="button" data-close-modal="eventInfoModal" class="w-full mt-6 py-3 rounded-2xl bg-ink-900 text-white font-semibold">Close</button>
    </div>
  </div>`;
};

/** Toast notifications (upload success, message posted, link copied, etc.) */
App.ui.toast = function showToast(message, opts = {}) {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 flex flex-col items-center gap-2 pointer-events-none px-4 w-full';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'pointer-events-auto max-w-sm w-full sm:w-auto bg-ink-900 text-white text-[14px] font-medium px-4 py-3 rounded-2xl shadow-soft flex items-center gap-2 animate-rise';
  el.innerHTML = `<span>${opts.icon || '\u2713'}</span><span>${message}</span>`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, opts.duration || 2400);
};

/**
 * Promise-based confirmation modal for destructive admin actions — used in
 * place of the browser's native confirm() so the "This action cannot be
 * undone" messaging matches the rest of the UI.
 *   const ok = await App.ui.confirm('Delete this photo?', 'This action cannot be undone.');
 */
App.ui.confirm = function confirmDialog(title, detail, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.className = 'fixed inset-0 z-[70]';
    host.innerHTML = `
      <div class="absolute inset-0 bg-ink-900/50 backdrop-fade"></div>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"
           class="absolute inset-0 m-auto w-[calc(100%-2rem)] max-w-sm h-fit bg-cream rounded-3xl shadow-soft p-6 animate-pop">
        <p id="confirmTitle" class="font-display font-semibold text-lg text-ink-900 mb-1.5">${title}</p>
        <p class="text-[14px] text-ink-500 mb-6">${detail || ''}</p>
        <div class="flex items-center gap-2.5">
          <button type="button" data-confirm-cancel class="flex-1 py-2.5 rounded-2xl border border-ink-200 font-semibold text-ink-600">Cancel</button>
          <button type="button" data-confirm-ok class="flex-1 py-2.5 rounded-2xl bg-primary-500 text-white font-semibold">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';
    function finish(result) { host.remove(); document.body.style.overflow = ''; resolve(result); }
    host.querySelector('[data-confirm-cancel]').addEventListener('click', () => finish(false));
    host.querySelector('[data-confirm-ok]').addEventListener('click', () => finish(true));
    host.querySelector('[data-confirm-ok]').focus();
    host.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); });
  });
};

/** Wires up generic [data-open]/[data-close-modal]/[data-close-sheet] handlers,
 *  plus Escape-to-close and a lightweight focus trap for whichever overlay
 *  is currently open. Call once per page. */
App.ui.initOverlays = function initOverlays() {
  let lastFocused = null;

  function currentOverlay() {
    return [document.getElementById('moreSheetBackdrop'), document.getElementById('eventInfoModal'), document.getElementById('uploadModalBackdrop')]
      .find((el) => el && !el.classList.contains('hidden')) || null;
  }
  function focusFirstIn(container) {
    const focusable = container?.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    focusable && focusable[0] && focusable[0].focus();
  }
  function closeOverlay(el) {
    if (!el) return;
    // The upload modal owns extra state (queued files, caption) that must be
    // reset on close — reuse its own close button so that logic still runs
    // instead of just toggling the class here.
    if (el.id === 'uploadModalBackdrop') {
      el.querySelector('[data-close-upload]')?.click();
      return;
    }
    el.classList.add('hidden');
    document.body.style.overflow = '';
    lastFocused && lastFocused.focus();
  }

  document.addEventListener('click', (e) => {
    const openId = e.target.closest('[data-open]')?.dataset.open;
    if (openId) {
      lastFocused = e.target;
      const panel = document.getElementById(openId);
      panel?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      focusFirstIn(panel);
    }

    if (e.target.closest('[data-close-sheet]')) closeOverlay(document.getElementById('moreSheetBackdrop'));

    const closeId = e.target.closest('[data-close-modal]')?.dataset.closeModal;
    if (closeId) closeOverlay(document.getElementById(closeId));

    if (e.target.closest('[data-nav="more"]')) {
      e.preventDefault();
      lastFocused = e.target;
      const sheet = document.getElementById('moreSheetBackdrop');
      sheet?.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      focusFirstIn(sheet);
    }
  });

  document.addEventListener('keydown', (e) => {
    const overlay = currentOverlay();
    if (!overlay) return;
    if (e.key === 'Escape') { closeOverlay(overlay); return; }
    if (e.key === 'Tab') {
      const focusable = [...overlay.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
};
