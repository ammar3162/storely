'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

export default function OnlineStorePage() {
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
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
  const [uploadingId, setUploadingId] = useState<string|null>(null)
  const [logoUrl, setLogoUrl] = useState<string|null>(null)
  const [suggestingColor, setSuggestingColor] = useState(false)
  const [shopColor, setShopColor] = useState('#15803d')
  const [newItem, setNewItem] = useState({ name:'', category:'', price:'', description:'', image_url:'' })
  const [addingItem, setAddingItem] = useState(false)
  const [catEdits, setCatEdits] = useState<Record<string,string>>({})
  const [savingCat, setSavingCat] = useState<string|null>(null)
  const [uploadingNewItem, setUploadingNewItem] = useState(false)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    load(profile.org_id)
  }

  async function load(oid: string) {
    setLoading(true)
    const bid = sessionStorage.getItem('s_branch_id')
    const params = new URLSearchParams({ org_id: oid })
    if (bid) params.set('branch_id', bid)
    const res = await fetch(`/api/shop-settings?${params.toString()}`)
    const j = await res.json()
    if (j.success) {
      setSlug(j.org?.shop_slug || '')
      setEnabled(!!j.org?.shop_enabled)
      setTagline(j.org?.shop_tagline || '')
      setShopColor(j.org?.shop_color || '#15803d')
      setDisplayName(j.org?.shop_display_name || '')
      setOrgName(j.org?.name || '')
      setLinks(Array.isArray(j.org?.shop_links) ? j.org.shop_links.map((l:any)=>({type:l.type||'website',label:l.label||'',url:l.url||''})) : [])
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
      body: JSON.stringify({ org_id: orgId, shop_slug: slug, shop_enabled: enabled, shop_tagline: tagline, shop_color: shopColor, shop_display_name: displayName, shop_links: links }),
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

  async function updateProduct(p: any, patch: any) {
    const updated = { ...p, ...patch }
    setProducts(prev => prev.map(x => x.id === p.id ? updated : x))
    await fetch('/api/shop-product', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: orgId, product_id: p.id,
        show_on_shop: updated.show_on_shop, public_price: updated.public_price,
        public_description: updated.public_description, public_image_url: updated.public_image_url,
      }),
    })
  }

  async function uploadImage(p: any, file: File) {
    setUploadingId(p.id)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/${p.id}-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('shop-product-images').upload(path, file, { upsert: true })
      if (error) { toast('فشل رفع الصورة', 'error'); setUploadingId(null); return }
      const { data: { publicUrl } } = sb.storage.from('shop-product-images').getPublicUrl(path)
      await updateProduct(p, { public_image_url: publicUrl })
      toast('✅ تم رفع الصورة')
    } catch { toast('فشل رفع الصورة', 'error') }
    setUploadingId(null)
  }

  async function uploadNewItemImage(file: File) {
    setUploadingNewItem(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/external-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('shop-product-images').upload(path, file, { upsert: true })
      if (error) { toast('فشل رفع الصورة', 'error'); setUploadingNewItem(false); return }
      const { data: { publicUrl } } = sb.storage.from('shop-product-images').getPublicUrl(path)
      setNewItem(prev => ({ ...prev, image_url: publicUrl }))
    } catch { toast('فشل رفع الصورة', 'error') }
    setUploadingNewItem(false)
  }

  async function addShopItem() {
    if (!newItem.name.trim()) { toast('اكتب اسم المنتج أول', 'warning'); return }
    setAddingItem(true)
    const res = await fetch('/api/shop-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, ...newItem }),
    })
    const j = await res.json()
    setAddingItem(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    toast('✅ تمت إضافة المنتج')
    setNewItem({ name:'', category:'', price:'', description:'', image_url:'' })
    load(orgId)
  }

  async function deleteShopItem(item_id: string) {
    setShopItems(prev => prev.filter(x => x.id !== item_id))
    await fetch('/api/shop-items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, item_id }),
    })
  }

  async function renameCategory(oldCat: string) {
    const newCat = (catEdits[oldCat] ?? oldCat).trim()
    if (!newCat || newCat === oldCat) return
    setSavingCat(oldCat)
    const res = await fetch('/api/shop-items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, old_category: oldCat, new_category: newCat }),
    })
    const j = await res.json()
    setSavingCat(null)
    if (!j.success) { toast(j.error || 'فشل تغيير الاسم', 'error'); return }
    toast('✅ تم تغيير اسم القسم لكل منتجاته')
    load(orgId)
  }

  function addLink() { setLinks(prev => [...prev, { type: 'instagram', label: '', url: '' }]) }
  function updateLink(i: number, patch: any) { setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)) }

  const shownCount = products.filter(p => p.show_on_shop).length
  const previewUrl = slug ? `${typeof window!=='undefined'?window.location.origin:''}/shop/${slug}` : ''

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>متجري الإلكتروني</h1>
        <p style={pageSub}>ابنِ صفحة عامة تعرض منتجاتك للعملاء — بالسعر والوصف والصورة</p>
      </div>

      <div style={{ ...card, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 14 }}>إعدادات المتجر</div>

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
            {['#15803d', '#0369a1', '#b91c1c', '#7c2d12', '#7c3aed', '#0f172a', '#be185d', '#a16207'].map(c => (
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

      {/* منتجات المخزون */}
      <div style={{ ...card, padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text }}>منتجات المخزون</div>
          <span style={{ fontSize: 11, color: colors.text4 }}>{shownCount} من {products.length} معروض بالمتجر</span>
        </div>

        {products.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>ما فيه منتجات نشطة</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {products.map((p: any) => (
              <div key={p.id} style={{ border: `1px solid ${p.show_on_shop ? colors.primaryBorder : colors.border}`, borderRadius: 12, padding: 14, background: p.show_on_shop ? colors.primaryLight : colors.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: p.show_on_shop ? 12 : 0 }}>
                  <input type="checkbox" checked={!!p.show_on_shop} onChange={e => updateProduct(p, { show_on_shop: e.target.checked })} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, flex: 1 }}>{p.name}</span>
                </div>
                {p.show_on_shop && (
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                    <div>
                      <div style={{ width: 80, height: 80, borderRadius: 10, background: colors.surface, border: `1px dashed ${colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                        {p.public_image_url ? <img src={p.public_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, opacity: .3 }}>📦</span>}
                      </div>
                      <label style={{ fontSize: 10, color: colors.info, cursor: 'pointer', textDecoration: 'underline' }}>
                        {uploadingId === p.id ? 'جاري الرفع...' : 'رفع صورة'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(p, f) }} />
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      <input type="number" placeholder="السعر (ر.س)" value={p.public_price ?? ''} onChange={e => updateProduct(p, { public_price: e.target.value })} style={{ ...inp(), width: '100%' }} />
                      <textarea placeholder="وصف قصير للمنتج..." value={p.public_description ?? ''} onChange={e => updateProduct(p, { public_description: e.target.value })} rows={2} style={{ ...inp(), width: '100%', resize: 'vertical' as const }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* منتجات خارجية */}
      <div style={{ ...card, padding: '20px' }}>
        <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>منتجات خارجية</div>
        <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>منتجات تضيفها مباشرة للمتجر — بدون ما تأثر على مخزونك (مثل خدمات أو باقات)</div>

        {shopItems.length > 0 && (() => {
          const grouped: Record<string, any[]> = {}
          shopItems.forEach((it: any) => { const c = it.category || 'منتجات خارجية'; if (!grouped[c]) grouped[c] = []; grouped[c].push(it) })
          return (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18, marginBottom: 16 }}>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <input value={catEdits[cat] ?? cat} onChange={e => setCatEdits(prev => ({ ...prev, [cat]: e.target.value }))}
                      onBlur={() => renameCategory(cat)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      style={{ ...inp(), fontWeight: 800, fontSize: 13, border: 'none', background: 'transparent', padding: '4px 6px', width: 220 }} />
                    {savingCat === cat && <span style={{ fontSize: 10, color: colors.text4 }}>جاري الحفظ...</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    {items.map((it: any) => (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: colors.surface, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {it.image_url ? <img src={it.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, opacity: .3 }}>📦</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{it.name}</div>
                          {it.price != null && <div style={{ fontSize: 11, color: colors.text4 }}>{it.price} ر.س</div>}
                        </div>
                        <button onClick={() => deleteShopItem(it.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>حذف</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        <div style={{ border: `1.5px dashed ${colors.border2}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.text2, marginBottom: 10 }}>+ إضافة منتج خارجي جديد</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ width: 80, height: 80, borderRadius: 10, background: colors.surface, border: `1px dashed ${colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                {newItem.image_url ? <img src={newItem.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, opacity: .3 }}>📦</span>}
              </div>
              <label style={{ fontSize: 10, color: colors.info, cursor: 'pointer', textDecoration: 'underline' }}>
                {uploadingNewItem ? 'جاري الرفع...' : 'رفع صورة'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadNewItemImage(f) }} />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              <input placeholder="اسم المنتج *" value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))} style={{ ...inp(), width: '100%' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="الفئة (اختياري)" value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))} style={{ ...inp(), flex: 1 }} />
                <input type="number" placeholder="السعر" value={newItem.price} onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))} style={{ ...inp(), width: 100 }} />
              </div>
            </div>
          </div>
          <textarea placeholder="وصف قصير..." value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} rows={2} style={{ ...inp(), width: '100%', resize: 'vertical' as const, marginBottom: 10 }} />
          <button onClick={addShopItem} disabled={addingItem} style={{ ...btnPrimary, width: '100%' }}>{addingItem ? 'جاري الإضافة...' : '+ إضافة المنتج'}</button>
        </div>
      </div>
    </div>
  )
}
