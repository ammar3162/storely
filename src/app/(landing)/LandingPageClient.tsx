'use client'
import { LP_CSS } from './_parts/styles'
import { AP_CSS } from './_parts/styles-apple'
import { useLanding } from './_parts/useLanding'
import { useScrollFx } from './_parts/useScrollFx'
import AnnouncementBar from './_parts/AnnouncementBar'
import TopNav from './_parts/TopNav'
import Hero from './_parts/Hero'
import CustomersStrip from './_parts/CustomersStrip'
import DayTiles from './_parts/DayTiles'
import ChainFlow from './_parts/ChainFlow'
import RolesSection from './_parts/RolesSection'
import AboutSection from './_parts/AboutSection'
import StartSection from './_parts/StartSection'
import FaqSection from './_parts/FaqSection'
import DemoRequestSection from './_parts/DemoRequestSection'
import FinalCta from './_parts/FinalCta'
import SiteFooter from './_parts/SiteFooter'
import WhatsAppFloat from './_parts/WhatsAppFloat'

// بأسلوب أبل: خلفيات أبل (أبيض / رمادي #F5F5F7) والكحلي مكان الأسود وحركاتها مع التمرير، والكحلي لون الأزرار والروابط. الترتيب المتسلسل نفسه:
// الفيديو «من هي ستورلي» ← عملاء حقيقيون ← يوم في مطعمك (لحظة لحظة بشاشات حقيقية) ← كيف يترابط ← الأدوار ←
// من نحن ← ابدأ (السعر وإزالة المخاطرة) ← الأسئلة ← الدعوة وطلب العرض
export default function LandingPage({ initialMarquee }: { initialMarquee?: string[] } = {}) {
  const m = useLanding(initialMarquee)
  const { rootRef } = m
  useScrollFx(rootRef)

  return (
    <div ref={rootRef} className="lp" dir="rtl">
      <style>{LP_CSS + AP_CSS}</style>
      <AnnouncementBar m={m}/>
      <TopNav m={m}/>
      <main>
        <Hero m={m}/>
        <CustomersStrip m={m}/>
        <DayTiles m={m}/>
        <ChainFlow m={m}/>
        <RolesSection m={m}/>
        <AboutSection m={m}/>
        <StartSection m={m}/>
        <FaqSection m={m}/>
        <FinalCta m={m}/>
        <DemoRequestSection m={m}/>
      </main>
      <SiteFooter m={m}/>
      <WhatsAppFloat/>
    </div>
  )
}
