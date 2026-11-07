'use client'
import { StorelyButton, StorelyPageHeader } from '@/components/ui'
import { Bell, CheckCircle2, CircleCheck, Hand, KeyRound, Package, Users, Utensils, Coffee, Wheat, ShoppingCart, Pill, Warehouse, ShoppingBag, Building2 } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { colors } from '@/lib/ds'
import { toast } from '@/components/toast'

const BUSINESS_ICONS: Record<string, React.ReactNode> = { '🍔':<Utensils size={22}/>, '☕':<Coffee size={22}/>, '🥖':<Wheat size={22}/>, '🛒':<ShoppingCart size={22}/>, '💊':<Pill size={22}/>, '🏭':<Warehouse size={22}/>, '🛍️':<ShoppingBag size={22}/>, '🏢':<Building2 size={22}/>, '📦':<Package size={22}/>, '👥':<Users size={22}/>, '✅':<CheckCircle2 size={22}/> }

const BUSINESS_TYPES = [
  { id:'مطعم',          icon:'🍔', desc:'مطاعم ووجبات سريعة' },
  { id:'كوفي',          icon:'☕', desc:'كافيهات ومحلات قهوة' },
  { id:'مخبز',          icon:'🥖', desc:'مخابز وحلويات' },
  { id:'بقالة',         icon:'🛒', desc:'بقالة وسوبرماركت' },
  { id:'صيدلية',        icon:'💊', desc:'صيدليات ومستلزمات طبية' },
  { id:'مستودع',        icon:'🏭', desc:'مستودعات وتوزيع' },
  { id:'متجر إلكتروني', icon:'🛍️', desc:'متاجر أونلاين وشحن' },
  { id:'أخرى',          icon:'🏢', desc:'نشاط تجاري آخر' },
]

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
    { category:'قهوة وشاي', products:[{name:'قهوة عربية',unit:'كيلو',reorder:2},{name:'قهوة إسبريسو',unit:'كيلو',reorder:2},{name:'شاي أحمر',unit:'كيلو',reorder:1}] },
    { category:'حليب وكريمة', products:[{name:'حليب طازج',unit:'لتر',reorder:5},{name:'كريمة سائلة',unit:'لتر',reorder:3},{name:'حليب اللوز',unit:'لتر',reorder:2}] },
    { category:'سكر ومحليات', products:[{name:'سكر أبيض',unit:'كيلو',reorder:2},{name:'سكر بني',unit:'كيلو',reorder:1},{name:'عسل',unit:'كيلو',reorder:1}] },
    { category:'أكواب وأغطية', products:[{name:'أكواب ورقية S',unit:'كرتون',reorder:2},{name:'أكواب ورقية L',unit:'كرتون',reorder:2},{name:'أغطية أكواب',unit:'كرتون',reorder:2}] },
    { category:'حلويات ومعجنات', products:[{name:'كيك',unit:'قطعة',reorder:5},{name:'كرواسون',unit:'قطعة',reorder:5}] },
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
      if (typeof Notification === 'undefined') { alert('⚠️ متصفحك لا يدعم الإشعارات إطلاقاً'); setPushLoading(false); return }
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

  useEffect(()=>{ loadOrg(); setTimeout(()=>setVisible(true),50) },[])
  useEffect(()=>{ const s:Step[]=['business','setup','products','staff','done']; setProgress((s.indexOf(step)/4)*100) },[step])
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
    setStep('products')
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
  const stepNum={business:1,setup:2,products:3,staff:4,done:5}[step]

  return (
    <div className="min-h-screen text-[var(--storely-navy)]" style={{direction:'rtl', background:uiTokens.color.background, opacity:visible?1:0}}>

      {/* Header */}
      <div className="!py-4 !px-6 flex justify-between items-center sticky flex-wrap gap-4" style={{background:uiTokens.color.surface, borderBottom:`1px solid ${uiTokens.color.border}`, top:0, zIndex:100, boxShadow:uiTokens.shadow.surface}}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[var(--radius-sm)] flex items-center justify-center text-base font-semibold" style={{width:40, height:40, background:uiTokens.color.navy, color:uiTokens.color.onPrimary}}>S</div>
          <span className="text-base font-semibold" style={{color:colors.text}}>إعداد Storely</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {[1,2,3,4].map(n=>(
              <div key={n} className="rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-semibold" style={{width:28, height:28, background:n<stepNum?colors.primary:n===stepNum?colors.primaryLight:uiTokens.color.background, border:`2px solid ${n<=stepNum?colors.primary:uiTokens.color.border}`, color:n<stepNum?uiTokens.color.surface:n===stepNum?colors.primary:uiTokens.color.textMuted}}>
                {n<stepNum?'✓':n}
              </div>
            ))}
          </div>
          {step!=='done'&&<StorelyButton onClick={skipToDashboard} variant="secondary">تخطي ←</StorelyButton>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:3, background:uiTokens.color.background}}>
        <div className="rounded-[var(--radius)]" style={{height:'100%', width:progress+'%', background:uiTokens.color.navy}}/>
      </div>

      <div className="max-w-4xl !my-0 !mx-auto !py-8 !px-5">

        {/* Step 1 */}
        {step==='business'&&(
          <div className="min-w-0">
            <div className="text-center !mb-8">
              <div className="text-2xl !mb-3"><Hand size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
              <StorelyPageHeader title={<> أهلاً بك في Storely! </>} className="!mb-2" />
              <p className="text-base" style={{color:uiTokens.color.textMuted, lineHeight:1.7}}>ما هو نشاطك التجاري؟ سنجهّز لك المخزون بناءً على اختيارك</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 !mb-8">
              {BUSINESS_TYPES.map(b=>(
                <StorelyButton key={b.id} onClick={()=>setBusinessType(b.id)} className="!flex-col !p-4 !h-auto min-h-36 !whitespace-normal" style={{borderColor:businessType===b.id?uiTokens.color.navy:uiTokens.color.border}}>
                  <span className="text-[28px]">{BUSINESS_ICONS[b.icon]}</span>
                  <span className="text-sm font-semibold" style={{color:businessType===b.id?colors.primary:colors.text}}>{b.id}</span>
                  <span className="text-xs" style={{color:uiTokens.color.textMuted, lineHeight:1.3}}>{b.desc}</span>
                </StorelyButton>
              ))}
            </div>
            <StorelyButton disabled={!businessType} onClick={()=>setStep('setup')} className="w-full" variant="primary">
              التالي ← بيانات المنشأة
            </StorelyButton>
          </div>
        )}

        {/* Step 2 */}
        {step==='setup'&&(
          <div className="min-w-0">
            <div className="text-center !mb-8">
              <div className="text-2xl !mb-2">{BUSINESS_ICONS[BUSINESS_TYPES.find(b=>b.id===businessType)?.icon||'🏢']}</div>
              <StorelyPageHeader title={<> بيانات منشأتك </>} className="!mb-2" />
              <p className="text-sm" style={{color:uiTokens.color.textMuted}}>أدخل اسم منشأتك ورقم الواتساب للتنبيهات</p>
            </div>
            <div className="flex flex-col gap-4 !mb-6">
              <div>
                <label className="text-sm font-semibold block !mb-1" style={{color:uiTokens.color.text, textTransform:'uppercase' as const}}>اسم المنشأة *</label>
                <input value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder={`مثال: ${businessType} الأصيل`} className="storely-input !text-base min-w-0"/>
              </div>
              <div>
                <label className="text-sm font-semibold block !mb-1" style={{color:uiTokens.color.text, textTransform:'uppercase' as const}}>رقم واتساب التنبيهات</label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="+966500000000" className="storely-input min-w-0" style={{direction:'ltr' as const}}/>
                <div className="text-xs !mt-1" style={{color:uiTokens.color.textMuted}}>ستصلك تنبيهات عند نقص المخزون</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={()=>setStep('business')} className="min-w-0 flex-1" variant="secondary">← السابق</StorelyButton>
              <StorelyButton onClick={saveSetup} disabled={saving||!orgName.trim()} style={{flex:2}} variant="primary">
                {saving?'جاري الحفظ...':'التالي ← إعداد المخزون'}
              </StorelyButton>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step==='products'&&(
          <div className="min-w-0">
            <div className="text-center !mb-5">
              <div className="text-2xl !mb-2"><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
              <StorelyPageHeader title={<> اختر منتجاتك الابتدائية </>} className="!mb-2" />
              <p className="text-sm" style={{color:uiTokens.color.textMuted}}>منتجات شائعة لـ <b  style={{color:colors.primary}}>{businessType}</b> — عدّل الكميات أو أضف لاحقاً</p>
            </div>
            <div className="rounded-[var(--radius)] !py-2 !px-4 !mb-4 flex justify-between items-center flex-wrap gap-4" style={{background:colors.primaryLight, border:`1px solid ${colors.primaryBorder}`}}>
              <span className="text-sm font-semibold" style={{color:colors.primary}}><CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {selectedCount} منتج مختار</span>
              <div className="flex gap-3">
                <StorelyButton onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:true})))} style={{color:colors.primary}} variant="secondary">تحديد الكل</StorelyButton>
                <StorelyButton onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:false})))} variant="secondary">إلغاء الكل</StorelyButton>
              </div>
            </div>
            <div className="overflow-y-auto !mb-4 !pl-0" style={{maxHeight:400}}>
              {categories.map(cat=>(
                <div key={cat} className="!mb-4">
                  <div className="flex items-center gap-2 !mb-2">
                    <div className="min-w-0 flex-1" style={{height:1, background:uiTokens.color.background}}/>
                    <span className="!py-1 !px-3 rounded-[var(--radius)] text-sm font-semibold" style={{background:uiTokens.color.background, color:uiTokens.color.textMuted}}>{cat}</span>
                    <div className="min-w-0 flex-1" style={{height:1, background:uiTokens.color.background}}/>
                  </div>
                  {selectedProducts.filter(p=>p.category===cat).map((p,i)=>{
                    const idx=selectedProducts.findIndex(x=>x.name===p.name&&x.category===p.category)
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border bg-white !p-4 !mb-3" style={{borderColor:p.selected?uiTokens.color.navy:uiTokens.color.border}}>
                        <div className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border" style={{background:p.selected?uiTokens.color.navy:uiTokens.color.surface,borderColor:p.selected?uiTokens.color.navy:uiTokens.color.border}} onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,selected:!x.selected}:x))}>
                          {p.selected&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                        <div className="min-w-0 flex-1" style={{minWidth:0}}>
                          <div className="text-sm font-semibold" style={{color:colors.text}}>{p.name}</div>
                          <div className="text-xs" style={{color:uiTokens.color.textMuted}}>{p.unit} · حد أدنى: {p.reorder}</div>
                        </div>
                        {p.selected&&(
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <StorelyButton onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Math.max(0,x.qty-1)}:x))} className="flex items-center justify-center !px-0" style={{width:40, height:40, border:`1px solid ${colors.border}`, color:colors.text}} variant="secondary">−</StorelyButton>
                            <input type="number" min="0" value={p.qty||''} onChange={e=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Number(e.target.value)||0}:x))} placeholder="0" className="text-center rounded-[var(--radius-sm)] text-sm font-semibold storely-input min-w-0" style={{width:64, border:`1.5px solid ${colors.border}`, color:colors.text}}/>
                            <StorelyButton onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:x.qty+1}:x))} className="flex items-center justify-center !px-0" style={{width:40, height:40, border:`1px solid ${colors.primary}`, background:colors.primaryLight, color:colors.primary}} variant="secondary">+</StorelyButton>
                            <span className="text-xs" style={{color:uiTokens.color.textMuted}}>{p.unit}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={()=>setStep('setup')} className="min-w-0 flex-1" variant="secondary">← السابق</StorelyButton>
              <StorelyButton onClick={saveProducts} disabled={saving} style={{flex:2}} variant="primary">
                {saving?'⏳ جاري الحفظ...':'التالي ← إضافة الموظفين'}
              </StorelyButton>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step==='staff'&&(
          <div className="min-w-0">
            <div className="text-center !mb-6">
              <div className="text-2xl !mb-2"><Users size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
              <StorelyPageHeader title={<> أضف موظفيك </>} className="!mb-2" />
              <p className="text-sm" style={{color:uiTokens.color.textMuted}}>اختياري — يمكنك إضافتهم لاحقاً من صفحة الموظفين</p>
            </div>
            <div className="flex flex-col gap-2 !mb-5">
              {staffList.map((s,i)=>(
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input value={s.name} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="اسم الموظف" className="storely-input"/>
                  <input value={s.phone} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} placeholder="05xxxxxxxx" className="storely-input min-w-0" style={{direction:'ltr' as const}}/>
                  {staffList.length>1&&<StorelyButton onClick={()=>setStaffList(prev=>prev.filter((_,j)=>j!==i))} className="flex items-center justify-center !px-0" style={{width:40, height:40, background:colors.dangerLight, color:colors.danger, border:`1px solid ${colors.dangerBorder}`}} variant="danger">×</StorelyButton>}
                </div>
              ))}
              <StorelyButton onClick={()=>setStaffList(prev=>[...prev,{name:'',phone:''}])} className="flex items-center justify-center gap-2" variant="secondary">
                + إضافة موظف آخر
              </StorelyButton>
            </div>
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={()=>setStep('products')} className="min-w-0 flex-1" variant="secondary">← السابق</StorelyButton>
              <StorelyButton onClick={saveStaff} disabled={saving} style={{flex:2}} variant="primary">
                {saving?'⏳ جاري الحفظ...':'إنهاء الإعداد 🎉'}
              </StorelyButton>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step==='done'&&(
          <div className="text-center !pt-8">
            <div className="text-2xl !mb-4"><CircleCheck size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <StorelyPageHeader title={<> منشأتك جاهزة! </>} className="!mb-2" />
            <p className="text-base !mb-8" style={{color:uiTokens.color.textMuted, lineHeight:1.8}}>تم إعداد مخزونك بنجاح. يمكنك الآن البدء بإدارة مخزونك باحترافية.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 !mb-8">
              {[
                {icon:'📦',label:'منتج أُضيف',value:selectedCount},
                {icon:'👥',label:'موظف أُضيف',value:createdStaff.length},
                {icon:'✅',label:'الإعداد مكتمل',value:'100%'},
              ].map((s,i)=>(
                <div key={i} className="rounded-[var(--radius)] !py-5 !px-3" style={{background:colors.primaryLight, border:`1.5px solid ${colors.primaryBorder}`}}>
                  <div className="text-[28px] !mb-2">{BUSINESS_ICONS[s.icon]}</div>
                  <div className="text-2xl font-semibold" style={{color:colors.primary}}>{s.value}</div>
                  <div className="text-xs !mt-1" style={{color:uiTokens.color.textMuted}}>{s.label}</div>
                </div>
              ))}
            </div>
            {createdStaff.length>0&&(
              <div className="rounded-[var(--radius)] !p-4 !mb-4 text-right" style={{background:uiTokens.color.warningBg, border:`1px solid ${uiTokens.color.warningBorder}`}}>
                <div className="text-base font-semibold !mb-1" style={{color:colors.text}}><KeyRound size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> رموز دخول الموظفين</div>
                <p className="text-sm !mb-2" style={{color:uiTokens.color.textMuted, lineHeight:1.7}}>احفظها وأرسلها لكل موظف — يدخل برقم جواله وهذا الرمز. تقدر تغيّرها لاحقاً من صفحة الموظفين.</p>
                {createdStaff.map((c,i)=>(
                  <div key={i} className="flex justify-between !py-2 !px-0 text-sm flex-wrap gap-4" style={{borderTop:i?`1px solid ${uiTokens.color.warningBorder}`:'none'}}>
                    <span className="font-semibold" style={{color:colors.text}}>{c.name}</span>
                    <span className="font-semibold text-base" style={{letterSpacing:2, color:colors.primary}}>{c.pin}</span>
                  </div>
                ))}
              </div>
            )}
            {!pushEnabled ? (
              <div className="rounded-[var(--radius)] !p-5 !mb-4 text-right" style={{background:colors.primaryLight, border:`1.5px solid ${colors.primaryBorder}`}}>
                <div className="flex items-center gap-2 !mb-2">
                  <span className="text-2xl"><Bell size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                  <div className="text-base font-semibold" style={{color:colors.text}}>فعّل الإشعارات الفورية</div>
                </div>
                <p className="text-sm !mb-3" style={{color:uiTokens.color.textMuted, lineHeight:1.8}}>
                  توصلك تنبيهات نقص المخزون وإقفال الكاشير وتوريدات الموردين فوراً — حتى لو التطبيق مقفول بالكامل.
                </p>
                <StorelyButton onClick={enablePushOnboarding} disabled={pushLoading} className="w-full" variant="primary">
                  {pushLoading?'⏳ جاري التفعيل...':'🔔 فعّل الإشعارات الآن'}
                </StorelyButton>
              </div>
            ) : (
              <div className="rounded-[var(--radius)] !p-3 !mb-4 flex items-center gap-2 justify-center" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <span className="text-base"><CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                <span className="text-sm font-semibold" style={{color:uiTokens.color.navy}}>تم تفعيل الإشعارات بنجاح</span>
              </div>
            )}
            <StorelyButton onClick={()=>router.push('/dashboard')} className="w-full" variant="primary">
              ابدأ استخدام Storely ←
            </StorelyButton>
          </div>
        )}

      </div>
    </div>
  )
}
