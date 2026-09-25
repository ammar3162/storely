'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, PageHeader, Table, adminFetch, daysLeft, fmtDate, inputStyle, td } from '../_admin/kit'
import { type Customer, STATUS, PLAN_TONE, mapCustomer, planLabel } from '../_admin/customers'
import CustomerDrawer from '../_admin/CustomerDrawer'

const FILTERS = [
  { k: 'all', l: 'الكل' },
  { k: 'pending', l: 'بانتظار التفعيل' },
  { k: 'active', l: 'مفعّل' },
  { k: 'expiring', l: 'ينتهي خلال 7 أيام' },
  { k: 'trial', l: 'تجربة' },
  { k: 'paid', l: 'مدفوع' },
  { k: 'suspended', l: 'موقوف' },
] as const
type FilterKey = typeof FILTERS[number]['k']

function matches(u: Customer, f: FilterKey) {
  const d = daysLeft(u.subscription_ends_at)
  switch (f) {
    case 'all': return true
    case 'expiring': return u.status === 'active' && d !== null && d > 0 && d <= 7
    case 'trial': return u.status === 'active' && u.subscription_type === 'trial'
    case 'paid': return u.status === 'active' && u.subscription_type === 'paid'
    default: return u.status === f
  }
}

export default function Page() {
  return <Suspense fallback={<Loading />}><CustomersPage /></Suspense>
}

function CustomersPage() {
  const params = useSearchParams()
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>((params.get('filter') as FilterKey) || 'all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    const j = await adminFetch('/api/admin/list-users')
    if (j.users) setList(j.users.map(mapCustomer))
    else setError(j.error === 'unauthorized' ? 'ما عندك صلاحية إدارة العملاء' : 'تعذّر تحميل العملاء')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.k, list.filter(u => matches(u, f.k)).length])), [list])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter(u => matches(u, filter) && (!s || [u.full_name, u.org_name, u.phone].some(v => v?.toLowerCase().includes(s))))
  }, [list, q, filter])
  const selected = list.find(u => u.id === selectedId) || null

  return (
    <>
      <PageHeader title="العملاء" subtitle={`${list.length} منشأة مسجّلة`}
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Card pad={0}>
        <div style={{ padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', borderBottom: `1px solid ${A.border}` }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={15} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: A.text3 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو المنشأة أو الجوال" style={{ ...inputStyle, paddingRight: 34 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} className="adm-btn"
                style={{ padding: '6px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  border: `1px solid ${filter === f.k ? A.primary : A.border}`, background: filter === f.k ? A.primary : A.surface, color: filter === f.k ? 'white' : A.text2 }}>
                {f.l} <span style={{ opacity: .75 }}>{counts[f.k] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? <Loading /> : error ? <Empty title={error} /> : shown.length === 0 ? <Empty title="ما فيه نتائج" hint="غيّر البحث أو الفلتر" /> : (
          <Table head={['المنشأة', 'المالك', 'الجوال', 'الباقة', 'الاشتراك', 'الحالة', 'التسجيل']}>
            {shown.map(u => {
              const st = STATUS[u.status] || STATUS.pending
              const d = daysLeft(u.subscription_ends_at)
              return (
                <tr key={u.id} className="adm-row" onClick={() => setSelectedId(u.id)}>
                  <td style={{ ...td, fontWeight: 700 }}>{u.org_name}</td>
                  <td style={td}>{u.full_name}</td>
                  <td style={{ ...td, color: A.text2 }}><span dir="ltr">{u.phone || '—'}</span></td>
                  <td style={td}><Badge tone={PLAN_TONE[u.plan]}>{planLabel(u.plan)}</Badge></td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'} · {u.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}</span>
                      {d !== null && <span style={{ fontSize: 11.5, fontWeight: 600, color: d <= 0 ? A.danger : d <= 7 ? A.warning : A.text3 }}>{d <= 0 ? 'منتهي' : `باقي ${d} يوم`}</span>}
                    </div>
                  </td>
                  <td style={td}><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td style={{ ...td, color: A.text3, fontSize: 12.5 }}>{fmtDate(u.created_at)}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)}
        onChanged={patch => patch ? setList(prev => prev.map(u => u.id === selectedId ? { ...u, ...patch } : u)) : load()} />
    </>
  )
}
