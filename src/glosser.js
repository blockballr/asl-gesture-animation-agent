// glosser.js — English -> ASL gloss, the M4 "agent" stage that sits in front
// of the sign resolver. Three swappable modes:
//   passthrough : English words map straight to signs (M3 behavior)
//   rules       : local heuristic gloss (drop function words, uppercase); no network
//   gemini      : Gemini LLM via the /api/gloss serverless proxy (best grammar)
// gemini falls back to rules on any error (no key, offline, proxy down) so the
// app never dead-ends.

export const GLOSS_MODES = ['passthrough', 'rules', 'gemini'];

const DROP = new Set([
  'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'do', 'does', 'did', 'will', 'would', 'and', 'that', 'this',
]);

export function glossRules(text) {
  const toks = (text.toLowerCase().match(/[a-z'-]+/g) || []).filter((w) => !DROP.has(w));
  return toks.join(' ').toUpperCase();
}

async function glossGemini(text) {
  const resp = await fetch('/api/gloss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    let msg = `proxy ${resp.status}`;
    try { msg = (await resp.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  const { gloss } = await resp.json();
  return gloss;
}

// Returns { text, engine, error } where engine is what actually produced the
// gloss (gemini may downgrade to rules on failure).
export async function toGloss(text, mode) {
  if (mode === 'gemini') {
    try {
      return { text: await glossGemini(text), engine: 'gemini' };
    } catch (e) {
      return { text: glossRules(text), engine: 'rules', error: String(e?.message || e) };
    }
  }
  if (mode === 'rules') return { text: glossRules(text), engine: 'rules' };
  return { text, engine: 'passthrough' };
}
