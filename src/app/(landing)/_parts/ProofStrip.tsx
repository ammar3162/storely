'use client'
import type { LandingStats } from '@/lib/landingStats'
import type { LandingState } from './useLanding'

const n = (v: number) => v.toLocaleString('en-US')
const k = (v: number, ar: boolean) => v >= 1000 ? `${Math.floor(v / 1000).toLocaleString('en-US')}${ar ? ' ألف' : 'K'}` : n(v)

// أرقام حقيقية من حسابات عملائنا (بدون حسابات التجربة) — تتحدث لحالها
export default function ProofStrip({ m, stats }: { m: LandingState; stats: LandingStats | null }) {
  if (!stats) return null
  const ar = m.lang === 'ar'
  const items = [
    { v: n(stats.closings), l: ar ? 'إقفال كاشير يومي' : 'daily cashier closings' },
    { v: `${k(stats.sales, ar)} ⃁`, l: ar ? 'مبيعات مرّت بالإقفال اليومي' : 'sales checked in daily closings' },
    { v: `${n(stats.deficits)} ⃁`, l: ar ? 'عجز كاشير انكشف وتسجّل' : 'cashier shortages caught' },
    { v: n(stats.moves), l: ar ? 'حركة مخزون مسجّلة' : 'stock movements recorded' },
  ]
  return (
    <section className="lp-proof">
      <div className="lp-wrap">
        <div className="lp-proof-h">{ar ? 'أرقام حقيقية من حسابات عملائنا' : 'Real numbers from our customers'}</div>
        <div className="lp-proof-grid">
          {items.map(it => <div key={it.l}><strong>{it.v}</strong><span>{it.l}</span></div>)}
        </div>
      </div>
      <style>{`
.lp-proof{padding:28px 0 8px}
.lp-proof-h{font-size:14px;font-weight:600;color:var(--ink2);text-align:center;margin-bottom:14px}
.lp-proof-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}
.lp-proof-grid>div{padding:20px 16px;text-align:center}
.lp-proof-grid>div+div{border-inline-start:1px solid var(--line)}
.lp-proof-grid strong{display:block;font-size:26px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.lp-proof-grid span{display:block;font-size:13px;color:var(--ink2);margin-top:4px}
@media(max-width:720px){.lp-proof-grid{grid-template-columns:1fr 1fr}.lp-proof-grid>div:nth-child(3){border-inline-start:0}.lp-proof-grid>div:nth-child(n+3){border-top:1px solid var(--line)}.lp-proof-grid strong{font-size:22px}}
`}</style>
    </section>
  )
}
