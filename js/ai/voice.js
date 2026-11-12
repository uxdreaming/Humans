// Voice module: microphone (Web Speech API, runs fully in the browser — no API
// keys, no backend needed) + spoken replies via speechSynthesis.
// The mic NEVER starts by itself: only via start() from an explicit user action.
// If anything is unavailable, the text chat fallback keeps working.

export function createVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micAvailable = !!SR;
  const ttsAvailable = 'speechSynthesis' in window;
  let rec = null;
  let listening = false;

  function start({ lang = 'es', onResult, onEnd, onError } = {}) {
    if (!micAvailable || listening) return false;
    rec = new SR();
    rec.lang = lang === 'es' ? 'es-ES' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => { onResult?.(e.results[0][0].transcript); };
    rec.onend = () => { listening = false; onEnd?.(); };
    rec.onerror = (e) => { listening = false; onError?.(e.error); };
    try {
      rec.start();
      listening = true;
      return true;
    } catch {
      listening = false;
      return false;
    }
  }

  function stop() {
    if (rec && listening) { try { rec.stop(); } catch { /* ignore */ } }
    listening = false;
  }

  function speak(text, lang = 'es') {
    if (!ttsAvailable || !text) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-ES' : 'en-US';
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }

  return {
    micAvailable,
    ttsAvailable,
    start,
    stop,
    speak,
    get listening() { return listening; },
  };
}
