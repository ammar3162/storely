'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, pageTitle, pageSub, card, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function StaffManagementPage() {
  const [staff, setStaff]     = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [orgId, setOrgId]     = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [revealedPin, setRevealedPin] = useState<{name:string,phone:string,pin:string}|null>(null)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    await Promise.all([loadStaff(profile.org_id), loadBranches(profile.org_id)])
    setLoading(false)
  }

  async function loadStaff(oid: string) {
    const { data } = await (sb.from('staff_members' as any) as any)
      .select('*,branches(name)')
      .eq('org_id', oid)
      .order('created_at', { ascending: false })
    setStaff(data || [])
  }

  async function loadBranches(oid: string) {
    const { data } = await sb.from('branches').select('id,name').eq('org_id', oid).eq('is_active', true).order('created_at')
    setBranches(data || [])
    if (data && data.length > 0) setNewBranch(data[0].id)
  }

  async function addStaff() {
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم الموظف ورقم جواله', 'warning'); return }
    const cleanPhone = newPhone.trim().replace(/\s/g, '')
    const pin = generatePin()

    const { error } = await (sb.from('staff_members' as any) as any).insert({
      org_id: orgId,
      branch_id: newBranch || null,
      name: newName.trim(),
      phone: cleanPhone,
      pin,
    })

    if (error) {
      if (error.code === '23505') toast('رقم الجوال هذا مسجّل لموظف آخر بالفعل', 'error')
      else toast('خطأ: ' + error.message, 'error')
      return
    }

    setRevealedPin({ name: newName.trim(), phone: cleanPhone, pin })
    setNewName(''); setNewPhone(''); setShowAdd(false)
    loadStaff(orgId)
  }

  async function toggleActive(id: string, current: boolean) {
    await (sb.from('staff_members' as any) as any).update({ is_active: !current }).eq('id', id)
    toast(current ? 'تم إيقاف الموظف' : 'تم تفعيل الموظف')
    loadStaff(orgId)
  }

  async function deleteStaff(id: string) {
    if (!confirm('حذف هذا الموظف نهائياً؟')) return
    await (sb.from('staff_members' as any) as any).delete().eq('id', id)
    toast('تم الحذف')
    loadStaff(orgId)
  }

  async function regeneratePin(id: string, name: string, phone: string) {
    const pin = generatePin()
    await (sb.from('staff_members' as any) as any).update({ pin }).eq('id', id)
    setRevealedPin({ name, phone, pin })
    loadStaff(orgId)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.text3, fontFamily: font.family }}>جاري التحميل...</div>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={pageTitle}>الموظفون</h1>
          <p style={pageSub}>أضف موظفين بصلاحيات صرف فقط — يدخلون برقم جوالهم ورمز PIN خاص بهم</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary, padding: '10px 18px', fontSize: font.sm }}>+ موظف جديد</button>
      </div>

      {revealedPin && (
        <div style={{ ...card, padding: 20, marginBottom: 18, background: colors.primaryLight, border: `1.5px solid ${colors.primaryBorder}` }}>
          <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text, marginBottom: 10 }}>✅ تم — شارك هذي البيانات مع {revealedPin.name}</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رقم الجوال</div>
              <div style={{ fontSize: font.lg, fontWeight: 800, color: colors.text }}>{revealedPin.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رمز PIN</div>
              <div style={{ fontSize: font.xl, fontWeight: 900, color: colors.primary, letterSpacing: 4 }}>{revealedPin.pin}</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رابط دخول الموظف</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: font.sm, color: colors.text, background: 'white', padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.primaryBorder}`, flex: 1, direction: 'ltr', textAlign: 'left', overflowX: 'auto', whiteSpace: 'nowrap' }}>https://storely-hm1u.vercel.app/staff</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`رابط دخول الموظف: https://storely-hm1u.vercel.app/staff\nرقم الجوال: ${revealedPin.phone}\nرمز PIN: ${revealedPin.pin}`)
                  toast('تم نسخ الرابط وبيانات الدخول')
                }}
                style={{ background: colors.primary, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}
              >
                نسخ الكل
              </button>
            </div>
          </div>
          <button onClick={() => setRevealedPin(null)} style={{ ...btnSecondary, padding: '8px 16px', fontSize: font.xs }}>تم، إخفاء</button>
        </div>
      )}

      {showAdd && (
        <div style={{ ...card, padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text, marginBottom: 14 }}>إضافة موظف جديد</div>
          <div style={{ display: 'grid', gridTemplateColumns: branches.length > 1 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={inp()} placeholder="اسم الموظف" />
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inp()} placeholder="رقم الجوال (05xxxxxxxx)" />
            {branches.length > 1 && (
              <select value={newBranch} onChange={e => setNewBranch(e.target.value)} style={inp()}>
                {branches.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addStaff} style={{ ...btnPrimary, padding: '10px 20px', fontSize: font.sm }}>إضافة وتوليد PIN</button>
            <button onClick={() => setShowAdd(false)} style={{ ...btnSecondary, padding: '10px 20px', fontSize: font.sm }}>إلغاء</button>
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.text2 }}>لا يوجد موظفين بعد، أضف أول موظف لك</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staff.map((s: any) => (
            <div key={s.id} style={{ ...card, padding: '14px 18px' }}>
              <div onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: font.md, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.name}
                    {!s.is_active && <span style={{ fontSize: font.xs, color: colors.danger, background: colors.dangerLight, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>موقوف</span>}
                  </div>
                  <div style={{ fontSize: font.xs, color: colors.text3, marginTop: 2 }}>{s.phone} {s.branches?.name ? `· ${s.branches.name}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); regeneratePin(s.id, s.name, s.phone) }} style={{ background: colors.infoLight, color: colors.info, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>توليد PIN جديد</button>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(s.id, s.is_active) }} style={{ background: colors.bg, color: colors.text2, border: `1.5px solid ${colors.border2}`, borderRadius: 8, padding: '6px 12px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>{s.is_active ? 'إيقاف' : 'تفعيل'}</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteStaff(s.id) }} style={{ background: colors.dangerLight, color: colors.danger, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>حذف</button>
                  <span style={{ color: colors.text3, fontSize: 12, marginRight: 4 }}>{expandedId === s.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedId === s.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border2}` }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رقم الجوال</div>
                      <div style={{ fontSize: font.lg, fontWeight: 800, color: colors.text }}>{s.phone}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رمز PIN الحالي</div>
                      <div style={{ fontSize: font.xl, fontWeight: 900, color: colors.primary, letterSpacing: 4 }}>{s.pin}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: font.xs, color: colors.text3, marginBottom: 4 }}>رابط دخول الموظف</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: font.sm, color: colors.text, background: colors.bg, padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.border2}`, flex: 1, direction: 'ltr', textAlign: 'left', overflowX: 'auto', whiteSpace: 'nowrap' }}>https://storely-hm1u.vercel.app/staff</div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`رابط دخول الموظف: https://storely-hm1u.vercel.app/staff\nرقم الجوال: ${s.phone}\nرمز PIN: ${s.pin}`)
                          toast('تم نسخ الرابط وبيانات الدخول')
                        }}
                        style={{ background: colors.primary, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: font.xs, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}
                      >
                        نسخ الكل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
