'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

export default function ReservationSettingsPage() {
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean|null>(null)
  const [slug, setSlug] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [tagline, setTagline] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [color, setColor] = useState('#B86E3F')
  const [maxGuests, setMaxGuests] = useState(10)
  const [hoursEnabled, setHoursEnabled] = useState(false)
  const [hours24, setHours24] = useState(true)
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [uploadingLogo, setUploadingLogo] = useState(false)
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
      const addon = (subJ.addons || []).find((a: any) => a.slug === 'table_reservations')
      setHasSubscription(!!addon?.subscription?.isValid)
      if (addon?.subscription?.isValid) load(profile.org_id)
      else setLoading(false)
    } catch { setHasSubscription(false); setLoading(false) }
  }

  async function load(oid: string) {
    setLoading(true)
    const res = await fetch(`/api/reservation-settings?org_id=${oid}`)
    const j = await res.json()
    if (j.success && j.org) {
      setSlug(j.org.res_slug || '')
      setEnabled(!!j.org.res_enabled)
      setDisplayName(j.org.res_display_name || '')
      setTagline(j.org.res_tagline || '')
      setLogoUrl(j.org.res_logo_url || '')
      setColor(j.org.res_color || '#B86E3F')
      setMaxGuests(j.org.res_max_guests || 10)
      const h = j.org.res_hours || {}
      setHoursEnabled(!!h.enabled); setHours24(h.is24h !== false); setOpenTime(h.open || '08:00'); setCloseTime(h.close || '23:00')
    }
    setLoading(false)
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/res-logo-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('shop-product-images').upload(path, file, { upsert: true })
      if (error) { toast('فشل رفع الشعار', 'error'); setUploadingLogo(false); return }
      const { data: { publicUrl } } = sb.storage.from('shop-product-images').getPublicUrl(path)
      setLogoUrl(publicUrl)
    } catch { toast('فشل رفع الشعار', 'error') }
    setUploadingLogo(false)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/reservation-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: orgId, res_slug: slug, res_enabled: enabled, res_display_name: displayName,
        res_tagline: tagline, res_logo_url: logoUrl, res_color: color, res_max_guests: maxGuests,
        res_hours: { enabled: hoursEnabled, is24h: hours24, open: openTime, close: closeTime },
      }),
    })
    const j = await res.json()
    setSaving(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    setSlug(j.slug || '')
    toast('✅ تم حفظ إعدادات الحجوزات')
  }

  const previewUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${slug}` : ''

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  if (hasSubscription === false) {
    return (
      <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🗓️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginBottom: 8 }}>ميزة "الحجوزات" غير مفعّلة</div>
        <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8, marginBottom: 20 }}>
          اشترك بميزة نظام حجز الطاولات من سوق الإضافات عشان تقدر تبني صفحة الحجز الخاصة بك
        </div>
        <a href="/addons-market" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>روح لسوق الإضافات</a>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>إعدادات الحجوزات</h1>
        <p style={pageSub}>اضبط صفحة حجز الطاولات الخاصة بك — شعار، اسم، أوقات، ولون</p>
      </div>

      <div style={{ ...card, padding: '20px' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: colors.surface, border: `1px dashed ${colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24, opacity: .3 }}>🗓️</span>}
          </div>
          <div>
            <label style={{ fontSize: 12, color: colors.info, cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}>
              {uploadingLogo ? 'جاري الرفع...' : 'رفع شعار الحجوزات'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            </label>
            <div style={{ fontSize: 10, color: colors.text4, marginTop: 4 }}>يظهر بأعلى صفحة الحجز للعميل</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>رابط صفحة الحجز</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: colors.text4, whiteSpace: 'nowrap' as const }}>storely.dev/book/</span>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="اسم-منشأتك" style={{ ...inp(), flex: 1 }} dir="ltr" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>اسم يظهر بصفحة الحجز</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="مثال: YUCCA" style={{ ...inp(), width: '100%' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>وصف قصير (اختياري)</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="مثال: مكانك ينتظرك" style={{ ...inp(), width: '100%' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>أقصى عدد أشخاص بالحجز</label>
          <input type="number" value={maxGuests} onChange={e => setMaxGuests(Number(e.target.value) || 10)} style={{ ...inp(), width: 120 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 8 }}>لون الصفحة</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
            {['#B86E3F', '#15803d', '#0369a1', '#b91c1c', '#7c3aed', '#0f172a', '#be185d', '#a16207'].map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 10, background: c, border: color === c ? '3px solid #0f172a' : '1px solid #e2e8f0', cursor: 'pointer' }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 0 }} />
          </div>
        </div>

        <div style={{ marginBottom: 16, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hoursEnabled ? 12 : 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: colors.text2 }}>
            <input type="checkbox" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
            عرض حالة "مفتوح/مغلق" بصفحة الحجز
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

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.text2 }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          تفعيل صفحة الحجز ونشرها للعامة
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${colors.border2}`, color: colors.text2, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              👁️ معاينة
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
