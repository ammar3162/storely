'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import NumberInput from '@/components/NumberInput'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/session'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import MenuItemsEditor from '@/components/shop/MenuItemsEditor'

export default function OnlineStorePage() {
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasSubscription, setHasSubscription] = useState<boolean|null>(null)
  const [saving, setSaving] = useState(false)
  const [slug, setSlug] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [tagline, setTagline] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [links, setLinks] = useState<{type:string;label:string;url:string}[]>([])
  const PLATFORMS = [
    { v: 'instagram', l: '📷 إنستقرام' },
    { v: 'tiktok', l: '🎵 تيك توك' },
    { v: 'snapchat', l: '👻 سناب شات' },
    { v: 'whatsapp', l: '💬 واتساب' },
    { v: 'google_maps', l: '📍 قوقل ماب' },
    { v: 'website', l: '🔗 رابط مخصص' },
  ]
  const [products, setProducts] = useState<any[]>([])
  const [shopItems, setShopItems] = useState<any[]>([])
  const [logoUrl, setLogoUrl] = useState<string|null>(null)
  const [suggestingColor, setSuggestingColor] = useState(false)
  const [shopColor, setShopColor] = useState('#0f766e')
  const [hoursEnabled, setHoursEnabled] = useState(false)
  const [hours24, setHours24] = useState(true)
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [loadError, setLoadError] = useState('')
  const [branchNotSubscribed, setBranchNotSubscribed] = useState('')
  // منيو لكل فرع: mode=branch → نعرض فرع واحد (أصنافه + أصناف كل الفروع)
  const [mode, setMode] = useState<'org'|'branch'>('org')
  const [branchId, setBranchId] = useState<string|null>(null)
  const [menuBranches, setMenuBranches] = useState<{id:string;name:string;shop_slug:string|null;shop_hours:any}[]>([])
  const [canManageOrg, setCanManageOrg] = useState(true)
  const [orgHours, setOrgHours] = useState<any>(null)
  const [branchSlug, setBranchSlug] = useState('')
  const [bHoursEnabled, setBHoursEnabled] = useState(false)
  const [bHours24, setBHours24] = useState(true)
  const [bOpen, setBOpen] = useState('09:00')
  const [bClose, setBClose] = useState('22:00')
  const [savingBranch, setSavingBranch] = useState(false)
  const [recipes, setRecipes] = useState<any[]>([])
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const oid = await getOrgId()
    if (!oid) return
    setOrgId(oid)
    try {
      const subRes = await fetch(`/api/addons-market?org_id=${oid}`)
      const subJ = await subRes.json()
      const menuAddon = (subJ.addons || []).find((a: any) => a.slug === 'online_menu')
      const valid = !!menuAddon?.subscription?.isValid
      // المنيو مشترك لفروع معيّنة: الصفحة تتبع الفرع المختار بالقائمة — فرع غير مشترك = رسالة بدل المنيو
      const ids = menuAddon?.subscription?.branch_ids
      const cur = sessionStorage.getItem('s_branch_id')
      if (valid && Array.isArray(ids) && ids.length && cur && !ids.includes(cur)) {
        setBranchNotSubscribed(sessionStorage.getItem('s_branch_name') || 'هذا الفرع')
        setHasSubscription(true); setLoading(false); return
      }
      setHasSubscription(valid)
      if (valid) load(oid!)
      else setLoading(false)
    } catch { setHasSubscription(false); setLoading(false) }
  }

  async function load(oid: string, wantBranch?: string | null, quiet = false) {
    if (!quiet) setLoading(true)
    const bid = wantBranch || sessionStorage.getItem('s_branch_id') || branchId
    const params = new URLSearchParams({ org_id: oid })
    if (bid) params.set('branch_id', bid)
    const res = await fetch(`/api/shop-settings?${params.toString()}`)
    const j = await res.json()
    if (!j.success && j.error) { toast(j.error, 'error'); setLoadError(j.error) }
    if (j.success) {
      setLoadError('')
      setMode(j.mode === 'branch' ? 'branch' : 'org')
      setBranchId(j.branchId || null)
      setMenuBranches(j.branches || [])
      setCanManageOrg(j.canManageOrg !== false)
      setRecipes(j.recipes || [])
      setOrgHours(j.org?.shop_hours || null)
      const br = (j.branches || []).find((b: any) => b.id === j.branchId)
      setBranchSlug(br?.shop_slug || '')
      const bh = br?.shop_hours || j.org?.shop_hours || {}
      setBHoursEnabled(!!bh.enabled); setBHours24(bh.is24h !== false); setBOpen(bh.open || '09:00'); setBClose(bh.close || '22:00')
      setSlug(j.org?.shop_slug || '')
      setEnabled(!!j.org?.shop_enabled)
      setTagline(j.org?.shop_tagline || '')
      setShopColor(j.org?.shop_color || '#0f766e')
      setDisplayName(j.org?.shop_display_name || '')
      setOrgName(j.org?.name || '')
      setLinks(Array.isArray(j.org?.shop_links) ? j.org.shop_links.map((l:any)=>({type:l.type||'website',label:l.label||'',url:l.url||''})) : [])
      const h = j.org?.shop_hours || {}
      setHoursEnabled(!!h.enabled); setHours24(h.is24h !== false); setOpenTime(h.open || '09:00'); setCloseTime(h.close || '22:00')
      setLogoUrl(j.org?.logo_url || null)
      setProducts(j.products || [])
      setShopItems(j.shopItems || [])
    }
    setLoading(false)
  }

  async function saveShopSettings() {
    setSaving(true)
    const res = await fetch('/api/shop-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, shop_slug: slug, shop_enabled: enabled, shop_tagline: tagline, shop_color: shopColor, shop_display_name: displayName, shop_links: links, shop_hours: { enabled: hoursEnabled, is24h: hours24, open: openTime, close: closeTime } }),
    })
    const j = await res.json()
    setSaving(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    setSlug(j.slug || '')
    toast('✅ تم حفظ إعدادات المتجر')
  }

  function suggestColorFromLogo() {
    if (!logoUrl) { toast('ما فيه شعار مرفوع للمنشأة — ارفعه أول من صفحة الإعدادات', 'warning'); return }
    setSuggestingColor(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { setSuggestingColor(false); return }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        const buckets: Record<string, { count: number; r: number; g: number; b: number; sat: number }> = {}
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 200) continue
          if (r > 235 && g > 235 && b > 235) continue
          if (r < 20 && g < 20 && b < 20) continue
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const sat = max === 0 ? 0 : (max - min) / max
          const key = `${Math.round(r / 20) * 20}-${Math.round(g / 20) * 20}-${Math.round(b / 20) * 20}`
          if (!buckets[key]) buckets[key] = { count: 0, r, g, b, sat }
          buckets[key].count++
        }
        const sorted = Object.values(buckets).sort((a, b) => (b.count * (1 + b.sat)) - (a.count * (1 + a.sat)))
        if (sorted[0]) {
          const hex = '#' + [sorted[0].r, sorted[0].g, sorted[0].b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
          setShopColor(hex)
          toast('✅ تم اقتراح لون من شعارك — قدر تعدّله لو حبيت')
        } else {
          toast('ما قدرنا نحدد لون واضح من الشعار', 'warning')
        }
      } catch {
        toast('تعذّر تحليل الشعار', 'error')
      }
      setSuggestingColor(false)
    }
    img.onerror = () => { setSuggestingColor(false); toast('تعذّر تحميل الشعار', 'error') }
    img.src = logoUrl
  }

  async function saveBranchSettings() {
    if (!branchId) return
    setSavingBranch(true)
    const res = await fetch('/api/shop-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, branch_id: branchId, shop_slug: branchSlug, shop_hours: { enabled: bHoursEnabled, is24h: bHours24, open: bOpen, close: bClose } }),
    })
    const j = await res.json()
    setSavingBranch(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    if (j.shop_slug) {
      setBranchSlug(j.shop_slug)
      setMenuBranches(prev => prev.map(b => b.id === branchId ? { ...b, shop_slug: j.shop_slug } : b))
    }
    toast('✅ تم حفظ إعدادات الفرع')
  }

  function addLink() { setLinks(prev => [...prev, { type: 'instagram', label: '', url: '' }]) }
  function updateLink(i: number, patch: any) { setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)) }

  const shownCount = products.filter(p => p.show_on_shop).length
  const previewUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/shop/${slug}` : ''
  const currentBranch = menuBranches.find(b => b.id === branchId)
  const savedBranchSlug = currentBranch?.shop_slug || ''
  const branchUrl = mode === 'branch' && previewUrl && savedBranchSlug ? `${previewUrl}/${savedBranchSlug}` : ''
  const qrUrl = mode === 'branch' ? branchUrl : previewUrl

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  if (branchNotSubscribed) {
    return (
      <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginBottom: 8 }}>{branchNotSubscribed} غير مشترك بالمنيو الإلكتروني</div>
        <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8, marginBottom: 20 }}>
          <span className="hide-in-app">بدّل للفرع المشترك من القائمة، أو أضف هذا الفرع للمنيو من الإضافات</span>
        </div>
        <a className="hide-in-app" href="/addons-market" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>روح لالإضافات</a>
      </div>
    )
  }

  if (hasSubscription === false) {
    return (
      <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginBottom: 8 }}>ميزة "المنتجات" غير مفعّلة</div>
        <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8, marginBottom: 20 }}>
          <span className="hide-in-app">اشترك بميزة المنيو الإلكتروني من الإضافات عشان تقدر تبني صفحة منتجاتك العامة</span>
        </div>
        <a className="hide-in-app" href="/addons-market" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>روح لالإضافات</a>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}><PageIcon/>المنيو الإلكتروني</h1>
        <p style={pageSub}>ابنِ صفحة عامة تعرض منتجاتك للعملاء — بالسعر والوصف والصورة</p>
      </div>

      {loadError && (
        <div style={{ ...card, padding: 24, marginBottom: 16, textAlign: 'center' as const, color: colors.text3, fontSize: 13 }}>{loadError}</div>
      )}


      {canManageOrg && !loadError && (
      <div style={{ ...card, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>إعدادات المتجر</div>
        {mode === 'branch'
          ? <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>الاسم والشعار واللون والروابط لكل الفروع — والرابط العام يفتح صفحة يختار منها الزبون الفرع</div>
          : <div style={{ marginBottom: 10 }} />}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>رابط المتجر</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: colors.text4, whiteSpace: 'nowrap' as const }}>storely.dev/shop/</span>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="اسم-منشأتك" style={{ ...inp(), flex: 1 }} dir="ltr" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>اسم يظهر بالمتجر (اختياري)</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={orgName || 'اسم منشأتك التجاري'} style={{ ...inp(), width: '100%' }} />
          <div style={{ fontSize: 10, color: colors.text4, marginTop: 4 }}>لو تركته فاضي، بيظهر اسم منشأتك المسجّل ({orgName})</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>وصف قصير (اختياري)</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="مثال: أشهى المخبوزات الطازجة يومياً" style={{ ...inp(), width: '100%' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 8 }}>لون المتجر</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
            {['#0f766e', '#0369a1', '#b91c1c', '#7c2d12', '#7c3aed', '#0f172a', '#be185d', '#a16207'].map(c => (
              <button key={c} onClick={() => setShopColor(c)} style={{ width: 32, height: 32, borderRadius: 10, background: c, border: shopColor === c ? '3px solid #0f172a' : '1px solid #e2e8f0', cursor: 'pointer', boxShadow: shopColor === c ? '0 0 0 2px white inset' : 'none' }} />
            ))}
            <input type="color" value={shopColor} onChange={e => setShopColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 0 }} />
            <button onClick={suggestColorFromLogo} disabled={suggestingColor} style={{ padding: '0 14px', height: 32, borderRadius: 10, border: `1.5px solid ${colors.infoBorder}`, background: colors.infoLight, color: colors.info, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
              {suggestingColor ? '⏳ جاري التحليل...' : '🎨 اقترح من الشعار'}
            </button>
          </div>
        </div>

        {/* روابط خارجية */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3 }}>روابط خارجية (اختياري)</label>
            <button onClick={addLink} style={{ fontSize: 11, fontWeight: 700, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family }}>+ إضافة رابط</button>
          </div>
          {links.length === 0 ? (
            <div style={{ fontSize: 11, color: colors.text4 }}>مافيش روابط — أضف إنستقرام، تيك توك، سناب شات، واتساب، أو قوقل ماب</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {links.map((l, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={l.type} onChange={e => updateLink(i, { type: e.target.value })} style={{ ...inp(), width: 150 }}>
                      {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                    <input value={l.url} onChange={e => updateLink(i, { url: e.target.value })} placeholder={l.type==='whatsapp'?'https://wa.me/9665xxxxxxxx':'https://...'} style={{ ...inp(), flex: 1 }} dir="ltr" />
                    <button onClick={() => removeLink(i)} style={{ padding: '0 10px', borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                  {l.type === 'website' && (
                    <input value={l.label} onChange={e => updateLink(i, { label: e.target.value })} placeholder="اسم يظهر للرابط (مثال: الموقع الرسمي)" style={{ ...inp(), width: '100%' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {mode === 'org' && (
        <div style={{ marginBottom: 16, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hoursEnabled ? 12 : 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: colors.text2 }}>
            <input type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
            عرض حالة "مفتوح/مغلق" بالمتجر
          </label>
          {hoursEnabled && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={hours24} onChange={() => setHours24(true)} /> يفتح 24 ساعة
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={!hours24} onChange={() => setHours24(false)} /> أوقات محددة
                </label>
              </div>
              {!hours24 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div><label style={{ fontSize: 10, color: colors.text4, display: 'block', marginBottom: 3 }}>يفتح</label><input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} style={{ ...inp() }} /></div>
                  <div><label style={{ fontSize: 10, color: colors.text4, display: 'block', marginBottom: 3 }}>يغلق</label><input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} style={{ ...inp() }} /></div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.text2 }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          تفعيل المتجر ونشره للعامة
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveShopSettings} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${colors.border2}`, color: colors.text2, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              👁️ معاينة
            </a>
          )}
        </div>
      </div>

      )}

      {mode === 'branch' && currentBranch && !loadError && (
        <div style={{ ...card, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>إعدادات {currentBranch.name}</div>
          <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>رابط الفرع وأوقاته — كل فرع له منيو وQR خاص فيه</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>رابط الفرع</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 12, color: colors.text4, whiteSpace: 'nowrap' as const }} dir="ltr">storely.dev/shop/{slug || '…'}/</span>
              <input value={branchSlug} onChange={e => setBranchSlug(e.target.value)} placeholder="اسم-الفرع" style={{ ...inp(), flex: 1, minWidth: 120 }} dir="ltr" />
            </div>
          </div>
        <div style={{ marginBottom: 16, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: bHoursEnabled ? 12 : 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: colors.text2 }}>
            <input type="checkbox" checked={bHoursEnabled} onChange={e => setBHoursEnabled(e.target.checked)} />
            عرض حالة "مفتوح/مغلق" لهالفرع
          </label>
          {bHoursEnabled && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={bHours24} onChange={() => setBHours24(true)} /> يفتح 24 ساعة
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={!bHours24} onChange={() => setBHours24(false)} /> أوقات محددة
                </label>
              </div>
              {!bHours24 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div><label style={{ fontSize: 10, color: colors.text4, display: 'block', marginBottom: 3 }}>يفتح</label><input type="time" value={bOpen} onChange={e => setBOpen(e.target.value)} style={{ ...inp() }} /></div>
                  <div><label style={{ fontSize: 10, color: colors.text4, display: 'block', marginBottom: 3 }}>يغلق</label><input type="time" value={bClose} onChange={e => setBClose(e.target.value)} style={{ ...inp() }} /></div>
                </div>
              )}
            </div>
          )}
        </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveBranchSettings} disabled={savingBranch} style={{ ...btnPrimary, flex: 1 }}>{savingBranch ? 'جاري الحفظ...' : 'حفظ إعدادات الفرع'}</button>
            {branchUrl && (
              <a href={branchUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${colors.border2}`, color: colors.text2, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                👁️ معاينة
              </a>
            )}
          </div>
          {(!slug || !enabled) && (
            <div style={{ fontSize: 11, color: colors.warning, marginTop: 10 }}>{canManageOrg ? 'فعّل المتجر واحفظ رابطه من «إعدادات المتجر» فوق عشان يشتغل رابط الفرع' : 'المنيو مو منشور للحين — مالك المنشأة يفعّله من إعدادات المتجر'}</div>
          )}
        </div>
      )}

      {qrUrl && enabled && !loadError && (
        <div style={{ ...card, padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`} alt="QR" style={{ width: 130, height: 130, borderRadius: 12, border: `1px solid ${colors.border}` }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 6 }}>{mode === 'branch' ? `رمز QR لـ${currentBranch?.name || ''}` : 'رمز QR لمتجرك'}</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 12, lineHeight: 1.7 }}>اطبعه وحطّه على الطاولات أو ملصقات المحل — العميل يمسحه ويوصل لمنتجات{mode === 'branch' ? ' هالفرع' : 'ك'} مباشرة</div>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrUrl)}`} download={`qr-${slug}${mode === 'branch' ? '-' + savedBranchSlug : ''}.png`} style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '9px 18px', fontSize: 12 }}>
              ⬇️ تحميل بجودة عالية
            </a>
          </div>
        </div>
      )}

      {/* أصناف المنيو */}
      {!loadError && (
        <MenuItemsEditor orgId={orgId} mode={mode} branchId={branchId} canManageOrg={canManageOrg}
          branches={menuBranches} items={shopItems} setItems={setShopItems} recipes={recipes} products={products}
          reload={() => load(orgId, null, true)} />
      )}
    </div>
  )
}
