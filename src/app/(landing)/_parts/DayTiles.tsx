'use client'
import type { LandingState } from './useLanding'

// يوم واحد في مطعمك بأسلوب بلاطات أبل: لكل لحظة بلاطة (كحلي / رمادي النظام الفاتح بالتناوب)
// وعنوان النتيجة، وسطر الآلية، وشاشة حقيقية من ستورلي تطلع من أسفل البلاطة.
// الترتيب نفسه ترتيب السلسلة: مخزون الصباح ← طلب المورد ← فاتورة الشراء ← إقفال الكاشير ← الرواتب ← الربح.
type Tile = { n: number; img: string; h: number; tone: 'navy' | 'light'; wide?: boolean }
const TILES: Tile[] = [
  { n: 1, img: 'inv', h: 1559, tone: 'navy', wide: true },
  { n: 2, img: 'notif_coffee', h: 1559, tone: 'light' },
  { n: 3, img: 'pur_draft', h: 1559, tone: 'navy' },
  { n: 4, img: 'closing', h: 1440, tone: 'light', wide: true },
  { n: 5, img: 'ssal', h: 1559, tone: 'navy' },
  { n: 6, img: 'profit', h: 1559, tone: 'light' },
]

export default function DayTiles({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="day" aria-labelledby="day-title">
      <div className="ap-intro">
        <h2 id="day-title" className="lp-h2">{t('dayTitle')}</h2>
        <p className="lp-sub">{t('daySub')}</p>
      </div>
      <div className="ap-grid">
        {TILES.map(x => (
          <article key={x.n} className={`ap-tile ${x.tone === 'navy' ? 'ap-navy' : 'ap-light'}${x.wide ? ' ap-wide' : ''}`}>
            <div className="ap-txt">
              <span className="ap-time"><span className="ap-dot" aria-hidden="true" />{t(`day${x.n}T`)}</span>
              <h3>{t(`day${x.n}H`)}</h3>
              <p>{t(`day${x.n}S`)}</p>
            </div>
            <div className="ap-shot"><img src={`/landing/${x.img}.webp`} alt={t(`day${x.n}Alt`)} width={720} height={x.h} loading="lazy" decoding="async" /></div>
          </article>
        ))}
      </div>
    </section>
  )
}
