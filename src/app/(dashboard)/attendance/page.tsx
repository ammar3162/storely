'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

export default function AttendancePage() {
  const [orgId, setOrgId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId) load(orgId, date) }, [date])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    load(profile.org_id, date)
  }

  async function load(oid: string, d: string) {
    setLoading(true)
    try {
      const bid = sessionStorage.getItem('s_branch_id')
      const params = new URLSearchParams({ org_id: oid, date: d })
      if (bid) params.set('branch_id', bid)
      const res = await fetch(`/api/attendance-report?${params.toString()}`)
      const j = await res.json()
      if (j.success) setRows(j.rows || [])
      else toast(j.error || 'تعذر تحميل السجل', 'error')
    } catch { toast('خطأ بالاتصال', 'error') }
    setLoading(false)
  }

  const presentCount = rows.filter(r => r.status !== 'لم يحضر').length
  const absentCount = rows.filter(r => r.status === 'لم يحضر').length

  const statusColor = (s: string) =>
    s === 'حاضر' ? colors.primary : s === 'انصرف' ? colors.info : colors.text4
  const statusBg = (s: string) =>
    s === 'حاضر' ? colors.primaryLight : s === 'انصرف' ? colors.infoLight : colors.bg

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={pageTitle}>الحضور والانصراف</h1>
          <p style={pageSub}>سجل حضور الفريق اليومي — يتحقق تلقائياً من موقعهم الجغرافي</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), width: 170 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
        <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: colors.primary }}>{presentCount}</div>
          <div style={{ fontSize: 11, color: colors.primary, fontWeight: 600, marginTop: 2 }}>حضروا اليوم</div>
        </div>
        <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: colors.dangerLight, border: `1px solid ${colors.dangerBorder}` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: colors.danger }}>{absentCount}</div>
          <div style={{ fontSize: 11, color: colors.danger, fontWeight: 600, marginTop: 2 }}>لم يحضروا</div>
        </div>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>ما فيه موظفين نشطين بهذا الفرع</div>
        ) : (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                  <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الموظف</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الحالة</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>وقت الحضور</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>وقت الانصراف</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي الساعات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.staff_id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: colors.text }}>{r.name}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(r.status), background: statusBg(r.status), padding: '3px 10px', borderRadius: 99 }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: colors.text2 }}>
                      {r.check_in ? new Date(r.check_in).toLocaleTimeString('ar-SA', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: colors.text2 }}>
                      {r.check_out ? new Date(r.check_out).toLocaleTimeString('ar-SA', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: colors.text2, fontWeight: 600 }}>
                      {r.hours_worked !== null ? `${r.hours_worked} ساعة` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
