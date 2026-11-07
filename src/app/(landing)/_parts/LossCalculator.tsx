'use client'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PLAN_PRICING } from '@/lib/planPricing'
import type { DeficitBand } from '@/lib/landingStats'
import type { LandingState } from './useLanding'

// «كم يطلع عندك عجز؟» — من إقفالات عملائنا الحقيقية حسب حجم المبيعات اليومية.
// العجز ما يكبر مع المبيعات بنسبة ثابتة، فنعرض لكل شريحة: كم مرة يطلع، وكم غالباً، ومجموعه بالشهر.
const LABEL: Record<string, { ar: string; en: string }> = {
  small: { ar: 'أقل من 1,000', en: 'Under 1,000' },
  mid: { ar: '1,000 – 2,500', en: '1,000 – 2,500' },
  big: { ar: 'أكثر من 2,500', en: 'Over 2,500' },
}
const oneIn = (share: number) => Math.max(1, Math.round(1 / share))

export default function LossCalculator({ m, bands }: { m: LandingState; bands: DeficitBand[] | null }) {
  const list = bands || []
  const [key, setKey] = useState<string>(() => (list.find(b => b.key === 'big') || list[list.length - 1])?.key || '')
  if (!list.length) return null
  const ar = m.lang === 'ar'
  const b = list.find(x => x.key === key) || list[0]
  const monthly = Math.round(b.perDay * 30 / 10) * 10
  const ops = PLAN_PRICING.ops.monthly
  return (
    <section className="lp-section" id="calc" style={{paddingTop:32,paddingBottom:32}}>
      <div className="lp-wrap">
        <div className="lp-calc rv">
          <div className="lp-calc-in">
            <div className="lp-calc-k">{ar ? 'من إقفالات عملائنا الحقيقية' : "From our customers' real closings"}</div>
            <h2 className="lp-calc-h">{ar ? 'كم يطلع عجز كاشير عند منشأة بحجمك؟' : 'How much cashier shortage does a business your size see?'}</h2>
            <div className="lp-calc-l">{ar ? 'مبيعاتك اليومية تقريباً (⃁)' : 'Your daily sales (SAR)'}</div>
            <div className="lp-calc-seg" role="group">
              {list.map(x => <button key={x.key} type="button" className={x.key === b.key ? 'on' : ''} aria-pressed={x.key === b.key} onClick={() => setKey(x.key)}>{ar ? LABEL[x.key].ar : LABEL[x.key].en}</button>)}
            </div>
            <ul className="lp-calc-facts">
              <li><b>{ar ? `يوم من كل ${oneIn(b.shareWithDeficit)}` : `1 day in ${oneIn(b.shareWithDeficit)}`}</b><span>{ar ? 'يطلع فيه عجز' : 'has a shortage'}</span></li>
              <li><b>{b.medianDeficit} ⃁</b><span>{ar ? 'غالباً لما يطلع' : 'typical shortage'}</span></li>
            </ul>
          </div>
          <div className="lp-calc-out">
            <div className="lp-calc-ol">{ar ? 'العجز بالشهر تقريباً' : 'Shortage per month, roughly'}</div>
            <div className="lp-calc-big"><b>{monthly.toLocaleString('en-US')}</b> ⃁</div>
            <p className="lp-calc-note">{ar
              ? `من ${b.closings} إقفال يومي حقيقي عند عملائنا بنفس حجم المبيعات. Storely يطلّع العجز يوم بيوم وباسم الكاشير، وأحد عملائنا نزل عجزه الشهري من 1,438 ⃁ إلى 67 ⃁ خلال 4 شهور. باقة التشغيل ${ops} ⃁ بالشهر.`
              : `From ${b.closings} real daily closings at businesses this size. Storely shows each shortage per cashier; one customer cut monthly shortage from 1,438 to 67 SAR in 4 months. Operations is ${ops} SAR a month.`}</p>
            <button type="button" className="lp-btn lp-btn-dark lp-btn-lg" style={{width:'100%'}} onClick={() => m.router.push('/login?mode=register&plan=ops')}>{ar ? 'جرّب الإقفال مجاناً 14 يوم' : 'Try closing free for 14 days'} <ArrowLeft size={18} /></button>
          </div>
        </div>
      </div>
      <style>{`
.lp-calc{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden}
.lp-calc-in{padding:30px 32px}
.lp-calc-k{font-size:13px;font-weight:600;color:var(--teal2);margin-bottom:6px}
.lp-calc-h{font-size:24px;font-weight:700;color:var(--ink);line-height:1.4;margin:0 0 22px}
.lp-calc-l{font-size:14px;color:var(--ink2);margin-bottom:8px}
.lp-calc-seg{display:grid;grid-template-columns:repeat(${list.length},minmax(0,1fr));gap:4px;background:#f1f2f3;border-radius:12px;padding:4px}
.lp-calc-seg button{height:44px;border:0;border-radius:9px;background:transparent;font:500 15px 'IBM Plex Sans Arabic',sans-serif;color:var(--ink2);cursor:pointer;transition:background-color .15s,color .15s}
.lp-calc-seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.lp-calc-facts{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lp-calc-facts li{border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.lp-calc-facts b{display:block;font-size:20px;font-weight:700;color:var(--ink)}
.lp-calc-facts span{font-size:13px;color:var(--ink2)}
.lp-calc-out{background:#f4f7f6;padding:30px 32px;display:flex;flex-direction:column;justify-content:center;border-inline-start:1px solid var(--line)}
.lp-calc-ol{font-size:14px;color:var(--ink2)}
.lp-calc-big{font-size:18px;color:var(--ink2);margin:4px 0 10px}
.lp-calc-big b{font-size:44px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
.lp-calc-note{font-size:14px;color:var(--ink2);line-height:1.7;margin:0 0 18px}
@media(max-width:820px){.lp-calc{grid-template-columns:1fr}.lp-calc-out{border-inline-start:0;border-top:1px solid var(--line)}.lp-calc-in,.lp-calc-out{padding:22px 20px}.lp-calc-h{font-size:20px}.lp-calc-seg button{font-size:13px}}
`}</style>
    </section>
  )
}
