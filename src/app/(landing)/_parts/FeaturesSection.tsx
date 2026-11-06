'use client'
import { FEATURES } from '../landing-data'
import { FEATURE_TONES } from './constants'
import type { LandingState } from './useLanding'

export default function FeaturesSection({ m }: { m: LandingState }) {
  const { lang, t } = m
  return (
    <>
      {/* المميزات */}
      <section id="features" className="lp-section lp-sand">
        <div className="lp-wrap">
          <div className="lp-head rv">
            <span className="lp-tag">{t('featuresTag')}</span>
            <h2 className="lp-h2">{t('featuresTitle')}</h2>
          </div>
          <div className="lp-feats">
            {FEATURES.map((f,i)=>{
              const [fg,bg] = FEATURE_TONES[i % FEATURE_TONES.length]
              return (
                <article key={i} className="lp-feat rv" style={{'--fg':fg,'--bg':bg} as React.CSSProperties}>
                  <span className="lp-feat-ic"><f.icon size={22} strokeWidth={2}/></span>
                  <h3>{lang==='ar'?f.title:(f as any).titleEn}{(f as any).badge && <em>{lang==='ar'?(f as any).badge:(f as any).badgeEn}</em>}</h3>
                  <p>{lang==='ar'?f.desc:(f as any).descEn}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
