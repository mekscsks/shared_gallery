(async function () {
  let slug = App.session.getEventSlug();
  let event;

  try {
    if (!slug) {
      // No ?event= param — try the system default
      event = await App.api._apiFetch('/api/events/default');
      slug = event.slug;
      // Redirect so the URL reflects the actual event
      window.history.replaceState(null, '', `?event=${slug}`);
    } else {
      event = await App.api.getEvent(slug);
    }
  } catch (e) {
    document.querySelector('main').innerHTML = `
      <div class="flex flex-col items-center justify-center flex-1 py-20 text-center px-6">
        <p class="text-4xl mb-4">🔒</p>
        <h2 class="font-display font-semibold text-xl mb-2">Event not available</h2>
        <p class="text-ink-400 text-sm">${
          e.code === 'NO_DEFAULT_EVENT'
            ? 'No event link was provided.'
            : e.status === 404
              ? 'This event doesn\'t exist or isn\'t open yet.'
              : 'Something went wrong. Please try again.'
        }</p>
      </div>`;
    return;
  }
  document.title = `${event.name} — Event Gallery`;

  // Store the event id globally so App.session.setGuestName() can pass it
  // to POST /api/events/{id}/guests without needing to re-fetch the event.
  window.__currentEventId = event.id;

  document.getElementById('heroSlot').innerHTML = App.components.eventHero(event);

  document.getElementById('quickFactsSlot').innerHTML = `
    <span class="inline-flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      ${event.dateLabel}
    </span>
    <span aria-hidden="true">\u00b7</span>
    <span class="inline-flex items-center gap-1.5 min-w-0 truncate">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11Z"/></svg>
      <span class="truncate">${event.location}</span>
    </span>`;

  document.getElementById('eventInfoPanel').innerHTML = `
    <p><span class="font-semibold text-ink-700">${event.dateLabel}</span> \u00b7 ${event.timeLabel}</p>
    <p>${event.location}</p>
    <p class="pt-1">${event.description}</p>
    <p class="pt-1 text-ink-400">Hosted by ${event.organizer}</p>`;

  document.getElementById('eventInfoToggle').addEventListener('click', () => {
    const panel = document.getElementById('eventInfoPanel');
    const chevron = document.getElementById('eventInfoChevron');
    panel.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
  });

  const existingName = App.session.getGuestName();
  const nameInput = document.getElementById('nameInput');
  const enterBtn = document.getElementById('enterBtn');
  const returningSlot = document.getElementById('returningGuestSlot');

  if (existingName) {
    returningSlot.classList.remove('hidden');
    returningSlot.innerHTML = `
      <button type="button" id="continueAsBtn" class="w-full flex items-center justify-between bg-sand rounded-2xl px-4 py-3.5">
        <span class="text-[14px] text-ink-600">Continue as <span class="font-semibold text-ink-900">${existingName}</span></span>
        <span class="text-primary-600 text-sm font-semibold">Continue \u2192</span>
      </button>`;
    document.getElementById('continueAsBtn').addEventListener('click', () => { window.location.href = 'gallery.html'; });
  }

  nameInput.addEventListener('input', () => { enterBtn.disabled = nameInput.value.trim().length === 0; });

  document.getElementById('nameForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    App.session.setGuestName(name);
    enterBtn.textContent = 'Entering\u2026';
    setTimeout(() => { window.location.href = 'gallery.html'; }, 250);
  });
})();
