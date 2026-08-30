(async function () {
  App.session.requireGuestOrRedirect();
  const guestName = App.session.getGuestName();
  const slug = App.session.getEventSlug();

  const event = await App.api.getEvent(slug);
  document.title = `Gallery — ${event.name}`;

  const settings = event.settings || {};

  document.getElementById('headerSlot').innerHTML = App.components.header(event, 'gallery');
  document.getElementById('bottomNavSlot').innerHTML = App.components.bottomNav('gallery', settings);
  document.getElementById('shareMemoryFabSlot').innerHTML = App.components.shareMemoryButton();
  document.getElementById('desktopTabsSlot').innerHTML = App.components.desktopTabs('gallery', settings);
  document.getElementById('uploadModalSlot').innerHTML = App.components.uploadModal(guestName, settings);
  document.getElementById('moreSheetSlot').innerHTML = App.components.moreSheet(event);
  document.getElementById('eventInfoModalSlot').innerHTML = App.components.eventInfoModal(event);
  document.getElementById('lightboxSlot').innerHTML = App.components.lightboxShell();
  document.getElementById('moreSheetGuestName').textContent = guestName;

  // Respect event feature toggles: hide the secondary CTA entirely if the
  // admin has turned the photo strip off for this event.
  if (settings.photoStripEnabled === false) {
    document.getElementById('photoStripCta')?.remove();
  }

  App.ui.initOverlays();

  const chips = [{ id: 'all', label: 'All' }, { id: 'photo', label: 'Photos' }];
  if (settings.videoUploadsEnabled !== false) chips.push({ id: 'video', label: 'Videos' });
  chips.push({ id: 'featured', label: '\u2b50 Featured' });
  let activeFilter = 'all';
  let allItems = [];

  function renderChips() {
    document.getElementById('filterChipsSlot').innerHTML = chips.map((c) => `
      <button type="button" data-filter="${c.id}"
        class="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border
          ${activeFilter === c.id ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-500 border-ink-200 hover:border-ink-400'}">
        ${c.label}
      </button>`).join('');
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => { activeFilter = btn.dataset.filter; renderChips(); renderGrid(); });
    });
  }

  function visibleItems() {
    const notHidden = allItems.filter((i) => !i.hidden);
    if (activeFilter === 'all') return notHidden;
    if (activeFilter === 'featured') return notHidden.filter((i) => i.featured);
    return notHidden.filter((i) => i.type === activeFilter);
  }

  function renderGrid() {
    const items = visibleItems();
    document.getElementById('galleryGridSlot').innerHTML = App.components.mediaGrid(items);
    App.components.initLightbox(items);
    App.components.wireEmptyStateShareButton();
  }

  async function loadAll() {
    document.getElementById('galleryGridSlot').innerHTML = `<div class="masonry">${App.components.mediaGridSkeleton()}</div>`;
    try {
      allItems = await App.api.getAllMedia(event.id);
      renderChips();
      renderGrid();
    } catch (e) {
      document.getElementById('galleryGridSlot').innerHTML = `
        <div class="text-center py-16 px-6">
          <div class="w-16 h-16 mx-auto rounded-full bg-primary-50 grid place-items-center text-2xl mb-4">\u26a0\ufe0f</div>
          <p class="font-display font-semibold text-lg text-ink-800">We couldn\u2019t load the memories</p>
          <p class="text-ink-400 text-sm mt-1 mb-5">Check your connection and try again.</p>
          <button type="button" id="retryLoadBtn" class="py-2.5 px-5 rounded-full bg-ink-900 text-white font-semibold text-sm">Try Again</button>
        </div>`;
      document.getElementById('retryLoadBtn').addEventListener('click', loadAll);
    }
  }

  App.components.initUploadModal({ eventId: event.id, guestName, onUploaded: loadAll });
  document.getElementById('shareMemoryInline').addEventListener('click', () => document.getElementById('shareMemoryBtn').click());

  document.getElementById('shareEventBtn')?.addEventListener('click', () => {
    App.ui.toast('Event link copied to clipboard', { icon: '\ud83d\udd17' });
  });
  document.getElementById('switchGuestBtn')?.addEventListener('click', () => {
    App.session.clearGuestName();
    window.location.href = `index.html?event=${slug}`;
  });

  await loadAll();
})();
