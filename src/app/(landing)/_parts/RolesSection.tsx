'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import type { LandingState } from './useLanding'

// الأدوار: لكل شخص شاشته — تبويب لكل دور، ثلاث نقاط حقيقية، ومعاينة مبنية بالكود من شاشات النظام (بيانات توضيحية)
type Role = 'owner' | 'manager' | 'staff' | 'acc'
const ROLES: { k: Role; label: string; points: string[] }[] = [
  { k: 'owner', label: 'roleOwner', points: ['ro1', 'ro2', 'ro3'] },
  { k: 'manager', label: 'roleManager', points: ['rm1', 'rm2', 'rm3'] },
  { k: 'staff', label: 'roleStaff', points: ['rs1', 'rs2', 'rs3'] },
  { k: 'acc', label: 'roleAcc', points: ['ra1', 'ra2', 'ra3'] },
]
const SAR = '⃁'

function Preview({ role, t }: { role: Role; t: (k: string) => string }) {
  if (role === 'owner') return (
    <div className="st-pv st-pv-wa">
      <p className="st-pv-title">{t('pvMorning')}</p>
      <dl className="st-pv-list">
        <div><dt>{t('pvSalesY')}</dt><dd className="st-num">4,850 <small>{SAR}</small></dd></div>
        <div><dt>{t('pvReorder')}</dt><dd className="st-num">3</dd></div>
        <div><dt>{t('pvPresent')}</dt><dd className="st-num">4 / 4</dd></div>
      </dl>
      <span className="st-pv-time st-num">7:00</span>
    </div>
  )
  if (role === 'manager') return (
    <div className="st-pv">
      <div className="st-pv-item"><div><b>{t('pvLeave')}</b><span>{t('pvPending')}</span></div><span className="st-num">9:12</span></div>
      <div className="st-pv-item"><div><b>{t('pvTransfer')}</b><span>{t('pvMilk')}</span></div><span className="st-num">12</span></div>
    </div>
  )
  if (role === 'staff') return (
    <div className="st-pv">
      {[['pvMilk', 18], ['pvCups', 240], ['pvBeans', 6]].map(([k, q]) => (
        <div key={k as string} className="st-pv-item"><div><b>{t(k as string)}</b><span className="st-num">{q as number}</span></div><span className="st-pv-btn">{t('pvUse')}</span></div>
      ))}
    </div>
  )
  return (
    <div className="st-pv">
      <p className="st-pv-title">{t('pvVat')}</p>
      <dl className="st-pv-list">
        <div><dt>{t('pvVatOut')}</dt><dd className="st-num">18,240.00 <small>{SAR}</small></dd></div>
        <div><dt>{t('pvVatIn')}</dt><dd className="st-num">9,315.00 <small>{SAR}</small></dd></div>
        <div className="st-total"><dt>{t('pvVatNet')}</dt><dd className="st-num">8,925.00 <small>{SAR}</small></dd></div>
      </dl>
    </div>
  )
}

export default function RolesSection({ m }: { m: LandingState }) {
  const { t } = m
  const [role, setRole] = useState<Role>('owner')
  const cur = ROLES.find(r => r.k === role)!
  return (
    <section id="roles" className="st-section" aria-labelledby="roles-title">
      <div className="lp-wrap">
        <div className="st-head">
          <h2 id="roles-title" className="st-h2">{t('rolesTitle')}</h2>
        </div>
        <div className="st-roles">
          <div className="st-role-tabs" role="tablist" aria-label={t('rolesTitle')}>
            {ROLES.map(r => (
              <button key={r.k} role="tab" id={`tab-${r.k}`} aria-selected={r.k === role} aria-controls="role-panel" className={r.k === role ? 'on' : ''} onClick={() => setRole(r.k)}>{t(r.label)}</button>
            ))}
          </div>
          <div id="role-panel" role="tabpanel" aria-labelledby={`tab-${role}`} className="st-role-panel">
            <ul className="st-role-points">
              {cur.points.map(p => <li key={p}><Check size={16} aria-hidden />{t(p)}</li>)}
            </ul>
            <Preview role={role} t={t} />
          </div>
        </div>
      </div>
    </section>
  )
}
