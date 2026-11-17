'use client'
import type { LandingState } from './useLanding'

// شريط الإعلان (من لوحة الإدارة): سطر هادئ فوق القائمة مثل أبل — أول رسالة فقط، بدون رموز تعبيرية
export default function AnnouncementBar({ m }: { m: LandingState }) {
  const { marqueeMsgs, hasMarquee } = m
  if (!hasMarquee) return null
  return (
    <div className="lp-ribbon" role="note">
      <p>{marqueeMsgs[0]}</p>
    </div>
  )
}
