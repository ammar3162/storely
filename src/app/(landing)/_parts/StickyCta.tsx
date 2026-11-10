'use client'
import { useEffect, useState } from 'react'
import type { LandingState } from './useLanding'

// زر ثابت أسفل الشاشة على الجوال (بعد تجاوز الواجهة) — التسجيل دائماً على بعد ضغطة
export default function StickyCta({ m }: { m: LandingState }) {
  const { t, router } = m
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > 640)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div className={`lp-sticky${show ? ' on' : ''}`} aria-hidden={!show}>
      <button className="lp-btn lp-btn-dark" tabIndex={show ? 0 : -1} onClick={() => router.push('/login?mode=register')}>{t('stickyCta')}</button>
    </div>
  )
}
