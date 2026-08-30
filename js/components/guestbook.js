App.components = App.components || {};

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
const AVATAR_TONES = ['bg-primary-100 text-primary-700', 'bg-gold-500/15 text-gold-600', 'bg-blush text-primary-700', 'bg-sand text-ink-600'];
function toneFor(name) {
  let sum = 0; for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

App.components.guestbookComposer = function renderGuestbookComposer(guestName) {
  return `
  <div class="bg-white rounded-3xl shadow-soft p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-full ${toneFor(guestName)} grid place-items-center font-semibold text-sm shrink-0">${initials(guestName)}</div>
      <div class="flex-1">
        <textarea id="guestbookInput" rows="2" maxlength="240" placeholder="Write something\u2026"
          class="w-full resize-none rounded-2xl border border-ink-200 px-4 py-3 text-[15px] placeholder:text-ink-300 focus:border-primary-400 focus:ring-0"></textarea>
        <div class="flex items-center justify-between mt-2.5">
          <span id="guestbookCount" class="text-[12px] text-ink-300">0 / 240</span>
          <button type="button" id="guestbookSubmit" disabled
            class="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full bg-primary-500 disabled:bg-ink-200 disabled:text-ink-400 text-white font-semibold text-sm active:scale-95 transition-all">
            Leave Message
          </button>
        </div>
      </div>
    </div>
  </div>`;
};

App.components.guestbookCard = function renderGuestbookCard(msg, i) {
  const date = new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
  <div class="bg-white rounded-3xl shadow-soft p-5 animate-rise" style="animation-delay:${Math.min(i * 40, 300)}ms">
    <p class="text-[15px] text-ink-800 leading-relaxed">\u201c${msg.message}\u201d</p>
    <div class="flex items-center gap-2.5 mt-4">
      <div class="w-8 h-8 rounded-full ${toneFor(msg.guestName)} grid place-items-center font-semibold text-[11px] shrink-0">${initials(msg.guestName)}</div>
      <div class="leading-tight">
        <p class="text-[13px] font-semibold text-ink-800">${msg.guestName}</p>
        <p class="text-[11px] text-ink-400">${date}</p>
      </div>
    </div>
  </div>`;
};

App.components.guestbookList = function renderGuestbookList(messages) {
  if (!messages.length) {
    return `
    <div class="text-center py-14 px-6">
      <div class="w-16 h-16 mx-auto rounded-full bg-sand grid place-items-center text-2xl mb-4">\ud83d\udcac</div>
      <p class="font-display font-semibold text-lg text-ink-800">No messages yet</p>
      <p class="text-ink-400 text-sm mt-1">Leave the first note for everyone to remember.</p>
    </div>`;
  }
  return `<div class="space-y-3">${messages.map((m, i) => App.components.guestbookCard(m, i)).join('')}</div>`;
};

App.components.initGuestbookComposer = function initGuestbookComposer({ eventId, guestName, onPosted }) {
  const input = document.getElementById('guestbookInput');
  const count = document.getElementById('guestbookCount');
  const btn = document.getElementById('guestbookSubmit');
  if (!input) return;
  input.addEventListener('input', () => {
    count.textContent = `${input.value.length} / 240`;
    btn.disabled = input.value.trim().length === 0;
  });
  btn.addEventListener('click', async () => {
    const message = input.value.trim();
    if (!message) return;
    btn.disabled = true;
    btn.textContent = 'Posting\u2026';
    try {
      await App.api.submitGuestbookMessage(eventId, { message, guestName });
      input.value = '';
      count.textContent = '0 / 240';
      App.ui.toast('Message posted \ud83d\udc9d');
      onPosted && onPosted();
      btn.textContent = 'Leave Message';
      btn.disabled = true;
    } catch (e) {
      App.ui.toast('Couldn\u2019t post your message \u2014 try again', { icon: '\u26a0\ufe0f' });
      btn.textContent = 'Leave Message';
      btn.disabled = false;
    }
  });
};
