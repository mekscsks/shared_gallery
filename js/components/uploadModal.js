App.components = App.components || {};

App.components.uploadModal = function renderUploadModal(guestName, settings = {}) {
  const photosOn = settings.photoUploadsEnabled !== false;
  const videosOn = settings.videoUploadsEnabled !== false;
  const accept = [photosOn ? 'image/*' : null, videosOn ? 'video/*' : null].filter(Boolean).join(',') || 'image/*';
  const hint = photosOn && videosOn ? 'or tap to choose photos & videos' : photosOn ? 'or tap to choose photos' : 'or tap to choose videos';

  return `
  <div id="uploadModalBackdrop" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-ink-900/45 backdrop-fade" data-close-upload></div>
    <div role="dialog" aria-modal="true" aria-labelledby="uploadModalTitle"
         class="absolute bottom-0 inset-x-0 sm:inset-0 sm:m-auto sm:max-w-lg sm:h-fit sm:max-h-[85vh] bg-cream rounded-t-3xl sm:rounded-3xl shadow-soft
                flex flex-col max-h-[90vh] animate-slideUp sm:animate-pop overflow-hidden">
      <div class="px-5 pt-5 pb-3 shrink-0">
        <div class="w-10 h-1.5 bg-ink-200 rounded-full mx-auto mb-4 sm:hidden"></div>
        <div class="flex items-center justify-between">
          <h3 id="uploadModalTitle" class="font-display font-semibold text-xl text-ink-900">Share a Memory</h3>
          <button type="button" data-close-upload aria-label="Close" class="w-9 h-9 rounded-full bg-sand grid place-items-center text-ink-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <p class="text-[13px] text-ink-400 mt-1">Uploading as <span class="font-semibold text-ink-600" id="uploadAsName">${guestName}</span></p>
      </div>

      <div class="px-5 overflow-y-auto grow">
        <label id="dropZone" for="fileInput"
          class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary-200 bg-primary-50/40 rounded-2xl py-10 px-4 text-center cursor-pointer transition-colors hover:bg-primary-50">
          <span class="w-12 h-12 rounded-2xl bg-white shadow-soft grid place-items-center text-2xl" aria-hidden="true">\ud83d\udcf7</span>
          <span class="font-semibold text-ink-800">Drop your memories here</span>
          <span class="text-[13px] text-ink-400">${hint}</span>
          <input id="fileInput" type="file" accept="${accept}" multiple class="hidden" aria-label="Choose photos or videos to share" />
        </label>

        <p id="uploadStatusLine" class="text-[13px] font-semibold text-ink-500 mt-4 hidden" role="status" aria-live="polite"></p>
        <div id="filePreviewList" class="mt-2 space-y-2.5"></div>

        <div class="mt-4">
          <label for="captionInput" class="text-sm font-semibold text-ink-700 mb-1.5 block">Caption <span class="text-ink-400 font-normal">(optional)</span></label>
          <textarea id="captionInput" rows="2" maxlength="180" placeholder="Such a fun training day \u2764\ufe0f"
            class="w-full resize-none rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[15px] placeholder:text-ink-300 focus:border-primary-400 focus:ring-0"></textarea>
        </div>
      </div>

      <div class="px-5 py-4 shrink-0 border-t border-ink-100 bg-cream">
        <button type="button" id="submitUploadBtn" disabled
          class="w-full py-3.5 rounded-2xl bg-primary-500 disabled:bg-ink-200 disabled:text-ink-400 text-white font-semibold text-[15px] transition-colors active:scale-[.98]">
          Share your memories
        </button>
      </div>
    </div>
  </div>`;
};

/**
 * Wires the modal's file picker, drag & drop, per-file preview with real
 * retry, and submit -> App.api.uploadMedia(). A failed file never takes
 * successful ones down with it — each row tracks its own status.
 */
