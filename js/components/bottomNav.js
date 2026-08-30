App.components = App.components || {};

/**
 * Mobile-first bottom nav: Memories | Guestbook | More.
 * "More" opens a bottom sheet (Photo Strip, Event Info, Share, Report)
 * so guests are never shown more than three choices at once.
 */
App.components.bottomNav = function renderBottomNav(active, settings = {}) {
  const item = (id, label, iconSvg, href) => `
    <a href="${href}" data-nav="${id}" aria-label="${label}" aria-current="${active === id ? 'page' : 'false'}"
       class="flex flex-col items-center justify-center gap-1 flex-1 py-2.5 rounded-2xl transition-colors
              ${active === id ? 'text-primary-600' : 'text-ink-400 hover:text-ink-600'}">
      <span class="${active === id ? 'bg-primary-50' : ''} w-11 h-8 grid place-items-center rounded-full transition-colors">${iconSvg}</span>
      <span class="text-[11px] font-semibold">${label}</span>
    </a>`;

  const items = [item('gallery', 'Memories', `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m3 15 5-5 4 4 5-6 4 5"/></svg>`, 'gallery.html')];
  if (settings.guestbookEnabled !== false) {
    items.push(item('guestbook', 'Guestbook', `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v13H7l-3 3V4Z"/></svg>`, 'guestbook.html'));
  }
  items.push(item('more', 'More', `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`, '#'));

  return `
  <nav aria-label="Primary" class="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-cream/95 backdrop-blur border-t border-ink-100 pb-[env(safe-area-inset-bottom)]">
    <div class="max-w-5xl mx-auto px-2 flex items-stretch">${items.join('')}</div>
  </nav>`;
};

/** Floating "Share a Memory" CTA — stays reachable while scrolling the gallery. */
App.components.shareMemoryButton = function renderShareMemoryButton() {
  return `
  <button id="shareMemoryBtn" type="button"
    class="fixed z-30 right-4 bottom-20 sm:bottom-8 inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600
           text-white font-semibold pl-4 pr-5 py-3.5 rounded-full shadow-lift active:scale-95 transition-all">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    <span class="text-[15px]">Share Memory</span>
  </button>`;
};

/** Desktop top-tab variant (Memories / Videos filter / Guestbook / More) for wider screens. */
App.components.desktopTabs = function renderDesktopTabs(active, settings = {}) {
  const tab = (id, label, href) => `
    <a href="${href}" aria-current="${active === id ? 'page' : 'false'}" class="px-4 py-2 rounded-full text-sm font-semibold transition-colors
      ${active === id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-sand'}">${label}</a>`;
  const tabs = [tab('gallery', 'Memories', 'gallery.html')];
  if (settings.guestbookEnabled !== false) tabs.push(tab('guestbook', 'Guestbook', 'guestbook.html'));
  if (settings.photoStripEnabled !== false) tabs.push(tab('photostrip', 'Photo Strip', 'photostrip.html'));
  return `<div class="hidden sm:flex items-center gap-1.5 bg-white border border-ink-100 rounded-full p-1.5 shadow-soft w-fit">${tabs.join('')}</div>`;
};
