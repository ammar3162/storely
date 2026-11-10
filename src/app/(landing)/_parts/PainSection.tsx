'use client'
import { Banknote, PackageX, Receipt, Clock, ArrowLeft } from 'lucide-react'
import type { LandingState } from './useLanding'

// المشكلة ← الحل: بلغة صاحب المطعم والمقهى
export default function PainSection({ m }: { m: LandingState }) {
  const { t } = m
  const items: [any, string, string][] = [[Banknote, 'pain1Q', 'pain1A'], [PackageX, 'pain2Q', 'pain2A'], [Receipt, 'pain3Q', 'pain3A'], [Clock, 'pain4Q', 'pain4A']]
  return (
    <section id="why" className="lp-section lp-pain">
      <div className="lp-wrap">
        <div className="lp-head rv">
          <span className="lp-tag">{t('painTag')}</span>
          <h2 className="lp-h2">{t('painTitle')}</h2>
          <p className="lp-body">{t('painSub')}</p>
        </div>
        <div className="lp-pain-grid">
          {items.map(([Icon, q, a]) => (
            <article key={q} className="lp-pain-card rv">
              <span className="lp-pain-ic"><Icon size={20} /></span>
              <div className="lp-pain-q"><small>{t('painBefore')}</small><p>{t(q)}</p></div>
              <ArrowLeft size={16} className="lp-pain-arrow" />
              <div className="lp-pain-a"><small>{t('painAfter')}</small><p>{t(a)}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
