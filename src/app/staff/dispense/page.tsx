'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'
import { Wheat, Milk, SprayCan, CupSoda, Drumstick, Carrot, FileText, Package, Tag, Search, Globe, Home, LogOut, Send, Boxes, ShoppingCart, ChevronLeft, CheckCircle2, Zap } from 'lucide-react'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const CATEGORY_COLORS = ['#029FA2','#2563eb','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#4f46e5']
const OTHER_CATEGORY = 'أخرى'
const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','رول','غرام']

const LANGUAGES = [
  {code:'ar',label:'العربية'},{code:'en',label:'English'},{code:'ur',label:'اردو'},
  {code:'hi',label:'हिन्दी'},{code:'tl',label:'Tagalog'},{code:'bn',label:'বাংলা'},{code:'fr',label:'Français'},
]

const UI: Record<string,Record<string,string>> = {
  logout:        {ar:'خروج',en:'Logout',ur:'لاگ آؤٹ',hi:'लॉगआउट',tl:'Lumabas',bn:'লগআউট',fr:'Déconnexion'},
  search:        {ar:'ابحث بالاسم...',en:'Search by name...',ur:'نام سے تلاش...',hi:'नाम से खोजें...',tl:'Maghanap...',bn:'নাম দিয়ে খুঁজুন...',fr:'Rechercher...'},
  back:          {ar:'رجوع',en:'Back',ur:'واپس',hi:'वापस',tl:'Bumalik',bn:'ফিরে যান',fr:'Retour'},
  items:         {ar:'صنف',en:'items',ur:'اشیاء',hi:'आइटम',tl:'items',bn:'আইটেম',fr:'articles'},
  noResults:     {ar:'لا توجد نتائج',en:'No results',ur:'کوئی نتیجہ نہیں',hi:'कोई परिणाम नहीं',tl:'Walang resulta',bn:'কোনো ফলাফল নেই',fr:'Aucun résultat'},
  loading:       {ar:'جاري التحميل...',en:'Loading...',ur:'لوڈ ہو رہا ہے...',hi:'लोड हो रहा है...',tl:'Naglo-load...',bn:'লোড হচ্ছে...',fr:'Chargement...'},
  available:     {ar:'المتاح',en:'Available',ur:'دستیاب',hi:'उपलब्ध',tl:'Available',bn:'উপলব্ধ',fr:'Disponible'},
  qty:           {ar:'الكمية المراد صرفها',en:'Quantity to dispense',ur:'تقسیم کی مقدار',hi:'वितरित करने की मात्रा',tl:'Dami',bn:'পরিমাণ',fr:'Quantité'},
  confirm:       {ar:'✓ تسجيل الصرف',en:'✓ Confirm',ur:'✓ تصدیق',hi:'✓ पुष्टि करें',tl:'✓ Kumpirmahin',bn:'✓ নিশ্চিত করুন',fr:'✓ Confirmer'},
  saving:        {ar:'جاري الحفظ...',en:'Saving...',ur:'محفوظ ہو رہا ہے...',hi:'सहेजा जा रहा है...',tl:'Sine-save...',bn:'সংরক্ষণ হচ্ছে...',fr:'Enregistrement...'},
  success:       {ar:'✅ تم الصرف بنجاح',en:'✅ Dispensed!',ur:'✅ کامیاب',hi:'✅ सफल',tl:'✅ Matagumpay',bn:'✅ সফল',fr:'✅ Succès'},
  tooMuch:       {ar:'الكمية أكبر من المتاح',en:'Exceeds available',ur:'مقدار زیادہ ہے',hi:'मात्रा अधिक है',tl:'Sobra sa available',bn:'পরিমাণ বেশি',fr:'Quantité dépassée'},
  error:         {ar:'حدث خطأ، حاول مرة أخرى',en:'Error, try again',ur:'خرابی، دوبارہ کوشش کریں',hi:'त्रुटि, फिर से प्रयास करें',tl:'May error',bn:'ত্রুটি হয়েছে',fr:'Erreur, réessayez'},
  translating:   {ar:'⏳ جاري تجهيز الترجمة...',en:'⏳ Preparing translation...',ur:'⏳ ترجمہ تیار ہو رہا ہے...',hi:'⏳ अनुवाद तैयार हो रहा है...',tl:'⏳ Inihahanda...',bn:'⏳ অনুবাদ হচ্ছে...',fr:'⏳ Traduction en cours...'},
}

const T = (key: string, lang: string) => UI[key]?.[lang] || UI[key]?.ar || key

function colorFor(cat: string) {
  // لون ثابت حسب اسم الفئة نفسه — مو حسب ترتيبها بقائمة متغيّرة (كانت تتغيّر مع تغيّر نمط الاستخدام)
  let hash = 0
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) >>> 0
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]
}

