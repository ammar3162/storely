'use client'
import { FAQ_ITEMS } from '../landing-data'
import FaqItem from './FaqItem'
import type { LandingState } from './useLanding'

// الأسئلة (مشتركة مع صفحة الأسعار) — العنوان من LP_CSS حتى يظهر بنفس الشكل في الصفحتين
export default function FaqSection({ m }: { m: LandingState }) {
  const { lang, t } = m
  return (
    <section id="faq" className="lp-section" aria-labelledby="faq-title">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="faq-title" className="lp-h2">{t('faqTitle')}</h2>
        </div>
        <div className="lp-faq">
          {FAQ_ITEMS.map((f, i) => <FaqItem key={i} q={lang === 'ar' ? f.q : f.qEn} a={lang === 'ar' ? f.a : f.aEn} />)}
        </div>
      </div>
    </section>
  )
}
