/* sw.js — EliteGDX service worker (v4.4.0)
   WHAT WAS WRONG BEFORE: the fetch handler tested  url.includes('./images/…')
   against ABSOLUTE urls (https://…/images/…). That can never match, so nothing
   but one CDN file was ever served from cache and the app could not run offline
   (styles.css / app.js were not even in the list).

   STRATEGY NOW
   • App shell (html/css/js/json)  → network-first, cache fallback  (updates arrive instantly when online)
   • Images, audio, fonts, vendor   → cache-first, runtime-cached with a size cap (no bloat)
   • Pinned CDN libs                → cache-first (they are immutable by version)
   • Everything else (APIs, proxies, streams, analytics) → NOT touched by the worker
   • Update flow: new worker waits; page shows "New version ready — Refresh".  */
const VERSION = '4.5.0';
const SHELL_CACHE = 'eg-shell-' + VERSION;
const RUNTIME_CACHE = 'eg-runtime-' + VERSION;
const RUNTIME_MAX = 140;                                   // images/audio kept at most

const SHELL = [
  './', './index.html', './guide.html', './manifest.json',
  './styles/styles.css', './styles/temple.css',
  './script/libs.config.js', './script/eg-core.js', './script/eg-ephemeris.js', './script/eg-terminal.js', './script/eg-remote.js', './script/eg-cistercian.js',
  './script/eg-sky.js', './script/eg-sim.js', './script/eg-sky-commands.js', './script/eg-oled.js', './script/astro-controls.js', './script/astro-precision.js', './script/astro-bridge.js',
  './script/sephirot-sacred.js', './script/scroll-gate.js', './script/libs.vendored.js', './images/icons/EgLOGO.png',
  './script/gallery-data.js', './script/gallery.js', './script/gnosis-wheel.js', './script/firebase-config.js', './script/app.js',
  './TTC/tao-te-ching.json', './TTC/yohan-te-ching.json',
  './images/icons/favicon-32.png', './images/icons/icon-192.png',
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'www.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL.map((u) => cache.add(new Request(u, { cache: 'reload' }))));   // a missing optional file never aborts install
  })());                                                                                          // (no skipWaiting: the user decides when to switch — see message handler)
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName); const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);                       // oldest first
}

async function networkFirst(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs || 5000);
    const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
    throw err;
  }
}

async function cacheFirst(req, cacheName, cap) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req); if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) { cache.put(req, res.clone()); if (cap) trim(cacheName, cap); }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;                      // audio/video seeking must go straight to the network
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    if (req.mode === 'navigate' || /\.(html|css|js|mjs|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/')) {
      event.respondWith(networkFirst(req, SHELL_CACHE)); return;
    }
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico|mp3|ogg|wav|woff2?|ttf)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(req, /\/(icons|vendor)\//.test(url.pathname) ? SHELL_CACHE : RUNTIME_CACHE, RUNTIME_MAX)); return;
    }
    return;
  }
  if (CDN_HOSTS.includes(url.hostname) && /\.js$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE, RUNTIME_MAX)); return;
  }
  // anything else: let the browser handle it normally
});
