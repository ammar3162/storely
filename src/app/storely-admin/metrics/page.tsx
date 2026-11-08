'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Wallet, CalendarRange, Percent, Users, FlaskConical, UserX, History, UserPlus, BadgeCheck, Ban, ArrowUpCircle, ArrowDownCircle, RotateCw, Circle, type LucideIcon } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, NoAccess, Notice, PageHeader, Row, Stack, Stat, StatGrid, adminFetch, fmtDate, useAdmin, type Tone } from '../_admin/kit'
import { planLabel } from '../_admin/customers'
import { planKeyOf } from '@/lib/planPricing'

const EVENTS: Record<string, { label: string; tone: Tone; icon: LucideIcon }> = {
  trial_started: { label: 'بدأ تجربة', tone: 'info', icon: UserPlus },
  activated: { label: 'اشترك (مدفوع)', tone: 'primary', icon: BadgeCheck },
  cancelled: { label: 'أُلغي أو أُوقف', tone: 'danger', icon: Ban },
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

  if (!allowed) return <NoAccess />

  return (
    <>
      <PageHeader title="مقاييس الإيراد" subtitle="الإيراد المتكرر ومعدل التحويل وسجل أحداث الاشتراكات"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      {error && <div style={{ marginBottom: 16 }}><Notice tone="danger">{error}</Notice></div>}

      {loading && !data ? <Loading /> : data && (
        <Stack>
          <StatGrid>
            <Stat icon={Wallet} label="الإيراد الشهري (MRR)" value={money(data.mrr)} tone="primary"
              hint={`باقات ${money(data.mrrPlans)} · إضافات ${money(data.mrrAddons)}${data.mrrDiscount ? ` · خصم ${money(data.mrrDiscount)}` : ''}`} />
            <Stat icon={CalendarRange} label="الإيراد السنوي المتوقع (ARR)" value={money(data.arr)} hint="الإيراد الشهري × 12" />
            <Stat icon={Percent} label="معدل التحويل إلى مدفوع" value={`${data.conversionRate}%`} tone="violet" hint={`${data.paidCount} من ${data.totalOwners} منشأة`} />
          </StatGrid>
          <StatGrid>
            <Stat icon={Users} label="مشتركون مدفوعون نشطون" value={data.paidCount} />
            <Stat icon={FlaskConical} label="في التجربة المجانية" value={data.trialCount} />
            <Stat icon={UserX} label="موقوفون أو ملغون" value={data.suspendedCount} tone={data.suspendedCount ? 'danger' : 'default'} />
          </StatGrid>

          <Notice tone="info">الإيراد هو مجموع فواتير المشتركين المدفوعين: الباقة والإضافات السارية بعد خصم التخفيض، ويُحسب الاشتراك السنوي بما يعادله شهرياً.</Notice>

          <Card title="آخر أحداث الاشتراكات" pad={0}>
            {!data.recentEvents?.length ? (
              <Empty icon={History} title="لا توجد أحداث مسجّلة بعد" hint="تظهر هنا عند تفعيل أي اشتراك أو إلغائه أو ترقيته" />
            ) : data.recentEvents.map((e: any) => {
              const cfg = EVENTS[e.event_type] || { label: e.event_type, tone: 'neutral' as Tone, icon: Circle }
              const Icon = cfg.icon
              return (
                <Row key={e.id}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: A.muted, color: A.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={17} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: A.text }}>{e.org_name}</div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 2 }}>
                      {fmtDate(e.created_at, true)}{e.plan ? ` · ${planLabel(planKeyOf(e.plan))}` : ''}{e.amount ? ` · ${money(e.amount)}` : ''}
                    </div>
                  </div>
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                </Row>
              )
            })}
          </Card>
        </Stack>
      )}
    </>
  )
}
