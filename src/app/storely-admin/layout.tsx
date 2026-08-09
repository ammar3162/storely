'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const NAV_GROUPS = [
  {
    title: 'الرئيسية',
    items: [
      { href: '/storely-admin', label: 'اللوحة الرئيسية', icon: '🏠' },
      { href: '/storely-admin/metrics', label: 'المقاييس', icon: '📊' },
    ],
  },
  {
    title: 'العمليات',
    items: [
      { href: '/storely-admin/demo-requests', label: 'طلبات تجريبية', icon: '📝' },
      { href: '/storely-admin/backups', label: 'النسخ الاحتياطية', icon: '💾' },
      { href: '/storely-admin/notifications', label: 'الإشعارات', icon: '🔔' },
      { href: '/storely-admin/notification-health', label: 'صحة الإشعارات', icon: '💚' },
    ],
  },
  {
    title: 'المحتوى والشراكات',
    items: [
      { href: '/storely-admin/marquee-messages', label: 'الشريط الإخباري', icon: '📰' },
      { href: '/storely-admin/partners', label: 'الشركاء', icon: '🤝' },
    ],
  },
  {
    title: 'الأمان والمراقبة',
    items: [
      { href: '/storely-admin/audit-log', label: 'سجل التدقيق', icon: '📜' },
      { href: '/storely-admin/consent-logs', label: 'سجلات الموافقة', icon: '✅' },
      { href: '/storely-admin/health', label: 'صحة النظام', icon: '🩺' },
      { href: '/storely-admin/monitoring', label: 'المراقبة', icon: '👁️' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [hasAuth, setHasAuth] = useState(false)

  useEffect(() => {
    const pass = typeof window !== 'undefined' ? sessionStorage.getItem('storely_admin_pass') : ''
    if (!pass && pathname !== '/storely-admin') {
      router.push('/storely-admin')
      return
    }
    setHasAuth(!!pass)
    setReady(true)
  }, [pathname, router])

  if (!ready) return null
  if (!hasAuth) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: 'rtl' as const, background: '#f8fafc' }}>
      <div style={{ width: 220, flexShrink: 0, background: '#0f172a', padding: '20px 14px', position: 'sticky' as const, top: 0, height: '100vh', overflowY: 'auto' as const }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'white', marginBottom: 24, padding: '0 8px' }}>🛡️ Storely Admin</div>
        {NAV_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 8, padding: '0 8px' }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
              {group.items.map(item => {
                const active = pathname === item.href
                return (
                  <button key={item.href} onClick={() => router.push(item.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, border: 'none',
                      background: active ? '#16a34a' : 'transparent', color: active ? 'white' : '#cbd5e1',
                      fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' as const, width: '100%' }}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
