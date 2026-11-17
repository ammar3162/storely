'use client'
import { useEffect, type RefObject } from 'react'

// حركات أبل المرتبطة بالتمرير: كل عنصر يحمل data-fx يأخذ متغيّر --p من 0 إلى 1 حسب موقعه في الشاشة،
// والـ CSS يحوّله إلى تحريك (transform/opacity فقط). بدون جافاسكربت أو مع «تقليل الحركة» يبقى كل شيء
// في وضعه النهائي لأن الـ CSS يستخدم var(--p, 1).
const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

function progress(el: HTMLElement, kind: string, vh: number): number {
  const r = el.getBoundingClientRect()
  switch (kind) {
    case 'hero': return clamp(window.scrollY / (vh * 0.7))                         // الواجهة: مع أول تمرير
    case 'rise': return clamp((vh - r.top) / (vh * 0.75))                           // الجوال يطلع من أسفل البطاقة
    case 'chain': return clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35))         // خط السلسلة يتعبّى
    case 'zoom': return clamp((vh - r.top) / (vh * 0.8))                            // شاشة الكمبيوتر تكبر
    default: return 1
  }
}

export function useScrollFx(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-fx]'))
    if (!els.length) return
    const visible = new Set<HTMLElement>()
    const io = new IntersectionObserver(es => es.forEach(e => {
      const el = e.target as HTMLElement
      if (e.isIntersecting) visible.add(el); else visible.delete(el)
    }), { rootMargin: '20% 0px 20% 0px' })
    els.forEach(el => io.observe(el))

    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      visible.forEach(el => {
        const kind = el.dataset.fx || ''
        const p = progress(el, kind, vh)
        el.style.setProperty('--p', p.toFixed(3))
        if (kind === 'chain') {
          const steps = el.querySelectorAll('li')
          steps.forEach((li, i) => li.classList.toggle('on', p >= i / Math.max(1, steps.length - 1) - 0.02))
        }
      })
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    // البداية من الصفر للعناصر غير الظاهرة بعد، ثم التحديث مع التمرير
    els.forEach(el => el.style.setProperty('--p', progress(el, el.dataset.fx || '', window.innerHeight).toFixed(3)))
    root.classList.add('lp-fx')
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      io.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootRef])
}
