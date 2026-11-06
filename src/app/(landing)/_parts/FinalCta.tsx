'use client'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import type { LandingState } from './useLanding'

export default function FinalCta({ m }: { m: LandingState }) {
  const { router, t } = m
  return (
    <>
      {/* الدعوة الأخيرة */}
      <section className="lp-wrap">
        <div className="lp-cta rv">
          <h2>{t('ctaTitle')}</h2>
          <p>{t('ctaSub')}</p>
          <div className="lp-cta-row" style={{justifyContent:'center'}}>
            <button className="lp-btn lp-btn-white lp-btn-lg" onClick={()=>router.push('/login?mode=register')}>{t('ctaRegister')} <ArrowLeft size={18}/></button>
            <a className="lp-btn lp-btn-glass lp-btn-lg" href="https://wa.me/966594351667" target="_blank" rel="noreferrer"><MessageCircle size={18}/>{t('ctaContact')}</a>
          </div>
        </div>
      </section>
    </>
  )
}
