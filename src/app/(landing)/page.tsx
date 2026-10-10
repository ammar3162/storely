export const dynamic = 'force-dynamic'
export const revalidate = 0

import LandingPageClient from './LandingPageClient'
import { getMarqueeMessages } from '@/lib/marquee'

export default async function Page() {
  const marquee = (await getMarqueeMessages()).map(m => m.message)
  return (
    <>
      {/* React يرفعها لرأس الصفحة: غلاف الفيديو الأول (أكبر شي يطلع أول) وخط العنوان الكبير */}
      <link rel="preload" href="/videos/storely-ad.jpg" as="image" fetchPriority="high"/>
      <link rel="preload" href="/fonts/noto-naskh-arabic-arabic-700-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
      <LandingPageClient initialMarquee={marquee} />
    </>
  )
}
