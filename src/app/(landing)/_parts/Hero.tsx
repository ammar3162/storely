'use client'
import { useRef, useState } from 'react'
import { ArrowLeft, Check, Play } from 'lucide-react'
import type { LandingState } from './useLanding'

// الواجهة: الشعار عنواناً، جملة واحدة تقول وش يسوي النظام، زر واحد رئيسي، والفيديو «من هي ستورلي» بجانبها.
// الفيديو يبدأ بصورة وزر تشغيل بالصوت (ما يحمّل إلا عند الضغط)، مع جولة المزايا كخيار ثاني.
const VIDEOS = [
  { k: 'heroVid1', src: '/videos/storely-brand.mp4', poster: '/videos/storely-brand.jpg', sec: 24 },
  { k: 'heroVid2', src: '/videos/storely-brand-ad.mp4', poster: '/videos/storely-brand-ad.jpg', sec: 44 },
]

export default function Hero({ m }: { m: LandingState }) {
  const { router, top, t } = m
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const v = VIDEOS[i]
  const pick = (n: number) => { setI(n); setPlaying(false) }
  const play = () => { setPlaying(true); requestAnimationFrame(() => ref.current?.play().catch(() => {})) }

  return (
    <header id="top" className="st-hero" style={{ paddingTop: top + 104 }}>
      <div className="lp-wrap st-hero-grid">
        <div className="st-hero-text">
          <h1 className="st-display">{t('heroTitleA')} {t('heroTitleB')} {t('heroTitleC')}</h1>
          <p className="st-lead">{t('heroLine')}</p>
          <div className="st-actions">
            <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18} aria-hidden /></button>
            <a className="st-textlink" href="#demo">{t('navDemo')}</a>
          </div>
          <ul className="st-ticks">
            {['heroP1', 'heroP3'].map(k => <li key={k}><Check size={16} aria-hidden />{t(k)}</li>)}
          </ul>
        </div>

        <div id="video" className="st-hero-media">
          <div className="st-player">
            {playing
              ? <video key={v.src} ref={ref} src={v.src} poster={v.poster} controls playsInline autoPlay aria-label={t(v.k)} />
              : <button className="st-player-cover" onClick={play} aria-label={`${t('heroPlay')}: ${t(v.k)}`}>
                  <img src={v.poster} alt="" width={540} height={960} />
                  <span className="st-player-btn"><Play size={24} fill="currentColor" aria-hidden /></span>
                </button>}
          </div>
          <div className="st-vid-tabs" role="tablist" aria-label={t('heroVid1')}>
            {VIDEOS.map((x, n) => (
              <button key={x.k} role="tab" aria-selected={n === i} className={n === i ? 'on' : ''} onClick={() => pick(n)}>
                <span>{t(x.k)}</span><span className="st-num">{x.sec} {t('heroSecShort')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
