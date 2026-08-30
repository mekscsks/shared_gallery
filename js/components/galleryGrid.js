App.components = App.components || {};

function timeAgo(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Single masonry tile — photo or video, tap/hover reveals uploader + caption. */
App.components.mediaCard = function renderMediaCard(item, index) {
  const isVideo = item.type === 'video';
  const dateLabel = new Date(item.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `
  <button type="button" data-open-lightbox="${index}"
    aria-label="${isVideo ? 'Video' : 'Photo'} by ${item.uploaderName}${item.caption ? `: ${item.caption}` : ''}. Opens fullscreen viewer."
    class="group relative w-full rounded-2xl overflow-hidden bg-sand shadow-soft block text-left animate-rise focus:outline-none">
    ${isVideo && !item.thumbUrl
      ? `<div class="w-full bg-ink-900 flex items-center justify-center" style="aspect-ratio:${item.aspect || 0.5625}"><svg width="32" height="32" viewBox="0 0 24 24" fill="white" opacity="0.4"><path d="M8 5v14l11-7Z"/></svg></div>`
      : `<img src="${item.thumbUrl}" alt="${item.caption ? item.caption : 'Event memory shared by ' + item.uploaderName}" loading="lazy" style="aspect-ratio:${item.aspect || 1}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" onerror="this.closest('[data-open-lightbox]').classList.add('shimmer'); this.style.opacity='0'" />`
    }
    ${item.featured ? `<span class="absolute top-2.5 left-2.5 text-[10px] font-bold tracking-wide uppercase bg-gold-500 text-white px-2 py-1 rounded-full shadow-soft">Featured</span>` : ''}
    ${isVideo ? `
      <span class="absolute inset-0 bg-ink-900/10 flex items-center justify-center" aria-hidden="true">
        <span class="w-11 h-11 rounded-full bg-white/85 grid place-items-center shadow-soft">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1310"><path d="M8 5v14l11-7Z"/></svg>
        </span>
      </span>
      <span class="absolute bottom-2 right-2 text-[11px] font-semibold text-white bg-ink-900/60 px-1.5 py-0.5 rounded-md">${item.durationLabel}</span>
    ` : ''}
    <span class="absolute inset-x-0 bottom-0 p-2.5 pt-8 bg-gradient-to-t from-ink-900/75 to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <span class="block text-white/70 text-[10px] uppercase tracking-wide">Uploaded by</span>
      <span class="block text-white text-[12px] font-semibold truncate">${item.uploaderName} \u00b7 ${dateLabel}</span>
    </span>
  </button>`;
};

App.components.mediaGridSkeleton = function renderSkeleton(count = 8) {
  const heights = [220, 280, 180, 320, 240, 200, 300, 260];
  return Array.from({ length: count }).map((_, i) => `
    <div class="w-full rounded-2xl shimmer" style="height:${heights[i % heights.length]}px"></div>`).join('');
};

App.components.mediaGrid = function renderMediaGrid(items) {
  if (!items.length) {
    return `
    <div class="text-center py-16 px-6">
      <div class="w-16 h-16 mx-auto rounded-full bg-sand grid place-items-center text-2xl mb-4">\ud83d\udcf8</div>
      <p class="font-display font-semibold text-lg text-ink-800">No memories yet</p>
      <p class="text-ink-400 text-sm mt-1 mb-5">Be the first to share a photo or video from today \u2764\ufe0f</p>
      <button type="button" id="emptyStateShareBtn" class="py-2.5 px-5 rounded-full bg-primary-500 text-white font-semibold text-sm">Share Memory</button>
    </div>`;
  }
  return `<div class="masonry">${items.map((item, i) => App.components.mediaCard(item, i)).join('')}</div>`;
};

/** Wires the empty state's "Share Memory" button, if present, to open the upload modal. */
App.components.wireEmptyStateShareButton = function wireEmptyStateShareButton() {
  document.getElementById('emptyStateShareBtn')?.addEventListener('click', () => document.getElementById('shareMemoryBtn')?.click());
};

/** Fullscreen lightbox with prev/next, caption, download & share. State lives on window.__lightboxItems. */
App.components.lightboxShell = function renderLightboxShell() {
  return `
  <div id="lightbox" class="fixed inset-0 z-50 hidden bg-ink-900" role="dialog" aria-modal="true" aria-label="Photo viewer">
    <div class="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-ink-900/70 to-transparent">
      <button type="button" id="lightboxClose" aria-label="Close viewer" class="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center backdrop-blur">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <div class="flex items-center gap-2">
        <button type="button" id="lightboxDownload" aria-label="Download" class="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center backdrop-blur">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v13m0 0-4-4m4 4 4-4M5 21h14"/></svg>
        </button>
        <button type="button" id="lightboxShare" aria-label="Share" class="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center backdrop-blur">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8 15.8 7M8.2 13.2l7.6 3.8"/></svg>
        </button>
        <button type="button" id="lightboxReport" aria-label="Report this photo" class="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center backdrop-blur">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.5A1.6 1.6 0 0 0 4 20h16a1.6 1.6 0 0 0 1.4-2.5L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z"/></svg>
        </button>
      </div>
    </div>

    <div id="lightboxSwipeArea" class="w-full h-full flex items-center justify-center px-2 touch-pan-y">
      <img id="lightboxImage" src="" alt="" class="max-h-[78vh] max-w-full object-contain rounded-lg animate-pop select-none" draggable="false" />
    </div>

    <button type="button" id="lightboxPrev" aria-label="Previous" class="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white place-items-center backdrop-blur">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 6-6 6 6 6"/></svg>
    </button>
    <button type="button" id="lightboxNext" aria-label="Next" class="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white place-items-center backdrop-blur">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 6 6 6-6 6"/></svg>
    </button>

    <p class="sm:hidden absolute top-16 inset-x-0 text-center text-white/40 text-[11px]" aria-hidden="true">Swipe to browse</p>

    <div class="absolute bottom-0 inset-x-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-ink-900/85 to-transparent">
      <div class="flex items-center justify-between gap-3">
        <button type="button" id="lightboxPrevMobile" aria-label="Previous" class="sm:hidden w-9 h-9 rounded-full bg-white/10 text-white grid place-items-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 6-6 6 6 6"/></svg>
        </button>
        <div class="min-w-0">
          <p id="lightboxCaption" class="text-white text-[15px] leading-snug truncate"></p>
          <p class="text-white/60 text-[12px] mt-0.5"><span id="lightboxUploader"></span> \u00b7 <span id="lightboxDate"></span></p>
        </div>
        <button type="button" id="lightboxNextMobile" aria-label="Next" class="sm:hidden w-9 h-9 rounded-full bg-white/10 text-white grid place-items-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      </div>
    </div>
  </div>`;
};

/** Behaviour wiring for the lightbox. items = full array, call after both are in the DOM. */
App.components.initLightbox = function initLightbox(items) {
  let idx = 0;
  const el = document.getElementById('lightbox');
  if (!el) return;
  const img = document.getElementById('lightboxImage');
  const caption = document.getElementById('lightboxCaption');
  const uploader = document.getElementById('lightboxUploader');
  const date = document.getElementById('lightboxDate');

  let lastFocused = null;

  function render() {
    const item = items[idx];
    if (!item) return;
    const isVid = item.type === 'video';
    let videoEl = document.getElementById('lightboxVideo');
    if (isVid) {
      img.classList.add('hidden');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.id = 'lightboxVideo';
        videoEl.controls = true;
        videoEl.className = 'max-h-[78vh] max-w-full rounded-lg animate-pop';
        img.parentNode.insertBefore(videoEl, img);
      }
      videoEl.src = item.originalUrl || item.url;
      videoEl.classList.remove('hidden');
    } else {
      if (videoEl) { videoEl.pause(); videoEl.classList.add('hidden'); }
      img.classList.remove('hidden');
      img.src = item.mediumUrl || item.url;
      img.alt = item.caption || 'Event memory shared by ' + item.uploaderName;
    }
    caption.textContent = item.caption || 'No caption';
    uploader.textContent = `Photo by ${item.uploaderName}`;
    date.textContent = timeAgo(item.uploadedAt);
  }
  function open(i) {
    idx = i; render();
    lastFocused = document.activeElement;
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  }
  function close() {
    el.classList.add('hidden');
    document.body.style.overflow = '';
    lastFocused && lastFocused.focus();
  }
  function next() { idx = (idx + 1) % items.length; render(); }
  function prev() { idx = (idx - 1 + items.length) % items.length; render(); }

  document.querySelectorAll('[data-open-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => open(Number(btn.dataset.openLightbox)));
  });
  document.getElementById('lightboxClose').addEventListener('click', close);
  ['lightboxNext', 'lightboxNextMobile'].forEach((id) => document.getElementById(id).addEventListener('click', next));
  ['lightboxPrev', 'lightboxPrevMobile'].forEach((id) => document.getElementById(id).addEventListener('click', prev));

  document.getElementById('lightboxDownload').addEventListener('click', () => {
    const item = items[idx];
    const a = document.createElement('a');
    a.href = item.originalUrl || item.url;
    a.download = `memory-${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a); a.click(); a.remove();
    App.ui.toast('Preparing download\u2026', { icon: '\u2b07\ufe0f' });
  });

  document.getElementById('lightboxShare').addEventListener('click', async () => {
    const item = items[idx];
    // Native share sheet where supported (mobile Safari/Chrome); falls back
    // to a clipboard copy so desktop browsers without navigator.share still work.
    if (navigator.share) {
      try { await navigator.share({ title: 'Event memory', text: item.caption || 'Check out this memory', url: item.originalUrl || window.location.href }); }
      catch (e) { /* user cancelled the share sheet — no error toast needed */ }
    } else {
      App.ui.toast('Share link copied', { icon: '\ud83d\udd17' });
    }
  });

  document.getElementById('lightboxReport').addEventListener('click', async () => {
    await App.api.reportPhoto(null, items[idx]?.id, 'reported_from_lightbox');
    App.ui.toast('Thanks \u2014 we\u2019ll take a look', { icon: '\ud83d\udea9' });
  });

  document.addEventListener('keydown', (e) => {
    if (el.classList.contains('hidden')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    // Minimal focus trap: keep Tab cycling within the viewer's controls.
    if (e.key === 'Tab') {
      const focusable = el.querySelectorAll('button');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Touch swipe navigation for mobile.
  const swipeArea = document.getElementById('lightboxSwipeArea');
  let touchStartX = null;
  swipeArea.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  swipeArea.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });
};
