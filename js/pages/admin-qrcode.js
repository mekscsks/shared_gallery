(async function () {
  const eventId = new URLSearchParams(window.location.search).get('event_id');
  if (!eventId) { window.location.replace('dashboard.html'); return; }

  const event = await App.api._apiFetch(`/api/events/${eventId}`);
  document.title = `Event QR Code — ${event.name} Admin`;

  document.getElementById('shellSlot').innerHTML = App.components.adminShell(
    event, 'qrcode', 'Event QR Code', 'Print this or share it so guests can jump straight into the gallery.'
  );

  const eventUrl = `${window.location.origin.replace(/\/$/, '')}/event/${event.slug}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=12&color=1A1310&bgcolor=FFFBF8&data=${encodeURIComponent(eventUrl)}`;

  document.getElementById('adminPageContent').innerHTML = `
    <div class="grid lg:grid-cols-2 gap-6 items-start">
      <div class="bg-white rounded-3xl border border-ink-100 shadow-soft p-8 text-center">
        <div class="w-11 h-11 rounded-2xl bg-primary-500 text-white grid place-items-center font-display font-bold mx-auto mb-3">${event.logoInitials}</div>
        <p class="font-display font-semibold text-lg text-ink-900">${event.name}</p>
        <p class="text-[12px] text-ink-400 mb-5">Scan to open the private gallery</p>
        <img src="${qrSrc}" alt="Event QR code" class="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl border border-ink-100" />
        <p class="text-[12px] text-ink-400 mt-5 break-all">${eventUrl}</p>
      </div>

      <div id="printHide" class="space-y-4">
        <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
          <p class="font-semibold text-ink-900 mb-3">Event link</p>
          <div class="flex items-center gap-2">
            <input readonly value="${eventUrl}" class="flex-1 min-w-0 rounded-xl border border-ink-200 px-3.5 py-2.5 text-[13px] text-ink-600 bg-sand/60" />
            <button id="copyLinkBtn" type="button" class="shrink-0 text-[13px] font-semibold text-white bg-ink-900 rounded-xl px-4 py-2.5">Copy</button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <a id="downloadQrBtn" href="${qrSrc}" download="event-qr-${event.slug}.png" class="flex-1 text-center py-3.5 rounded-2xl bg-primary-500 text-white font-semibold shadow-soft">Download QR</a>
          <button id="printQrBtn" type="button" class="flex-1 py-3.5 rounded-2xl border border-ink-200 font-semibold text-ink-700">Print QR</button>
        </div>
        <div class="bg-sand rounded-2xl p-5">
          <p class="text-[13px] font-semibold text-ink-700 mb-1">Tip for tables & signage</p>
          <p class="text-[12px] text-ink-500 leading-relaxed">Print at 4\u2033\u00d76\u2033 or larger so guests can scan comfortably from arm's length. Add a short caption like "Scan to share your photos!" beneath it.</p>
        </div>
      </div>
    </div>`;

  document.getElementById('copyLinkBtn').addEventListener('click', () => App.ui.toast('Link copied to clipboard'));
  document.getElementById('printQrBtn').addEventListener('click', () => window.print());
})();
