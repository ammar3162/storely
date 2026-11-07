// الصفحة تنبني مرة وتنخدم من الكاش (CDN) — تتحدث كل 5 دقايق، وفوراً لما الأدمن يغيّر رسائل الشريط (revalidatePath بـ admin/marquee-messages)
export const revalidate = 300

import LandingPageClient from './LandingPageClient'
import { getMarqueeMessages } from '@/lib/marquee'
import { getLandingStats } from '@/lib/landingStats'

export default async function Page() {
  const [msgs, stats] = await Promise.all([getMarqueeMessages(), getLandingStats()])
  const marquee = msgs.map(m => m.message)
  return (
    <>
      {/* React يرفعها لرأس الصفحة: غلاف الفيديو الأول (أكبر شي يطلع أول) وخط العنوان الكبير */}
      <link rel="preload" href="/videos/storely-ad.jpg" as="image" fetchPriority="high"/>
      <link rel="preload" href="/fonts/noto-naskh-arabic-arabic-700-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
      <LandingPageClient initialMarquee={marquee} stats={stats} />
    </>
  )
}
