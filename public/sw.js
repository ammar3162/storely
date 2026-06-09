const CACHE = 'storely-v1'
const OFFLINE_URL = '/offline.html'
const STATIC = ['/', '/dashboard', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (!url.origin.includes(self.location.origin)) return
  e.respondWith(fetch(e.request).then(res => { if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)) } return res }).catch(() => caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL))))
})
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(data.title || 'Storely', { body: data.body || 'لديك إشعار جديد', icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl', lang: 'ar', data: { url: data.url || '/notifications' } }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { const ex = list.find(c => c.url.includes(url)); if (ex) return ex.focus(); return clients.openWindow(url) }))
})
