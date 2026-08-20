'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

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
  const [uploadingId, setUploadingId] = useState<string|null>(null)
  const [logoUrl, setLogoUrl] = useState<string|null>(null)
  const [suggestingColor, setSuggestingColor] = useState(false)
  const [shopColor, setShopColor] = useState('#15803d')
  const [hoursEnabled, setHoursEnabled] = useState(false)
  const [hours24, setHours24] = useState(true)
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [newItem, setNewItem] = useState({ name:'', category:'', price:'', description:'', image_url:'', is_featured:false })
  const [addingItem, setAddingItem] = useState(false)
  const [catEdits, setCatEdits] = useState<Record<string,string>>({})
  const [creatingNewCat, setCreatingNewCat] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditImg, setUploadingEditImg] = useState(false)
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
    try {
      const subRes = await fetch(`/api/addons-market?org_id=${profile.org_id}`)
      const subJ = await subRes.json()
      const menuAddon = (subJ.addons || []).find((a: any) => a.slug === 'online_menu')
      setHasSubscription(!!menuAddon?.subscription?.isValid)
      if (menuAddon?.subscription?.isValid) load(profile.org_id)
      else setLoading(false)
    } catch { setHasSubscription(false); setLoading(false) }
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
    setNewItem({ name:'', category:'', price:'', description:'', image_url:'', is_featured:false })
    setCreatingNewCat(false)
    load(orgId)
  }

  async function deleteShopItem(item_id: string) {
    setShopItems(prev => prev.filter(x => x.id !== item_id))
    await fetch('/api/shop-items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, item_id }),
    })
  }

  // ═══ السحب والإفلات (Pointer Events — يدعم الماوس واللمس معاً) ═══
  const [draggingItem, setDraggingItem] = useState<{ id: string; cat: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [draggingCat, setDraggingCat] = useState<string | null>(null)
  const [dragOverCat, setDragOverCat] = useState<string | null>(null)
  const longPressTimer = useRef<any>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  function getGroupedCategories() {
    const grouped: Record<string, any[]> = {}
    shopItems.forEach((it: any) => { const c = it.category || 'منتجات خارجية'; if (!grouped[c]) grouped[c] = []; grouped[c].push(it) })
    return grouped
  }

  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    pointerStart.current = null
  }

  function watchForScroll(e: React.PointerEvent) {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if ((dx > 8 || dy > 8) && longPressTimer.current) cancelLongPress() // تحرك قبل انتهاء الضغطة المطوّلة = تمرير عادي، نلغي السحب
  }

  function startItemLongPress(e: React.PointerEvent, itemId: string, cat: string) {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => { setDraggingItem({ id: itemId, cat }); longPressTimer.current = null }, 400)
  }

  function startCatLongPress(e: React.PointerEvent, cat: string) {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => { setDraggingCat(cat); longPressTimer.current = null }, 400)
  }

  async function performItemReorder(cat: string, draggedId: string, targetId: string) {
    const grouped = getGroupedCategories()
    const items = grouped[cat] || []
    const fromIdx = items.findIndex((it: any) => it.id === draggedId)
    const toIdx = items.findIndex((it: any) => it.id === targetId)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    const reordered = [...items]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const others = shopItems.filter((it: any) => (it.category || 'منتجات خارجية') !== cat)
    setShopItems([...others, ...reordered])
    await fetch('/api/shop-reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, items: reordered.map((it: any) => ({ id: it.id, type: 'shop_item' })) }),
    })
  }

  async function performCategoryReorder(draggedCat: string, targetCat: string) {
    const grouped = getGroupedCategories()
    const catNames = Object.keys(grouped)
    const fromIdx = catNames.indexOf(draggedCat)
    const toIdx = catNames.indexOf(targetCat)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    const reorderedCats = [...catNames]
    reorderedCats.splice(fromIdx, 1)
    reorderedCats.splice(toIdx, 0, draggedCat)
    const flatItems = reorderedCats.flatMap(c => grouped[c])
    setShopItems(flatItems)
    await fetch('/api/shop-reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, items: flatItems.map((it: any) => ({ id: it.id, type: 'shop_item' })) }),
    })
  }

  useEffect(() => {
    function onGlobalPointerUp() {
      if (draggingItem && dragOverItem && draggingItem.id !== dragOverItem) {
        performItemReorder(draggingItem.cat, draggingItem.id, dragOverItem)
      }
      if (draggingCat && dragOverCat && draggingCat !== dragOverCat) {
        performCategoryReorder(draggingCat, dragOverCat)
      }
      setDraggingItem(null); setDragOverItem(null); setDraggingCat(null); setDragOverCat(null)
      cancelLongPress()
    }
    window.addEventListener('pointerup', onGlobalPointerUp)
    return () => window.removeEventListener('pointerup', onGlobalPointerUp)
  }, [draggingItem, dragOverItem, draggingCat, dragOverCat, shopItems, orgId])

  async function moveItem(cat: string, itemId: string, direction: 'up' | 'down') {
    const catItems = shopItems.filter((it: any) => (it.category || 'منتجات خارجية') === cat)
    const idx = catItems.findIndex((it: any) => it.id === itemId)
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapWith < 0 || swapWith >= catItems.length) return

    const reordered = [...catItems]
    ;[reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]]

    // نحدّث الترتيب محلياً فوراً لإحساس سلس
    setShopItems(prev => {
      const others = prev.filter((it: any) => (it.category || 'منتجات خارجية') !== cat)
      return [...others, ...reordered]
    })

    await fetch('/api/shop-reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, items: reordered.map((it: any) => ({ id: it.id, type: 'shop_item' })) }),
    })
  }

  function startEdit(it: any) {
    setEditingId(it.id)
    setEditForm({ name: it.name, category: it.category, price: it.price ?? '', description: it.description ?? '', image_url: it.image_url ?? '', is_featured: !!it.is_featured })
  }

  async function uploadEditImage(file: File) {
    setUploadingEditImg(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/edit-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('shop-product-images').upload(path, file, { upsert: true })
      if (error) { toast('فشل رفع الصورة', 'error'); setUploadingEditImg(false); return }
      const { data: { publicUrl } } = sb.storage.from('shop-product-images').getPublicUrl(path)
      setEditForm((prev: any) => ({ ...prev, image_url: publicUrl }))
    } catch { toast('فشل رفع الصورة', 'error') }
    setUploadingEditImg(false)
  }

  async function saveEdit() {
    if (!editForm.name?.trim()) { toast('اكتب اسم المنتج', 'warning'); return }
    setSavingEdit(true)
    const res = await fetch('/api/shop-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, item_id: editingId, ...editForm }),
    })
    const j = await res.json()
    setSavingEdit(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    toast('✅ تم حفظ التعديل')
    setEditingId(null)
    load(orgId)
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
  function addLinkOfType(t: string) { setLinks(prev => [...prev, { type: t, label: '', url: '' }]) }
  function updateLink(i: number, patch: any) { setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)) }

  const shownCount = products.filter(p => p.show_on_shop).length
  const previewUrl = slug ? `https://storely.dev/shop/${slug}` : ''

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  if (hasSubscription === false) {
    return (
      <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginBottom: 8 }}>ميزة "المنتجات" غير مفعّلة</div>
        <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8, marginBottom: 20 }}>
          اشترك بميزة المنيو الإلكتروني من الإضافات عشان تقدر تبني صفحة منتجاتك العامة
        </div>
        <a href="/addons-market" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>روح لالإضافات</a>
      </div>
    )
  }

  const now = new Date()
  const curMin = now.getHours() * 60 + now.getMinutes()
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const isOpenNow = hours24 || (toMin(closeTime) > toMin(openTime) ? (curMin >= toMin(openTime) && curMin < toMin(closeTime)) : (curMin >= toMin(openTime) || curMin < toMin(closeTime)))

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>المنيو الإلكتروني</h1>
        <p style={pageSub}>ابنِ صفحة عامة تعرض منتجاتك للعملاء — بالسعر والوصف والصورة</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start', marginBottom: 16 }}>
        {/* === عمود الإعدادات === */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, minWidth: 0 }}>

          {/* بيانات المتجر */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 17 }}>🏪</span>
              <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>بيانات المتجر</div>
            </div>

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

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>وصف قصير (اختياري)</label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="مثال: أشهى المخبوزات الطازجة يومياً" style={{ ...inp(), width: '100%' }} />
            </div>
          </div>

          {/* التصميم واللون */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 17 }}>🎨</span>
              <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>التصميم واللون</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              {['#15803d', '#0369a1', '#b91c1c', '#7c2d12', '#7c3aed', '#0f172a', '#be185d', '#a16207'].map(c => (
                <button key={c} onClick={() => setShopColor(c)} style={{ width: 34, height: 34, borderRadius: 10, background: c, border: shopColor === c ? '3px solid #0f172a' : '1px solid #e2e8f0', cursor: 'pointer', boxShadow: shopColor === c ? '0 0 0 2px white inset' : 'none' }} />
              ))}
              <input type="color" value={shopColor} onChange={e => setShopColor(e.target.value)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 0 }} />
              <button onClick={suggestColorFromLogo} disabled={suggestingColor} style={{ padding: '0 14px', height: 34, borderRadius: 10, border: `1.5px solid ${colors.infoBorder}`, background: colors.infoLight, color: colors.info, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
                {suggestingColor ? '⏳ جاري التحليل...' : '🎨 اقترح من الشعار'}
              </button>
            </div>
          </div>

          {/* الروابط الاجتماعية */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 17 }}>🔗</span>
              <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>الروابط الاجتماعية</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
              {PLATFORMS.map(p => (
                <button key={p.v} onClick={() => addLinkOfType(p.v)} title={`إضافة ${p.l}`} style={{ width: 42, height: 42, borderRadius: 11, border: `1.5px solid ${colors.border}`, background: colors.bg, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                  {p.l.split(' ')[0]}
                </button>
              ))}
            </div>

            {links.length === 0 ? (
              <div style={{ fontSize: 11, color: colors.text4, textAlign: 'center' as const, padding: '16px 0', border: `1.5px dashed ${colors.border}`, borderRadius: 10 }}>اضغط على أيقونة فوق عشان تضيف رابط</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {links.map((l, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, background: colors.bg, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'white', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {(PLATFORMS.find(p => p.v === l.type)?.l || '🔗').split(' ')[0]}
                      </div>
                      <select value={l.type} onChange={e => updateLink(i, { type: e.target.value })} style={{ ...inp(), width: 118, fontSize: 11 }}>
                        {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                      </select>
                      <input value={l.url} onChange={e => updateLink(i, { url: e.target.value })} placeholder={l.type==='whatsapp'?'https://wa.me/9665xxxxxxxx':'https://...'} style={{ ...inp(), flex: 1 }} dir="ltr" />
                      <button onClick={() => removeLink(i)} style={{ padding: '0 10px', height: 32, borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
                    </div>
                    {l.type === 'website' && (
                      <input value={l.label} onChange={e => updateLink(i, { label: e.target.value })} placeholder="اسم يظهر للرابط (مثال: الموقع الرسمي)" style={{ ...inp(), width: '100%' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ساعات العمل */}
          <div style={{ ...card, padding: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ fontSize: 17 }}>🕐</span>
              <input type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
              <span style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>عرض حالة "مفتوح/مغلق" بالمتجر</span>
            </label>
            {hoursEnabled && (
              <div style={{ marginTop: 14, paddingRight: 25 }}>
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

          {/* النشر */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 17 }}>🚀</span>
              <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>النشر</div>
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
        </div>

        {/* === عمود المعاينة الحية === */}
        <div style={{ position: 'sticky' as const, top: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          <div style={{ ...card, padding: 0, overflow: 'hidden' as const }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: colors.text3, padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              👁️ معاينة حية
            </div>
            <div style={{ padding: '28px 20px', background: `${shopColor}0d`, minHeight: 300, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' as const, marginBottom: 12, boxShadow: '0 6px 16px rgba(0,0,0,.15)' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 16, background: shopColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 900, marginBottom: 12, boxShadow: '0 6px 16px rgba(0,0,0,.15)' }}>
                  {(displayName || orgName || 'S').slice(0, 1)}
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 900, color: colors.text, marginBottom: tagline ? 4 : 10 }}>{displayName || orgName || 'اسم منشأتك'}</div>
              {tagline && <div style={{ fontSize: 12, color: colors.text3, marginBottom: 12, maxWidth: 220 }}>{tagline}</div>}
              {hoursEnabled && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isOpenNow ? colors.primaryLight : colors.dangerLight, color: isOpenNow ? colors.primary : colors.danger, fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 99, marginBottom: 14 }}>
                  ● {hours24 ? 'مفتوح دائماً' : isOpenNow ? `مفتوح الآن · يغلق ${closeTime}` : `مغلق الآن · يفتح ${openTime}`}
                </div>
              )}
              {links.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' as const, marginBottom: 14 }}>
                  {links.map((l, i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: 'white', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {(PLATFORMS.find(p => p.v === l.type)?.l || '🔗').split(' ')[0]}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ width: '100%', background: 'white', borderRadius: 10, border: `1px solid ${colors.border}`, padding: '9px 12px', fontSize: 10, color: colors.text4, direction: 'ltr' as const }}>
                storely.dev/shop/{slug || '...'}
              </div>
            </div>
          </div>

          {previewUrl && enabled && (
            <div style={{ ...card, padding: '18px', textAlign: 'center' as const }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(previewUrl)}`} alt="QR" style={{ width: '100%', maxWidth: 150, borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 12 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 4 }}>رمز QR لمتجرك</div>
              <div style={{ fontSize: 10, color: colors.text4, marginBottom: 12, lineHeight: 1.7 }}>اطبعه وحطّه على الطاولات أو ملصقات المحل</div>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(previewUrl)}`} download={`qr-${slug}.png`} style={{ ...btnPrimary, display: 'block', textDecoration: 'none', padding: '9px 18px', fontSize: 12 }}>
                ⬇️ تحميل بجودة عالية
              </a>
            </div>
          )}
        </div>
      </div>

      {/* منتجات المتجر */}
      <div style={{ ...card, padding: '20px' }}>
        <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>منتجات المتجر</div>
        <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>أنشئ قسم (مثل "مشروبات حارة")، وأضف كل منتج جواه بصورته واسمه وسعره ووصفه</div>

        {shopItems.length > 0 && (() => {
          const grouped: Record<string, any[]> = {}
          shopItems.forEach((it: any) => { const c = it.category || 'منتجات خارجية'; if (!grouped[c]) grouped[c] = []; grouped[c].push(it) })
          return (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18, marginBottom: 16 }}>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}
                  onPointerEnter={() => { if (draggingCat && draggingCat !== cat) setDragOverCat(cat) }}
                  style={{ opacity: draggingCat === cat ? 0.4 : 1, border: dragOverCat === cat && draggingCat ? `2px dashed ${colors.primary}` : '2px dashed transparent', borderRadius: 12, padding: dragOverCat === cat && draggingCat ? 6 : 0, transition: 'opacity .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span onPointerDown={e => startCatLongPress(e, cat)} onPointerMove={watchForScroll} onPointerUp={cancelLongPress}
                      style={{ cursor: 'grab', fontSize: 16, color: colors.text4, touchAction: 'none', userSelect: 'none' as const, padding: '2px 4px' }}>⠿</span>
                    <input value={catEdits[cat] ?? cat} onChange={e => setCatEdits(prev => ({ ...prev, [cat]: e.target.value }))}
                      onBlur={() => renameCategory(cat)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      style={{ ...inp(), fontWeight: 800, fontSize: 13, border: 'none', background: 'transparent', padding: '4px 6px', width: 220 }} />
                    {savingCat === cat && <span style={{ fontSize: 10, color: colors.text4 }}>جاري الحفظ...</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    {items.map((it: any, j: number) => (
                      editingId === it.id ? (
                        <div key={it.id} style={{ border: `1.5px solid ${colors.primaryBorder}`, borderRadius: 12, padding: 14, background: colors.primaryLight }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 10 }}>
                            <div>
                              <div style={{ width: 80, height: 80, borderRadius: 10, background: colors.surface, border: `1px dashed ${colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                                {editForm.image_url ? <img src={editForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, opacity: .3 }}>📦</span>}
                              </div>
                              <label style={{ fontSize: 10, color: colors.info, cursor: 'pointer', textDecoration: 'underline' }}>
                                {uploadingEditImg ? 'جاري الرفع...' : 'تغيير الصورة'}
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadEditImage(f) }} />
                              </label>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                              <input placeholder="اسم المنتج" value={editForm.name} onChange={e => setEditForm((p:any) => ({ ...p, name: e.target.value }))} style={{ ...inp(), width: '100%' }} />
                              <input type="number" placeholder="السعر" value={editForm.price} onChange={e => setEditForm((p:any) => ({ ...p, price: e.target.value }))} style={{ ...inp(), width: '100%' }} />
                            </div>
                          </div>
                          <textarea placeholder="وصف قصير..." value={editForm.description} onChange={e => setEditForm((p:any) => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inp(), width: '100%', resize: 'vertical' as const, marginBottom: 10 }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: colors.text2 }}>
                            <input type="checkbox" checked={!!editForm.is_featured} onChange={e => setEditForm((p:any) => ({ ...p, is_featured: e.target.checked }))} />
                            ⭐ وسم "الأكثر مبيعاً"
                          </label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={saveEdit} disabled={savingEdit} style={{ ...btnPrimary, flex: 1 }}>{savingEdit ? 'جاري الحفظ...' : 'حفظ التعديل'}</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${colors.border2}`, background: 'white', color: colors.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                          </div>
                        </div>
                      ) : (
                        <div key={it.id}
                          onPointerEnter={() => { if (draggingItem && draggingItem.cat === cat && draggingItem.id !== it.id) setDragOverItem(it.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, border: dragOverItem === it.id && draggingItem ? `1.5px dashed ${colors.primary}` : `1px solid ${colors.border}`, borderRadius: 12, padding: 12, opacity: draggingItem?.id === it.id ? 0.4 : 1, transition: 'opacity .15s' }}>
                          <span onPointerDown={e => startItemLongPress(e, it.id, cat)} onPointerMove={watchForScroll} onPointerUp={cancelLongPress}
                            style={{ cursor: 'grab', fontSize: 15, color: colors.text4, touchAction: 'none', userSelect: 'none' as const, flexShrink: 0 }}>⠿</span>
                          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, flexShrink: 0 }}>
                            <button onClick={() => moveItem(cat, it.id, 'up')} disabled={j === 0}
                              style={{ width: 22, height: 18, border: 'none', borderRadius: 5, background: j === 0 ? colors.bg : colors.surface, color: j === 0 ? colors.text4 : colors.text2, cursor: j === 0 ? 'not-allowed' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                            <button onClick={() => moveItem(cat, it.id, 'down')} disabled={j === items.length - 1}
                              style={{ width: 22, height: 18, border: 'none', borderRadius: 5, background: j === items.length - 1 ? colors.bg : colors.surface, color: j === items.length - 1 ? colors.text4 : colors.text2, cursor: j === items.length - 1 ? 'not-allowed' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                          </div>
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: colors.surface, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {it.image_url ? <img src={it.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, opacity: .3 }}>📦</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{it.name}{it.is_featured && ' ⭐'}</div>
                            {it.price != null && <div style={{ fontSize: 11, color: colors.text4 }}>{it.price} ر.س</div>}
                          </div>
                          <button onClick={() => startEdit(it)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.infoBorder}`, background: colors.infoLight, color: colors.info, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>تعديل</button>
                          <button onClick={() => deleteShopItem(it.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>حذف</button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {(() => {
          const existingCats = Array.from(new Set(shopItems.map((it: any) => it.category || 'منتجات خارجية')))
          return (
            <div style={{ border: `1.5px dashed ${colors.border2}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.text2, marginBottom: 10 }}>+ إضافة منتج خارجي جديد</div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 5 }}>١) اختر القسم أو أنشئ قسم جديد *</label>
                {!creatingNewCat ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))} style={{ ...inp(), flex: 1 }}>
                      <option value="">— اختر قسم —</option>
                      {existingCats.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                    </select>
                    <button onClick={() => { setCreatingNewCat(true); setNewItem(prev => ({ ...prev, category: '' })) }} style={{ padding: '0 14px', borderRadius: 8, border: `1.5px solid ${colors.primaryBorder}`, background: colors.primaryLight, color: colors.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>+ قسم جديد</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input autoFocus placeholder="اسم القسم الجديد (مثال: المشروبات الباردة)" value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))} style={{ ...inp(), flex: 1 }} />
                    {existingCats.length > 0 && (
                      <button onClick={() => setCreatingNewCat(false)} style={{ padding: '0 14px', borderRadius: 8, border: `1px solid ${colors.border2}`, background: colors.bg, color: colors.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>إلغاء</button>
                    )}
                  </div>
                )}
              </div>

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
                  <label style={{ fontSize: 10, fontWeight: 700, color: colors.text3 }}>٢) تفاصيل المنتج</label>
                  <input placeholder="اسم المنتج *" value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))} style={{ ...inp(), width: '100%' }} />
                  <input type="number" placeholder="السعر (ر.س)" value={newItem.price} onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))} style={{ ...inp(), width: '100%' }} />
                </div>
              </div>
              <textarea placeholder="وصف قصير..." value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} rows={2} style={{ ...inp(), width: '100%', resize: 'vertical' as const, marginBottom: 10 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: colors.text2 }}>
                <input type="checkbox" checked={newItem.is_featured} onChange={e => setNewItem(prev => ({ ...prev, is_featured: e.target.checked }))} />
                ⭐ وسم "الأكثر مبيعاً"
              </label>
              <button onClick={() => { if (!newItem.category.trim()) { toast('اختر أو اكتب اسم القسم أول', 'warning'); return } addShopItem() }} disabled={addingItem} style={{ ...btnPrimary, width: '100%' }}>{addingItem ? 'جاري الإضافة...' : '+ إضافة المنتج للقسم'}</button>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
