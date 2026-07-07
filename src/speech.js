// speech.js — Web Speech API wrapper (Chrome/Edge).
//
// createSpeech emits interim + final transcripts via callbacks and reports
// listening state. Returns { supported:false } where the API is unavailable
// (e.g. Firefox) so the UI can fall back to the text input.

export function createSpeech({ onResult, onState } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { supported: false };

  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let listening = false;

  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += chunk;
      else interim += chunk;
    }
    onResult?.({ interim, final });
  };
  rec.onstart = () => { listening = true; onState?.('listening'); };
  rec.onend = () => { listening = false; onState?.('idle'); };
  rec.onerror = (e) => { onState?.('error', e.error); };

  return {
    supported: true,
    get listening() { return listening; },
    start() { if (!listening) { try { rec.start(); } catch { /* already starting */ } } },
    stop() { if (listening) rec.stop(); },
  };
}
