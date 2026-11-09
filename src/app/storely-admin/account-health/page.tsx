'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Moon, AlertTriangle, CircleCheck, CircleSlash, PackageX, SearchX } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, SearchBox, Stack, Stat, StatGrid, Table, Tabs, Toolbar, adminFetch, fmtDate, td, type Tone } from '../_admin/kit'

// صحة الحسابات: مين يستخدم النظام فعلاً ومين يحتاج متابعة قبل ما يلغي — المصدر lib/accountHealth
type Status = 'active' | 'attention' | 'dormant' | 'expired'
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  dormant: { label: 'خامل', tone: 'danger' },
  attention: { label: 'يحتاج إلى متابعة', tone: 'warning' },
  active: { label: 'نشط', tone: 'primary' },
  expired: { label: 'منتهي', tone: 'neutral' },
}
const ORDER: Status[] = ['dormant', 'attention', 'active', 'expired']
const STAT_TONE: Record<Status, 'danger' | 'warning' | 'primary' | 'default'> = { dormant: 'danger', attention: 'warning', active: 'primary', expired: 'default' }
const STAT_ICON = { dormant: Moon, attention: AlertTriangle, active: CircleCheck, expired: CircleSlash }

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
    else setError(j.error === 'unauthorized' ? 'لا تملك صلاحية إدارة العملاء' : 'تعذّر تحميل صحة الحسابات')
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
      <PageHeader title="صحة الحسابات" subtitle={<>من يستخدم النظام فعلياً ومن يحتاج إلى متابعة، خلال آخر 7 أيام{at ? ` · آخر تحديث ${fmtDate(at, true)}` : ''}</>}
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      <Stack>
      {error && <Notice tone="danger">{error}</Notice>}
      <StatGrid min={180}>
        {ORDER.map(s => <Stat key={s} icon={STAT_ICON[s]} label={STATUS[s].label} value={counts[s] ?? 0} tone={STAT_TONE[s]} active={filter === s} onClick={() => setFilter(filter === s ? 'all' : s)} />)}
        <Stat icon={PackageX} label="يدفع لإضافة لا يستخدمها" value={unusedPaid} tone="violet" hint="معرّض للإلغاء عند التجديد" />
      </StatGrid>
      <Card pad={0}>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المنشأة أو المالك أو الجوال" />
          <Tabs items={[{ k: 'all' as const, l: 'الكل', n: rows.length }, ...ORDER.map(k => ({ k, l: STATUS[k].label, n: counts[k] ?? 0 }))]} value={filter} onChange={setFilter} />
        </Toolbar>
        {loading ? <Loading label="جارٍ حساب صحة الحسابات..." /> : shown.length === 0 ? <Empty icon={SearchX} title="لا توجد حسابات مطابقة لهذه التصفية" /> : (
          <Table head={['المنشأة', 'الحالة', 'آخر دخول', 'عمليات الأسبوع', 'إقفال الكاشير', 'الحضور', 'واتساب', 'ما يحتاجه']} minWidth={1100}>
            {shown.map(r => (
              <tr key={r.org_id} className="adm-row" onClick={() => router.push(`/storely-admin/customers?open=${r.owner_id}`)} style={{ cursor: 'pointer' }}>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar name={r.org_name} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{r.org_name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge tone="neutral">{r.plan_label}</Badge>
                        {r.subscription_type === 'trial' && <Badge tone="info">تجربة</Badge>}
                        <span style={{ fontSize: 12, color: A.text3 }}>{r.owner_name || ''}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td style={td}><Badge tone={STATUS[r.status as Status].tone}>{STATUS[r.status as Status].label}</Badge></td>
                <td style={td}>{ago(r.last_login)}</td>
                <td style={td}>
                  <b style={{ fontWeight: 600, color: r.ops7 ? A.text : A.danger }}>{r.ops7}</b>
                  <div style={{ fontSize: 11.5, color: A.text3 }}>آخر عملية: {ago(r.last_op)}</div>
                </td>
                <td style={td}>{r.closing_days7 === null ? <span style={{ color: A.text3 }}>غير مفعّل</span> : <b style={{ fontWeight: 600, color: r.closing_days7 >= 5 ? A.primary : r.closing_days7 >= 3 ? A.warning : A.danger }}>{r.closing_days7} / 7</b>}</td>
                <td style={td}>{r.attendance7 === null ? <span style={{ color: A.text3 }}>غير مفعّل</span> : <>{r.attendance7} <span style={{ fontSize: 11.5, color: A.text3 }}>تسجيل · {r.staff} موظف</span></>}</td>
                <td style={td}>{r.wa_sent7 + r.wa_failed7 === 0 ? <span style={{ color: A.text3 }}>—</span> : <>{r.wa_sent7} <span style={{ fontSize: 11.5, color: A.text3 }}>وصلت</span>{r.wa_failed7 > 0 && <div style={{ fontSize: 12, color: A.danger, fontWeight: 600 }}>{r.wa_failed7} فشلت</div>}</>}</td>
                <td style={{ ...td, maxWidth: 340 }}>
                  {r.reasons.length === 0 ? <span style={{ color: A.primary, fontWeight: 600 }}>لا توجد ملاحظات</span> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {r.reasons.map((x: any, i: number) => <div key={i} style={{ fontSize: 12.5, color: x.tone === 'danger' ? A.danger : A.warning, lineHeight: 1.5 }}>• {x.text}</div>)}
                    </div>
                  )}
                  {r.unused_included.length > 0 && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>مزايا في باقته لا يستخدمها: {r.unused_included.join('، ')}</div>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      </Stack>
    </>
  )
}
