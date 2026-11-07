'use client'
import { LP_CSS } from '../_parts/styles'
import { useLanding } from '../_parts/useLanding'
import TopNav from '../_parts/TopNav'
import PricingSection from '../_parts/PricingSection'
import FaqSection from '../_parts/FaqSection'
import FinalCta from '../_parts/FinalCta'
import SiteFooter from '../_parts/SiteFooter'
import WhatsAppFloat from '../_parts/WhatsAppFloat'

// صفحة الأسعار: نفس القائمة والتذييل، وبينها الباقات والمقارنة والأسئلة
export default function PricingPageClient() {
  const m = useLanding([])
  return (
    <div ref={m.rootRef} className="lp" dir="rtl">
      <style>{LP_CSS}</style>
      <TopNav m={m}/>
      <div style={{paddingTop:72}}><PricingSection m={m}/></div>
      <FaqSection m={m}/>
      <FinalCta m={m}/>
      <SiteFooter m={m}/>
      <WhatsAppFloat/>
    </div>
  )
}
