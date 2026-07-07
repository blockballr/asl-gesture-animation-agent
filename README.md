# HandGloss

A speech-to-ASL engine: spoken English in, animated sign gestures out, in the browser.

The name is the pipeline: **hand** (the synthesized signing) plus **gloss** (the
English-to-ASL gloss layer that decides what to sign).

Say a word (or type it) and a 3D hand skeleton signs it back to you — real
whole-word signs where we have them, fingerspelled letter-by-letter where we
don't. No pre-recorded video: every sign is synthesized from a parametric
hand model, so the whole vocabulary is code you can read and audit.

## The pipeline

```
Speech  ──Web Speech API──▶  English text
Text    ──gloss──────────▶  ASL gloss tokens        [passthrough · local rules · Gemini]
Gloss   ──dictionary──────▶  landmark sequence       [+ fingerspell fallback for unknown words]
Pose    ──Three.js────────▶  3D hand-skeleton avatar
```

Every word either resolves to a **procedurally authored sign** (handshape +
location + rotation + movement, synthesized to a landmark clip) or falls back
to **fingerspelling** the letters. Clips are concatenated with blended
transitions so the hands glide from one word to the next.

## The data contract

A **sign clip** is `{ name, fps, frames }` where each frame is 21 `[x, y, z]`
landmarks in MediaPipe Hand order (two hands for two-handed signs). That is
exactly what MediaPipe Holistic emits, so motion-captured signs can drop
straight into the same renderer that plays today's hand-authored ones.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL in **Chrome or Edge** (the mic uses the Web
Speech API). Click the mic and speak, or type a word and hit sign. Drag to
orbit, scroll to zoom. Try: `hello`, `thank you`, `good`, `name`, or your own
name (it'll fingerspell it).

## Gloss engine (English → ASL)

Pick an engine in the UI:

- **Passthrough** — each English word maps straight to a sign (or is fingerspelled). No grammar.
- **Rules** — a local heuristic: drops function words (a/the/is/are…), uppercases. No network, always works.
- **Gemini** — sends the sentence to Google's Gemini for real ASL gloss (reordering, dropping copula, negation). Falls back to Rules if the key/proxy/network is unavailable, so it never dead-ends.

Gemini runs through a **serverless proxy** (`api/gloss.js`) that keeps your API key server-side — it is never shipped to the browser.

**Local dev:** copy `.env.example` to `.env` and paste your key (`GEMINI_API_KEY=...`). `npm run dev` serves the proxy route locally via a Vite middleware. Get a key at https://aistudio.google.com/apikey.

**Deploy (Vercel):** import the repo, and set `GEMINI_API_KEY` in Project Settings → Environment Variables. Vercel serves `api/gloss.js` as a function automatically; the static site + proxy deploy together.

## Milestones

1. **Render spike** ✅ — hand plays a hardcoded landmark clip smoothly.
2. **Fingerspelling end-to-end** ✅ — mic/text → parametric A–Z handshapes,
   spelled with transitions, holds, and J/Z motion.
3. **Sign dictionary** ✅ — 51 whole-word signs authored procedurally, with a
   fingerspell fallback for out-of-vocabulary words and a faint head/shoulders
   reference so location-based signs read against the body.
4. **Gloss layer** 🚧 — English→ASL gloss with three swappable engines:
   passthrough, local rules, and Gemini (via a serverless proxy).
5. **Polish** — sign blending, timing, captions, UI, a fuller body/face channel.

## Fidelity — please read

This is a **demo and learning tool**, not a validated accessibility aid. The
signs are recognizable approximations rendered as floating hands, without the
body location and facial (non-manual) grammar that real ASL depends on. Don't
rely on it for communication until it has been evaluated by Deaf signers.
