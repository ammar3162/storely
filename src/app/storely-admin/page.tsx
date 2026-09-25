'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stat, adminFetch, daysLeft, fmtDate, useAdmin } from './_admin/kit'
import { type Customer, PLAN_KEYS, PLAN_TONE, STATUS, mapCustomer, monthlyRevenue, planLabel } from './_admin/customers'
import CustomerDrawer from './_admin/CustomerDrawer'

export default function OverviewPage() {
  const router = useRouter()
  const { can } = useAdmin()
  const [list, setList] = useState<Customer[]>([])
  const [pendingSuppliers, setPendingSuppliers] = useState(0)
  const [maintenance, setMaintenance] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canUsers = can('manage_users')

  async function load() {
    setLoading(true)
    const [users, apps, settings] = await Promise.all([
      canUsers ? adminFetch('/api/admin/list-users') : Promise.resolve({}),
      can('manage_suppliers') ? adminFetch('/api/admin/supplier-applications') : Promise.resolve({}),
      fetch('/api/platform-settings').then(r => r.json()).catch(() => ({})),
    ])
    if (users.users) setList(users.users.map(mapCustomer))
    setPendingSuppliers((apps.data || []).filter((a: any) => a.status === 'pending').length)
    setMaintenance(!!settings.maintenanceMode)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const s = useMemo(() => {
    const active = list.filter(u => u.status === 'active')
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const expiring = active
      .map(u => ({ u, d: daysLeft(u.subscription_ends_at) }))
      .filter(x => x.d !== null && x.d > 0 && x.d <= 7)
      .sort((a, b) => a.d! - b.d!)
    return {
      total: list.length,
      active: active.length,
      trial: active.filter(u => u.subscription_type === 'trial').length,
      paid: active.filter(u => u.subscription_type === 'paid').length,
      pending: list.filter(u => u.status === 'pending'),
      expiring,
      expired: active.filter(u => { const d = daysLeft(u.subscription_ends_at); return d !== null && d <= 0 }).length,
      newThisMonth: list.filter(u => new Date(u.created_at) >= monthStart).length,
      revenue: Math.round(monthlyRevenue(list)),
      byPlan: PLAN_KEYS.map(k => ({ k, n: active.filter(u => u.plan === k).length })),
      latest: list.slice(0, 6),
    }
  }, [list])

  const selected = list.find(u => u.id === selectedId) || null
  const today = new Date().toLocaleDateString('ar-SA', { numberingSystem: 'latn', weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader title="نظرة عامة" subtitle={today} actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {maintenance && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="danger" action={<Btn small onClick={() => router.push('/storely-admin/settings')}>الإعدادات</Btn>}>
            وضع الصيانة مفعّل — العملاء يشوفون شاشة الصيانة الحين
          </Notice>
        </div>
      )}

      {!canUsers ? <Card><Empty title="أهلاً بك" hint="استخدم القائمة الجانبية للأقسام المتاحة لك" /></Card> : loading ? <Loading /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* يحتاج إجراء */}
          {(s.pending.length > 0 || s.expiring.length > 0 || pendingSuppliers > 0 || s.expired > 0) && (
            <Card title="يحتاج إجراء منك">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.pending.length > 0 && (
                  <ActionRow tone="warning" text={`${s.pending.length} منشأة بانتظار التفعيل`} onClick={() => router.push('/storely-admin/customers?filter=pending')} />
                )}
                {s.expiring.length > 0 && (
                  <ActionRow tone="warning" text={`${s.expiring.length} اشتراك ينتهي خلال 7 أيام — تواصل معهم للتجديد`} onClick={() => router.push('/storely-admin/customers?filter=expiring')} />
                )}
                {s.expired > 0 && (
                  <ActionRow tone="danger" text={`${s.expired} حساب مفعّل واشتراكه منتهي`} onClick={() => router.push('/storely-admin/customers?filter=active')} />
                )}
                {pendingSuppliers > 0 && (
                  <ActionRow tone="info" text={`${pendingSuppliers} طلب مورد جديد`} onClick={() => router.push('/storely-admin/supplier-applications')} />
                )}
              </div>
            </Card>
          )}

          {/* الأرقام */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
            <Stat label="الإيراد الشهري المتوقع" value={`${s.revenue.toLocaleString('en')} ر.س`} hint={`من ${s.paid} مشترك مدفوع`} tone="primary" />
            <Stat label="المنشآت المسجّلة" value={s.total} hint={`${s.newThisMonth} جديدة هذا الشهر`} onClick={() => router.push('/storely-admin/customers')} />
            <Stat label="مفعّلة" value={s.active} hint={`${s.paid} مدفوع · ${s.trial} تجربة`} />
            <Stat label="بانتظار التفعيل" value={s.pending.length} tone={s.pending.length ? 'warning' : 'default'} onClick={() => router.push('/storely-admin/customers?filter=pending')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
            {/* ينتهي قريباً */}
            <Card title="اشتراكات تنتهي قريباً" subtitle="خلال 7 أيام" pad={0}>
              {s.expiring.length === 0 ? <Empty title="ما فيه اشتراكات تنتهي هالأسبوع" /> : s.expiring.slice(0, 6).map(({ u, d }) => (
                <ListRow key={u.id} onClick={() => setSelectedId(u.id)} title={u.org_name} sub={`${planLabel(u.plan)} · ${u.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'}`}
                  end={<Badge tone={d! <= 3 ? 'danger' : 'warning'}>باقي {d} يوم</Badge>} />
              ))}
            </Card>

            {/* آخر المسجّلين */}
            <Card title="آخر المسجّلين" pad={0} actions={<Btn small kind="ghost" onClick={() => router.push('/storely-admin/customers')}>عرض الكل</Btn>}>
              {s.latest.length === 0 ? <Empty title="ما فيه عملاء بعد" /> : s.latest.map(u => (
                <ListRow key={u.id} onClick={() => setSelectedId(u.id)} title={u.org_name} sub={`${u.full_name} · ${fmtDate(u.created_at)}`}
                  end={<Badge tone={(STATUS[u.status] || STATUS.pending).tone}>{(STATUS[u.status] || STATUS.pending).label}</Badge>} />
              ))}
            </Card>

            {/* توزيع الباقات */}
            <Card title="توزيع الباقات" subtitle="المنشآت المفعّلة">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.byPlan.map(({ k, n }) => {
                  const pct = s.active ? Math.round((n / s.active) * 100) : 0
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <Badge tone={PLAN_TONE[k]}>{planLabel(k)}</Badge>
                        <span style={{ fontWeight: 700 }}>{n} <span style={{ color: A.text3, fontWeight: 500 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 8, background: '#f2f4f7', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: A.primary, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)}
        onChanged={patch => patch ? setList(prev => prev.map(u => u.id === selectedId ? { ...u, ...patch } : u)) : load()} />
    </>
  )
}

function ActionRow({ text, tone, onClick }: { text: string; tone: 'warning' | 'danger' | 'info'; onClick: () => void }) {
  const color = { warning: A.warning, danger: A.danger, info: A.info }[tone]
  const bg = { warning: A.warningSoft, danger: A.dangerSoft, info: A.infoSoft }[tone]
  return (
    <button onClick={onClick} className="adm-hover"
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${color}22`, background: bg, color, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right' }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{text}</span>
      <ChevronLeft size={16} />
    </button>
  )
}

function ListRow({ title, sub, end, onClick }: { title: string; sub: string; end: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="adm-row-btn"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 20px', border: 'none', borderBottom: `1px solid ${A.border}`, background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>{sub}</div>
      </div>
      {end}
    </button>
  )
}
