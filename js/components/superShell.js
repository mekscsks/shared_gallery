App.components = App.components || {};

const SUPER_NAV = [
  { id: 'dashboard', label: 'Dashboard',  href: 'dashboard.html',  icon: `<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>` },
  { id: 'events',    label: 'Events',     href: 'events.html',     icon: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>` },
  { id: 'admins',    label: 'Admins',     href: 'admins.html',     icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>` },
  { id: 'guests',    label: 'Guests',     href: 'guests.html',     icon: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>` },
  { id: 'logs',      label: 'Logs',       href: 'logs.html',       icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>` },
  { id: 'settings',  label: 'Settings',   href: 'settings.html',   icon: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>` },
];

App.components.superShell = function renderSuperShell(activeId, title, subtitle) {
  const navLink = (item) => `
    <a href="${item.href}" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors
        ${activeId === item.id ? 'bg-white text-ink-900' : 'text-white/60 hover:text-white hover:bg-white/5'}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>
      ${item.label}
    </a>`;

  const html = `
  <div class="min-h-screen flex bg-sand">
    <aside class="hidden lg:flex lg:flex-col w-64 bg-ink-900 text-white shrink-0 p-5">
      <div class="flex items-center gap-2.5 mb-8 px-1">
        <div class="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center font-display font-bold text-sm">SA</div>
        <div class="min-w-0">
          <p class="font-display font-semibold leading-tight">Super Admin</p>
          <p class="text-[11px] text-white/40">Shared Event Gallery</p>
        </div>
      </div>
      <nav class="space-y-1">${SUPER_NAV.map(navLink).join('')}</nav>
      <div class="mt-auto">
        <button type="button" id="superLogoutBtn" class="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <header class="lg:hidden sticky top-0 z-30 bg-ink-900 text-white px-4 py-3.5 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary-500 grid place-items-center font-display font-bold text-xs">SA</div>
        <p class="font-display font-semibold text-sm">Super Admin</p>
        <button type="button" id="superLogoutBtnMobile" class="ml-auto text-[12px] font-semibold text-white/70">Sign out</button>
      </header>

      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-9 pb-24 lg:pb-9">
        <div class="mb-6">
          <h1 class="font-display font-semibold text-2xl sm:text-3xl text-ink-900">${title}</h1>
          ${subtitle ? `<p class="text-ink-400 text-sm mt-1">${subtitle}</p>` : ''}
        </div>
        <div id="superPageContent"></div>
      </main>

      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ink-900 text-white flex pb-[env(safe-area-inset-bottom)]">
        ${SUPER_NAV.map((item) => `
          <a href="${item.href}" class="flex-1 flex flex-col items-center gap-1 py-2.5 ${activeId === item.id ? 'text-white' : 'text-white/40'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>
            <span class="text-[10px] font-semibold">${item.label}</span>
          </a>`).join('')}
      </nav>
    </div>
  </div>`;

  setTimeout(() => {
    async function doLogout() {
      await App.api.adminLogout();
      window.location.replace('../login.html');
    }
    document.getElementById('superLogoutBtn')?.addEventListener('click', doLogout);
    document.getElementById('superLogoutBtnMobile')?.addEventListener('click', doLogout);
  }, 0);

  return html;
};
