/* astro-controls.js — <astro-controls></astro-controls>   (needs eg-sim.js + eg-sky.js + eg-ephemeris.js)
   Replaces the four rows of ± buttons: date-time picker, scrubber, labelled speed ladder, event presets,
   location, and a live readout (moon phase/age, next full moon, solstice countdown, sunrise/sunset). */
(function (g) {
  'use strict';
  const EG = g.EG, S = () => EG.sky;
  const SPEEDS = [[1, '1× real time'], [60, '60× · 1 s = 1 min'], [3600, '3 600× · 1 s = 1 h'], [86400, '86 400× · 1 s = 1 day'], [604800, '1 s = 1 week'], [2629800, '1 s = 1 month'], [31557600, '1 s = 1 year']];
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());   // <input type=datetime-local> wants LOCAL time
  const fmt = (d) => d ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—';
  const left = (to, from) => { const m = Math.max(0, Math.round((to - from) / 6e4)); return Math.floor(m / 1440) + 'd ' + pad(Math.floor(m % 1440 / 60)) + 'h ' + pad(m % 60) + 'm'; };
  const hm = (d) => d ? pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) : '—';
  const addMonths = (d, n) => {
    const x = new Date(d), day = x.getUTCDate();
    x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n);                                  // move to the 1st first, so no overflow
    const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();   // length of the target month
    x.setUTCDate(Math.min(day, last)); return x;
  };

  class AstroControls extends HTMLElement {
    connectedCallback() {
      if (this._on) return; this._on = true;
      this.className = 'astro-controls';
      this.innerHTML = `
        <div class="ac-row">
          <button data-a="play" title="Play / pause">⏯</button>
          <button data-a="now"  title="Back to the present">NOW</button>
          <button data-a="-1d">-1 d</button><button data-a="+1d">+1 d</button>
          <input type="datetime-local" data-a="when" aria-label="Date and time (your local time)">
          <select data-a="speed" aria-label="Simulation speed">${SPEEDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
        </div>
        <div class="ac-row">
          <input type="range" data-a="scrub" min="-366" max="366" step="0.25" value="0" aria-label="Scrub ±1 year around the pivot">
          <span data-r="scrubtxt">±0 d</span>
        </div>
        <div class="ac-row">
          <select data-a="preset" aria-label="Jump to an event"><option value="">⏭ Jump to…</option>
            <option value="m0">Next New Moon</option><option value="m90">Next First Quarter</option><option value="m180">Next Full Moon</option><option value="m270">Next Last Quarter</option>
            <option value="s0">Next March Equinox</option><option value="s90">Next June Solstice</option><option value="s180">Next September Equinox</option><option value="s270">Next December Solstice</option>
            <option value="sr">Next sunrise here</option><option value="ss">Next sunset here</option></select>
          <label>lat <input type="number" data-a="lat" step="0.01" min="-90" max="90" inputmode="decimal"></label>
          <label>lon <input type="number" data-a="lon" step="0.01" min="-180" max="180" inputmode="decimal"></label>
          <button data-a="geo" title="Use my location">📍</button>
          <button data-a="+6mo" title="Jump 6 months ahead">+6 Mo</button>
          <button data-a="+1y"  title="Jump 1 year ahead">+1 Yr</button>
        </div>
        <div class="ac-read" data-r="read" aria-live="off"></div>`;
      this._pivot = EG.sim.ms();
      this.addEventListener('click', (e) => this._click(e));
      this.addEventListener('input', (e) => this._input(e));
      this.addEventListener('change', (e) => this._input(e, true));
      this._unsub = EG.sim.subscribe(() => this._sync());
      this._sync(); this._loop();
    }
    disconnectedCallback() { this._unsub && this._unsub(); this._on = false; this._dead = true; }
    $(s) { return this.querySelector(s); }

    _click(e) {
      const b = e.target.closest('button[data-a]'); if (!b) return; const a = b.dataset.a, sim = EG.sim;
      if (a === 'play') sim.set({ playing: !sim.playing });
      else if (a === 'now') { sim.live(); this._pivot = sim.ms(); }
      else if (a === '-1d' || a === '+1d') sim.step((a[0] === '-' ? -1 : 1) * 864e5);
      else if (a === '+6mo' || a === '+1y') {
        const to = addMonths(sim.date(), a === '+6mo' ? 6 : 12);
        sim.set({ t: to, playing: false });      // jump and pause; every panel follows the shared clock
        this._pivot = to.getTime();              // re-centre the ±1-year scrubber on the new date
      }
      else if (a === 'geo') navigator.geolocation && navigator.geolocation.getCurrentPosition((p) => sim.set({ anchor: { lat: p.coords.latitude, lon: p.coords.longitude, name: 'me' } }));
    }
    _input(e, committed) {
      const t = e.target, a = t.dataset.a, sim = EG.sim; if (!a) return;
      if (a === 'when' && t.value) sim.set({ t: new Date(t.value).getTime(), playing: false });          // typed a date: stop and show it
      else if (a === 'speed') sim.set({ rate: +t.value, playing: true });
      else if (a === 'scrub') { sim.set({ t: this._pivot + (+t.value) * 864e5, playing: false }); }
      else if ((a === 'lat' || a === 'lon') && committed) { const lat = +this.$('[data-a=lat]').value, lon = +this.$('[data-a=lon]').value; if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) sim.set({ anchor: { lat, lon, name: 'custom' } }); }
      else if (a === 'preset' && t.value) { this._jump(t.value); t.value = ''; }
    }
    _jump(code) {
      const sim = EG.sim, now = sim.date(), A = sim.anchor; let to = null;
      if (code[0] === 'm') to = S().nextPhase(now, +code.slice(1));
      else if (code === 'sr' || code === 'ss') {
        for (let k = 0; k < 3 && !to; k++) { const st = S().sunTimes(new Date(now.getTime() + k * 864e5), A.lat, A.lon), c = code === 'sr' ? st.rise : st.set; if (c && c > now) to = c; }
      } else { const target = +code.slice(1); to = S().nextTerms(now).find((x) => x.name === { 0: 'March Equinox', 90: 'June Solstice', 180: 'September Equinox', 270: 'December Solstice' }[target]).date; }
      if (to) { sim.set({ t: to, playing: false }); this._pivot = to.getTime(); }
    }
    _sync() {                                                   // keep the widgets honest when ANY view changes the clock
      const sim = EG.sim, d = sim.date(), w = this.$('[data-a=when]'), sp = this.$('[data-a=speed]');
      if (document.activeElement !== w) w.value = toLocalInput(d);
      if (![...sp.options].some((o) => +o.value === sim.rate)) sp.add(new Option(sim.rate + '×', sim.rate));
      sp.value = sim.rate;
      const off = (sim.ms() - this._pivot) / 864e5, sc = this.$('[data-a=scrub]');
      if (Math.abs(off) <= 366 && document.activeElement !== sc) sc.value = off;
      this.$('[data-r=scrubtxt]').textContent = (off >= 0 ? '+' : '−') + Math.abs(off).toFixed(1) + ' d';
      this.$('[data-a=play]').textContent = sim.playing ? '⏸' : '▶';
      ['lat', 'lon'].forEach((k) => { const i = this.$('[data-a=' + k + ']'); if (document.activeElement !== i) i.value = (+sim.anchor[k]).toFixed(2); });
    }
    _render() {                                                 // the heavy readout — computed ~1×/s, never per frame
      if (!EG.sky) return; const sim = EG.sim, d = sim.date(), A = sim.anchor, m = S().moon(d), t = S().nextTerms(d)[0], day = S().sunTimes(d, A.lat, A.lon);
      const full = m.next.find((n) => n.name === 'Full Moon'), nw = m.next.find((n) => n.name === 'New Moon');
      this.$('[data-r=read]').innerHTML =
        `🌓 <b>${m.name}</b> · ${(m.illumination * 100).toFixed(0)}% lit · age ${m.ageDays == null ? '—' : m.ageDays.toFixed(1)} d<br>` +
        `🌕 Next full moon <b>${fmt(full.date)}</b> (in ${left(full.date, d)})  ·  🌑 new moon ${fmt(nw.date)}<br>` +
        `☀ Sunrise ${hm(day.rise)} · noon ${hm(day.noon)} · sunset ${hm(day.set)} UTC${day.polar ? ' (' + day.polar + ')' : ''}<br>` +
        `🌐 ${t.name} <b>${fmt(t.date)}</b> (in ${left(t.date, d)})`;
    }
    _loop() {                                                   // visibility-aware: sleeps when this panel is off-screen
      if (this._dead) return;
      EG.next('astro-controls', () => { this._render(); this._sync(); this._loop(); }, { el: this, interval: () => 1000 });
    }
  }
  if (!customElements.get('astro-controls')) customElements.define('astro-controls', AstroControls);
  const css = document.createElement('style');
  css.textContent = `.astro-controls{display:block;font:12px/1.5 monospace;color:#ddd;padding:8px;border:1px solid rgba(232,196,106,.35);border-radius:10px;background:rgba(0,0,0,.45)}
  .astro-controls .ac-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}.astro-controls input[type=range]{flex:1;min-width:140px;accent-color:#e8c46a}
  .astro-controls button,.astro-controls select,.astro-controls input[type=datetime-local],.astro-controls input[type=number]{background:#0b0a10;color:#e8c46a;border:1px solid #a98a3d;border-radius:6px;padding:5px 8px;font:inherit;min-height:32px}
  .astro-controls input[type=number]{width:74px}.astro-controls .ac-read{margin-top:6px;color:#ccc}.astro-controls b{color:#e8c46a}`;
  document.head.appendChild(css);
})(window);
