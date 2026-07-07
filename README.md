# ASL Signer

Speech-to-ASL agent: spoken English in, animated sign gestures out, in the browser.

Say a word (or type it) and a 3D hand skeleton signs it back to you — real
whole-word signs where we have them, fingerspelled letter-by-letter where we
don't. No pre-recorded video: every sign is synthesized from a parametric
hand model, so the whole vocabulary is code you can read and audit.

## The pipeline

```
Speech  ──Web Speech API──▶  English text
Text    ──gloss──────────▶  ASL gloss tokens        [passthrough today; Claude agent next]
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

## Milestones

1. **Render spike** ✅ — hand plays a hardcoded landmark clip smoothly.
2. **Fingerspelling end-to-end** ✅ — mic/text → parametric A–Z handshapes,
   spelled with transitions, holds, and J/Z motion.
3. **Sign dictionary** 🚧 — whole-word signs authored procedurally (10 so far;
   ~50 target) with a fingerspell fallback for out-of-vocabulary words.
4. **Gloss layer** — Claude English→ASL gloss with a passthrough toggle.
5. **Polish** — sign blending, timing, captions, UI, a body/face reference for
   location-based signs.

## Fidelity — please read

This is a **demo and learning tool**, not a validated accessibility aid. The
signs are recognizable approximations rendered as floating hands, without the
body location and facial (non-manual) grammar that real ASL depends on. Don't
rely on it for communication until it has been evaluated by Deaf signers.
