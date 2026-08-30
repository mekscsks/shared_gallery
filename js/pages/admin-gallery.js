(async function () {
  const slug = App.session.getEventSlug();
  const event = await App.api.getEvent(slug);
  document.title = `Gallery Management — ${event.name} Admin`;

  document.getElementById('shellSlot').innerHTML = App.components.adminShell(
    event, 'gallery', 'Gallery Management', 'View, feature, hide or remove anything guests have shared.'
  );

  let items = [];
  let guestFilter = 'all';
  let typeFilter = 'all';
  let searchTerm = '';

  async function load() {
    document.getElementById('adminPageContent').innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        ${Array.from({ length: 8 }).map(() => '<div class="aspect-square rounded-2xl shimmer"></div>').join('')}
      </div>`;
    items = await App.api.getAllMedia(event.id);
    render();
  }

  function guestOptions() {
    const names = [...new Set(items.map((i) => i.uploaderName))].sort();
    return ['all', ...names];
  }

  function visible() {
    return items
      .filter((i) => guestFilter === 'all' || i.uploaderName === guestFilter)
      .filter((i) => typeFilter === 'all' || i.type === typeFilter)
      .filter((i) => !searchTerm || (i.caption || '').toLowerCase().includes(searchTerm) || i.uploaderName.toLowerCase().includes(searchTerm));
  }

  function render() {
    const list = visible();
    document.getElementById('adminPageContent').innerHTML = `
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <input id="searchInput" type="search" value="${searchTerm}" placeholder="Search by guest or caption\u2026"
          class="text-sm border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white w-full sm:w-64" />
        <select id="typeFilterSelect" class="text-sm font-semibold border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white">
          <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>All media</option>
          <option value="photo" ${typeFilter === 'photo' ? 'selected' : ''}>Photos only</option>
          <option value="video" ${typeFilter === 'video' ? 'selected' : ''}>Videos only</option>
        </select>
        <select id="guestFilterSelect" class="text-sm font-semibold border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white">
          ${guestOptions().map((g) => `<option value="${g}" ${g === guestFilter ? 'selected' : ''}>${g === 'all' ? 'All guests' : g}</option>`).join('')}
        </select>
        <span class="text-[13px] text-ink-400">${list.length} item${list.length === 1 ? '' : 's'}</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        ${list.map((item) => `
          <div class="bg-white rounded-2xl border border-ink-100 overflow-hidden shadow-soft ${item.hidden ? 'opacity-50' : ''}">
            <div class="relative aspect-square bg-sand">
              <img src="${item.thumbUrl}" class="w-full h-full object-cover" />
              ${item.featured ? `<span class="absolute top-2 left-2 text-[10px] font-bold uppercase bg-gold-500 text-white px-2 py-0.5 rounded-full">Featured</span>` : ''}
              ${item.hidden ? `<span class="absolute top-2 right-2 text-[10px] font-bold uppercase bg-ink-900/70 text-white px-2 py-0.5 rounded-full">Hidden</span>` : ''}
              ${item.type === 'video' ? `<span class="absolute bottom-2 right-2 text-[11px] font-semibold text-white bg-ink-900/60 px-1.5 py-0.5 rounded-md">${item.durationLabel}</span>` : ''}
            </div>
            <div class="p-3">
              <p class="text-[12px] font-semibold text-ink-800 truncate">${item.uploaderName}</p>
              <p class="text-[11px] text-ink-400 mb-2.5">${new Date(item.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              <div class="flex items-center gap-1.5">
                <button data-action="feature" data-id="${item.id}" title="Feature" class="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border ${item.featured ? 'bg-gold-500 text-white border-gold-500' : 'border-ink-200 text-ink-600'}">\u2b50</button>
                <button data-action="hide" data-id="${item.id}" title="Hide" class="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border ${item.hidden ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-200 text-ink-600'}">\ud83d\ude48</button>
                <button data-action="delete" data-id="${item.id}" title="Delete" class="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border border-primary-200 text-primary-600">\ud83d\uddd1\ufe0f</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
      ${!list.length ? `<p class="text-ink-400 text-sm py-10 text-center">No items from this guest.</p>` : ''}`;

    document.getElementById('searchInput').addEventListener('input', (e) => { searchTerm = e.target.value.toLowerCase(); render(); });
    document.getElementById('typeFilterSelect').addEventListener('change', (e) => { typeFilter = e.target.value; render(); });
    document.getElementById('guestFilterSelect').addEventListener('change', (e) => { guestFilter = e.target.value; render(); });
    document.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id)));
  }

  async function handleAction(action, id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (action === 'feature') { await App.api.featurePhoto(event.id, id, !item.featured); App.ui.toast(item.featured ? 'Removed from featured' : 'Marked as featured'); }
    if (action === 'hide') { await App.api.hidePhoto(event.id, id, !item.hidden); App.ui.toast(item.hidden ? 'Made visible again' : 'Hidden from guests'); }
    if (action === 'delete') {
      const ok = await App.ui.confirm('Delete this photo?', 'This action cannot be undone. Guests will no longer see it.');
      if (!ok) return;
      await App.api.deletePhoto(event.id, id);
      App.ui.toast('Item removed');
    }
    await load();
  }

  await load();
})();
