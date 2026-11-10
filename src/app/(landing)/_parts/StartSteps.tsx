'use client'
import { UserPlus, PackagePlus, Smartphone, ArrowLeft } from 'lucide-react'
import type { LandingState } from './useLanding'

// «ابدأ خلال 3 خطوات» — يقلّل التردد قبل التسجيل
export default function StartSteps({ m }: { m: LandingState }) {
  const { t, router } = m
  const steps: [any, string, string][] = [[UserPlus, 'step1T', 'step1D'], [PackagePlus, 'step2T', 'step2D'], [Smartphone, 'step3T', 'step3D']]
  return (
    <section id="start" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-head rv">
          <span className="lp-tag">{t('stepsTag')}</span>
          <h2 className="lp-h2">{t('stepsTitle')}</h2>
        </div>
        <ol className="lp-start">
          {steps.map(([Icon, ti, d], n) => (
            <li key={ti} className="rv">
              <span className="lp-start-n">{n + 1}</span>
              <span className="lp-start-ic"><Icon size={22} /></span>
              <b>{t(ti)}</b>
              <p>{t(d)}</p>
            </li>
          ))}
        </ol>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18} /></button>
          <p className="lp-start-note">{t('heroBadge')}</p>
        </div>
      </div>
    </section>
  )
}
