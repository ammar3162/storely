'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import NumberInput from '@/components/NumberInput'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { colors, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { SIGNUP_BUSINESS_TYPES } from '@/lib/businessTypes'
import { getMe } from '@/lib/session'
import { UtensilsCrossed, Coffee, Store, Package, Users, Check, Bell, KeyRound, Plus, X, ArrowLeft, ArrowRight, Minus } from 'lucide-react'

// أيقونة لكل نشاط (بدل الإيموجي)
const BIZ_ICON: Record<string, typeof Store> = { 'مطعم': UtensilsCrossed, 'كوفي': Coffee }
const BUSINESS_TYPES = SIGNUP_BUSINESS_TYPES.map(b=>({ id:b.v, Icon: BIZ_ICON[b.v] || Store, desc:b.desc }))

const TEMPLATES: Record<string, { category:string; products:{name:string;unit:string;reorder:number}[] }[]> = {
  'مطعم': [
    { category:'لحوم ودواجن', products:[{name:'لحم بقري',unit:'كيلو',reorder:5},{name:'دجاج',unit:'كيلو',reorder:5},{name:'لحم غنم',unit:'كيلو',reorder:3}] },
    { category:'خضار وفواكه', products:[{name:'خس',unit:'كيلو',reorder:2},{name:'طماطم',unit:'كيلو',reorder:2},{name:'بصل',unit:'كيلو',reorder:3}] },
    { category:'توابل وصلصات', products:[{name:'كاتشب',unit:'كيلو',reorder:2},{name:'مايونيز',unit:'كيلو',reorder:2},{name:'ملح',unit:'كيلو',reorder:1}] },
    { category:'تغليف', products:[{name:'أكياس تغليف',unit:'كرتون',reorder:2},{name:'علب طعام',unit:'كرتون',reorder:2}] },
    { category:'مشروبات', products:[{name:'ماء معدني',unit:'كرتون',reorder:3},{name:'عصير',unit:'كرتون',reorder:2}] },
    { category:'نظافة', products:[{name:'منظف أرضية',unit:'لتر',reorder:2},{name:'مناديل',unit:'كرتون',reorder:3}] },
  ],
  'كوفي': [
    { category:'قهوة', products:[{name:'قهوة عربية',unit:'كيلو',reorder:2},{name:'قهوة إسبريسو',unit:'كيلو',reorder:2}] },
    { category:'شاي وأعشاب', products:[{name:'شاي أحمر',unit:'كيلو',reorder:1}] },
    { category:'حليب وكريمة', products:[{name:'حليب طازج',unit:'لتر',reorder:5},{name:'كريمة سائلة',unit:'لتر',reorder:3},{name:'حليب اللوز',unit:'لتر',reorder:2}] },
    { category:'سكر ومحليات', products:[{name:'سكر أبيض',unit:'كيلو',reorder:2},{name:'سكر بني',unit:'كيلو',reorder:1},{name:'عسل',unit:'كيلو',reorder:1}] },
    { category:'أكواب وأغطية', products:[{name:'أكواب ورقية S',unit:'كرتون',reorder:2},{name:'أكواب ورقية L',unit:'كرتون',reorder:2},{name:'أغطية أكواب',unit:'كرتون',reorder:2}] },
    { category:'حلويات ومخبوزات', products:[{name:'كيك',unit:'قطعة',reorder:5},{name:'كرواسون',unit:'قطعة',reorder:5}] },
    { category:'نظافة', products:[{name:'مناديل',unit:'كرتون',reorder:2},{name:'منظف',unit:'لتر',reorder:1}] },
  ],
  'مخبز': [
    { category:'دقيق وسكر', products:[{name:'دقيق أبيض',unit:'كيلو',reorder:10},{name:'سكر',unit:'كيلو',reorder:5},{name:'دقيق فاخر',unit:'كيلو',reorder:5}] },
    { category:'زبدة وزيوت', products:[{name:'زبدة',unit:'كيلو',reorder:3},{name:'زيت نباتي',unit:'لتر',reorder:3}] },
    { category:'بيض وألبان', products:[{name:'بيض',unit:'كرتون',reorder:3},{name:'حليب',unit:'لتر',reorder:5},{name:'كريمة',unit:'لتر',reorder:2}] },
    { category:'تغليف', products:[{name:'أكياس خبز',unit:'كرتون',reorder:2},{name:'صناديق كيك',unit:'كرتون',reorder:2}] },
    { category:'نظافة', products:[{name:'قفازات',unit:'علبة',reorder:3},{name:'منظف',unit:'لتر',reorder:1}] },
  ],
  'بقالة': [
    { category:'مواد غذائية', products:[{name:'أرز',unit:'كيلو',reorder:10},{name:'سكر',unit:'كيلو',reorder:5},{name:'زيت',unit:'لتر',reorder:5}] },
    { category:'مشروبات', products:[{name:'ماء معدني',unit:'كرتون',reorder:5},{name:'عصائر',unit:'كرتون',reorder:3},{name:'مشروبات غازية',unit:'كرتون',reorder:3}] },
    { category:'ألبان وأجبان', products:[{name:'حليب',unit:'كرتون',reorder:5},{name:'جبن',unit:'كيلو',reorder:2},{name:'زبادي',unit:'كرتون',reorder:3}] },
    { category:'منظفات', products:[{name:'صابون غسيل',unit:'كرتون',reorder:2},{name:'منظف أطباق',unit:'كرتون',reorder:2}] },
    { category:'ورقيات', products:[{name:'مناديل',unit:'كرتون',reorder:3},{name:'ورق تواليت',unit:'كرتون',reorder:3}] },
  ],
  'صيدلية': [
    { category:'أدوية', products:[{name:'بنادول',unit:'علبة',reorder:10},{name:'فيتامين C',unit:'علبة',reorder:5}] },
    { category:'مستلزمات طبية', products:[{name:'قفازات طبية',unit:'علبة',reorder:5},{name:'كمامات',unit:'علبة',reorder:5},{name:'ضمادات',unit:'علبة',reorder:3}] },
    { category:'عناية شخصية', products:[{name:'شامبو',unit:'قطعة',reorder:5},{name:'كريم مرطب',unit:'قطعة',reorder:5}] },
    { category:'مكملات غذائية', products:[{name:'أوميغا 3',unit:'علبة',reorder:3},{name:'كالسيوم',unit:'علبة',reorder:3}] },
  ],
  'مستودع': [
    { category:'مواد خام', products:[{name:'كرتون',unit:'قطعة',reorder:50},{name:'بلاستيك تغليف',unit:'رول',reorder:5}] },
    { category:'أدوات', products:[{name:'شريط لاصق',unit:'رول',reorder:10},{name:'مقص',unit:'قطعة',reorder:3}] },
    { category:'نظافة', products:[{name:'منظف أرضية',unit:'لتر',reorder:3},{name:'كناسة',unit:'قطعة',reorder:2}] },
  ],
  'متجر إلكتروني': [
    { category:'تغليف وشحن', products:[{name:'كرتون شحن S',unit:'قطعة',reorder:20},{name:'كرتون شحن M',unit:'قطعة',reorder:20},{name:'كرتون شحن L',unit:'قطعة',reorder:10}] },
    { category:'مواد حماية', products:[{name:'فقاعات حماية',unit:'رول',reorder:3},{name:'إسفنج حماية',unit:'قطعة',reorder:10}] },
    { category:'ملصقات وطباعة', products:[{name:'ملصقات شحن',unit:'رول',reorder:2},{name:'ورق طباعة',unit:'رزمة',reorder:3}] },
  ],
  'أخرى': [
    { category:'مستلزمات مكتبية', products:[{name:'ورق A4',unit:'رزمة',reorder:5},{name:'أقلام',unit:'علبة',reorder:3}] },
    { category:'نظافة', products:[{name:'منظف',unit:'لتر',reorder:2},{name:'مناديل',unit:'كرتون',reorder:2}] },
  ],
}

