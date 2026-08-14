'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

export default function AttendancePage() {
  const [tab, setTab] = useState<'report'|'settings'>('report')
  const [orgId, setOrgId] = useState('')
  const [branchId, setBranchId] = useState<string|null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // إعدادات — شفتات
  const [shifts, setShifts] = useState<any[]>([])
  const [newShiftName, setNewShiftName] = useState('')
  const [newShiftStart, setNewShiftStart] = useState('08:00')
  const [newShiftEnd, setNewShiftEnd] = useState('16:00')
  const [newShift24h, setNewShift24h] = useState(false)
  const [savingShift, setSavingShift] = useState(false)

  // إعدادات — ربط الموظفين بالشفتات
  const [staffList, setStaffList] = useState<any[]>([])

  // إعدادات — غرامات التأخير
  const [rules, setRules] = useState<any[]>([])
  const [newRuleMin, setNewRuleMin] = useState('')
  const [newRuleMax, setNewRuleMax] = useState('')
  const [newRuleAmount, setNewRuleAmount] = useState('')
  const [savingRule, setSavingRule] = useState(false)

  const sb = createClient()

  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId) load(orgId, date) }, [date])

  async function init() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: profile } = await sb.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return
    setOrgId(profile.org_id)
    const bid = sessionStorage.getItem('s_branch_id')
    setBranchId(bid)
    load(profile.org_id, date)
    loadShifts(profile.org_id, bid)
    loadStaff(profile.org_id, bid)
    loadRules(profile.org_id)
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

  async function loadShifts(oid: string, bid: string|null) {
    const params = new URLSearchParams({ org_id: oid })
    if (bid) params.set('branch_id', bid)
    const res = await fetch(`/api/shifts?${params.toString()}`)
    const j = await res.json()
    if (j.success) setShifts(j.shifts || [])
  }

  async function loadStaff(oid: string, bid: string|null) {
    let q = (sb as any).from('staff_members').select('id,name,shift_id').eq('org_id', oid).eq('is_active', true)
    if (bid) q = q.eq('branch_id', bid)
    const { data } = await q.order('name')
    setStaffList(data || [])
  }

  async function loadRules(oid: string) {
    const res = await fetch(`/api/late-penalty-rules?org_id=${oid}`)
    const j = await res.json()
    if (j.success) setRules(j.rules || [])
  }

  async function addShift() {
    if (!newShiftName.trim() || !branchId) { toast('أدخل اسم الشفت — وتأكد إنك حدّدت فرع نشط', 'warning'); return }
    setSavingShift(true)
    const res = await fetch('/api/shifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, branch_id: branchId, name: newShiftName.trim(), start_time: newShiftStart, end_time: newShiftEnd, is_24h: newShift24h }),
    })
    const j = await res.json()
    setSavingShift(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    setNewShiftName(''); setNewShift24h(false)
    toast('✅ تم إضافة الشفت')
    loadShifts(orgId, branchId)
  }

  async function deleteShift(id: string) {
    if (!(await confirmDialog({ title: 'حذف الشفت', message: 'حذف هذا الشفت؟ الموظفين المرتبطين فيه راح يفكّون منه تلقائياً' }))) return
    const res = await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { toast(j.error || 'فشل الحذف', 'error'); return }
    toast('🗑️ تم الحذف')
    loadShifts(orgId, branchId)
    loadStaff(orgId, branchId)
  }

  async function assignShift(staffId: string, shiftId: string) {
    const { error } = await (sb as any).from('staff_members').update({ shift_id: shiftId || null }).eq('id', staffId)
    if (error) { toast('فشل الربط', 'error'); return }
    toast('✅ تم تحديد شفت الموظف')
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, shift_id: shiftId || null } : s))
  }

  async function addRule() {
    if (!newRuleMin || !newRuleAmount) { toast('أدخل الحد الأدنى للدقائق والمبلغ', 'warning'); return }
    setSavingRule(true)
    const res = await fetch('/api/late-penalty-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, min_minutes: newRuleMin, max_minutes: newRuleMax || null, penalty_amount: newRuleAmount }),
    })
    const j = await res.json()
    setSavingRule(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    setNewRuleMin(''); setNewRuleMax(''); setNewRuleAmount('')
    toast('✅ تم إضافة نطاق الغرامة')
    loadRules(orgId)
  }

  async function deleteRule(id: string) {
    if (!(await confirmDialog({ title: 'حذف النطاق', message: 'حذف نطاق الغرامة هذا؟' }))) return
    const res = await fetch(`/api/late-penalty-rules?id=${id}`, { method: 'DELETE' })
    const j = await res.json()
    if (!j.success) { toast(j.error || 'فشل الحذف', 'error'); return }
    toast('🗑️ تم الحذف')
    loadRules(orgId)
  }

  const presentCount = rows.filter(r => r.status !== 'لم يحضر').length
  const absentCount = rows.filter(r => r.status === 'لم يحضر').length

  const statusColor = (s: string) =>
    s === 'حاضر' ? colors.primary : s === 'انصرف' ? colors.info : colors.text4
  const statusBg = (s: string) =>
    s === 'حاضر' ? colors.primaryLight : s === 'انصرف' ? colors.infoLight : colors.bg

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={pageTitle}>الحضور والانصراف</h1>
        <p style={pageSub}>سجل حضور الفريق اليومي — يتحقق تلقائياً من موقعهم الجغرافي ويحسب التأخير</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'report', label: '📋 التقرير' }, { id: 'settings', label: '⚙️ الشفتات والغرامات' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '9px 16px', borderRadius: 99, border: `1.5px solid ${tab === t.id ? colors.primary : colors.border2}`, background: tab === t.id ? colors.primaryLight : colors.surface, color: tab === t.id ? colors.primary : colors.text3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
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
        </>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

          {/* الشفتات */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>الشفتات</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>حدّد شفت واحد، شفتين، أو 24 ساعة — وحدّد وقت البداية لكل شفت عشان يعرف النظام يحسب التأخير</div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12 }}>
              <input value={newShiftName} onChange={e => setNewShiftName(e.target.value)} placeholder="اسم الشفت (مثلاً: الشفت الأول)" style={{ ...inp(), flex: 1, minWidth: 160 }} />
              {!newShift24h && (
                <>
                  <input type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} style={{ ...inp(), width: 110 }} />
                  <span style={{ alignSelf: 'center', color: colors.text4, fontSize: 12 }}>إلى</span>
                  <input type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} style={{ ...inp(), width: 110 }} />
                </>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.text3, cursor: 'pointer' }}>
                <input type="checkbox" checked={newShift24h} onChange={e => setNewShift24h(e.target.checked)} />
                24 ساعة
              </label>
              <button onClick={addShift} disabled={savingShift} style={{ ...btnPrimary, padding: '0 16px' }}>{savingShift ? '...' : '+ إضافة'}</button>
            </div>

            {shifts.length === 0 ? (
              <div style={{ fontSize: 12, color: colors.text4, textAlign: 'center' as const, padding: 12 }}>ما فيه شفتات معرّفة بعد</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {shifts.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: colors.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{s.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: colors.text3 }}>{s.is_24h ? '24 ساعة' : `${s.start_time?.slice(0,5)} — ${s.end_time?.slice(0,5)}`}</span>
                      <button onClick={() => deleteShift(s.id)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ربط الموظفين بالشفتات */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>تحديد شفت كل موظف</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>حدّد أي موظف يتبع أي شفت — عشان النظام يعرف يحسب تأخيره صح</div>

            {staffList.length === 0 ? (
              <div style={{ fontSize: 12, color: colors.text4, textAlign: 'center' as const, padding: 12 }}>ما فيه موظفين نشطين</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {staffList.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: colors.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{s.name}</span>
                    <select value={s.shift_id || ''} onChange={e => assignShift(s.id, e.target.value)} style={{ ...inp(), width: 180, padding: '6px 10px', fontSize: 12 }}>
                      <option value="">بدون شفت محدد</option>
                      {shifts.map((sh: any) => (<option key={sh.id} value={sh.id}>{sh.name}</option>))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* غرامات التأخير */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text, marginBottom: 4 }}>غرامات التأخير (اختياري)</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 14 }}>حدّد مبلغ مختلف حسب مدة التأخير بالدقائق — مثلاً: من 0 إلى 30 دقيقة = 10 ر.س</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <input type="number" value={newRuleMin} onChange={e => setNewRuleMin(e.target.value)} placeholder="من دقيقة" style={{ ...inp(), width: 110 }} />
              <input type="number" value={newRuleMax} onChange={e => setNewRuleMax(e.target.value)} placeholder="إلى دقيقة (اختياري)" style={{ ...inp(), width: 140 }} />
              <input type="number" value={newRuleAmount} onChange={e => setNewRuleAmount(e.target.value)} placeholder="المبلغ (ر.س)" style={{ ...inp(), width: 120 }} />
              <button onClick={addRule} disabled={savingRule} style={{ ...btnPrimary, padding: '0 16px' }}>{savingRule ? '...' : '+ إضافة'}</button>
            </div>

            {rules.length === 0 ? (
              <div style={{ fontSize: 12, color: colors.text4, textAlign: 'center' as const, padding: 12 }}>ما فيه نطاقات غرامة معرّفة — التأخير راح يُسجّل بدون غرامة</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {rules.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: colors.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: colors.text }}>من {r.min_minutes} دقيقة {r.max_minutes ? `إلى ${r.max_minutes} دقيقة` : 'فأكثر'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.danger }}>{r.penalty_amount} ر.س</span>
                      <button onClick={() => deleteRule(r.id)} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
