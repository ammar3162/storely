'use client'
import type { LandingState } from './useLanding'

// يوم واحد في مطعمك: خمس لحظات على خط الوقت — المشكلة اليوم، وما يتغيّر مع ستورلي (إطار الخسارة ثم الحل)
const MOMENTS = [1, 2, 3, 4, 5]

export default function DaySection({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="day" className="st-section" aria-labelledby="day-title">
      <div className="lp-wrap">
        <div className="st-head">
          <h2 id="day-title" className="st-h2">{t('dayTitle')}</h2>
          <p className="st-sub">{t('daySub')}</p>
        </div>
        <ol className="st-day">
          {MOMENTS.map(n => (
            <li key={n} className="st-day-row">
              <span className="st-day-time st-num">{t(`day${n}T`)}</span>
              <div className="st-day-was">
                <span className="st-day-label">{t('dayWithout')}</span>
                <p>{t(`day${n}P`)}</p>
              </div>
              <div className="st-day-now">
                <span className="st-day-label">{t('dayWith')}</span>
                <p>{t(`day${n}S`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
