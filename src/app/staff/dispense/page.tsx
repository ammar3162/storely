'use client'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { ChartNoAxesCombined, CheckCircle2, CircleAlert, Clock3, FilePenLine, Globe, LockKeyhole, MapPin, Package, PackageOpen, Pencil, Plus, ShoppingCart, Trash2, UserRound, Zap, Wheat, Milk, SprayCan, CupSoda, Beef, Carrot, FileText, Tag } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = { '🍞':<Wheat size={22}/>, '🥛':<Milk size={22}/>, '🧴':<SprayCan size={22}/>, '🥤':<CupSoda size={22}/>, '🍗':<Beef size={22}/>, '🥦':<Carrot size={22}/>, '📄':<FileText size={22}/>, '📦':<Package size={22}/>, '🏷️':<Tag size={22}/> }

const CATEGORY_COLORS = [uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy,uiTokens.color.navy]
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

function iconFor(cat: string) {
  const c = (cat||'').toLowerCase()
  if(c.includes('غذائ')||c.includes('طعام')||c.includes('اكل')||c.includes('أكل')) return '🍞'
  if(c.includes('لبن')||c.includes('حليب')||c.includes('بيض')||c.includes('ألبان')) return '🥛'
  if(c.includes('نظاف')||c.includes('تنظيف')) return '🧴'
  if(c.includes('مشروب')) return '🥤'
  if(c.includes('لحم')||c.includes('دجاج')) return '🍗'
  if(c.includes('خضار')||c.includes('فواكه')) return '🥦'
  if(c.includes('ورق')||c.includes('مكتب')) return '📄'
  if(c === 'أخرى' || c.includes('اخرى')) return '📦'
  return '🏷️'
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
      <div className="min-h-screen flex flex-col items-center justify-center !p-5 text-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:'rtl'}}>
        <div className="text-2xl !mb-4"><LockKeyhole size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
        <div className="text-base font-semibold !mb-2" style={{color:uiTokens.color.text}}>ما عندك أي صلاحية مفعّلة</div>
        <div className="text-sm !mb-5" style={{color:uiTokens.color.textMuted}}>تواصل مع صاحب المنشأة عشان يفعّل لك صلاحية دخول</div>
        <StorelyButton onClick={()=>{localStorage.removeItem('staff_session');localStorage.removeItem('staff_token');router.push('/staff')}} variant="secondary">
          خروج
        </StorelyButton>
      </div>
    )
  }

  const isRTL = lang==='ar'||lang==='ur'
  const tabs = [
    {key:'dispense',label:'📤 الصرف',show:session.permissions?.dispense},
    {key:'inventory',label:'📦 المخزون',show:session.permissions?.inventory},
    {key:'purchases',label:'🛒 المشتريات',show:session.permissions?.purchases},
    {key:'reports',label:'📊 التقارير',show:session.permissions?.reports},
  ].filter(t=>t.show)

  return (
    <div className="min-h-screen text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:isRTL?'rtl':'ltr'}}>

      {subscriptionExpired && (
        <div className="fixed flex items-center justify-center !p-6 text-center overflow-y-auto" style={{inset:0, zIndex:6000, background:uiTokens.color.surface}}>
          <div>
            <div className="text-2xl !mb-4"><Clock3 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <div className="text-lg font-semibold !mb-2" style={{color:uiTokens.color.navy}}>انتهت صلاحية اشتراك المنشأة</div>
            <div className="text-sm max-w-lg !ml-auto !mr-auto !mb-6" style={{color:uiTokens.color.textMuted, lineHeight:1.8}}>
              انتهت فترة الاشتراك. يرجى إبلاغ صاحب المنشأة لتجديد الاشتراك
            </div>
            <StorelyButton onClick={logout} variant="primary">
              تسجيل خروج
            </StorelyButton>
          </div>
        </div>
      )}

      {needsReauth && (
        <div className="fixed flex items-center justify-center !p-5 overflow-y-auto" style={{inset:0, zIndex:5000, background:uiTokens.color.backdrop}}>
          <StorelyCard className="min-w-0 max-h-[90dvh] overflow-y-auto rounded-[var(--radius)] w-full max-w-lg !p-6 text-center" style={{background:uiTokens.color.surface}}>
            <div className="text-2xl !mb-2"><LockKeyhole size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            <div className="text-base font-semibold !mb-1" style={{color:uiTokens.color.text}}>انتهت الجلسة</div>
            <div className="text-sm !mb-4" style={{color:uiTokens.color.textMuted}}>أدخل رمز PIN للمتابعة، {session?.name}</div>
            <input
               type="password" inputMode="numeric" maxLength={6} autoFocus value={reauthPin} onChange={e=>{setReauthPin(e.target.value.replace(/\D/g,'')); setReauthError('')}} onKeyDown={e=>{if(e.key==='Enter') submitReauth()}} placeholder="••••" className="w-full !text-2xl font-semibold text-center rounded-[var(--radius)] !mb-2 storely-input min-w-0" style={{letterSpacing:8, border:`1.5px solid ${reauthError?uiTokens.color.danger:uiTokens.color.border}`}}
            />
            {reauthError && <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.danger}}>{reauthError}</div>}
            <StorelyButton onClick={submitReauth} disabled={!reauthPin||reauthLoading} className="w-full !mb-2" variant="primary">
              {reauthLoading?'جاري التحقق...':'دخول'}
            </StorelyButton>
            <StorelyButton onClick={logout} className="w-full" variant="secondary">
              تسجيل خروج كامل
            </StorelyButton>
          </StorelyCard>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed w-[calc(100%-32px)] max-w-lg border border-[var(--storely-border)] !py-3 !px-6 rounded-[var(--radius)] text-sm font-semibold whitespace-normal break-words" style={{top:20, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:uiTokens.color.surface, color:toast.type==='success'?uiTokens.color.success:uiTokens.color.danger, boxShadow:uiTokens.shadow.surface}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="!p-0" style={{background:uiTokens.color.surface, top:0, zIndex:100, boxShadow:uiTokens.shadow.surface}}>
        {/* Top bar */}
        <div className="!py-3 !px-5 flex justify-between items-center flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {orgLogo ? (
              <img src={orgLogo} alt="" className="rounded-[var(--radius-sm)] object-cover" style={{width:38, height:38, border:'2px solid rgba(255,255,255,.2)'}}/>
            ) : (
              <div className="rounded-[var(--radius-sm)] flex items-center justify-center text-lg" style={{width:38, height:38, background:uiTokens.color.surface}}><UserRound size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
            )}
            <StorelyPageHeader title={session.name} description={<>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</>} className="!mb-0" />
          </div>
          <StorelyButton onClick={()=>router.push('/staff/choose')} className="flex items-center gap-2" variant="secondary">

            <MapPin size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الحضور
          </StorelyButton>
          <StorelyButton onClick={logout} variant="secondary">
            {T('logout',lang)}
          </StorelyButton>
        </div>

        {/* Tabs — تختفي لو وصلنا برابط مباشر لصلاحية محددة (?tab=) */}
        {tabs.length > 1 && !forcedTab && (
          <div className="flex gap-2 !py-0 !px-4 overflow-x-auto">
            {tabs.map(t=>(
              <StorelyButton key={t.key} onClick={()=>{setTab(t.key as any);if(t.key==='inventory'&&session)loadProducts(session)}} className="" style={{background:tab===t.key?uiTokens.color.infoBg:uiTokens.color.surface, color:tab===t.key?uiTokens.color.text:uiTokens.color.textMuted, borderBottom:tab===t.key?'none':'2px solid transparent', marginBottom:tab===t.key?-2:0}} variant="secondary">
                {t.label}
              </StorelyButton>
            ))}
          </div>
        )}

        {/* Language selector — زر واحد + قائمة منسدلة */}
        <div className="!py-2 !px-4 relative" style={{background:uiTokens.color.surface}}>
          <StorelyButton onClick={()=>setShowLangMenu(v=>!v)} disabled={translating} className="flex items-center gap-2" variant="secondary">

            <Globe size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'} {showLangMenu?'▴':'▾'}
          </StorelyButton>
          {showLangMenu && (
            <div className="absolute !mt-1 rounded-[var(--radius-sm)]" style={{top:'100%', right:16, background:uiTokens.color.surface, boxShadow:uiTokens.shadow.surface, overflow:'hidden', minWidth:140, zIndex:50}}>
              {LANGUAGES.map(l=>(
                <StorelyButton key={l.code} onClick={()=>{setLang(l.code);localStorage.setItem('staff_lang',l.code);if(l.code!=='ar'&&session)fetchTranslation(session,l.code);setShowLangMenu(false)}} className="w-full text-right block" style={{background:lang===l.code?uiTokens.color.surface:uiTokens.color.surface, color:lang===l.code?uiTokens.color.navy:uiTokens.color.text}} variant="secondary">
                  {lang===l.code?'✓ ':''}{l.label}
                </StorelyButton>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Translating banner */}
      {translating && (
        <div className="!py-2 !px-5 text-sm font-semibold text-center" style={{background:uiTokens.color.infoBg, color:uiTokens.color.info}}>
          {T('translating',lang)}
        </div>
      )}

      {/* ═══ DISPENSE TAB ═══ */}
      <div className="!py-4 !px-5 max-w-4xl !my-0 !mx-auto" style={{display:tab==='dispense'&&session.permissions?.dispense?'block':'none'}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCategory(null)}} placeholder={T('search',lang)} className="w-full rounded-[var(--radius)] !text-base font-normal !mb-4 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.surface, color:uiTokens.color.text}}/>

        {loading ? (
          <div className="text-center !p-8 text-base" style={{color:uiTokens.color.textMuted}}>{T('loading',lang)}</div>
        ) : search.trim() ? (
          <div className="flex flex-col gap-2">
            {searchResults.length===0 ? (
              <StorelyCard className="min-w-0 !p-8 text-center" style={{color:uiTokens.color.textMuted}}>{T('noResults',lang)}</StorelyCard>
            ) : searchResults.map(p=>(
              <StorelyButton key={p.id} onClick={()=>setSelected(p)} className="w-full !justify-between !p-5 text-start">
                <div>
                  <div className="text-base font-semibold" style={{color:uiTokens.color.text}}>{tx(p.name)}</div>
                  {lang!=='ar'&&<div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{p.name}</div>}
                </div>
                <span className="text-sm font-semibold !py-1 !px-3 rounded-[var(--radius-sm)]" style={{color:p.qty<=p.reorder_point?uiTokens.color.danger:uiTokens.color.success, background:p.qty<=p.reorder_point?uiTokens.color.dangerBg:uiTokens.color.successBg}}>{p.qty} {p.unit}</span>
              </StorelyButton>
            ))}
          </div>
        ) : !activeCategory ? (
          <div >
            {todayCount>0 && (
              <div className="flex items-center gap-2 rounded-[var(--radius)] !py-2 !px-4 !mb-3" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                <span className="text-lg"><CheckCircle2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
                <span className="text-sm font-semibold" style={{color:uiTokens.color.navy}}>صرفت {todayCount} صنف اليوم — استمر!</span>
              </div>
            )}
            {mostUsed.length>0 && (
              <div className="!mb-4">
                <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.textMuted}}><Zap size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الأكثر استخداماً</div>
                <div className="flex gap-2 overflow-x-auto !pb-1">
                  {mostUsed.map((p:any,i:number)=>(
                    <StorelyButton key={p.id} onClick={()=>setSelected(p)} className="shrink-0 text-right !p-4 text-start" style={{order:i,minWidth:160}} variant="secondary">
                      <div className="text-sm font-semibold whitespace-normal break-words" style={{color:uiTokens.color.text, maxWidth:180}}>{tx(p.name)}</div>
                      <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>صُرف {p.dispense_count} مرة (آخر 14 يوم)</div>
                    </StorelyButton>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat,i)=>(
                <StorelyButton key={cat} onClick={()=>setActiveCategory(cat)} className="flex flex-col items-center gap-2 !p-6 !flex-col" style={{color:colorFor(cat),order:i}} variant="secondary">
                  <div className="text-[28px]">{CATEGORY_ICONS[iconFor(cat)]}</div>
                  <div className="text-lg font-semibold">{tx(cat)}</div>
                  {lang!=='ar'&&<div className="text-xs" style={{opacity:.7}}>{cat}</div>}
                  <div className="text-sm !py-1 !px-2 rounded-[var(--radius)]" style={{opacity:.85, background:uiTokens.color.surface}}>{categoriesMap[cat]} {T('items',lang)}</div>
                </StorelyButton>
              ))}
            </div>
          </div>
        ) : (
          <div >
            <StorelyButton onClick={()=>setActiveCategory(null)} className="!mb-4 flex items-center gap-2" variant="secondary">
              ← {T('back',lang)}
            </StorelyButton>
            <div className="!mb-4">
              <div className="text-lg font-semibold" style={{color:uiTokens.color.text}}>{tx(activeCategory)}</div>
              {lang!=='ar'&&<div className="text-sm" style={{color:uiTokens.color.textMuted}}>{activeCategory}</div>}
            </div>
            <div className="flex flex-col gap-2">
              {categoryProducts.map(p=>(
                <StorelyButton key={p.id} onClick={()=>setSelected(p)} className="w-full !justify-between !p-5 text-start">
                  <div>
                    <div className="text-base font-semibold" style={{color:uiTokens.color.text}}>{tx(p.name)}</div>
                    {lang!=='ar'&&<div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{p.name}</div>}
                  </div>
                  <span className="text-sm font-semibold !py-1 !px-3 rounded-[var(--radius-sm)]" style={{color:p.qty<=p.reorder_point?uiTokens.color.danger:uiTokens.color.success, background:p.qty<=p.reorder_point?uiTokens.color.dangerBg:uiTokens.color.successBg}}>{p.qty} {p.unit}</span>
                </StorelyButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ INVENTORY TAB ═══ */}
      {tab==='inventory' && (
        <div className="!py-4 !px-5 max-w-4xl !my-0 !mx-auto">
          <div className="flex justify-between items-center !mb-3 flex-wrap gap-4">
            <div className="text-lg font-semibold" style={{color:uiTokens.color.text}}><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> المخزون</div>
            <StorelyButton onClick={()=>setShowAddProduct(true)} variant="primary">
              ＋ إضافة منتج
            </StorelyButton>
          </div>
          <input value={invSearch} onChange={e=>setInvSearch(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-[var(--radius)] text-sm !mb-3 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.surface}}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredInventory.length===0 ? (
              <StorelyCard className="min-w-0 !p-8 text-center" style={{color:uiTokens.color.textMuted, gridColumn:'span 2'}}>لا توجد منتجات</StorelyCard>
            ) : filteredInventory.map(p=>(
              <StorelyCard key={p.id} className="min-w-0 !p-4 flex flex-col gap-2">
                <div className="text-sm font-semibold" style={{color:uiTokens.color.text, lineHeight:1.3}}>{tx(p.name)}</div>
                <div className="text-xs" style={{color:uiTokens.color.textMuted}}>{p.category||'—'}</div>
                <div className="flex items-baseline gap-2 !my-1 !mx-0">
                  <span className="text-[28px] font-semibold" style={{color:p.qty<=p.reorder_point?uiTokens.color.danger:uiTokens.color.success, lineHeight:1}}>{p.qty}</span>
                  <span className="text-sm" style={{color:uiTokens.color.textMuted}}>{p.unit}</span>
                </div>
                {p.qty<=p.reorder_point && <div className="text-xs font-semibold" style={{color:uiTokens.color.danger}}><CircleAlert size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> مخزون منخفض</div>}
                <StorelyButton onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}} className="w-full !mt-auto" variant="secondary">

                  <Pencil size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تعديل
                </StorelyButton>
              </StorelyCard>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PURCHASES TAB ═══ */}
      {tab==='purchases' && (
        <div className="!py-8 !px-5 text-center">
          <div className="text-2xl !mb-4"><ShoppingCart size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
          <div className="text-lg font-semibold !mb-2" style={{color:uiTokens.color.text}}>تسجيل المشتريات</div>
          <div className="text-sm !mb-6 max-w-lg !mt-0 !mx-auto !mb-6" style={{color:uiTokens.color.textMuted}}>سجّل فواتير الشراء مع الضريبة وصور الفواتير</div>
          <StorelyButton onClick={()=>router.push('/staff/purchases')} className="inline-flex items-center gap-2" variant="primary">

            <FilePenLine size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تسجيل شراء جديد
          </StorelyButton>
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab==='reports' && (
        <div className="!py-8 !px-5 text-center">
          <div className="text-2xl !mb-4"><ChartNoAxesCombined size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
          <div className="text-lg font-semibold !mb-2" style={{color:uiTokens.color.text}}>التقارير</div>
          <div className="text-sm" style={{color:uiTokens.color.textMuted}}>هذه الميزة ستكون متاحة قريباً</div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Dispense modal */}
      {selected && (
        <div onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}} className="fixed flex items-end justify-center overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:200}}>
          <div onClick={e=>e.stopPropagation()} className="rounded-[var(--radius)] !p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto" style={{background:uiTokens.color.surface}}>
            <div className="flex justify-between items-start !mb-5 flex-wrap gap-4">
              <div>
                <div className="text-lg font-semibold" style={{color:uiTokens.color.text}}>{tx(selected.name)}</div>
                {lang!=='ar'&&<div className="text-sm !mt-0" style={{color:uiTokens.color.textMuted}}>{selected.name}</div>}
                <div className="text-sm !mt-1" style={{color:uiTokens.color.textMuted}}>{T('available',lang)}: <b  style={{color:selected.qty<=selected.reorder_point?uiTokens.color.danger:uiTokens.color.success}}>{selected.qty} {selected.unit}</b></div>
              </div>
              <StorelyButton onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}} className="flex items-center justify-center !px-0" style={{width:40, height:40}} variant="secondary">✕</StorelyButton>
            </div>
            <div className="flex gap-2 !mb-5 rounded-[var(--radius)] !p-1" style={{background:uiTokens.color.background}}>
              <StorelyButton onClick={()=>setWasteMode(false)} className="min-w-0 flex-1" style={{background:!wasteMode?uiTokens.color.surface:'transparent', color:!wasteMode?uiTokens.color.navy:uiTokens.color.textMuted}} variant="secondary">

                <PackageOpen size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> صرف عادي
              </StorelyButton>
              <StorelyButton onClick={()=>setWasteMode(true)} className="min-w-0 flex-1" style={{background:wasteMode?uiTokens.color.surface:'transparent', color:wasteMode?uiTokens.color.warning:uiTokens.color.textMuted}} variant="secondary">

                <Trash2 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تسجيل هدر
              </StorelyButton>
            </div>
            {wasteMode && (
              <>
                <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.textMuted}}>سبب الهدر *</div>
                <div className="flex flex-wrap gap-2 !mb-4">
                  {WASTE_REASONS.map(r=>(
                    <StorelyButton key={r} onClick={()=>setWasteReason(r)} style={{border:`1.5px solid ${wasteReason===r?uiTokens.color.warning:uiTokens.color.border}`, background:wasteReason===r?uiTokens.color.warningBg:uiTokens.color.surface, color:wasteReason===r?uiTokens.color.warning:uiTokens.color.textMuted}} variant="secondary">
                      {r}
                    </StorelyButton>
                  ))}
                </div>
                <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.textMuted}}>ملاحظة (اختياري)</div>
                <textarea value={wasteNote} onChange={e=>setWasteNote(e.target.value)} placeholder="أي تفاصيل إضافية عن الهدر..." className="w-full rounded-[var(--radius)] text-sm !mb-4 resize-y storely-input min-w-0 !h-auto" style={{border:`1px solid ${uiTokens.color.border}`, minHeight:60}}/>
              </>
            )}
            <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.textMuted}}>{T('qty',lang)}</div>
            <input value={dispenseQty} readOnly placeholder="0" className="w-full rounded-[var(--radius)] text-[28px] font-semibold text-center !mb-3 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.background, caretColor:'transparent'}}/>
            <div className="grid grid-cols-3 gap-2 !mb-4">
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>(
                <StorelyButton key={k} type="button" onClick={()=>{
                    if(k==='⌫'){ setDispenseQty(q=>q.slice(0,-1)); return }
                    if(k==='.' && dispenseQty.includes('.')) return
                    setDispenseQty(q=>(q+k).replace(/[^0-9.]/g,''))
                  }} onTouchStart={e=>{(e.currentTarget as HTMLButtonElement).style.background='#f0fdfa'}} onTouchEnd={e=>{(e.currentTarget as HTMLButtonElement).style.background='white'}} style={{color:k==='⌫'?uiTokens.color.danger:uiTokens.color.text}} variant="danger">
                  {k}
                </StorelyButton>
              ))}
            </div>
            {wasteMode ? (
              <StorelyButton onClick={handleWaste} disabled={!dispenseQty||!wasteReason||submitting} className="w-full" variant="primary">
                {submitting?T('saving',lang):`🗑️ تسجيل هدر ${dispenseQty||''} ${selected.unit}`}
              </StorelyButton>
            ) : (
              <StorelyButton onClick={handleDispense} disabled={!dispenseQty||submitting} className="w-full" variant="primary">
                {submitting?T('saving',lang):T('confirm',lang)}
              </StorelyButton>
            )}
          </div>
        </div>
      )}

      {/* Edit qty modal */}
      {editingProduct && (
        <div onClick={()=>setEditingProduct(null)} className="fixed flex items-end justify-center overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:200}}>
          <div onClick={e=>e.stopPropagation()} className="rounded-[var(--radius)] !p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto" style={{background:uiTokens.color.surface}}>
            <div className="text-lg font-semibold !mb-1" style={{color:uiTokens.color.text}}>{editingProduct.name}</div>
            <div className="text-sm !mb-5" style={{color:uiTokens.color.textMuted}}>الكمية الحالية: <b>{editingProduct.qty}</b> {editingProduct.unit}</div>
            <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.text}}>الكمية الجديدة</div>
            <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)} min="0" autoFocus className="w-full rounded-[var(--radius)] text-[28px] font-semibold text-center !mb-4 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={updateQty} disabled={savingQty} style={{flex:2}} variant="primary">
                {savingQty?'جاري الحفظ...':'✅ حفظ الكمية'}
              </StorelyButton>
              <StorelyButton onClick={()=>setEditingProduct(null)} className="min-w-0 flex-1" variant="secondary">
                إلغاء
              </StorelyButton>
            </div>
          </div>
        </div>
      )}

      {/* Add product modal */}
      {showAddProduct && (
        <div onClick={()=>setShowAddProduct(false)} className="fixed flex items-end justify-center overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:200}}>
          <div onClick={e=>e.stopPropagation()} className="rounded-[var(--radius)] !p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto" style={{background:uiTokens.color.surface}}>
            <div className="text-lg font-semibold !mb-5" style={{color:uiTokens.color.text}}><Plus size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> إضافة منتج جديد</div>
            <div className="flex flex-col gap-2 !mb-5">
              <input value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} placeholder="اسم المنتج *" autoFocus className="rounded-[var(--radius)] !text-base storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="number" value={newProduct.qty} onChange={e=>setNewProduct(p=>({...p,qty:e.target.value}))} placeholder="الكمية *" className="rounded-[var(--radius)] !text-base storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                <select value={newProduct.unit} onChange={e=>setNewProduct(p=>({...p,unit:e.target.value}))} className="rounded-[var(--radius)] text-base storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.surface}}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <input value={newProduct.category} onChange={e=>setNewProduct(p=>({...p,category:e.target.value}))} placeholder="الفئة (اختياري)" className="rounded-[var(--radius)] !text-base storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
            </div>
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={addProduct} disabled={savingProduct||!newProduct.name||!newProduct.qty} style={{flex:2}} variant="primary">
                {savingProduct?'جاري الإضافة...':'✅ إضافة'}
              </StorelyButton>
              <StorelyButton onClick={()=>setShowAddProduct(false)} className="min-w-0 flex-1" variant="secondary">
                إلغاء
              </StorelyButton>
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