App.components.initUploadModal = function initUploadModal({ eventId, guestName, onUploaded }) {
  const backdrop = document.getElementById('uploadModalBackdrop');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const previewList = document.getElementById('filePreviewList');
  const captionInput = document.getElementById('captionInput');
  const submitBtn = document.getElementById('submitUploadBtn');
  const statusLine = document.getElementById('uploadStatusLine');
  if (!backdrop) return;

  let queue = []; // { id, file, dataUrl, type, status: 'pending'|'uploading'|'done'|'error' }

  function openModal() { backdrop.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeModal() { backdrop.classList.add('hidden'); document.body.style.overflow = ''; resetQueue(); }
  function resetQueue() {
    queue = []; previewList.innerHTML = ''; captionInput.value = '';
    statusLine.classList.add('hidden');
    submitBtn.textContent = 'Share your memories';
    updateSubmitState();
  }
  function updateSubmitState() {
    submitBtn.disabled = queue.length === 0 || queue.every((q) => q.status === 'done');
  }
  function setStatus(text) {
    if (!text) { statusLine.classList.add('hidden'); return; }
    statusLine.textContent = text;
    statusLine.classList.remove('hidden');
  }

  document.getElementById('shareMemoryBtn')?.addEventListener('click', openModal);
  document.querySelectorAll('[data-close-upload]').forEach((b) => b.addEventListener('click', closeModal));

  ['dragover', 'dragenter'].forEach((evt) => dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('bg-primary-50'); }));
  ['dragleave', 'drop'].forEach((evt) => dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('bg-primary-50'); }));
  dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  function handleFiles(fileList) {
    Array.from(fileList).forEach((file) => {
      const id = 'f' + Date.now() + Math.random().toString(16).slice(2);
      const type = file.type.startsWith('video') ? 'video' : 'photo';
      const reader = new FileReader();
      reader.onload = () => {
        const entry = { id, file, dataUrl: reader.result, type, status: 'pending' };
        queue.push(entry);
        renderPreview(entry);
        updateSubmitState();
      };
      reader.readAsDataURL(file);
    });
    fileInput.value = '';
    setStatus('Share your memories');
  }

  function renderPreview(entry) {
    const row = document.createElement('div');
    row.id = 'row_' + entry.id;
    row.className = 'flex items-center gap-3 bg-white border border-ink-100 rounded-2xl p-2.5 animate-rise';
    paintRow(row, entry);
    previewList.appendChild(row);
  }

  function paintRow(row, entry) {
    const statusBadge = entry.status === 'error'
      ? `<button type="button" data-retry="${entry.id}" class="text-[11px] font-bold text-primary-600 underline underline-offset-2 shrink-0">Retry</button>`
      : entry.status === 'done'
        ? `<span class="text-[11px] font-bold text-primary-600 shrink-0">\u2713 Shared</span>`
        : `<button type="button" data-remove="${entry.id}" aria-label="Remove ${entry.file.name}" class="w-8 h-8 rounded-full grid place-items-center text-ink-400 hover:bg-sand shrink-0">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6 6 18"/></svg>
           </button>`;
    const barWidth = entry.status === 'done' ? 100 : entry.status === 'error' ? 100 : entry.status === 'uploading' ? 60 : 0;
    row.innerHTML = `
      <div class="w-14 h-14 rounded-xl overflow-hidden bg-sand shrink-0">
        ${entry.type === 'video'
          ? `<video src="${entry.dataUrl}" class="w-full h-full object-cover"></video>`
          : `<img src="${entry.dataUrl}" alt="" class="w-full h-full object-cover" />`}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[13px] font-semibold text-ink-800 truncate">${entry.file.name}</p>
        <p class="text-[11px] ${entry.status === 'error' ? 'text-primary-600' : 'text-ink-400'} mt-0.5">
          ${entry.status === 'error' ? 'Couldn\u2019t upload \u2014 tap retry' : entry.status === 'done' ? 'Uploaded' : entry.status === 'uploading' ? 'Uploading\u2026' : 'Ready to share'}
        </p>
        <div class="mt-1.5 h-1.5 bg-sand rounded-full overflow-hidden">
          <div class="h-full ${entry.status === 'error' ? 'bg-primary-300' : 'bg-primary-500'} rounded-full transition-all" style="width:${barWidth}%"></div>
        </div>
      </div>
      ${statusBadge}`;
    row.querySelector('[data-remove]')?.addEventListener('click', () => {
      queue = queue.filter((q) => q.id !== entry.id);
      row.remove();
      updateSubmitState();
    });
    row.querySelector('[data-retry]')?.addEventListener('click', () => uploadOne(entry, row));
  }

  async function uploadOne(entry, row) {
    entry.status = 'uploading';
    paintRow(row, entry);
    const caption = captionInput.value.trim() || null;
    try {
      await App.api.uploadMedia(eventId, {
        file: entry.file, dataUrl: entry.dataUrl, type: entry.type, caption,
        guestName, guestId: App.session.getGuestId ? App.session.getGuestId() : undefined
      });
      entry.status = 'done';
    } catch (e) {
      entry.status = 'error';
    }
    paintRow(row, entry);
    updateSubmitState();
    return entry.status === 'done';
  }

  submitBtn.addEventListener('click', async () => {
    const toSend = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    if (!toSend.length) return;
    submitBtn.disabled = true;
    const total = toSend.length;
    setStatus(`Uploading ${total} memor${total > 1 ? 'ies' : 'y'}\u2026`);

    let successCount = 0;
    for (const entry of toSend) {
      const row = document.getElementById('row_' + entry.id);
      const ok = await uploadOne(entry, row);
      if (ok) successCount++;
    }

    const failedCount = toSend.length - successCount;
    if (failedCount === 0) {
      setStatus('Your memories have been shared! \u2764\ufe0f');
      App.ui.toast(`${successCount > 1 ? 'Memories' : 'Memory'} shared \ud83c\udf89`);
      setTimeout(closeModal, 700);
      onUploaded && onUploaded();
    } else {
      setStatus(`Something went wrong with ${failedCount} file${failedCount > 1 ? 's' : ''} \u2014 tap retry above.`);
      if (successCount) onUploaded && onUploaded();
      submitBtn.textContent = 'Retry failed uploads';
    }
    updateSubmitState();
  });
};
