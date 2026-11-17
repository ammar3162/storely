'use client'
import Phone from './Phone'
import type { LandingState } from './useLanding'

// لكل شخص شاشته — بأسلوب «قارن الطرازات» في أبل: عمود لكل دور، شاشته الحقيقية، وثلاث نقاط.
// على الجوال تتحول الأعمدة إلى سحب جانبي.
const ROLES = [
  { label: 'roleOwner', points: ['ro1', 'ro2', 'ro3'], img: 'dash2', h: 1559 },
  { label: 'roleManager', points: ['rm1', 'rm2', 'rm3'], img: 'att2', h: 1559 },
  { label: 'roleStaff', points: ['rs1', 'rs2', 'rs3'], img: 'sdisp', h: 1559 },
  { label: 'roleAcc', points: ['ra1', 'ra2', 'ra3'], img: 'acc_m_pur', h: 1559 },
]

export default function RolesSection({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="roles" className="lp-section" aria-labelledby="roles-title">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="roles-title" className="lp-h2">{t('rolesTitle')}</h2>
          <p className="lp-sub">{t('rolesSub')}</p>
        </div>
        <div className="ap-roles">
          {ROLES.map(r => (
            <article key={r.label} className="ap-role">
              <h3>{t(r.label)}</h3>
              <ul>
                {r.points.map(p => <li key={p}><span className="ap-dot" aria-hidden="true" />{t(p)}</li>)}
              </ul>
              <div className="ap-shot rv ap-rise"><Phone src={`/landing/${r.img}.webp`} alt={`${t('rolesShotAlt')} ${t(r.label)}`} h={r.h} /></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
