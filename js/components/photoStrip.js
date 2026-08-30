App.components = App.components || {};

const STRIP_STEPS = ['Choose Photos', 'Choose Template', 'Customize', 'Preview'];

App.components.stripStepIndicator = function renderStepIndicator(activeIndex) {
  return STRIP_STEPS.map((label, i) => `
    <div class="flex items-center gap-2 ${i < STRIP_STEPS.length - 1 ? 'flex-1' : ''}">
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold
          ${i < activeIndex ? 'bg-primary-500 text-white' : i === activeIndex ? 'bg-ink-900 text-white' : 'bg-sand text-ink-400'}">
          ${i < activeIndex ? '\u2713' : i + 1}
        </span>
        <span class="hidden sm:inline text-[12px] font-semibold ${i === activeIndex ? 'text-ink-900' : 'text-ink-400'}">${label}</span>
      </div>
      ${i < STRIP_STEPS.length - 1 ? `<span class="h-0.5 flex-1 rounded-full ${i < activeIndex ? 'bg-primary-400' : 'bg-sand'}"></span>` : ''}
    </div>`).join('');
};

App.components.stripPhotoPicker = function renderStripPhotoPicker(photos, selectedIds) {
  return `
  <p class="font-display font-semibold text-xl text-ink-900 mb-1">Choose your photos</p>
  <p class="text-ink-400 text-sm mb-5">Pick 3 or 4 favorites \u2014 tap a selected photo to swap it for another. <span id="pickCount" class="font-semibold text-ink-600">${selectedIds.length} selected</span></p>
  <div class="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
    ${photos.map((p) => {
      const isSelected = selectedIds.map(String).includes(String(p.id));
      return `
      <button type="button" data-pick-photo="${p.id}"
        class="relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'border-primary-500 ring-2 ring-primary-300' : 'border-transparent'}">
        <img src="${p.thumbUrl}" class="w-full h-full object-cover" />
        <span class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold border-2 border-white
          ${isSelected ? 'bg-primary-500 text-white' : 'bg-white/60 text-transparent'}">\u2713</span>
        ${isSelected ? `<span class="absolute inset-0 bg-primary-500/10"></span>` : ''}
      </button>`;}).join('')}
  </div>`;
};

App.components.stripTemplatePicker = function renderStripTemplatePicker(templates, selectedId) {
  return `
  <p class="font-display font-semibold text-xl text-ink-900 mb-1">Choose a template</p>
  <p class="text-ink-400 text-sm mb-5">Every template can still be customized in the next step.</p>
  <div class="grid grid-cols-2 gap-3.5">
    ${templates.map((t) => `
      <button type="button" data-pick-template="${t.id}"
        class="text-left rounded-2xl border-2 p-3 transition-all ${selectedId === t.id ? 'border-primary-500 bg-primary-50/40' : 'border-ink-100 bg-white'}">
        <div class="rounded-xl overflow-hidden mb-2.5 p-2 flex flex-col gap-1" style="background:${t.bg}">
          ${Array.from({ length: t.frames }).map(() => `<div class="w-full h-6 ${t.frameShape === 'rounded' ? 'rounded-md' : 'rounded-sm'} bg-white/70"></div>`).join('')}
          <div class="w-full h-2.5 rounded-sm" style="background:${t.text}; opacity:.5"></div>
        </div>
        <p class="font-semibold text-[13px] text-ink-800">${t.name}</p>
        <p class="text-[11px] text-ink-400 mt-0.5 leading-snug">${t.desc}</p>
      </button>`).join('')}
  </div>`;
};

