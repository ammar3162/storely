'use client'
import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import type { LandingState } from './useLanding'

// الواجهة بأسلوب أبل: الشعار عنواناً، جملة واحدة، زران، ثم فيديو «من هي ستورلي» في الوسط
// وبجانبه شاشتان حقيقيتان (المالك والموظف). التشغيل داخل نفس الضغطة حتى يشتغل الصوت على الآيفون.
const VIDEOS = [
  { k: 'heroVid1', src: '/videos/storely-brand.mp4', poster: '/videos/storely-brand.jpg', sec: 24 },
  { k: 'heroVid2', src: '/videos/storely-brand-ad.mp4', poster: '/videos/storely-brand-ad.jpg', sec: 44 },
]

export default function Hero({ m }: { m: LandingState }) {
  const { router, t } = m
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const v = VIDEOS[i]
  const other = VIDEOS[1 - i]

  const play = () => {
    ref.current?.play().catch(() => {})
    setPlaying(true)
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const watch = () => play()
  const switchVideo = () => { setI(1 - i); setPlaying(false) }

  return (
    <header id="top" className="ap-hero">
      <h1>{t('heroTitleA')} {t('heroTitleB')} {t('heroTitleC')}</h1>
      <p className="ap-lead">{t('heroLine')}</p>
      <div className="ap-acts">
        <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => router.push('/login?mode=register')}>{t('navStart')}</button>
        <button className="lp-btn lp-btn-line lp-btn-lg" onClick={watch}><Play size={16} fill="currentColor" aria-hidden />{t('heroVideo')}</button>
      </div>
      <p className="ap-note">{t('heroNote')}</p>
      <button className="ap-alt" onClick={switchVideo}>{t('heroOr')} {t(other.k)} ({other.sec} {t('heroSecLong')})</button>

      <div className={`ap-stage${playing ? ' is-playing' : ''}`}>
        <div className="ap-side ap-side-r" aria-hidden="true"><img src="/landing/dash2.webp" alt="" width={720} height={1559} /></div>
        <div className="ap-side ap-side-l" aria-hidden="true"><img src="/landing/staff-home.webp" alt="" width={720} height={1440} /></div>
        <div className="ap-video">
          <video key={v.src} ref={ref} src={v.src} poster={v.poster} preload="none" controls={playing} playsInline aria-label={t(v.k)} />
          {!playing && (
            <button className="ap-cover" onClick={play} aria-label={`${t('heroPlay')}: ${t(v.k)}`}>
              <img src={v.poster} alt="" width={540} height={960} />
              <span className="ap-play"><Play size={28} fill="currentColor" aria-hidden /></span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
