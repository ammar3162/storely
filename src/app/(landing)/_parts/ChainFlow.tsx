'use client'
import type { LandingState } from './useLanding'

// كيف يترابط: خمس حلقات مرقّمة (فاتورة ← مخزون ← طلب مورد ← إقفال ← ربح) يتعبّى الخط بينها مع التمرير،
// والنتيجة شاشة الربحية الحقيقية للمالك في إطار شاشة تكبر عند الوصول إليها.
export default function ChainFlow({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="chain" className="ap-chain" aria-labelledby="chain-title">
      <div className="lp-wrap">
        <div className="lp-head rv">
          <h2 id="chain-title" className="lp-h2">{t('chainTitle')}</h2>
          <p className="lp-sub">{t('chainSub')}</p>
        </div>
        <ol className="ap-flow" data-fx="chain">
          {[1, 2, 3, 4, 5].map(n => (
            <li key={n}><i className="lp-num" aria-hidden="true">{n}</i><b>{t(`chain${n}T`)}</b><span>{t(`chain${n}D`)}</span></li>
          ))}
        </ol>
        <figure>
          <div className="ap-desk" data-fx="zoom"><div className="ap-desk-screen"><img src="/landing/profit-desktop.webp" alt={t('chainShotAlt')} width={1920} height={1080} loading="lazy" decoding="async" /></div></div>
          <figcaption className="ap-cap">{t('chainShotCap')}</figcaption>
        </figure>
      </div>
    </section>
  )
}
