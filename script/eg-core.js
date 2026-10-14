/* =====================================================================
   eg-core.js  —  EliteGDX foundation layer            (v4.4.0)
   Load order:  libs.config.js  ->  eg-core.js  ->  ...  ->  app.js
   Plain classic script (no modules, no build step).
   Gives you:  EG.store   namespaced, crash-proof localStorage
               EG.loadLib lazy, pinned, SRI-aware library loader
               EG.next    visibility-aware render scheduler (battery saver)
               EG.sanitizeHTML / EG.esc / EG.safeUrl   (anti-XSS)
               EG.history persistent terminal history (secrets excluded)
   ===================================================================== */
(function (global) {
  'use strict';
  const EG = (global.EG = global.EG || {});
  EG.VERSION = '4.5.0';

  /* ------------------------------------------------------------------
     1. STORE — namespaced localStorage
     GitHub Pages serves every project of a user from ONE origin
     (jinkaneki.github.io), so un-prefixed keys collide with your other
     projects and localStorage.clear() wipes THEIR data too.
     Everything now lives under  "eg:"  and nuke only removes those.
     ------------------------------------------------------------------ */
  const NS = 'eg:';
  const LEGACY_KEYS = [
    'eliteGDX_version', 'akashic_graph', 'elite-color-profile',
    'akashic_handshake_key', 'akashic_tags', 'eliteGDX_tour_seen', 'eliteGDX_guide_shown'
  ];
  const memory = new Map(); // used when storage is blocked (Safari private mode, etc.)
  const ls = () => { try { return global.localStorage; } catch (e) { return null; } };

  const store = {
    get(key, fallback = null) {
      try { const s = ls(); const v = s ? s.getItem(NS + key) : memory.get(key); return v == null ? fallback : v; }
      catch (e) { return memory.has(key) ? memory.get(key) : fallback; }
    },
    set(key, value) {
      const v = String(value);
      try { const s = ls(); if (s) s.setItem(NS + key, v); else memory.set(key, v); return true; }
      catch (e) { memory.set(key, v); return false; }
    },
    remove(key) { try { const s = ls(); if (s) s.removeItem(NS + key); } catch (e) {} memory.delete(key); },
    getJSON(key, fallback) { try { const v = store.get(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    setJSON(key, obj) { return store.set(key, JSON.stringify(obj)); },
    /** All keys that belong to EliteGDX (new + legacy). */
    keys() {
      const out = []; const s = ls(); if (!s) return [...memory.keys()];
      for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && (k.startsWith(NS) || LEGACY_KEYS.includes(k))) out.push(k); }
      return out;
    },
    /** Factory reset — removes ONLY EliteGDX keys. Returns how many were removed. */
    clearAll() {
      const s = ls(); let n = 0;
      if (s) store.keys().forEach(k => { try { s.removeItem(k); n++; } catch (e) {} });
      n += memory.size; memory.clear(); return n;
    },
    /** One-time move of pre-4.4 keys into the namespace. */
    migrate() {
      const s = ls(); if (!s) return 0; let moved = 0;
      LEGACY_KEYS.forEach(k => {
        try {
          const v = s.getItem(k);
          if (v != null) { if (s.getItem(NS + k) == null) { s.setItem(NS + k, v); moved++; } s.removeItem(k); }
        } catch (e) {}
      });
      return moved;
    }
  };
  EG.store = store;
  store.migrate();

  /* ------------------------------------------------------------------
     2. ESCAPING + URL SAFETY
     ------------------------------------------------------------------ */
  EG.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"'`]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
  };
  /** Returns a normalised http(s) URL string or null. Never lets javascript:/data: through. */
  EG.safeUrl = function (u, base) {
    try { const x = new URL(String(u).trim(), base || global.location.href); return /^https?:$/.test(x.protocol) ? x.href : null; }
    catch (e) { return null; }
  };

  /* ------------------------------------------------------------------
     3. HTML SANITIZER  (allow-list, DOM based — used on every command
        that renders third-party content)
     ------------------------------------------------------------------ */
  const OK_TAGS = new Set(['A','B','STRONG','I','EM','U','S','BR','P','DIV','SPAN','CODE','PRE','SMALL','SUB','SUP','UL','OL','LI',
    'TABLE','THEAD','TBODY','TR','TD','TH','H1','H2','H3','H4','H5','H6','IMG','HR','BLOCKQUOTE','DETAILS','SUMMARY','MARK']);
  const OK_ATTR = new Set(['class', 'style', 'title', 'href', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'loading']);
  const BAD_STYLE = /url\s*\(|expression|@import|behavior|position\s*:\s*(fixed|sticky)|z-index/i;

  EG.sanitizeHTML = function (html) {
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html == null ? '' : html), 'text/html');
    (function walk(node) {
      Array.from(node.children).forEach(el => {
        if (!OK_TAGS.has(el.tagName)) { el.remove(); return; }            // drops script/iframe/svg/form/style/…
        Array.from(el.attributes).forEach(a => {
          const n = a.name.toLowerCase();
          if (!OK_ATTR.has(n)) { el.removeAttribute(a.name); return; }    // drops every on*= handler
          if (n === 'href') {
            const ok = /^mailto:/i.test(a.value) ? a.value : EG.safeUrl(a.value);
            ok ? el.setAttribute('href', ok) : el.removeAttribute('href');
          } else if (n === 'src') {
            const v = a.value.trim();
            const ok = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(v) ? v : EG.safeUrl(v);
            ok ? el.setAttribute('src', ok) : el.removeAttribute('src');
          } else if (n === 'style' && BAD_STYLE.test(a.value)) {
            el.removeAttribute('style');
          }
        });
        if (el.tagName === 'A' && el.hasAttribute('href')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer nofollow'); }
        if (el.tagName === 'IMG') { el.setAttribute('referrerpolicy', 'no-referrer'); el.setAttribute('loading', 'lazy'); }
        walk(el);
      });
    })(doc.body);
    return doc.body.innerHTML;
  };

  /* ------------------------------------------------------------------
     4. LAZY LIBRARY LOADER
     Config lives in script/libs.config.js (pinned versions) and the
     optional generated script/libs.vendored.js (local copies + SRI).
     ------------------------------------------------------------------ */
  const loading = {};
  const isReady = (cfg) => { try { return !!cfg.ready(); } catch (e) { return false; } };

  function inject(src, integrity, timeoutMs, plain) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      if (!plain) { s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer'; }
      if (integrity && !plain) s.integrity = integrity;
      const t = setTimeout(() => { s.remove(); reject(new Error('timeout ' + src)); }, timeoutMs || 15000);
      s.onload = () => { clearTimeout(t); resolve(); };
      s.onerror = () => { clearTimeout(t); s.remove(); reject(new Error('failed ' + src)); };
      document.head.appendChild(s);
    });
  }

  EG.loadLib = function (name) {
    const reg = global.EG_LIBS || {};
    const cfg = reg[name];
    if (!cfg) return Promise.reject(new Error('Unknown library: ' + name));
    if (isReady(cfg)) return Promise.resolve(true);
    if (loading[name]) return loading[name];

    const vend = (global.EG_VENDORED || {})[name];
    const sources = [];
    if (vend) sources.push({ src: vend.src, integrity: vend.integrity });     // 1) your own vendored copy
    if (cfg.cdn) sources.push({ src: cfg.cdn, integrity: cfg.integrity });     // 2) pinned CDN
    EG.libStatus[name] = 'loading';

    loading[name] = (async () => {
      for (const dep of (cfg.deps || [])) await EG.loadLib(dep);
      let lastErr;
      for (const s of sources) {
        try {
          await inject(s.src, s.integrity, cfg.timeout, cfg.plain);
          // some libs (YouTube API) set their global a moment after onload
          for (let i = 0; i < 40 && !isReady(cfg) && !cfg.noWait; i++) await new Promise(r => setTimeout(r, 100));
          if (isReady(cfg) || cfg.noWait) { EG.libStatus[name] = 'ready (' + (s.src.startsWith('http') ? 'cdn' : 'local') + ')'; return true; }
        } catch (e) { lastErr = e; }
      }
      EG.libStatus[name] = 'FAILED';
      delete loading[name];
      throw lastErr || new Error('Could not load ' + name);
    })();
    return loading[name];
  };
  EG.libStatus = {};

  /** Which libs does a terminal command need? (names only) */
  EG.needsList = function (cmd, args) {
    const a0 = (args && args[0] || '').toLowerCase();
    const want = [];
    if (cmd === 'chat') {
      if (a0 === 'mqtt' || a0 === '-all') want.push('mqtt');
      if (a0 === 'p2p' || a0 === '-all') want.push('peerjs');
      if (a0 === 'firebase' || a0 === '-all') want.push('firebase-db');
    }
    if (cmd === 'qr') want.push('qrcode');
    if (['iptv', 'ipset', 'tv', 'radio'].includes(cmd) || (cmd === 'play' && ['iptv', 'audio', 'video'].includes(a0))) want.push('hls');
    if (cmd === 'tv' || (cmd === 'play' && ['youtube', 'yt', 'playlist'].includes(a0))) want.push('youtube');
    return want;
  };
  EG.libReady = (name) => { const c = (global.EG_LIBS || {})[name]; return !!c && isReady(c); };
  /** Loads whatever the command needs; shows a one-line status only if something must be downloaded. */
  EG.needs = async function (cmd, args) {
    const todo = EG.needsList(cmd, args).filter(n => !EG.libReady(n));
    if (!todo.length) return;
    const box = document.getElementById('cmd-output'); let line = null;
    if (box) { line = document.createElement('div'); line.style.color = '#888'; line.textContent = '⏳ loading ' + todo.join(', ') + ' …'; box.appendChild(line); }
    const res = await Promise.allSettled(todo.map(n => EG.loadLib(n)));   // allSettled: one failure no longer kills the command
    line && line.remove();
    const bad = todo.filter((n, i) => res[i].status === 'rejected');
    if (bad.length && box) { const w = document.createElement('div'); w.style.color = '#ffaa00'; w.textContent = '⚠️ could not load: ' + bad.join(', ') + ' — continuing without it'; box.appendChild(w); }
  };

  /* ------------------------------------------------------------------
     5. RENDER-ON-DEMAND SCHEDULER
     Drop-in replacement for requestAnimationFrame in self-rescheduling
     draw loops.  A loop now:
       • sleeps completely when its tab is hidden or its canvas is not
         on screen / not displayed,
       • runs at 1 fps when simulated time is real-time (1x),
       • wakes instantly on any click/key so buttons still feel live.
     ------------------------------------------------------------------ */
  const stats = (EG.loopStats = {});
  const waiting = new Map();           // id -> { wake() }
  const visCache = new WeakMap();
  let seq = 1, io = null;

  function ensureIO() {
    if (io || !('IntersectionObserver' in global)) return;
    io = new IntersectionObserver(es => es.forEach(e => visCache.set(e.target, e.isIntersecting)), { threshold: 0 });
  }
  EG.isVisible = function (el) {
    if (!el) return true;
    if (!el.getClientRects().length) return false;                     // display:none somewhere up the tree
    ensureIO();
    if (io && !visCache.has(el)) { visCache.set(el, true); io.observe(el); }  // optimistic until the observer reports
    return visCache.get(el) !== false;
  };

  /** ms between frames for a clock-like simulation. */
  EG.rateInterval = function (playing, speed) {
    if (!playing) return 250;     // paused: a gentle refresh keeps buttons responsive
    if (speed <= 1) return 1000;  // real time: one repaint per second is visually identical
    if (speed <= 60) return 120;
    return 0;                     // fast-forward: full smoothness
  };

  EG.next = function (name, fn, opt) {
    opt = opt || {};
    const id = seq++;
    const st = (stats[name] = stats[name] || { frames: 0, state: 'idle', times: [] });
    let timer = null, raf = null, done = false;

    const cleanup = () => { done = true; waiting.delete(id); clearTimeout(timer); if (raf) cancelAnimationFrame(raf); };
    const fire = () => {
      if (done) return; cleanup();
      st.frames++; st.state = 'running';
      const now = performance.now(); st.times.push(now); if (st.times.length > 40) st.times.shift();
      try { fn(now); } catch (e) { console.error('[EG.next:' + name + ']', e); }
    };
    const tick = () => {
      if (done) return;
      if (document.hidden || !EG.isVisible(opt.el)) {                  // parked: costs ~nothing
        st.state = document.hidden ? 'parked (tab hidden)' : 'parked (not visible)';
        timer = setTimeout(tick, 400); return;
      }
      const iv = typeof opt.interval === 'function' ? opt.interval() : (opt.interval || 0);
      if (iv <= 20) { st.state = 'smooth'; raf = requestAnimationFrame(fire); }
      else { st.state = 'throttled ' + iv + 'ms'; timer = setTimeout(() => { if (!done) raf = requestAnimationFrame(fire); }, iv); }
    };
    waiting.set(id, { wake() { if (done) return; clearTimeout(timer); raf = requestAnimationFrame(fire); }, cancel: cleanup });
    tick();
    return id;
  };
  /** Cancel a pending EG.next() token (replacement for cancelAnimationFrame). */
  EG.cancel = function (id) { const w = waiting.get(id); if (w) w.cancel(); };

  // any user input => repaint now (so a paused/1fps view reacts instantly)
  ['pointerup', 'keyup', 'input'].forEach(ev =>
    document.addEventListener(ev, () => waiting.forEach(w => w.wake()), true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) waiting.forEach(w => w.wake()); });

  EG.perfReport = function () {
    const now = performance.now();
    return Object.keys(stats).map(k => {
      const t = stats[k].times.filter(x => now - x < 5000);
      return { loop: k, state: stats[k].state, fps: +(t.length / 5).toFixed(1), frames: stats[k].frames };
    });
  };

  /* ------------------------------------------------------------------
     6. TERMINAL HISTORY (persistent, secrets never stored)
     ------------------------------------------------------------------ */
  const SECRET_CMDS = new Set(['vault', 'handshake', 'tag', 'stegano']);
  const HIST_KEY = 'history';
  EG.history = {
    max: 200,
    load() { return store.getJSON(HIST_KEY, []); },
    push(raw) {
      const cmd = String(raw).trim().split(/\s+/)[0].toLowerCase();
      if (SECRET_CMDS.has(cmd)) return;
      const h = EG.history.load(); if (h[h.length - 1] === raw) return;
      h.push(raw); while (h.length > EG.history.max) h.shift(); store.setJSON(HIST_KEY, h);
    },
    clear() { store.remove(HIST_KEY); }
  };
  /** Hide passwords when echoing / remembering in-memory history. */
  EG.maskCmd = function (raw) {
    const p = String(raw).trim().split(/\s+/);
    const c = (p[0] || '').toLowerCase();
    if (c === 'vault' && p.length > 2) p[2] = '••••••';
    else if (c === 'handshake' && p.length > 1) p[1] = '••••••';
    return p.join(' ');
  };

  /* ------------------------------------------------------------------
     7. SERVICE-WORKER UPDATE TOAST  (real "new version ready" detection)
     ------------------------------------------------------------------ */
  EG.toast = function (html, actionLabel, onAction) {
    const old = document.querySelector('.eg-toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'eg-toast'; t.setAttribute('role', 'status');
    const m = document.createElement('span'); m.innerHTML = html; t.appendChild(m);
    if (actionLabel) { const b = document.createElement('button'); b.textContent = actionLabel; b.onclick = () => { onAction && onAction(); t.remove(); }; t.appendChild(b); }
    const x = document.createElement('button'); x.className = 'eg-toast-x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '✕'; x.onclick = () => t.remove(); t.appendChild(x);
    document.body.appendChild(t);
    if (!actionLabel) setTimeout(() => t.remove(), 6000);
  };
  /** navigator.serviceWorker THROWS inside sandboxed iframes (e.g. a portal) — check safely. */
  EG.canUseSW = function () { try { return !!navigator.serviceWorker && global.isSecureContext !== false; } catch (e) { return false; } };
  EG.watchServiceWorker = function (reg) {
    if (!reg || !EG.canUseSW()) return;
    const hadController = !!navigator.serviceWorker.controller;          // false on the very first visit
    let userAsked = false;
    const announce = (worker) => EG.toast('✨ <b>New version ready</b>', 'Refresh', () => { userAsked = true; worker.postMessage({ type: 'SKIP_WAITING' }); });
    if (reg.waiting && hadController) announce(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) announce(w); });
    });
    // reload ONLY when the visitor pressed "Refresh" — never on first install, never behind their back
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && userAsked) location.reload(); });
  };

  /* ------------------------------------------------------------------
     8. SMALL ACCESSIBILITY FIXES that need JS
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    // un-focusable "[X]" spans -> real keyboard-accessible buttons
    document.querySelectorAll('[id^="close-"]').forEach(el => {
      if (el.tagName !== 'BUTTON' && !el.hasAttribute('tabindex')) {
        el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Close');
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      }
    });
    const sel = document.getElementById('color-theme-select'); if (sel && !sel.getAttribute('aria-label')) sel.setAttribute('aria-label', 'Color profile');
    ['fe-lat', 'fe-lon', 'cosmic-lat', 'cosmic-lon', 'astro-lat', 'astro-lon'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      el.setAttribute('aria-label', /lat/.test(id) ? 'Latitude (-90 to 90)' : 'Longitude (-180 to 180)');
      el.setAttribute('inputmode', 'decimal');
      if (/lat/.test(id)) { el.min = -90; el.max = 90; } else { el.min = -180; el.max = 180; }
    });
  });

  
})(window);
