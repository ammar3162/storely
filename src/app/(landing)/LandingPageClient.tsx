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
import ProofStrip from './_parts/ProofStrip'
import LossCalculator from './_parts/LossCalculator'
import type { LandingStats } from '@/lib/landingStats'
import DemoRequestSection from './_parts/DemoRequestSection'
import FaqSection from './_parts/FaqSection'
import FinalCta from './_parts/FinalCta'
import SiteFooter from './_parts/SiteFooter'
import WhatsAppFloat from './_parts/WhatsAppFloat'

// ترتيب مثل صفحات الشركات (فودكس، قيود، رواء): العنوان بزرين ← المزايا ← كيف يشتغل ← الموردين ← قصة عميل ← الأسعار (صفحة مستقلة) ← طلب عرض ← الأسئلة
export default function LandingPage({ initialMarquee, stats = null }: { initialMarquee?: string[]; stats?: LandingStats | null } = {}) {
  const m = useLanding(initialMarquee)
  const { rootRef } = m

  return (
    <div ref={rootRef} className="lp" dir="rtl">
      <style>{LP_CSS}</style>

      <AnnouncementBar m={m}/>

      <TopNav m={m}/>

      <Hero m={m}/>

      <ProofStrip m={m} stats={stats}/>

      <FeaturesSection m={m}/>

      <HowItWorks m={m}/>

      <SuppliersSection m={m}/>

      <OwnerStory m={m}/>

      <LossCalculator m={m}/>

      <PricingTeaser m={m}/>

      <DemoRequestSection m={m}/>

      <FaqSection m={m}/>

      <FinalCta m={m}/>

      <SiteFooter m={m}/>

      <WhatsAppFloat/>

    </div>
  )
}
