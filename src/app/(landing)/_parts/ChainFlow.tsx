'use client'
import type { LandingState } from './useLanding'

// كيف يترابط: خمس حلقات (فاتورة ← مخزون ← طلب مورد ← إقفال ← ربح) تربطها نقطة الشعار،
// والنتيجة شاشة الربحية الحقيقية للمالك على الكمبيوتر.
export default function ChainFlow({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="chain" className="ap-chain" aria-labelledby="chain-title">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="chain-title" className="lp-h2">{t('chainTitle')}</h2>
          <p className="lp-sub">{t('chainSub')}</p>
        </div>
        <ol className="ap-flow rv">
          {[1, 2, 3, 4, 5].map(n => (
            <li key={n} style={{ ['--i' as string]: n - 1 }}><b>{t(`chain${n}T`)}</b><span>{t(`chain${n}D`)}</span></li>
          ))}
        </ol>
        <figure>
          <div className="ap-desk rv ap-rise"><div className="ap-desk-screen"><img src="/landing/profit-desktop.webp" alt={t('chainShotAlt')} width={1920} height={1080} loading="lazy" decoding="async" /></div></div>
          <figcaption className="ap-cap">{t('chainShotCap')}</figcaption>
        </figure>
      </div>
    </section>
  )
}
