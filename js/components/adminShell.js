App.components = App.components || {};

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: `<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>` },
  { id: 'gallery',   label: 'Gallery',   href: 'gallery.html',   icon: `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 15 5-5 4 4 5-6 4 5"/>` },
  { id: 'guestbook', label: 'Guestbook', href: 'guestbook.html', icon: `<path d="M4 4h16v13H7l-3 3V4Z"/>` },
  { id: 'settings',  label: 'Settings',  href: 'settings.html',  icon: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>` },
  { id: 'qrcode',    label: 'QR Code',   href: 'qrcode.html',    icon: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/>` },
];

App.components.adminShell = function renderAdminShell(event, activeId, title, subtitle) {
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
        <div class="w-9 h-9 rounded-xl bg-primary-500 grid place-items-center font-display font-bold text-sm">${event.logoInitials}</div>
        <div class="min-w-0">
          <p class="font-display font-semibold leading-tight truncate">${event.name}</p>
          <p class="text-[11px] text-white/40">Admin console</p>
        </div>
      </div>
      <nav class="space-y-1">${ADMIN_NAV.map(navLink).join('')}</nav>
      <div class="mt-auto space-y-1">
        <a href="../gallery.html" class="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white/5 text-white/70 hover:text-white text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          View guest gallery
        </a>
        <button type="button" id="adminLogoutBtn" class="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <header class="lg:hidden sticky top-0 z-30 bg-ink-900 text-white px-4 py-3.5 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary-500 grid place-items-center font-display font-bold text-xs">${event.logoInitials}</div>
        <p class="font-display font-semibold text-sm">${event.name} · Admin</p>
        <button type="button" id="adminLogoutBtnMobile" class="ml-auto text-[12px] font-semibold text-white/70">Sign out</button>
      </header>

      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-9 pb-24 lg:pb-9">
        <div class="mb-6">
          <h1 class="font-display font-semibold text-2xl sm:text-3xl text-ink-900">${title}</h1>
          ${subtitle ? `<p class="text-ink-400 text-sm mt-1">${subtitle}</p>` : ''}
        </div>
        <div id="adminPageContent"></div>
      </main>

      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ink-900 text-white flex pb-[env(safe-area-inset-bottom)]">
        ${ADMIN_NAV.map((item) => `
          <a href="${item.href}" class="flex-1 flex flex-col items-center gap-1 py-2.5 ${activeId === item.id ? 'text-white' : 'text-white/40'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>
            <span class="text-[10px] font-semibold">${item.label}</span>
          </a>`).join('')}
      </nav>
    </div>
  </div>`;

  // Wire logout buttons after the caller inserts the HTML into the DOM
  setTimeout(() => {
    async function doLogout() {
      await App.api.adminLogout();
      window.location.replace('login.html');
    }
    document.getElementById('adminLogoutBtn')?.addEventListener('click', doLogout);
    document.getElementById('adminLogoutBtnMobile')?.addEventListener('click', doLogout);
  }, 0);

  return html;
};

App.components.statCard = function renderStatCard(label, value, icon, tint) {
  return `
  <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
    <div class="flex items-center justify-between mb-3">
      <span class="w-10 h-10 rounded-xl ${tint} grid place-items-center text-lg">${icon}</span>
    </div>
    <p class="font-display font-semibold text-2xl text-ink-900">${value}</p>
    <p class="text-[13px] text-ink-400 mt-0.5">${label}</p>
  </div>`;
};
