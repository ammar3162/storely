'use client'
import type { LandingState } from './useLanding'

export default function AnnouncementBar({ m }: { m: LandingState }) {
  const { marqueeMsgs, hasMarquee } = m
  return (
    <>
      {/* شريط الإعلانات */}
      {hasMarquee && (
        <div className="lp-marquee">
          <div className="lp-marquee-track">
            {[...Array(2)].map((_,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center'}}>
                {marqueeMsgs.map((m,j)=><span key={j} className="lp-marquee-item">{m}<span style={{opacity:.5}}>•</span></span>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
