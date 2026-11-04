'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, UserPlus, BadgeCheck, Ban, ArrowUpCircle, ArrowDownCircle, RotateCw, Circle, type LucideIcon } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stat, adminFetch, fmtDate, useAdmin, type Tone } from '../_admin/kit'
import { planLabel } from '../_admin/customers'
import { planKeyOf } from '@/lib/planPricing'

const EVENTS: Record<string, { label: string; tone: Tone; icon: LucideIcon }> = {
  trial_started: { label: 'بدأ تجربة', tone: 'info', icon: UserPlus },
  activated: { label: 'اشترك (مدفوع)', tone: 'primary', icon: BadgeCheck },
  cancelled: { label: 'ألغى / أُوقف', tone: 'danger', icon: Ban },
  upgraded: { label: 'رقّى الباقة', tone: 'violet', icon: ArrowUpCircle },
  downgraded: { label: 'خفّض الباقة', tone: 'warning', icon: ArrowDownCircle },
  renewed: { label: 'جدّد الاشتراك', tone: 'primary', icon: RotateCw },
}

const money = (n: number) => `${Math.round(n || 0).toLocaleString('en')} ⃁`

export default function MetricsPage() {
  const { can } = useAdmin()
  const allowed = can('view_metrics')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const d = await adminFetch('/api/admin/metrics')
    if (!d.ok || !d.success) setError(d.error || 'تعذّر جلب البيانات')
    else setData(d)
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!allowed) return <Card><Empty title="ما عندك صلاحية على هالصفحة" /></Card>

  return (
    <>
      <PageHeader title="مقاييس الإيراد" subtitle="الإيراد المتكرر، معدل التحويل، وسجل أحداث الاشتراكات"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading && !data ? <Loading /> : data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <Stat label="الإيراد الشهري (MRR)" value={money(data.mrr)} tone="primary"
              hint={`باقات ${money(data.mrrPlans)} · إضافات ${money(data.mrrAddons)}${data.mrrDiscount ? ` · خصم ${money(data.mrrDiscount)}` : ''}`} />
            <Stat label="الإيراد السنوي المتوقع (ARR)" value={money(data.arr)} hint="الشهري × 12" />
            <Stat label="معدل التحويل لمدفوع" value={`${data.conversionRate}%`} tone="violet" hint={`${data.paidCount} من ${data.totalOwners} منشأة`} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <Stat label="مشتركون مدفوعون نشطون" value={data.paidCount} />
            <Stat label="بالتجربة المجانية" value={data.trialCount} />
            <Stat label="موقوفون / ملغيون" value={data.suspendedCount} tone={data.suspendedCount ? 'danger' : 'default'} />
          </div>

          <Notice tone="info">الإيراد = فاتورة كل مشترك مدفوع فعلياً: الباقة + الإضافات السارية − الخصم، والاشتراك السنوي محسوب بمقابله الشهري.</Notice>

          <Card title="آخر أحداث الاشتراكات" pad={0}>
            {!data.recentEvents?.length ? (
              <Empty title="ما فيه أحداث مسجّلة بعد" hint="بتظهر هنا أول ما تفعّل أو تلغي أو ترقّي أي اشتراك" />
            ) : data.recentEvents.map((e: any) => {
              const cfg = EVENTS[e.event_type] || { label: e.event_type, tone: 'neutral' as Tone, icon: Circle }
              const Icon = cfg.icon
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${A.border}` }}>
                  <Icon size={18} color={A.text2} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text }}>{e.org_name}</div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>
                      {fmtDate(e.created_at, true)}{e.plan ? ` · ${planLabel(planKeyOf(e.plan))}` : ''}{e.amount ? ` · ${money(e.amount)}` : ''}
                    </div>
                  </div>
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                </div>
              )
            })}
          </Card>
        </div>
      )}
    </>
  )
}
