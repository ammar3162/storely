'use client'
import { Users, PackageMinus, BadgeCheck } from 'lucide-react'
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
          {/* يومك مع Storely: الصباح ← الظهر ← نهاية اليوم */}
          <div className="lp-how-media rv">
            <ol className="lp-day">
              {([[Users, 'dayMorning', 'n1T', 'n1D'], [PackageMinus, 'dayNoon', 'n2T', 'n2D'], [BadgeCheck, 'dayNight', 'n3T', 'n3D']] as [any, string, string, string][]).map(([Icon, when, ti, d]) => (
                <li key={when}>
                  <span className="lp-day-when">{t(when)}</span>
                  <div className="lp-day-card"><span className="lp-day-ic"><Icon size={18}/></span><div><b>{t(ti)}</b><small>{t(d)}</small></div></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  )
}
