/* gallery.js — builds the rotating image/text blocks from script/gallery-data.js
   (previously 78 hand-written <div class="block"> in index.html).
   • To add a slide, add ONE line to gallery-data.js — nothing else.
   • Images are lazy: a hidden slide costs nothing; the next slide is
     prefetched one step ahead so the 1-second fade never shows an empty frame.
   • DOM is built with createElement/textContent (no innerHTML). */
(function () {
  'use strict';
  const root = document.querySelector('.content-blocks');
  const data = window.EG_GALLERY;
  if (!root || !Array.isArray(data) || root.querySelector('.block')) return;   // static markup present => leave it alone

  const frag = document.createDocumentFragment();
  data.forEach((g) => {
    const block = document.createElement('div'); block.className = 'block';
    const p = document.createElement('p'); p.className = 'block-text';
    String(g.t || '').split('\n').forEach((line, i, arr) => { p.appendChild(document.createTextNode(line)); if (i < arr.length - 1) p.appendChild(document.createElement('br')); });
    block.appendChild(p);
    if (g.i) {
      const wrap = document.createElement('div'); wrap.className = 'image-block';
      const img = document.createElement('img');
      img.alt = g.a || ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = g.i;
      img.addEventListener('error', () => { wrap.style.display = 'none'; });            // a missing file never leaves a broken-image icon
      wrap.appendChild(img); block.appendChild(wrap);
    }
    frag.appendChild(block);
  });
  root.appendChild(frag);

  /** Start loading a slide's image now (used for the active slide and the one after it). */
  window.EG_prefetch = function (block) {
    const img = block && block.querySelector && block.querySelector('img');
    if (img && img.loading !== 'eager') img.loading = 'eager';
  };
})();
