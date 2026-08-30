App.components = App.components || {};

/** Compact sticky header used on Gallery / Guestbook / Photo Strip pages. */
App.components.header = function renderHeader(event, activeTab) {
  return `
  <header class="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-ink-100">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-primary-500 text-white grid place-items-center font-display font-semibold text-xs shrink-0">
        ${event.logoInitials}
      </div>
      <div class="min-w-0">
        <p class="font-display font-semibold text-ink-900 leading-tight truncate">${event.name}</p>
        <p class="text-[11px] text-ink-400 -mt-0.5">Private event gallery</p>
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <span class="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11Z"/></svg>
          Guests only
        </span>
      </div>
    </div>
  </header>`;
};

/** Full hero used on the welcome screen. */
App.components.eventHero = function renderEventHero(event) {
  return `
  <div class="relative">
    <div class="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
      <img src="${event.heroImage}" alt="" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-ink-900/10"></div>
      <div class="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11Z"/></svg>
          Private event
        </span>
        <span class="text-[11px] font-semibold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">${event.dateLabel}</span>
      </div>
      <div class="absolute bottom-5 left-5 right-5 text-white">
        <div class="w-11 h-11 rounded-2xl bg-white text-primary-600 grid place-items-center font-display font-bold shadow-soft mb-3">
          ${event.logoInitials}
        </div>
        <h1 class="font-display font-semibold text-3xl sm:text-4xl leading-[1.05] drop-shadow-sm">${event.name}</h1>
        <p class="mt-1.5 text-white/90 text-[15px] max-w-sm">${event.tagline}</p>
      </div>
    </div>
  </div>`;
};
