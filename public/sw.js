self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || 'Storely', options)
      // تحديث الرقم على أيقونة التطبيق (App Badge) — يدعمه iOS 16.4+ وAndroid
      try {
        if ('setAppBadge' in self.navigator && typeof data.badgeCount === 'number') {
          if (data.badgeCount > 0) await self.navigator.setAppBadge(data.badgeCount)
          else await self.navigator.clearAppBadge()
        }
      } catch (e) {}
    })()
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'close') return
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
