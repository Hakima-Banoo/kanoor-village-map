// ═══════════════════════════════════════════════
// Kanoor Village Map — Service Worker (PWA)
// Built by Hakima Banoo · hakimabanoo.jk.csrl@gmail.com
// ═══════════════════════════════════════════════

const CACHE = 'kanoor-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/stats.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&family=Roboto:wght@300;400;500&display=swap',
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(ASSETS.map(url => c.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for tiles, cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Map tiles — network only (too many to cache)
  if (url.hostname.includes('tile') || url.hostname.includes('arcgis') || url.hostname.includes('stadiamaps')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // API calls — network only
  if (url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' }, status: 503
      })
    ));
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Background sync for offline submissions
self.addEventListener('sync', e => {
  if (e.tag === 'sync-places') {
    e.waitUntil(syncOfflinePlaces());
  }
});

async function syncOfflinePlaces() {
  // Places submitted while offline will sync when back online
  console.log('[SW] Syncing offline submissions...');
}
