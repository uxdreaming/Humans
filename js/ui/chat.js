// Chat panel with an NPC: text input (always available) + microphone button.
// The mic is NEVER started automatically: only from this button (explicit user
// action), and a visible "listening" badge shows while it is on.
// NPC replies are appended here and spoken via voice.speak when TTS exists
// (wired in main.js).

import { t } from '../core/i18n.js';

export function createChat({ onSend, onMicToggle, micAvailable }) {
  const root = document.getElementById('chat');
  let lang = 'es';
  let open = false;
  let lastName = '';

  root.innerHTML = `
    <div class="chat-head">
      <span id="chat-name"></span>
      <span class="listening" id="chat-listening"></span>
      <span class="spacer"></span>
      <button id="chat-mic" class="mic" title="">🎙️</button>
      <button id="chat-close" title="✕">✕</button>
    </div>
    <div id="chat-log"></div>
    <div class="chat-input">
      <input id="chat-in" type="text" autocomplete="off" spellcheck="false" />
      <button id="chat-send" title="➤">➤</button>
    </div>
  `;
  const nameEl = root.querySelector('#chat-name');
  const listeningEl = root.querySelector('#chat-listening');
  const micBtn = root.querySelector('#chat-mic');
  const closeBtn = root.querySelector('#chat-close');
  const log = root.querySelector('#chat-log');
  const input = root.querySelector('#chat-in');
  const sendBtn = root.querySelector('#chat-send');

  function applyLang() {
    nameEl.textContent = lastName ? `${t(lang, 'chat.with')} ${lastName}` : '';
    listeningEl.textContent = `● ${t(lang, 'chat.listening')}`;
    micBtn.title = t(lang, 'chat.mic');
    input.placeholder = t(lang, 'chat.ph');
    micBtn.disabled = !micAvailable;
  }

  function send() {
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    onSend(v);
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // never leak typing into game movement keys
    if (e.key === 'Enter') send();
  });
  micBtn.addEventListener('click', () => onMicToggle());
  closeBtn.addEventListener('click', () => api.close());

  const api = {
    open(npcName, l) {
      lang = l || lang;
      lastName = npcName;
      open = true;
      log.innerHTML = '';
      root.classList.remove('hidden');
      applyLang();
      input.focus();
    },
    close() {
      open = false;
      root.classList.add('hidden');
      root.classList.remove('listening');
      micBtn.classList.remove('on');
    },
    isOpen() { return open; },
    addMsg(who, text) {
      const div = document.createElement('div');
      div.className = `msg ${who}`;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    },
    setListening(b) {
      root.classList.toggle('listening', b);
      micBtn.classList.toggle('on', b);
    },
    setLang(l) { lang = l; if (open) applyLang(); else applyLang(); },
    focus() { input.focus(); },
  };
  applyLang();
  return api;
}
