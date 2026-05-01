const CACHE_NAME = 'elite-gems-v2';
const urlsToCache = [
    './index.html',
    './manifest.json',
    './TTC/tao-te-ching.json',
    './sounds/civil-defense-siren.mp3',
    'https://unpkg.com/cistercian-numerals',
    // Pre‑cached 7 essential images
    './images/indepedentBG/ORIGINBACKG.jpeg',
    './images/fisherman.jpg',
    './images/JohanNlbProfile.jpg',
    './images/JohanSerenity.jpeg',
    './images/Beautyfullness.jpg',
    './images/HeadOfBuddha.jpg',
    './images/indepedentBG/Ataraxia.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME && caches.delete(key))
        ))
    );
});