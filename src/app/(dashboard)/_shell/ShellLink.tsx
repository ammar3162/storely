'use client'
import Link from 'next/link'
import { useState, type ComponentPropsWithoutRef } from 'react'

// روابط التنقل في لوحة المالك: الشريط السفلي، قائمة «المزيد»، القائمة الجانبية، وأيقونات الأعلى.
// كانت أزرار تنتظر الصفحة الجديدة من الخادم (سيدني) قبل ما يتغير أي شي بالشاشة، وما تتجهّز مسبقاً بالجوال
// (التجهيز كان مع مرور الماوس بس)، فيبان للعميل إن الضغطة ما انحسبت ويضغط مرة ثانية. الرابط:
// - يجهّز صفحته بالخلفية أول ما يظهر على الشاشة (prefetch)، فالضغطة تفتحها على طول
// - يشتغل حتى قبل ما تخلص برمجة الصفحة تحميل (رابط حقيقي، مو زر ينتظر البرمجة)
// - onGo: يلوّن الزر لحظة الضغط (useDashboardShell.startNav)
// hoverOnly: القائمة الجانبية بالكمبيوتر فيها قرابة 20 رابط — نجهّز اللي يمر عليه الماوس بس (مثل قبل) بدل 20 طلب مع كل فتح
type Props = Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'prefetch' | 'onNavigate'> & {
  href: string
  hoverOnly?: boolean
  onGo?: (href: string) => void
}

export default function ShellLink({ href, hoverOnly = false, onGo, onMouseEnter, ...rest }: Props) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      {...rest}
      href={href}
      prefetch={hoverOnly && !hovered ? false : null}
      onMouseEnter={e => { if (hoverOnly && !hovered) setHovered(true); onMouseEnter?.(e) }}
      onNavigate={() => onGo?.(href)}
    />
  )
}
