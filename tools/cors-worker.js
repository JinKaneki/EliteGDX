/* tools/cors-worker.js — your OWN page-fetching proxy on Cloudflare Workers (free: 100k requests/day).
   Setup (5 minutes, no CLI needed):
     1. dash.cloudflare.com → Workers & Pages → Create → "Hello World" worker → Deploy → Edit code
     2. Paste this whole file, set ALLOWED below, click Deploy
     3. Copy the URL (https://xxxx.yourname.workers.dev) into  EG_CONFIG.workerUrl  in script/libs.config.js
   It only does GET, only http(s), refuses private/internal addresses, caps responses at 2 MB,
   and only answers pages that are asked for from YOUR site.  */
const ALLOWED = ['https://jinkaneki.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];
const MAX_BYTES = 2 * 1024 * 1024;

const PRIVATE = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') || '';
    const okOrigin = ALLOWED.includes(origin) ? origin : ALLOWED[0];
    const cors = { 'Access-Control-Allow-Origin': okOrigin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, OPTIONS',
                   'Access-Control-Expose-Headers': 'X-Final-URL' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'GET') return new Response('GET only', { status: 405, headers: cors });
    if (origin && !ALLOWED.includes(origin)) return new Response('origin not allowed', { status: 403, headers: cors });

    const target = new URL(req.url).searchParams.get('url');
    if (!target) return new Response('missing ?url=', { status: 400, headers: cors });
    let t; try { t = new URL(target); } catch { return new Response('bad url', { status: 400, headers: cors }); }
    if (!/^https?:$/.test(t.protocol) || PRIVATE.test(t.hostname)) return new Response('blocked', { status: 403, headers: cors });

    const res = await fetch(t.href, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EliteGDX-Remote/1.0)', 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new Response('too large', { status: 413, headers: cors });
    return new Response(buf, { status: res.status, headers: { ...cors, 'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8', 'X-Final-URL': res.url } });
  },
};
