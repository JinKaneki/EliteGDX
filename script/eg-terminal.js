/* =====================================================================
   eg-terminal.js — Command registry + terminal quality-of-life.  (needs eg-core.js)

   • EG.registry     one place that knows every command (name, aliases,
                     category, usage, summary, completion, run).
                     Your 120 legacy commands keep working untouched —
                     they are "adopted" through LEGACY_META below.
                     New commands = EG.registry.register({...}) in any file.
   • Tab completion  (commands + arguments), Ctrl+L clear, Ctrl+C stop,
   • ↑ / ↓ history   (persisted; passwords are never saved)
   • "Did you mean?" for typos, `help <cmd>`, `commands`, `perf`, `libs`
   • Output cap so a page left open for days never bloats the DOM
   ===================================================================== */
(function (global) {
  'use strict';
  const EG = global.EG;

  /* ---------------- registry ---------------- */
  const reg = new Map(); const alias = new Map();
  EG.registry = {
    register(def) {
      if (!def || !def.name || typeof def.run !== 'function') throw new Error('registry.register needs {name, run}');
      reg.set(def.name, Object.assign({ category: 'Misc', summary: '', usage: def.name, aliases: [] }, def));
      (def.aliases || []).forEach(a => alias.set(a, def.name));
    },
    get(name) { return reg.get(alias.get(name) || name) || null; },
    legacy() { return EG._legacy || {}; },
    names() { return Array.from(new Set([...Object.keys(EG.registry.legacy()), ...reg.keys(), ...alias.keys()])).sort(); },
    meta(name) {
      const d = EG.registry.get(name); if (d) return d;
      const m = LEGACY_META[name]; if (m) return { name, category: m[0], summary: m[1], usage: m[2] || name, aliases: [], complete: null };
      return EG.registry.legacy()[name] ? { name, category: 'Misc', summary: '', usage: name, aliases: [] } : null;
    },
  };
  /** Router hook: registry wins, legacy `commands` object is the fallback. */
  EG.resolveCommand = function (name, legacy) {
    EG._legacy = legacy;
    const d = EG.registry.get(name);
    return d ? (args) => d.run(args) : legacy[name];
  };
  /** Router hook: runs before a command (lazy-load libs it needs). */
  EG.beforeRun = (main, args) => EG.needs(main, args).catch(err => { throw new Error('Could not load a required library (' + err.message + '). Check your connection or run node tools/vendor.mjs.'); });
  /** Router hook: output of commands that render third-party text is sanitised. */
  const UNTRUSTED = new Set(['news', 'hackernews', 'technology', 'weather', 'define', 'wiki', 'crypto', 'anime', 'poem', 'poetry', 'bible', 'verse',
    'sutra', 'koan', 'stoic', 'buddha', 'wisdom', 'joke', 'riddle', 'learn', 'walls', 'space', 'physics', 'biology', 'cstip', 'electronics', 'engineering', 'fortune']);
  EG.afterRun = (main, result) => (typeof result === 'string' && UNTRUSTED.has(main) && /<[a-z!]/i.test(result)) ? EG.sanitizeHTML(result) : result;

  /* ---------------- metadata for the 120 legacy commands ---------------- */
  const SYS = 'System', NET = 'Network', CIP = 'Cipher Lab', HACK = 'Cyber-Ops', MED = 'Media', INFO = 'Intel & Info', WIS = 'Wisdom', FUN = 'Games & FX', RV = 'Remote Viewing', UI = 'Theme & UI';
  const LEGACY_META = {
    help: [SYS, 'Command list. Try: help <command>'], clear: [SYS, 'Clear the terminal'], echo: [SYS, 'Print text', 'echo <text>'], whoami: [SYS, 'Show your persona'],
    ls: [SYS, 'List virtual files'], sudo: [SYS, 'Ask nicely'], history: [SYS, 'Show command history'], motd: [SYS, 'Message of the day'], about: [SYS, 'About J_OS'],
    login: [SYS, 'Akashic splash'], date: [SYS, 'Date/time', 'date [utc|iso|unix]'], shutdown: [SYS, 'Enter Mirror Mode'], nuke: [SYS, 'FACTORY RESET (EliteGDX data only)'],
    fetch: [SYS, 'System info panel'], fetchpanel: [SYS, 'System info panel'], neofetch: [SYS, 'ASCII system info'], fastfetch: [SYS, 'Quick system info'], system: [SYS, 'System monitor'],
    status: [SYS, 'Status report'], pause: [UI, 'Freeze/resume the background'], timer: [SYS, 'Countdown with beeps', 'timer <seconds>'], stoptimer: [SYS, 'Stop the timer'],
    spinner: [SYS, 'Spinner animation'], stopspinner: [SYS, 'Stop spinner'], stop: [MED, 'Stop media & animations'], zoom: [UI, 'Zoom the page', 'zoom [in|out|reset]'],
    theme: [UI, 'Colour profile', 'theme [cyan|magenta|amber|matrix]'], mode: [UI, 'Terminal skin', 'mode [flipper|midnight|matrix|crimson|cyber|hologram|stealth|off]'], flipper: [UI, 'Flipper Zero skin / subghz'],
    graph: [SYS, 'Neural command graph'], brain: [SYS, 'Graph help / reset'],
    chat: [NET, 'Chat channels', 'chat [mqtt|p2p|firebase|-all]'], ping: [NET, 'MQTT radar sweep'], pingg: [NET, 'Network ping'], pingstop: [NET, 'Stop radar'], disconnect: [NET, 'Close chat links'],
    netorbit: [NET, 'Network orbit visual'], mesh: [NET, 'Mesh network visual'], aprsmap: [NET, 'APRS ham-radio map', 'aprsmap [fi|direct]'],
    cipher: [CIP, 'Cipher manual'], encode: [CIP, 'Base64 / binary / hex encode'], decode: [CIP, 'Decode'], shift: [CIP, 'Caesar shift'], kryptos: [CIP, 'Kryptos cipher'], vigenere: [CIP, 'Vigenère cipher'],
    mirror: [CIP, 'Atbash mirror cipher'], reverse: [CIP, 'Reverse text'], handshake: [CIP, 'Set vault password'], vault: [CIP, 'AES-256-GCM vault', 'vault <enc|dec> <password> <text>'],
    stegano: [CIP, 'Zero-width steganography', 'stegano <hide|reveal> …'], tag: [CIP, 'Private tag store', 'tag <set|get|view|clear> …'],
    kali: [HACK, 'Kali toolkit', 'kali <hash|scan|crack|inject|genkey|banner|arch>'], hack: [HACK, 'Fake hacking animation'], htop: [HACK, 'System monitor'], wifite: [HACK, 'Simulated wifi audit'],
    airmon: [HACK, 'Simulated airmon-ng'], hashcat: [HACK, 'Simulated hashcat'], nmap: [HACK, 'Simulated nmap'], raspberry: [HACK, 'Raspberry Pi pinout'], gpio: [HACK, 'GPIO helper'],
    play: [MED, 'Play media', 'play <audio|youtube> <url>'], radio: [MED, 'Radio stations'], tv: [MED, 'Live TV'], iptv: [MED, 'IPTV channel browser'], ipset: [MED, 'Personal IPTV list'],
    homing: [MED, 'Homing beacon tone'], piano: [FUN, 'Play the piano'], image: [RV, 'Random image'], walls: [RV, 'Random wallpaper'],
    remoteview: [RV, 'Readable text of a page'], fetchpage: [RV, 'Page metadata'], grabimg: [RV, 'Images on a page'], portal: [RV, 'Embed a site'],
    news: [INFO, 'BBC world news'], hackernews: [INFO, 'Hacker News top 5'], technology: [INFO, 'Tech headlines'], weather: [INFO, 'Weather', 'weather [city]'], define: [INFO, 'Dictionary', 'define <word>'],
    wiki: [INFO, 'Wikipedia summary', 'wiki <topic>'], crypto: [INFO, 'Crypto price', 'crypto [coin]'], moon: [INFO, 'Moon phase'], qr: [INFO, 'QR code', 'qr <text>'],
    tao: [WIS, 'Tao Te Ching'], yhn: [WIS, 'Yohan Te Ching'], bible: [WIS, 'Random verse'], verse: [WIS, 'Bible verse'], sutra: [WIS, 'Buddhist sutra'], koan: [WIS, 'Zen koan'], stoic: [WIS, 'Stoic quote'],
    buddha: [WIS, 'Buddha quote'], wisdom: [WIS, 'Random wisdom'], fortune: [WIS, 'Fortune'], poem: [WIS, 'Poem'], poetry: [WIS, 'Poetry'], riddle: [FUN, 'Riddle with reveal'], joke: [FUN, 'Dad joke'],
    learn: [INFO, 'Learn something'], physics: [INFO, 'Physics formula'], biology: [INFO, 'Biology fact'], space: [INFO, 'Space fact'], cstip: [INFO, 'Computer-science tip'],
    electronics: [INFO, 'Electronics fact'], engineering: [INFO, 'Engineering marvel'], case: [INFO, 'Engineering calculator', 'case [resistor|decode|ohm|…]'],
    game: [FUN, 'Mini-games', 'game <name>'], run: [FUN, 'RPG: Akashic Mainframe'], cowsay: [FUN, 'Cowsay', 'cowsay <text>'], glitch: [FUN, 'Glitch effect'], slide: [FUN, 'Slideshow'], flow: [FUN, 'Flow visual'],
    react: [FUN, 'React build simulator'], rotate: [FUN, 'Rotate/scramble text'], scroll: [FUN, 'Scroll bounce'], banner: [FUN, 'Banner'], ascii: [FUN, 'ASCII art', 'ascii [n]'],
    palindrome: [FUN, 'Palindrome check'], sator: [FUN, 'Sator square'], anime: [FUN, 'Anime top 10'], intersect: [FUN, '⚠ 45 s flashing sequence (photosensitivity warning)'], intersectslow: [FUN, '60 s slow neural sequence'],
  };
  const ARGS = {
    theme: ['cyan', 'magenta', 'amber', 'matrix'], mode: ['flipper', 'midnight', 'matrix', 'crimson', 'cyber', 'hologram', 'stealth', 'off'],
    zoom: ['in', 'out', 'reset'], chat: ['mqtt', 'p2p', 'firebase', '-all'], date: ['utc', 'iso', 'unix'], play: ['audio', 'youtube'],
    kali: ['hash', 'scan', 'crack', 'inject', 'genkey', 'banner', 'arch'], tag: ['set', 'get', 'view', 'clear'], stegano: ['hide', 'reveal'], vault: ['enc', 'dec'],
    aprsmap: ['fi', 'direct'], help: [], cistercian: ['now', 'date', 'learn'], intersect: ['--yes'], history: ['-c'],
  };

  /* ---------------- helpers ---------------- */
  // `commandHistory` is a top-level `let` in app.js (not a window property) -> reach it by identifier, fresh each time (nuke reassigns it)
  const H = () => (typeof commandHistory !== 'undefined' ? commandHistory : null);
  const input = () => document.getElementById('cmd-input');
  const outBox = () => document.getElementById('cmd-output');
  const el = (tag, style, text) => { const n = document.createElement(tag); if (style) n.style.cssText = style; if (text != null) n.textContent = text; return n; };
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  EG.suggest = function (word) {
    const w = word.toLowerCase();
    return EG.registry.names().map(n => ({ n, s: n.startsWith(w) ? 0 : n.includes(w) ? 1 : lev(w, n) <= 2 ? 1 + lev(w, n) : 99 }))
      .filter(x => x.s < 99).sort((a, b) => a.s - b.s || a.n.localeCompare(b.n)).slice(0, 4).map(x => x.n);
  };
  function chip(name, color) {
    const b = el('button', 'cursor:pointer;color:' + (color || '#0f0') + ';background:rgba(0,0,0,.35);border:1px solid currentColor;border-radius:12px;padding:1px 9px;margin:2px 3px;font:inherit;', name);
    b.type = 'button'; b.addEventListener('click', () => global.fillInput ? global.fillInput(name) : (input().value = name, input().focus())); return b;
  }
  function printNode(node) { const o = outBox(); if (o) { o.appendChild(node); o.scrollTop = o.scrollHeight; } }

  /** Router hook for unknown commands. */
  EG.unknownCommand = function (main) {
    const box = el('div', 'color:#ff5555;'); box.appendChild(document.createTextNode('Command not found: ' + main + '. '));
    const sug = EG.suggest(main);
    if (sug.length) { box.appendChild(el('span', 'color:#ccc;', 'Did you mean ')); sug.forEach(s => box.appendChild(chip(s))); box.appendChild(el('span', 'color:#ccc;', '?')); }
    else box.appendChild(el('span', 'color:#888;', 'Type "commands" for the full list.'));
    printNode(box);
  };

  /* ---------------- new commands ---------------- */
  const add = (d) => EG.registry.register(d);

  add({
    name: 'help', category: SYS, usage: 'help [command]', summary: 'Command list, or details for one command',
    complete: () => EG.registry.names(),
    run(args) {
      const q = (args[0] || '').toLowerCase();
      if (!q) { const base = EG.registry.legacy().help; return (base ? base() : '') + '<br><span style="color:#888">help &lt;command&gt; · <b>commands</b> (everything, grouped) · <b>Tab</b> completes · <b>↑</b> history</span>'; }
      const m = EG.registry.meta(q);
      if (!m) { EG.unknownCommand(q); return ''; }
      const box = el('div', 'border-left:3px solid var(--accent-color);padding-left:10px;margin:6px 0;');
      box.appendChild(el('b', 'color:var(--accent-color);', m.name + '  '));
      box.appendChild(el('span', 'color:#888;', '[' + m.category + ']')); box.appendChild(el('br'));
      box.appendChild(el('span', 'color:#ddd;', m.summary || '(no description yet)')); box.appendChild(el('br'));
      box.appendChild(el('span', 'color:#0f0;', 'usage: ' + (m.usage || m.name)));
      if (m.aliases && m.aliases.length) { box.appendChild(el('br')); box.appendChild(el('span', 'color:#888;', 'aliases: ' + m.aliases.join(', '))); }
      const a = (m.complete && m.complete([])) || ARGS[m.name]; if (a && a.length && m.name !== 'help') { box.appendChild(el('br')); box.appendChild(el('span', 'color:#888;', 'options: ' + a.join(' · '))); }
      printNode(box); return '';
    },
  });

  add({
    name: 'commands', aliases: ['cmds', 'apropos'], category: SYS, usage: 'commands [search]', summary: 'Every command, grouped. Click one to fill it in.',
    run(args) {
      const q = (args[0] || '').toLowerCase(); const groups = {};
      EG.registry.names().forEach(n => {
        const m = EG.registry.meta(n); if (!m || n === 'cmds' || n === 'apropos') return;
        if (q && !(n.includes(q) || (m.summary || '').toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q))) return;
        (groups[m.category] = groups[m.category] || []).push(m);
      });
      const cats = Object.keys(groups).sort(); if (!cats.length) return 'Nothing matches "' + q + '".';
      const box = el('div', 'margin:6px 0;');
      cats.forEach(c => {
        box.appendChild(el('div', 'color:var(--accent-color);font-weight:bold;margin-top:8px;', '◆ ' + c.toUpperCase()));
        const row = el('div'); groups[c].forEach(m => { const b = chip(m.name, '#9f9'); b.title = m.summary || ''; row.appendChild(b); }); box.appendChild(row);
      });
      box.appendChild(el('div', 'color:#888;margin-top:8px;font-size:.85rem;', Object.values(groups).flat().length + ' commands · hover a chip for its description · help <command> for details'));
      printNode(box); return '';
    },
  });

  add({
    name: 'perf', category: SYS, usage: 'perf', summary: 'Render loops: state and real frames-per-second',
    run() {
      const rows = EG.perfReport();
      const box = el('div', 'font-family:monospace;margin:6px 0;');
      box.appendChild(el('div', 'color:var(--accent-color);font-weight:bold;', 'RENDER LOOPS (EG.next scheduler)'));
      if (!rows.length) box.appendChild(el('div', 'color:#888;', 'no loops have run yet'));
      rows.forEach(r => box.appendChild(el('div', 'color:#ccc;', r.loop.padEnd(18) + String(r.fps).padStart(5) + ' fps   ' + r.state)));
      box.appendChild(el('div', 'color:#888;margin-top:6px;', 'Hidden/off-screen loops should read "parked". Real-time view = ~1 fps.'));
      printNode(box); return '';
    },
  });

  add({
    name: 'libs', category: SYS, usage: 'libs', summary: 'Lazy-loaded libraries and their state',
    run() {
      const box = el('div', 'font-family:monospace;margin:6px 0;');
      Object.keys(global.EG_LIBS || {}).forEach(k => box.appendChild(el('div', 'color:#ccc;', k.padEnd(14) + (EG.libStatus[k] || 'not loaded (loads on first use)'))));
      printNode(box); return '';
    },
  });

  // photosensitivity gate for the 10 Hz flashing sequence
  add({
    name: 'intersect', category: FUN, usage: 'intersect [--yes]', summary: '⚠ 45 s full-screen flashing at 10 Hz',
    run(args) {
      const reduced = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced && !args.includes('--force')) return '⚠️ Disabled because your system asks for reduced motion. (Override: intersect --force --yes)';
      if (!args.includes('--yes') && EG.store.get('flash_ok') !== '1')
        return '<span style="color:#ffaa00">⚠️ <b>PHOTOSENSITIVITY WARNING</b></span><br>This runs full-screen flashing at 10 flashes/second for 45 seconds, which can trigger seizures in people with photosensitive epilepsy.<br>Run <b>intersect --yes</b> to continue (remembered afterwards). <b>intersectslow</b> is the gentler 2/second version.';
      if (args.includes('--yes')) EG.store.set('flash_ok', '1');
      return EG.registry.legacy().intersect();
    },
  });

  add({
    name: 'history', category: SYS, usage: 'history [-c]', summary: 'Show / clear command history',
    run(args) {
      if (args[0] === '-c') { EG.history.clear(); if (H()) H().length = 0; return 'History cleared.'; }
      const h = (H() || []).slice(-60);
      return h.length ? h.map((c, i) => (i + 1).toString().padStart(3) + '  ' + EG.esc(c)).join('<br>') : 'Empty.';
    },
  });

  /* ---------------- keyboard: Tab, ↑↓, Ctrl+L, Ctrl+C ---------------- */
  let navIdx = null, navDraft = '', lastTabValue = null;
  function commonPrefix(list) { let p = list[0] || ''; list.forEach(s => { while (!s.startsWith(p)) p = p.slice(0, -1); }); return p; }

  function complete(inp) {
    const val = inp.value; const parts = val.split(/\s+/); const last = parts[parts.length - 1].toLowerCase();
    let pool;
    if (parts.length === 1) pool = EG.registry.names();
    else {
      const m = EG.registry.get(parts[0].toLowerCase()); const dyn = m && m.complete ? m.complete(parts.slice(1)) : null;
      pool = dyn || ARGS[parts[0].toLowerCase()] || [];
    }
    const cands = pool.filter(c => c.toLowerCase().startsWith(last));
    if (!cands.length) return;
    const pre = commonPrefix(cands);
    const head = parts.slice(0, -1).join(' ') + (parts.length > 1 ? ' ' : '');
    if (cands.length === 1) { inp.value = head + cands[0] + ' '; lastTabValue = null; return; }
    if (pre.length > last.length) { inp.value = head + pre; lastTabValue = null; return; }
    if (lastTabValue === val) {                                   // second Tab: show the choices
      const box = el('div', 'margin:4px 0;'); cands.slice(0, 40).forEach(c => box.appendChild(chip(head + c, '#9f9')));
      printNode(box); lastTabValue = null;
    } else lastTabValue = val;
  }

  function stopEverything() {
    const L = EG.registry.legacy();
    ['stop', 'stopspinner', 'stoptimer', 'pingstop'].forEach(n => { try { L[n] && L[n](); } catch (e) {} });
    try { EG.sephirot && EG.sephirot.stop(); } catch (e) {}          // the looping Walk-the-Flash
    const box = el('div', 'color:#888;', '^C'); printNode(box);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const inp = input(); if (!inp) return;
    // mobile keyboards must not "fix" commands
    inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('autocorrect', 'off'); inp.setAttribute('spellcheck', 'false');
    inp.setAttribute('enterkeyhint', 'go'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-label', 'Terminal command');
    const out = outBox(); if (out) { out.setAttribute('role', 'log'); out.setAttribute('aria-live', 'polite'); }

    // restore persisted history into the app's in-memory array
    if (H() && !H().length) EG.history.load().forEach(h => H().push(h));

    inp.addEventListener('keydown', e => {
      if (e.isComposing) return;
      const hist = H() || [];
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); complete(inp); }
      else if (e.key === 'ArrowUp') {
        if (!hist.length) return; e.preventDefault();
        if (navIdx === null) { navDraft = inp.value; navIdx = hist.length; }
        navIdx = Math.max(0, navIdx - 1); inp.value = hist[navIdx]; setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length));
      } else if (e.key === 'ArrowDown') {
        if (navIdx === null) return; e.preventDefault();
        navIdx++; if (navIdx >= hist.length) { navIdx = null; inp.value = navDraft; } else inp.value = hist[navIdx];
      } else if (e.key === 'Enter') { navIdx = null; lastTabValue = null; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); const o = outBox(); if (o) o.innerHTML = ''; }
      else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !String(global.getSelection()).length) { e.preventDefault(); stopEverything(); }
    });
  });

  /* ---------------- output cap ---------------- */
  EG.trimOutput = function (box, max) {
    max = max || 1200; if (!box || box.children.length <= max) return;
    let guard = 0;
    while (box.children.length > max && guard++ < 400) {
      const first = Array.from(box.children).find(c => !c.querySelector('video,iframe,canvas,input,audio,textarea,[data-keep]') && !c.matches('[data-keep]'));
      if (!first) break; first.remove();
    }
  };
})(window);
