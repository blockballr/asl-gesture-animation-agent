# ASL Signer

Speech-to-ASL agent: spoken English in, animated sign gestures out, in the browser.

**Status:** Milestone 1 — render spike. A hand skeleton driven by a hardcoded
landmark keyframe clip, animating in Three.js. This proves the scariest unknown
(the renderer) and establishes the data contract every future sign flows through.

## The pipeline (target)

```
Speech  ──Web Speech API──▶  English text
Text    ──Claude (gloss)──▶  ASL gloss tokens        [swappable, passthrough toggle]
Gloss   ──dictionary──────▶  landmark sequence       [+ fingerspell fallback]
Pose    ──Three.js────────▶  3D skeleton avatar      [face/hands/body channels]
```

## The data contract

A **sign clip** is `{ name, fps, frames }` where `frames` is an array of
frames, and each frame is 21 `[x, y, z]` landmarks in MediaPipe Hand order.
That is exactly what MediaPipe Holistic emits, so captured signs will drop
straight into the same renderer that plays today's hand-authored wave.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. You should see a glowing hand skeleton waving.
Drag to orbit, scroll to zoom.

## Milestones

1. **Render spike** ← you are here — hand plays a hardcoded clip smoothly.
2. Fingerspelling end-to-end — mic → text → spell it letter-by-letter.
3. Sign dictionary (~50 signs) via MediaPipe capture + fingerspell fallback.
4. Gloss layer — Claude English→ASL gloss with a passthrough toggle.
5. Polish — sign blending, timing, captions, UI.

> v1 is a demo / learning tool. It is **not** a validated accessibility aid —
> that requires Deaf-signer evaluation before anyone relies on it.
