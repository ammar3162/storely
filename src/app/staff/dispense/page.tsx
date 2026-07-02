'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const CATEGORY_COLORS = ['#16a34a','#2563eb','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#4f46e5']
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

function colorFor(cat: string, cats: string[]) {
  return CATEGORY_COLORS[cats.indexOf(cat) % CATEGORY_COLORS.length]
}

export default function StaffPage() {
  const [session, setSession] = useState<StaffSession|null>(null)
  const [tab, setTab] = useState<'dispense'|'inventory'|'purchases'|'reports'>('dispense')
  const [products, setProducts] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string,Record<string,string>>>({})
  const [lang, setLang] = useState('ar')
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string|null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [dispenseQty, setDispenseQty] = useState('')
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
  const sb = createClient()

  // Permissions polling
  useEffect(()=>{
    const interval = setInterval(async()=>{
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved)
      try {
        const res = await fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staff_id:s.id})})
        if(res.ok){
          const data = await res.json()
          if(data.permissions){
            const updated = {...s,permissions:data.permissions}
            localStorage.setItem('staff_session',JSON.stringify(updated))
            setSession(prev=>prev?{...prev,permissions:data.permissions}:prev)
          }
        }
      } catch {}
    }, 5000)
    return ()=>clearInterval(interval)
  },[])

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){router.push('/staff');return}
    const s = JSON.parse(saved) as StaffSession
    const p = s.permissions
    if(p && !p.dispense && !p.inventory && !p.purchases && !p.reports){router.push('/staff');return}
    setSession(s)
    if(p && !p.dispense){
      if(p.inventory) setTab('inventory')
      else if(p.purchases) setTab('purchases')
      else if(p.reports) setTab('reports')
    }
    loadProducts(s)
    sb.from('organizations' as any).select('logo_url').eq('id',s.org_id).single()
      .then(({data}:any)=>{ if(data?.logo_url) setOrgLogo(data.logo_url) })
    const savedLang = localStorage.getItem('staff_lang')
    if(savedLang) setLang(savedLang)
  },[])

  useEffect(()=>{
    if(session && products.length > 0 && lang !== 'ar') fetchTranslation(session, lang)
  },[session, products, lang])

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    try {
      const res = await fetch('/api/staff-products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orgId:s.org_id,branchId:s.branch_id,staffId:s.id})})
      const data = await res.json()
      setProducts(data.products || [])
    } catch { setProducts([]) }
    setLoading(false)
  }

  async function fetchTranslation(s: StaffSession, targetLang: string) {
    setTranslating(true)
    try {
      const res = await fetch('/api/translate-products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orgId:s.org_id,branchId:s.branch_id,targetLang})})
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
      const res = await fetch('/api/staff-dispense',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:selected.id,qty:Number(dispenseQty),staffName:session.name,orgId:session.org_id})})
      if(!res.ok){showMsg(T('error',lang),'error');setSubmitting(false);return}
      fetch('/api/notify-staff-dispense',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:session.org_id,staff_name:session.name,product_name:selected.name,qty:Number(dispenseQty),unit:selected.unit})}).catch(()=>{})
      fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:session.org_id,product_id:selected.id,new_qty:selected.qty-Number(dispenseQty),reorder_point:selected.reorder_point})}).catch(()=>{})
      showMsg(T('success',lang))
      setSelected(null); setDispenseQty('')
      loadProducts(session)
    } catch { showMsg(T('error',lang),'error') }
    setSubmitting(false)
  }

  async function updateQty() {
    if(!editingProduct||!editQty) return
    setSavingQty(true)
    const newQty = Number(editQty)
    const diff = newQty - editingProduct.qty
    await (sb as any).from('products').update({qty:newQty}).eq('id',editingProduct.id)
    if(diff!==0) await (sb as any).from('stock_movements').insert({product_id:editingProduct.id,type:diff>0?'in':'out',qty_change:diff,note:`تعديل يدوي بواسطة الموظف: ${session?.name}`})
    setSavingQty(false); setEditingProduct(null)
    if(session) loadProducts(session)
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

  function logout() { localStorage.removeItem('staff_session'); router.push('/staff') }

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

  const isRTL = lang==='ar'||lang==='ur'
  const tabs = [
    {key:'dispense',label:'📤 الصرف',show:session.permissions?.dispense},
    {key:'inventory',label:'📦 المخزون',show:session.permissions?.inventory},
    {key:'purchases',label:'🛒 المشتريات',show:session.permissions?.purchases},
    {key:'reports',label:'📊 التقارير',show:session.permissions?.reports},
  ].filter(t=>t.show)

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:isRTL?'rtl':'ltr'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .card{background:white;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s}
        .card:active{transform:scale(.98)}
        .tab-btn{padding:10px 18px;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .lang-btn{padding:6px 12px;border-radius:20px;border:none;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .2s}
        .prod-btn{background:white;border:none;border-radius:14px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;text-align:right;width:100%;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:all .15s}
        .prod-btn:active{transform:scale(.97);box-shadow:0 1px 4px rgba(0,0,0,.1)}
        input:focus,select:focus{border-color:#16a34a!important;outline:none!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:toast.type==='success'?'#16a34a':'#ef4444',color:'white',padding:'12px 24px',borderRadius:40,fontSize:14,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.2)',animation:'slideUp .3s ease',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'0',position:'sticky',top:0,zIndex:100,boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
        {/* Top bar */}
        <div style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {orgLogo ? (
              <img src={orgLogo} alt="" style={{width:38,height:38,borderRadius:10,objectFit:'cover',border:'2px solid rgba(255,255,255,.2)'}}/>
            ) : (
              <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
            )}
            <div>
              <div style={{fontSize:15,fontWeight:800,color:'white'}}>{session.name}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:1}}>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</div>
            </div>
          </div>
          <button onClick={logout} style={{background:'rgba(255,255,255,.1)',color:'white',border:'1px solid rgba(255,255,255,.2)',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',backdropFilter:'blur(4px)'}}>
            {T('logout',lang)}
          </button>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div style={{display:'flex',gap:4,padding:'0 16px',overflowX:'auto'}}>
            {tabs.map(t=>(
              <button key={t.key} className="tab-btn" onClick={()=>{setTab(t.key as any);if(t.key==='inventory'&&session)loadProducts(session)}}
                style={{background:tab===t.key?'white':'transparent',color:tab===t.key?'#0d2818':'rgba(255,255,255,.7)',borderBottom:tab===t.key?'none':'2px solid transparent',borderRadius:tab===t.key?'12px 12px 0 0':'12px 12px 0 0',paddingBottom:tab===t.key?12:10,marginBottom:tab===t.key?-2:0}}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Languages */}
        <div style={{padding:'10px 16px',display:'flex',gap:6,overflowX:'auto',background:'rgba(0,0,0,.1)'}}>
          {LANGUAGES.map(l=>(
            <button key={l.code} className="lang-btn" onClick={()=>{setLang(l.code);localStorage.setItem('staff_lang',l.code);if(l.code!=='ar'&&session)fetchTranslation(session,l.code)}} disabled={translating}
              style={{background:lang===l.code?'#16a34a':'rgba(255,255,255,.1)',color:'white',opacity:translating?0.6:1}}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Translating banner */}
      {translating && (
        <div style={{background:'#eff6ff',color:'#2563eb',padding:'10px 20px',fontSize:13,fontWeight:700,textAlign:'center'}}>
          {T('translating',lang)}
        </div>
      )}

      {/* ═══ DISPENSE TAB ═══ */}
      <div style={{display:tab==='dispense'&&session.permissions?.dispense?'block':'none',padding:'16px 20px',maxWidth:560,margin:'0 auto'}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCategory(null)}}
          style={{width:'100%',padding:'13px 16px',border:'2px solid #e2e8f0',borderRadius:14,fontSize:15,background:'white',color:'#1e293b',fontFamily:'inherit',fontWeight:500,boxSizing:'border-box' as const,marginBottom:16}}
          placeholder={`🔍 ${T('search',lang)}`}/>

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
                <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#16a34a',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdf4',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
              </button>
            ))}
          </div>
        ) : !activeCategory ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,animation:'fadeIn .3s'}}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>setActiveCategory(cat)}
                style={{background:colorFor(cat,categories),color:'white',border:'none',borderRadius:20,padding:'28px 16px',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:8,boxShadow:`0 8px 24px ${colorFor(cat,categories)}44`,minHeight:120,transition:'transform .15s,box-shadow .15s'}}>
                <div style={{fontSize:18,fontWeight:800}}>{tx(cat)}</div>
                {lang!=='ar'&&<div style={{fontSize:11,opacity:.7}}>{cat}</div>}
                <div style={{fontSize:12,opacity:.85,background:'rgba(255,255,255,.2)',padding:'3px 10px',borderRadius:20}}>{categoriesMap[cat]} {T('items',lang)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{animation:'fadeIn .3s'}}>
            <button onClick={()=>setActiveCategory(null)} style={{background:'none',border:'none',color:'#16a34a',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16,padding:0,display:'flex',alignItems:'center',gap:6}}>
              ← {T('back',lang)}
            </button>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>{tx(activeCategory)}</div>
              {lang!=='ar'&&<div style={{fontSize:12,color:'#94a3b8'}}>{activeCategory}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {categoryProducts.map(p=>(
                <button key={p.id} className="prod-btn" onClick={()=>setSelected(p)}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                    {lang!=='ar'&&<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.name}</div>}
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#16a34a',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdf4',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
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
              style={{padding:'9px 16px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.3)'}}>
              ＋ إضافة منتج
            </button>
          </div>
          <input value={invSearch} onChange={e=>setInvSearch(e.target.value)} placeholder="🔍 ابحث عن منتج..."
            style={{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:14,background:'white',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box' as const}}/>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filteredInventory.map(p=>(
              <div key={p.id} className="card" style={{padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{p.category||'—'}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:900,color:p.qty<=p.reorder_point?'#ef4444':'#16a34a',lineHeight:1}}>{p.qty}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{p.unit}</div>
                  </div>
                  <button onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}}
                    style={{padding:'7px 14px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    تعديل
                  </button>
                </div>
              </div>
            ))}
            {filteredInventory.length===0 && (
              <div className="card" style={{padding:40,textAlign:'center',color:'#94a3b8'}}>لا توجد منتجات</div>
            )}
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
            style={{padding:'16px 36px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 8px 24px rgba(22,163,74,.35)',display:'inline-flex',alignItems:'center',gap:8}}>
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
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>{setSelected(null);setDispenseQty('')}}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>{tx(selected.name)}</div>
                {lang!=='ar'&&<div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{selected.name}</div>}
                <div style={{fontSize:13,color:'#64748b',marginTop:4}}>{T('available',lang)}: <b style={{color:selected.qty<=selected.reorder_point?'#ef4444':'#16a34a'}}>{selected.qty} {selected.unit}</b></div>
              </div>
              <button onClick={()=>{setSelected(null);setDispenseQty('')}} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:36,height:36,color:'#64748b',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:10}}>{T('qty',lang)}</div>
            <input value={dispenseQty} onChange={e=>setDispenseQty(e.target.value.replace(/[^0-9.]/g,''))}
              style={{width:'100%',padding:'16px',border:'2px solid #e2e8f0',borderRadius:14,fontSize:28,fontWeight:800,textAlign:'center',fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:16}}
              placeholder="0" inputMode="decimal" autoFocus/>
            <button onClick={handleDispense} disabled={!dispenseQty||submitting}
              style={{width:'100%',padding:18,background:(!dispenseQty||submitting)?'#94a3b8':'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:800,cursor:(!dispenseQty||submitting)?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:(!dispenseQty||submitting)?'none':'0 8px 24px rgba(22,163,74,.35)'}}>
              {submitting?T('saving',lang):T('confirm',lang)}
            </button>
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
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
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
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:savingProduct||!newProduct.name||!newProduct.qty?0.6:1}}>
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
