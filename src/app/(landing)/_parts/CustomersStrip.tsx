'use client'
import type { LandingState } from './useLanding'

type Partner = { id: string; name: string; logo_url: string }

// شعارات العملاء الحقيقيين (من لوحة الإدارة «الشركاء») — سطر هادئ تحت الواجهة، بدون أرقام أو ادعاءات
export default function CustomersStrip({ m }: { m: LandingState }) {
  const { partners, t } = m
  if (!partners.length) return null
  return (
    <section className="ap-cust" aria-labelledby="customers-title">
      <div className="lp-wrap">
        <h2 id="customers-title">{t('custTitle')}</h2>
        <ul className="ap-logos">
          {(partners as Partner[]).map(p => (
            <li key={p.id}>
              <img src={p.logo_url} alt="" width={64} height={64} loading="lazy" decoding="async" />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
