'use client'
import type { LandingState } from './useLanding'

// شريط الإعلانات (من لوحة الإدارة): سطر ثابت هادئ — أول رسالة فقط، بدون شريط متحرك
export default function AnnouncementBar({ m }: { m: LandingState }) {
  const { marqueeMsgs, hasMarquee } = m
  if (!hasMarquee) return null
  return (
    <div className="lp-marquee" role="note">
      <p className="st-announce">{marqueeMsgs[0]}</p>
    </div>
  )
}
