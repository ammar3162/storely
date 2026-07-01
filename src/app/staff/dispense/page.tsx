'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StaffSession {
  id: string
  name: string
  org_id: string
  branch_id: string | null
  org_name: string
  branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const CATEGORY_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5',
]
const OTHER_CATEGORY = 'أخرى'

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'fr', label: 'Français' },
]

const UI = {
  logout:        { ar: 'خروج',                       en: 'Logout',                  ur: 'لاگ آؤٹ',                 hi: 'लॉगआउट',              tl: 'Lumabas',           bn: 'লগআউট',              fr: 'Déconnexion' },
  search:        { ar: 'ابحث بالاسم مباشرة...',       en: 'Search by name...',       ur: 'نام سے تلاش کریں...',     hi: 'नाम से खोजें...',     tl: 'Maghanap...',       bn: 'নাম দিয়ে খুঁজুন...',  fr: 'Rechercher...' },
  back:          { ar: 'رجوع للفئات',                 en: 'Back to categories',      ur: 'زمروں پر واپس',           hi: 'श्रेणियों पर वापस',   tl: 'Bumalik',           bn: 'বিভাগে ফিরে যান',     fr: 'Retour aux catégories' },
  itemsCount:    { ar: 'صنف',                         en: 'items',                   ur: 'اشیاء',                    hi: 'आइटम',                tl: 'mga item',          bn: 'আইটেম',              fr: 'articles' },
  noResults:     { ar: 'لا توجد نتائج',                en: 'No results',              ur: 'کوئی نتیجہ نہیں',         hi: 'कोई परिणाम नहीं',     tl: 'Walang resulta',    bn: 'কোনো ফলাফল নেই',     fr: 'Aucun résultat' },
  loading:       { ar: 'جاري التحميل...',              en: 'Loading...',              ur: 'لوڈ ہو رہا ہے...',        hi: 'लोड हो रहा है...',    tl: 'Naglo-load...',     bn: 'লোড হচ্ছে...',       fr: 'Chargement...' },
  available:     { ar: 'المتاح',                       en: 'Available',               ur: 'دستیاب',                  hi: 'उपलब्ध',              tl: 'Available',         bn: 'উপলব্ধ',             fr: 'Disponible' },
  qtyToDispense: { ar: 'الكمية المراد صرفها',          en: 'Quantity to dispense',    ur: 'تقسیم کی مقدار',          hi: 'वितरित करने की मात्रा', tl: 'Dami na ibibigay', bn: 'বিতরণের পরিমাণ',     fr: 'Quantité à distribuer' },
  confirm:       { ar: '✓ تسجيل الصرف',                en: '✓ Confirm',               ur: '✓ تصدیق کریں',            hi: '✓ पुष्टि करें',       tl: '✓ Kumpirmahin',     bn: '✓ নিশ্চিত করুন',     fr: '✓ Confirmer' },
  saving:        { ar: 'جاري الحفظ...',                en: 'Saving...',               ur: 'محفوظ ہو رہا ہے...',      hi: 'सहेजा जा रहा है...',  tl: 'Sine-save...',      bn: 'সংরক্ষণ হচ্ছে...',   fr: 'Enregistrement...' },
  success:       { ar: 'تم الصرف بنجاح',               en: 'Dispensed successfully',  ur: 'کامیابی سے تقسیم ہوا',    hi: 'सफलतापूर्वक वितरित',  tl: 'Matagumpay',        bn: 'সফলভাবে বিতরণ হয়েছে', fr: 'Distribué avec succès' },
  selectValid:   { ar: 'اختر المنتج وأدخل كمية صحيحة', en: 'Select item and valid qty', ur: 'آئٹم اور درست مقدار منتخب کریں', hi: 'आइटम चुनें और सही मात्रा डालें', tl: 'Pumili at maglagay ng tamang dami', bn: 'আইটেম নির্বাচন করুন', fr: 'Sélectionnez un article' },
  tooMuch:       { ar: 'الكمية المطلوبة أكبر من المتاح', en: 'Quantity exceeds available', ur: 'مقدار دستیاب سے زیادہ ہے', hi: 'मात्रा उपलब्ध से अधिक है', tl: 'Lumampas sa available', bn: 'পরিমাণ উপলব্ধের চেয়ে বেশি', fr: 'Quantité dépassée' },
  errorTryAgain: { ar: 'حدث خطأ، حاول مرة أخرى',       en: 'Error, please try again', ur: 'خرابی، دوبارہ کوشش کریں', hi: 'त्रुटि, फिर से प्रयास करें', tl: 'May error, subukan ulit', bn: 'ত্রুটি, আবার চেষ্টা করুন', fr: 'Erreur, réessayez' },
  preparingTranslation: { ar: '⏳ جاري تجهيز الترجمة لأول مرة...', en: '⏳ Preparing translation...', ur: '⏳ ترجمہ تیار ہو رہا ہے...', hi: '⏳ अनुवाद तैयार हो रहा है...', tl: '⏳ Inihahanda ang pagsasalin...', bn: '⏳ অনুবাদ প্রস্তুত হচ্ছে...', fr: '⏳ Préparation de la traduction...' },
}

