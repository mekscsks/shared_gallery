(async function () {
  App.session.requireGuestOrRedirect();
  const guestName = App.session.getGuestName();
  const slug = App.session.getEventSlug();

  const event = await App.api.getEvent(slug);
  document.title = `Guestbook — ${event.name}`;
  const settings = event.settings || {};

  document.getElementById('headerSlot').innerHTML = App.components.header(event, 'guestbook');
  document.getElementById('bottomNavSlot').innerHTML = App.components.bottomNav('guestbook', settings, slug);
  document.getElementById('shareMemoryFabSlot').innerHTML = App.components.shareMemoryButton();
  document.getElementById('desktopTabsSlot').innerHTML = App.components.desktopTabs('guestbook', settings, slug);
  document.getElementById('uploadModalSlot').innerHTML = App.components.uploadModal(guestName, settings);
  document.getElementById('moreSheetSlot').innerHTML = App.components.moreSheet(event);
  document.getElementById('eventInfoModalSlot').innerHTML = App.components.eventInfoModal(event);
  document.getElementById('moreSheetGuestName').textContent = guestName;

  App.ui.initOverlays();
  App.components.initUploadModal({ eventId: event.id, guestName, onUploaded: () => App.ui.toast('Memory shared \ud83c\udf89') });

  document.getElementById('shareEventBtn')?.addEventListener('click', () => App.ui.toast('Event link copied to clipboard', { icon: '\ud83d\udd17' }));
  document.getElementById('switchGuestBtn')?.addEventListener('click', () => { App.session.clearGuestName(); window.location.href = `index.html?event=${slug}`; });

  // Respect the event's guestbook toggle: show a calm disabled state
  // instead of a composer + list that would immediately fail to post.
  if (settings.guestbookEnabled === false) {
    document.getElementById('composerSlot').innerHTML = '';
    document.getElementById('guestbookListSlot').innerHTML = `
      <div class="text-center py-16 px-6">
        <div class="w-16 h-16 mx-auto rounded-full bg-sand grid place-items-center text-2xl mb-4">\ud83d\udd15</div>
        <p class="font-display font-semibold text-lg text-ink-800">Guestbook is off for this event</p>
        <p class="text-ink-400 text-sm mt-1">The organizer has turned this feature off. You can still browse the gallery.</p>
      </div>`;
    return;
  }

  document.getElementById('composerSlot').innerHTML = App.components.guestbookComposer(guestName);

  async function loadMessages() {
    document.getElementById('guestbookListSlot').innerHTML = `<div class="space-y-3">${App.components.mediaGridSkeleton(4)}</div>`;
    try {
      const messages = (await App.api.getGuestbookMessages(event.id)).filter((m) => !m.hidden);
      document.getElementById('guestbookListSlot').innerHTML = App.components.guestbookList(messages);
    } catch (e) {
      document.getElementById('guestbookListSlot').innerHTML = `
        <div class="text-center py-16 px-6">
          <div class="w-16 h-16 mx-auto rounded-full bg-primary-50 grid place-items-center text-2xl mb-4">\u26a0\ufe0f</div>
          <p class="font-display font-semibold text-lg text-ink-800">We couldn\u2019t load the guestbook</p>
          <p class="text-ink-400 text-sm mt-1 mb-5">Check your connection and try again.</p>
          <button type="button" id="retryGuestbookBtn" class="py-2.5 px-5 rounded-full bg-ink-900 text-white font-semibold text-sm">Try Again</button>
        </div>`;
      document.getElementById('retryGuestbookBtn').addEventListener('click', loadMessages);
    }
  }

  App.components.initGuestbookComposer({ eventId: event.id, guestName, onPosted: loadMessages });
  await loadMessages();
})();
