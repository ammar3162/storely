'use client'
import PageIcon from '@/components/PageIcon'
import SmartOrder from '@/components/SmartOrder'
import TodayDecisions from '@/components/TodayDecisions'
import { C } from './_parts/config'
import { useAiTools } from './_parts/useAiTools'
import SmartInsights from './_parts/SmartInsights'
import ToolsList from './_parts/ToolsList'
import Seasonality from './_parts/Seasonality'
import BranchCompare from './_parts/BranchCompare'
import WasteTools from './_parts/WasteTools'
import RecipesPanel from './_parts/RecipesPanel'
import RecipeReconReport from './_parts/RecipeReconReport'
import ComingSoon from './_parts/ComingSoon'
import WasteReport from './_parts/WasteReport'
import RealWasteReport from './_parts/RealWasteReport'
import WeeklyReport from './_parts/WeeklyReport'
import RecipeModal from './_parts/RecipeModal'
import { Sparkles } from 'lucide-react'

export default function AIToolsPage() {
  const m = useAiTools()
  const { curr, visible, hasAiAddon, aiKnown } = m

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fu{animation:fadeUp .35s ease both}`}</style>

      {/* Header */}
      <div className="fu" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <PageIcon size={44}/>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>أدوات الذكاء</h1>
            <p style={{fontSize:11,color:C.text3,margin:'3px 0 0'}}>أدوات تحليل ذكية مبنية على بيانات مخزونك الحقيقية</p>
          </div>
        </div>
      </div>

      {/* قرارات اليوم — أعلى الصفحة (بعد ما نعرف صلاحية الذكاء عشان أدوات الهدر) */}
      {aiKnown && <TodayDecisions full={!!hasAiAddon} curr={curr} />}

      <SmartInsights m={m}/>

      <ToolsList m={m}/>

      {hasAiAddon && (
        <>
      {/* الطلب الذكي: توقع النفاد + توقيت الطلب + الكميات + حد إعادة الطلب (lib/smartOrder) */}
      <div id="smart-order"><SmartOrder /></div>

      <Seasonality m={m}/>

      <BranchCompare m={m}/>

      <WasteTools m={m}/>

      <RecipesPanel m={m}/>

      <RecipeReconReport m={m}/>

      <ComingSoon m={m}/>

      <WasteReport m={m}/>

      <RealWasteReport m={m}/>

      <WeeklyReport m={m}/>
        </>
      )}

      {hasAiAddon===false && (
        <div className="fu" style={{marginTop:16,background:'linear-gradient(135deg,#042f2e,#0C213B)',borderRadius:16,padding:'28px 24px',textAlign:'center' as const}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:10,color:'white'}}><Sparkles size={32}/></div>
          <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:6}}>أدوات ذكاء اصطناعي بانتظارك</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.65)',marginBottom:18,lineHeight:1.7,maxWidth:420,marginLeft:'auto',marginRight:'auto'}}>
            توقع نفاد المخزون، اقتراح كميات الشراء، تحليل الموسمية، تحسين نقطة إعادة الطلب، والتقرير الأسبوعي التلقائي — مع الباقة الكاملة أو إضافة «أدوات الذكاء الاصطناعي».
          </div>
          <a className="hide-in-app" href="/addons-market" style={{display:'inline-block',padding:'12px 28px',background:'#029FA2',color:'white',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none'}}>أضف أدوات الذكاء</a>
        </div>
      )}

      <RecipeModal m={m}/>
    </div>
  )
}
