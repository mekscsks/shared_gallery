(async function () {
  const slug = App.session.getEventSlug();
  const event = await App.api.getEvent(slug);
  document.title = `Dashboard — ${event.name} Admin`;

  document.getElementById('shellSlot').innerHTML = App.components.adminShell(
    event, 'dashboard', 'Dashboard', "Here's how " + event.name + ' is going so far.'
  );

  const [photos, videos, messages, stats] = await Promise.all([
    App.api.getPhotos(event.id),
    App.api.getVideos(event.id),
    App.api.getGuestbookMessages(event.id),
    App.api._apiFetch(`/api/admin/events/${event.id}/stats`).catch(() => null),
  ]);

  // Use real stats from the API when available, fall back to array lengths
  const s = stats || {
    photos: photos.length, videos: videos.length,
    messages: messages.length, guests: '—',
  };
  const storageUsedGB  = event.storageUsedGB  ?? 0;
  const storageLimitGB = event.storageLimitGB ?? 15;
  const usedPct = storageLimitGB ? Math.round((storageUsedGB / storageLimitGB) * 100) : 0;

  document.getElementById('adminPageContent').innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      ${App.components.statCard('Total Photos', photos.length, '\ud83d\uddbc\ufe0f', 'bg-primary-50')}
      ${App.components.statCard('Total Videos', videos.length, '\ud83c\udfa5', 'bg-gold-500/15')}
      ${App.components.statCard('Guests', s.guests, '\ud83d\udc65', 'bg-blush')}
      ${App.components.statCard('Guestbook Messages', messages.length, '\ud83d\udcac', 'bg-sand')}
    </div>

    <div class="grid lg:grid-cols-3 gap-3.5">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
        <div class="flex items-center justify-between mb-4">
          <p class="font-semibold text-ink-900">Recently shared</p>
          <a href="gallery.html" class="text-[13px] font-semibold text-primary-600">Manage gallery \u2192</a>
        </div>
        <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
          ${[...photos].slice(0, 12).map((p) => `<img src="${p.thumbUrl}" class="w-full aspect-square object-cover rounded-lg" />`).join('')}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
        <p class="font-semibold text-ink-900 mb-4">Storage usage</p>
        <div class="h-2.5 bg-sand rounded-full overflow-hidden mb-2">
          <div class="h-full bg-primary-500 rounded-full" style="width:${usedPct}%"></div>
        </div>
        <p class="text-[13px] text-ink-500">${storageUsedGB} GB of ${storageLimitGB} GB used</p>
        <p class="text-[11px] text-ink-400 mt-3 leading-relaxed">Media is stored via the connected Google Drive folder for this event once the backend is live.</p>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-3.5 mt-3.5">
      <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
        <p class="font-semibold text-ink-900 mb-4">Recent activity</p>
        <div class="space-y-3">
          ${buildActivityFeed(photos, videos, messages).slice(0, 6).map((a) => `
            <div class="flex items-center gap-3 pb-3 border-b border-ink-50 last:border-0 last:pb-0">
              <span class="w-8 h-8 rounded-full bg-sand grid place-items-center text-sm shrink-0">${a.icon}</span>
              <p class="text-[13px] text-ink-700"><span class="font-semibold">${a.name}</span> ${a.text}</p>
            </div>`).join('')}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
        <p class="font-semibold text-ink-900 mb-4">Latest guestbook messages</p>
        <div class="space-y-3">
          ${messages.slice(0, 3).map((m) => `
            <div class="flex items-start gap-3 pb-3 border-b border-ink-50 last:border-0 last:pb-0">
              <div class="w-8 h-8 rounded-full bg-sand grid place-items-center text-[11px] font-semibold text-ink-600 shrink-0">${m.guestName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
              <div class="min-w-0">
                <p class="text-[13px] text-ink-700 truncate">\u201c${m.message}\u201d</p>
                <p class="text-[11px] text-ink-400">${m.guestName}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  // Groups consecutive photo uploads by the same guest into one line
  // ("Miko uploaded 4 photos") rather than one row per file.
  function buildActivityFeed(photos, videos, messages) {
    const events = [
      ...photos.map((p) => ({ ts: p.uploadedAt, name: p.uploaderName, kind: 'photo' })),
      ...videos.map((v) => ({ ts: v.uploadedAt, name: v.uploaderName, kind: 'video' })),
      ...messages.map((m) => ({ ts: m.createdAt, name: m.guestName, kind: 'message' }))
    ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

    const feed = [];
    let i = 0;
    while (i < events.length) {
      const e = events[i];
      if (e.kind === 'message') { feed.push({ name: e.name, text: 'left a guestbook message', icon: '\ud83d\udcac' }); i++; continue; }
      let count = 1;
      while (events[i + count] && events[i + count].name === e.name && events[i + count].kind === e.kind) count++;
      const label = e.kind === 'photo' ? `photo${count > 1 ? 's' : ''}` : `video${count > 1 ? 's' : ''}`;
      feed.push({ name: e.name, text: `uploaded ${count > 1 ? count + ' ' : 'a '}${label}`, icon: e.kind === 'photo' ? '\ud83d\uddbc\ufe0f' : '\ud83c\udfa5' });
      i += count;
    }
    return feed;
  }
})();
