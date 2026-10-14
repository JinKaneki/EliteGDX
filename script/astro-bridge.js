/* astro-bridge.js — the Cosmic, Flat-Earth and Astrolabe panels now follow ONE clock (EG.sim). Their own buttons write to it;
   this keeps every panel's ⏸/▶ and ⚡speed labels in step when ANYTHING (another panel, <astro-controls>, a shared link) changes it. */
(function () {
  'use strict';
  const set = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
  function labels() {
    const s = EG.sim, run = s.playing;
    set('c-play-pause', run ? '⏸ PAUSE' : '▶ PLAY'); set('fe-play-pause', run ? '⏸ PAUSE' : '▶ PLAY'); set('astro-playpause', run ? '⏸ Pause' : '▶ Play');
    set('c-speed', '⚡' + s.rate + 'x'); set('fe-speed', '⚡ ' + s.rate + 'x'); set('astro-speed', '⚡' + s.rate + 'x');
  }
  EG.sim.subscribe(labels); labels();
})();
