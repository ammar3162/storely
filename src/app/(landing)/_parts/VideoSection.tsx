'use client'
import { useRef, useState } from 'react'
import { Play, Check, ArrowLeft } from 'lucide-react'
import type { LandingState } from './useLanding'

// قسم الفيديو: مشغّل واضح (صورة + زر تشغيل بالصوت) بدل الفيديو داخل إطار جوال، مع اختيار بين الفيديوهين
const VIDEOS = [
  { k: 'vid1', src: '/videos/storely-brand.mp4', poster: '/videos/storely-brand.jpg', sec: 24 },
  { k: 'vid2', src: '/videos/storely-brand-ad.mp4', poster: '/videos/storely-brand-ad.jpg', sec: 44 },
]

export default function VideoSection({ m }: { m: LandingState }) {
  const { t, router } = m
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const v = VIDEOS[i]
  function pick(n: number) { setI(n); setPlaying(false) }
  function play() { setPlaying(true); requestAnimationFrame(() => ref.current?.play().catch(() => {})) }
  return (
    <section id="video" className="lp-section lp-sand">
      <div className="lp-wrap lp-video-grid">
        <div className="rv">
          <span className="lp-tag">{t('vidTag')}</span>
          <h2 className="lp-h2">{t('vidTitle')}</h2>
          <p className="lp-body">{t('vidSub')}</p>
          <div className="lp-vid-list" role="tablist">
            {VIDEOS.map((x, n) => (
              <button key={x.k} role="tab" aria-selected={n === i} className={n === i ? 'on' : ''} onClick={() => pick(n)}>
                <img src={x.poster} alt="" loading="lazy" />
                <span><b>{t(x.k)}</b><small>{x.sec} {t('vidSec')}</small></span>
                {n === i && <Check size={16} />}
              </button>
            ))}
          </div>
          <button className="lp-btn lp-btn-dark lp-btn-lg" style={{ marginTop: 24 }} onClick={() => router.push('/login?mode=register')}>{t('heroStart')} <ArrowLeft size={18} /></button>
        </div>
        <div className="lp-player rv">
          {playing
            ? <video key={v.src} ref={ref} src={v.src} poster={v.poster} controls playsInline autoPlay aria-label={t(v.k)} />
            : <button className="lp-player-cover" onClick={play} aria-label={`${t('vidPlay')}: ${t(v.k)}`}>
                <img src={v.poster} alt="" loading="lazy" />
                <span className="lp-player-btn"><Play size={26} fill="currentColor" /></span>
                <span className="lp-player-len">{v.sec} {t('vidSec')}</span>
              </button>}
        </div>
      </div>
    </section>
  )
}
