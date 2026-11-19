'use client'
import { useEffect } from 'react'
import { OVERLAY_SELECTOR, NARROW_QUERY, locksPage } from '@/lib/overlayLock'

// يثبّت الصفحة اللي ورا أي نافذة أو قائمة مفتوحة، في كل أجزاء النظام (المالك، الموظف، البوابات، الإدارة).
// بدل ما نعدّل كل نافذة لحالها (قرابة 50 نافذة)، نراقب الصفحة ونحط html.scroll-locked طول ما فيه طبقة تغطي الشاشة،
// وينفك لحاله أول ما تتسكّر كل النوافذ. القاعدة نفسها في lib/overlayLock.ts.
export default function OverlayScrollLock() {
  useEffect(() => {
    const root = document.documentElement
    const narrow = window.matchMedia(NARROW_QUERY)
    let raf = 0
    const check = () => {
      raf = 0
      const vw = window.innerWidth, vh = window.innerHeight
      const on = Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)).some(el => {
        const cs = getComputedStyle(el)
        return locksPage({
          mark: el.dataset.scrollLock ?? null,
          rendered: el.getClientRects().length > 0,
          position: cs.position, visibility: cs.visibility, pointerEvents: cs.pointerEvents,
          rect: el.getBoundingClientRect(), vw, vh, narrow: narrow.matches,
        })
      })
      root.classList.toggle('scroll-locked', on)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check) }
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-scroll-lock'] })
    // بعد حركة الظهور (النافذة تكون أصغر شوي أول إطار) ولما يتغير مقاس الشاشة
    document.addEventListener('animationend', schedule, true)
    document.addEventListener('transitionend', schedule, true)
    window.addEventListener('resize', schedule)
    narrow.addEventListener('change', schedule)
    check()
    return () => {
      mo.disconnect()
      document.removeEventListener('animationend', schedule, true)
      document.removeEventListener('transitionend', schedule, true)
      window.removeEventListener('resize', schedule)
      narrow.removeEventListener('change', schedule)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove('scroll-locked')
    }
  }, [])
  return null
}
