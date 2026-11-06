'use client'
import { FAQ_ITEMS } from '../landing-data'
import { FaqItem } from '../landing-components'
import type { LandingState } from './useLanding'

export default function FaqSection({ m }: { m: LandingState }) {
  const { lang, t } = m
  return (
    <>
      {/* الأسئلة */}
      <section id="faq" className="lp-section">
        <div className="lp-wrap" style={{maxWidth:760}}>
          <div className="lp-head rv">
            <span className="lp-tag">{t('faqTag')}</span>
            <h2 className="lp-h2">{t('faqTitle')}</h2>
          </div>
          <div className="lp-faq rv">
            {FAQ_ITEMS.map((f,i)=><FaqItem key={i} q={lang==='ar'?f.q:f.qEn} a={lang==='ar'?f.a:f.aEn}/>)}
          </div>
        </div>
      </section>
    </>
  )
}
