(async function () {
  const eventId = new URLSearchParams(window.location.search).get('event_id');
  if (!eventId) { window.location.replace('dashboard.html'); return; }

  const event = await App.api._apiFetch(`/api/events/${eventId}`);
  document.title = `Event Settings — ${event.name} Admin`;

  document.getElementById('shellSlot').innerHTML = App.components.adminShell(
    event, 'settings', 'Event Settings', 'Configure how this event looks and what guests can do.'
  );

  const themeColors = ['#E11D3C', '#0F766E', '#7C3AED', '#C77F1E', '#1D4ED8', '#BE185D'];
  const secondaryColors = ['#E8A33D', '#1A1310', '#0F766E', '#4D3F39', '#7C3AED', '#BE185D'];

  function sectionCard(title, subtitle, bodyHtml) {
    return `
    <div class="bg-white rounded-2xl border border-ink-100 p-5 shadow-soft">
      <p class="font-semibold text-ink-900">${title}</p>
      ${subtitle ? `<p class="text-[12px] text-ink-400 mt-0.5 mb-4">${subtitle}</p>` : '<div class="mb-4"></div>'}
      ${bodyHtml}
    </div>`;
  }

  function toggleRow(id, label, desc, checked) {
    return `
    <label class="flex items-start justify-between gap-4 py-4 border-b border-ink-50 last:border-0">
      <span>
        <span class="block text-sm font-semibold text-ink-800">${label}</span>
        <span class="block text-[12px] text-ink-400 mt-0.5">${desc}</span>
      </span>
      <span class="relative inline-flex items-center shrink-0 mt-0.5">
        <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} class="peer sr-only" />
        <span aria-hidden="true" class="w-11 h-6 rounded-full bg-ink-200 peer-checked:bg-primary-500 transition-colors"></span>
        <span aria-hidden="true" class="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
      </span>
    </label>`;
  }

  function colorSwatchRow(groupId, label, colors, selected) {
    return `
    <div>
      <label class="text-[13px] font-semibold text-ink-600 mb-1.5 block">${label}</label>
      <div class="flex flex-wrap gap-2.5" id="${groupId}">
        ${colors.map((c) => `<button type="button" data-color="${c}" aria-label="${c}" aria-pressed="${c === selected}"
            class="w-9 h-9 rounded-full border-2 ${c === selected ? 'border-ink-900' : 'border-transparent'}" style="background:${c}"></button>`).join('')}
      </div>
    </div>`;
  }

  // --- Event Information ---
  const eventInformationSection = sectionCard('Event Information', 'What guests see on the welcome screen and event details.', `
    <div class="space-y-4">
      <div>
        <label for="fieldName" class="text-[13px] font-semibold text-ink-600 mb-1.5 block">Event name</label>
        <input id="fieldName" type="text" value="${event.name}" class="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-[14px]" />
      </div>
      <div>
        <label for="fieldDesc" class="text-[13px] font-semibold text-ink-600 mb-1.5 block">Description</label>
        <textarea id="fieldDesc" rows="3" class="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-[14px] resize-none">${event.description}</textarea>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label for="fieldDate" class="text-[13px] font-semibold text-ink-600 mb-1.5 block">Event date</label>
          <input id="fieldDate" type="date" value="${event.date}" class="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-[14px]" />
        </div>
        <div>
          <label for="fieldLocation" class="text-[13px] font-semibold text-ink-600 mb-1.5 block">Location</label>
          <input id="fieldLocation" type="text" value="${event.location}" class="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-[14px]" />
        </div>
      </div>
      <div>
        <label for="fieldTagline" class="text-[13px] font-semibold text-ink-600 mb-1.5 block">Welcome message</label>
        <input id="fieldTagline" type="text" value="${event.tagline}" class="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-[14px]" />
      </div>
    </div>`);

  // --- Branding ---
  const brandingSection = sectionCard('Branding', 'Logo, cover image, and the two colors used across the guest UI.', `
    <div class="space-y-5">
      <div class="flex items-center gap-4">
        <div id="logoPreview" class="w-16 h-16 rounded-2xl bg-primary-500 text-white grid place-items-center font-display font-bold shrink-0 overflow-hidden">
          ${event.logoUrl ? `<img src="${event.logoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'" />` : event.logoInitials}
        </div>
        <div>
          <button type="button" id="replaceLogoBtn" class="text-[13px] font-semibold text-primary-600 border border-primary-200 rounded-xl px-4 py-2">Replace logo</button>
          <input type="file" id="logoFileInput" accept="image/*" class="hidden" />
          <p class="text-[11px] text-ink-400 mt-1.5">Shown on the welcome screen and the photo strip.</p>
        </div>
      </div>
      <div class="rounded-2xl overflow-hidden h-32 bg-sand relative">
        <img id="coverPreview" src="${event.heroImage}" alt="Event cover photo" class="w-full h-full object-cover" />
        <button type="button" id="replaceCoverBtn" class="absolute bottom-3 right-3 text-[12px] font-semibold bg-white/95 rounded-xl px-3.5 py-2">Replace cover</button>
        <input type="file" id="coverFileInput" accept="image/*" class="hidden" />
      </div>
      ${colorSwatchRow('primaryColorSwatches', 'Primary color', themeColors, event.theme.primary)}
      ${colorSwatchRow('secondaryColorSwatches', 'Secondary color', secondaryColors, event.theme.accent)}
      <p class="text-[12px] text-ink-400 leading-relaxed">Primary applies to buttons and highlights across the guest gallery. Secondary shows up in accents like the branded photo strip template.</p>
    </div>`);

  // --- Features ---
  const featuresSection = sectionCard('Features', 'Turn parts of the guest experience on or off for this event.', `
    <div>
      ${toggleRow('togglePhotoUploads', 'Photos', 'Allow guests to upload photos', event.settings.photoUploadsEnabled)}
      ${toggleRow('toggleVideoUploads', 'Videos', 'Allow guests to upload videos', event.settings.videoUploadsEnabled)}
      ${toggleRow('toggleGuestbook', 'Guestbook', 'Allow guests to leave written messages', event.settings.guestbookEnabled)}
      ${toggleRow('togglePhotoStrip', 'Photo strip builder', 'Optional photobooth feature for guests', event.settings.photoStripEnabled)}
    </div>`);

  // --- Privacy ---
  const privacySection = sectionCard('Privacy', 'Who can see this event and how uploads are handled.', `
    <div>
      ${toggleRow('toggleGalleryVisible', 'Private gallery', 'Only guests with the link or QR code can view this gallery \u2014 no public listing or search indexing', event.settings.galleryVisible)}
      ${toggleRow('toggleGuestUploads', 'Guest uploads', 'Allow anyone with the link to upload, not just invited guests', event.settings.guestUploadsOpen !== false)}
      ${toggleRow('toggleModeration', 'Moderation', 'Hold new uploads and messages for admin review before they appear in the gallery', !!event.settings.moderationEnabled)}
    </div>
    <p class="text-[11px] text-ink-400 mt-2 leading-relaxed">Moderation review queues aren\u2019t built yet \u2014 turning this on is saved with your other settings but has no effect until the backend supports a pending state.</p>`);

  document.getElementById('adminPageContent').innerHTML = `
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        ${eventInformationSection}
        ${brandingSection}
      </div>
      <div class="space-y-5">
        ${featuresSection}
        ${privacySection}
        <button type="button" id="saveSettingsBtn" class="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold shadow-soft">Save Changes</button>
      </div>
    </div>`;

  let selectedPrimary = event.theme.primary;
  let selectedSecondary = event.theme.accent;
  document.querySelectorAll('#primaryColorSwatches [data-color]').forEach((btn) => btn.addEventListener('click', () => {
    selectedPrimary = btn.dataset.color;
    document.querySelectorAll('#primaryColorSwatches [data-color]').forEach((b) => { b.classList.remove('border-ink-900'); b.classList.add('border-transparent'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.remove('border-transparent'); btn.classList.add('border-ink-900'); btn.setAttribute('aria-pressed', 'true');
  }));
  document.querySelectorAll('#secondaryColorSwatches [data-color]').forEach((btn) => btn.addEventListener('click', () => {
    selectedSecondary = btn.dataset.color;
    document.querySelectorAll('#secondaryColorSwatches [data-color]').forEach((b) => { b.classList.remove('border-ink-900'); b.classList.add('border-transparent'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.remove('border-transparent'); btn.classList.add('border-ink-900'); btn.setAttribute('aria-pressed', 'true');
  }));

  // --- Logo / Cover upload ---
  function wireAssetUpload(btnId, inputId, previewHandler) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      previewHandler(file);
    });
  }

  let pendingLogoFile = null;
  let pendingCoverFile = null;

  const MAX_ASSET_BYTES = 5 * 1024 * 1024;

  wireAssetUpload('replaceLogoBtn', 'logoFileInput', (file) => {
    if (file.size > MAX_ASSET_BYTES) {
      App.ui.toast('Logo must be under 5 MB', { icon: '⚠️' });
      document.getElementById('logoFileInput').value = '';
      return;
    }
    pendingLogoFile = file;
    const url = URL.createObjectURL(file);
    document.getElementById('logoPreview').innerHTML = `<img src="${url}" class="w-full h-full object-cover" />`;
    App.ui.toast('Logo preview updated — save to apply', { icon: '🖼️' });
  });

  wireAssetUpload('replaceCoverBtn', 'coverFileInput', (file) => {
    if (file.size > MAX_ASSET_BYTES) {
      App.ui.toast('Cover photo must be under 5 MB', { icon: '⚠️' });
      document.getElementById('coverFileInput').value = '';
      return;
    }
    pendingCoverFile = file;
    const url = URL.createObjectURL(file);
    document.getElementById('coverPreview').src = url;
    App.ui.toast('Cover preview updated — save to apply', { icon: '🖼️' });
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true;
    btn.textContent = 'Saving\u2026';
    try {
      if (pendingLogoFile) {
        const { url } = await App.api.uploadAsset(event.id, 'logo', pendingLogoFile);
        document.getElementById('logoPreview').innerHTML = `<img src="${url}" class="w-full h-full object-cover" />`;
        pendingLogoFile = null;
      }
      if (pendingCoverFile) {
        const { url } = await App.api.uploadAsset(event.id, 'cover', pendingCoverFile);
        document.getElementById('coverPreview').src = url;
        pendingCoverFile = null;
      }
      await App.api.updateEventSettings(event.id, {
        name:        document.getElementById('fieldName').value,
        description: document.getElementById('fieldDesc').value,
        date:        document.getElementById('fieldDate').value,
        location:    document.getElementById('fieldLocation').value,
        tagline:     document.getElementById('fieldTagline').value,
        theme: { primary: selectedPrimary, accent: selectedSecondary },
        settings: {
          guestbookEnabled:     document.getElementById('toggleGuestbook').checked,
          photoUploadsEnabled:  document.getElementById('togglePhotoUploads').checked,
          videoUploadsEnabled:  document.getElementById('toggleVideoUploads').checked,
          photoStripEnabled:    document.getElementById('togglePhotoStrip').checked,
          moderationEnabled:    document.getElementById('toggleModeration').checked,
        },
        isPrivate: !document.getElementById('toggleGalleryVisible').checked,
      });
      App.ui.toast('Settings saved ✓', { icon: '✅' });
    } catch (err) {
      App.ui.toast(err.message || 'Failed to save settings', { icon: '❌' });
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
})();
