'use client'
export const dynamic = 'force-dynamic'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { StorelyFormField } from '@/components/ui/form-field'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'


const ONLINE_STYLES = `
  .online-page,.os-access,.os-loading{font-family:${T.typography.family};direction:rtl;color:${T.color.text};line-height:${T.typography.lineHeight}}
  .online-page{max-width:1200px;margin:0 auto;padding:${T.spacing[6]}px;min-width:0;background:${T.color.background};border-radius:${T.radius.panel};font-size:${T.typography.body}px}
  .online-page *,.os-access *{box-sizing:border-box}
  .online-page>header{margin-bottom:${T.spacing[6]}px}
  .online-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .online-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .online-page .os-workspace{padding:${T.spacing[6]}px;margin-bottom:${T.spacing[6]}px;border-color:${T.color.border};border-radius:${T.radius.card};background:${T.color.surface};min-width:0;overflow:visible}
  .os-section-title{font-size:${T.typography.section}px;font-weight:600;color:${T.color.text};line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[3]}px}
  .os-supporting{font-size:${T.typography.supporting}px;line-height:1.8;color:${T.color.textMuted}}
  .os-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[6]}px}
  .os-settings>.os-section-title,.os-settings>.os-hours,.os-settings>.os-check-label,.os-settings>.os-actions,.os-settings>.os-field-group:has(.os-url-row),.os-settings>.os-field-group:has(.os-colors),.os-settings>.os-field-group:has(.os-section-header){grid-column:1/-1}
  .os-settings>.os-section-title{margin-bottom:0;padding-bottom:${T.spacing[5]}px;border-bottom:1px solid ${T.color.border}}
  .os-field-group{min-width:0}
  .os-field-group .os-supporting{margin-top:${T.spacing[2]}px}
  .online-page .os-control{width:100%;min-width:0;height:44px;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .online-page .os-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .online-page .os-control:focus-visible,.online-page button:focus-visible,.online-page .os-check:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .online-page .os-textarea{height:auto;min-height:80px;resize:vertical;display:block;margin-block:${T.spacing[4]}px}
  .online-page input[type=number],.online-page input[type=time]{font-variant-numeric:tabular-nums;direction:ltr}
  .online-page input[type=number]{text-align:right}
  .online-page label{font-size:${T.typography.supporting}px;line-height:${T.typography.lineHeight};color:${T.color.textMuted}}
  .os-label{display:block;font-weight:600;margin-bottom:${T.spacing[2]}px}
  .os-url-row{display:flex;align-items:center;gap:${T.spacing[3]}px;direction:ltr}
  .os-url-row>.os-control{flex:1;min-width:0}
  .os-url-prefix{font-size:${T.typography.supporting}px;color:${T.color.textMuted};white-space:nowrap}
  .online-page .os-button,.os-access .os-button{display:inline-flex;align-items:center;justify-content:center;gap:${T.spacing[2]}px;min-height:40px;height:auto;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[4]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.navy};font-family:inherit;font-size:${T.typography.body}px;font-weight:600;line-height:1.6;white-space:normal;text-decoration:none;cursor:pointer;box-shadow:none}
  .online-page .os-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .online-page .os-button:disabled{opacity:.5;cursor:not-allowed}
  .online-page .os-primary,.os-access .os-primary{border-color:${T.color.navy};background:${T.color.navy};color:${T.color.surface}}
  .online-page .os-primary:hover:not(:disabled){border-color:${T.color.navy};background:${T.color.navy};color:${T.color.surface}}
  .online-page .os-danger{border-color:${T.color.dangerBorder};background:${T.color.surface};color:${T.color.danger}}
  .online-page .os-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .os-actions{display:flex;align-items:stretch;flex-wrap:wrap;gap:${T.spacing[2]}px}
  .os-settings>.os-actions{padding-top:${T.spacing[5]}px;border-top:1px solid ${T.color.border}}
  .os-colors{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px}
  .os-color-swatch,.os-color-picker{width:36px;height:36px;flex-shrink:0;border:1px solid ${T.color.border};border-radius:${T.radius.control};padding:0;cursor:pointer}
  .os-section-header{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[3]}px;flex-wrap:wrap;margin-bottom:${T.spacing[3]}px}
  .os-section-header>.os-label{margin-bottom:0}
  .os-stack{display:flex;flex-direction:column;gap:${T.spacing[3]}px;min-width:0}
  .os-link-row{display:grid;grid-template-columns:160px minmax(0,1fr) 40px;gap:${T.spacing[2]}px;align-items:start}
  .online-page .os-remove-link{width:40px;min-height:44px;padding:0}
  .os-hours{padding-block:${T.spacing[5]}px;border-block:1px solid ${T.color.border}}
  .os-hour-options{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[5]}px;margin-top:${T.spacing[4]}px;margin-bottom:${T.spacing[4]}px}
  .os-check-label{display:flex;align-items:flex-start;gap:${T.spacing[2]}px;cursor:pointer;font-size:${T.typography.body}px!important;line-height:${T.typography.lineHeight}}
  .os-check{width:16px;height:16px;flex-shrink:0;margin-top:${T.spacing[1]}px;accent-color:${T.color.navy}}
  .os-time-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[4]}px;max-width:500px}
  .os-qr{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[6]}px}
  .os-qr-image{width:130px;height:130px;object-fit:contain;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.control};flex-shrink:0}
  .os-qr-description{flex:1;min-width:0;flex-basis:260px}
  .os-qr-description>.os-supporting{margin-bottom:${T.spacing[4]}px}
  .os-products>.os-field-group{font-size:${T.typography.supporting}px;color:${T.color.textMuted};line-height:1.8;margin-bottom:${T.spacing[6]}px}
  .os-category{border-radius:${T.radius.control};min-width:0;transition:opacity .15s}
  .os-category-header{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px;margin-bottom:${T.spacing[3]}px;padding-bottom:${T.spacing[3]}px;border-bottom:1px solid ${T.color.border}}
  .online-page .os-category-name{width:auto;min-width:0;flex:1 1 160px;max-width:360px;font-size:${T.typography.section}px;font-weight:600;border-color:transparent;padding-inline:${T.spacing[2]}px}
  .os-drag-handle{display:inline-flex;align-items:center;justify-content:center;width:24px;min-height:32px;flex-shrink:0;cursor:grab;color:${T.color.textMuted};font-size:18px;touch-action:none;user-select:none}
  .os-product-row{display:grid;grid-template-columns:24px 28px 48px minmax(0,1fr) auto auto;align-items:center;gap:${T.spacing[3]}px;padding:${T.spacing[4]}px ${T.spacing[3]}px;border-radius:${T.radius.control};min-width:0;transition:opacity .15s}
  .os-move-controls{display:flex;flex-direction:column;gap:${T.spacing[1]}px}
  .online-page .os-move-button{width:28px;height:28px;min-height:28px;padding:0;font-size:10px}
  .os-product-thumb{width:48px;height:48px;border-radius:${T.radius.control};overflow:hidden;display:flex;align-items:center;justify-content:center;background:${T.color.background}}
  .os-product-identity{min-width:0;overflow-wrap:anywhere}
  .os-product-name{font-size:16px;font-weight:600;line-height:${T.typography.lineHeight};overflow-wrap:anywhere}
  .os-product-identity>.os-supporting{margin-top:${T.spacing[1]}px}
  .online-page .os-row-action{min-height:36px;padding:${T.spacing[2]}px ${T.spacing[3]}px;font-size:${T.typography.supporting}px}
  .os-image{display:block;width:100%;height:100%;object-fit:cover}
  .os-edit-product{padding:${T.spacing[5]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface}}
  .os-product-fields{display:grid;grid-template-columns:80px minmax(0,1fr);gap:${T.spacing[4]}px;align-items:start}
  .os-product-fields .os-stack>div>.os-control+.os-control{margin-top:${T.spacing[3]}px}
  .os-upload-preview{width:80px;height:80px;border:1px dashed ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:${T.spacing[2]}px}
  .os-upload-label{display:inline-block;color:${T.color.info}!important;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
  .os-file{display:none}
  .os-edit-product>.os-check-label,.os-new-product>.os-check-label{margin-block:${T.spacing[4]}px}
  .os-new-product{margin-top:${T.spacing[6]}px;padding-top:${T.spacing[6]}px;border-top:1px solid ${T.color.border}}
  .os-new-product>.os-field-group{margin-bottom:${T.spacing[5]}px}
  .os-new-product>.os-section-title{font-size:${T.typography.section}px}
  .os-new-product .os-actions>.os-control{flex:1 1 200px}
  .online-page .os-full{width:100%}
  .os-access{max-width:520px;margin:${T.spacing[8]}px auto;padding:${T.spacing[8]}px ${T.spacing[6]}px;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.card};text-align:center}
  .os-access-icon{font-size:32px;margin-bottom:${T.spacing[4]}px}
  .os-access>.os-supporting{margin-bottom:${T.spacing[5]}px;font-size:${T.typography.body}px}
  .os-loading{padding:${T.spacing[8]}px;text-align:center;font-size:${T.typography.body}px;color:${T.color.textMuted}}
  @media(max-width:760px){.os-settings{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:640px){
    .online-page{padding:${T.spacing[4]}px}
    .online-page .os-workspace{padding:${T.spacing[5]}px}
    .os-settings{gap:${T.spacing[5]}px}
    .os-url-row{flex-wrap:wrap;gap:${T.spacing[2]}px}
    .os-url-row>.os-control{flex-basis:100%}
    .os-link-row{grid-template-columns:minmax(0,1fr) 40px}
    .os-link-row>.os-select{grid-column:1/-1}
    .os-colors>.os-button{flex-basis:100%}
    .os-product-row{grid-template-columns:20px 28px 40px minmax(0,1fr);gap:${T.spacing[2]}px;padding:${T.spacing[3]}px ${T.spacing[2]}px}
    .os-product-thumb{width:40px;height:40px}
    .os-product-row>.os-row-action:nth-last-child(2){grid-column:1/3}
    .os-product-row>.os-row-action:last-child{grid-column:3/-1}
    .os-product-fields{grid-template-columns:64px minmax(0,1fr);gap:${T.spacing[3]}px}
    .os-upload-preview{width:64px;height:64px}
    .os-qr{align-items:flex-start}
    .os-qr-description{flex-basis:100%}
    .os-edit-product{padding:${T.spacing[4]}px}
    .os-actions>.os-button{flex:1 1 120px}
    .os-time-fields{gap:${T.spacing[3]}px}
  }
  @media(prefers-reduced-motion:reduce){.online-page *{transition:none!important}}
`

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
  const [shopColor, setShopColor] = useState('#203640')
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
    const oid = await getOrgId()
    if (!oid) return
    setOrgId(oid)
    try {
      const subRes = await fetch(`/api/addons-market?org_id=${oid}`)
      const subJ = await subRes.json()
      const menuAddon = (subJ.addons || []).find((a: any) => a.slug === 'online_menu')
      setHasSubscription(!!menuAddon?.subscription?.isValid)
      if (menuAddon?.subscription?.isValid) load(oid!)
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
      setShopColor(j.org?.shop_color || '#203640')
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
  function updateLink(i: number, patch: any) { setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)) }

  const shownCount = products.filter(p => p.show_on_shop).length
  const previewUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/shop/${slug}` : ''

  if (loading) return <div className="os-loading"><style>{ONLINE_STYLES}</style>جاري التحميل...</div>

  if (hasSubscription === false) {
    return (
      <div className="os-access">
        <style>{ONLINE_STYLES}</style>
        <div className="os-access-icon">📋</div>
        <div className="os-section-title">ميزة "المنتجات" غير مفعّلة</div>
        <div className="os-supporting">
          <span className="hide-in-app">اشترك بميزة المنيو الإلكتروني من الإضافات عشان تقدر تبني صفحة منتجاتك العامة</span>
        </div>
        <a className="hide-in-app os-button os-primary" href="/addons-market" >روح لالإضافات</a>
      </div>
    )
  }

  return (
    <div className="online-page">
      <style>{ONLINE_STYLES}</style>
      <StorelyPageHeader
        title="المنيو الإلكتروني"
        description="ابنِ صفحة عامة تعرض منتجاتك للعملاء — بالسعر والوصف والصورة"
      />

      <StorelyCard className="os-workspace os-settings">
        <div className="os-section-title">إعدادات المتجر</div>

        <StorelyFormField className="os-field-group" label={<>رابط المتجر</>}>
          <div className="os-url-row">
            <span className="os-url-prefix">storely.dev/shop/</span>
            <input className="os-control" value={slug} onChange={e => setSlug(e.target.value)} placeholder="اسم-منشأتك"  dir="ltr" />
          </div>
        </StorelyFormField>

        <StorelyFormField className="os-field-group" label={<>اسم يظهر بالمتجر (اختياري)</>} htmlFor="online-field-2">
          <input id="online-field-2" className="os-control" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={orgName || 'اسم منشأتك التجاري'}  />
          <div className="os-supporting">لو تركته فاضي، بيظهر اسم منشأتك المسجّل ({orgName})</div>
        </StorelyFormField>

        <StorelyFormField className="os-field-group" label={<>وصف قصير (اختياري)</>} htmlFor="online-field-3">
          <input id="online-field-3" className="os-control" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="مثال: أشهى المخبوزات الطازجة يومياً"  />
        </StorelyFormField>

        <StorelyFormField className="os-field-group" label={<>لون المتجر</>}>
          <div className="os-colors">
            {['#203640', '#0369a1', '#b91c1c', '#7c2d12', '#717553', '#203640', '#be185d', '#a16207'].map(c => (
              <button className="os-color-swatch" key={c} onClick={() => setShopColor(c)} style={{background:c,borderWidth:shopColor===c?3:1,borderColor:shopColor===c?T.color.navy:T.color.border,boxShadow:shopColor===c?`0 0 0 2px ${T.color.surface} inset`:'none'}} />
            ))}
            <input className="os-color-picker" type="color" value={shopColor} onChange={e => setShopColor(e.target.value)}  />
            <StorelyButton className="os-button" onClick={suggestColorFromLogo} disabled={suggestingColor}>
              {suggestingColor ? '⏳ جاري التحليل...' : '🎨 اقترح من الشعار'}
            </StorelyButton>
          </div>
        </StorelyFormField>

        {/* روابط خارجية */}
        <div className="os-field-group">
          <div className="os-section-header">
            <label className="os-label">روابط خارجية (اختياري)</label>
            <StorelyButton className="os-button" onClick={addLink}>+ إضافة رابط</StorelyButton>
          </div>
          {links.length === 0 ? (
            <div className="os-supporting">مافيش روابط — أضف إنستقرام، تيك توك، سناب شات، واتساب، أو قوقل ماب</div>
          ) : (
            <div className="os-stack">
              {links.map((l, i) => (
                <div className="os-stack" key={i}>
                  <div className="os-link-row">
                    <select className="os-control os-select" value={l.type} onChange={e => updateLink(i, { type: e.target.value })} >
                      {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                    <input className="os-control" value={l.url} onChange={e => updateLink(i, { url: e.target.value })} placeholder={l.type==='whatsapp'?'https://wa.me/9665xxxxxxxx':'https://...'}  dir="ltr" />
                    <StorelyButton className="os-button os-danger os-remove-link" variant="danger" onClick={() => removeLink(i)}>✕</StorelyButton>
                  </div>
                  {l.type === 'website' && (
                    <input className="os-control" value={l.label} onChange={e => updateLink(i, { label: e.target.value })} placeholder="اسم يظهر للرابط (مثال: الموقع الرسمي)"  />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="os-hours">
          <label className="os-check-label">
            <input className="os-check" type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
            عرض حالة "مفتوح/مغلق" بالمتجر
          </label>
          {hoursEnabled && (
            <div>
              <div className="os-hour-options">
                <label className="os-check-label">
                  <input className="os-check" type="radio" checked={hours24} onChange={() => setHours24(true)} /> يفتح 24 ساعة
                </label>
                <label className="os-check-label">
                  <input className="os-check" type="radio" checked={!hours24} onChange={() => setHours24(false)} /> أوقات محددة
                </label>
              </div>
              {!hours24 && (
                <div className="os-time-fields">
                  <StorelyFormField label={<>يفتح</>} htmlFor="online-field-5"><input id="online-field-5" className="os-control" type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}  /></StorelyFormField>
                  <StorelyFormField label={<>يغلق</>} htmlFor="online-field-6"><input id="online-field-6" className="os-control" type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}  /></StorelyFormField>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="os-check-label">
          <input className="os-check" type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          تفعيل المتجر ونشره للعامة
        </label>
        <div className="os-actions">
          <StorelyButton className="os-button os-primary" variant="primary" onClick={saveShopSettings} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</StorelyButton>
          {previewUrl && (
            <a className="os-button" href={previewUrl} target="_blank" rel="noopener noreferrer" >
              👁️ معاينة
            </a>
          )}
        </div>
      </StorelyCard>

      {previewUrl && enabled && (
        <StorelyCard className="os-workspace os-qr">
          <img className="os-qr-image" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(previewUrl)}`} alt="QR"  />
          <div className="os-qr-description">
            <div className="os-section-title">رمز QR لمتجرك</div>
            <div className="os-supporting">اطبعه وحطّه على الطاولات أو ملصقات المحل — العميل يمسحه ويوصل لمنتجاتك مباشرة</div>
            <a className="os-button os-primary" href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(previewUrl)}`} download={`qr-${slug}.png`} >
              ⬇️ تحميل بجودة عالية
            </a>
          </div>
        </StorelyCard>
      )}

      {/* منتجات المتجر */}
      <StorelyCard className="os-workspace os-products">
        <div className="os-section-title">منتجات المتجر</div>
        <div className="os-field-group">أنشئ قسم (مثل "مشروبات حارة")، وأضف كل منتج جواه بصورته واسمه وسعره ووصفه</div>

        {shopItems.length > 0 && (() => {
          const grouped: Record<string, any[]> = {}
          shopItems.forEach((it: any) => { const c = it.category || 'منتجات خارجية'; if (!grouped[c]) grouped[c] = []; grouped[c].push(it) })
          return (
            <div className="os-stack">
              {Object.entries(grouped).map(([cat, items]) => (
                <div className="os-category" key={cat}
                  onPointerEnter={() => { if (draggingCat && draggingCat !== cat) setDragOverCat(cat) }}
                  style={{opacity:draggingCat === cat ? 0.4 : 1,border:dragOverCat === cat && draggingCat ? `2px dashed ${T.color.navy}` : '2px dashed transparent',padding:dragOverCat === cat && draggingCat ? 6 : 0}}>
                  <div className="os-category-header">
                    <span className="os-drag-handle" onPointerDown={e => startCatLongPress(e, cat)} onPointerMove={watchForScroll} onPointerUp={cancelLongPress}
                      style={{touchAction:'none',userSelect:'none' as const}}>⠿</span>
                    <input className="os-control os-category-name" value={catEdits[cat] ?? cat} onChange={e => setCatEdits(prev => ({ ...prev, [cat]: e.target.value }))}
                      onBlur={() => renameCategory(cat)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                       />
                    {savingCat === cat && <span className="os-supporting">جاري الحفظ...</span>}
                  </div>
                  <div className="os-stack">
                    {items.map((it: any, j: number) => (
                      editingId === it.id ? (
                        <div className="os-edit-product" key={it.id}>
                          <div className="os-product-fields">
                            <div>
                              <div className="os-upload-preview">
                                {editForm.image_url ? <img className="os-image" src={editForm.image_url}  /> : <span className="os-supporting" style={{opacity:.3}}>📦</span>}
                              </div>
                              <label className="os-upload-label">
                                {uploadingEditImg ? 'جاري الرفع...' : 'تغيير الصورة'}
                                <input className="os-file" type="file" accept="image/*"  onChange={e => { const f = e.target.files?.[0]; if (f) uploadEditImage(f) }} />
                              </label>
                            </div>
                            <div className="os-stack">
                              <input className="os-control" placeholder="اسم المنتج" value={editForm.name} onChange={e => setEditForm((p:any) => ({ ...p, name: e.target.value }))}  />
                              <input className="os-control" type="number" placeholder="السعر" value={editForm.price} onChange={e => setEditForm((p:any) => ({ ...p, price: e.target.value }))}  />
                            </div>
                          </div>
                          <textarea className="os-control os-textarea" placeholder="وصف قصير..." value={editForm.description} onChange={e => setEditForm((p:any) => ({ ...p, description: e.target.value }))} rows={2}  />
                          <label className="os-check-label">
                            <input className="os-check" type="checkbox" checked={!!editForm.is_featured} onChange={e => setEditForm((p:any) => ({ ...p, is_featured: e.target.checked }))} />
                            ⭐ وسم "الأكثر مبيعاً"
                          </label>
                          <div className="os-actions">
                            <StorelyButton className="os-button os-primary" variant="primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'جاري الحفظ...' : 'حفظ التعديل'}</StorelyButton>
                            <StorelyButton className="os-button" onClick={() => setEditingId(null)}>إلغاء</StorelyButton>
                          </div>
                        </div>
                      ) : (
                        <div className="os-product-row" key={it.id}
                          onPointerEnter={() => { if (draggingItem && draggingItem.cat === cat && draggingItem.id !== it.id) setDragOverItem(it.id) }}
                          style={{border:dragOverItem === it.id && draggingItem ? `1.5px dashed ${T.color.navy}` : `1px solid ${T.color.border}`,opacity:draggingItem?.id === it.id ? 0.4 : 1}}>
                          <span className="os-drag-handle" onPointerDown={e => startItemLongPress(e, it.id, cat)} onPointerMove={watchForScroll} onPointerUp={cancelLongPress}
                            style={{touchAction:'none',userSelect:'none' as const}}>⠿</span>
                          <div className="os-move-controls">
                            <StorelyButton className="os-button os-move-button" onClick={() => moveItem(cat, it.id, 'up')} disabled={j === 0}>▲</StorelyButton>
                            <StorelyButton className="os-button os-move-button" onClick={() => moveItem(cat, it.id, 'down')} disabled={j === items.length - 1}>▼</StorelyButton>
                          </div>
                          <div className="os-product-thumb">
                            {it.image_url ? <img className="os-image" src={it.image_url}  /> : <span className="os-supporting" style={{opacity:.3}}>📦</span>}
                          </div>
                          <div className="os-product-identity">
                            <div className="os-product-name">{it.name}{it.is_featured && ' ⭐'}</div>
                            {it.price != null && <div className="os-supporting">{it.price} ر.س</div>}
                          </div>
                          <StorelyButton className="os-button os-row-action" onClick={() => startEdit(it)}>تعديل</StorelyButton>
                          <StorelyButton className="os-button os-danger os-row-action" variant="danger" onClick={() => deleteShopItem(it.id)}>حذف</StorelyButton>
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
            <div className="os-new-product">
              <div className="os-section-title">+ إضافة منتج خارجي جديد</div>
              <div className="os-field-group">
                <label className="os-label">١) اختر القسم أو أنشئ قسم جديد *</label>
                {!creatingNewCat ? (
                  <div className="os-actions">
                    <select className="os-control os-select" value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))} >
                      <option value="">— اختر قسم —</option>
                      {existingCats.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                    </select>
                    <StorelyButton className="os-button" onClick={() => { setCreatingNewCat(true); setNewItem(prev => ({ ...prev, category: '' })) }}>+ قسم جديد</StorelyButton>
                  </div>
                ) : (
                  <div className="os-actions">
                    <input className="os-control" autoFocus placeholder="اسم القسم الجديد (مثال: المشروبات الباردة)" value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}  />
                    {existingCats.length > 0 && (
                      <StorelyButton className="os-button" onClick={() => setCreatingNewCat(false)}>إلغاء</StorelyButton>
                    )}
                  </div>
                )}
              </div>
              <div className="os-product-fields">
                <div>
                  <div className="os-upload-preview">
                    {newItem.image_url ? <img className="os-image" src={newItem.image_url}  /> : <span className="os-supporting" style={{opacity:.3}}>📦</span>}
                  </div>
                  <label className="os-upload-label">
                    {uploadingNewItem ? 'جاري الرفع...' : 'رفع صورة'}
                    <input className="os-file" type="file" accept="image/*"  onChange={e => { const f = e.target.files?.[0]; if (f) uploadNewItemImage(f) }} />
                  </label>
                </div>
                <StorelyFormField className="os-stack" label={<>٢) تفاصيل المنتج</>} htmlFor="online-field-7">
                  <input id="online-field-7" className="os-control" placeholder="اسم المنتج *" value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}  />
                  <input className="os-control" type="number" placeholder="السعر (ر.س)" value={newItem.price} onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}  />
                </StorelyFormField>
              </div>
              <textarea className="os-control os-textarea" placeholder="وصف قصير..." value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} rows={2}  />
              <label className="os-check-label">
                <input className="os-check" type="checkbox" checked={newItem.is_featured} onChange={e => setNewItem(prev => ({ ...prev, is_featured: e.target.checked }))} />
                ⭐ وسم "الأكثر مبيعاً"
              </label>
              <StorelyButton className="os-button os-primary os-full" variant="primary" onClick={() => { if (!newItem.category.trim()) { toast('اختر أو اكتب اسم القسم أول', 'warning'); return } addShopItem() }} disabled={addingItem}>{addingItem ? 'جاري الإضافة...' : '+ إضافة المنتج للقسم'}</StorelyButton>
            </div>
          )
        })()}
      </StorelyCard>
    </div>
  )
}
