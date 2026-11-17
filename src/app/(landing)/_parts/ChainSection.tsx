'use client'
import { FileText, Boxes, Send, Calculator, TrendingUp } from 'lucide-react'
import type { LandingState } from './useLanding'

// السلسلة: كل إجراء ينعكس على ما بعده (فاتورة → مخزون → طلب مورد → إقفال → أرباح)
// واللحظة البارزة: سند إقفال الكاشير مرسوم بالكود (ورق حراري، أرقام بعرض ثابت، حافة مثقّبة)
const STEPS = [
  { n: 1, Icon: FileText }, { n: 2, Icon: Boxes }, { n: 3, Icon: Send }, { n: 4, Icon: Calculator }, { n: 5, Icon: TrendingUp },
]
const SAR = '⃁'
const fmt = (v: number, lang: string) => v.toLocaleString(lang === 'ar' ? 'en-US' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ChainSection({ m }: { m: LandingState }) {
  const { t, lang } = m
  // مثال متسق: المبيعات = الشبكة + التطبيقات + النقد → الفرق صفر
  const sales = 4850, card = 3120, apps = 420, expected = sales - card - apps, counted = expected
  const rows: [string, number][] = [['rcptSales', sales], ['rcptCard', card], ['rcptApps', apps], ['rcptExpected', expected], ['rcptCounted', counted]]
  return (
    <section id="chain" className="st-section st-band" aria-labelledby="chain-title">
      <div className="lp-wrap st-chain-grid">
        <div>
          <h2 id="chain-title" className="st-h2">{t('chainTitle')}</h2>
          <p className="st-sub">{t('chainSub')}</p>
          <ol className="st-chain">
            {STEPS.map(({ n, Icon }) => (
              <li key={n}>
                <span className="st-chain-ic" aria-hidden><Icon size={18} strokeWidth={1.6} /></span>
                <div><b>{t(`chain${n}T`)}</b><p>{t(`chain${n}D`)}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <figure className="st-receipt-wrap">
          <div className="st-receipt" role="img" aria-label={`${t('rcptTitle')}: ${t('rcptOk')}`}>
            <div className="st-receipt-head">
              <b>{t('rcptTitle')}</b>
              <span>{t('rcptBranch')}</span>
            </div>
            <dl className="st-receipt-rows">
              {rows.map(([k, val]) => (
                <div key={k} className={k === 'rcptExpected' ? 'st-rule' : undefined}>
                  <dt>{t(k)}</dt><dd className="st-num">{fmt(val, lang)} <small>{SAR}</small></dd>
                </div>
              ))}
              <div className="st-total"><dt>{t('rcptDiff')}</dt><dd className="st-num">0.00 <small>{SAR}</small></dd></div>
            </dl>
            <p className="st-receipt-ok">{t('rcptOk')}</p>
          </div>
          <figcaption>{t('rcptNote')}</figcaption>
        </figure>
      </div>
    </section>
  )
}
