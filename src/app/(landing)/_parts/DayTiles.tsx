'use client'
import Phone from './Phone'
import type { LandingState } from './useLanding'

// يوم واحد في مطعمك بأسلوب بلاطات أبل: لكل لحظة بلاطة (أسود / رمادي أبل الفاتح بالتناوب)
// وعنوان النتيجة، وسطر الآلية، وشاشة حقيقية من ستورلي تطلع من أسفل البلاطة.
// الترتيب نفسه ترتيب السلسلة: مخزون الصباح ← طلب المورد ← فاتورة الشراء ← إقفال الكاشير ← الرواتب ← الربح.
type Tile = { n: number; img: string; h: number; tone: 'dark' | 'light'; wide?: boolean }
const TILES: Tile[] = [
  { n: 1, img: 'inv', h: 1559, tone: 'dark', wide: true },
  { n: 2, img: 'notif_coffee', h: 1559, tone: 'light' },
  { n: 3, img: 'pur_draft', h: 1559, tone: 'dark' },
  { n: 4, img: 'closing', h: 1440, tone: 'light', wide: true },
  { n: 5, img: 'ssal', h: 1559, tone: 'dark' },
  { n: 6, img: 'profit', h: 1559, tone: 'light' },
]

export default function DayTiles({ m }: { m: LandingState }) {
  const { t } = m
  return (
    <section id="day" aria-labelledby="day-title">
      <div className="ap-intro rv">
        <h2 id="day-title" className="lp-h2">{t('dayTitle')}</h2>
        <p className="lp-sub">{t('daySub')}</p>
      </div>
      <div className="ap-grid">
        {TILES.map(x => (
          <article key={x.n} className={`ap-tile ${x.tone === 'dark' ? 'ap-dark' : 'ap-light'}${x.wide ? ' ap-wide' : ''}`}>
            <div className="ap-txt rv">
              <span className="ap-time">{t(`day${x.n}T`)}</span>
              <h3>{t(`day${x.n}H`)}</h3>
              <p>{t(`day${x.n}S`)}</p>
            </div>
            <div className="ap-shot" data-fx="rise"><Phone src={`/landing/${x.img}.webp`} alt={t(`day${x.n}Alt`)} h={x.h} /></div>
          </article>
        ))}
      </div>
    </section>
  )
}
