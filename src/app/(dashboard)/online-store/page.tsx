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
  const [shopColor, setShopColor] = useState('#15803d')
  const [products, setProducts] = useState<any[]>([])
  const [uploadingId, setUploadingId] = useState<string|null>(null)
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
      setProducts(j.products || [])
    }
    setLoading(false)
  }

  async function saveShopSettings() {
    setSaving(true)
    const res = await fetch('/api/shop-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, shop_slug: slug, shop_enabled: enabled, shop_tagline: tagline, shop_color: shopColor }),
    })
    const j = await res.json()
    setSaving(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    setSlug(j.slug || '')
    toast('✅ تم حفظ إعدادات المتجر')
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
          </div>
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

      <div style={{ ...card, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text }}>المنتجات</div>
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
    </div>
  )
}
