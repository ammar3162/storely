'use client'
// ملخص نشاط العميل داخل ملفه: آخر دخول، آخر عملية، حجم الاستخدام، وأسباب المتابعة — نفس حساب «صحة الحسابات»
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { A, Badge, Btn, Card, Loading, adminFetch, type Tone } from './kit'

type Status = 'active' | 'attention' | 'dormant' | 'expired'
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  dormant: { label: 'خامل', tone: 'danger' },
  attention: { label: 'يحتاج إلى متابعة', tone: 'warning' },
  active: { label: 'نشط', tone: 'primary' },
  expired: { label: 'منتهي', tone: 'neutral' },
}

export const ago = (d?: string | null) => {
  if (!d) return 'أبداً'
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n === 2 ? 'قبل يومين' : n <= 10 ? `قبل ${n} أيام` : `قبل ${n} يوم`
}

export default function ActivityCard({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [a, setA] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const j = await adminFetch(`/api/admin/account-health?org_id=${orgId}`)
    if (j.success) setA(j.account)
    else setError(j.error || 'تعذّر جلب النشاط')
    setLoading(false)
  }
  useEffect(() => { setA(null); load() }, [orgId])

  const st = a ? STATUS[a.status as Status] || STATUS.active : null
  const items: [string, string][] = a ? [
    ['آخر دخول', ago(a.last_login)],
    ['آخر عملية', ago(a.last_op)],
    ['عمليات آخر 7 أيام', String(a.ops7)],
    ['الأصناف', String(a.products)],
    ['الموظفون', String(a.staff)],
    ['الفروع', `${a.branches}${a.managers ? ` · ${a.managers} مدير` : ''}`],
    ...(a.closing_days7 !== null ? [['أيام إقفال الكاشير (7 أيام)', `${a.closing_days7} من 7`] as [string, string]] : []),
    ...(a.attendance7 !== null ? [['تسجيلات الحضور (7 أيام)', String(a.attendance7)] as [string, string]] : []),
    ['رسائل واتساب (7 أيام)', a.wa_sent7 + a.wa_failed7 ? `وصلت ${a.wa_sent7} من ${a.wa_sent7 + a.wa_failed7}` : 'لا توجد'],
  ] : []

  return (
    <Card title="النشاط" subtitle="من بيانات استخدامه للنظام"
      actions={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {st && <Badge tone={st.tone}>{st.label}</Badge>}
        <Btn small kind="ghost" onClick={load} disabled={loading} title="تحديث"><RefreshCw size={13} /></Btn>
      </div>}>
      {loading && !a ? <Loading label="جارٍ جلب النشاط..." /> : error ? (
        <div style={{ fontSize: 13, color: A.danger }}>{error}</div>
      ) : a && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
            {items.map(([k, v]) => (
              <div key={k} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: A.text3, fontWeight: 600 }}>{k}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          {a.reasons?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
              {a.reasons.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: r.tone === 'danger' ? A.danger : A.warning, background: r.tone === 'danger' ? A.dangerSoft : A.warningSoft, borderRadius: 8, padding: '7px 10px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {r.text}
                </div>
              ))}
            </div>
          )}
          {a.unused_included?.length > 0 && (
            <div style={{ fontSize: 12, color: A.text2, marginTop: 10 }}>مزايا لديه لا يستخدمها: {a.unused_included.join('، ')}</div>
          )}
          <button onClick={() => router.push('/storely-admin/customers?tab=health')} style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: A.primary, cursor: 'pointer' }}>
            كل الحسابات في «صحة الحسابات»
          </button>
        </>
      )}
    </Card>
  )
}