function t(key: keyof typeof UI, lang: string): string {
  return (UI[key] as any)[lang] || UI[key].ar
}

function colorFor(category: string, allCategories: string[]) {
  const idx = allCategories.indexOf(category)
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
}

export default function StaffDispensePage() {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [activeTab, setActiveTab] = useState<'dispense'|'inventory'|'purchases'|'reports'>('dispense')
  const [editingProduct, setEditingProduct] = useState<any|null>(null)
  const [editQty, setEditQty] = useState('')
  const [savingQty, setSavingQty] = useState(false)
  const [orgLogo, setOrgLogo] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [lang, setLang] = useState('ar')
  const [translating, setTranslating] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToastMsg] = useState('')
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('staff_session')
    if (!saved) { router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    // لو ما عنده أي صلاحية نحوله لتسجيل الدخول
    if (s.permissions && !s.permissions.dispense && !s.permissions.inventory && !s.permissions.purchases && !s.permissions.reports) {
      router.push('/staff')
      return
    }
    setSession(s)
    // لو عنده صلاحيات أخرى بدون صرف، ابدأ بأول صلاحية متاحة
    if (s.permissions && !s.permissions.dispense) {
      if (s.permissions.inventory) setActiveTab('inventory')
      else if (s.permissions.purchases) setActiveTab('purchases')
      else if (s.permissions.reports) setActiveTab('reports')
    }
    loadProducts(s);
    (sb.from('organizations') as any).select('logo_url').eq('id', s.org_id).single()
      .then(({ data }: any) => { if (data?.logo_url) setOrgLogo(data.logo_url) })

    const savedLang = localStorage.getItem('staff_lang')
    if (savedLang && savedLang !== 'ar') {
      setLang(savedLang)
    }
  }, [])

  useEffect(() => {
    if (session && products.length > 0 && lang !== 'ar') {
      fetchTranslation(session, lang)
    }
  }, [session, products, lang])

  async function updateQty() {
    if (!editingProduct || !editQty) return
    setSavingQty(true)
    const sb = (await import('@/lib/supabase/client')).createClient()
    const newQty = Number(editQty)
    const diff = newQty - editingProduct.qty
    await (sb as any).from('products').update({ qty: newQty }).eq('id', editingProduct.id)
    if (diff !== 0) {
      await (sb as any).from('stock_movements').insert({
        product_id: editingProduct.id,
        type: diff > 0 ? 'in' : 'out',
        qty_change: diff,
        note: `تعديل يدوي بواسطة الموظف: ${session?.name}`,
        profile_id: null
      })
    }
    setSavingQty(false)
    setEditingProduct(null)
    if (session) loadProducts(session)
  }

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    try {
      const res = await fetch('/api/staff-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: s.org_id, branchId: s.branch_id, staffId: s.id }),
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch {
      setProducts([])
    }
    setLoading(false)
  }

  async function fetchTranslation(s: StaffSession, targetLang: string) {
    setTranslating(true)
    try {
      const res = await fetch('/api/translate-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: s.org_id, branchId: s.branch_id, targetLang }),
      })
      const data = await res.json()
      setTranslations(prev => ({ ...prev, [targetLang]: data.translations || {} }))
    } catch {
      showToast(t('errorTryAgain', lang))
    }
    setTranslating(false)
  }

  async function handleLangChange(newLang: string) {
    setLang(newLang)
    localStorage.setItem('staff_lang', newLang)

    if (newLang === 'ar' || !session) return

    // نطلب من الـ API دائماً — هو نفسه يتحقق من قاعدة البيانات
    // ويترجم فقط المنتجات الجديدة الناقصة (سريع لو كله محفوظ مسبقاً)
    await fetchTranslation(session, newLang)
  }

  function logout() {
    localStorage.removeItem('staff_session')
    router.push('/staff')
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  function translateName(text: string): string {
    if (lang === 'ar') return text
    const clean = (text || '').trim()
    return translations[lang]?.[clean] || translations[lang]?.[text] || text
  }

  async function handleDispense() {
    if (!session || !selected || !qty || Number(qty) <= 0) {
      showToast(t('selectValid', lang))
      return
    }
    if (Number(qty) > selected.qty) {
      showToast(t('tooMuch', lang))
      return
    }
    setSubmitting(true)
    const dispenseQty = Number(qty)

    try {
      const res = await fetch('/api/staff-dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selected.id, qty: dispenseQty, staffName: session.name, orgId: session.org_id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(t('errorTryAgain', lang)); setSubmitting(false); return }

      // إشعار صرف الموظف للمدير
      fetch('/api/notify-staff-dispense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: session.org_id, staff_name: session.name, product_name: selected.name, qty: dispenseQty, unit: selected.unit }) }).catch(() => {})
      // إشعار نقص المخزون فقط عند الوصول للحد
      fetch('/api/notify-low-stock-instant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: session.org_id, product_id: selected.id, new_qty: selected.qty - dispenseQty, reorder_point: selected.reorder_point }) }).catch(() => {})

      showToast(`✅ ${t('success', lang)}`)
      setSelected(null)
      setQty('')
      loadProducts(session)
    } catch {
      showToast(t('errorTryAgain', lang))
    }
    setSubmitting(false)
  }

  const categoriesMap: Record<string, number> = {}
  products.forEach(p => {
    const cat = p.category?.trim() || OTHER_CATEGORY
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1
  })
  const categories = Object.keys(categoriesMap).sort((a, b) => {
    if (a === OTHER_CATEGORY) return 1
    if (b === OTHER_CATEGORY) return -1
    return categoriesMap[b] - categoriesMap[a]
  })

  const searchResults = search.trim()
    ? products.filter(p => p.name?.includes(search.trim()) || translateName(p.name).toLowerCase().includes(search.trim().toLowerCase()))
    : []
  const categoryProducts = activeCategory
    ? products.filter(p => (p.category?.trim() || OTHER_CATEGORY) === activeCategory)
    : []

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '2px solid #e2e8f0',
    borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box',
    background: 'white', color: '#1e293b', fontFamily: 'inherit', fontWeight: 500,
  }

  if (!session) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", direction: lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr' }}>
      <div style={{ background: 'white', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {orgLogo && (
              <img src={orgLogo} alt={session.org_name} style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}/>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{session.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{session.org_name} {session.branch_name ? `· ${session.branch_name}` : ''}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {session.permissions?.inventory && (
              <span style={{fontSize:11,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'3px 8px',fontWeight:600}}>📦 مخزون</span>
            )}
            {session.permissions?.purchases && (
              <span style={{fontSize:11,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:20,padding:'3px 8px',fontWeight:600}}>🛒 مشتريات</span>
            )}
            {session.permissions?.reports && (
              <span style={{fontSize:11,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',borderRadius:20,padding:'3px 8px',fontWeight:600}}>📊 تقارير</span>
            )}
          </div>
          <button onClick={logout} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('logout', lang)}</button>
        </div>

        {/* تبويبات الصلاحيات */}
        {(session.permissions?.inventory || session.permissions?.purchases || session.permissions?.reports) && (
          <div style={{display:'flex',gap:6,marginBottom:12,overflowX:'auto',paddingBottom:4}}>
            <button onClick={()=>setActiveTab('dispense')}
              style={{padding:'7px 16px',borderRadius:20,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,background:activeTab==='dispense'?'#16a34a':'#f1f5f9',color:activeTab==='dispense'?'white':'#64748b'}}>
              📤 الصرف
            </button>
            {session.permissions?.inventory && (
              <button onClick={()=>{setActiveTab('inventory');if(session)loadProducts(session)}}
                style={{padding:'7px 16px',borderRadius:20,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,background:activeTab==='inventory'?'#16a34a':'#f1f5f9',color:activeTab==='inventory'?'white':'#64748b'}}>
                📦 مخزون
              </button>
            )}
            {session.permissions?.purchases && (
              <button onClick={()=>setActiveTab('purchases')}
                style={{padding:'7px 16px',borderRadius:20,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,background:activeTab==='purchases'?'#16a34a':'#f1f5f9',color:activeTab==='purchases'?'white':'#64748b'}}>
                🛒 مشتريات
              </button>
            )}
            {session.permissions?.reports && (
              <button onClick={()=>setActiveTab('reports')}
                style={{padding:'7px 16px',borderRadius:20,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,background:activeTab==='reports'?'#16a34a':'#f1f5f9',color:activeTab==='reports'?'white':'#64748b'}}>
                📊 تقارير
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 4 }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => handleLangChange(l.code)}
              disabled={translating}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700,
                cursor: translating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                background: lang === l.code ? '#16a34a' : '#f1f5f9',
                color: lang === l.code ? 'white' : '#64748b',
                flexShrink: 0,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
          style={inp}
          placeholder={`🔍 ${t('search', lang)}`}
        />
      </div>

      <div style={{ padding: 20, maxWidth: 520, margin: '0 auto', display: activeTab==='dispense' ? 'block' : 'none' }}>
        {translating && (
          <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {t('preparingTranslation', lang)}
          </div>
        )}

        {toast && (
          <div style={{ background: toast.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: toast.startsWith('✅') ? '#16a34a' : '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {toast}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{t('loading', lang)}</div>
        ) : search.trim() ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{t('noResults', lang)}</div>
            ) : searchResults.map(p => (
              <ProductCard key={p.id} p={p} displayName={translateName(p.name)} showOriginal={lang !== 'ar'} onClick={() => setSelected(p)} />
            ))}
          </div>
        ) : !activeCategory ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: colorFor(cat, categories), color: 'white', border: 'none',
                  borderRadius: 18, padding: '24px 16px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(0,0,0,.1)', minHeight: 110,
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 800 }}>{translateName(cat)}</div>
                {lang !== 'ar' && <div style={{ fontSize: 11, opacity: .7 }}>{cat}</div>}
                <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>{categoriesMap[cat]} {t('itemsCount', lang)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setActiveCategory(null)}
              style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← {t('back', lang)}
            </button>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{translateName(activeCategory)}</div>
              {lang !== 'ar' && <div style={{ fontSize: 12, color: '#94a3b8' }}>{activeCategory}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryProducts.map(p => (
                <ProductCard key={p.id} p={p} displayName={translateName(p.name)} showOriginal={lang !== 'ar'} onClick={() => setSelected(p)} />
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={() => { setSelected(null); setQty('') }}>
            <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{translateName(selected.name)}</div>
                  {lang !== 'ar' && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{selected.name}</div>}
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('available', lang)}: {selected.qty} {selected.unit}</div>
                </div>
                <button onClick={() => { setSelected(null); setQty('') }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#64748b', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>{t('qtyToDispense', lang)}</div>
              <input
                value={qty}
                onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ''))}
                style={{ ...inp, fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}
                placeholder="0"
                inputMode="decimal"
                autoFocus
              />
              <button
                onClick={handleDispense}
                disabled={!qty || submitting}
                style={{
                  width: '100%', padding: 16, background: (!qty || submitting) ? '#94a3b8' : '#16a34a',
                  color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800,
                  cursor: (!qty || submitting) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {submitting ? t('saving', lang) : t('confirm', lang)}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* modal تعديل الكمية */}
      {editingProduct && (
        <div style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setEditingProduct(null)}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>{editingProduct.name}</div>
            <div style={{fontSize:12,color:'#64748b',marginBottom:20}}>الكمية الحالية: {editingProduct.qty} {editingProduct.unit}</div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>الكمية الجديدة</label>
              <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)} min="0"
                style={{width:'100%',padding:'12px 16px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:18,fontWeight:700,textAlign:'center',outline:'none',fontFamily:'inherit'}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={updateQty} disabled={savingQty}
                style={{flex:2,padding:'13px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {savingQty?'جاري الحفظ...':'✅ حفظ الكمية'}
              </button>
              <button onClick={()=>setEditingProduct(null)}
                style={{flex:1,padding:'13px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:12,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab==='inventory' && (
        <div style={{padding:'16px 20px',maxWidth:520,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16,textAlign:'center'}}>📦 المخزون</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {products.map(p=>(
              <div key={p.id} style={{background:'white',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{translateName(p.name)}</div>
                  <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{p.category||'—'}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:18,fontWeight:900,color:p.qty<=p.reorder_point?'#ef4444':'#16a34a'}}>{p.qty}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{p.unit}</div>
                  </div>
                  <button onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}}
                    style={{padding:'6px 12px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab==='purchases' && (
        <div style={{padding:'40px 20px',textAlign:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
          <div style={{fontSize:56,marginBottom:16}}>🛒</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:8}}>تسجيل المشتريات</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:24}}>سجّل فواتير الشراء مع الضريبة وصور الفواتير</div>
          <button onClick={()=>router.push('/staff/purchases')}
            style={{padding:'14px 32px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
            📝 تسجيل شراء جديد
          </button>
        </div>
      )}
      {activeTab==='reports' && (
        <div style={{padding:'60px 20px',textAlign:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
          <div style={{fontSize:48,marginBottom:16}}>📊</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:8}}>التقارير</div>
          <div style={{fontSize:13,color:'#64748b'}}>هذه الميزة ستكون متاحة قريباً</div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ p, displayName, showOriginal, onClick }: { p: any; displayName: string; showOriginal: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'white', border: 'none', borderRadius: 14, padding: '16px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)', fontFamily: 'inherit', textAlign: 'right', width: '100%',
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{displayName}</div>
        {showOriginal && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{p.name}</div>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 8 }}>{p.qty} {p.unit}</span>
    </button>
  )
}
