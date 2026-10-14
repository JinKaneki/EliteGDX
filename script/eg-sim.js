/* eg-sim.js — ONE shared clock for every astro view.
   Time model:  simMs(now) = baseSim + (performance.now() - baseWall) * rate      (while playing)
   Changing rate / pausing / jumping "re-bases" first, so time never leaps. */
(function (g) {
  'use strict';
  const EG = g.EG, subs = new Set();
  const st = { baseSim: Date.now(), baseWall: performance.now(), rate: 1, playing: true, anchor: { lat: 51.4779, lon: 0, name: 'Greenwich' } };
  const store = EG.store;
  try { const a = store && store.getJSON('anchor', null); if (a) st.anchor = a; } catch (e) {}

  const sim = EG.sim = {
    ms()   { return st.playing ? st.baseSim + (performance.now() - st.baseWall) * st.rate : st.baseSim; },
    date() { return new Date(this.ms()); },
    get rate() { return st.rate; }, get playing() { return st.playing; }, get anchor() { return st.anchor; },
    /** set({t, rate, playing, anchor}) — any subset. `t` may be a Date or ms. */
    set(p) {
      const now = this.ms();                                           // 1) freeze the current simulated instant …
      st.baseSim = p.t !== undefined ? +p.t : now;                      // 2) … jump if asked …
      st.baseWall = performance.now();                                 // 3) … and restart the stopwatch from here
      if (p.rate !== undefined) st.rate = p.rate;
      if (p.playing !== undefined) st.playing = p.playing;
      if (p.anchor) { st.anchor = Object.assign({}, st.anchor, p.anchor); try { store.setJSON('anchor', st.anchor); } catch (e) {} }
      subs.forEach((fn) => { try { fn(sim); } catch (e) { console.error(e); } });
    },
    step(ms) { this.set({ t: this.ms() + ms }); },
    live()   { this.set({ t: Date.now(), rate: 1, playing: true }); },  // "NOW"
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    isLive() { return st.playing && st.rate === 1 && Math.abs(this.ms() - Date.now()) < 2000; },
  };

  /* ---- shareable URL:  #t=2026-12-21T20:49:00Z&lat=-33.9&lon=18.4&rate=60  ---- */
  const parseHash = () => { const o = {}; new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { o[k] = v; }); return o; };
  EG.simFromHash = function () {
    const h = parseHash(), p = {};
    if (h.t && !isNaN(Date.parse(h.t))) { p.t = Date.parse(h.t); p.playing = h.rate ? true : false; }
    if (h.rate && isFinite(+h.rate)) p.rate = +h.rate;
    if (isFinite(+h.lat) && isFinite(+h.lon) && h.lat !== undefined && h.lon !== undefined && Math.abs(+h.lat) <= 90 && Math.abs(+h.lon) <= 180) p.anchor = { lat: +h.lat, lon: +h.lon, name: 'link' };
    if (Object.keys(p).length) sim.set(p);
  };
  let timer = null;
  EG.simToHash = function () {                                          // debounced: dragging a slider must not spam history
    clearTimeout(timer);
    timer = setTimeout(() => {
      const a = sim.anchor, q = new URLSearchParams();
      if (!sim.isLive()) q.set('t', sim.date().toISOString().replace('.000Z', 'Z'));
      if (sim.rate !== 1) q.set('rate', sim.rate);
      q.set('lat', a.lat.toFixed(3)); q.set('lon', a.lon.toFixed(3));
      history.replaceState(null, '', '#' + q.toString());              // replaceState: no new back-button entry
    }, 400);
  };
  sim.subscribe(EG.simToHash);
  EG.simFromHash();                                                     // honour a shared link on load
  g.addEventListener('hashchange', EG.simFromHash);
})(window);
