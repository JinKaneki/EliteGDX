/* sephirot-sacred.js — turns your existing #tree-of-life SVG into a living Tree. Adds, without replacing anything:
   • the 22 Paths with their Hebrew letters (Golden-Dawn attribution)   • the Lightning Flash with a travelling light
   • the three Pillars   • breathing glow   • click = correspondences + where that planet IS right now (live ephemeris)
   • "Walk the Flash" guided meditation (Kether → Malkuth).   Everything is positioned from YOUR circles' cx/cy. */
(function () {
  'use strict';
  const svg = document.getElementById('tree-of-life'); if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; parent && parent.appendChild(e); return e; };

  /* 1. node centres, read from the markup you already have */
  const N = {}; svg.querySelectorAll('circle[data-node]').forEach((c) => { N[c.dataset.node] = { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), el: c }; });
  if (!N.kether || !N.malkuth) return;

  /* 2. the 22 paths: [letter, glyph, from, to] */
  const PATHS = [['Aleph','א','kether','chokmah'],['Beth','ב','kether','binah'],['Gimel','ג','kether','tiphareth'],['Daleth','ד','chokmah','binah'],['Heh','ה','chokmah','tiphareth'],
    ['Vav','ו','chokmah','chesed'],['Zayin','ז','binah','tiphareth'],['Cheth','ח','binah','geburah'],['Teth','ט','chesed','geburah'],['Yod','י','chesed','tiphareth'],
    ['Kaph','כ','chesed','netzach'],['Lamed','ל','geburah','tiphareth'],['Mem','מ','geburah','hod'],['Nun','נ','tiphareth','netzach'],['Samekh','ס','tiphareth','yesod'],
    ['Ayin','ע','tiphareth','hod'],['Peh','פ','netzach','hod'],['Tzaddi','צ','netzach','yesod'],['Qoph','ק','netzach','malkuth'],['Resh','ר','hod','yesod'],['Shin','ש','hod','malkuth'],['Tav','ת','yesod','malkuth']];

  /* 3. correspondences  [number, planet, divine name, archangel, contemplation] */
  const X = {
    kether:   [1, null, 'Eheieh', 'Metatron', 'What remains when every thought is set down?'],
    chokmah:  [2, null, 'Yah', 'Raziel', 'What did you know before you learned anything?'],
    binah:    [3, 'Saturn', 'YHVH Elohim', 'Tzaphkiel', 'What shape does your sorrow give your wisdom?'],
    chesed:   [4, 'Jupiter', 'El', 'Tzadkiel', 'Where could you give without being asked?'],
    geburah:  [5, 'Mars', 'Elohim Gibor', 'Kamael', 'Which boundary protects what you love?'],
    tiphareth:[6, 'Sun', 'YHVH Eloah ve-Da\'at', 'Raphael', 'Where do opposites meet peacefully in you?'],
    netzach:  [7, 'Venus', 'YHVH Tzabaoth', 'Haniel', 'What do you do when nobody is watching?'],
    hod:      [8, 'Mercury', 'Elohim Tzabaoth', 'Michael', 'Which story are you ready to put down?'],
    yesod:    [9, 'Moon', 'Shaddai El Chai', 'Gabriel', 'What dream keeps returning, and what does it want?'],
    malkuth:  [10, null, 'Adonai ha-Aretz', 'Sandalphon', 'What is the next small, real thing to do?'],
  };
  const PILLAR = { chokmah: 'Mercy', chesed: 'Mercy', netzach: 'Mercy', binah: 'Severity', geburah: 'Severity', hod: 'Severity', kether: 'Balance', tiphareth: 'Balance', yesod: 'Balance', malkuth: 'Balance' };

  /* 4. styles (injected so this stays a single file) */
  const css = document.createElement('style');
  css.textContent = `
  #tree-of-life .eg-path{stroke:#e8c46a;stroke-opacity:.35;stroke-width:1.4;fill:none;transition:stroke-opacity .3s,stroke-width .3s}
  #tree-of-life .eg-path.hot{stroke-opacity:.95;stroke-width:3;filter:url(#egGlow)}
  #tree-of-life .eg-letter{fill:#e8c46a;font:600 13px 'Times New Roman',serif;text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:#05040a;stroke-width:3px;opacity:.85;cursor:help}
  #tree-of-life .eg-pillar{fill:#a98a3d;font:11px Georgia,serif;letter-spacing:.3em;text-anchor:middle;opacity:.8}
  #tree-of-life circle[data-node]{animation:egBreathe 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  #tree-of-life circle[data-node]:hover{filter:url(#egGlow)} #tree-of-life circle.sel{stroke:#e8c46a;stroke-width:6;filter:url(#egGlow)}
  @keyframes egBreathe{0%,100%{filter:drop-shadow(0 0 3px rgba(232,196,106,.25))}50%{filter:drop-shadow(0 0 14px rgba(232,196,106,.7))}}
  @media (prefers-reduced-motion:reduce){#tree-of-life circle[data-node]{animation:none}}
  #eg-seph-info{margin:14px auto 0;max-width:460px;padding:12px 14px;border:1px solid rgba(232,196,106,.35);border-radius:10px;background:rgba(0,0,0,.45);font:13px/1.6 Georgia,serif;color:#ddd7c8;text-align:left}
  #eg-seph-info b{color:#e8c46a}#eg-seph-info .q{display:block;margin-top:6px;color:#e8c46a;font-style:italic}
  #eg-walk{margin-top:10px;background:#0b0a10;color:#e8c46a;border:1px solid #a98a3d;border-radius:999px;padding:8px 20px;cursor:pointer;font:600 13px Georgia,serif;letter-spacing:.15em}`;
  document.head.appendChild(css);

  /* 5. defs: soft glow */
  const defs = mk('defs', {}, svg), f = mk('filter', { id: 'egGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  mk('feGaussianBlur', { stdDeviation: 5, result: 'b' }, f); const mg = mk('feMerge', {}, f); mk('feMergeNode', { in: 'b' }, mg); mk('feMergeNode', { in: 'SourceGraphic' }, mg);

  /* 6. paths + letters go UNDER the nodes (insert before the nodes group) */
  const layer = mk('g', { id: 'eg-paths' }); svg.insertBefore(layer, svg.querySelector('#sephirot-group'));
  const pathEls = PATHS.map(([name, glyph, a, b], i) => {
    if (!N[a] || !N[b]) return null;
    const A = N[a], B = N[b], p = mk('line', { class: 'eg-path', x1: A.x, y1: A.y, x2: B.x, y2: B.y }, layer);
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, t = mk('text', { class: 'eg-letter', x: mx, y: my }, layer, glyph);
    mk('title', {}, t, `Path ${11 + i} · ${name} · ${a} ↔ ${b}`); return { p, a, b };
  }).filter(Boolean);

  /* 7. pillars */
  [['MERCY', N.chokmah.x], ['BALANCE', N.kether.x], ['SEVERITY', N.binah.x]].forEach(([t, x]) => mk('text', { class: 'eg-pillar', x, y: -22 }, svg, t));

  /* 8. the Lightning Flash: Kether → Malkuth in the order of emanation, with a travelling light */
  const FLASH = ['kether', 'chokmah', 'binah', 'chesed', 'geburah', 'tiphareth', 'netzach', 'hod', 'yesod', 'malkuth'];
  const d = FLASH.map((k, i) => (i ? 'L' : 'M') + N[k].x + ' ' + N[k].y).join(' ');
  const trail = mk('path', { d, fill: 'none', stroke: '#fff3c9', 'stroke-opacity': .25, 'stroke-width': 2, 'stroke-dasharray': '4 8' }, layer);
  const spark = mk('circle', { r: 6, fill: '#fff3c9', filter: 'url(#egGlow)', 'pointer-events': 'none' }, svg);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const am = mk('animateMotion', { dur: '16s', repeatCount: 'indefinite', path: d, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' }, spark);
  } else spark.remove();
  svg.appendChild(spark);

  /* 9. info panel + selection */
  const anchor = document.getElementById('reflection-text') || svg;
  const info = document.createElement('div'); info.id = 'eg-seph-info'; info.hidden = true; anchor.insertAdjacentElement('afterend', info);
  function select(key) {
    svg.querySelectorAll('circle.sel').forEach((c) => c.classList.remove('sel')); N[key].el.classList.add('sel');
    pathEls.forEach(({ p, a, b }) => p.classList.toggle('hot', a === key || b === key));         // light up the paths touching this sephirah
    const x = X[key]; if (!x) { info.hidden = true; return; }
    let live = ''; if (x[1] && window.EG && EG.ephem && EG.sky) { const l = EG.ephem.lon(x[1], new Date()); live = `<br>Right now ${x[1]} stands at <b>${EG.sky.fmtLon(l).text}</b>${EG.ephem.retrograde(x[1], new Date()) ? ' ℞' : ''}`; }
    info.hidden = false;
    info.innerHTML = `<b>${x[0]}</b> · pillar of <b>${PILLAR[key]}</b>${x[1] ? ' · ' + x[1] : ''}<br>Divine name <b>${x[2]}</b> · archangel <b>${x[3]}</b>${live}<span class="q">${x[4]}</span>`;
  }
  svg.addEventListener('click', (e) => { const c = e.target.closest('circle[data-node]'); if (c && N[c.dataset.node]) select(c.dataset.node); });   // runs alongside YOUR existing click handler

  /* 10. "Walk the Flash" — one sephirah at a time, Kether → Malkuth.
         • the button walks the Tree ONCE and stops      • the terminal command `flash` repeats FOREVER until `flash stop`          */
  const btn = document.createElement('button'); btn.id = 'eg-walk'; btn.textContent = '⚡ WALK THE FLASH'; info.insertAdjacentElement('afterend', btn);
  let walker = null, looping = false;
  function stopWalk() { clearInterval(walker); walker = null; looping = false; btn.textContent = '⚡ WALK THE FLASH'; }
  function startWalk(loop, seconds) {
    stopWalk(); looping = !!loop; let i = 0; btn.textContent = '■ STOP';
    const step = () => {
      N[FLASH[i % FLASH.length]].el.dispatchEvent(new MouseEvent('click', { bubbles: true })); i++;       // same path as a real click: info panel, lit paths, live planet
      if (!looping && i > FLASH.length) stopWalk();                                                      // single pass ends after Malkuth
    };
    step(); walker = setInterval(step, Math.max(2, Math.min(30, seconds || 6)) * 1000);
  }
  btn.addEventListener('click', () => (walker ? stopWalk() : startWalk(false)));
  window.EG = window.EG || {};
  EG.sephirot = { walk: startWalk, stop: stopWalk, running: () => !!walker, looping: () => looping };

  /* terminal:  flash            walk the Tree again and again, 6 s per sephirah
                flash 3          …3 s per sephirah (2–30)
                flash --view     …and scroll the Tree into view first
                flash --once     a single pass       |   flash stop   stop (Ctrl+C stops it too) */
  if (EG.registry) EG.registry.register({
    name: 'flash', aliases: ['walkflash'], category: 'Wisdom', usage: 'flash [seconds] [--view] [--once] | flash stop', summary: 'Walk the Lightning Flash Kether→Malkuth, repeating until you stop it',
    complete: () => ['stop', '--view', '--once'],
    run(a) {
      if (a.includes('stop')) { const was = !!walker; stopWalk(); return was ? '■ the Flash rests' : 'The Flash was not running.'; }
      const secs = a.map(Number).find((n) => n >= 2 && n <= 30) || 6, once = a.includes('--once');
      if (a.includes('--view')) svg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startWalk(!once, secs);
      return '⚡ Walking the Flash ' + (once ? 'once' : 'forever') + ' (' + secs + ' s per sephirah). Stop with: flash stop';
    },
  });
})();
