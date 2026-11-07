'use client'
import { ArrowLeft } from 'lucide-react'
import { CUSTOM_MIN_MONTHLY, PLAN_PRICING } from '@/lib/planPricing'
import type { LandingState } from './useLanding'

// شريط الأسعار في الرئيسية — التفاصيل في صفحة /pricing
export default function PricingTeaser({ m }: { m: LandingState }) {
  const { lang } = m
  const ar = lang === 'ar'
  return (
    <section id="pricing" className="lp-section" style={{paddingTop:24,paddingBottom:24}}>
      <div className="lp-wrap">
        <div className="lp-pt rv">
          <div>
            <div className="lp-pt-k">{ar ? 'الأسعار' : 'Pricing'}</div>
            <div className="lp-pt-h">{ar ? <>باقات تبدأ من <b>{CUSTOM_MIN_MONTHLY} ⃁</b> شهرياً</> : <>Plans from <b>{CUSTOM_MIN_MONTHLY} SAR</b> a month</>}</div>
            <div className="lp-pt-s">{ar
              ? `ثلاث باقات جاهزة (${PLAN_PRICING.essential.monthly} و${PLAN_PRICING.ops.monthly} و${PLAN_PRICING.full.monthly} ⃁) أو ابنِ باقتك بالمزايا اللي تحتاجها. جرّب كل شي مجاناً 14 يوماً.`
              : `Three ready plans (${PLAN_PRICING.essential.monthly}, ${PLAN_PRICING.ops.monthly} and ${PLAN_PRICING.full.monthly} SAR) or build your own. Try everything free for 14 days.`}</div>
          </div>
          <a className="lp-btn lp-btn-dark lp-btn-lg" href="/pricing">{ar ? 'شوف الأسعار' : 'See pricing'} <ArrowLeft size={18}/></a>
        </div>
      </div>
      <style>{`
.lp-pt{display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px 32px}
.lp-pt a.lp-btn-dark{color:#fff;white-space:nowrap}
.lp-pt-k{font-size:13px;font-weight:600;color:var(--teal2);margin-bottom:6px}
.lp-pt-h{font-size:24px;font-weight:700;color:var(--ink)}
.lp-pt-h b{color:var(--teal2)}
.lp-pt-s{font-size:15px;color:var(--ink2);margin-top:6px;line-height:1.6;max-width:560px}
@media(max-width:720px){.lp-pt{flex-direction:column;align-items:stretch;padding:22px 20px}.lp-pt-h{font-size:20px}}
`}</style>
    </section>
  )
}
