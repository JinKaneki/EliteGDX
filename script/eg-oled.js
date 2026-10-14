/* eg-oled.js — true-black mode for OLED / always-on screens.      oled [on|off|auto]
   on    all backgrounds off (pure #000 = pixels fully OFF), blur/glow removed, 0-2 px pixel-shift every 3 min against burn-in
   auto  black from YOUR local sunset to sunrise (uses the anchor set with `anchor`), normal by day. Remembered across reloads.            */
(function () {
  'use strict';
  const root = document.documentElement, KEY = 'oled';            // stored value: '1' on · '0' off · 'auto'
  let shiftTimer = null, autoTimer = null;
  const shift = () => { root.style.setProperty('--sx', (Math.random() * 4 - 2).toFixed(0) + 'px'); root.style.setProperty('--sy', (Math.random() * 4 - 2).toFixed(0) + 'px'); };
  function paint(on) {
    root.classList.toggle('oled', on); clearInterval(shiftTimer);
    if (on) { shift(); shiftTimer = setInterval(shift, 180000); } else { root.style.removeProperty('--sx'); root.style.removeProperty('--sy'); }
  }
  /** Is it night at the anchor? Compares with sunrise/sunset of yesterday, today AND tomorrow (UTC), because at far-east/west
      longitudes the local sunrise belongs to a different UTC date than "now". */
  function night(now) {
    now = now || Date.now(); const A = EG.sim.anchor, today = EG.sky.sunTimes(new Date(now), A.lat, A.lon);
    if (today.polar) return today.polar === 'polar night';
    return ![-1, 0, 1].some((k) => { const t = EG.sky.sunTimes(new Date(now + k * 864e5), A.lat, A.lon); return t.rise && now >= t.rise.getTime() && now <= t.set.getTime(); });
  }
  function startAuto() { clearInterval(autoTimer); const tick = () => paint(night()); tick(); autoTimer = setInterval(tick, 60000); }
  function setMode(m) { clearInterval(autoTimer); autoTimer = null; EG.store.set(KEY, m); m === 'auto' ? startAuto() : paint(m === '1'); }
  EG._oledNight = night;                                           // exposed for tests

  const saved = EG.store.get(KEY);
  if (saved === 'auto') startAuto(); else if (saved === '1') paint(true);

  EG.registry.register({ name: 'oled', category: 'Theme & UI', usage: 'oled [on|off|auto]', summary: 'True-black mode with pixel-shift (auto = black from sunset to sunrise)', complete: () => ['on', 'off', 'auto'],
    run(a) {
      const m = (a[0] || '').toLowerCase();
      if (m === 'auto') { setMode('auto'); return '🌑 auto: black from sunset to sunrise at your anchor (' + EG.sim.anchor.name + '). Change it with: anchor <place>'; }
      setMode(m ? (m === 'on' ? '1' : '0') : (root.classList.contains('oled') ? '0' : '1'));
      return root.classList.contains('oled') ? '🌑 true-black ON' : '☀ true-black OFF';
    } });
})();
