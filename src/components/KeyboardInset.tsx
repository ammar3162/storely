'use client'
import { useEffect } from 'react'
import { keyboardState } from '@/lib/keyboardInset'

// لما يطلع كيبورد الجوال: نحسب ارتفاعه ونحطه في --kb عشان النوافذ (اللي تغطي الشاشة) ترتفع فوقه بدل ما يغطيها
// (الآيفون ما يصغّر الشاشة للعناصر الثابتة — الكيبورد يطلع فوقها). الحساب نفسه في lib/keyboardInset.ts
export default function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const k = keyboardState({ innerHeight: window.innerHeight, vvHeight: vv.height, vvOffsetTop: vv.offsetTop })
      root.style.setProperty('--kb', `${k.kb}px`)
      // الجزء الظاهر من الشاشة (بداية ارتفاعه) — النوافذ تنحط عليه بالضبط وقت الكيبورد
      root.style.setProperty('--vvt', `${k.top}px`)
      root.style.setProperty('--vvh', `${k.height}px`)
      root.classList.toggle('kb-open', k.open)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return null
}
