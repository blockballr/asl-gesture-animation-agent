import { defineConfig, loadEnv } from 'vite';
import { callGemini } from './api/_gemini.js';

// Serve POST /api/gloss during `npm run dev`, using the same Gemini core as the
// Vercel function so the gloss engine works locally without deploying. The key
// comes from a gitignored .env (GEMINI_API_KEY=...). In production the Vercel
// function owns this route instead; this middleware only runs in dev.
function glossDevServer(env) {
  return {
    name: 'gloss-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/gloss', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
        const key = env.GEMINI_API_KEY;
        const json = (code, obj) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        if (!key) return json(500, { error: 'GEMINI_API_KEY not set in .env' });
        const chunks = [];
        for await (const c of req) chunks.push(c);
        let text = '';
        try { text = String(JSON.parse(Buffer.concat(chunks).toString('utf8')).text || ''); } catch { /* noop */ }
        if (!text.trim()) return json(400, { error: 'missing text' });
        try {
          const gloss = await callGemini(text.trim(), key);
          json(200, { gloss });
        } catch (e) {
          json(502, { error: String(e?.message || e) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads unprefixed vars (GEMINI_API_KEY) for server-side use only;
  // it is never referenced from client code, so it stays out of the bundle.
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [glossDevServer(env)] };
});
