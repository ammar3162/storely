'use client'
// اختيارات الأسعار الجديدة للمشتركين الحاليين — تُطبَّق تلقائياً مع التجديد (lib/pricingSwitch)
import { useEffect, useState } from 'react'
import { Phone, Hourglass, ArrowLeftRight, Lock, CircleCheck, Tags } from 'lucide-react'
import { FEATURE_NAMES } from '@/lib/featurePresets'
import { A, Avatar, Badge, Card, Empty, Loading, PageHeader, Stack, Stat, StatGrid, Table, td, adminKey, fmtDate, daysLeft, type Tone } from '../kit'

type Row = {
  org_id: string; name: string; plan: string; owner: string | null; phone: string | null; renews_at: string | null; bill_now: number | null
  modules: string[]; branch_counts?: Record<string, number>; branches: number | null; current_monthly: number | null; new_monthly: number | null
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

  const load = () => fetch('/api/admin/pricing-switches', { headers: { 'x-admin-key': adminKey() } })
    .then(r => r.json()).then(j => { if (j.success) setRows(j.rows || []); else setError(j.error || 'تعذر التحميل') })
    .catch(() => setError('تعذر التحميل')).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  // «طبّق الآن»: يعيد الحساب بحالة المنشأة الحين ويطبّق الاختيار لو أرخص (بدون انتظار التجديد)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const applyNow = async (r: Row) => {
    if (!confirm(`تطبيق اختيار «${r.name}» الآن (قبل التجديد)؟ ينتقل فوراً إلى الخدمات التي اختارها بسعرها الجديد، ويُلغى ما لم يختره. التاريخ يبقى كما هو.`)) return
    setBusy(r.org_id); setMsg(null)
    try {
      const j = await fetch('/api/admin/pricing-switches', { method: 'POST', headers: { 'x-admin-key': adminKey(), 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: r.org_id }) }).then(x => x.json())
      if (!j.success) setMsg({ id: r.org_id, text: j.error || 'تعذر التطبيق', ok: false })
      else if (j.applied) setMsg({ id: r.org_id, text: `تم: فاتورته الآن ${money(j.monthly)} شهرياً`, ok: true })
      else setMsg({ id: r.org_id, text: j.kept ? `لم يُطبَّق: المزايا المختارة ${money(j.projected)} أعلى من فاتورته الحالية ${money(j.current)}` : 'لا يوجد اختيار لتطبيقه', ok: false })
      await load()
    } catch { setMsg({ id: r.org_id, text: 'تعذر الاتصال', ok: false }) }
    setBusy(null)
  }

  const count = (s: Row['status']) => rows.filter(r => r.status === s).length
  const switching = rows.filter(r => r.status === 'will_switch')
  const change = switching.reduce((t, r) => t + ((r.new_monthly || 0) - (r.current_monthly || 0)), 0)

  return (
    <>
      <PageHeader title="اختيارات الأسعار الجديدة"
        subtitle="يختار المشتركون الحاليون على الباقات الثابتة خدماتهم بالأسعار الجديدة، وتُفعَّل تلقائياً عند تجديد اشتراكهم من «العملاء» (أو فوراً بزر «طبّق الآن») بسعرها الجديد، وتُعاد الحسبة بحالة المنشأة وقت التطبيق" />

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
                    <td style={td}>
                      <Badge tone={tone}>{label}</Badge>{r.chosen_at && <div style={{ fontSize: 11.5, color: A.text3, marginTop: 4 }}>اختار {fmtDate(r.chosen_at)}</div>}
                      {r.chosen_at && !r.applied_at && r.modules.length > 0 && (
                        <button onClick={() => applyNow(r)} disabled={busy === r.org_id}
                          style={{ marginTop: 6, height: 30, padding: '0 10px', borderRadius: 8, border: `1px solid ${A.border}`, background: 'white', color: A.text, fontSize: 12.5, fontWeight: 600, cursor: busy === r.org_id ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                          {busy === r.org_id ? 'جارٍ التطبيق…' : 'طبّق الآن'}
                        </button>
                      )}
                      {msg?.id === r.org_id && <div style={{ fontSize: 11.5, marginTop: 4, color: msg.ok ? A.primary : A.danger, maxWidth: 220 }}>{msg.text}</div>}
                    </td>
                    <td style={{ ...td, maxWidth: 240 }}>
                      {r.modules.length ? r.modules.map(m => { const n = r.branch_counts?.[m]; return (FEATURE_NAMES[m]?.ar || m) + (n ? ` (${n === 1 ? 'فرع واحد' : n === 2 ? 'فرعين' : `${n} فروع`})` : '') }).join('، ') : '—'}
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
