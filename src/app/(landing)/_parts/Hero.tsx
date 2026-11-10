'use client'
import { Check, ArrowLeft, Play } from 'lucide-react'
import HeroMock from './HeroMock'
import type { LandingState } from './useLanding'
import { STARTING_PRICE as CUSTOM_MIN_MONTHLY } from '@/lib/planPricing'  // «يبدأ من»: أرخص ميزة لكل فرع

export default function Hero({ m }: { m: LandingState }) {
  const { partners, lang, router, top, t } = m
  return (
    <>
      {/* الواجهة */}
      <header id="top" className="lp-hero" style={{paddingTop:top+120}}>
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <div className="lp-pill"><span className="lp-dot"/>{t('heroBadge')}</div>
            <h1 className="lp-display">
              {t('heroTitleA')}<br/>{t('heroTitleB')} <em>{t('heroTitleC')}</em>
            </h1>
            <p className="lp-lead">{t('heroSub')}</p>
            <div className="lp-cta-row">
              <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={()=>router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18}/></button>
              <a className="lp-btn lp-btn-soft lp-btn-lg" href="#video"><span className="lp-play"><Play size={12} fill="currentColor"/></span>{t('heroVideo')}</a>
            </div>
            <ul className="lp-ticks">
              {['heroP1','heroP2','heroP3'].map(k=><li key={k}><Check size={16}/>{t(k)}</li>)}
            </ul>
          </div>

          <div className="lp-hero-media">
            <HeroMock m={m}/>
          </div>
        </div>

        {partners.length > 0 && (
          <div className="lp-wrap lp-partners">
            <p>{t('trustedBy')}</p>
            <ul className="lp-partner-grid">
              {partners.map((p:any)=>(
                <li key={p.id} className="lp-partner">
                  <span className="lp-partner-logo"><img src={p.logo_url} alt={p.name} loading="lazy" decoding="async"/></span>
                  <span className="lp-partner-name">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="lp-wrap">
          <div className="lp-stats">
            {[[CUSTOM_MIN_MONTHLY+' '+(lang==='ar'?'⃁':'SAR'),t('statStart')],['14 '+(lang==='ar'?'يوماً':'days'),t('statFree')],['7',t('statLangs')],['24/7',t('statAlerts')]].map(([n,l])=>(
              <div key={l}><strong>{n}</strong><span>{l}</span></div>
            ))}
          </div>
        </div>
      </header>
    </>
  )
}
