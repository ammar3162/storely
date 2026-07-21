'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

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
  const [branchId, setBranchId]       = useState('')
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [staffList, setStaffList]     = useState<{name:string;phone:string}[]>([{name:'',phone:''}])
  const [saving, setSaving]           = useState(false)
  const [progress, setProgress]       = useState(0)
  const [visible, setVisible]         = useState(false)
  const router = useRouter()
  const sb = createClient()

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
    const{data:{user}}=await sb.auth.getUser(); if(!user){router.push('/login');return}
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single(); if(!profile) return
    const{data:org}=await sb.from('organizations').select('onboarding_done,name,whatsapp_number,business_type').eq('id',profile.org_id).single() as any
    if(org?.onboarding_done){router.push('/dashboard');return}
    setOrgId(profile.org_id)
    if(org?.name) setOrgName(org.name)
    if(org?.whatsapp_number) setWhatsapp(org.whatsapp_number)
    if(org?.business_type) setBusinessType(org.business_type)
    const{data:branch}=await sb.from('branches').select('id').eq('org_id',profile.org_id).eq('is_active',true).order('created_at').limit(1).single()
    if(branch) setBranchId(branch.id)
  }

  async function saveSetup() {
    if(!orgName.trim()){toast('أدخل اسم المنشأة','warning');return}
    setSaving(true)
    await sb.from('organizations').update({name:orgName.trim(),whatsapp_number:whatsapp.trim(),business_type:businessType} as any).eq('id',orgId)
    setSaving(false); setStep('products')
  }

  async function saveProducts() {
    setSaving(true)
    const{data:{user}}=await sb.auth.getUser(); if(!user){setSaving(false);return}
    const toAdd=selectedProducts.filter(p=>p.selected)
    for(const p of toAdd){
      const{data:np}=await sb.from('products').insert({org_id:orgId,branch_id:branchId||null,name:p.name,unit:p.unit,qty:p.qty||0,reorder_point:p.reorder,category:p.category,is_active:true}).select().single()
      if(np&&p.qty>0) await sb.from('stock_movements').insert({product_id:np.id,profile_id:user.id,type:'in',qty_change:p.qty,note:'إضافة أولية عند الإعداد'})
    }
    setSaving(false); setStep('staff')
  }

  async function saveStaff() {
    setSaving(true)
    const toAdd=staffList.filter(s=>s.name.trim()&&s.phone.trim())
    for(const s of toAdd){
      const pin=String(Math.floor(1000+Math.random()*9000))
      await (sb.from('staff_members' as any) as any).insert({org_id:orgId,branch_id:branchId||null,name:s.name.trim(),phone:s.phone.trim(),pin}).catch(()=>{})
    }
    await sb.from('organizations').update({onboarding_done:true} as any).eq('id',orgId)
    setSaving(false); setStep('done')
  }

  async function skipToDashboard() {
    await sb.from('organizations').update({onboarding_done:true} as any).eq('id',orgId)
    router.push('/dashboard')
  }

  const selectedCount=selectedProducts.filter(p=>p.selected).length
  const categories=Array.from(new Set(selectedProducts.map(p=>p.category)))
  const stepNum={business:1,setup:2,products:3,staff:4,done:5}[step]

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',minHeight:'100vh',background:'#f8fafc',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important;outline:none!important}
        .biz-card{border-radius:16px;padding:16px 12px;cursor:pointer;transition:all .2s;border:2px solid #e2e8f0;background:white;font-family:inherit;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
        .biz-card:hover{border-color:${colors.primary};transform:translateY(-2px);box-shadow:0 8px 20px ${colors.primary}22}
        .biz-card.active{border-color:${colors.primary};background:${colors.primaryLight};box-shadow:0 8px 20px ${colors.primary}33}
        .prod-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1.5px solid #e2e8f0;background:white;transition:all .2s;margin-bottom:8px}
        .prod-item.selected{border-color:${colors.primary};background:${colors.primaryLight}}
        .check{width:22px;height:22px;border-radius:6px;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;cursor:pointer}
        .check.on{background:${colors.primary};border-color:${colors.primary}}
        @media(max-width:480px){.biz-grid{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {/* Header */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${colors.primary},#15803d)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'white'}}>S</div>
          <span style={{fontSize:16,fontWeight:800,color:colors.text}}>إعداد Storely</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{display:'flex',gap:6}}>
            {[1,2,3,4].map(n=>(
              <div key={n} style={{width:28,height:28,borderRadius:'50%',background:n<stepNum?colors.primary:n===stepNum?colors.primaryLight:'#f1f5f9',border:`2px solid ${n<=stepNum?colors.primary:'#e2e8f0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:n<stepNum?'white':n===stepNum?colors.primary:'#94a3b8',transition:'all .3s'}}>
                {n<stepNum?'✓':n}
              </div>
            ))}
          </div>
          {step!=='done'&&<button onClick={skipToDashboard} style={{fontSize:12,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>تخطي ←</button>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:3,background:'#e2e8f0'}}>
        <div style={{height:'100%',width:progress+'%',background:`linear-gradient(90deg,${colors.primary},#4ade80)`,transition:'width .5s ease',borderRadius:99}}/>
      </div>

      <div style={{maxWidth:640,margin:'0 auto',padding:'32px 20px'}}>

        {/* Step 1 */}
        {step==='business'&&(
          <div className="su">
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{fontSize:48,marginBottom:12}}>👋</div>
              <h1 style={{fontSize:26,fontWeight:900,color:colors.text,marginBottom:8}}>أهلاً بك في Storely!</h1>
              <p style={{fontSize:15,color:'#64748b',lineHeight:1.7}}>ما هو نشاطك التجاري؟ سنجهّز لك المخزون بناءً على اختيارك</p>
            </div>
            <div className="biz-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:32}}>
              {BUSINESS_TYPES.map(b=>(
                <button key={b.id} className={`biz-card${businessType===b.id?' active':''}`} onClick={()=>setBusinessType(b.id)}>
                  <span style={{fontSize:28}}>{b.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:businessType===b.id?colors.primary:colors.text}}>{b.id}</span>
                  <span style={{fontSize:10,color:'#94a3b8',lineHeight:1.3}}>{b.desc}</span>
                </button>
              ))}
            </div>
            <button disabled={!businessType} onClick={()=>setStep('setup')}
              style={{...btnPrimary,width:'100%',padding:'15px',fontSize:16,opacity:!businessType?.5:1,cursor:!businessType?'not-allowed':'pointer'}}>
              التالي ← بيانات المنشأة
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step==='setup'&&(
          <div className="su">
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{fontSize:40,marginBottom:10}}>{BUSINESS_TYPES.find(b=>b.id===businessType)?.icon||'🏢'}</div>
              <h1 style={{fontSize:24,fontWeight:900,color:colors.text,marginBottom:8}}>بيانات منشأتك</h1>
              <p style={{fontSize:14,color:'#64748b'}}>أدخل اسم منشأتك ورقم الواتساب للتنبيهات</p>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:16,marginBottom:28}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>اسم المنشأة *</label>
                <input value={orgName} onChange={e=>setOrgName(e.target.value)} style={{...inp(),fontSize:16}} placeholder={`مثال: ${businessType} الأصيل`}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>رقم واتساب التنبيهات</label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} style={{...inp(),direction:'ltr' as const}} placeholder="+966500000000"/>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:5}}>ستصلك تنبيهات عند نقص المخزون</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep('business')} style={{...btnSecondary,flex:1,padding:'14px'}}>← السابق</button>
              <button onClick={saveSetup} disabled={saving||!orgName.trim()}
                style={{...btnPrimary,flex:2,padding:'14px',fontSize:15,opacity:saving||!orgName.trim()?.5:1,cursor:saving||!orgName.trim()?'not-allowed':'pointer'}}>
                {saving?'جاري الحفظ...':'التالي ← إعداد المخزون'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step==='products'&&(
          <div className="su">
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>📦</div>
              <h1 style={{fontSize:22,fontWeight:900,color:colors.text,marginBottom:6}}>اختر منتجاتك الابتدائية</h1>
              <p style={{fontSize:13,color:'#64748b'}}>منتجات شائعة لـ <b style={{color:colors.primary}}>{businessType}</b> — عدّل الكميات أو أضف لاحقاً</p>
            </div>
            <div style={{background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:12,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:colors.primary,fontWeight:700}}>✅ {selectedCount} منتج مختار</span>
              <div style={{display:'flex',gap:12}}>
                <button onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:true})))} style={{fontSize:11,color:colors.primary,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>تحديد الكل</button>
                <button onClick={()=>setSelectedProducts(p=>p.map(x=>({...x,selected:false})))} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>إلغاء الكل</button>
              </div>
            </div>
            <div style={{maxHeight:400,overflowY:'auto',marginBottom:16,paddingLeft:2}}>
              {categories.map(cat=>(
                <div key={cat} style={{marginBottom:18}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{height:1,background:'#e2e8f0',flex:1}}/>
                    <span style={{background:'#f1f5f9',padding:'4px 12px',borderRadius:20,fontSize:12,color:'#475569',fontWeight:700}}>{cat}</span>
                    <div style={{height:1,background:'#e2e8f0',flex:1}}/>
                  </div>
                  {selectedProducts.filter(p=>p.category===cat).map((p,i)=>{
                    const idx=selectedProducts.findIndex(x=>x.name===p.name&&x.category===p.category)
                    return (
                      <div key={i} className={`prod-item${p.selected?' selected':''}`}>
                        <div className={`check${p.selected?' on':''}`} onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,selected:!x.selected}:x))}>
                          {p.selected&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:colors.text}}>{p.name}</div>
                          <div style={{fontSize:11,color:'#94a3b8'}}>{p.unit} · حد أدنى: {p.reorder}</div>
                        </div>
                        {p.selected&&(
                          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                            <button onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Math.max(0,x.qty-1)}:x))} style={{width:26,height:26,borderRadius:8,border:`1px solid ${colors.border}`,background:'white',cursor:'pointer',fontSize:16,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                            <input type="number" min="0" value={p.qty||''} onChange={e=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:Number(e.target.value)||0}:x))}
                              style={{width:50,textAlign:'center',border:`1.5px solid ${colors.border}`,borderRadius:8,padding:'4px',fontSize:14,fontWeight:700,color:colors.text,fontFamily:'inherit',outline:'none'}} placeholder="0"/>
                            <button onClick={()=>setSelectedProducts(prev=>prev.map((x,j)=>j===idx?{...x,qty:x.qty+1}:x))} style={{width:26,height:26,borderRadius:8,border:`1px solid ${colors.primary}`,background:colors.primaryLight,cursor:'pointer',fontSize:16,fontWeight:700,color:colors.primary,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                            <span style={{fontSize:11,color:'#94a3b8'}}>{p.unit}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep('setup')} style={{...btnSecondary,flex:1,padding:'13px'}}>← السابق</button>
              <button onClick={saveProducts} disabled={saving}
                style={{...btnPrimary,flex:2,padding:'13px',fontSize:15,opacity:saving?.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'⏳ جاري الحفظ...':'التالي ← إضافة الموظفين'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step==='staff'&&(
          <div className="su">
            <div style={{textAlign:'center',marginBottom:28}}>
              <div style={{fontSize:40,marginBottom:10}}>👥</div>
              <h1 style={{fontSize:22,fontWeight:900,color:colors.text,marginBottom:6}}>أضف موظفيك</h1>
              <p style={{fontSize:14,color:'#64748b'}}>اختياري — يمكنك إضافتهم لاحقاً من صفحة الموظفين</p>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:10,marginBottom:20}}>
              {staffList.map((s,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'center'}}>
                  <input value={s.name} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,name:e.target.value}:x))} style={inp()} placeholder="اسم الموظف"/>
                  <input value={s.phone} onChange={e=>setStaffList(prev=>prev.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} style={{...inp(),direction:'ltr' as const}} placeholder="05xxxxxxxx"/>
                  {staffList.length>1&&<button onClick={()=>setStaffList(prev=>prev.filter((_,j)=>j!==i))} style={{width:32,height:32,borderRadius:8,background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>}
                </div>
              ))}
              <button onClick={()=>setStaffList(prev=>[...prev,{name:'',phone:''}])} style={{...btnSecondary,padding:'10px',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                + إضافة موظف آخر
              </button>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep('products')} style={{...btnSecondary,flex:1,padding:'13px'}}>← السابق</button>
              <button onClick={saveStaff} disabled={saving}
                style={{...btnPrimary,flex:2,padding:'13px',fontSize:15,opacity:saving?.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'⏳ جاري الحفظ...':'إنهاء الإعداد 🎉'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step==='done'&&(
          <div className="su" style={{textAlign:'center',paddingTop:40}}>
            <div style={{fontSize:72,marginBottom:16}}>🎉</div>
            <h1 style={{fontSize:30,fontWeight:900,color:colors.text,marginBottom:10}}>منشأتك جاهزة!</h1>
            <p style={{fontSize:15,color:'#64748b',marginBottom:36,lineHeight:1.8}}>تم إعداد مخزونك بنجاح. يمكنك الآن البدء بإدارة مخزونك باحترافية.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:36}}>
              {[
                {icon:'📦',label:'منتج أُضيف',value:selectedCount},
                {icon:'👥',label:'موظف أُضيف',value:staffList.filter(s=>s.name.trim()&&s.phone.trim()).length},
                {icon:'✅',label:'الإعداد مكتمل',value:'100%'},
              ].map((s,i)=>(
                <div key={i} style={{background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:16,padding:'20px 12px'}}>
                  <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:24,fontWeight:900,color:colors.primary}}>{s.value}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>router.push('/dashboard')}
              style={{...btnPrimary,width:'100%',padding:'16px',fontSize:17,boxShadow:`0 8px 24px ${colors.primary}33`}}>
              ابدأ استخدام Storely ←
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
