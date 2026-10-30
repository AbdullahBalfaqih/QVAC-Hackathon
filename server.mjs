import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, access } from 'node:fs/promises';
import { validateModelOutput, validPeriod, scopeDays, EXTRACTION_PROMPT } from './public/core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DEFAULT_MODEL = path.join(ROOT, 'models', 'Qwen2.5-1.5B-Instruct.Q4_K_M.gguf');
const MODEL = process.env.MODEL_PATH ? path.resolve(process.env.MODEL_PATH) : DEFAULT_MODEL;
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4174);
const PREVIEW = process.env.ATHAR_PREVIEW === '1';
// Default to the logical CPUs available to this process, with a conservative safety cap.
const AVAILABLE_THREADS = Math.max(1, Math.min(64, os.availableParallelism()));
const rawThreads = process.env.ATHAR_THREADS;
if (rawThreads !== undefined && (!/^[1-9]\d*$/.test(rawThreads) || Number(rawThreads) > AVAILABLE_THREADS)) {
  console.error(`ATHAR_THREADS must be an integer between 1 and ${AVAILABLE_THREADS}.`);
  process.exit(1);
}
const THREADS = rawThreads === undefined ? AVAILABLE_THREADS : Number(rawThreads);
const state = { phase: 'loading', error: null, modelId: null, busy: false, sdk: null };
const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/core.mjs': ['core.mjs', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/fonts/InterVariable.woff2': ['fonts/InterVariable.woff2', 'font/woff2'],
  '/fonts/NotoSansArabic.woff2': ['fonts/NotoSansArabic.woff2', 'font/woff2'],
  '/avatars/portrait-01.jpg': ['avatars/portrait-01.jpg', 'image/jpeg'],
  '/avatars/portrait-02.jpg': ['avatars/portrait-02.jpg', 'image/jpeg'],
  '/avatars/portrait-03.jpg': ['avatars/portrait-03.jpg', 'image/jpeg'],
  '/avatars/portrait-04.jpg': ['avatars/portrait-04.jpg', 'image/jpeg'],
  '/avatars/portrait-05.jpg': ['avatars/portrait-05.jpg', 'image/jpeg'],
  '/avatars/portrait-06.jpg': ['avatars/portrait-06.jpg', 'image/jpeg']
};
const security = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN'
};
// X-Frame-Options is omitted for preview because the Arena live preview is embedded.
if (PREVIEW) delete security['X-Frame-Options'];

function reply(res, status, payload) {
  res.writeHead(status, { ...security, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
function validLocalHost(raw) {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${raw}`).hostname); }
  catch { return false; }
}
function sameOrigin(req) {
  if (req.headers['x-athar-client'] !== '1' || !String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return false;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const forwarded = PREVIEW ? String(req.headers['x-forwarded-host'] || '').split(',')[0].trim() : '';
    return host === req.headers.host || (!!forwarded && host === forwarded);
  } catch { return false; }
}
async function readJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_000) throw new Error('The request exceeds the allowed size.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('The request body is not valid JSON.'); }
}
async function extract(text, period, start, end) {
  const started = performance.now();
  const history = [
    { role: 'system', content: EXTRACTION_PROMPT },
    { role: 'user', content: text }
  ];
  const run = state.sdk.completion({ modelId: state.modelId, history, stream: true, generationParams: { temp: 0, predict: 190 } });
  let generated = '';
  for await (const event of run.events) {
    if (event.type === 'contentDelta') generated += event.text;
    if (event.type === 'toolError') throw new Error('Local analysis could not be completed.');
  }
  const final = await run.final;
  const checked = validateModelOutput(generated || final?.contentText || '', text, scopeDays(start, end, period));
  return { ...checked, elapsedMs: Math.round(performance.now() - started), sourceLength: text.length, engine: '@qvac/sdk 0.22.0', reviewRequired: true };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!PREVIEW && !validLocalHost(req.headers.host || '')) return reply(res, 403, { error: 'Local host required.' });
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return reply(res, 200, {
        phase: state.phase, error: state.error, busy: state.busy, execution: PREVIEW ? 'remote-preview' : 'local',
        model: path.basename(MODEL), sdk: '@qvac/sdk 0.22.0', platform: `${os.platform()} ${os.arch()}`, device: 'cpu', threads: THREADS,
        storage: 'browser-local-unencrypted', serverSavesCases: false
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/extract') {
      if (!sameOrigin(req)) return reply(res, 403, { error: 'Send the request from the app on the same origin.' });
      if (state.phase !== 'ready') return reply(res, 503, { error: state.error || 'The model is not ready yet.' });
      if (state.busy) return reply(res, 429, { error: 'A previous analysis is still running. Please wait.' });
      let body;
      try { body = await readJson(req); } catch (error) { return reply(res, 400, { error: error.message }); }
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (text.length < 5 || text.length > 1600 || !validPeriod(body.period) || !scopeDays(body.scopeStart, body.scopeEnd, body.period)) return reply(res, 400, { error: 'Enter 5–1,600 characters and a valid date range within one month.' });
      state.busy = true;
      try { return reply(res, 200, await extract(text, body.period, body.scopeStart, body.scopeEnd)); }
      catch (error) { return reply(res, 422, { error: error.message || 'Analysis failed. Review the text manually.' }); }
      finally { state.busy = false; }
    }
    if (req.method === 'GET' && Object.hasOwn(assets, url.pathname)) {
      const [relative, type] = assets[url.pathname];
      const data = await readFile(path.join(PUBLIC, relative));
      res.writeHead(200, {
        ...security, 'Content-Type': type,
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"
      });
      return res.end(data);
    }
    return reply(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error('Request failed:', error.message);
    if (!res.headersSent) return reply(res, 500, { error: 'The request could not be completed.' });
    res.end();
  }
});

server.listen(PORT, HOST, () => console.log(`Athar listening at http://${HOST}:${PORT} (${PREVIEW ? 'remote preview: do not enter sensitive data' : 'local'})`));
(async () => {
  try {
    await access(MODEL);
    state.sdk = await import('@qvac/sdk');
    state.modelId = await state.sdk.loadModel({ modelSrc: MODEL, modelType: 'llamacpp-completion', modelConfig: { device: 'cpu', gpu_layers: 0, ctx_size: 2048, threads: THREADS } });
    state.phase = 'ready';
    console.log(`QVAC ready: ${path.basename(MODEL)} (CPU threads: ${THREADS})`);
  } catch (error) {
    state.phase = 'error';
    state.error = error.code === 'ENOENT' ? 'Model file not found. Download it once with npm run model:download.' : `Unable to load model: ${error.message}`;
    console.error(state.error);
  }
})();
async function shutdown() {
  server.close();
  try { if (state.modelId) await state.sdk.unloadModel({ modelId: state.modelId }); if (state.sdk) await state.sdk.close(); } catch {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
