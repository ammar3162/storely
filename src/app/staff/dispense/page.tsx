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
    if (savedLang) setLang(savedLang)
  }, [])

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    let q = sb.from('products').select('id,name,unit,qty,category').eq('org_id', s.org_id).eq('is_active', true)
    if (s.branch_id) q = q.eq('branch_id', s.branch_id)
    const { data } = await q.order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleLangChange(newLang: string) {
    setLang(newLang)
    sessionStorage.setItem('staff_lang', newLang)

    if (newLang === 'ar' || translations[newLang] || products.length === 0) return

    setTranslating(true)
    try {
      const catSet = new Set(products.map(p => p.category?.trim() || OTHER_CATEGORY))
      const allTerms = [...products.map(p => p.name), ...Array.from(catSet)]

      const res = await fetch('/api/translate-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNames: allTerms, targetLang: newLang }),
      })
      const data = await res.json()
      setTranslations(prev => ({ ...prev, [newLang]: data.translations || {} }))
    } catch {
      showToast('تعذّر تحميل الترجمة، سيظهر النص بالعربي')
    }
    setTranslating(false)
  }

  function logout() {
    sessionStorage.removeItem('staff_session')
    router.push('/staff')
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  function translate(text: string): string {
    if (lang === 'ar') return text
    return translations[lang]?.[text] || text
  }

  async function handleDispense() {
    if (!session || !selected || !qty || Number(qty) <= 0) {
      showToast('اختر المنتج وأدخل كمية صحيحة')
      return
    }
    if (Number(qty) > selected.qty) {
      showToast('الكمية المطلوبة أكبر من المتاح')
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

    if (mErr) { showToast('حدث خطأ، حاول مرة أخرى'); setSubmitting(false); return }

    await sb.from('products').update({ qty: selected.qty - dispenseQty }).eq('id', selected.id)

    fetch('/api/send-pending-notifications', { method: 'POST' }).catch(() => {})
    fetch('/api/notify-supplier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: session.org_id }) }).catch(() => {})

    showToast(`✅ ${translate('تم الصرف بنجاح')}`)
    setSelected(null)
    setQty('')
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
    ? products.filter(p => p.name?.includes(search.trim()) || translate(p.name).toLowerCase().includes(search.trim().toLowerCase()))
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
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", direction: 'rtl' }}>
      <div style={{ background: 'white', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{session.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{session.org_name} {session.branch_name ? `· ${session.branch_name}` : ''}</div>
          </div>
          <button onClick={logout} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>خروج</button>
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
          placeholder={lang === 'ar' ? '🔍 أو ابحث بالاسم مباشرة...' : '🔍 Search...'}
        />
      </div>

      <div style={{ padding: 20, maxWidth: 520, margin: '0 auto' }}>
        {translating && (
          <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            ⏳ جاري تجهيز الترجمة لأول مرة...
          </div>
        )}

        {toast && (
          <div style={{ background: toast.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: toast.startsWith('✅') ? '#16a34a' : '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {toast}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>جاري التحميل...</div>
        ) : search.trim() ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>لا توجد نتائج</div>
            ) : searchResults.map(p => (
              <ProductCard key={p.id} p={p} displayName={translate(p.name)} showOriginal={lang !== 'ar'} onClick={() => setSelected(p)} />
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
                <div style={{ fontSize: 17, fontWeight: 800 }}>{translate(cat)}</div>
                {lang !== 'ar' && <div style={{ fontSize: 11, opacity: .7 }}>{cat}</div>}
                <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>{categoriesMap[cat]} {lang === 'ar' ? 'صنف' : 'items'}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setActiveCategory(null)}
              style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← {lang === 'ar' ? 'رجوع للفئات' : 'Back'}
            </button>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{translate(activeCategory)}</div>
              {lang !== 'ar' && <div style={{ fontSize: 12, color: '#94a3b8' }}>{activeCategory}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryProducts.map(p => (
                <ProductCard key={p.id} p={p} displayName={translate(p.name)} showOriginal={lang !== 'ar'} onClick={() => setSelected(p)} />
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={() => { setSelected(null); setQty('') }}>
            <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{translate(selected.name)}</div>
                  {lang !== 'ar' && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{selected.name}</div>}
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{lang === 'ar' ? 'المتاح' : 'Available'}: {selected.qty} {selected.unit}</div>
                </div>
                <button onClick={() => { setSelected(null); setQty('') }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#64748b', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>{lang === 'ar' ? 'الكمية المراد صرفها' : 'Quantity to dispense'}</div>
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
                {submitting ? '...' : lang === 'ar' ? '✓ تسجيل الصرف' : '✓ Confirm'}
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
