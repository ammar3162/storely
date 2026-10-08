'use client'
import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, btnSecondary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

// الشهور المقفلة (جهة المالك)
export default function OwnerPeriodLocks({ orgId }: { orgId: string }) {
  const [data, setData] = useState<{ locks: any[]; hasAccountant: boolean } | null>(null)
  const load = () => api.get('/api/period-locks', { org_id: orgId }).then(j => { if (j.success) setData(j as any) })
  useEffect(() => { if (orgId) load() }, [orgId])
  if (!data?.locks.length) return null
  async function act(l: any) {
    if (data!.hasAccountant) {
      const reason = window.prompt(`ليش تحتاج تفتح شهر ${l.label}؟ (يوصل للمحاسب)`, '')
      if (reason === null) return
      const j = await api.post('/api/period-locks', { org_id: orgId, month: l.month, action: 'request_unlock', reason })
      if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); return }
      toast('✅ أرسلنا طلب الفتح للمحاسب')
    } else {
      if (!(await confirmDialog({ title: `فتح شهر ${l.label}؟`, message: 'ما عندك محاسب مفعّل، فتقدر تفتحه بنفسك. بعدها يصير ينقدر يتعدّل.', confirmText: 'افتح الشهر', type: 'warning' }))) return
      const j = await api.post('/api/period-locks', { org_id: orgId, month: l.month, action: 'unlock' })
      if (!j.success) { toast(j.error || 'تعذر الفتح', 'error'); return }
      toast('تم فتح الشهر'); load()
    }
  }
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Lock size={18} color="#047857" /><div style={{ fontSize: 15, fontWeight: 800 }}>الشهور المقفلة</div></div>
      <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8, lineHeight: 1.7 }}>المحاسب راجعها وأقفلها — ما ينقدر يتعدّل فيها مشتريات ولا إقفالات كاشير. تسجيل الدفع للموردين لاحقاً مسموح.</div>
      {data.locks.map(l => (
        <div key={l.month} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>🔒 {l.label}</div>
            <div style={{ fontSize: 11.5, color: colors.text4 }}>{l.locked_by_name || 'المحاسب'} · {String(l.locked_at).slice(0, 10)}</div>
          </div>
          <button onClick={() => act(l)} style={{ ...btnSecondary, padding: '7px 12px', fontSize: 12.5 }}>{data.hasAccountant ? 'اطلب فتح الشهر' : 'افتح الشهر'}</button>
        </div>
      ))}
    </div>
  )
}
