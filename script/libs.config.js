/* libs.config.js — every third-party script EliteGDX can lazy-load.
   • Versions are PINNED (no more "@latest" surprises).
   • Nothing here loads on page start; EG.loadLib('name') loads on demand.
   • Run  node tools/vendor.mjs  once to download local copies + SRI hashes
     (writes script/libs.vendored.js).  Local copies are tried first.
   • Optional: put your own Cloudflare Worker URL in EG_CONFIG.workerUrl
     (see tools/cors-worker.js) to make remoteview/fetchpage/grabimg rock-solid. */
window.EG_CONFIG = {
  workerUrl: 'https://rough-credit-6ea4.nooneatall412-cloudflare.workers.dev/',            // e.g. 'https://eg-proxy.YOURNAME.workers.dev'
};

window.EG_LIBS = {
  hls:           { cdn: 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js',            ready: () => window.Hls },
  mqtt:          { cdn: 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js',             ready: () => window.mqtt },
  peerjs:        { cdn: 'https://cdn.jsdelivr.net/npm/peerjs@1.4.7/dist/peerjs.min.js',          ready: () => window.Peer },
  qrcode:        { cdn: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',     ready: () => window.qrcode },
  'firebase-app':{ cdn: 'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js',       ready: () => window.firebase && firebase.initializeApp },
  'firebase-db': { cdn: 'https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js',  ready: () => window.firebase && firebase.database, deps: ['firebase-app'] },
  // The YouTube IFrame API cannot be pinned or SRI-checked (Google serves it live) — so it only loads when you play a video.
  youtube:       { cdn: 'https://www.youtube.com/iframe_api',                                    ready: () => window.YT && window.YT.Player, timeout: 12000, plain: true },
};
