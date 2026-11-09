'use client'
// اختيارات الأسعار الجديدة للمشتركين الحاليين — تُطبَّق تلقائياً مع التجديد (lib/pricingSwitch)
import { useEffect, useState } from 'react'
import { Phone, Hourglass, ArrowLeftRight, Lock, CircleCheck, Tags } from 'lucide-react'
import { FEATURE_NAMES } from '@/lib/featurePresets'
import { A, Avatar, Badge, Card, Empty, Loading, PageHeader, Stack, Stat, StatGrid, Table, td, adminKey, fmtDate, daysLeft, type Tone } from '../_admin/kit'

type Row = {
  org_id: string; name: string; plan: string; owner: string | null; phone: string | null; renews_at: string | null; bill_now: number | null
  modules: string[]; branches: number | null; current_monthly: number | null; new_monthly: number | null
  chosen_at: string | null; applied_at: string | null; status: 'pending' | 'will_switch' | 'will_keep' | 'applied' | 'kept'
}

const ST: Record<Row['status'], [string, Tone]> = {
  will_switch: ['ينتقل عند التجديد', 'info'],
  will_keep: ['يبقى على باقته (أرخص له)', 'neutral'],
  pending: ['لم يختر بعد', 'warning'],
  applied: ['انتقل للأسعار الجديدة', 'primary'],
  kept: ['بقي على باقته', 'neutral'],
}
const money = (n: number | null) => (n == null ? '—' : `${Math.round(n).toLocaleString('en-US')} ⃁`)

export default function PricingSwitchesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/pricing-switches', { headers: { 'x-admin-key': adminKey() } })
      .then(r => r.json()).then(j => { if (j.success) setRows(j.rows || []); else setError(j.error || 'تعذر التحميل') })
      .catch(() => setError('تعذر التحميل')).finally(() => setLoading(false))
  }, [])

  const count = (s: Row['status']) => rows.filter(r => r.status === s).length
  const switching = rows.filter(r => r.status === 'will_switch')
  const change = switching.reduce((t, r) => t + ((r.new_monthly || 0) - (r.current_monthly || 0)), 0)

  return (
    <>
      <PageHeader title="اختيارات الأسعار الجديدة"
        subtitle="يختار المشتركون الحاليون على الباقات الثابتة مزاياهم بالأسعار الجديدة، ويُطبَّق الاختيار تلقائياً عند تجديد اشتراكهم من «العملاء». لا يدفع أي مشترك أكثر من فاتورته الحالية" />

      {loading ? <Loading /> : error ? <Card><Empty title={error} /></Card> : (
        <Stack>
          <StatGrid>
            <Stat icon={Hourglass} label="لم يختر بعد" value={count('pending')} tone={count('pending') ? 'warning' : 'default'} />
            <Stat icon={ArrowLeftRight} label="ينتقل عند التجديد" value={count('will_switch')} hint={switching.length ? `تغيّر الإيراد الشهري ${change > 0 ? '+' : ''}${Math.round(change).toLocaleString('en-US')} ⃁` : undefined} />
            <Stat icon={Lock} label="يبقى على باقته" value={count('will_keep') + count('kept')} />
            <Stat icon={CircleCheck} label="انتقل فعلياً" value={count('applied')} tone="primary" />
          </StatGrid>

          {rows.length === 0 ? <Card><Empty icon={Tags} title="لا يوجد مشتركون على باقات ثابتة" /></Card> : (
            <Card pad={0}><Table head={['المنشأة', 'الباقة الحالية', 'الحالة', 'المزايا المختارة', 'الفاتورة قبل', 'الفاتورة بعد', 'التجديد']} minWidth={980}>
              {rows.map(r => {
                const [label, tone] = ST[r.status]
                const d = daysLeft(r.renews_at)
                return (
                  <tr key={r.org_id}>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Avatar name={r.name} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          {r.phone && <div style={{ fontSize: 12, color: A.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {r.owner} <span dir="ltr">{r.phone}</span></div>}
                        </div>
                      </div>
                    </td>
                    <td style={td}>{r.plan}</td>
                    <td style={td}><Badge tone={tone}>{label}</Badge>{r.chosen_at && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>اختار {fmtDate(r.chosen_at)}</div>}</td>
                    <td style={{ ...td, maxWidth: 240 }}>
                      {r.modules.length ? r.modules.map(m => FEATURE_NAMES[m]?.ar || m).join('، ') : '—'}
                      {r.branches ? <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{r.branches === 1 ? 'فرع واحد' : `${r.branches} فروع`}</div> : null}
                    </td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{money(r.current_monthly ?? r.bill_now)}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums', fontWeight: r.status === 'will_switch' || r.status === 'applied' ? 600 : 400 }}>
                      {r.status === 'will_keep' || r.status === 'kept' ? money(r.current_monthly) : money(r.new_monthly)}
                      {(r.status === 'will_keep' || r.status === 'kept') && r.new_monthly != null && <div style={{ fontSize: 11.5, color: A.text3 }}>المزايا المختارة {money(r.new_monthly)}</div>}
                    </td>
                    <td style={td}>{r.applied_at ? `طُبّق ${fmtDate(r.applied_at)}` : r.renews_at ? <>{fmtDate(r.renews_at)}{d != null && <div style={{ fontSize: 11.5, color: d < 0 ? A.danger : A.text3 }}>{d < 0 ? `منتهٍ منذ ${-d} يوم` : `بعد ${d} يوم`}</div>}</> : '—'}</td>
                  </tr>
                )
              })}
            </Table></Card>
          )}
        </Stack>
      )}
    </>
  )
}
