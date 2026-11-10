'use client'
import { LP_CSS } from './_parts/styles'
import { useLanding } from './_parts/useLanding'
import AnnouncementBar from './_parts/AnnouncementBar'
import TopNav from './_parts/TopNav'
import Hero from './_parts/Hero'
import OwnerStory from './_parts/OwnerStory'
import HowItWorks from './_parts/HowItWorks'
import SuppliersSection from './_parts/SuppliersSection'
import FeaturesSection from './_parts/FeaturesSection'
import PricingTeaser from './_parts/PricingTeaser'
import DemoRequestSection from './_parts/DemoRequestSection'
import FaqSection from './_parts/FaqSection'
import FinalCta from './_parts/FinalCta'
import SiteFooter from './_parts/SiteFooter'
import WhatsAppFloat from './_parts/WhatsAppFloat'
import PainSection from './_parts/PainSection'
import VideoSection from './_parts/VideoSection'
import StartSteps from './_parts/StartSteps'
import StickyCta from './_parts/StickyCta'

// ترتيب يقود للتجربة: الواجهة (المنتج نفسه) ← المشكلات وحلولها ← المزايا ← الفيديو ← يومك مع Storely ← الموردين ← قصة صاحب المنشأة ← ابدأ في 3 خطوات ← الأسعار ← طلب عرض ← الأسئلة
export default function LandingPage({ initialMarquee }: { initialMarquee?: string[] } = {}) {
  const m = useLanding(initialMarquee)
  const { rootRef } = m

  return (
    <div ref={rootRef} className="lp" dir="rtl">
      <style>{LP_CSS}</style>

      <AnnouncementBar m={m}/>

      <TopNav m={m}/>

      <Hero m={m}/>

      <PainSection m={m}/>

      <FeaturesSection m={m}/>

      <VideoSection m={m}/>

      <HowItWorks m={m}/>

      <SuppliersSection m={m}/>

      <OwnerStory m={m}/>

      <StartSteps m={m}/>

      <PricingTeaser m={m}/>

      <DemoRequestSection m={m}/>

      <FaqSection m={m}/>

      <FinalCta m={m}/>

      <SiteFooter m={m}/>

      <WhatsAppFloat/>

      <StickyCta m={m}/>

    </div>
  )
}
