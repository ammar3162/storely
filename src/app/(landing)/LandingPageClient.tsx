'use client'
import { LP_CSS } from './_parts/styles'
import { ST_CSS } from './_parts/styles-story'
import { useLanding } from './_parts/useLanding'
import AnnouncementBar from './_parts/AnnouncementBar'
import TopNav from './_parts/TopNav'
import Hero from './_parts/Hero'
import CustomersStrip from './_parts/CustomersStrip'
import DaySection from './_parts/DaySection'
import ChainSection from './_parts/ChainSection'
import RolesSection from './_parts/RolesSection'
import AboutSection from './_parts/AboutSection'
import StartSection from './_parts/StartSection'
import FaqSection from './_parts/FaqSection'
import DemoRequestSection from './_parts/DemoRequestSection'
import FinalCta from './_parts/FinalCta'
import SiteFooter from './_parts/SiteFooter'
import WhatsAppFloat from './_parts/WhatsAppFloat'
import StickyCta from './_parts/StickyCta'

// ترتيب متسلسل (انتباه ← إثبات ← ألم ← آلية ← لمن ← ثقة ← قرار): الفيديو «من هي ستورلي» ← عملاء حقيقيون ←
// يوم في مطعمك (الخسارة اليوم وما يتغيّر) ← السلسلة (كل إجراء ينعكس على ما بعده) ← الأدوار ← من نحن ←
// ابدأ (السعر وإزالة المخاطرة) ← الأسئلة ← الدعوة وطلب العرض
export default function LandingPage({ initialMarquee }: { initialMarquee?: string[] } = {}) {
  const m = useLanding(initialMarquee)
  const { rootRef } = m

  return (
    <div ref={rootRef} className="lp" dir="rtl">
      <style>{LP_CSS + ST_CSS}</style>
      <AnnouncementBar m={m}/>
      <TopNav m={m}/>
      <main>
        <Hero m={m}/>
        <CustomersStrip m={m}/>
        <DaySection m={m}/>
        <ChainSection m={m}/>
        <RolesSection m={m}/>
        <AboutSection m={m}/>
        <StartSection m={m}/>
        <FaqSection m={m}/>
        <FinalCta m={m}/>
        <DemoRequestSection m={m}/>
      </main>
      <SiteFooter m={m}/>
      <WhatsAppFloat/>
      <StickyCta m={m}/>
    </div>
  )
}
