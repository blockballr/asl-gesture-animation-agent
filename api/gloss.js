// gloss.js - serverless proxy: POST { text } -> { gloss }. Holds the Gemini
// API key server-side (env GEMINI_API_KEY) so it never reaches the browser.
// Deployed as a Vercel function; the same route is served in local dev by the
// middleware in vite.config.js.

import { callGemini } from './_gemini.js';

async function readText(req) {
  // Vercel may pre-parse JSON bodies; otherwise read the raw stream.
  if (req.body && typeof req.body === 'object' && 'text' in req.body) return String(req.body.text || '');
  if (typeof req.body === 'string') {
    try { return String(JSON.parse(req.body).text || ''); } catch { return ''; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return '';
  try { return String(JSON.parse(Buffer.concat(chunks).toString('utf8')).text || ''); } catch { return ''; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' }); return; }
  const text = (await readText(req)).trim();
  if (!text) { res.status(400).json({ error: 'missing text' }); return; }
  try {
    const gloss = await callGemini(text, apiKey);
    res.status(200).json({ gloss });
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e) });
  }
}
