'use client'
import { useEffect, useState } from 'react'
import { Lock, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Empty } from '@/components/OwnerAccountantRequests'
import { colors, radius, font, btnSecondary, btnPrimary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

// الشهور المقفلة (جهة المالك)
export default function OwnerPeriodLocks({ orgId, showEmpty = false }: { orgId: string; showEmpty?: boolean }) {
  const [data, setData] = useState<{ locks: any[]; hasAccountant: boolean } | null>(null)
  const load = () => api.get('/api/period-locks', { org_id: orgId }).then(j => { if (j.success) setData(j as any) })
  useEffect(() => { if (orgId) load() }, [orgId])
  if (!data) return null
  if (!data.locks.length) return showEmpty ? <Empty icon={<Lock size={22} color={colors.text4} />} title="لا توجد أشهر مقفلة" text="عندما يراجع محاسبك شهراً ويقفله من بوابته، يظهر هنا — ولا يمكن تعديل المشتريات أو إقفالات الكاشير فيه." /> : null
  return <LocksList data={data} orgId={orgId} reload={load} />
}

const dateAr = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) }

function LocksList({ data, orgId, reload }: { data: { locks: any[]; hasAccountant: boolean }; orgId: string; reload: () => void }) {
  const [openMonth, setOpenMonth] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestUnlock(l: any) {
    setBusy(true)
    const j = await api.post('/api/period-locks', { org_id: orgId, month: l.month, action: 'request_unlock', reason: reason.trim() })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذّر الإرسال', 'error'); return }
    toast('أُرسل طلب فتح الشهر إلى المحاسب'); setReason(''); setOpenMonth(null)
  }
  async function unlock(l: any) {
    if (!(await confirmDialog({ title: `فتح شهر ${l.label}؟`, message: 'لا يوجد لديك محاسب مفعّل، لذا يمكنك فتحه بنفسك، ويصبح بعدها قابلاً للتعديل.', confirmText: 'افتح الشهر', type: 'warning' }))) return
    setBusy(true)
    const j = await api.post('/api/period-locks', { org_id: orgId, month: l.month, action: 'unlock' })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذّر الفتح', 'error'); return }
    toast('تم فتح الشهر'); reload()
  }

  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Lock size={18} color={colors.text} /><div style={{ fontSize: 15, fontWeight: 800 }}>الشهور المقفلة <span style={{ fontSize: 12.5, color: colors.text3, fontWeight: 600 }}>({data.locks.length})</span></div></div>
      <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 12, lineHeight: 1.7 }}>راجعها المحاسب وأقفلها، فلا يمكن تعديل المشتريات أو إقفالات الكاشير فيها، ويُسمح بتسجيل الدفع للموردين.</div>
      {data.locks.map(l => {
        const isOpen = openMonth === l.month
        return (
          <div key={l.month} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            {/* زر مطوي: الشهر ومن أقفله، والضغط يفتح خيار فتح الشهر */}
            <button type="button" onClick={() => { setOpenMonth(isOpen ? null : l.month); setReason('') }} aria-expanded={isOpen}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, textAlign: 'right' as const }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 13.5, color: colors.text }}>{l.label}</b>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#ECFDF5', color: '#047857', whiteSpace: 'nowrap' as const }}>مقفل</span>
                </span>
                <span style={{ display: 'block', fontSize: 12, color: colors.text4, marginTop: 3 }}>{l.locked_by_name || 'المحاسب'} · {dateAr(l.locked_at)}</span>
              </span>
              <ChevronDown size={18} color={colors.text3} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {isOpen && (
              <div style={{ padding: '12px', borderTop: `1px solid ${colors.border}` }}>
                {data.hasAccountant ? (<>
                  <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8, lineHeight: 1.7 }}>الشهر مقفل من محاسبك، ويصله طلبك ليقرر فتحه.</div>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={300} rows={2} placeholder="سبب طلب فتح الشهر (يصل إلى المحاسب)"
                    style={{ ...inp(), resize: 'vertical' as const, lineHeight: 1.7 }} />
                  <button onClick={() => requestUnlock(l)} disabled={busy} style={{ ...btnPrimary, marginTop: 8, padding: '9px 16px', fontSize: 13, opacity: busy ? .6 : 1 }}>{busy ? '...' : 'اطلب فتح الشهر'}</button>
                </>) : (<>
                  <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 8, lineHeight: 1.7 }}>لا يوجد لديك محاسب مفعّل، فيمكنك فتح الشهر بنفسك.</div>
                  <button onClick={() => unlock(l)} disabled={busy} style={{ ...btnSecondary, padding: '9px 16px', fontSize: 13 }}>افتح الشهر</button>
                </>)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