type Step = 'business'|'setup'|'products'|'staff'|'done'
interface SelectedProduct { name:string; unit:string; reorder:number; qty:number; category:string; selected:boolean }

export default function OnboardingPage() {
  const [step, setStep]               = useState<Step>('business')
  const [businessType, setBusinessType] = useState('')
  const [orgName, setOrgName]         = useState('')
  const [whatsapp, setWhatsapp]       = useState('')
  const [orgId, setOrgId]             = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  async function enablePushOnboarding() {
    setPushLoading(true)
    try {
      if (typeof Notification === 'undefined') { alert('متصفحك لا يدعم الإشعارات'); setPushLoading(false); return }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushLoading(false); return }
      await navigator.serviceWorker.register('/sw.js')
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe().catch(()=>{})
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push-subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, org_id: orgId }),
      })
      setPushEnabled(true)
    } catch (e) {
      console.log('push onboarding error:', e)
    }
    setPushLoading(false)
  }
  const [branchId, setBranchId]       = useState('')
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [staffList, setStaffList]     = useState<{name:string;phone:string}[]>([{name:'',phone:''}])
  const [createdStaff, setCreatedStaff] = useState<{name:string;pin:string}[]>([])
  const [saving, setSaving]           = useState(false)
  const [progress, setProgress]       = useState(0)
  const [visible, setVisible]         = useState(false)
  const router = useRouter()
  // خطوة المنتجات بس لو باقته فيها المخزون (مثلاً «ابنِ باقتك» بالإقفال لحاله ما تحتاجها)
  const [hasInventory, setHasInventory] = useState(true)
  const flow: Step[] = hasInventory ? ['business','setup','products','staff','done'] : ['business','setup','staff','done']

  useEffect(()=>{
    loadOrg(); setTimeout(()=>setVisible(true),50)
    getMe().then(me => { const o: any = me?.org; if (o && (o.features?.inventory === false || (o.trial_locked || []).includes('inventory'))) setHasInventory(false) }).catch(()=>{})
  },[])
  useEffect(()=>{ setProgress((flow.indexOf(step)/(flow.length-1))*100) },[step, hasInventory])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(businessType && TEMPLATES[businessType]){
      const prods:SelectedProduct[]=[]
      TEMPLATES[businessType].forEach(cat=>cat.products.forEach(p=>prods.push({...p,qty:0,category:cat.category,selected:true})))
      setSelectedProducts(prods)
    }
  },[businessType])

  async function loadOrg() {
    const j=await api.get('/api/onboarding')
    if(!j.success){ if(j.reason==='unauthenticated') router.push('/login'); return }
    const org=j.org
    if(org?.onboarding_done){router.push('/dashboard');return}
    setOrgId(j.org_id)
    if(org?.name) setOrgName(org.name)
    if(org?.whatsapp_number) setWhatsapp(org.whatsapp_number)
    if(org?.business_type) setBusinessType(org.business_type)
    if(j.branch_id) setBranchId(j.branch_id)
  }

  async function saveSetup() {
    if(!orgName.trim()){toast('أدخل اسم المنشأة','warning');return}
    setSaving(true)
    const r=await api.patch('/api/onboarding',{org_id:orgId,name:orgName.trim(),whatsapp_number:whatsapp.trim(),business_type:businessType})
    setSaving(false)
    if(!r.success){toast('حدث خطأ أثناء الحفظ — حاول مرة أخرى','error');return}
    setStep(hasInventory ? 'products' : 'staff')
  }

  async function saveProducts() {
    setSaving(true)
    const toAdd=selectedProducts.filter(p=>p.selected)
    const r=await api.post('/api/onboarding',{org_id:orgId,branch_id:branchId||null,products:toAdd.map(p=>({name:p.name,unit:p.unit,qty:p.qty||0,reorder:p.reorder,category:p.category}))})
    if(!r.success){setSaving(false);toast(r.error||'حدث خطأ — أعد تسجيل الدخول','error');return}
    const failedCount=r.failed||0
    setSaving(false)
    if(failedCount>0) toast(`تنبيه: فشل حفظ ${failedCount} من ${toAdd.length} — تقدر تضيفهم لاحقاً من صفحة المخزون`,'warning')
    setStep('staff')
  }

  async function saveStaff() {
    setSaving(true)
    const toAdd=staffList.filter(s=>s.name.trim()&&s.phone.trim())
    let failedCount=0
    const created:{name:string;pin:string}[]=[]
    for(const s of toAdd){
      const pin=String(Math.floor(1000+Math.random()*9000))
      const r=await api.post('/api/add-staff',{org_id:orgId,branch_id:branchId||null,name:s.name.trim(),phone:s.phone.trim(),pin,permissions:{dispense:true,inventory:false,purchases:false,reports:false}})
      if(r.success) created.push({name:s.name.trim(),pin})
      else failedCount++
    }
    setCreatedStaff(created)
    const fin=await api.patch('/api/onboarding',{org_id:orgId,onboarding_done:true})
    setSaving(false)
    if(!fin.success){toast('حدث خطأ أثناء إنهاء الإعداد — حاول مرة أخرى','error');return}
    if(failedCount>0) toast(`تنبيه: فشل حفظ ${failedCount} من ${toAdd.length} موظف — تقدر تضيفهم لاحقاً من صفحة الموظفين`,'warning')
    setStep('done')
  }

  async function skipToDashboard() {
    await api.patch('/api/onboarding',{org_id:orgId,onboarding_done:true})
    router.push('/dashboard')
  }

  const selectedCount=selectedProducts.filter(p=>p.selected).length
  const categories=Array.from(new Set(selectedProducts.map(p=>p.category)))
  const STEP_LABEL: Record<Step,string> = { business:'نشاطك', setup:'منشأتك', products:'المنتجات', staff:'الموظفين', done:'جاهز' }
  const visibleSteps = flow.filter(x => x !== 'done')
  const stepIdx = flow.indexOf(step)
  const head = (Icon: typeof Store, title: string, sub: React.ReactNode) => (
    <div style={{marginBottom:28}}>
      <span style={{width:48,height:48,borderRadius:14,background:'#eceef1',color:'#4b5565',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><Icon size={22} strokeWidth={1.75}/></span>
      <h1 style={{fontSize:24,fontWeight:600,lineHeight:'34px',color:'var(--storely-text)',marginBottom:6}}>{title}</h1>
      <p style={{fontSize:15,color:'#4b5565',lineHeight:1.7}}>{sub}</p>
    </div>
  )
  const lbl: React.CSSProperties = { fontSize:14, fontWeight:500, color:'var(--storely-text)', display:'block', marginBottom:8 }
  const back = (to: Step) => <button onClick={()=>setStep(to)} style={{...btnSecondary,flex:1,padding:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><ArrowRight size={16} strokeWidth={1.75}/>السابق</button>

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',minHeight:'100vh',background:'#f4f5f6',opacity:visible?1:0,transition:'opacity .3s ease'}}>
      <style>{`
        @keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .su{animation:su .3s cubic-bezier(.22,1,.36,1) both}
        @media (prefers-reduced-motion:reduce){.su{animation:none}}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)!important;outline:none!important}
        .biz-card{border-radius:14px;padding:18px 12px;cursor:pointer;transition:border-color .15s,background-color .15s;border:1.5px solid var(--storely-border);background:white;font-family:inherit;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--storely-text)}
        @media(hover:hover){.biz-card:hover{border-color:#9ca3af}}
        .biz-card.active{border-color:${colors.primary};background:#f3faf8}
        .prod-item{display:flex;align-items:center;gap:12px;padding:10px 14px;background:white;transition:background-color .15s}
        .prod-item+.prod-item{border-top:1px solid var(--storely-border)}
        .check{width:22px;height:22px;border-radius:6px;border:1.5px solid #c9cdd3;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;color:white}
        .check.on{background:${colors.primary};border-color:${colors.primary}}
      `}</style>

      {/* الرأس: الشعار والخطوات */}
      <div style={{background:'white',borderBottom:'1px solid var(--storely-border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:640,margin:'0 auto',padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <img src="/storely-logo.png" alt="Storely" style={{width:36,height:36,borderRadius:10,border:'1px solid var(--storely-border)',background:'white',padding:3,objectFit:'contain'}}/>
            <span style={{fontSize:16,fontWeight:600,color:'var(--storely-text)'}}>Storely</span>
          </div>
          {step!=='done'&&<button onClick={skipToDashboard} style={{fontSize:14,color:'#4b5565',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>تخطي الإعداد<ArrowLeft size={15} strokeWidth={1.75}/></button>}
        </div>
        {step!=='done' && (
          <div style={{maxWidth:640,margin:'0 auto',padding:'0 20px 12px',display:'flex',alignItems:'center',gap:8}}>
            {visibleSteps.map((st,i)=>{
              const done = i < stepIdx, on = i === stepIdx
              return (
                <div key={st} style={{display:'flex',alignItems:'center',gap:8,flex:i<visibleSteps.length-1?1:'unset',minWidth:0}}>
                  <span style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:on?600:400,color:on?'#111827':'#6b7487',whiteSpace:'nowrap'}}>
                    <span style={{width:22,height:22,borderRadius:11,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,background:on?'#111827':'#eceef1',color:on?'white':done?colors.primary:'#4b5565'}}>
                      {done ? <Check size={13} strokeWidth={2.25}/> : i+1}
                    </span>
                    {STEP_LABEL[st]}
                  </span>
                  {i<visibleSteps.length-1 && <span style={{flex:1,height:1,minWidth:8,background:'#e5e7eb'}}/>}
                </div>
              )
            })}
          </div>
        )}
        <div style={{height:2,background:'#eceef1'}}><div style={{height:'100%',width:progress+'%',background:colors.primary,transition:'width .4s cubic-bezier(.22,1,.36,1)'}}/></div>
      </div>

      <div style={{maxWidth:640,margin:'0 auto',padding:'32px 20px 48px'}}>

        {/* 1: النشاط */}
        {step==='business'&&(
          <div className="su">
            <div style={{marginBottom:28}}>
              <img src="/storely-logo.png" alt="" style={{width:56,height:56,borderRadius:14,border:'1px solid var(--storely-border)',background:'white',padding:5,objectFit:'contain',marginBottom:16}}/>
              <h1 style={{fontSize:26,fontWeight:600,lineHeight:'36px',color:'var(--storely-text)',marginBottom:6}}>أهلاً بك في Storely</h1>
              <p style={{fontSize:15,color:'#4b5565',lineHeight:1.7}}>دقيقتين ونجهّز حسابك. وش نوع نشاطك؟</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,marginBottom:28}}>
              {BUSINESS_TYPES.map(b=>(
                <button key={b.id} className={`biz-card${businessType===b.id?' active':''}`} onClick={()=>setBusinessType(b.id)}>
                  <span style={{width:44,height:44,borderRadius:12,background:businessType===b.id?'white':'#f4f5f6',color:businessType===b.id?colors.primary:'#4b5565',display:'flex',alignItems:'center',justifyContent:'center'}}><b.Icon size={22} strokeWidth={1.75}/></span>
                  <span style={{fontSize:15,fontWeight:600}}>{b.id}</span>
                  <span style={{fontSize:12,color:'#6b7487',lineHeight:1.4}}>{b.desc}</span>
                </button>
              ))}
            </div>
            <button disabled={!businessType} onClick={()=>setStep('setup')}
              style={{...btnPrimary,width:'100%',padding:'14px',fontSize:16,opacity:!businessType?.5:1,cursor:!businessType?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              التالي<ArrowLeft size={17} strokeWidth={1.75}/>
            </button>
          </div>
        )}

        {/* 2: بيانات المنشأة */}
        {step==='setup'&&(
          <div className="su">
            {head(Store, 'بيانات منشأتك', 'اسم منشأتك ورقم الواتساب اللي توصله التنبيهات')}
            <div style={{background:'white',border:'1px solid var(--storely-border)',borderRadius:14,padding:20,display:'flex',flexDirection:'column' as const,gap:18,marginBottom:24}}>
              <div>
                <label style={lbl}>اسم المنشأة</label>
                <input value={orgName} onChange={e=>setOrgName(e.target.value)} style={{...inp(),fontSize:16}} placeholder={`مثال: ${businessType || 'مطعم'} الأصيل`}/>
              </div>
              <div>
                <label style={lbl}>رقم واتساب التنبيهات</label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} style={{...inp(),direction:'ltr' as const,fontSize:16}} placeholder="+966500000000"/>
                <div style={{fontSize:13,color:'#6b7487',marginTop:6}}>يوصلك عليه تنبيه نقص المخزون وتقرير الصباح</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              {back('business')}
              <button onClick={saveSetup} disabled={saving||!orgName.trim()}
                style={{...btnPrimary,flex:2,padding:'13px',fontSize:16,opacity:saving||!orgName.trim()?.5:1,cursor:saving||!orgName.trim()?'not-allowed':'pointer'}}>
                {saving?'جاري الحفظ...':'التالي'}
              </button>
            </div>
          </div>
        )}

        {/* 3: المنتجات */}
        {step==='products'&&(
          <div className="su">
            {head(Package, 'منتجاتك الأساسية', <>جهّزنا منتجات شائعة لـ<b style={{color:'var(--storely-text)',fontWeight:600}}> {businessType}</b>. اختر اللي عندك واكتب الكمية، وتقدر تضيف الباقي بعدين</>)}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:14,color:'var(--storely-text)',fontWeight:500}}>{selectedCount} منتج مختار</span>
              <div style={{display:'flex',gap:14}}>
                <button onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:true})))} style={{fontSize:13,color:colors.primary,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>تحديد الكل</button>
                <button onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:false})))} style={{fontSize:13,color:'#4b5565',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>إلغاء الكل</button>
              </div>
            </div>
            <div style={{maxHeight:420,overflowY:'auto',marginBottom:20}}>
              {categories.map(cat=>(
                <div key={cat} style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#4b5565',margin:'0 4px 8px'}}>{cat}</div>
                  <div style={{border:'1px solid var(--storely-border)',borderRadius:14,overflow:'hidden'}}>
                  {selectedProducts.filter(p=>p.category===cat).map((p,i)=>{
                    const idx=selectedProducts.findIndex(x=>x.name===p.name&&x.category===p.category)
                    return (
                      <div key={i} className="prod-item">
                        <div className={`check${p.selected?' on':''}`} onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,selected:!x.selected}:x))}>
                          {p.selected&&<Check size={14} strokeWidth={3}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:500,color:'var(--storely-text)'}}>{p.name}</div>
                          <div style={{fontSize:12,color:'#6b7487'}}>{p.unit} · ننبهك تحت {p.reorder}</div>
                        </div>
                        {p.selected&&(
                          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                            <button onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Math.max(0,x.qty-1)}:x))} aria-label="نقص" style={{width:30,height:30,borderRadius:8,border:'none',background:'#eceef1',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--storely-text)'}}><Minus size={14}/></button>
                            <NumberInput min="0" value={p.qty||''} onChange={e=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Number(e.target.value)||0}:x))}
                              style={{width:52,textAlign:'center',border:'1px solid var(--storely-border)',borderRadius:8,padding:'5px',fontSize:16,fontWeight:500,color:'var(--storely-text)',fontFamily:'inherit',outline:'none'}} placeholder="0"/>
                            <button onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:x.qty+1}:x))} aria-label="زيادة" style={{width:30,height:30,borderRadius:8,border:'none',background:'#eceef1',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--storely-text)'}}><Plus size={14}/></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              {back('setup')}
              <button onClick={saveProducts} disabled={saving}
                style={{...btnPrimary,flex:2,padding:'13px',fontSize:16,opacity:saving?.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'جاري الحفظ...':'التالي'}
              </button>
            </div>
          </div>
        )}

        {/* 4: الموظفين */}
        {step==='staff'&&(
          <div className="su">
            {head(Users, 'أضف موظفيك', 'كل موظف يدخل من جواله برقمه ورمز سري نعطيك إياه. هذي الخطوة اختيارية')}
            <div style={{background:'white',border:'1px solid var(--storely-border)',borderRadius:14,padding:16,display:'flex',flexDirection:'column' as const,gap:10,marginBottom:20}}>
              {staffList.map((s,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:staffList.length>1?'1fr 1fr 36px':'1fr 1fr',gap:8,alignItems:'center'}}>
                  <input value={s.name} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,name:e.target.value}:x))} style={{...inp(),fontSize:16}} placeholder="اسم الموظف"/>
                  <input value={s.phone} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} style={{...inp(),direction:'ltr' as const,fontSize:16}} placeholder="05xxxxxxxx"/>
                  {staffList.length>1&&<button onClick={()=>setStaffList(prev=>prev.filter((_,j)=>j!==i))} aria-label="حذف" style={{width:36,height:36,borderRadius:8,background:'transparent',color:'#6b7487',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>}
                </div>
              ))}
              <button onClick={()=>setStaffList(prev=>[...prev,{name:'',phone:''}])} style={{height:44,borderRadius:10,border:'1px dashed #9ca3af',background:'transparent',color:'var(--storely-text)',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Plus size={16} strokeWidth={1.75}/>موظف آخر
              </button>
            </div>
            <div style={{display:'flex',gap:10}}>
              {back(hasInventory ? 'products' : 'setup')}
              <button onClick={saveStaff} disabled={saving}
                style={{...btnPrimary,flex:2,padding:'13px',fontSize:16,opacity:saving?.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'جاري الحفظ...':'إنهاء الإعداد'}
              </button>
            </div>
          </div>
        )}

        {/* 5: جاهز */}
        {step==='done'&&(
          <div className="su">
            <div style={{marginBottom:24}}>
              <span style={{width:56,height:56,borderRadius:16,background:'#f3faf8',color:colors.primary,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,border:'1px solid #cfe8e4'}}><Check size={28} strokeWidth={2}/></span>
              <h1 style={{fontSize:26,fontWeight:600,lineHeight:'36px',color:'var(--storely-text)',marginBottom:6}}>منشأتك جاهزة</h1>
              <p style={{fontSize:15,color:'#4b5565',lineHeight:1.7}}>كل شي جاهز تبدأ فيه. تقدر تعدّل أي شي بعدين من الإعدادات</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:hasInventory?'1fr 1fr':'1fr',background:'white',border:'1px solid var(--storely-border)',borderRadius:14,marginBottom:16}}>
              {hasInventory && <div style={{padding:16}}><div style={{fontSize:26,fontWeight:500,color:'var(--storely-text)',fontVariantNumeric:'tabular-nums'}}>{selectedCount}</div><div style={{fontSize:13,color:'#6b7487'}}>منتج أضفناه</div></div>}
              <div style={{padding:16,borderInlineStart:hasInventory?'1px solid #e5e7eb':'none'}}><div style={{fontSize:26,fontWeight:500,color:'var(--storely-text)',fontVariantNumeric:'tabular-nums'}}>{createdStaff.length}</div><div style={{fontSize:13,color:'#6b7487'}}>موظف أضفناه</div></div>
            </div>
            {createdStaff.length>0&&(
              <div style={{background:'white',border:'1px solid var(--storely-border)',borderRadius:14,padding:16,marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,fontSize:15,fontWeight:600,color:'var(--storely-text)',marginBottom:4}}><KeyRound size={16} strokeWidth={1.75}/>رموز دخول الموظفين</div>
                <p style={{fontSize:13,color:'#4b5565',lineHeight:1.7,marginBottom:10}}>احفظها وأرسلها لكل موظف. يدخل برقم جواله وهذا الرمز، وتقدر تغيّرها من صفحة الموظفين</p>
                {createdStaff.map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid var(--storely-border)',fontSize:15}}>
                    <span style={{color:'var(--storely-text)'}}>{c.name}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",fontWeight:500,fontSize:17,letterSpacing:2,color:'var(--storely-text)',direction:'ltr'}}>{c.pin}</span>
                  </div>
                ))}
              </div>
            )}
            {!pushEnabled ? (
              <div style={{background:'white',border:'1px solid var(--storely-border)',borderRadius:14,padding:16,marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:8,fontSize:15,fontWeight:600,color:'var(--storely-text)',marginBottom:4}}><Bell size={16} strokeWidth={1.75}/>فعّل الإشعارات</div>
                <p style={{fontSize:13,color:'#4b5565',lineHeight:1.7,marginBottom:12}}>يوصلك تنبيه نقص المخزون وإقفال الكاشير وتوريد الموردين أول بأول، حتى لو التطبيق مقفول</p>
                <button onClick={enablePushOnboarding} disabled={pushLoading}
                  style={{...btnSecondary,width:'100%',padding:'12px',fontSize:15}}>
                  {pushLoading?'جاري التفعيل...':'تفعيل الإشعارات'}
                </button>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:8,fontSize:14,color:'#15803d',marginBottom:20}}><Check size={16} strokeWidth={2}/>تم تفعيل الإشعارات</div>
            )}
            <button onClick={()=>router.push('/dashboard')}
              style={{...btnPrimary,width:'100%',padding:'15px',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              ادخل لوحة التحكم<ArrowLeft size={17} strokeWidth={1.75}/>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
