'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Empty, Loading, Notice, Stat, adminFetch, daysLeft, fmtDate, useAdmin } from './_admin/kit'
import { type Customer, PLAN_KEYS, STATUS, mapCustomer, monthlyRevenue, planLabel } from './_admin/customers'
import CustomerDrawer from './_admin/CustomerDrawer'
import { StorelyButton, StorelyCard, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

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
    <div className="storely-admin-page admin-overview" dir="rtl">
      <style>{overviewStyles}</style>
      <StorelyPageHeader title="نظرة عامة" description={today} actions={<StorelyButton onClick={load} disabled={loading}><RefreshCw size={14} /> تحديث</StorelyButton>} />

      {maintenance && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="danger" action={<StorelyButton size="sm" onClick={() => router.push('/storely-admin/settings')}>الإعدادات</StorelyButton>}>
            وضع الصيانة مفعّل — العملاء يشوفون شاشة الصيانة الحين
          </Notice>
        </div>
      )}

      {!canUsers ? <StorelyCard className="admin-panel"><Empty title="أهلاً بك" hint="استخدم القائمة الجانبية للأقسام المتاحة لك" /></StorelyCard> : loading ? <Loading /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* يحتاج إجراء */}
          {(s.pending.length > 0 || s.expiring.length > 0 || pendingSuppliers > 0 || s.expired > 0) && (
            <StorelyCard className="admin-panel" title="يحتاج إجراء منك">
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
            </StorelyCard>
          )}

          {/* الأرقام */}
          <div className="storely-metric-grid">
            <Stat label="الإيراد الشهري المتوقع" value={`${s.revenue.toLocaleString('en')} ر.س`} hint={`من ${s.paid} مشترك مدفوع`} tone="primary" />
            <Stat label="المنشآت المسجّلة" value={s.total} hint={`${s.newThisMonth} جديدة هذا الشهر`} onClick={() => router.push('/storely-admin/customers')} />
            <Stat label="مفعّلة" value={s.active} hint={`${s.paid} مدفوع · ${s.trial} تجربة`} />
            <Stat label="بانتظار التفعيل" value={s.pending.length} tone={s.pending.length ? 'warning' : 'default'} onClick={() => router.push('/storely-admin/customers?filter=pending')} />
          </div>

          <div className="overview-sections">
            {/* ينتهي قريباً */}
            <StorelyCard className="admin-panel" title="اشتراكات تنتهي قريباً" description="خلال 7 أيام">
              {s.expiring.length === 0 ? <Empty title="ما فيه اشتراكات تنتهي هالأسبوع" /> : s.expiring.slice(0, 6).map(({ u, d }) => (
                <ListRow key={u.id} onClick={() => setSelectedId(u.id)} title={u.org_name} sub={`${planLabel(u.plan)} · ${u.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'}`}
                  end={<StorelyStatusBadge status={d! <= 3 ? 'danger' : 'warning'}>باقي {d} يوم</StorelyStatusBadge>} />
              ))}
            </StorelyCard>

            {/* آخر المسجّلين */}
            <StorelyCard className="admin-panel" title="آخر المسجّلين" actions={<StorelyButton size="sm" variant="ghost" onClick={() => router.push('/storely-admin/customers')}>عرض الكل</StorelyButton>}>
              {s.latest.length === 0 ? <Empty title="ما فيه عملاء بعد" /> : s.latest.map(u => (
                <ListRow key={u.id} onClick={() => setSelectedId(u.id)} title={u.org_name} sub={`${u.full_name} · ${fmtDate(u.created_at)}`}
                  end={<StorelyStatusBadge status={u.status === 'active' ? 'success' : u.status === 'suspended' ? 'danger' : u.status === 'deleted' ? 'info' : 'warning'}>{(STATUS[u.status] || STATUS.pending).label}</StorelyStatusBadge>} />
              ))}
            </StorelyCard>

            {/* توزيع الباقات */}
            <StorelyCard className="admin-panel" title="توزيع الباقات" description="المنشآت المفعّلة">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.byPlan.map(({ k, n }) => {
                  const pct = s.active ? Math.round((n / s.active) * 100) : 0
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span className="font-semibold">{planLabel(k)}</span>
                        <span style={{ fontWeight: 700 }}>{n} <span style={{ color: storelyTokens.color.textMuted, fontWeight: 500 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 8, background: storelyTokens.color.border, borderRadius: 0, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: storelyTokens.color.navy, borderRadius: 0 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </StorelyCard>
          </div>
        </div>
      )}

      <div className="admin-drawer"><CustomerDrawer customer={selected} onClose={() => setSelectedId(null)}
        onChanged={patch => patch ? setList(prev => prev.map(u => u.id === selectedId ? { ...u, ...patch } : u)) : load()} /></div>
    </div>
  )
}

function ActionRow({ text, tone, onClick }: { text: string; tone: 'warning' | 'danger' | 'info'; onClick: () => void }) {
  const color = storelyTokens.color[tone]
  return (
    <button onClick={onClick} className="overview-action" style={{color}}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{text}</span>
      <ChevronLeft size={16} />
    </button>
  )
}

function ListRow({ title, sub, end, onClick }: { title: string; sub: string; end: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="overview-list-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: storelyTokens.color.text, overflowWrap: 'anywhere' }}>{title}</div>
        <div style={{ fontSize: 12, color: storelyTokens.color.textMuted, marginTop: 2 }}>{sub}</div>
      </div>
      {end}
    </button>
  )
}

const overviewStyles = `
  .admin-overview .overview-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${storelyTokens.spacing[6]}px; }
  .admin-overview .overview-sections > section:last-child { grid-column: 1 / -1; }
  .admin-overview .overview-sections > section:last-child > div:last-child { padding: ${storelyTokens.spacing[5]}px; }
  .admin-overview .overview-action { display: flex; align-items: center; gap: ${storelyTokens.spacing[3]}px; width: 100%; padding: ${storelyTokens.spacing[4]}px ${storelyTokens.spacing[5]}px; border: 0; border-bottom: 1px solid ${storelyTokens.color.border}; background: ${storelyTokens.color.surface}; font: inherit; font-weight: 600; text-align: start; cursor: pointer; }
  .admin-overview .overview-action:hover, .admin-overview .overview-list-row:hover { background: ${storelyTokens.color.background}; }
  .admin-overview .overview-list-row { display: flex; flex-wrap: wrap; align-items: center; gap: ${storelyTokens.spacing[3]}px; width: 100%; padding: ${storelyTokens.spacing[5]}px; border: 0; border-bottom: 1px solid ${storelyTokens.color.border}; background: ${storelyTokens.color.surface}; font: inherit; text-align: start; cursor: pointer; }
  .admin-overview .overview-list-row:last-child { border-bottom: 0; }
  @media (max-width: 640px) { .admin-overview .overview-sections { grid-template-columns: minmax(0, 1fr); } }
`
