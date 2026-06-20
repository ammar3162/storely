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

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'fr', label: 'Français' },
]

export default function StaffDispensePage() {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [lang, setLang] = useState('ar')
  const [translating, setTranslating] = useState(false)
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
    let q = sb.from('products').select('id,name,unit,qty').eq('org_id', s.org_id).eq('is_active', true)
    if (s.branch_id) q = q.eq('branch_id', s.branch_id)
    const { data } = await q.order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleLangChange(newLang: string) {
    setLang(newLang)
    sessionStorage.setItem('staff_lang', newLang)
    setSearch('')
    setSelected(null)

    if (newLang === 'ar' || translations[newLang] || products.length === 0) return

    setTranslating(true)
    try {
      const res = await fetch('/api/translate-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNames: products.map(p => p.name), targetLang: newLang }),
      })
      const data = await res.json()
      setTranslations(prev => ({ ...prev, [newLang]: JSON.stringify(data.translations || {}) }))
    } catch {
      showToast('تعذّر تحميل الترجمة، البحث سيكون بالعربي فقط')
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

    showToast(`✅ تم صرف ${dispenseQty} ${selected.unit} من ${selected.name}`)
    setSelected(null)
    setQty('')
    setSearch('')
    loadProducts(session)
    setSubmitting(false)
  }

  function getDisplayName(p: any): string {
    if (lang === 'ar') return p.name
    try {
      const dict = JSON.parse(translations[lang] || '{}')
      return dict[p.name] || p.name
    } catch {
      return p.name
    }
  }

  function matchesSearch(p: any, query: string): boolean {
    const q = query.toLowerCase().trim()
    if (p.name.toLowerCase().includes(q)) return true
    if (lang !== 'ar') {
      const translated = getDisplayName(p).toLowerCase()
      if (translated.includes(q)) return true
    }
    return false
  }

  const filtered = search ? products.filter(p => matchesSearch(p, search)) : []

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
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
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
      </div>

      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
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

        <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>اختر المنتج</div>
          <input
            value={selected ? getDisplayName(selected) : search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            style={inp}
            placeholder="ابحث عن منتج..."
          />
          {!selected && search && (
            <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: 12 }}>
              {loading ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>جاري التحميل...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>لا توجد نتائج</div>
              ) : filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setSelected(p); setSearch('') }}
                  style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{getDisplayName(p)}</div>
                    {lang !== 'ar' && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{p.name}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{p.qty} {p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{getDisplayName(selected)}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>المتاح: {selected.qty} {selected.unit}</div>
              </div>
              <button onClick={() => { setSelected(null); setQty('') }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>الكمية المراد صرفها</div>
            <input
              value={qty}
              onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ''))}
              style={{ ...inp, fontSize: 20, fontWeight: 800, textAlign: 'center' }}
              placeholder="0"
              inputMode="decimal"
            />
          </div>
        )}

        <button
          onClick={handleDispense}
          disabled={!selected || !qty || submitting}
          style={{
            width: '100%', padding: 16, background: (!selected || !qty || submitting) ? '#94a3b8' : '#16a34a',
            color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800,
            cursor: (!selected || !qty || submitting) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(22,163,74,.25)',
          }}
        >
          {submitting ? 'جاري الحفظ...' : '✓ تسجيل الصرف'}
        </button>
      </div>
    </div>
  )
}
