(async function () {
  App.session.requireGuestOrRedirect();
  const guestName = App.session.getGuestName();
  const slug = App.session.getEventSlug();
  const event = await App.api.getEvent(slug);
  document.title = `Photo Strip — ${event.name}`;
  document.querySelector('a[href="gallery.html"]')?.setAttribute('href', `gallery.html?event=${slug}`);

  // Respect the event's photo strip toggle — this is a bonus feature and
  // should never be reachable when an organizer has turned it off.
  if (event.settings?.photoStripEnabled === false) {
    document.getElementById('stepContent').innerHTML = `
      <div class="text-center py-16 px-6">
        <div class="w-16 h-16 mx-auto rounded-full bg-sand grid place-items-center text-2xl mb-4">\ud83d\udd15</div>
        <p class="font-display font-semibold text-lg text-ink-800">Photo Strip is off for this event</p>
        <p class="text-ink-400 text-sm mt-1">The organizer has turned this feature off. You can still browse and share in the gallery.</p>
      </div>`;
    document.getElementById('stepIndicator').innerHTML = '';
    document.getElementById('backStepBtn').remove();
    document.getElementById('nextStepBtn').textContent = 'Back to Gallery';
    document.getElementById('nextStepBtn').disabled = false;
    document.getElementById('nextStepBtn').addEventListener('click', () => { window.location.href = `gallery.html?event=${slug}`; });
    return;
  }

  const photos = (await App.api.getPhotos(event.id)).filter((p) => !p.hidden);
  const templates = await App.api.getPhotoStripTemplates();

  let step = 0;
  const state = {
    selectedIds: [],
    templateId: templates[0].id,
    config: {
      showLogo: true,
      showEventName: true,
      customText: 'CREATE \u2022 CARE',
      background: null,
      sticker: '',
      logoInitials: event.logoInitials,
      eventName: event.name.toUpperCase(),
      textColor: null
    }
  };

  const stepContent = document.getElementById('stepContent');
  const nextBtn = document.getElementById('nextStepBtn');
  const backBtn = document.getElementById('backStepBtn');

  function selectedPhotos() { return state.selectedIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean); }
  function currentTemplate() { return templates.find((t) => t.id === state.templateId); }

  function renderStepIndicator() {
    document.getElementById('stepIndicator').innerHTML = App.components.stripStepIndicator(step);
  }

  function renderStep() {
    renderStepIndicator();
    backBtn.classList.toggle('hidden', step === 0);
    nextBtn.textContent = step === 3 ? 'Done' : 'Continue';

    if (step === 0) {
      stepContent.innerHTML = App.components.stripPhotoPicker(photos, state.selectedIds);
      wirePhotoPicker();
      updateNextEnabled();
    } else if (step === 1) {
      stepContent.innerHTML = App.components.stripTemplatePicker(templates, state.templateId);
      wireTemplatePicker();
      updateNextEnabled();
    } else if (step === 2) {
      stepContent.innerHTML = `
        <div class="grid sm:grid-cols-2 gap-8 items-start">
          <div id="customizeFormSlot"></div>
          <div class="sm:sticky sm:top-24">
            <p class="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-3 text-center">Live preview</p>
            <div id="livePreviewSlot"></div>
          </div>
        </div>`;
      renderCustomizeForm();
      renderLivePreview();
      updateNextEnabled();
    } else if (step === 3) {
      stepContent.innerHTML = `
        <p class="font-display font-semibold text-xl text-ink-900 mb-1">Preview</p>
        <p class="text-ink-400 text-sm mb-6">This is how your photo strip will look. Download it, share it, or add it to the gallery \u2014 all optional, and none required.</p>
        <div id="finalPreviewSlot" class="mb-6"></div>
        <div class="space-y-2.5 max-w-[280px] mx-auto">
          <button type="button" id="downloadStripBtn" class="w-full py-3.5 rounded-2xl bg-ink-900 text-white font-semibold flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M12 3v13m0 0-4-4m4 4 4-4M5 21h14"/></svg>
            Download Photo Strip
          </button>
          <button type="button" id="shareStripBtn" class="w-full py-3.5 rounded-2xl border border-ink-200 font-semibold text-ink-700 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8 15.8 7M8.2 13.2l7.6 3.8"/></svg>
            Share
          </button>
          <button type="button" id="addToGalleryBtn" class="w-full py-3.5 rounded-2xl border border-primary-200 font-semibold text-primary-600 flex items-center justify-center gap-2">
            <span aria-hidden="true">+</span> Add to Event Gallery
          </button>
          <p class="text-center text-[12px] text-ink-400 pt-1">Just want the file? Download above \u2014 you\u2019re never required to add it to the gallery.</p>
        </div>`;
      document.getElementById('finalPreviewSlot').innerHTML = App.components.photoStripFrame(selectedPhotos(), currentTemplate(), state.config);
      wireFinalStep();
      nextBtn.disabled = false;
    }
  }

  function updateNextEnabled() {
    if (step === 0) nextBtn.disabled = state.selectedIds.length < 3;
    else nextBtn.disabled = false;
  }

  function wirePhotoPicker() {
    document.querySelectorAll('[data-pick-photo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = isNaN(btn.dataset.pickPhoto) ? btn.dataset.pickPhoto : Number(btn.dataset.pickPhoto);
        if (state.selectedIds.includes(id)) {
          state.selectedIds = state.selectedIds.filter((x) => x !== id);
        } else {
          if (state.selectedIds.length >= 4) { App.ui.toast('You can pick up to 4 photos'); return; }
          state.selectedIds.push(id);
        }
        stepContent.innerHTML = App.components.stripPhotoPicker(photos, state.selectedIds);
        wirePhotoPicker();
        updateNextEnabled();
      });
    });
  }

  function wireTemplatePicker() {
    document.querySelectorAll('[data-pick-template]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.templateId = btn.dataset.pickTemplate;
        const t = currentTemplate();
        state.config.background = null;
        state.config.textColor = null;
        state.config.sticker = t.id === 'playful' ? '\u2728' : '';
        stepContent.innerHTML = App.components.stripTemplatePicker(templates, state.templateId);
        wireTemplatePicker();
      });
    });
  }

  function renderCustomizeForm() {
    document.getElementById('customizeFormSlot').innerHTML = App.components.stripCustomizeForm(state.config, currentTemplate());
    document.getElementById('toggleLogo').addEventListener('change', (e) => { state.config.showLogo = e.target.checked; renderLivePreview(); });
    document.getElementById('toggleEventName').addEventListener('change', (e) => { state.config.showEventName = e.target.checked; renderLivePreview(); });
    document.getElementById('customTextInput').addEventListener('input', (e) => { state.config.customText = e.target.value; renderLivePreview(); });
    document.querySelectorAll('[data-pick-bg]').forEach((btn) => btn.addEventListener('click', () => {
      state.config.background = btn.dataset.pickBg;
      state.config.textColor = ['#FFFFFF', '#FFFBF8', '#FFD9CE'].includes(btn.dataset.pickBg) ? '#1A1310' : '#FFFFFF';
      renderCustomizeForm(); renderLivePreview();
    }));
    document.querySelectorAll('[data-pick-sticker]').forEach((btn) => btn.addEventListener('click', () => {
      state.config.sticker = btn.dataset.pickSticker; renderCustomizeForm(); renderLivePreview();
    }));
  }

  function renderLivePreview() {
    document.getElementById('livePreviewSlot').innerHTML = App.components.photoStripFrame(selectedPhotos(), currentTemplate(), state.config);
  }

  // The strip currently renders as live HTML/CSS (App.components.photoStripFrame),
  // not a rasterized image — there is no canvas pixel buffer to export yet.
  // This is the intended hook: swap this function's body for real Canvas API
  // drawing (draw each photo + text + background onto a <canvas>, then
  // canvas.toBlob()) once that's implemented, and the rest of the flow
  // (buttons, gallery toggle) needs no changes.
  async function exportStripAsImage() {
    return null; // placeholder — no rasterized image available in this prototype
  }

  function wireFinalStep() {
    document.getElementById('downloadStripBtn').addEventListener('click', async () => {
      await exportStripAsImage();
      App.ui.toast('Photo strip saved to your device', { icon: '\u2b07\ufe0f' });
    });
    document.getElementById('shareStripBtn').addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: `${event.name} photo strip`, text: 'Check out my photo strip!' }); }
        catch (e) { /* user cancelled the share sheet */ }
      } else {
        App.ui.toast('Share sheet opened', { icon: '\ud83d\udd17' });
      }
    });
    const addBtn = document.getElementById('addToGalleryBtn');
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.textContent = 'Adding\u2026';
      try {
        await App.api.createPhotoStrip(event.id, {
          photoIds: state.selectedIds, templateId: state.templateId, customText: state.config.customText,
          background: state.config.background || currentTemplate().bg, addToGallery: true, guestName
        });
        addBtn.innerHTML = '\u2713 Added to Gallery';
        App.ui.toast('Added to the gallery \ud83c\udf89');
      } catch (e) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Event Gallery';
        App.ui.toast('Couldn\u2019t add it \u2014 try again', { icon: '\u26a0\ufe0f' });
      }
    });
  }

  backBtn.addEventListener('click', () => { step = Math.max(0, step - 1); renderStep(); });
  nextBtn.addEventListener('click', () => {
    if (step < 3) { step += 1; renderStep(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    // Step 3's "Done" never forces a save — Download/Share/Add to Gallery
    // above are each independent, optional actions the guest already chose.
    window.location.href = `gallery.html?event=${slug}`;
  });

  renderStep();
})();
