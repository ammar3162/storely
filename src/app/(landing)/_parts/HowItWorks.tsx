'use client'
import { PhoneVideo } from './constants'
import type { LandingState } from './useLanding'

export default function HowItWorks({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <>
      {/* كيف يشتغل */}
      <section id="how" className="lp-how">
        <div className="lp-wrap lp-split lp-split-rev">
          <div className="lp-copy rv">
            <span className="lp-tag lp-tag-light">{t('howTag')}</span>
            <h2 className="lp-h2" style={{color:'#fff'}}>{t('howTitle')}</h2>
            <ol className="lp-steps">
              {[1,2,3,4].map(n=>(
                <li key={n}>
                  <span className="lp-step-n">0{n}</span>
                  <div><b>{t(`how${n}T`)}</b><p>{t(`how${n}D`)}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lp-how-media rv">
            <PhoneVideo src="/videos/storely-features.mp4" poster="/videos/storely-features.jpg" label="مميزات Storely" lazy/>
          </div>
        </div>
      </section>
    </>
  )
}
