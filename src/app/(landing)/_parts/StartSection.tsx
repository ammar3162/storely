'use client'
import type { LandingState } from './useLanding'
import { STARTING_PRICE } from '@/lib/planPricing'

// ابدأ اليوم: بلاطة فاتحة — السعر المعلن (من جدول الأسعار نفسه) + إزالة المخاطرة + ثلاث خطوات
export default function StartSection({ m }: { m: LandingState }) {
  const { t, lang, router } = m
  return (
    <section id="start" className="ap-start" aria-labelledby="start-title">
      <h2 id="start-title" className="lp-h2">{t('startTitle')}</h2>
      <p className="ap-price"><span>{t('startFrom')}</span><b className="lp-num">{STARTING_PRICE}</b><span>{lang === 'ar' ? '⃁' : 'SAR'}</span></p>
      <p className="ap-per">{t('startPer')}</p>
      <ul className="ap-ticks">
        {['startR1', 'startR2', 'startR3', 'startR4'].map(k => <li key={k}><span className="ap-dot" aria-hidden="true" />{t(k)}</li>)}
      </ul>
      <div className="ap-acts">
        <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('heroStart')}</button>
        <a className="lp-btn lp-btn-line lp-btn-lg" href="/pricing">{t('startPricing')}</a>
      </div>
      <ol className="ap-steps">
        {['startS1', 'startS2', 'startS3'].map(k => <li key={k}>{t(k)}</li>)}
      </ol>
    </section>
  )
}
