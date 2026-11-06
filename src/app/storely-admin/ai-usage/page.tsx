'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { A, Btn, Card, Empty, Loading, PageHeader, Stat, Table, adminFetch, td } from '../_admin/kit'
import type { AiUsageSummary } from '@/lib/aiUsageSummary'

type Resp = AiUsageSummary & { success?: boolean; days: number }

// تكلفة الذكاء الاصطناعي الفعلية: كل طلب لـ Anthropic ينحفظ مع تكلفته — لكل ميزة ولكل منشأة
const FEATURE_AR: Record<string, string> = {
  invoice_scan: 'قراءة الفواتير (المشتريات)',
  invoice_agent: 'وكيل الفواتير',
  smart_insights: 'الرؤى الذكية',
  assistant: 'المساعد الذكي',
  assistant_topic: 'فحص سؤال المساعد',
  translate_products: 'ترجمة الأصناف',
  translate_tasks: 'ترجمة المهام',
}
const sar = (n: number) => `${n < 1 ? n.toFixed(2) : n.toFixed(1)} ⃁`

export default function AiUsagePage() {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(n = days) {
    setLoading(true)
    setD(await adminFetch(`/api/admin/ai-usage?days=${n}`))
    setLoading(false)
  }
  useEffect(() => { adminFetch('/api/admin/ai-usage?days=30').then(j => { setD(j); setLoading(false) }) }, [])

  const total = d?.total || { calls: 0, cost: 0 }
  const maxDay = Math.max(0.0001, ...(d?.daily || []).map(x => x.cost))
  const perMonth = d ? total.cost * (30 / d.days) : 0

  return (
    <>
      <PageHeader title="تكلفة الذكاء الاصطناعي" subtitle="التكلفة الفعلية لكل طلب لـ Anthropic، محسوبة من عدد التوكنز"
        actions={<>
          {[7, 30, 90].map(n => <Btn key={n} small kind={days === n ? 'primary' : 'secondary'} onClick={() => { setDays(n); load(n) }}>{n} يوم</Btn>)}
          <Btn small onClick={() => load()}><RefreshCw size={14} /> تحديث</Btn>
        </>} />
      {loading ? <Loading /> : !d?.success ? <Card><Empty title="تعذر تحميل البيانات" /></Card> : total.calls === 0 ? (
        <Card><Empty title="ما فيه طلبات ذكاء في هالفترة" hint="التسجيل بدأ مع هالتحديث — الطلبات القديمة ما لها تكلفة محفوظة" /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
            <Stat label={`التكلفة · آخر ${d.days} يوم`} value={sar(total.cost)} tone="primary" />
            <Stat label="المتوقع بالشهر" value={sar(perMonth)} hint="بنفس معدل الفترة" />
            <Stat label="عدد الطلبات" value={total.calls.toLocaleString('en')} />
            <Stat label="متوسط الطلب" value={sar(total.cost / total.calls)} />
          </div>

          <Card title="حسب الميزة">
            <Table head={['الميزة', 'الطلبات', 'التكلفة', 'متوسط الطلب', 'النسبة']} minWidth={560}>
              {d.features.map(f => (
                <tr key={f.feature}>
                  <td style={{ ...td, fontWeight: 700 }}>{FEATURE_AR[f.feature] || f.feature}</td>
                  <td style={td}>{f.calls.toLocaleString('en')}</td>
                  <td style={td}>{sar(f.cost)}</td>
                  <td style={td}>{sar(f.cost / f.calls)}</td>
                  <td style={td}>{total.cost ? Math.round((f.cost / total.cost) * 100) : 0}%</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="حسب المنشأة" subtitle="مين يستهلك أكثر — قارنها باشتراكه">
            <Table head={['المنشأة', 'الطلبات', 'التكلفة', 'المتوقع بالشهر', 'أكثر ميزة']} minWidth={620}>
              {d.orgs.map(o => {
                const top = Object.entries(o.features).sort((a, b) => b[1] - a[1])[0]
                return (
                  <tr key={o.org_id || 'none'}>
                    <td style={{ ...td, fontWeight: 700 }}>{o.name}</td>
                    <td style={td}>{o.calls.toLocaleString('en')}</td>
                    <td style={td}>{sar(o.cost)}</td>
                    <td style={td}>{sar(o.cost * (30 / d.days))}</td>
                    <td style={{ ...td, color: A.text2 }}>{top ? FEATURE_AR[top[0]] || top[0] : '—'}</td>
                  </tr>
                )
              })}
            </Table>
          </Card>

          <Card title="باليوم">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, direction: 'ltr' }}>
              {d.daily.map(x => (
                <div key={x.day} title={`${x.day} · ${sar(x.cost)} · ${x.calls} طلب`}
                  style={{ flex: 1, minWidth: 4, height: `${Math.max(3, (x.cost / maxDay) * 100)}%`, background: A.primary, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: A.text3, marginTop: 6, direction: 'ltr' }}>
              <span>{d.daily[0]?.day}</span><span>{d.daily[d.daily.length - 1]?.day}</span>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
