export const dynamic = 'force-dynamic'
export const revalidate = 0

import { preload } from 'react-dom'
import LandingPageClient from './LandingPageClient'
import { getMarqueeMessages } from '@/lib/marquee'

export default async function Page() {
  // صورة غلاف الفيديو الأول هي أكبر شي يطلع أول — نطلبها بأولوية
  preload('/videos/storely-ad.jpg', { as: 'image', fetchPriority: 'high' })
  // خط العنوان الكبير — نطلبه بدري عشان ما يتغير حجم النص وتتحرك الصفحة
  preload('/fonts/noto-naskh-arabic-arabic-700-normal.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  const marquee = (await getMarqueeMessages()).map(m => m.message)
  return <LandingPageClient initialMarquee={marquee} />
}
