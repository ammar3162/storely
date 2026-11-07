'use client'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PLAN_PRICING } from '@/lib/planPricing'
import type { LandingState } from './useLanding'

// «كم ممكن يطلع عندك عجز؟» — النسبة من إقفالات عملائنا الحقيقية (مو رقم مفترض)
export default function LossCalculator({ m, rate }: { m: LandingState; rate: number | null }) {
  const [daily, setDaily] = useState(3000)
  if (!rate || rate <= 0) return null
  const ar = m.lang === 'ar'
  const monthly = Math.round(daily * 30 * rate)
  const ops = PLAN_PRICING.ops.monthly
  const pct = (rate * 100).toFixed(2)
  return (
    <section className="lp-section" id="calc" style={{paddingTop:32,paddingBottom:32}}>
      <div className="lp-wrap">
        <div className="lp-calc rv">
          <div className="lp-calc-in">
            <div className="lp-calc-k">{ar ? 'احسبها على منشأتك' : 'Run your numbers'}</div>
            <h2 className="lp-calc-h">{ar ? 'كم ممكن يطلع عندك عجز كاشير بالشهر؟' : 'How much cashier shortage could you have each month?'}</h2>
            <label className="lp-calc-l" htmlFor="calc-daily">{ar ? 'مبيعاتك اليومية تقريباً' : 'Your daily sales, roughly'}</label>
            <div className="lp-calc-val"><b>{daily.toLocaleString('en-US')}</b> {ar ? '⃁ باليوم' : 'SAR / day'}</div>
            <input id="calc-daily" type="range" min={500} max={20000} step={500} value={daily} onChange={e => setDaily(Number(e.target.value))} className="lp-calc-range" aria-label={ar ? 'المبيعات اليومية' : 'Daily sales'} />
            <div className="lp-calc-scale"><span>500</span><span>20,000</span></div>
          </div>
          <div className="lp-calc-out">
            <div className="lp-calc-ol">{ar ? 'تقدير العجز الشهري' : 'Estimated monthly shortage'}</div>
            <div className="lp-calc-big"><b>{monthly.toLocaleString('en-US')}</b> ⃁</div>
            <p className="lp-calc-note">{ar
              ? `متوسط العجز اللي كشفه الإقفال اليومي عند عملائنا ${pct}% من المبيعات. Storely يطلّعه لك يوم بيوم وباسم الكاشير، وباقة التشغيل بـ${ops} ⃁ بالشهر.`
              : `Our customers' daily closings caught an average shortage of ${pct}% of sales. Storely shows it day by day per cashier; the Operations plan is ${ops} SAR a month.`}</p>
            <button type="button" className="lp-btn lp-btn-dark lp-btn-lg" style={{width:'100%'}} onClick={() => m.router.push('/login?mode=register&plan=ops')}>{ar ? 'جرّب الإقفال مجاناً 14 يوم' : 'Try closing free for 14 days'} <ArrowLeft size={18} /></button>
          </div>
        </div>
      </div>
      <style>{`
.lp-calc{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:0;background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden}
.lp-calc-in{padding:30px 32px}
.lp-calc-k{font-size:13px;font-weight:600;color:var(--teal2);margin-bottom:6px}
.lp-calc-h{font-size:24px;font-weight:700;color:var(--ink);line-height:1.4;margin:0 0 22px}
.lp-calc-l{display:block;font-size:14px;color:var(--ink2);margin-bottom:6px}
.lp-calc-val{font-size:15px;color:var(--ink2);margin-bottom:10px}
.lp-calc-val b{font-size:28px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
.lp-calc-range{width:100%;accent-color:#0f766e;height:28px;cursor:pointer;direction:ltr}
.lp-calc-scale{display:flex;justify-content:space-between;font-size:12px;color:var(--ink2);direction:ltr}
.lp-calc-out{background:#f4f7f6;padding:30px 32px;display:flex;flex-direction:column;justify-content:center;border-inline-start:1px solid var(--line)}
.lp-calc-ol{font-size:14px;color:var(--ink2)}
.lp-calc-big{font-size:18px;color:var(--ink2);margin:4px 0 10px}
.lp-calc-big b{font-size:44px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
.lp-calc-note{font-size:14px;color:var(--ink2);line-height:1.7;margin:0 0 18px}
@media(max-width:820px){.lp-calc{grid-template-columns:1fr}.lp-calc-out{border-inline-start:0;border-top:1px solid var(--line)}.lp-calc-in,.lp-calc-out{padding:22px 20px}.lp-calc-h{font-size:20px}}
`}</style>
    </section>
  )
}
