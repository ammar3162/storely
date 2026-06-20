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
    const saved = sessionStorage.getItem('staff_session')
    if (!saved) { router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    setSession(s)
    loadProducts(s)

    const savedLang = sessionStorage.getItem('staff_lang')
    if (savedLang && savedLang !== 'ar') {
      setLang(savedLang)
    }
  }, [])

  useEffect(() => {
    if (session && products.length > 0 && lang !== 'ar') {
      fetchTranslation(session, lang)
    }
  }, [session, products, lang])

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    let q = sb.from('products').select('id,name,unit,qty,category').eq('org_id', s.org_id).eq('is_active', true)
    if (s.branch_id) q = q.eq('branch_id', s.branch_id)
    const { data } = await q.order('name')
    setProducts(data || [])
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
    sessionStorage.setItem('staff_lang', newLang)

    if (newLang === 'ar' || !session) return

    // نطلب من الـ API دائماً — هو نفسه يتحقق من قاعدة البيانات
    // ويترجم فقط المنتجات الجديدة الناقصة (سريع لو كله محفوظ مسبقاً)
    await fetchTranslation(session, newLang)
  }

  function logout() {
    sessionStorage.removeItem('staff_session')
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

    const { error: mErr } = await sb.from('stock_movements').insert({
      product_id: selected.id,
      type: 'out',
      qty_change: -dispenseQty,
      note: `صرف بواسطة الموظف: ${session.name}`,
    })

    if (mErr) { showToast(t('errorTryAgain', lang)); setSubmitting(false); return }

    await sb.from('products').update({ qty: selected.qty - dispenseQty }).eq('id', selected.id)

    fetch('/api/send-pending-notifications', { method: 'POST' }).catch(() => {})
    fetch('/api/notify-supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: session.org_id }) }).catch(() => {})

    showToast(`✅ ${t('success', lang)}`)
    setSelected(null)
    setQty('')
    loadProducts(session)
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
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{session.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{session.org_name} {session.branch_name ? `· ${session.branch_name}` : ''}</div>
          </div>
          <button onClick={logout} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('logout', lang)}</button>
        </div>

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

      <div style={{ padding: 20, maxWidth: 520, margin: '0 auto' }}>
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
