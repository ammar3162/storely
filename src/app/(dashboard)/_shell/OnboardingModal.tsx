'use client'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

export default function OnboardingModal({ m }: { m: DashboardShell }) {
  const { showOnboarding, setShowOnboarding, onboardingStep, setOnboardingStep, router } = m
  return (
    <>
      {/* Onboarding — أول دخول */}
      {showOnboarding && (() => {
        const steps = [
          { title:'أهلاً بك في Storely', body:'أربع خطوات وتكون جاهز: المنتجات، الموظفين، الموردين، والإشعارات.', go:null },
          { title:'أضف منتجاتك', body:'من صفحة المخزون اضغط "إضافة منتج" وأدخل الاسم والكمية وحد إعادة الطلب.', go:{ href:'/inventory', label:'فتح المخزون' } },
          { title:'أضف موظفيك', body:'من صفحة الموظفين أضف كل موظف برقم جواله، ويدخل برمز PIN خاص فيه.', go:{ href:'/staff-management', label:'فتح الموظفين' } },
          { title:'أضف موردينك', body:'اربط كل منتج بمورده، ويوصل المورد طلب توريد على واتساب لما ينقص الصنف.', go:{ href:'/suppliers', label:'فتح الموردين' } },
          { title:'كل شي جاهز', body:'تقدر تبدأ الحين. الدعم الفني متاح من القائمة لو احتجت أي شي.', go:null },
        ]
        const s = steps[onboardingStep] || steps[0]
        const done = () => { localStorage.setItem('onboarding_done','1'); setShowOnboarding(false) }
        return (
          <div className="sh-overlay" style={{zIndex:9999}}>
            <div className="sh-modal" style={{maxWidth:440}}>
              <div style={{fontSize:12,color:C.text3,fontWeight:600,marginBottom:6}}>الخطوة {onboardingStep+1} من {steps.length}</div>
              <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:14,color:C.text2,lineHeight:1.8,marginBottom:20}}>{s.body}</div>
              <div style={{display:'flex',gap:4,marginBottom:20}}>
                {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:99,background:i<=onboardingStep?C.primary:C.border}}/>)}
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {onboardingStep<steps.length-1
                  ? <button className="sh-btn sh-btn-primary" onClick={()=>setOnboardingStep(v=>v+1)}>التالي</button>
                  : <button className="sh-btn sh-btn-primary" onClick={done}>ابدأ</button>}
                {s.go && <button className="sh-btn" onClick={()=>{done();router.push(s.go!.href)}}>{s.go.label}</button>}
                {onboardingStep<steps.length-1 && <button className="sh-btn sh-btn-ghost" style={{marginInlineStart:'auto'}} onClick={done}>تخطي</button>}
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
