'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, pageTitle, pageSub } from '@/lib/ds'

export default function AddonsMarketPage() {
  const [addons, setAddons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id,organizations(name)').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgName((profile.organizations as any)?.name || '')
    const res = await fetch(`/api/addons-market?org_id=${profile.org_id}`)
    const j = await res.json()
    if (j.success) setAddons(j.addons)
    setLoading(false)
  }

  function subscribeLink(addon: any) {
    const text = `مرحباً، أبي أشترك بميزة "${addon.name}" (${addon.monthly_price} ر.س/شهر) لمنشأة: ${orgName}`
    return `https://wa.me/966594351667?text=${encodeURIComponent(text)}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>سوق الإضافات</h1>
        <p style={pageSub}>ميزات إضافية تساعدك تطوّر منشأتك — اشترك بأي وقت</p>
      </div>

      {addons.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' as const, color: colors.text4 }}>ما فيه إضافات متاحة حالياً</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {addons.map((a: any) => {
            const active = a.subscription?.isValid
            return (
              <div key={a.id} style={{ ...card, padding: 20, border: active ? `1.5px solid ${colors.primaryBorder}` : undefined, background: active ? colors.primaryLight : undefined }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14, minHeight: 40 }}>{a.description}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>{a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>ر.س / شهر</span></div>

                {active ? (
                  <div style={{ textAlign: 'center' as const }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: colors.primary, marginBottom: 4 }}>✅ مفعّلة</div>
                    <div style={{ fontSize: 10, color: colors.text4 }}>حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}</div>
                  </div>
                ) : (
                  <a href={subscribeLink(a)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center' as const, padding: '11px', background: colors.primary, color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    اشتراك عبر واتساب
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
