'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stat, Table, adminFetch, fmtDate, td, inputStyle, type Tone } from '../_admin/kit'

// صحة الحسابات: مين يستخدم النظام فعلاً ومين يحتاج متابعة قبل ما يلغي — المصدر lib/accountHealth
type Status = 'active' | 'attention' | 'dormant' | 'expired'
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  dormant: { label: 'خامل', tone: 'danger' },
  attention: { label: 'يحتاج متابعة', tone: 'warning' },
  active: { label: 'نشط', tone: 'primary' },
  expired: { label: 'منتهي', tone: 'neutral' },
}
const ORDER: Status[] = ['dormant', 'attention', 'active', 'expired']
const STAT_TONE: Record<Status, 'danger' | 'warning' | 'primary' | 'default'> = { dormant: 'danger', attention: 'warning', active: 'primary', expired: 'default' }

const ago = (d?: string | null) => {
  if (!d) return '—'
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n === 2 ? 'قبل يومين' : n <= 10 ? `قبل ${n} أيام` : `قبل ${n} يوم`
}

export default function AccountHealthPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [q, setQ] = useState('')
  const [at, setAt] = useState('')

  async function load() {
    setLoading(true); setError('')
    const j = await adminFetch('/api/admin/account-health')
    if (j.accounts) { setRows(j.accounts); setAt(j.generated_at) }
    else setError(j.error === 'unauthorized' ? 'ما عندك صلاحية إدارة العملاء' : 'تعذّر تحميل صحة الحسابات')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const counts = useMemo(() => Object.fromEntries(ORDER.map(s => [s, rows.filter(r => r.status === s).length])) as Record<Status, number>, [rows])
  const unusedPaid = useMemo(() => rows.filter(r => r.unused_paid.length).length, [rows])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter(r => (filter === 'all' || r.status === filter) && (!s || [r.org_name, r.owner_name, r.phone].some((v: string) => v?.toLowerCase().includes(s))))
  }, [rows, filter, q])

  return (
    <>
      <PageHeader title="صحة الحسابات" subtitle="مين يستخدم النظام فعلاً، ومين يحتاج متابعة — آخر 7 أيام"
        actions={<Btn small onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      {error && <Notice tone="danger">{error}</Notice>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
        {ORDER.map(s => <Stat key={s} label={STATUS[s].label} value={counts[s] ?? 0} tone={STAT_TONE[s]} onClick={() => setFilter(filter === s ? 'all' : s)} hint={filter === s ? 'اضغط لعرض الكل' : 'اضغط للتصفية'} />)}
        <Stat label="يدفع على إضافة وما يستخدمها" value={unusedPaid} tone="violet" hint="عرضة للإلغاء عند التجديد" />
      </div>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث باسم المنشأة أو المالك أو الجوال..." style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
          {filter !== 'all' && <Btn small onClick={() => setFilter('all')}>عرض الكل</Btn>}
          {at && <span style={{ fontSize: 12, color: A.text3 }}>آخر تحديث: {fmtDate(at, true)}</span>}
        </div>
        {loading ? <Loading label="نحسب صحة الحسابات..." /> : shown.length === 0 ? <Empty title="ما فيه حسابات بهالتصفية" /> : (
          <Table head={['المنشأة', 'الحالة', 'آخر دخول', 'عمليات الأسبوع', 'إقفال الكاشير', 'الحضور', 'واتساب', 'وش يحتاج']} minWidth={1100}>
            {shown.map(r => (
              <tr key={r.org_id} className="adm-row" onClick={() => router.push(`/storely-admin/customers?open=${r.owner_id}`)} style={{ cursor: 'pointer' }}>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{r.org_name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge tone="neutral">{r.plan_label}</Badge>
                    {r.subscription_type === 'trial' && <Badge tone="info">تجربة</Badge>}
                    <span style={{ fontSize: 11.5, color: A.text3 }}>{r.owner_name || ''}</span>
                  </div>
                </td>
                <td style={td}><Badge tone={STATUS[r.status as Status].tone}>{STATUS[r.status as Status].label}</Badge></td>
                <td style={td}>{ago(r.last_login)}</td>
                <td style={td}>
                  <b style={{ color: r.ops7 ? A.text : A.danger }}>{r.ops7}</b>
                  <div style={{ fontSize: 11.5, color: A.text3 }}>آخر عملية: {ago(r.last_op)}</div>
                </td>
                <td style={td}>{r.closing_days7 === null ? <span style={{ color: A.text3 }}>غير مفعّل</span> : <b style={{ color: r.closing_days7 >= 5 ? A.primary : r.closing_days7 >= 3 ? A.warning : A.danger }}>{r.closing_days7} / 7</b>}</td>
                <td style={td}>{r.attendance7 === null ? <span style={{ color: A.text3 }}>غير مفعّل</span> : <>{r.attendance7} <span style={{ fontSize: 11.5, color: A.text3 }}>تسجيل · {r.staff} موظف</span></>}</td>
                <td style={td}>{r.wa_sent7 + r.wa_failed7 === 0 ? <span style={{ color: A.text3 }}>—</span> : <>{r.wa_sent7} <span style={{ fontSize: 11.5, color: A.text3 }}>وصلت</span>{r.wa_failed7 > 0 && <div style={{ fontSize: 11.5, color: A.danger, fontWeight: 700 }}>{r.wa_failed7} فشلت</div>}</>}</td>
                <td style={{ ...td, maxWidth: 340 }}>
                  {r.reasons.length === 0 ? <span style={{ color: A.primary, fontWeight: 600 }}>كل شي ماشي</span> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {r.reasons.map((x: any, i: number) => <div key={i} style={{ fontSize: 12.5, color: x.tone === 'danger' ? A.danger : A.warning, lineHeight: 1.5 }}>• {x.text}</div>)}
                    </div>
                  )}
                  {r.unused_included.length > 0 && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>ميزات في باقته ما يستخدمها: {r.unused_included.join('، ')}</div>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  )
}
