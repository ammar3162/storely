'use client'
import { useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'

// Vercel Speed Insights مع اسم الصفحة (بدل «Unknown») — نفس اللي تسويه حزمة @vercel/speed-insights
// (الحزمة نفسها ما تنركّب بسبب تعارض تبعيات اختيارية)، والرابط يتحول لقالب: /accountant-portal/[orgId]
function routeOf(pathname: string, params: Record<string, string | string[]>) {
  let r = pathname
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v.join('/') : v
    if (!val) continue
    const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    r = r.replace(new RegExp(`/${esc}(?=[/?#]|$)`), Array.isArray(v) ? `/[...${k}]` : `/[${k}]`)
  }
  return r
}

const SRC = '/_vercel/speed-insights/script.js'
export default function SpeedInsightsRoute() {
  const pathname = usePathname()
  const params = useParams() as Record<string, string | string[]>
  const route = pathname ? routeOf(pathname, params || {}) : null
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !route) return
    let s = document.head.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
    if (!s) {
      const w = window as any
      if (!w.si) w.si = (...a: unknown[]) => { (w.siq = w.siq || []).push(a) }
      s = document.createElement('script')
      s.src = SRC; s.defer = true
      s.dataset.sdkn = '@vercel/speed-insights/next'; s.dataset.sdkv = '2.0.0'
      document.head.appendChild(s)
    }
    s.dataset.route = route
  }, [route])
  return null
}
