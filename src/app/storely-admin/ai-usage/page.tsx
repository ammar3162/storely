'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Coins, CalendarRange, Hash, Divide, Sparkles } from 'lucide-react'
import { A, Avatar, Btn, Card, Empty, Loading, PageHeader, Stack, Stat, StatGrid, Table, Tabs, adminFetch, td } from '../_admin/kit'
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
      <PageHeader title="تكلفة الذكاء الاصطناعي" subtitle="التكلفة الفعلية لكل طلب إلى Anthropic، محسوبة من عدد الرموز (Tokens)"
        actions={<>
          <Tabs items={[7, 30, 90].map(n => ({ k: String(n), l: `${n} يوماً` }))} value={String(days)} onChange={k => { const n = Number(k); setDays(n); load(n) }} />
          <Btn onClick={() => load()} loading={loading}><RefreshCw size={14} /> تحديث</Btn>
        </>} />
      {loading ? <Loading /> : !d?.success ? <Card><Empty title="تعذر تحميل البيانات" /></Card> : total.calls === 0 ? (
        <Card><Empty icon={Sparkles} title="لا توجد طلبات ذكاء اصطناعي في هذه الفترة" hint="بدأ تسجيل التكلفة مع هذا التحديث، والطلبات الأقدم ليس لها تكلفة محفوظة" /></Card>
      ) : (
        <Stack>
          <StatGrid>
            <Stat icon={Coins} label={`التكلفة خلال آخر ${d.days} يوماً`} value={sar(total.cost)} tone="primary" />
            <Stat icon={CalendarRange} label="المتوقع شهرياً" value={sar(perMonth)} hint="بالمعدل نفسه للفترة" />
            <Stat icon={Hash} label="عدد الطلبات" value={total.calls.toLocaleString('en')} />
            <Stat icon={Divide} label="متوسط تكلفة الطلب" value={sar(total.cost / total.calls)} />
          </StatGrid>

          <Card title="التكلفة اليومية" subtitle="مرّر المؤشر على العمود لعرض التفاصيل">
            <div style={{ position: 'relative', height: 160, direction: 'ltr' }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i / 3) * 100}%`, borderTop: `1px ${i === 3 ? 'solid' : 'dashed'} ${A.border}` }} />)}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                {d.daily.map(x => (
                  <div key={x.day} title={`${x.day} · ${sar(x.cost)} · ${x.calls} طلب`} className="adm-bar"
                    style={{ flex: 1, minWidth: 3, height: `${Math.max(2, (x.cost / maxDay) * 100)}%`, background: A.primary, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: A.text3, marginTop: 8, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
              <span>{d.daily[0]?.day}</span><span>الأعلى {sar(maxDay)}</span><span>{d.daily[d.daily.length - 1]?.day}</span>
            </div>
          </Card>

          <Card title="حسب الميزة" pad={0}>
            <Table head={['الميزة', 'الطلبات', 'التكلفة', 'متوسط الطلب', 'النسبة']} minWidth={560}>
              {d.features.map(f => {
                const pct = total.cost ? Math.round((f.cost / total.cost) * 100) : 0
                return (
                  <tr key={f.feature}>
                    <td style={{ ...td, fontWeight: 600 }}>{FEATURE_AR[f.feature] || f.feature}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{f.calls.toLocaleString('en')}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{sar(f.cost)}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{sar(f.cost / f.calls)}</td>
                    <td style={{ ...td, minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: A.muted, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: A.primary, borderRadius: 99 }} /></div>
                        <span style={{ fontSize: 12.5, color: A.text2, fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
          </Card>

          <Card title="حسب المنشأة" subtitle="المنشآت الأعلى استهلاكاً، للمقارنة مع قيمة اشتراكها" pad={0}>
            <Table head={['المنشأة', 'الطلبات', 'التكلفة', 'المتوقع بالشهر', 'أكثر ميزة']} minWidth={620}>
              {d.orgs.map(o => {
                const top = Object.entries(o.features).sort((a, b) => b[1] - a[1])[0]
                return (
                  <tr key={o.org_id || 'none'}>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={o.name} size={30} /><span style={{ fontWeight: 600 }}>{o.name}</span></div></td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{o.calls.toLocaleString('en')}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{sar(o.cost)}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{sar(o.cost * (30 / d.days))}</td>
                    <td style={{ ...td, color: A.text2 }}>{top ? FEATURE_AR[top[0]] || top[0] : '—'}</td>
                  </tr>
                )
              })}
            </Table>
          </Card>
        </Stack>
      )}
    </>
  )
}
