'use client'
import { Users, PackageMinus, BadgeCheck, TrendingUp } from 'lucide-react'
import type { LandingState } from './useLanding'

// صورة الواجهة: شاشة Storely مبنية بالكود (خفيفة وواضحة) + ثلاث إشعارات تنزل بالتتابع — نفس قصة الإعلان
export default function HeroMock({ m }: { m: LandingState }) {
  const { t, lang } = m
  const cur = lang === 'ar' ? '⃁' : 'SAR'
  const notes: [any, string, string, string][] = [
    [Users, 'n1T', 'n1D', '7:58'],
    [PackageMinus, 'n2T', 'n2D', '1:20'],
    [BadgeCheck, 'n3T', 'n3D', '11:45'],
  ]
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock-app">
        <div className="lp-mock-top">
          <span className="lp-mock-logo">S</span>
          <div><b>{t('mockHello')}</b><small>{t('mockToday')}</small></div>
        </div>
        <div className="lp-mock-kpis">
          <div><small>{t('mockSales')}</small><b dir="ltr">4,850 <i>{cur}</i></b><em><TrendingUp size={12} /> 8%</em></div>
          <div><small>{t('mockLow')}</small><b className="warn">3</b></div>
          <div><small>{t('mockStaff')}</small><b>4/4</b></div>
        </div>
        <div className="lp-mock-bars">
          {[38, 52, 46, 70, 58, 82, 64].map((h, i) => <span key={i} style={{ height: `${h}%` }} className={i === 5 ? 'on' : ''} />)}
        </div>
      </div>
      <ul className="lp-mock-notes">
        {notes.map(([Icon, tk, dk, time], i) => (
          <li key={tk} style={{ animationDelay: `${0.5 + i * 0.9}s` }}>
            <span className={`ic ic${i}`}><Icon size={18} /></span>
            <div><b>{t(tk)}</b><small>{t(dk)}</small></div>
            <time dir="ltr">{time}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}
