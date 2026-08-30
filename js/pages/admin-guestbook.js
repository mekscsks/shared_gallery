(async function () {
  const slug = App.session.getEventSlug();
  const event = await App.api.getEvent(slug);
  document.title = `Guestbook Management — ${event.name} Admin`;

  document.getElementById('shellSlot').innerHTML = App.components.adminShell(
    event, 'guestbook', 'Guestbook Management', 'Moderate the messages guests have left.'
  );

  let messages = [];
  async function load() {
    messages = await App.api.getGuestbookMessages(event.id);
    render();
  }

  function render() {
    document.getElementById('adminPageContent').innerHTML = `
      <div class="bg-white rounded-2xl border border-ink-100 shadow-soft divide-y divide-ink-50">
        ${messages.map((m) => `
          <div class="p-4 sm:p-5 flex items-start gap-3.5 ${m.hidden ? 'opacity-50' : ''}">
            <div class="w-9 h-9 rounded-full bg-sand grid place-items-center text-[12px] font-semibold text-ink-600 shrink-0">
              ${m.guestName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-[13px] font-semibold text-ink-800">${m.guestName}</p>
                <p class="text-[11px] text-ink-400">${new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                ${m.hidden ? `<span class="text-[10px] font-bold uppercase bg-ink-900 text-white px-2 py-0.5 rounded-full">Hidden</span>` : ''}
              </div>
              <p class="text-[14px] text-ink-700 mt-1">\u201c${m.message}\u201d</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button data-action="hide" data-id="${m.id}" class="w-9 h-9 rounded-lg border ${m.hidden ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-200 text-ink-600'} text-[13px]">\ud83d\ude48</button>
              <button data-action="delete" data-id="${m.id}" class="w-9 h-9 rounded-lg border border-primary-200 text-primary-600 text-[13px]">\ud83d\uddd1\ufe0f</button>
            </div>
          </div>`).join('')}
      </div>
      ${!messages.length ? `<p class="text-ink-400 text-sm py-10 text-center">No guestbook messages yet.</p>` : ''}`;

    document.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id)));
  }

  async function handleAction(action, id) {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    if (action === 'hide') { await App.api.hideMessage(event.id, id, !msg.hidden); App.ui.toast(msg.hidden ? 'Message made visible' : 'Message hidden'); }
    if (action === 'delete') {
      const ok = await App.ui.confirm('Delete this message?', 'This action cannot be undone.');
      if (!ok) return;
      await App.api.deleteMessage(event.id, id);
      App.ui.toast('Message deleted');
    }
    await load();
  }

  await load();
})();
