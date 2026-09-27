'use client'
import { usePathname } from 'next/navigation'
import { pageToneFor } from '@/lib/pageTones'

// أيقونة ملوّنة بجانب عنوان الصفحة — اللون والأيقونة من رابط الصفحة
export default function PageIcon({ size = 36 }: { size?: number }) {
  const page = pageToneFor(usePathname() || '')
  if (!page) return null
  const { tone, Icon } = page
  return (
    <span aria-hidden="true" style={{
      width:size, height:size, borderRadius:Math.round(size*0.3), flexShrink:0,
      display:'inline-grid', placeItems:'center', color:tone.fg, background:tone.bg,
      boxShadow:`inset 0 0 0 1px ${tone.soft}66`,
    }}>
      <Icon size={Math.round(size*0.5)} strokeWidth={2}/>
    </span>
  )
}
