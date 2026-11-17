'use client'
import type { LandingState } from './useLanding'

// من نحن: المنشأة، والفكرة من الخبرة الميدانية ودراسة يوم التشغيل — بدون أرقام أو أسماء غير مؤكدة
const PRINCIPLES = [1, 2, 3, 4]

export default function AboutSection({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="about" className="st-section st-band" aria-labelledby="about-title">
      <div className="lp-wrap st-about">
        <div className="st-about-text">
          <h2 id="about-title" className="st-h2">{t('aboutTitle')}</h2>
          <p>{t('aboutBody1')}</p>
          <p>{t('aboutBody2')}</p>
        </div>
        <dl className="st-principles">
          {PRINCIPLES.map(n => (
            <div key={n}><dt>{t(`aboutP${n}`)}</dt><dd>{t(`aboutP${n}D`)}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  )
}
