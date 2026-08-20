'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

export default function ReservationSettingsPage() {
  const [orgId, setOrgId] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [orgName, setOrgName] = useState('')
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
  const [hasWaAddon, setHasWaAddon] = useState(false)
  const [waStatus, setWaStatus] = useState('disconnected')
  const [waQr, setWaQr] = useState('')
  const [connectingWa, setConnectingWa] = useState(false)
  const [customWaPhone, setCustomWaPhone] = useState('')
  const [waPolling, setWaPolling] = useState(false)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id,organizations(name)').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    setOrgName((profile.organizations as any)?.name || '')
    try {
      const subRes = await fetch(`/api/addons-market?org_id=${profile.org_id}`)
      const subJ = await subRes.json()
      const addon = (subJ.addons || []).find((a: any) => a.slug === 'table_reservations')
      const isSubscribed = !!addon?.subscription?.isValid
      setHasSubscription(isSubscribed)
      setHasWaAddon(isSubscribed) // إشعارات واتساب مدموجة بنفس اشتراك الحجوزات
      if (isSubscribed) { load(profile.org_id); checkWaStatus(profile.org_id) }
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

  async function checkWaStatus(oid: string) {
    const res = await fetch(`/api/reservation-wa-status?org_id=${oid}`)
    const j = await res.json()
    if (j.success) setWaStatus(j.status)
  }

  async function connectWa() {
    setConnectingWa(true)
    const res = await fetch('/api/reservation-wa-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, phone: customWaPhone }),
    })
    const j = await res.json()
    setConnectingWa(false)
    if (!j.success) { toast(j.error || 'فشل بدء الربط', 'error'); return }
    fetchQr()
    setWaPolling(true)
  }

  async function fetchQr() {
    const res = await fetch(`/api/reservation-wa-qrcode?org_id=${orgId}`)
    const j = await res.json()
    if (j.success && j.qrCode) setWaQr(j.qrCode)
  }

  useEffect(() => {
    if (!waPolling) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/reservation-wa-status?org_id=${orgId}`)
      const j = await res.json()
      if (j.success) {
        setWaStatus(j.status)
        if (j.status === 'connected') { setWaPolling(false); toast('✅ تم ربط واتساب بنجاح') }
        else if (j.status === 'need_scan' && !waQr) fetchQr()
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [waPolling, orgId])

  const previewUrl = slug ? `https://storely.dev/book/${slug}` : ''

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  if (hasSubscription === false) {
    return (
      <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🗓️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginBottom: 8 }}>ميزة "الحجوزات" غير مفعّلة</div>
        <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8, marginBottom: 20 }}>
          اشترك بميزة نظام حجز الطاولات من الإضافات عشان تقدر تبني صفحة الحجز الخاصة بك
        </div>
        <a href="/addons-market" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>روح للإضافات</a>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>إعدادات الحجوزات</h1>
        <p style={pageSub}>اضبط صفحة حجز الطاولات الخاصة بك — شعار، اسم، أوقات، ولون</p>
      </div>

      <div style={{ ...card, padding: '16px 20px', marginBottom: 16, border: `1px solid ${colors.infoBorder}`, background: colors.infoLight }}>
        <button onClick={() => setShowGuide(s => !s)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.info }}>📖 دليل سريع — كيف تفعّل الحجوزات خطوة بخطوة</span>
          <span style={{ fontSize: 12, color: colors.info, transform: showGuide ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        </button>
        {showGuide && (
          <ol style={{ marginTop: 14, paddingRight: 20, display: 'flex', flexDirection: 'column' as const, gap: 10, fontSize: 12.5, color: colors.text2, lineHeight: 1.8 }}>
            <li><b>الاسم اللي يظهر بصفحة الحجز:</b> اكتبه بحقل "اسم يظهر بصفحة الحجز" بالأسفل — هذا الاسم يشوفه العميل، مش شرط يطابق اسم منشأتك الرسمي.</li>
            <li><b>الشعار:</b> ارفعه من قسم "رفع شعار الحجوزات" — يظهر بأعلى صفحة الحجز العامة للعميل.</li>
            <li><b>رابط الحجز:</b> حدّد كلمة قصيرة بالإنجليزي بحقل "رابط صفحة الحجز" — هذا رابطك النهائي اللي تشاركه مع العملاء (storely.dev/book/رابطك).</li>
            <li><b>تفعيل الحجز:</b> فعّل مربّع "تفعيل صفحة الحجز ونشرها للعامة" بالأسفل، ثم اضغط "حفظ الإعدادات" — بدون هذي الخطوة الصفحة تفضل مخفية عن العملاء.</li>
            <li><b>رقم واتساب للإشعارات (اختياري):</b> بقسم "إشعارات واتساب"، اكتب رقم جوالك التجاري واضغط "ربط رقم واتساب"، ثم امسح رمز QR بجوالك.</li>
            <li><b>مهم جداً — تفعيل الحجوزات لموظفينك:</b> الموظف ما يقدر يشوف قائمة الحجوزات إلا لو عنده صلاحية "الحجوزات" 🗓️. روح "الموظفون" بالقائمة الجانبية، افتح صلاحيات أي موظف، وفعّل مربع "الحجوزات". بعدها راح يطلع له زر "الحجوزات" بصفحة دخوله.</li>
          </ol>
        )}
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
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={orgName || 'اسم منشأتك'} style={{ ...inp(), width: '100%' }} />
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

      {previewUrl && enabled && (
        <div style={{ ...card, padding: '20px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(previewUrl)}`} alt="QR" style={{ width: 130, height: 130, borderRadius: 12, border: `1px solid ${colors.border}` }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 6 }}>رمز QR لصفحة الحجز</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 12, lineHeight: 1.7 }}>اطبعه وحطّه على الطاولات أو ملصقات المحل — العميل يمسحه ويحجز طاولته مباشرة</div>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(previewUrl)}`} download={`qr-${slug}-booking.png`} style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '9px 18px', fontSize: 12 }}>
              ⬇️ تحميل بجودة عالية
            </a>
          </div>
        </div>
      )}

      {/* إشعارات واتساب */}
      <div style={{ ...card, padding: '20px', marginTop: 16 }}>
        <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>📲 إشعارات واتساب للحجوزات</div>
        <div style={{ fontSize: 11, color: colors.text4, marginBottom: 16 }}>رقم واتساب خاص بمنشأتك يرسل تلقائياً تأكيد الحجز وتحديثات الحالة للعميل</div>

        {!hasWaAddon ? (
          <div style={{ textAlign: 'center' as const, padding: 20, background: colors.bg, borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: colors.text3 }}>الإشعارات تلقائياً جزء من اشتراك نظام الحجوزات — فعّل الاشتراك من الأعلى وتقدر تربط رقمك فوراً</div>
          </div>
        ) : waStatus === 'connected' ? (
          <div style={{ textAlign: 'center' as const, padding: 20, background: colors.primaryLight, borderRadius: 12, border: `1px solid ${colors.primaryBorder}` }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary }}>واتساب متصل ويرسل الإشعارات تلقائياً</div>
          </div>
        ) : waQr ? (
          <div style={{ textAlign: 'center' as const }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waQr)}`} alt="QR" style={{ width: 200, height: 200, borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 14 }} />
            <div style={{ fontSize: 12, color: colors.text3, marginBottom: 4 }}>افتح واتساب على جوالك التجاري → الأجهزة المرتبطة → مسح رمز</div>
            <div style={{ fontSize: 11, color: colors.text4 }}>جاري الانتظار... ({waStatus === 'need_scan' ? 'بانتظار المسح' : waStatus})</div>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }}>رقم الواتساب اللي بتربطه (أي رقم خارجي، مو شرط رقم حسابك)</label>
            <input value={customWaPhone} onChange={e => setCustomWaPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" style={{ ...inp(), width: '100%', textAlign: 'right' as const, marginBottom: 10, boxSizing: 'border-box' as const }} />
            <button onClick={connectWa} disabled={connectingWa} style={{ ...btnPrimary, width: '100%' }}>
              {connectingWa ? 'جاري البدء...' : '🔗 ربط رقم واتساب'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
