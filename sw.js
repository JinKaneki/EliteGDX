const CACHE_NAME = 'elite-gems-v4';  

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

// ***** FETCH – Stale‑While‑Revalidate (with cache‑first fallback for stable assets) *****
self.addEventListener('fetch', event => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  // Cache‑only for completely static, versioned CDN resources
  if (event.request.url.includes('cistercian-numerals') ||
      event.request.url.includes('tao-te-ching.json') ||
      event.request.url.includes('civil-defense-siren.mp3')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Stale‑While‑Revalidate for everything else
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const networkFetch = fetch(event.request).then(networkResponse => {
          // Only cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);   // offline fallback

        // Return cached version immediately, or wait for network
        return cachedResponse || networkFetch;
      });
    })
  );
});