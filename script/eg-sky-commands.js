/* eg-sky-commands.js — terminal commands built on EG.sky / EG.sim.  Load AFTER eg-terminal.js, eg-ephemeris.js, eg-sky.js, eg-sim.js. */
(function (g) {
  'use strict';
  const EG = g.EG, add = (d) => EG.registry.register(d);
  const out = () => document.getElementById('cmd-output');
  const say = (html) => { const d = document.createElement('div'); d.innerHTML = html; out().appendChild(d); out().scrollTop = out().scrollHeight; return ''; };   // html here is OUR text only
  const hhmm = (d) => d ? d.toISOString().slice(11, 16) : '—';
  const iso = (d) => d ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—';
  const PLACES = { greenwich: [51.4779, 0], giza: [29.9792, 31.1342], jerusalem: [31.7683, 35.2137], mecca: [21.4225, 39.8262], kyoto: [35.0116, 135.7681] };
  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  add({ name: 'anchor', category: 'Sky', usage: 'anchor <lat> <lon> | <place> | me', summary: 'Set the observer location used by sky commands', complete: () => Object.keys(PLACES).concat('me'),
    run(a) {
      const p = (a[0] || '').toLowerCase();
      if (p === 'me') { navigator.geolocation ? navigator.geolocation.getCurrentPosition((r) => { EG.sim.set({ anchor: { lat: r.coords.latitude, lon: r.coords.longitude, name: 'me' } }); say('📍 anchor set to your position'); }, () => say('⚠️ location denied')) : say('⚠️ no geolocation'); return 'asking the browser…'; }
      if (PLACES[p]) { EG.sim.set({ anchor: { lat: PLACES[p][0], lon: PLACES[p][1], name: p } }); return '📍 anchor = ' + p; }
      const lat = +a[0], lon = +a[1];
      if (a.length >= 2 && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { EG.sim.set({ anchor: { lat, lon, name: 'custom' } }); return `📍 anchor = ${lat}, ${lon}`; }
      const A = EG.sim.anchor; return `Anchor: ${A.name} (${(+A.lat).toFixed(3)}, ${(+A.lon).toFixed(3)})\nUsage: anchor <lat> <lon> | greenwich | giza | jerusalem | mecca | kyoto | me`;
    } });

  add({ name: 'planets', aliases: ['sky'], category: 'Sky', usage: 'planets', summary: 'Positions of Sun…Pluto right now (sign, degree, retrograde)',
    run() {
      const d = EG.sim.date(), rows = BODIES.map((b) => { const l = EG.ephem.lon(b, d), f = EG.sky.fmtLon(l); return `${EG.sky.GLYPH[b]} ${b.padEnd(8)} ${f.text.padEnd(10)} ${f.name.padEnd(11)} ${EG.ephem.retrograde(b, d) ? '℞' : ''}`; });
      return `<pre style="margin:6px 0;color:#ddd">${EG.esc(iso(d))}\n${rows.map(EG.esc).join('\n')}</pre>`;
    } });

  add({ name: 'moon', category: 'Sky', usage: 'moon', summary: 'Phase, illumination, age and the next four phases',
    run() {
      const d = EG.sim.date(), m = EG.sky.moon(d);
      return `🌓 <b>${m.name}</b> · ${(m.illumination * 100).toFixed(0)}% lit · age ${m.ageDays.toFixed(1)} d<br>` + m.next.map((n) => `&nbsp;&nbsp;${n.name.padEnd(14, '\u00a0')} ${iso(n.date)}`).join('<br>');
    } });

  add({ name: 'sun', category: 'Sky', usage: 'sun', summary: 'Sunrise/noon/sunset at your anchor + next equinox/solstice',
    run() {
      const d = EG.sim.date(), A = EG.sim.anchor, t = EG.sky.sunTimes(d, A.lat, A.lon), n = EG.sky.nextTerms(d);
      return `☀ <b>${A.name}</b> — rise ${hhmm(t.rise)} · noon ${hhmm(t.noon)} · set ${hhmm(t.set)} UTC${t.polar ? ' (' + t.polar + ')' : ''}<br>` + n.map((x) => `&nbsp;&nbsp;${x.name.padEnd(18, '\u00a0')} ${iso(x.date)}`).join('<br>');
    } });

  /* gallery next|prev — your slideshow  ·  bg next|prev — the INDEPENDENT folder (images/indepedentBG). Both are exposed by app.js as EG.gallery / EG.bg */
  add({ name: 'gallery', category: 'Theme & UI', usage: 'gallery next | gallery prev', summary: 'Step the slideshow forwards / backwards', complete: () => ['next', 'prev'],
    run(a) { if (!EG.gallery) return 'gallery is not ready'; if (a[0] === 'next') return '📷 ' + EG.gallery.next(); if (a[0] === 'prev') return '📷 ' + EG.gallery.prev(); return 'Usage: gallery next | gallery prev'; } });
  add({ name: 'bg', category: 'Theme & UI', usage: 'bg next | bg prev', summary: 'Step the independent background folder forwards / backwards (switches BG to independent)', complete: () => ['next', 'prev'],
    run(a) { if (!EG.bg) return 'bg is not ready'; if (a[0] === 'next') return '🖼️ ' + EG.bg.next(); if (a[0] === 'prev') return '🖼️ ' + EG.bg.prev(); return '🖼️ ' + EG.bg.status() + '\nUsage: bg next | bg prev'; } });

  /* clock <mode> — drives your existing style button until its label matches (no need to touch its internal state) */
  const LABEL = { classic: 'CLASSIC', glass: 'GLASSIC', digital: 'DIGITAL', cistercian: 'CISTERCIAN', cosmic: 'COSMIC', celestial: 'CELESTIAL' };
  EG.setClockMode = (mode) => { const b = document.getElementById('zen-toggle-btn'); if (!b || !LABEL[mode]) return false; for (let i = 0; i < 6 && !b.innerText.includes(LABEL[mode]); i++) b.click(); return b.innerText.includes(LABEL[mode]); };
  add({ name: 'clock', category: 'Theme & UI', usage: 'clock <classic|glass|digital|cistercian|cosmic|celestial>', summary: 'Pick a clock style directly', complete: () => Object.keys(LABEL),
    run(a) { return EG.setClockMode((a[0] || '').toLowerCase()) ? '🕰️ ' + a[0] : 'Usage: clock <' + Object.keys(LABEL).join('|') + '>'; } });

  /* youtube — it was never a command; this is an alias for `play youtube` that also makes sure the API is loaded */
  add({ name: 'youtube', aliases: ['yt'], category: 'Media', usage: 'youtube <url|id>', summary: 'Alias for: play youtube <url>',
    async run(a) { await EG.loadLib('youtube'); return EG.registry.legacy().play(['youtube'].concat(a)); } });

  /* backup — everything EliteGDX remembers on THIS device (vault key, tags, command history, theme, anchor, settings) as one JSON file.
     Why: localStorage does not travel. A backup lets you (1) undo an accidental `nuke`, (2) move to another phone/browser, (3) survive "clear browsing data".
     The file contains your vault key and tags in PLAIN TEXT — keep it private. */
  const OK_KEY = /^eg:[A-Za-z0-9_.:-]{1,80}$/;
  function exportBackup() {
    const keys = {}; EG.store.keys().forEach((k) => { if (k.startsWith('eg:')) keys[k] = localStorage.getItem(k); });
    const file = { format: 'elitegdx-backup', version: 1, app: EG.VERSION, exported: new Date().toISOString(), keys };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = 'elitegdx-backup-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    return Object.keys(keys).length;
  }
  function importBackup() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text()), keys = data && data.keys ? data.keys : data; let n = 0;
        if (!keys || typeof keys !== 'object') throw new Error('not a backup file');
        Object.keys(keys).forEach((k) => { if (OK_KEY.test(k) && typeof keys[k] === 'string' && keys[k].length < 1e6) { localStorage.setItem(k, keys[k]); n++; } });   // only eg:* keys, only strings
        say(n ? '✅ Restored ' + n + ' items. Reloading…' : '⚠️ That file had nothing I can restore.'); if (n) setTimeout(() => location.reload(), 1200);
      } catch (e) { say('⚠️ Could not read that backup: ' + EG.esc(e.message)); }
    };
    inp.click();
  }
  add({ name: 'backup', category: 'System', usage: 'backup | backup import', summary: 'Save / restore your EliteGDX data as a file', complete: () => ['import'],
    run(a) {
      if (a[0] === 'import') { importBackup(); return '📂 Choose a backup file…'; }
      return '💾 Backup saved (' + exportBackup() + ' items). Keep the file private — it holds your vault key in plain text.<br>Restore it any time (even on another device) with: <b>backup import</b>';
    } });

  /* nuke — confirmation first; `nuke --export` is the same as `backup` */
  add({ name: 'nuke', category: 'System', usage: 'nuke [--export] [--yes]', summary: 'Factory reset (EliteGDX data only)',
    run(a) {
      if (a.includes('--export')) return '💾 Backup saved (' + exportBackup() + ' items). Now run: <b>nuke --yes</b> — and later <b>backup import</b> brings it all back.';
      if (!a.includes('--yes')) return `<span style="color:#ff5555">⚠️ This erases ALL EliteGDX data on this device (tags, vault key, history, settings).</span><br>Run <b>nuke --export</b> first to save a backup (restore with <b>backup import</b>), then <b>nuke --yes</b> to proceed.`;
      return EG.registry.legacy().nuke();
    } });
})(window);