App.components.stripCustomizeForm = function renderStripCustomizeForm(config, template) {
  const stickerOptions = ['\u2728', '\ud83c\udf89', '\u2764\ufe0f', '\u2b50', '\ud83c\udf08'];
  return `
  <p class="font-display font-semibold text-xl text-ink-900 mb-1">Customize</p>
  <p class="text-ink-400 text-sm mb-5">Make it feel like today.</p>

  <div class="space-y-5">
    <label class="flex items-center justify-between bg-white rounded-2xl border border-ink-100 px-4 py-3.5">
      <span class="text-sm font-semibold text-ink-700">Show event logo</span>
      <input type="checkbox" id="toggleLogo" ${config.showLogo ? 'checked' : ''} class="w-5 h-5 accent-primary-500" />
    </label>
    <label class="flex items-center justify-between bg-white rounded-2xl border border-ink-100 px-4 py-3.5">
      <span class="text-sm font-semibold text-ink-700">Show event name</span>
      <input type="checkbox" id="toggleEventName" ${config.showEventName ? 'checked' : ''} class="w-5 h-5 accent-primary-500" />
    </label>

    <div>
      <label class="text-sm font-semibold text-ink-700 mb-1.5 block">Custom text</label>
      <input id="customTextInput" type="text" maxlength="30" value="${config.customText}" placeholder="CREATE \u2022 CARE"
        class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[15px] placeholder:text-ink-300 focus:border-primary-400 focus:ring-0" />
    </div>

    <div>
      <label class="text-sm font-semibold text-ink-700 mb-1.5 block">Background</label>
      <div class="flex items-center gap-2.5">
        ${['#FFFFFF', '#FFFBF8', '#E11D3C', '#FFD9CE', '#1A1310'].map((c) => `
          <button type="button" data-pick-bg="${c}"
            class="w-9 h-9 rounded-full border-2 ${config.background === c ? 'border-primary-500' : 'border-ink-100'}"
            style="background:${c}"></button>`).join('')}
      </div>
    </div>

    <div>
      <label class="text-sm font-semibold text-ink-700 mb-1.5 block">Stickers <span class="text-ink-400 font-normal">(playful touch, optional)</span></label>
      <div class="flex items-center gap-2.5">
        ${stickerOptions.map((s) => `
          <button type="button" data-pick-sticker="${s}"
            class="w-10 h-10 rounded-2xl border-2 grid place-items-center text-lg ${config.sticker === s ? 'border-primary-500 bg-primary-50' : 'border-ink-100 bg-white'}">${s}</button>`).join('')}
        <button type="button" data-pick-sticker="" class="text-[12px] font-semibold text-ink-400 underline underline-offset-2">None</button>
      </div>
    </div>
  </div>`;
};

/**
 * Renders the actual photobooth-style strip. Shared by the Customize live
 * preview and the final Preview step. This is the one place in the app
 * that leans into the physical photobooth motif (film perforation edge).
 */
App.components.photoStripFrame = function renderPhotoStripFrame(photos, template, config) {
  const radius = template.frameShape === 'rounded' ? 'rounded-xl' : 'rounded-sm';
  return `
  <div class="perf-edge mx-auto w-full max-w-[240px] rounded-2xl shadow-lift p-3.5 pt-5 pb-5"
       style="background:${config.background || template.bg}; --perf-cut:${'#FFFBF8'}">
    <div class="flex flex-col gap-2.5">
      ${photos.map((p) => `<img src="${p.thumbUrl}" class="w-full h-28 object-cover ${radius}" />`).join('')}
    </div>
    <div class="text-center mt-3.5">
      ${config.showLogo ? `<div class="w-7 h-7 rounded-full mx-auto mb-1.5 grid place-items-center text-[10px] font-bold"
            style="background:${config.textColor || template.text}; color:${config.background || template.bg}">${config.logoInitials || 'RCY'}</div>` : ''}
      ${config.showEventName ? `<p class="font-display font-semibold text-[13px] leading-tight" style="color:${config.textColor || template.text}">${config.eventName || ''}</p>` : ''}
      ${config.customText ? `<p class="text-[10px] font-semibold tracking-widest uppercase mt-1" style="color:${config.textColor || template.text}; opacity:.75">${config.customText}</p>` : ''}
    </div>
    ${config.sticker ? `<div class="text-center text-xl mt-1">${config.sticker}</div>` : ''}
  </div>`;
};
