'use client'
import { ArrowLeft, Check } from 'lucide-react'
import type { LandingState } from './useLanding'
import { STARTING_PRICE } from '@/lib/planPricing'

// ابدأ اليوم: السعر المعلن + إزالة المخاطرة (تجربة بدون بطاقة، إلغاء، مساعدة) + ثلاث خطوات
export default function StartSection({ m }: { m: LandingState }) {
  const { t, lang, router } = m
  return (
    <section id="start" className="st-section" aria-labelledby="start-title">
      <div className="lp-wrap st-start">
        <div className="st-start-price">
          <h2 id="start-title" className="st-h2">{t('startTitle')}</h2>
          <p className="st-price"><span>{t('startFrom')}</span> <b className="st-num">{STARTING_PRICE}</b> <span>{lang === 'ar' ? '⃁' : 'SAR'}</span></p>
          <p className="st-sub">{t('startPer')}</p>
          <ul className="st-ticks st-ticks-col">
            {['startR1', 'startR2', 'startR3', 'startR4'].map(k => <li key={k}><Check size={16} aria-hidden />{t(k)}</li>)}
          </ul>
          <div className="st-actions">
            <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18} aria-hidden /></button>
            <a className="st-textlink" href="/pricing">{t('startPricing')}</a>
          </div>
        </div>
        <ol className="st-steps">
          {['startS1', 'startS2', 'startS3'].map((k, i) => (
            <li key={k}><span className="st-num">{i + 1}</span><p>{t(k)}</p></li>
          ))}
        </ol>
      </div>
    </section>
  )
}
