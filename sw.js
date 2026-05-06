const CACHE_NAME = 'elite-gems-v5';  

// Pre‑cache the absolute essentials
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './TTC/tao-te-ching.json',
  './sounds/civil-defense-siren.mp3',
  'https://unpkg.com/cistercian-numerals',
  './images/indepedentBG/ORIGINBACKG.jpeg',
  './images/fisherman.jpg',
  './images/JohanNlbProfile.jpg',
  './images/JohanSerenity.jpeg',
  './images/Beautyfullness.jpg',
  './images/HeadOfBuddha.jpg',
  './images/indepedentBG/Ataraxia.jpg',
  './images/IMG_BLUE.jpg',
  './images/OkamiKitsune.jpg',
  './images/AbyssalWave.png',
  './images/OrangeHairedWomen.jpg',
  './images/indepedentBG/BeautyOnBlade.jpg',
  './images/ChillVibes.jpg',
  './images/Kali.png'
];

// ***** INSTALL – pre‑cache essential files *****
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ***** ACTIVATE – clean up old caches & claim clients *****
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (!cacheAllowlist.includes(name)) {
            console.log('J_OS: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())   // take control of all pages
  );
});

// ***** FETCH – limited cache strategy *****
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // If the request matches a pre‑cached asset, serve from cache (or fetch if missing)
  if (PRECACHE_URLS.some(p => url.includes(p))) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // For everything else → network only (no caching = no bloat)
  event.respondWith(fetch(event.request));
});