/* =====================================================================
   eg-remote.js — "Remote Viewing" family, rebuilt.     (needs eg-core.js)
   Replaces:  remoteview · fetchpage · grabimg · portal

   WHY THE OLD ONES FAILED
   1. One public proxy (api.allorigins.win) = one point of failure. It
      regularly times out / rate-limits, and there was NO timeout, so the
      terminal just sat on "Processing…".
   2. fetchpage never checked response.ok — an error page from the proxy
      was parsed as if it were the site ("No title").
   3. Metadata was pasted into HTML strings unescaped (broken layout and
      an XSS hole).
   4. grabimg only looked at <img src>: it missed srcset, lazy-load
      attributes, <picture>, og:image, CSS backgrounds, and resolved
      relative URLs against the wrong base. Thumbnails sent your Referer,
      so hotlink-protected sites returned 404.
   5. JS-rendered sites (React/Next) have almost nothing in their raw HTML.

   NOW:  proxy chain with per-hop timeout + validation + 5-min cache,
         optional own Cloudflare Worker (tools/cors-worker.js),
         Jina Reader fallback for text, Microlink fallback for metadata,
         everything built with DOM APIs / textContent (no string HTML).
   ===================================================================== */
(function (global) {
  'use strict';
  const EG = global.EG;
  const enc = encodeURIComponent;
  const cfg = () => global.EG_CONFIG || {};

  /* ---------------- tiny DOM helpers ---------------- */
  const $out = () => document.getElementById('cmd-output');
  function scrollDown() { const o = $out(); if (o) o.scrollTop = o.scrollHeight; }
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'style') n.style.cssText = v; else if (k === 'text') n.textContent = v;
      else if (v != null && v !== false) n.setAttribute(k, v);
    });
    kids.flat(Infinity).forEach(k => k != null && n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
    return n;
  }
  function link(href, text, style) {
    const safe = EG.safeUrl(href);
    if (!safe) return h('span', { text: text || href, style: style || '' });
    return h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer', style: 'color:#0ff;word-break:break-all;' + (style || ''), text: text || safe });
  }
  function statusLine(text) {
    const d = h('div', { style: 'color:#888;', text }); $out() && $out().appendChild(d); scrollDown();
    return { set(t) { d.textContent = t; scrollDown(); }, remove() { d.remove(); } };
  }

  /* ---------------- proxy chain ---------------- */
  const PROXIES = [
    { name: 'your-worker', on: () => !!cfg().workerUrl, build: u => cfg().workerUrl.replace(/\/$/, '') + '/?url=' + enc(u) },
    { name: 'allorigins',  on: () => true, build: u => 'https://api.allorigins.win/raw?url=' + enc(u) },
    { name: 'codetabs',    on: () => true, build: u => 'https://api.codetabs.com/v1/proxy/?quest=' + enc(u) },
    { name: 'corsproxy',   on: () => true, build: u => 'https://corsproxy.io/?url=' + enc(u) },
  ];
  const cache = new Map();                       // url -> { t, data }
  const TTL = 5 * 60 * 1000;

  async function fetchT(url, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, { signal: ctl.signal, redirect: 'follow' }); }
    finally { clearTimeout(t); }
  }
  const looksLikeHTML = (s) => /<\s*(!doctype|html|head|body|title|meta|div|p|a|h1)\b/i.test(s.slice(0, 6000)) && !/^\s*\{\s*"(error|status|message)"/i.test(s);

  /** Fetch a page's HTML through the proxy chain.  Resolves { html, finalUrl, via }. */
  async function getHTML(url, say) {
    const hit = cache.get(url); if (hit && Date.now() - hit.t < TTL) return Object.assign({ via: hit.data.via + ' (cached)' }, hit.data);
    const errors = [];
    for (const p of PROXIES.filter(p => p.on())) {
      say && say('📡 ' + p.name + ' …');
      try {
        const res = await fetchT(p.build(url), 9000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        if (!html || html.length < 40) throw new Error('empty response');
        if (!looksLikeHTML(html)) throw new Error('not an HTML page');
        const data = { html, finalUrl: res.headers.get('X-Final-URL') || url, via: p.name };
        cache.set(url, { t: Date.now(), data });
        return data;
      } catch (e) { errors.push(p.name + ': ' + (e.name === 'AbortError' ? 'timeout' : e.message)); }
    }
    const err = new Error(errors.join(' | ')); err.hops = errors; throw err;
  }

  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
  function baseOf(doc, finalUrl) {
    const b = doc.querySelector('base[href]');
    try { return b ? new URL(b.getAttribute('href'), finalUrl).href : finalUrl; } catch (e) { return finalUrl; }
  }
  function normaliseURL(arg) {
    if (!arg) return null;
    return EG.safeUrl(/^https?:\/\//i.test(arg) ? arg : 'https://' + arg);
  }
  function failBox(title, e) {
    return h('div', { style: 'border-left:3px solid #ff5555;padding-left:10px;margin:8px 0;color:#ccc;' },
      h('b', { style: 'color:#ff5555;', text: '⚠️ ' + title }), h('br'),
      h('span', { style: 'font-size:.85rem;', text: e.message }), h('br'),
      h('span', { style: 'color:#888;font-size:.8rem;', text: 'Tips: the site may block scrapers or be JavaScript-rendered. Set EG_CONFIG.workerUrl (tools/cors-worker.js) for a private, reliable proxy.' }));
  }

  /* ====================== remoteview ====================== */
  function extractReadable(doc, max) {
    doc.querySelectorAll('script,style,noscript,svg,iframe,form,nav,footer,header,aside,button,select,[hidden],[aria-hidden="true"]').forEach(n => n.remove());
    const root = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role="main"]') || doc.body;
    const blocks = []; let total = 0;
    if (root) {
      root.querySelectorAll('h1,h2,h3,h4,p,li,pre,blockquote,td,dd,dt,figcaption').forEach(n => {
        if (total > max) return;
        if (n.querySelector('p,li,pre,blockquote,h1,h2,h3,h4,td')) return;     // avoid double-counting containers
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t.length < 2) return;
        blocks.push({ head: /^H[1-4]$/.test(n.tagName), t }); total += t.length;
      });
      if (!blocks.length) { const t = (root.textContent || '').replace(/\s+/g, ' ').trim(); if (t) { blocks.push({ head: false, t: t.slice(0, max) }); total = t.length; } }
    }
    return { blocks, total };
  }

  async function remoteview(args) {
    const full = args.includes('--full'); const rest = args.filter(a => !a.startsWith('--'));
    const url = normaliseURL(rest[0]);
    if (!rest[0]) return 'Usage: remoteview <url> [--full]\nExample: remoteview example.com';
    if (!url) return '⚠️ That is not a valid http(s) URL.';
    const max = full ? 40000 : 5000;
    const st = statusLine('📡 Remote viewing ' + url + ' …');
    let via = '', title = '', blocks = [], total = 0, err = null;
    try {
      const r = await getHTML(url, t => st.set(t)); via = r.via;
      const doc = parse(r.html); title = (doc.title || '').trim();
      ({ blocks, total } = extractReadable(doc, max));
    } catch (e) { err = e; }

    if (total < 120) {                                  // JS-rendered or blocked → Jina Reader (renders server-side)
      st.set('📡 trying reader fallback …');
      try {
        const res = await fetchT('https://r.jina.ai/' + url, 15000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = (await res.text()).trim();
        if (txt.length > total) { via = 'reader'; blocks = [{ head: false, t: txt.slice(0, max) }]; total = txt.length; title = title || (txt.match(/^Title:\s*(.+)$/m) || [])[1] || ''; err = null; }
      } catch (e) { err = err || e; }
    }
    st.remove();
    if (!blocks.length) return failBox('Remote viewing failed', err || new Error('No readable text found.')).outerHTML;

    const box = h('div', { style: 'border-left:3px solid #0f0;padding-left:10px;margin:10px 0;line-height:1.5;' });
    box.appendChild(h('b', { style: 'color:#0f0;', text: '🔍 REMOTE VIEW  ' }));
    box.appendChild(h('span', { style: 'color:#888;font-size:.8rem;', text: '(' + via + ')' }));
    box.appendChild(h('br')); box.appendChild(link(url, title || url)); box.appendChild(h('br'));
    let shown = 0;
    for (const b of blocks) {
      if (shown > max) break;
      const t = b.t.length > 900 ? b.t.slice(0, 900) + '…' : b.t; shown += t.length;
      box.appendChild(h('div', { style: b.head ? 'color:var(--accent-color,#0ff);font-weight:bold;margin-top:8px;' : 'color:#ccc;font-size:.9rem;margin-top:3px;', text: t }));
    }
    if (total > max) box.appendChild(h('div', { style: 'color:#888;margin-top:8px;font-size:.8rem;', text: '… ' + (total - shown) + ' more characters. Use: remoteview ' + url + ' --full' }));
    $out().appendChild(box); scrollDown(); return '';
  }

  /* ====================== fetchpage ====================== */
  const meta = (doc, key, attr) => { const e = doc.querySelector('meta[' + (attr || 'name') + '="' + key + '"]'); return e ? (e.getAttribute('content') || '').trim() : ''; };

  async function fetchpage(args) {
    const url = normaliseURL(args[0]);
    if (!args[0]) return 'Usage: fetchpage <url>\nShows title, description, Open Graph/Twitter data, icons, feeds, structured data and page stats.';
    if (!url) return '⚠️ That is not a valid http(s) URL.';
    const st = statusLine('📡 Fetching metadata from ' + url + ' …');
    let info = null, via = '', err = null;
    try {
      const r = await getHTML(url, t => st.set(t)); via = r.via;
      const doc = parse(r.html); const base = baseOf(doc, r.finalUrl);
      const abs = (u) => (u ? EG.safeUrl(u, base) : '') || '';          // '' must stay '' (it would otherwise resolve to the page URL)
      const hrefOf = (sel) => { const e = doc.querySelector(sel); return e ? (e.getAttribute('href') || '') : ''; };
      const host = (() => { try { return new URL(base).host; } catch (e) { return ''; } })();
      const links = Array.from(doc.querySelectorAll('a[href]')).map(a => abs(a.getAttribute('href'))).filter(Boolean);
      const types = []; doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { const j = JSON.parse(s.textContent); (Array.isArray(j) ? j : [j]).forEach(o => { if (o && o['@type']) types.push([].concat(o['@type']).join('/')); }); } catch (e) {} });
      const csEl = doc.querySelector('meta[charset]');
      info = {
        'Title': (doc.title || '').trim() || meta(doc, 'og:title', 'property'),
        'Description': meta(doc, 'description') || meta(doc, 'og:description', 'property'),
        'Final URL': r.finalUrl,
        'Canonical': abs(hrefOf('link[rel="canonical"]')),
        'Language': doc.documentElement.lang || '',
        'Charset': csEl ? (csEl.getAttribute('charset') || '') : '',
        'Author': meta(doc, 'author'), 'Generator': meta(doc, 'generator'), 'Robots': meta(doc, 'robots'),
        'Theme colour': meta(doc, 'theme-color'),
        'OG title': meta(doc, 'og:title', 'property'), 'OG site': meta(doc, 'og:site_name', 'property'), 'OG type': meta(doc, 'og:type', 'property'),
        'OG image': abs(meta(doc, 'og:image', 'property')),
        'Twitter card': meta(doc, 'twitter:card'), 'Twitter site': meta(doc, 'twitter:site'),
        'Icon': abs(hrefOf('link[rel~="icon"]')),
        'Manifest': abs(hrefOf('link[rel="manifest"]')),
        'Feeds': Array.from(doc.querySelectorAll('link[rel="alternate"][type*="rss"],link[rel="alternate"][type*="atom"]')).map(l => abs(l.getAttribute('href'))).filter(Boolean).slice(0, 3).join('  '),
        'Structured data': types.slice(0, 6).join(', '),
        'Page stats': doc.querySelectorAll('h1,h2,h3').length + ' headings · ' + links.length + ' links (' + links.filter(l => { try { return new URL(l).host !== host; } catch (e) { return false; } }).length + ' external) · ' +
          doc.querySelectorAll('img').length + ' images · ' + doc.querySelectorAll('script').length + ' scripts',
      };
    } catch (e) { err = e; }

    if (!info || (!info['Title'] && !info['Description'])) {          // blocked / JS-rendered → Microlink
      st.set('📡 trying metadata API fallback …');
      try {
        const res = await fetchT('https://api.microlink.io/?url=' + enc(url), 15000);
        const j = await res.json();
        if (j && j.status === 'success' && j.data) {
          const d = j.data; via = 'microlink'; err = null;
          info = Object.assign(info || {}, { 'Title': d.title || '', 'Description': d.description || '', 'Final URL': d.url || url, 'Language': d.lang || '', 'Author': d.author || '', 'Publisher': d.publisher || '', 'OG image': (d.image && d.image.url) || '', 'Icon': (d.logo && d.logo.url) || '' });
        }
      } catch (e) { err = err || e; }
    }
    st.remove();
    if (!info) return failBox('Metadata fetch failed', err || new Error('Unknown error')).outerHTML;

    const box = h('div', { style: 'border-left:3px solid #ffaa00;padding-left:10px;margin:10px 0;line-height:1.55;' });
    box.appendChild(h('b', { style: 'color:#ffaa00;', text: '📄 PAGE METADATA  ' }));
    box.appendChild(h('span', { style: 'color:#888;font-size:.8rem;', text: '(' + via + ')' })); box.appendChild(h('br'));
    Object.entries(info).forEach(([k, v]) => {
      if (!v) return;
      const isUrl = /^https?:\/\//.test(v) && !/\s/.test(v.trim());
      const parts = k === 'Feeds' ? v.split('  ') : null;
      box.appendChild(h('div', {},
        h('b', { style: 'color:#ddd;', text: k + ': ' }),
        parts ? parts.map(p => [link(p, p), ' ']) : (isUrl ? link(v, v.length > 90 ? v.slice(0, 90) + '…' : v) : h('span', { style: 'color:#ccc;', text: v }))));
    });
    $out().appendChild(box); scrollDown(); return '';
  }

  /* ====================== grabimg ====================== */
  function parseSrcset(v) {
    const out = []; if (!v) return out;
    v.split(/,\s+(?=\S)/).forEach(part => {
      const m = part.trim().match(/^(\S+)(?:\s+(\d+(?:\.\d+)?)([wx]))?$/);
      if (m) out.push({ url: m[1], score: m[2] ? parseFloat(m[2]) * (m[3] === 'x' ? 1000 : 1) : 0 });
    });
    return out.sort((a, b) => b.score - a.score);
  }

  function collectImages(doc, base) {
    const found = new Map();
    const add = (raw, from) => {
      if (!raw) return; raw = String(raw).trim();
      if (/^data:image\//i.test(raw)) { if (raw.length < 400 && !/svg/i.test(raw)) return; if (!found.has(raw)) found.set(raw, { url: raw, from }); return; }
      let u = EG.safeUrl(raw, base); if (!u) return;
      if (u.startsWith('http://')) u = 'https://' + u.slice(7);                    // mixed content would be blocked on an https page
      if (!found.has(u)) found.set(u, { url: u, from });
    };
    doc.querySelectorAll('meta[property="og:image"],meta[property="og:image:url"],meta[name="twitter:image"],meta[name="twitter:image:src"]').forEach(m => add(m.getAttribute('content'), 'social'));
    doc.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]').forEach(l => add(l.getAttribute('href'), 'icon'));
    doc.querySelectorAll('img').forEach(img => {
      const best = parseSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset'))[0];
      if (best) add(best.url, 'srcset');
      ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-url'].forEach(a => add(img.getAttribute(a), 'img'));
    });
    doc.querySelectorAll('source[srcset],source[data-srcset]').forEach(s => { const b = parseSrcset(s.getAttribute('srcset') || s.getAttribute('data-srcset'))[0]; if (b) add(b.url, 'picture'); });
    doc.querySelectorAll('video[poster]').forEach(v => add(v.getAttribute('poster'), 'poster'));
    doc.querySelectorAll('[style*="url("]').forEach(n => { const m = (n.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i); if (m) add(m[1], 'css'); });
    return Array.from(found.values());
  }

  async function grabimg(args) {
    const all = args.includes('--all'); const rest = args.filter(a => !a.startsWith('--'));
    if (!rest[0]) return 'Usage: grabimg <url> [--all]\nFinds <img>, srcset, lazy-loaded, <picture>, social (og:image), icons and CSS background images.';
    const url = normaliseURL(rest[0]);
    if (!url) return '⚠️ That is not a valid http(s) URL.';
    const st = statusLine('📸 Scanning ' + url + ' …');
    let r; try { r = await getHTML(url, t => st.set(t)); } catch (e) { st.remove(); return failBox('Image scan failed', e).outerHTML; }
    st.remove();
    const doc = parse(r.html); const images = collectImages(doc, baseOf(doc, r.finalUrl));
    if (!images.length) return h('div', { style: 'color:#ffaa00;', text: '⚠️ No images in the raw HTML (' + r.via + '). The page is probably rendered by JavaScript — try: fetchpage ' + url }).outerHTML;

    const LIMIT = all ? 400 : 48;
    const box = h('div', { style: 'margin:10px 0;' });
    box.appendChild(h('b', { style: 'color:#0f0;', text: '🖼️ GRABIMG  ' }));
    box.appendChild(h('span', { style: 'color:#ccc;', text: images.length + ' unique images' }));
    box.appendChild(h('span', { style: 'color:#888;font-size:.8rem;', text: '  (' + r.via + ')' }));
    const grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;' });
    images.slice(0, LIMIT).forEach((im, i) => {
      const img = h('img', { alt: 'image ' + (i + 1), loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async', src: im.url, style: 'width:100%;height:100%;object-fit:cover;display:block;' });
      const frame = h('a', { href: im.url.startsWith('data:') ? null : im.url, target: '_blank', rel: 'noopener noreferrer', title: im.from + ' · ' + im.url.slice(0, 120),
        style: 'display:block;width:84px;height:84px;border:1px solid var(--accent-color,#0ff);border-radius:4px;overflow:hidden;background:#111;position:relative;' }, img);
      img.addEventListener('error', () => { img.remove(); frame.appendChild(h('span', { style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#777;font-size:11px;text-align:center;', text: 'blocked\n↗ open' })); });
      grid.appendChild(h('div', { style: 'display:flex;flex-direction:column;align-items:center;width:84px;' }, frame,
        h('span', { style: 'color:#0ff;font-size:10px;margin-top:3px;', text: '#' + (i + 1) + ' ' + im.from })));
    });
    box.appendChild(grid);
    if (images.length > LIMIT) box.appendChild(h('div', { style: 'color:#888;margin-top:8px;', text: '+ ' + (images.length - LIMIT) + ' more — run: grabimg ' + url + ' --all' }));
    $out().appendChild(box); scrollDown(); return '';
  }

  /* ====================== portal ====================== */
  const SHORTCUTS = {
    elitegdx: 'https://jinkaneki.github.io/EliteGDX/', famelack: 'https://famelack.com/', citywalki: 'https://www.citywalki.com/',
    f1: 'https://f1live.dpdns.org/', radiogarden: 'https://radio.garden/',
    flightradar24: 'https://www.flightradar24.com/', opensea: 'https://map.openseamap.org/', earthcam: 'https://www.earthcam.com/',
    windview: 'https://earth.nullschool.net/', citywalks: 'https://citywalks.live/',
    azmth: 'https://azmth.space/', heavens: 'https://www.heavens-above.com/', keeptrack: 'https://app.keeptrack.space/',
    moviesjoy: 'https://flixnet.site/moviesjoy/', hianime: 'https://hianime.ad/home/', streamgoblin: 'https://streamgoblin.com/',
  };
  EG.portalShortcuts = SHORTCUTS;

  function portal(args) {
    const a = args.slice(); let mobile = false;
    if (a[0] === '--mobile') { mobile = true; a.shift(); }
    const arg = a[0];
    if (!arg) {
      const wrap = h('div', { style: 'border-left:3px solid var(--accent-color);padding-left:10px;margin:8px 0;' },
        h('b', { style: 'color:var(--accent-color);', text: '🌐 PORTAL' }), h('br'),
        h('span', { style: 'color:#ccc;', text: 'Usage: portal [--mobile] <url|shortcut>' }), h('br'),
        h('span', { style: 'color:#0f0;', text: 'Click a shortcut to fill the command:' }), h('br'));
      const palette = ['#ff00ff', '#00ffff', '#ffaa00', '#0f0', '#ff6600', '#ff0066', '#66ff00', '#00ffcc', '#cc00ff', '#ffff00'];
      Object.keys(SHORTCUTS).forEach((k, i) => {
        const chip = h('button', { type: 'button', style: 'cursor:pointer;color:' + palette[i % palette.length] + ';background:rgba(0,0,0,.35);border:1px solid currentColor;border-radius:12px;padding:2px 9px;margin:3px;font:inherit;', text: k });
        chip.addEventListener('click', () => global.fillInput && global.fillInput('portal ' + k));
        wrap.appendChild(chip);
      });
      $out().appendChild(wrap); scrollDown(); return '';
    }
    const target = normaliseURL(SHORTCUTS[arg.toLowerCase()] || arg);
    if (!target) return '⚠️ That is not a valid http(s) URL.';
    // Same-origin pages must NOT get allow-same-origin+allow-scripts together (they could reach back into this page's storage).
    const sameOrigin = new URL(target).origin === location.origin;
    const sandbox = 'allow-scripts allow-popups allow-forms allow-presentation allow-modals' + (sameOrigin ? '' : ' allow-same-origin');
    const frame = h('iframe', { src: target, sandbox, allow: 'fullscreen', referrerpolicy: 'no-referrer', loading: 'lazy', title: 'Portal: ' + target,
      style: 'width:' + (mobile ? '375px' : '100%') + ';height:' + (mobile ? '667px' : '60vh') + ';border:none;background:#fff;max-width:100%;' });
    const box = h('div', { style: 'margin:10px 0;border:1px solid var(--accent-color);border-radius:8px;overflow:hidden;background:#000;' },
      h('div', { style: 'background:#222;padding:6px 12px;color:#0f0;display:flex;justify-content:space-between;align-items:center;gap:10px;' },
        h('span', { style: 'font-family:monospace;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', text: '🌐 PORTAL: ' + target }),
        h('a', { href: target, target: '_blank', rel: 'noopener noreferrer', style: 'color:#ffaa00;text-decoration:none;font-size:12px;font-weight:bold;flex:none;', text: '[ESCAPE ↗]' })),
      h('div', { style: 'display:flex;justify-content:center;background:#111;padding:5px;' }, frame),
      h('div', { style: 'background:#111;padding:5px;text-align:center;color:#999;font-size:11px;', text: 'Blank? That site forbids embedding — use ESCAPE to open it normally.' }));
    $out().appendChild(box); scrollDown(); return '';
  }

  /* ---------------- register with the command registry ---------------- */
  const def = (name, category, usage, summary, run, extra) => Object.assign({ name, category, usage, summary, run }, extra || {});
  EG.remoteCommands = [
    def('remoteview', 'Remote Viewing', 'remoteview <url> [--full]', 'Readable text of any page (proxy chain + reader fallback)', remoteview),
    def('fetchpage',  'Remote Viewing', 'fetchpage <url>', 'Title, OG/Twitter data, icons, feeds, JSON-LD, page stats', fetchpage),
    def('grabimg',    'Remote Viewing', 'grabimg <url> [--all]', 'Every image on a page: img, srcset, lazy, og:image, CSS', grabimg),
    def('portal',     'Remote Viewing', 'portal [--mobile] <url|shortcut>', 'Embed a site in a sandboxed iframe', portal,
        { complete: () => Object.keys(SHORTCUTS) }),
  ];
  if (EG.registry) EG.remoteCommands.forEach(c => EG.registry.register(c));

  // exposed for tests
  EG._remote = { getHTML, collectImages, parseSrcset, extractReadable, PROXIES };
})(window);
