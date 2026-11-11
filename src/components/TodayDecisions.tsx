'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StorelyCard, StorelyStatusBadge } from '@/components/ui'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api-client'
import { buildDecisions, type Decision } from '@/lib/todayDecisions'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// «قرارات اليوم» في الصفحة الرئيسية (كانت بأدوات الذكاء): يشغّل الأدوات تلقائياً ويعرض 3–5 أشياء يسويها المالك اليوم (lib/todayDecisions).
// full = الباقة/الإضافة تسمح بأدوات الهدر والراكد — بدونها نعرض الطلب والزحمة بس.
export default function TodayDecisions({ full, curr, onCount }: { full: boolean; curr: string; onCount?: (n: number) => void }) {
  const router = useRouter()
  const [list, setList] = useState<Decision[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [whyOpen, setWhyOpen] = useState<number | null>(null)

  async function load() {
    const org_id = sessionStorage.getItem('s_org_id'), branch_id = sessionStorage.getItem('s_branch_id')
    if (!org_id) return
    setLoading(true)
    const body = { org_id, branch_id }
    const get = (u: string) => api.post(u, body).catch(() => ({}) as any)
    const [f, t, b, s, w, d] = await Promise.all([get('/api/stock-forecast'), get('/api/smart-reorder-timing'), get('/api/purchase-suggestion'), get('/api/seasonality'),
      full ? get('/api/waste-report') : Promise.resolve(null), full ? get('/api/waste-detection') : Promise.resolve(null)])
    const todayDow = new Date(Date.now() + 3 * 3600e3).getUTCDay()
    const out = buildDecisions({ forecast: f?.forecast, timing: t?.suggestions, buy: b?.suggestions, season: s?.byDay ? s : null,
      waste: w?.report ? w : null, dead: d?.waste, todayDow, curr })
    setList(out)
    setWhyOpen(null)
    onCount?.(out.filter(x => x.level !== 'info').length)
    setLoading(false)
  }
  useEffect(() => { load() }, [full])   // eslint-disable-line react-hooks/exhaustive-deps

  // اللون في الأيقونة بس — الخلفية بيضاء، والأحمر للعاجل فقط
  const style = {
    urgent: { cls: 'text-[#B91C1C]', Icon: AlertCircle },
    warn: { cls: 'text-[#B45309]', Icon: AlertTriangle },
    info: { cls: 'text-[#66737C]', Icon: Info },
  }
  // رابط داخل أدوات الذكاء (#waste): لو القسم مو بالصفحة الحالية نفتح أدوات الذكاء عليه
  const go = (href: string) => {
    if (!href.startsWith('#')) return router.push(href)
    const el = document.getElementById(href.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else router.push('/ai-tools' + href)
  }
  const today = new Date(Date.now() + 3 * 3600e3)
  const urgent = list?.filter(d => d.level === 'urgent').length || 0

  return (
    <StorelyCard
      title={<span className="inline-flex items-center gap-2">قرارات اليوم{urgent > 0 ? <StorelyStatusBadge status="danger">{urgent} {urgent === 1 ? 'عاجل' : 'عاجلة'}</StorelyStatusBadge> : null}</span>}
      description={`${DAY_NAMES[today.getUTCDay()]} · أهم ما يجب فعله اليوم بناءً على بياناتك`}
      actions={
        <button type="button" onClick={load} disabled={loading} aria-label="تحديث" title="تحديث"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DEE6EA] text-[#66737C] hover:bg-[#EEF2F4] hover:text-[#203640] disabled:opacity-60">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {list === null ? (
        <div className="space-y-2 px-4 py-3 sm:px-[18px]">{[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-[#EEF2F4]" />)}</div>
      ) : list.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-[13.5px] font-semibold text-[#203640] sm:px-[18px]">
          <CheckCircle2 size={16} className="text-[#047857]" /> كل شيء على ما يرام اليوم، لا توجد قرارات عاجلة
        </div>
      ) : (
        <div className="divide-y divide-[#E6ECEF]">
          {list.map((d, i) => {
            const s = style[d.level]
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-[18px]">
                <s.Icon size={17} className={s.cls + ' mt-[3px] shrink-0'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                    <div className="min-w-0 max-w-full">
                      <div className="text-[14px] font-semibold leading-6 text-[#203640]">{d.title}</div>
                      <div className="text-[12.5px] leading-5 text-[#66737C]">{d.detail}</div>
                    </div>
                    {d.action && (
                      <button type="button" onClick={() => go(d.action!.href)}
                        className={'shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold hover:bg-[#EEF2F4] ' + (d.level === 'urgent' ? 'border-[#F1C4C4] text-[#B91C1C]' : 'border-[#DEE6EA] text-[#203640]')}>
                        {d.action.label}
                      </button>
                    )}
                  </div>
                  {d.why && (
                    <>
                      <button type="button" onClick={() => setWhyOpen(whyOpen === i ? null : i)} aria-expanded={whyOpen === i}
                        className="mt-1 text-[12.5px] font-semibold text-[#203640] underline decoration-[#9AA7AE] decoration-dotted underline-offset-4 hover:decoration-[#203640]">
                        {whyOpen === i ? 'إخفاء' : 'لماذا؟'}
                      </button>
                      {whyOpen === i && <div className="mt-1.5 rounded-lg bg-[#F4F7F8] px-3 py-2 text-[13px] leading-6 text-[#203640]">{d.why}</div>}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </StorelyCard>
  )
}
