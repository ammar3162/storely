'use client'
import type { LandingState } from './useLanding'

// الدعوة الأخيرة: بلاطة كحلية كاملة (مشتركة مع صفحة الأسعار)
export default function FinalCta({ m }: { m: LandingState }) {
  const { router, t } = m
  return (
    <section className="lp-cta" aria-labelledby="cta-title">
      <h2 id="cta-title">{t('ctaTitle')}</h2>
      <p>{t('ctaSub')}</p>
      <div className="lp-cta-row">
        <button className="lp-btn lp-btn-white lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('ctaRegister')}</button>
        <a className="lp-btn lp-btn-glass lp-btn-lg" href="https://wa.me/966594351667" target="_blank" rel="noreferrer">{t('ctaContact')}</a>
      </div>
    </section>
  )
}