function iconFor(cat: string, size = 20) {
  const c = (cat||'').toLowerCase()
  const p = { size, strokeWidth: 2 }
  if(c.includes('غذائ')||c.includes('طعام')||c.includes('اكل')||c.includes('أكل')||c.includes('خبز')) return <Wheat {...p}/>
  if(c.includes('لبن')||c.includes('حليب')||c.includes('بيض')||c.includes('ألبان')||c.includes('جبن')) return <Milk {...p}/>
  if(c.includes('نظاف')||c.includes('تنظيف')) return <SprayCan {...p}/>
  if(c.includes('مشروب')||c.includes('عصير')) return <CupSoda {...p}/>
  if(c.includes('لحم')||c.includes('دجاج')) return <Drumstick {...p}/>
  if(c.includes('خضار')||c.includes('فواكه')) return <Carrot {...p}/>
  if(c.includes('ورق')||c.includes('مكتب')) return <FileText {...p}/>
  if(c === 'أخرى' || c.includes('اخرى')) return <Package {...p}/>
  return <Tag {...p}/>
}

function StaffPageInner() {
  const searchParams = useSearchParams()
  const forcedTab = searchParams.get('tab') as 'dispense'|'inventory'|'purchases'|'reports'|null
  const [session, setSession] = useState<StaffSession|null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [reauthPin, setReauthPin] = useState('')
  const [reauthError, setReauthError] = useState('')
  const [reauthLoading, setReauthLoading] = useState(false)
  const [tab, setTab] = useState<'dispense'|'inventory'|'purchases'|'reports'>('dispense')
  const [products, setProducts] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string,Record<string,string>>>({})
  const [lang, setLang] = useState('ar')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string|null>(null)
  const [mostUsed, setMostUsed] = useState<any[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [dispenseQty, setDispenseQty] = useState('')
  const [wasteMode, setWasteMode] = useState(false)
  const [wasteReason, setWasteReason] = useState('')
  const [wasteNote, setWasteNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'}|null>(null)
  // inventory
  const [invSearch, setInvSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<any|null>(null)
  const [editQty, setEditQty] = useState('')
  const [savingQty, setSavingQty] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({name:'',qty:'',unit:'قطعة',category:''})
  const [savingProduct, setSavingProduct] = useState(false)
  const [invCategory, setInvCategory] = useState<string|null>(null)

  const router = useRouter()

  // Permissions polling
  useEffect(()=>{
    async function checkPermissions() {
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved)
      try {
        const permToken = localStorage.getItem('staff_token')
        const res = await fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${permToken}`},body:JSON.stringify({})})
        if(res.status===403){
          // انتهى اشتراك المنشأة — قفل كامل للصفحة، إعادة إدخال PIN ما بتحل شي هنا
          setSubscriptionExpired(true)
          return
        }
        if(res.status===401){
          // انتهت الجلسة — نطلب PIN فقط بدل تسجيل خروج كامل
          setNeedsReauth(true)
          return
        }
        if(res.ok){
          const data = await res.json()
          if(data.deleted){
            localStorage.removeItem('staff_session')
            router.push('/staff')
            return
          }
          if(data.permissions){
            const updated = {...s,permissions:data.permissions}
            localStorage.setItem('staff_session',JSON.stringify(updated))
            setSession(prev=>prev?{...prev,permissions:data.permissions}:prev)
          }
        }
      } catch {}
    }
    checkPermissions()
    const interval = setInterval(checkPermissions, 5000)
    return ()=>clearInterval(interval)
  },[])

  useEffect(()=>{
    const productsInterval = setInterval(()=>{
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved) as StaffSession
      refreshProductsQuietly(s)
    }, 30000)
    return ()=>clearInterval(productsInterval)
  },[])

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){router.push('/staff');return}
    const s = JSON.parse(saved) as StaffSession
    const p = s.permissions
    setSession(s)
    if(forcedTab && p && (p as any)[forcedTab]){
      setTab(forcedTab)
    } else if(p && !p.dispense){
      if(p.inventory) setTab('inventory')
      else if(p.purchases) setTab('purchases')
      else if(p.reports) setTab('reports')
    }
    loadProducts(s)
    loadStats(s)
    getStaffOrg().then(org=>{ if(org?.logo_url) setOrgLogo(org.logo_url) })
    const savedLang = localStorage.getItem('staff_lang')
    if(savedLang) setLang(savedLang)
  },[])

  useEffect(()=>{
    if(session && products.length > 0 && lang !== 'ar') fetchTranslation(session, lang)
  },[session, products, lang])

  async function loadStats(s: StaffSession) {
    try {
      const statsToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-dispense-stats',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${statsToken}`},body:JSON.stringify({branch_id:s.branch_id})})
      const d = await res.json()
      setMostUsed(d.mostUsed||[])
      setTodayCount(d.todayCount||0)
    } catch {}
  }

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({branchId:s.branch_id})})
      const data = await res.json()
      setProducts(data.products || [])
    } catch { setProducts([]) }
    setLoading(false)
  }

  async function refreshProductsQuietly(s: StaffSession) {
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({branchId:s.branch_id})})
      const data = await res.json()
      setProducts(data.products || [])
    } catch {}
  }

  async function fetchTranslation(s: StaffSession, targetLang: string) {
    setTranslating(true)
    try {
      const transToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/translate-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${transToken}`},body:JSON.stringify({branchId:s.branch_id,targetLang})})
      const data = await res.json()
      setTranslations(prev=>({...prev,[targetLang]:data.translations||{}}))
    } catch {}
    setTranslating(false)
  }

  function showMsg(msg: string, type: 'success'|'error' = 'success') {
    setToast({msg,type})
    setTimeout(()=>setToast(null), 2500)
  }

  function tx(text: string) {
    if(lang === 'ar') return text
    return translations[lang]?.[text?.trim()] || text
  }

  async function handleDispense() {
    if(!session||!selected||!dispenseQty||Number(dispenseQty)<=0){showMsg(T('error',lang),'error');return}
    if(Number(dispenseQty)>selected.qty){showMsg(T('tooMuch',lang),'error');return}
    setSubmitting(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-dispense',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:selected.id,qty:Number(dispenseQty),staffName:session.name})})
      if(!res.ok){
        // انتهاء الجلسة ← نطلب PIN؛ غير كذا نعرض سبب الخطأ الفعلي بدل رسالة عامة
        if(res.status===401){ setNeedsReauth(true); setSubmitting(false); return }
        const err = await res.json().catch(()=>({}))
        showMsg(err.error || `${T('error',lang)} (${res.status})`,'error');setSubmitting(false);return
      }
      fetch('/api/notify-staff-dispense',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({staff_name:session.name,product_name:selected.name,qty:Number(dispenseQty),unit:selected.unit})}).catch(()=>{})
      fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({org_id:session.org_id,product_id:selected.id,new_qty:selected.qty-Number(dispenseQty),reorder_point:(selected.supplier_reorder_point ?? selected.reorder_point)})}).catch(()=>{})
      showMsg(T('success',lang))
      setSelected(null); setDispenseQty('')
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||'تعذر الاتصال'}`,'error') }
    setSubmitting(false)
  }

  const WASTE_REASONS = ['تالف','منتهي الصلاحية','كسر','سرقة/فقدان','خطأ تحضير','أخرى']

  async function handleWaste() {
    if(!session||!selected||!dispenseQty||Number(dispenseQty)<=0||!wasteReason){showMsg(T('error',lang),'error');return}
    if(Number(dispenseQty)>selected.qty){showMsg(T('tooMuch',lang),'error');return}
    setSubmitting(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-waste',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:selected.id,qty:Number(dispenseQty),staffName:session.name,wasteReason,note:wasteNote})})
      if(!res.ok){
        // انتهاء الجلسة ← نطلب PIN؛ غير كذا نعرض سبب الخطأ الفعلي بدل رسالة عامة
        if(res.status===401){ setNeedsReauth(true); setSubmitting(false); return }
        const err = await res.json().catch(()=>({}))
        showMsg(err.error || `${T('error',lang)} (${res.status})`,'error');setSubmitting(false);return
      }
      fetch('/api/notify-waste',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({staff_name:session.name,product_name:selected.name,qty:Number(dispenseQty),unit:selected.unit,waste_reason:wasteReason})}).catch(()=>{})
      fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({org_id:session.org_id,product_id:selected.id,new_qty:selected.qty-Number(dispenseQty),reorder_point:(selected.supplier_reorder_point ?? selected.reorder_point)})}).catch(()=>{})
      showMsg('🗑️ تم تسجيل الهدر بنجاح')
      setSelected(null); setDispenseQty(''); setWasteMode(false); setWasteReason(''); setWasteNote('')
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||'تعذر الاتصال'}`,'error') }
    setSubmitting(false)
  }

  async function updateQty() {
    if(!editingProduct||!editQty||!session) return
    setSavingQty(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-edit-inventory',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:editingProduct.id,newQty:Number(editQty),staffName:session.name})})
      const j = await res.json()
      if(!res.ok||!j.success){ showMsg(j.error||T('error',lang),'error'); setSavingQty(false); return }
      setEditingProduct(null)
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||'تعذر الاتصال'}`,'error') }
    setSavingQty(false)
  }

  async function addProduct() {
    if(!newProduct.name.trim()||!newProduct.qty||!session) return
    setSavingProduct(true)
    await fetch('/api/staff-purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:session.org_id,branch_id:session.branch_id,category:'مخزون',name:newProduct.name.trim(),qty:Number(newProduct.qty),unit:newProduct.unit,reorder_point:5,amount:0,supplier:'إضافة يدوية',note:`إضافة منتج بواسطة: ${session.name}`,staff_name:session.name,staff_id:session.id})})
    setNewProduct({name:'',qty:'',unit:'قطعة',category:''})
    setShowAddProduct(false)
    if(session) loadProducts(session)
    setSavingProduct(false)
  }

  function logout() { localStorage.removeItem('staff_session'); localStorage.removeItem('staff_token'); router.push('/staff') }

  async function submitReauth() {
    if(!session || !reauthPin || reauthLoading) return
    setReauthLoading(true); setReauthError('')
    try {
      const res = await fetch('/api/staff-reauth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staff_id:session.id,pin:reauthPin})})
      const data = await res.json()
      if(!res.ok){
        setReauthError(data.error||'رمز PIN غير صحيح')
        setReauthPin('')
        setReauthLoading(false)
        return
      }
      localStorage.setItem('staff_token',data.token)
      localStorage.setItem('staff_session',JSON.stringify(data.staff))
      setSession(data.staff)
      setNeedsReauth(false); setReauthPin(''); setReauthError(''); setReauthLoading(false)
    } catch {
      setReauthError('حدث خطأ — حاول مرة أخرى')
      setReauthLoading(false)
    }
  }

  const categoriesMap: Record<string,number> = {}
  products.forEach(p=>{ const c=p.category?.trim()||OTHER_CATEGORY; categoriesMap[c]=(categoriesMap[c]||0)+1 })
  const categories = Object.keys(categoriesMap).sort((a,b)=>{ if(a===OTHER_CATEGORY)return 1; if(b===OTHER_CATEGORY)return -1; return categoriesMap[b]-categoriesMap[a] })
  const searchResults = search.trim() ? products.filter(p=>p.name?.includes(search)||tx(p.name).toLowerCase().includes(search.toLowerCase())) : []
  const categoryProducts = activeCategory ? products.filter(p=>(p.category?.trim()||OTHER_CATEGORY)===activeCategory) : []
  const filteredInventory = products.filter(p=>!invSearch||p.name?.includes(invSearch)||tx(p.name).toLowerCase().includes(invSearch.toLowerCase()))
  const invCategoriesMap: Record<string,number> = {}
  products.forEach(p=>{ const c=p.category?.trim()||OTHER_CATEGORY; invCategoriesMap[c]=(invCategoriesMap[c]||0)+1 })
  const invCategories = Object.keys(invCategoriesMap).sort((a,b)=>{ if(a===OTHER_CATEGORY)return 1; if(b===OTHER_CATEGORY)return -1; return invCategoriesMap[b]-invCategoriesMap[a] })

  if(!session) return null

  const hasAnyPermission = !!(session.permissions?.dispense || session.permissions?.inventory || session.permissions?.purchases || session.permissions?.reports)
  if (!hasAnyPermission) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20,textAlign:'center' as const}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a',marginBottom:8}}>ما عندك أي صلاحية مفعّلة</div>
        <div style={{fontSize:13,color:'#5f5e5a',marginBottom:20}}>تواصل مع صاحب المنشأة عشان يفعّل لك صلاحية دخول</div>
        <button onClick={()=>{localStorage.removeItem('staff_session');localStorage.removeItem('staff_token');router.push('/staff')}}
          style={{padding:'10px 24px',borderRadius:10,border:'1px solid #e5e5e3',background:'white',fontSize:13,fontWeight:700,cursor:'pointer',color:'#5f5e5a'}}>
          خروج
        </button>
      </div>
    )
  }

  const isRTL = lang==='ar'||lang==='ur'
  const tabs = [
    {key:'dispense',label:'الصرف',icon:<Send size={15} strokeWidth={2.25}/>,show:session.permissions?.dispense},
    {key:'inventory',label:'المخزون',icon:<Boxes size={15} strokeWidth={2.25}/>,show:session.permissions?.inventory},
    {key:'purchases',label:'المشتريات',icon:<ShoppingCart size={15} strokeWidth={2.25}/>,show:session.permissions?.purchases},
  ].filter(t=>t.show)

  return (
    <div style={{minHeight:'100vh',background:'#f4f6f8',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:isRTL?'rtl':'ltr'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .card{background:white;border-radius:16px;border:1px solid #e8ecf1;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .15s,box-shadow .15s}
        .card:active{transform:scale(.98)}
        .tab-btn{padding:10px 18px;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .lang-btn{padding:6px 12px;border-radius:20px;border:none;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .prod-btn{background:white;border:1px solid #e8ecf1;border-radius:14px;padding:15px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;text-align:start;width:100%;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:all .15s}
        .prod-btn:active{transform:scale(.97);box-shadow:0 1px 4px rgba(0,0,0,.1)}
        input:focus,select:focus{border-color:#0f766e!important;outline:none!important;box-shadow:0 0 0 3px rgba(15,118,110,.12)!important}
        @keyframes fadeUpStagger{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .cat-card{animation:fadeUpStagger .4s cubic-bezier(0.34,1.56,0.64,1) both;transition:transform .15s,box-shadow .15s}
        .cat-card:active{transform:scale(.94)}
        @media(hover:hover){.cat-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}}
        .mu-btn{animation:fadeUpStagger .35s ease both;transition:transform .15s}
        .mu-btn:active{transform:scale(.95)}
      `}</style>

      {subscriptionExpired && (
        <div style={{position:'fixed',inset:0,zIndex:6000,background:'#0C213B',display:'flex',alignItems:'center',justifyContent:'center',padding:24,textAlign:'center' as const}}>
          <div>
            <div style={{fontSize:56,marginBottom:16}}>⏰</div>
            <div style={{fontSize:18,fontWeight:800,color:'white',marginBottom:8}}>انتهت صلاحية اشتراك المنشأة</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.7)',lineHeight:1.8,maxWidth:320,marginLeft:'auto',marginRight:'auto',marginBottom:24}}>
              انتهت فترة الاشتراك. يرجى إبلاغ صاحب المنشأة لتجديد الاشتراك
            </div>
            <button onClick={logout} style={{padding:'12px 28px',background:'#029FA2',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              تسجيل خروج
            </button>
          </div>
        </div>
      )}

      {needsReauth && (
        <div style={{position:'fixed',inset:0,zIndex:5000,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:340,padding:28,textAlign:'center' as const,animation:'slideUp .3s ease'}}>
            <div style={{fontSize:40,marginBottom:10}}>🔒</div>
            <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:4}}>انتهت الجلسة</div>
            <div style={{fontSize:12,color:'#64748b',marginBottom:18}}>أدخل رمز PIN للمتابعة، {session?.name}</div>
            <input
              type="password" inputMode="numeric" maxLength={6} autoFocus
              value={reauthPin}
              onChange={e=>{setReauthPin(e.target.value.replace(/\D/g,'')); setReauthError('')}}
              onKeyDown={e=>{if(e.key==='Enter') submitReauth()}}
              style={{width:'100%',padding:'14px',fontSize:22,fontWeight:700,textAlign:'center' as const,letterSpacing:8,border:`1.5px solid ${reauthError?'#ef4444':'#e2e8f0'}`,borderRadius:12,marginBottom:10,fontFamily:'inherit',boxSizing:'border-box' as const}}
              placeholder="••••"
            />
            {reauthError && <div style={{fontSize:12,color:'#ef4444',fontWeight:600,marginBottom:10}}>{reauthError}</div>}
            <button onClick={submitReauth} disabled={!reauthPin||reauthLoading}
              style={{width:'100%',padding:13,background:!reauthPin||reauthLoading?'#cbd5e1':'#029FA2',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:!reauthPin||reauthLoading?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:10}}>
              {reauthLoading?'جاري التحقق...':'دخول'}
            </button>
            <button onClick={logout} style={{width:'100%',padding:10,background:'none',border:'none',fontSize:12,color:'#94a3b8',cursor:'pointer',fontFamily:'inherit'}}>
              تسجيل خروج كامل
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#029FA2':'#ef4444',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.2)',animation:'slideUp .3s ease',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{background:'linear-gradient(160deg,#0b3b3a 0%,#0f766e 100%)',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(15,23,42,.12)'}}>
        <div style={{maxWidth:560,margin:'0 auto',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/staff/choose')} aria-label="الرئيسية"
            style={{width:38,height:38,flexShrink:0,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,color:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <Home size={17} strokeWidth={2.25}/>
          </button>
          <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:10}}>
            {orgLogo && <img src={orgLogo} alt="" style={{width:36,height:36,borderRadius:10,objectFit:'cover',background:'white',flexShrink:0}}/>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:15,fontWeight:800,color:'white',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{session.name}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:1,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</div>
            </div>
          </div>
          <div style={{position:'relative' as const,flexShrink:0}}>
            <button onClick={()=>setShowLangMenu(v=>!v)} disabled={translating}
              style={{height:38,padding:'0 11px',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,opacity:translating?0.6:1}}>
              <Globe size={15} strokeWidth={2.25}/>{LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'}
            </button>
            {showLangMenu && (
              <div style={{position:'absolute' as const,top:'100%',insetInlineEnd:0,marginTop:6,background:'white',borderRadius:12,border:'1px solid #e8ecf1',boxShadow:'0 12px 28px rgba(15,23,42,.16)',overflow:'hidden',minWidth:150,zIndex:50}}>
                {LANGUAGES.map(l=>(
                  <button key={l.code}
                    onClick={()=>{setLang(l.code);localStorage.setItem('staff_lang',l.code);if(l.code!=='ar'&&session)fetchTranslation(session,l.code);setShowLangMenu(false)}}
                    style={{width:'100%',padding:'11px 14px',border:'none',borderBottom:'1px solid #f1f5f9',background:lang===l.code?'#f0fdfa':'white',color:lang===l.code?'#0f766e':'#1e293b',fontSize:13,fontWeight:lang===l.code?700:500,cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const,display:'block'}}>
                    {lang===l.code?'✓ ':''}{l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={logout} aria-label={T('logout',lang)}
            style={{width:38,height:38,flexShrink:0,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,color:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <LogOut size={16} strokeWidth={2.25}/>
          </button>
        </div>
      </div>

      {/* Tabs — تختفي لو وصلنا برابط مباشر لصلاحية محددة (?tab=) */}
      {tabs.length > 1 && !forcedTab && (
        <div style={{maxWidth:560,margin:'0 auto',padding:'14px 16px 0'}}>
          <div style={{display:'flex',gap:4,background:'#e9edf1',borderRadius:14,padding:4}}>
            {tabs.map(t=>(
              <button key={t.key} className="tab-btn" onClick={()=>{setTab(t.key as any);if(t.key==='inventory'&&session)loadProducts(session)}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 8px',background:tab===t.key?'white':'transparent',color:tab===t.key?'#0f766e':'#64748b',boxShadow:tab===t.key?'0 1px 3px rgba(15,23,42,.1)':'none',borderRadius:11}}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Translating banner */}
      {translating && (
        <div style={{background:'#eff6ff',color:'#2563eb',padding:'10px 20px',fontSize:13,fontWeight:700,textAlign:'center'}}>
          {T('translating',lang)}
        </div>
      )}

      {/* ═══ DISPENSE TAB ═══ */}
      <div style={{display:tab==='dispense'&&session.permissions?.dispense?'block':'none',padding:'14px 16px 28px',maxWidth:560,margin:'0 auto'}}>
        <div style={{position:'relative' as const,marginBottom:14}}>
          <Search size={18} strokeWidth={2} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',insetInlineStart:14,color:'#94a3b8',pointerEvents:'none'}}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCategory(null)}}
            style={{width:'100%',height:48,paddingInlineStart:42,paddingInlineEnd:14,border:'1px solid #e2e8f0',borderRadius:14,fontSize:15,background:'white',color:'#1e293b',fontFamily:'inherit',fontWeight:500,boxSizing:'border-box' as const}}
            placeholder={T('search',lang)}/>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#94a3b8',fontSize:15}}>{T('loading',lang)}</div>
        ) : search.trim() ? (
          <div style={{display:'flex',flexDirection:'column',gap:8,animation:'fadeIn .3s'}}>
            {searchResults.length===0 ? (
              <div className="card" style={{padding:32,textAlign:'center',color:'#94a3b8'}}>{T('noResults',lang)}</div>
            ) : searchResults.map(p=>(
              <button key={p.id} className="prod-btn" onClick={()=>setSelected(p)}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                  {lang!=='ar'&&<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.name}</div>}
                </div>
                <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#029FA2',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdfa',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
              </button>
            ))}
          </div>
        ) : !activeCategory ? (
          <div style={{animation:'fadeIn .3s'}}>
            {todayCount>0 && (
              <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'#ecfdf5',color:'#047857',borderRadius:99,padding:'7px 13px',marginBottom:16,fontSize:12.5,fontWeight:700}}>
                <CheckCircle2 size={15} strokeWidth={2.25}/> صرفت {todayCount} صنف اليوم
              </div>
            )}
            {mostUsed.length>0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#64748b',margin:'0 2px 10px'}}><Zap size={14} strokeWidth={2.25} color="#f59e0b"/> الأكثر استخداماً <span style={{fontWeight:500,color:'#94a3b8'}}>· آخر 14 يوم</span></div>
                <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none' as const}}>
                  {mostUsed.map((p:any,i:number)=>(
                    <button key={p.id} className="mu-btn" onClick={()=>setSelected(p)} style={{animationDelay:`${i*0.06}s`,flexShrink:0,background:'white',border:'1px solid #e8ecf1',borderRadius:14,padding:'11px 14px',cursor:'pointer',fontFamily:'inherit',minWidth:118,maxWidth:160,textAlign:'start' as const,boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{tx(p.name)}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:3,whiteSpace:'nowrap' as const}}>صُرف {p.dispense_count} {p.dispense_count>=3&&p.dispense_count<=10?"مرات":"مرة"}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{fontSize:12,fontWeight:700,color:'#64748b',margin:'0 2px 10px'}}>الفئات</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {categories.map((cat,i)=>(
                <button key={cat} className="cat-card" onClick={()=>setActiveCategory(cat)}
                  style={{animationDelay:`${i*0.05}s`,gridColumn:categories.length%2===1&&i===categories.length-1?'1 / -1':undefined,background:'white',border:'1px solid #e8ecf1',borderRadius:16,padding:'16px 14px',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:12,boxShadow:'0 1px 2px rgba(16,24,40,.04)',minHeight:112,textAlign:'start' as const}}>
                  <span style={{width:42,height:42,borderRadius:12,background:`${colorFor(cat)}14`,color:colorFor(cat),display:'flex',alignItems:'center',justifyContent:'center'}}>{iconFor(cat)}</span>
                  <span style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',gap:6}}>
                    <span style={{minWidth:0}}>
                      <span style={{display:'block',fontSize:15,fontWeight:800,color:'#0f172a'}}>{tx(cat)}</span>
                      {lang!=='ar'&&<span style={{display:'block',fontSize:11,color:'#94a3b8'}}>{cat}</span>}
                      <span style={{display:'block',fontSize:12,color:'#94a3b8',marginTop:2}}>{categoriesMap[cat]} {T('items',lang)}</span>
                    </span>
                    <ChevronLeft size={18} strokeWidth={2} color="#cbd5e1" style={{flexShrink:0,transform:isRTL?'none':'scaleX(-1)'}}/>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{animation:'fadeIn .3s'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <button onClick={()=>setActiveCategory(null)} aria-label={T('back',lang)} style={{width:38,height:38,flexShrink:0,background:'white',border:'1px solid #e2e8f0',borderRadius:12,color:'#334155',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeft size={18} strokeWidth={2.25} style={{transform:isRTL?'scaleX(-1)':'none'}}/>
              </button>
              <span style={{width:38,height:38,borderRadius:11,background:`${colorFor(activeCategory)}14`,color:colorFor(activeCategory),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{iconFor(activeCategory,18)}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:17,fontWeight:800,color:'#0f172a'}}>{tx(activeCategory)}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>{lang!=='ar'?`${activeCategory} · `:''}{categoryProducts.length} {T('items',lang)}</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {categoryProducts.map(p=>(
                <button key={p.id} className="prod-btn" onClick={()=>setSelected(p)}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                    {lang!=='ar'&&<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.name}</div>}
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#029FA2',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdfa',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ INVENTORY TAB ═══ */}
      {tab==='inventory' && (
        <div style={{padding:'16px 20px',maxWidth:560,margin:'0 auto',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>📦 المخزون</div>
            <button onClick={()=>setShowAddProduct(true)}
              style={{padding:'9px 16px',background:'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.3)'}}>
              ＋ إضافة منتج
            </button>
          </div>
          <input value={invSearch} onChange={e=>setInvSearch(e.target.value)} placeholder="🔍 ابحث عن منتج..."
            style={{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:14,background:'white',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box' as const}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {filteredInventory.length===0 ? (
              <div className="card" style={{padding:40,textAlign:'center',color:'#94a3b8',gridColumn:'span 2'}}>لا توجد منتجات</div>
            ) : filteredInventory.map(p=>(
              <div key={p.id} className="card" style={{padding:'16px',display:'flex',flexDirection:'column' as const,gap:6}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{tx(p.name)}</div>
                <div style={{fontSize:11,color:'#64748b'}}>{p.category||'—'}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4,margin:'4px 0'}}>
                  <span style={{fontSize:30,fontWeight:900,color:p.qty<=p.reorder_point?'#ef4444':'#029FA2',lineHeight:1}}>{p.qty}</span>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{p.unit}</span>
                </div>
                {p.qty<=p.reorder_point && <div style={{fontSize:10,color:'#ef4444',fontWeight:700}}>⚠️ مخزون منخفض</div>}
                <button onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}}
                  style={{width:'100%',padding:'8px',background:'#f0fdfa',color:'#029FA2',border:'1.5px solid #99f6e4',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:'auto'}}>
                  ✏️ تعديل
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PURCHASES TAB ═══ */}
      {tab==='purchases' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{fontSize:64,marginBottom:16}}>🛒</div>
          <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>تسجيل المشتريات</div>
          <div style={{fontSize:14,color:'#64748b',marginBottom:28,maxWidth:300,margin:'0 auto 28px'}}>سجّل فواتير الشراء مع الضريبة وصور الفواتير</div>
          <button onClick={()=>router.push('/staff/purchases')}
            style={{padding:'16px 36px',background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 8px 24px rgba(22,163,74,.35)',display:'inline-flex',alignItems:'center',gap:8}}>
            📝 تسجيل شراء جديد
          </button>
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab==='reports' && (
        <div style={{padding:'60px 20px',textAlign:'center',animation:'fadeIn .3s'}}>
          <div style={{fontSize:64,marginBottom:16}}>📊</div>
          <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:8}}>التقارير</div>
          <div style={{fontSize:14,color:'#64748b'}}>هذه الميزة ستكون متاحة قريباً</div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Dispense modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>{tx(selected.name)}</div>
                {lang!=='ar'&&<div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{selected.name}</div>}
                <div style={{fontSize:13,color:'#64748b',marginTop:4}}>{T('available',lang)}: <b style={{color:selected.qty<=selected.reorder_point?'#ef4444':'#029FA2'}}>{selected.qty} {selected.unit}</b></div>
              </div>
              <button onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:36,height:36,color:'#64748b',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:20,background:'#f1f5f9',borderRadius:12,padding:4}}>
              <button onClick={()=>setWasteMode(false)} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:!wasteMode?'white':'transparent',color:!wasteMode?'#029FA2':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:!wasteMode?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                📤 صرف عادي
              </button>
              <button onClick={()=>setWasteMode(true)} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:wasteMode?'white':'transparent',color:wasteMode?'#d97706':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:wasteMode?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                🗑️ تسجيل هدر
              </button>
            </div>
            {wasteMode && (
              <>
                <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:8}}>سبب الهدر *</div>
                <div style={{display:'flex',flexWrap:'wrap' as const,gap:8,marginBottom:16}}>
                  {WASTE_REASONS.map(r=>(
                    <button key={r} onClick={()=>setWasteReason(r)}
                      style={{padding:'8px 14px',borderRadius:99,border:`1.5px solid ${wasteReason===r?'#d97706':'#e2e8f0'}`,background:wasteReason===r?'#fffbeb':'white',color:wasteReason===r?'#b45309':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:8}}>ملاحظة (اختياري)</div>
                <textarea value={wasteNote} onChange={e=>setWasteNote(e.target.value)}
                  placeholder="أي تفاصيل إضافية عن الهدر..."
                  style={{width:'100%',padding:'12px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:16,minHeight:60,resize:'none' as const}}/>
              </>
            )}
            <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:10}}>{T('qty',lang)}</div>
            <input value={dispenseQty} readOnly
              style={{width:'100%',padding:'16px',border:'2px solid #e2e8f0',borderRadius:14,fontSize:28,fontWeight:800,textAlign:'center',fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:12,background:'#f8fafc',caretColor:'transparent'}}
              placeholder="0"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>(
                <button key={k} type="button"
                  onClick={()=>{
                    if(k==='⌫'){ setDispenseQty(q=>q.slice(0,-1)); return }
                    if(k==='.' && dispenseQty.includes('.')) return
                    setDispenseQty(q=>(q+k).replace(/[^0-9.]/g,''))
                  }}
                  style={{padding:'16px 0',borderRadius:12,border:'1.5px solid #e2e8f0',background:'white',fontSize:20,fontWeight:800,color:k==='⌫'?'#dc2626':'#0f172a',cursor:'pointer',fontFamily:'inherit',transition:'background .1s'}}
                  onTouchStart={e=>{(e.currentTarget as HTMLButtonElement).style.background='#f0fdfa'}}
                  onTouchEnd={e=>{(e.currentTarget as HTMLButtonElement).style.background='white'}}>
                  {k}
                </button>
              ))}
            </div>
            {wasteMode ? (
              <button onClick={handleWaste} disabled={!dispenseQty||!wasteReason||submitting}
                style={{width:'100%',padding:18,background:(!dispenseQty||!wasteReason||submitting)?'#94a3b8':'linear-gradient(135deg,#d97706,#b45309)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:(!dispenseQty||!wasteReason||submitting)?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:(!dispenseQty||!wasteReason||submitting)?'none':'0 8px 24px rgba(217,119,6,.35)'}}>
                {submitting?T('saving',lang):`🗑️ تسجيل هدر ${dispenseQty||''} ${selected.unit}`}
              </button>
            ) : (
              <button onClick={handleDispense} disabled={!dispenseQty||submitting}
                style={{width:'100%',padding:18,background:(!dispenseQty||submitting)?'#94a3b8':'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:(!dispenseQty||submitting)?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:(!dispenseQty||submitting)?'none':'0 8px 24px rgba(22,163,74,.35)'}}>
                {submitting?T('saving',lang):T('confirm',lang)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit qty modal */}
      {editingProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setEditingProduct(null)}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:4}}>{editingProduct.name}</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>الكمية الحالية: <b>{editingProduct.qty}</b> {editingProduct.unit}</div>
            <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:8}}>الكمية الجديدة</div>
            <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)} min="0" autoFocus
              style={{width:'100%',padding:'16px',border:'2px solid #e2e8f0',borderRadius:14,fontSize:28,fontWeight:800,textAlign:'center',fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:16}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={updateQty} disabled={savingQty}
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
                {savingQty?'جاري الحفظ...':'✅ حفظ الكمية'}
              </button>
              <button onClick={()=>setEditingProduct(null)}
                style={{flex:1,padding:16,background:'#f3f4f6',color:'#374151',border:'none',borderRadius:14,fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add product modal */}
      {showAddProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setShowAddProduct(false)}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:20}}>➕ إضافة منتج جديد</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:10,marginBottom:20}}>
              <input value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} placeholder="اسم المنتج *" autoFocus
                style={{padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:15,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <input type="number" value={newProduct.qty} onChange={e=>setNewProduct(p=>({...p,qty:e.target.value}))} placeholder="الكمية *"
                  style={{padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:15,fontFamily:'inherit'}}/>
                <select value={newProduct.unit} onChange={e=>setNewProduct(p=>({...p,unit:e.target.value}))}
                  style={{padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:15,fontFamily:'inherit',background:'white'}}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <input value={newProduct.category} onChange={e=>setNewProduct(p=>({...p,category:e.target.value}))} placeholder="الفئة (اختياري)"
                style={{padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:15,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addProduct} disabled={savingProduct||!newProduct.name||!newProduct.qty}
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:savingProduct||!newProduct.name||!newProduct.qty?0.6:1}}>
                {savingProduct?'جاري الإضافة...':'✅ إضافة'}
              </button>
              <button onClick={()=>setShowAddProduct(false)}
                style={{flex:1,padding:16,background:'#f3f4f6',color:'#374151',border:'none',borderRadius:14,fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StaffPage() {
  return <Suspense fallback={null}><StaffPageInner/></Suspense>
}
