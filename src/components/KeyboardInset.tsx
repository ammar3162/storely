'use client'
import { useEffect } from 'react'

// لما يطلع كيبورد الجوال: نحسب ارتفاعه ونحطه في --kb عشان النوافذ (اللي تغطي الشاشة) ترتفع فوقه بدل ما يغطيها
// (الآيفون ما يصغّر الشاشة للعناصر الثابتة — الكيبورد يطلع فوقها)
export default function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      const open = kb > 80   // أقل من كذا = شريط المتصفح مو كيبورد
      root.style.setProperty('--kb', open ? `${kb}px` : '0px')
      // الجزء الظاهر من الشاشة (بداية ارتفاعه) — النوافذ تنحط عليه بالضبط وقت الكيبورد
      root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`)
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
      root.classList.toggle('kb-open', open)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return null
}
