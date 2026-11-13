'use client'
// عدّاد إيميلات Resend (آخر 24 ساعة) — شريط تنبيه أعلى لوحة الإدارة من 80، وسطر في صفحة إعلانات الإيميل
import { useEffect, useState } from 'react'
import { AlertTriangle, Mail } from 'lucide-react'
import { A, adminFetch } from './kit'

type Usage = { available: boolean; used?: number; sent?: number; received?: number; limit?: number; level?: 'ok' | 'warn' | 'stop' }

export function useEmailUsage(everyMs = 10 * 60_000) {
  const [u, setU] = useState<Usage | null>(null)
  useEffect(() => {
    let on = true
    // للمعاينة المحلية فقط (بدون مفتاح Resend): ?usage_demo=85
    const demo = process.env.NODE_ENV === 'development' ? Number(new URLSearchParams(location.search).get('usage_demo')) : 0
    if (demo) { setU({ available: true, used: demo, sent: demo - 3, received: 3, limit: 100, level: demo >= 100 ? 'stop' : demo >= 80 ? 'warn' : 'ok' }); return }
    const load = () => adminFetch('/api/admin/email-usage').then(j => { if (on && j?.success) setU(j) }).catch(() => null)
    load()
    const t = setInterval(load, everyMs)
    return () => { on = false; clearInterval(t) }
  }, [everyMs])
  return u
}

export function EmailUsageBanner() {
  const u = useEmailUsage()
  if (!u?.available || u.level === 'ok' || !u.level) return null
  const stop = u.level === 'stop'
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '0 0 16px', padding: '12px 16px', borderRadius: 12,
      background: stop ? '#FDECEC' : '#FFF6E5', border: `1px solid ${stop ? '#F3C2C2' : '#F2D9A6'}`, color: A.text, fontSize: 13.5, lineHeight: 1.8 }}>
      <AlertTriangle size={18} color={stop ? A.danger : '#B7791F'} style={{ flexShrink: 0, marginTop: 3 }} />
      <div>
        <b>{stop ? `توقف إرسال الإيميلات — وصلت ${u.used} من ${u.limit} خلال آخر 24 ساعة` : `اقتربت من حد الإيميلات — ${u.used} من ${u.limit} خلال آخر 24 ساعة`}</b>
        <div style={{ color: A.text2 }}>{stop
          ? 'رموز التسجيل والتقارير والردود لن تصل حتى يتجدد الحد. لتجنّب ذلك رقِّ حساب Resend إلى باقة Pro (20 دولاراً شهرياً).'
          : 'عند الوصول إلى 100 يتوقف كل الإرسال (رموز التسجيل، والتقارير، والردود). أجّل حملات الإيميل الكبيرة، وإذا تكرر هذا التنبيه رقِّ Resend إلى باقة Pro.'}</div>
      </div>
    </div>
  )
}

export function EmailUsageLine() {
  const u = useEmailUsage(60_000)
  if (!u?.available) return null
  const color = u.level === 'stop' ? A.danger : u.level === 'warn' ? '#B7791F' : A.text3
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color }}>
      <Mail size={15} />
      <span>إيميلات آخر 24 ساعة: <b>{u.used}</b> من {u.limit} (مرسلة {u.sent}، واردة {u.received}) — الحد في الباقة المجانية من Resend</span>
    </div>
  )
}
