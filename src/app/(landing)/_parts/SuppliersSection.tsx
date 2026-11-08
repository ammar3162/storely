'use client'
import { ArrowLeft } from 'lucide-react'
import type { LandingState } from './useLanding'

export default function SuppliersSection({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <>
      {/* الموردين */}
      <section className="lp-section">
        <div className="lp-wrap lp-split lp-split-rev">
          <figure className="lp-photo lp-photo-wide rv">
            <img src="/supplier-team.jpg" alt="مورد يسلّم طلبية لصاحب منشأة" width={1100} height={600} loading="lazy" decoding="async"/>
            <figcaption className="lp-chat">
              <div className="lp-bubble lp-bubble-out"><b>🟢 Storely</b><br/>طلب توريد: دقيق — 20 كيس</div>
              <div className="lp-bubble">تم — سيصلكم الطلب اليوم</div>
            </figcaption>
          </figure>
          <div className="lp-copy rv">
            <span className="lp-tag">{t('supTag')}</span>
            <h2 className="lp-h2">{t('supTitle')}</h2>
            <p className="lp-body">{t('supBody')}</p>
            <a href="#how" className="lp-link">{t('heroWatch')} <ArrowLeft size={16}/></a>
          </div>
        </div>
      </section>
    </>
  )
}
