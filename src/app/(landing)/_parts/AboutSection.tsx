'use client'
import type { LandingState } from './useLanding'

// من نحن: بلاطة كحلية — المنشأة والفكرة من الخبرة الميدانية ودراسة يوم التشغيل، ثم أربعة مبادئ.
// بدون أرقام أو أسماء غير مؤكدة (اسم المؤسسة الرسمي في التذييل).
const PRINCIPLES = [1, 2, 3, 4]

export default function AboutSection({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="about" className="ap-about" aria-labelledby="about-title">
      <div className="lp-wrap">
        <div className="ap-about-body rv">
          <h2 id="about-title" className="lp-h2">{t('aboutTitle')}</h2>
          <p>{t('aboutBody1')}</p>
          <p>{t('aboutBody2')}</p>
        </div>
        <dl className="ap-principles">
          {PRINCIPLES.map(n => (
            <div key={n} className="rv"><dt>{t(`aboutP${n}`)}</dt><dd>{t(`aboutP${n}D`)}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  )
}
