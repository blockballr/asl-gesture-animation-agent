// _gemini.js — shared Gemini call for the ASL gloss proxy. The underscore
// prefix keeps Vercel from treating this as a route; it is imported by
// api/gloss.js (production) and by the Vite dev middleware (local dev) so both
// share one implementation. Uses global fetch (Node 18+).

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Whole-word signs the renderer knows; the model is nudged to prefer these so
// more output renders as signs. Unknown tokens fall back to fingerspelling
// downstream (still works, just slower to read).
const KNOWN =
  'ME YOU WE THEY MY YOUR WHAT WHERE WHO WHEN WHY HOW YES NO NOT MAYBE HELLO ' +
  'THANK-YOU PLEASE SORRY NAME FINE WANT NEED HAVE LIKE KNOW THINK GO COME SEE ' +
  'EAT DRINK HELP LOVE LEARN FINISH UNDERSTAND GOOD BAD MORE HAPPY SAD HUNGRY ' +
  'HOME FRIEND WORK TIME WATER DEAF SIGN';

export const SYSTEM_PROMPT = `You translate English into American Sign Language (ASL) GLOSS.
ASL gloss is the ordered sequence of signs a signer produces, written in CAPITALS.
Rules:
- Output ONLY the gloss tokens, space-separated, on a single line. No punctuation, no quotes, no explanation.
- Drop English function words ASL does not sign: articles (a/an/the) and the verb "be" (is/am/are/was/were).
- Use ASL order: topic-comment, with TIME words first ("I went home yesterday" -> "YESTERDAY ME GO HOME").
- Express negation with the sign NOT ("I don't know" -> "ME KNOW NOT").
- Use the base form of each sign (GO not GOING, EAT not ATE).
- Prefer these known signs when they fit, spelled exactly: ${KNOWN}.
- For a name or a word with no sign, keep it as one uppercase token (it will be fingerspelled).
Return only the gloss line.`;

export async function callGemini(text, apiKey) {
  const prompt = `${SYSTEM_PROMPT}\n\nEnglish: ${text}\nGloss:`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
  };
  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status}: ${detail.slice(0, 200)}`);
  }
  const data = await resp.json();
  const out = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  const gloss = out.trim().split(/\r?\n/)[0].trim();
  if (!gloss) throw new Error('Gemini returned an empty gloss');
  return gloss;
}
