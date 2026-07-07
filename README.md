# HandGloss

A speech-to-ASL engine. You speak or type English, and a 3D hand skeleton signs
it back in the browser. The name describes the pipeline: hand, the synthesized
signing, plus gloss, the English-to-ASL gloss layer that decides what to sign.

Known whole-word signs are played where the vocabulary has them, and anything
else is fingerspelled letter by letter. There is no pre-recorded video. Every
sign is synthesized from a parametric hand model, so the whole vocabulary is
code you can read and audit.

## The pipeline

Speech is captured with the browser Web Speech API and turned into English text.
That text goes through the gloss stage, which produces the ordered ASL gloss
tokens; you can pick passthrough, local rules, or Gemini, all described below.
Each gloss token is resolved against the sign dictionary into a landmark
sequence, and words with no known sign fall back to fingerspelling. The
resulting pose stream is rendered by Three.js as a 3D hand skeleton. Clips are
concatenated with blended transitions so the hands glide from one word to the
next. Every word either resolves to a procedurally authored sign, meaning a
handshape, location, rotation, and movement synthesized into a landmark clip, or
is fingerspelled.

## The data contract

A sign clip is an object of the form { name, fps, frames }, where each frame is
21 [x, y, z] landmarks in MediaPipe hand order, with two hands for two-handed
signs. That is exactly what MediaPipe Holistic emits, so motion-captured signs
can drop straight into the same renderer that plays today's hand-authored ones.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL in Chrome or Edge, since the mic uses the Web
Speech API. Click the mic and speak, or type a word and press sign. Drag to
orbit and scroll to zoom. Try hello, thank you, good, or your own name, which it
will fingerspell.

## Gloss engine

The gloss engine turns English into ASL gloss, and you pick one of three modes in
the UI. Passthrough maps each English word straight to a sign, or fingerspells
it, with no grammar. Rules is a local heuristic that drops function words such as
a, the, is, and are, then uppercases the rest; it needs no network and always
works. Gemini sends the sentence to Google's Gemini for real ASL gloss,
including reordering, dropping the copula, and negation, and it falls back to
Rules if the key, proxy, or network is unavailable, so it never dead-ends.

Gemini runs through a serverless proxy at api/gloss.js that keeps your API key
server-side, so the key is never shipped to the browser. For local development,
copy .env.example to .env and paste your key as GEMINI_API_KEY. Running npm run
dev serves the proxy route locally through a Vite middleware. You can get a key
at https://aistudio.google.com/apikey. To deploy on Vercel, import the repo and
set GEMINI_API_KEY in Project Settings under Environment Variables; Vercel serves
api/gloss.js as a function automatically, so the static site and the proxy deploy
together.

## Milestones

1. Render spike, done. The hand plays a hardcoded landmark clip smoothly.
2. Fingerspelling end to end, done. Mic and text input map to parametric A to Z
   handshapes, spelled with transitions, holds, and J and Z motion.
3. Sign dictionary, done. 51 whole-word signs authored procedurally, with a
   fingerspell fallback for out-of-vocabulary words and a faint head and
   shoulders reference so location-based signs read against the body.
4. Gloss layer, in progress. English to ASL gloss with three swappable engines:
   passthrough, local rules, and Gemini through a serverless proxy.
5. Polish, pending. Sign blending, timing, captions, UI, and a fuller body and
   face channel.

## Fidelity, please read

This is a demo and learning tool, not a validated accessibility aid. The signs
are recognizable approximations rendered as floating hands, without the body
location and facial (non-manual) grammar that real ASL depends on. Do not rely
on it for communication until it has been evaluated by Deaf signers.
