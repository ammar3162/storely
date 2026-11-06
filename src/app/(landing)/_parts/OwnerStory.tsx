'use client'
import { Check } from 'lucide-react'
import type { LandingState } from './useLanding'

export default function OwnerStory({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <>
      {/* القصة — صاحب المنشأة */}
      <section className="lp-section">
        <div className="lp-wrap lp-split">
          <figure className="lp-photo rv">
            <img src="/storely-team.jpg" alt="صاحب منشأة يتابع Storely من اللابتوب" width={1100} height={635} loading="lazy" decoding="async"/>
            <figcaption className="lp-note">
              <span className="lp-note-ic">☀️</span>
              <div><b>صباح الخير</b><small>3 أصناف تحتاج إعادة طلب اليوم</small></div>
            </figcaption>
          </figure>
          <div className="lp-copy rv">
            <span className="lp-tag">{t('storyTag')}</span>
            <h2 className="lp-h2">{t('storyTitle')}</h2>
            <p className="lp-body">{t('storyBody')}</p>
            <ul className="lp-list">
              {['storyP1','storyP2','storyP3'].map(k=><li key={k}><span><Check size={14}/></span>{t(k)}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
