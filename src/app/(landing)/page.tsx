// الصفحة تنبني مرة وتنخدم من الكاش (CDN) — تتحدث كل 5 دقايق، وفوراً لما الأدمن يغيّر رسائل الشريط (revalidatePath بـ admin/marquee-messages)
export const revalidate = 300

import LandingPageClient from './LandingPageClient'
import { getMarqueeMessages } from '@/lib/marquee'

export default async function Page() {
  const msgs = await getMarqueeMessages()
  const marquee = msgs.map(m => m.message)
  return (
    <>
      {/* React يرفعها لرأس الصفحة: غلاف الفيديو الأول (أكبر شي يطلع أول) وخط العنوان الكبير */}
      <link rel="preload" href="/videos/storely-brand.jpg" as="image" fetchPriority="high"/>
      <link rel="preload" href="/fonts/noto-naskh-arabic-arabic-700-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
      <LandingPageClient initialMarquee={marquee} />
    </>
  )
}
