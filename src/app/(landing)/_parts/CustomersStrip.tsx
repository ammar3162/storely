'use client'
import type { LandingState } from './useLanding'

type Partner = { id: string; name: string; logo_url: string }

// شعارات العملاء الحقيقيين (من لوحة الإدارة «الشركاء») — هادئة، بدون أرقام أو ادعاءات
export default function CustomersStrip({ m }: { m: LandingState }) {
  const { partners, t } = m
  if (!partners.length) return null
  return (
    <section className="st-customers" aria-labelledby="customers-title">
      <div className="lp-wrap">
        <h2 id="customers-title" className="st-small-title">{t('custTitle')}</h2>
        <ul className="st-logo-row">
          {(partners as Partner[]).map(p => (
            <li key={p.id}>
              <span className="st-logo"><img src={p.logo_url} alt={p.name} loading="lazy" decoding="async" /></span>
              <span className="st-logo-name">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
