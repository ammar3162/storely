'use client'
import { useEffect, useRef, useState } from 'react'
import { colors, font } from '@/lib/ds'

export default function PullToRefresh() {
  const [pulling, setPulling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const THRESHOLD = 80

  useEffect(() => {
    let active = false

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      active = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!active) return
      const diff = e.touches[0].clientY - startY.current
      if (diff <= 0) return
      if (window.scrollY > 0) { active = false; return }
      const pct = Math.min(diff / THRESHOLD, 1)
      setProgress(pct)
      setPulling(true)
      if (diff > 10) e.preventDefault()
    }

    function onTouchEnd() {
      if (!active) return
      active = false
      if (progress >= 1) {
        setRefreshing(true)
        setPulling(false)
        setProgress(0)
        setTimeout(() => { window.location.reload() }, 500)
      } else {
        setPulling(false)
        setProgress(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [progress])

  if (!pulling && !refreshing) return null

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:9998,
      display:'flex', alignItems:'center', justifyContent:'center',
      paddingTop: refreshing ? 16 : `${progress * 16}px`,
      transition: refreshing ? 'none' : 'padding .1s',
      pointerEvents:'none',
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        background:colors.surface,
        boxShadow:'0 2px 12px rgba(0,0,0,.15)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transform: refreshing ? 'scale(1)' : `scale(${0.5 + progress * 0.5})`,
        transition:'transform .1s',
        opacity: refreshing ? 1 : progress,
      }}>
        {refreshing ? (
          <div style={{width:18,height:18,border:`2.5px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
        ) : (
          <svg width={18} height={18} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
            style={{transform:`rotate(${progress*180}deg)`,transition:'transform .1s'}}>
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
