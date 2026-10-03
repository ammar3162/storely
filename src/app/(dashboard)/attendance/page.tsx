'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { colors, font, card, btnPrimary, pageTitle, pageSub, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { exportReportPdf } from '@/lib/pdfExport'
import { WEEKDAYS_AR, weeklyOffCount } from '@/lib/daysOff'

// كل الأوقات والتواريخ بالتقرير بتوقيت السعودية
const saudiToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('ar-SA', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }) : '—'
const fmtDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ar-SA', { numberingSystem: 'latn', weekday: 'short', day: 'numeric', month: 'numeric', calendar: 'gregory', timeZone: 'UTC' })
const fmtMinutes = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}س ${r}د` : `${h} ساعة`) : `${r} دقيقة` }

export default function AttendancePage() {
  const [tab, setTab] = useState<'report'|'settings'>('report')
  const [orgId, setOrgId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [waiving, setWaiving] = useState<string|null>(null)
  const [locked, setLocked] = useState(false)
  const [branchId, setBranchId] = useState<string|null>(null)
  const [periodMode, setPeriodMode] = useState<'day'|'range'>('day')
  const [date, setDate] = useState(() => saudiToday())
  const [rangeFrom, setRangeFrom] = useState(() => saudiToday().slice(0, 8) + '01')
  const [rangeTo, setRangeTo] = useState(() => saudiToday())
  const [staffFilter, setStaffFilter] = useState('')  // '' = كل الموظفين
  const [rows, setRows] = useState<any[]>([])
  const [rangeRows, setRangeRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [monthStats, setMonthStats] = useState<{totalPenalty:number; attendanceRate:number|null; mostLate:{name:string;minutes:number}|null}|null>(null)

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
  // غرامة التأخير: وقت سماح + مبلغ لكل ساعة
  const [late, setLate] = useState<{ grace: string; perHour: string } | null>(null)
  const [savingLate, setSavingLate] = useState(false)

  // إعدادات — الأوفر تايم
  const [ot, setOt] = useState<{mode:'auto'|'fixed'|'off'; multiplier:string; fixedRate:string; minMinutes:string}|null>(null)
  const [savingOt, setSavingOt] = useState(false)

  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId && periodMode === 'day') load(orgId, date) }, [date, periodMode, staffFilter])
  useEffect(() => { if (orgId && periodMode === 'range') loadRange(orgId, rangeFrom, rangeTo) }, [rangeFrom, rangeTo, periodMode, staffFilter])

  async function init() {
    const me = await api.get('/api/me')
    if (!me.success || !me.org_id) return
    const oid: string = me.org_id
    sessionStorage.setItem('s_org_id', oid)
    const orgName = me.org?.name || '', orgPlan = me.org?.plan || ''
    setOrgId(oid)
    setOrgName(orgName)
    setIsOwner(me.role === 'owner')
    if (orgPlan === 'basic') {
      // عميل الأساسية ممكن يكون اشترى إضافة "إدارة الموظفين الكاملة" من المتجر
      const addonRes = await api.get('/api/addons-market', { org_id: oid })
      const hrAddon = (addonRes?.addons||[]).find((a:any)=>a.slug==='hr_full')
      if (!hrAddon?.subscription?.isValid) setLocked(true)  // ما نوقف التحميل -- نخلي المالك يشوف سجلاته القديمة، السيرفر أصلاً يرفض أي تسجيل جديد بدون اشتراك
    }
    const bid = sessionStorage.getItem('s_branch_id')
    setBranchId(bid)
    load(oid, date)
    loadShifts(oid, bid)
    loadStaff(oid, bid)
    loadOvertime(oid)
    loadMonthOverview(oid)
  }

  async function loadMonthOverview(oid: string) {
    try {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const to = now.toISOString().slice(0, 10)
      const bid = sessionStorage.getItem('s_branch_id')
      const j = await api.get('/api/attendance-report', { org_id: oid, from, to, branch_id: bid })
      if (!j.success || !j.rows?.length) { setMonthStats({ totalPenalty: 0, attendanceRate: null, mostLate: null }); return }
      const totalPenalty = Math.round(j.rows.reduce((s:number,r:any)=>s+r.total_penalty,0)*100)/100
      const totalPresent = j.rows.reduce((s:number,r:any)=>s+r.days_present,0)
      const totalPossible = j.rows.reduce((s:number,r:any)=>s+r.days_present+r.days_absent,0)
      const attendanceRate = totalPossible > 0 ? Math.round((totalPresent/totalPossible)*100) : null
      const withLate = j.rows.filter((r:any)=>r.total_late_minutes>0).sort((a:any,b:any)=>b.total_late_minutes-a.total_late_minutes)
      const mostLate = withLate[0] ? { name: withLate[0].name, minutes: withLate[0].total_late_minutes } : null
      setMonthStats({ totalPenalty, attendanceRate, mostLate })
    } catch { setMonthStats({ totalPenalty: 0, attendanceRate: null, mostLate: null }) }
  }

  async function loadRange(oid: string, from: string, to: string) {
    setLoading(true)
    try {
      const bid = sessionStorage.getItem('s_branch_id')
      const j = await api.get('/api/attendance-report', { org_id: oid, from, to, branch_id: bid, staff_id: staffFilter || undefined })
      if (j.success) setRangeRows(j.rows || [])
      else toast(j.message || j.error || 'تعذر تحميل السجل', 'error')
    } catch { toast('خطأ بالاتصال', 'error') }
    setLoading(false)
  }

  async function exportRangePdf() {
    setExporting(true)
    try {
      const one = staffFilter ? rangeRows[0] : null
      if (one?.days) {
        const days = one.days.map((d: any) => ({
          ...d,
          check_in: fmtTime(d.check_in), check_out: fmtTime(d.check_out),
          hours_worked: d.hours_worked ?? '—', late_minutes: d.late_minutes || '—',
          overtime: d.overtime_minutes ? `${fmtMinutes(d.overtime_minutes)} (${d.overtime_pay} ر.س)` : '—',
        }))
        await exportReportPdf({
          title: `سجل حضور ${one.name}`,
          subtitle: `من ${rangeFrom} إلى ${rangeTo}`,
          orgName,
          columns: [
            { header: 'التاريخ', key: 'date' },
            { header: 'الحضور', key: 'check_in', align: 'center' },
            { header: 'الانصراف', key: 'check_out', align: 'center' },
            { header: 'الساعات', key: 'hours_worked', align: 'center' },
            { header: 'التأخير (دقيقة)', key: 'late_minutes', align: 'center' },
            { header: 'الأوفر تايم', key: 'overtime', align: 'center' },
          ],
          rows: days,
          totalsRow: {
            date: 'الإجمالي', check_in: `${one.days_present} يوم`, check_out: '', hours_worked: '',
            late_minutes: one.total_late_minutes,
            overtime: one.total_overtime_minutes ? `${fmtMinutes(one.total_overtime_minutes)} (${one.total_overtime_pay} ر.س)` : '—',
          },
          fileName: `حضور-${one.name}-${rangeFrom}-${rangeTo}`,
        })
        setExporting(false)
        return
      }
      await exportReportPdf({
        title: 'تقرير الحضور والانصراف',
        subtitle: `من ${rangeFrom} إلى ${rangeTo}`,
        orgName,
        columns: [
          { header: 'الموظف', key: 'name' },
          { header: 'أيام الحضور', key: 'days_present', align: 'center' },
          { header: 'أيام الغياب', key: 'days_absent', align: 'center' },
          { header: 'إجازات', key: 'days_off', align: 'center' },
          { header: 'أيام إضافية', key: 'extra_days', align: 'center' },
          { header: 'إجمالي دقائق التأخير', key: 'total_late_minutes', align: 'center' },
          { header: 'إجمالي الخصومات (ر.س)', key: 'total_penalty', align: 'center' },
          { header: 'دقائق الأوفر تايم', key: 'total_overtime_minutes', align: 'center' },
          { header: 'مبلغ الأوفر تايم (ر.س)', key: 'total_overtime_pay', align: 'center' },
        ],
        rows: rangeRows,
        totalsRow: {
          name: 'الإجمالي',
          days_present: rangeRows.reduce((s,r)=>s+r.days_present,0),
          days_absent: rangeRows.reduce((s,r)=>s+r.days_absent,0),
          days_off: rangeRows.reduce((s,r)=>s+(r.days_off||0),0),
          extra_days: rangeRows.reduce((s,r)=>s+(r.extra_days||0),0),
          total_late_minutes: rangeRows.reduce((s,r)=>s+r.total_late_minutes,0),
          total_penalty: Math.round(rangeRows.reduce((s,r)=>s+r.total_penalty,0)*100)/100,
          total_overtime_minutes: rangeRows.reduce((s,r)=>s+(r.total_overtime_minutes||0),0),
          total_overtime_pay: Math.round(rangeRows.reduce((s,r)=>s+(r.total_overtime_pay||0),0)*100)/100,
        },
        fileName: `تقرير-الحضور-${rangeFrom}-${rangeTo}`,
      })
    } catch { toast('فشل التصدير', 'error') }
    setExporting(false)
  }

  async function load(oid: string, d: string) {
    setLoading(true)
    try {
      const bid = sessionStorage.getItem('s_branch_id')
      const j = await api.get('/api/attendance-report', { org_id: oid, date: d, branch_id: bid, staff_id: staffFilter || undefined })
      if (j.success) setRows(j.rows || [])
      else toast(j.message || j.error || 'تعذر تحميل السجل', 'error')
    } catch { toast('خطأ بالاتصال', 'error') }
    setLoading(false)
  }

  // غرامات التأخير تنخصم تلقائياً — المالك يقدر يلغي غرامة يوم معيّن أو يرجّعها
  async function toggleWaive(attendanceId: string, waived: boolean) {
    if (!orgId || waiving) return
    setWaiving(attendanceId)
    const j = await api.post('/api/attendance-penalty', { org_id: orgId, attendance_id: attendanceId, waived })
    setWaiving(null)
    if (!j.success) { toast(j.error || 'تعذر التعديل', 'error'); return }
    toast(waived ? 'تم إلغاء الغرامة — ما تنخصم من الراتب' : 'تم إرجاع الغرامة')
    if (periodMode === 'day') load(orgId, date); else loadRange(orgId, rangeFrom, rangeTo)
  }

  function penaltyCell(r: any) {
    const amount = r.penalty_original ?? r.penalty_amount
    if (!amount) return <span style={{ color: colors.text4 }}>—</span>
    if (r.penalty_legacy) return <span style={{ color: colors.text4, whiteSpace: 'nowrap' as const }} title="غرامة قبل تفعيل الخصم التلقائي — ما تنخصم">{amount} ر.س · <span style={{ fontSize: 10, fontWeight: 700 }}>ما انخصمت</span></span>
    const canToggle = isOwner && r.attendance_id && !r.penalty_locked
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' as const }}>
        <span style={{ color: r.penalty_waived ? colors.text4 : colors.danger, fontWeight: 700, textDecoration: r.penalty_waived ? 'line-through' : 'none' }}>{amount} ر.س</span>
        {r.penalty_waived && <span style={{ fontSize: 10, fontWeight: 700, color: colors.text3 }}>ملغاة</span>}
        {canToggle && (
          <button onClick={() => toggleWaive(r.attendance_id, !r.penalty_waived)} disabled={waiving === r.attendance_id}
            style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${colors.border2}`, background: colors.surface, color: colors.text3, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            {waiving === r.attendance_id ? '...' : r.penalty_waived ? 'إرجاع' : 'إلغاء'}
          </button>
        )}
      </span>
    )
  }

  async function loadShifts(oid: string, bid: string|null) {
    const j = await api.get('/api/shifts', { org_id: oid, branch_id: bid })
    if (j.success) setShifts(j.shifts || [])
  }

  async function loadStaff(oid: string, bid: string|null) {
    const j = await api.get('/api/staff-shifts', { org_id: oid, branch_id: bid })
    if (j.success) setStaffList(j.staff || [])
  }

  async function loadOvertime(oid: string) {
    const j = await api.get('/api/org-settings', { org_id: oid, scope: 'full' })
    if (!j.success) return
    const o = j.settings || {}
    setOt({
      mode: ['auto','fixed','off'].includes(o.overtime_mode) ? o.overtime_mode : 'auto',
      multiplier: String(o.overtime_multiplier ?? 1.5),
      fixedRate: o.overtime_fixed_rate == null ? '' : String(o.overtime_fixed_rate),
      minMinutes: String(o.overtime_min_minutes ?? 15),
    })
    setLate({ grace: String(o.late_grace_minutes ?? 0), perHour: o.late_penalty_per_hour == null ? '' : String(o.late_penalty_per_hour) })
  }

  async function saveOvertime() {
    if (!ot) return
    if (ot.mode === 'fixed' && !(Number(ot.fixedRate) > 0)) { toast('اكتب مبلغ الساعة الإضافية', 'warning'); return }
    setSavingOt(true)
    const j = await api.patch('/api/org-settings', {
      org_id: orgId, overtime_mode: ot.mode, overtime_multiplier: Number(ot.multiplier) || 1.5,
      overtime_fixed_rate: ot.fixedRate === '' ? null : Number(ot.fixedRate), overtime_min_minutes: Math.round(Number(ot.minMinutes) || 0),
    })
    setSavingOt(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    toast('✅ تم حفظ إعدادات الأوفر تايم')
  }



  // أيام الإجازة الأسبوعية للموظف — تنحفظ على طول مع كل ضغطة
  async function toggleOffDay(staffId: string, day: number) {
    const cur: number[] = staffList.find((x: any) => x.id === staffId)?.weekly_off_days || []
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day].sort((a, b) => a - b)
    if (next.length > 6) { toast('لازم يبقى يوم دوام واحد على الأقل', 'warning'); return }
    setStaffList(prev => prev.map((x: any) => x.id === staffId ? { ...x, weekly_off_days: next } : x))
    const j = await api.patch('/api/staff-shifts', { org_id: orgId, staff_id: staffId, weekly_off_days: next })
    if (!j.success) {
      toast(j.error || 'تعذر الحفظ', 'error')
      setStaffList(prev => prev.map((x: any) => x.id === staffId ? { ...x, weekly_off_days: cur } : x))
    }
  }

  // نوع إجازة الموظف: أيام ثابتة بالأسبوع أو رصيد بالشهر
  async function setOffMode(staffId: string, patch: { days_off_mode?: 'weekly' | 'monthly'; monthly_off_days?: number }) {
    const before = staffList.find((x: any) => x.id === staffId)
    setStaffList(prev => prev.map((x: any) => x.id === staffId ? { ...x, ...patch } : x))
    const j = await api.patch('/api/staff-shifts', { org_id: orgId, staff_id: staffId, ...patch })
    if (!j.success) {
      toast(j.error || 'تعذر الحفظ', 'error')
      setStaffList(prev => prev.map((x: any) => x.id === staffId ? { ...x, ...before } : x))
    }
  }

  async function addShift() {
    if (!newShiftName.trim() || !branchId) { toast('أدخل اسم الشفت — وتأكد إنك حدّدت فرع نشط', 'warning'); return }
    setSavingShift(true)
    const j = await api.post('/api/shifts', { org_id: orgId, branch_id: branchId, name: newShiftName.trim(), start_time: newShiftStart, end_time: newShiftEnd, is_24h: newShift24h })
    setSavingShift(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    setNewShiftName(''); setNewShift24h(false)
    toast('✅ تم إضافة الشفت')
    loadShifts(orgId, branchId)
  }

  async function deleteShift(id: string) {
    if (!(await confirmDialog({ title: 'حذف الشفت', message: 'حذف هذا الشفت؟ الموظفين المرتبطين فيه راح يفكّون منه تلقائياً' }))) return
    const j = await api.del('/api/shifts', { id })
    if (!j.success) { toast(j.error || 'فشل الحذف', 'error'); return }
    toast('🗑️ تم الحذف')
    loadShifts(orgId, branchId)
    loadStaff(orgId, branchId)
  }

  async function assignShift(staffId: string, shiftId: string) {
    const j = await api.patch('/api/staff-shifts', { org_id: orgId, staff_id: staffId, shift_id: shiftId || null })
    if (!j.success) { toast(j.error || 'فشل الربط', 'error'); return }
    toast('✅ تم تحديد الشفت — لو الموظف داخل دوامه الحين يكمله على شفته القديم، والجديد يبدأ من دوامه الجاي')
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, shift_id: shiftId || null } : s))
  }

  async function saveLate() {
    if (!orgId || !late) return
    const grace = Number(late.grace || 0)
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) { toast('وقت السماح من 0 إلى 120 دقيقة', 'warning'); return }
    if (late.perHour !== '' && !(Number(late.perHour) >= 0)) { toast('أدخل مبلغ صحيح', 'warning'); return }
    setSavingLate(true)
    const j = await api.patch('/api/org-settings', { org_id: orgId, late_grace_minutes: grace, late_penalty_per_hour: late.perHour === '' ? null : Number(late.perHour) })
    setSavingLate(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    toast('✅ تم حفظ إعدادات التأخير — تتطبّق من الحضور الجاي')
  }



  const presentCount = rows.filter(r => r.check_in).length
  const absentCount = rows.filter(r => r.status === 'لم يحضر').length
  const offCount = rows.filter(r => !r.check_in && r.day_off).length

  const statusColor = (s: string) =>
    s.startsWith('حاضر') ? colors.primary : s.startsWith('انصرف') ? colors.info : s.startsWith('إجازة') ? '#1d4ed8' : colors.text4
  const statusBg = (s: string) =>
    s.startsWith('حاضر') ? colors.primaryLight : s.startsWith('انصرف') ? colors.infoLight : s.startsWith('إجازة') ? '#eff6ff' : colors.bg

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={pageTitle}><PageIcon/>الحضور والانصراف</h1>
        <p style={pageSub}>سجل حضور الفريق اليومي — يتحقق تلقائياً من موقعهم الجغرافي ويحسب التأخير</p>
      </div>

      {locked && (
        <div style={{...card,padding:14,marginBottom:18,background:colors.warningLight,border:`1px solid ${colors.warningBorder}`,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>🔒</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:colors.text}}>وضع قراءة فقط — انتهى اشتراك ميزة "إدارة الموظفين الكاملة"</div>
            <div style={{fontSize:12,color:colors.text3}}>سجلاتك القديمة محفوظة وتقدر تشوفها، بس ما تقدر تسجّل حضور جديد أو تعدّل الشفتات إلا بعد تجديد الاشتراك</div>
          </div>
        </div>
      )}

      {monthStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: colors.text4, fontWeight: 600, marginBottom: 4 }}>معدّل الحضور — هذا الشهر</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.text }}>{monthStats.attendanceRate !== null ? `${monthStats.attendanceRate}%` : '—'}</div>
          </div>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: monthStats.totalPenalty>0?colors.dangerLight:undefined, border: monthStats.totalPenalty>0?`1px solid ${colors.dangerBorder}`:undefined }}>
            <div style={{ fontSize: 10, color: monthStats.totalPenalty>0?colors.danger:colors.text4, fontWeight: 600, marginBottom: 4 }}>إجمالي الخصومات — هذا الشهر</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: monthStats.totalPenalty>0?colors.danger:colors.text }}>{monthStats.totalPenalty>0?`${monthStats.totalPenalty} ر.س`:'—'}</div>
          </div>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: monthStats.mostLate?colors.warningLight:undefined, border: monthStats.mostLate?`1px solid ${colors.warningBorder}`:undefined }}>
            <div style={{ fontSize: 10, color: monthStats.mostLate?colors.warning:colors.text4, fontWeight: 600, marginBottom: 4 }}>الأكثر تأخيراً — هذا الشهر</div>
            <div style={{ fontSize: monthStats.mostLate?15:22, fontWeight: 900, color: monthStats.mostLate?colors.warning:colors.text }}>{monthStats.mostLate ? `${monthStats.mostLate.name} (${monthStats.mostLate.minutes} د)` : '—'}</div>
          </div>
        </div>
      )}

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
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'day', label: 'يوم واحد' }, { id: 'range', label: 'فترة مخصصة' }].map(m => (
                <button key={m.id} onClick={() => setPeriodMode(m.id as any)}
                  style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${periodMode === m.id ? colors.primary : colors.border2}`, background: periodMode === m.id ? colors.primaryLight : colors.surface, color: periodMode === m.id ? colors.primary : colors.text3, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                  {m.label}
                </button>
              ))}
              <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ ...inp(), width: 170, padding: '7px 10px', fontSize: 12 }}>
                <option value="">👥 كل الموظفين</option>
                {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {periodMode === 'day' ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), width: 170 }} />
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={{ ...inp(), width: 150 }} />
                <span style={{ color: colors.text4, fontSize: 12 }}>إلى</span>
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} style={{ ...inp(), width: 150 }} />
                <button onClick={exportRangePdf} disabled={exporting || rangeRows.length===0} style={{ ...btnPrimary, padding: '9px 16px', fontSize: 13 }}>
                  {exporting ? '...' : '📄 تصدير PDF'}
                </button>
              </div>
            )}
          </div>

          {periodMode === 'day' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${offCount ? 3 : 2},1fr)`, gap: 8, marginBottom: 16 }}>
                <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}` }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: colors.primary }}>{presentCount}</div>
                  <div style={{ fontSize: 11, color: colors.primary, fontWeight: 600, marginTop: 2 }}>حضروا اليوم</div>
                </div>
                <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: colors.dangerLight, border: `1px solid ${colors.dangerBorder}` }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: colors.danger }}>{absentCount}</div>
                  <div style={{ fontSize: 11, color: colors.danger, fontWeight: 600, marginTop: 2 }}>لم يحضروا</div>
                </div>
                {offCount > 0 && (
                  <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1d4ed8' }}>{offCount}</div>
                    <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginTop: 2 }}>بإجازة</div>
                  </div>
                )}
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
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>التأخير</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الخصم</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الأوفر تايم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.staff_id} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: colors.text }}>{r.name}{r.shift_warning && <span title={r.shift_warning === 'none' ? 'الموظف مو مربوط بشفت — ما ينحسب له تأخير ولا أوفر تايم' : 'شفت 24 ساعة — ما ينحسب تأخير ولا أوفر تايم'} style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{r.shift_warning === 'none' ? '⚠️ بدون شفت' : '⚠️ شفت 24 ساعة'}</span>}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(r.status), background: statusBg(r.status), padding: '3px 10px', borderRadius: 99 }}>{r.status}</span>
                            </td>
                            <td style={{ padding: '11px 14px', color: colors.text2 }}>
                              {fmtTime(r.check_in)}
                            </td>
                            <td style={{ padding: '11px 14px', color: colors.text2 }}>
                              {fmtTime(r.check_out)}
                              {r.is_excused && <span style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px' }}>مستأذن</span>}
                            </td>
                            <td style={{ padding: '11px 14px', color: colors.text2, fontWeight: 600 }}>
                              {r.hours_worked !== null ? `${r.hours_worked} ساعة` : '—'}
                            </td>
                            <td style={{ padding: '11px 14px', color: r.late_minutes ? colors.warning : colors.text4 }}>
                              {r.late_minutes ? `${r.late_minutes} دقيقة` : '—'}
                            </td>
                            <td style={{ padding: '11px 14px', fontWeight: 700 }}>
                              {penaltyCell(r)}
                            </td>
                            <td style={{ padding: '11px 14px', color: r.overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                              {r.overtime_minutes ? <>{fmtMinutes(r.overtime_minutes)}{r.overtime_pay ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}> · {r.overtime_pay} ر.س</span> : null}</> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...card, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>جاري التحميل...</div>
              ) : rangeRows.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>ما فيه بيانات لهذي الفترة</div>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                        <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الموظف</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>أيام الحضور</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>أيام الغياب</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجازات</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي التأخير</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي الخصومات</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الأوفر تايم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangeRows.map((r, i) => (
                        <tr key={r.staff_id} style={{ borderBottom: i < rangeRows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: colors.text }}>{r.name}{r.shift_warning && <span title={r.shift_warning === 'none' ? 'الموظف مو مربوط بشفت — ما ينحسب له تأخير ولا أوفر تايم' : 'شفت 24 ساعة — ما ينحسب تأخير ولا أوفر تايم'} style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{r.shift_warning === 'none' ? '⚠️ بدون شفت' : '⚠️ شفت 24 ساعة'}</span>}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: colors.primary, fontWeight: 700 }}>{r.days_present}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.days_absent ? colors.danger : colors.text4, fontWeight: 700 }}>{r.days_absent || '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.days_off ? '#1d4ed8' : colors.text4, fontWeight: 700 }}>
                            {r.days_off || '—'}{r.extra_days ? <div style={{ fontSize: 10.5, color: colors.primary, fontWeight: 700 }}>+{r.extra_days} يوم إضافي</div> : null}
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_late_minutes ? colors.warning : colors.text4 }}>{r.total_late_minutes ? `${r.total_late_minutes} دقيقة` : '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_penalty ? colors.danger : colors.text4, fontWeight: 700 }}>{r.total_penalty ? `${r.total_penalty} ر.س` : '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                            {r.total_overtime_minutes ? <>{fmtMinutes(r.total_overtime_minutes)}{r.total_overtime_pay ? <div style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}>{r.total_overtime_pay} ر.س</div> : null}</> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && rangeRows[0]?.days && (
                <div style={{ borderTop: `1px solid ${colors.border2}` }}>
                  <div style={{ padding: '12px 14px', fontWeight: 800, fontSize: 13, color: colors.text }}>📅 السجل اليومي — {rangeRows[0].name}{rangeRows[0].shift_warning && <span style={{ marginRight: 8, fontSize: 11, fontWeight: 600, color: '#b45309' }}>⚠️ {rangeRows[0].shift_warning === 'none' ? 'مو مربوط بشفت' : 'شفت 24 ساعة'} — ما ينحسب له تأخير ولا أوفر تايم. اربطه من تبويب الإعدادات.</span>}</div>
                  <div style={{ overflowX: 'auto' as const }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                          {['التاريخ', 'الحالة', 'الحضور', 'الانصراف', 'الساعات', 'التأخير', 'الخصم', 'الأوفر تايم'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' as const }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rangeRows[0].days.map((d: any, i: number) => (
                          <tr key={d.date} style={{ borderBottom: i < rangeRows[0].days.length - 1 ? `1px solid ${colors.border}` : 'none', opacity: d.check_in ? 1 : 0.6 }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: colors.text, whiteSpace: 'nowrap' as const }}>{fmtDay(d.date)}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(d.status), background: statusBg(d.status), padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' as const }}>{d.status === 'لم يحضر' ? 'غياب' : d.status}</span>
                            </td>
                            <td style={{ padding: '10px 14px', color: colors.text2 }}>{fmtTime(d.check_in)}</td>
                            <td style={{ padding: '10px 14px', color: colors.text2 }}>
                              {fmtTime(d.check_out)}
                              {d.is_excused && <span style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px' }}>مستأذن</span>}
                            </td>
                            <td style={{ padding: '10px 14px', color: colors.text2, fontWeight: 600 }}>{d.hours_worked !== null ? `${d.hours_worked} ساعة` : '—'}</td>
                            <td style={{ padding: '10px 14px', color: d.late_minutes ? colors.warning : colors.text4 }}>{d.late_minutes ? `${d.late_minutes} دقيقة` : '—'}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>{penaltyCell(d)}</td>
                            <td style={{ padding: '10px 14px', color: d.overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                              {d.overtime_minutes ? <>{fmtMinutes(d.overtime_minutes)}{d.overtime_pay ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}> · {d.overtime_pay} ر.س</span> : null}</> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!loading && !staffFilter && rangeRows.length > 0 && (
                <div style={{ padding: '10px 14px', fontSize: 11, color: colors.text4, borderTop: `1px solid ${colors.border}` }}>💡 اختر موظف من القائمة فوق عشان يطلع لك سجله يوم بيوم</div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (() => {
        // ── مساعدات العرض ──
        const t12 = (t?: string | null) => {
          if (!t) return '—'
          const [h, m] = t.slice(0, 5).split(':').map(Number)
          const suffix = h < 12 ? 'ص' : 'م'
          const h12 = h % 12 === 0 ? 12 : h % 12
          return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
        }
        const durMin = (st?: string | null, en?: string | null) => {
          if (!st || !en) return 0
          const toM = (x: string) => { const [h, m] = x.slice(0, 5).split(':').map(Number); return h * 60 + m }
          const S = toM(st), E = toM(en)
          return E > S ? E - S : 1440 - S + E
        }
        const durLabel = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} ساعة و${m} دقيقة` : h ? `${h} ${h <= 10 && h > 2 ? 'ساعات' : 'ساعة'}` : `${m} دقيقة` }
        // ينتهي بعد 12 الليل (اللي ينتهي 12:00 بالضبط ما نعتبره «اليوم الثاني»)
        const crossesMidnight = (st?: string | null, en?: string | null) => !!st && !!en && en.slice(0, 5) !== '00:00' && en.slice(0, 5) <= st.slice(0, 5)
        const staffOn = (shiftId: string) => staffList.filter((x: any) => x.shift_id === shiftId).length
        const withoutShift = staffList.filter((x: any) => !x.shift_id).length

        const step = (n: number, title: string, desc: string, status?: React.ReactNode) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: colors.primaryLight, color: colors.primary, fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{title}</div>
                <div style={{ fontSize: 12, color: colors.text3, marginTop: 3, lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
            {status}
          </div>
        )
        const pill = (txt: React.ReactNode, tone: 'ok' | 'warn' | 'muted') => {
          const c = tone === 'ok' ? { fg: colors.primary, bg: colors.primaryLight, bd: colors.primaryBorder } : tone === 'warn' ? { fg: '#b45309', bg: '#fffbeb', bd: '#fde68a' } : { fg: colors.text3, bg: colors.bg, bd: colors.border }
          return <span style={{ fontSize: 11.5, fontWeight: 700, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 99, padding: '5px 11px', whiteSpace: 'nowrap' as const }}>{txt}</span>
        }
        const fieldLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }
        const box: React.CSSProperties = { ...card, padding: '20px 22px' }

        const newDur = durMin(newShiftStart, newShiftEnd)
        return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

          {/* 1) الشفتات */}
          <div style={box}>
            {step(1, 'الشفتات', 'أوقات الدوام عندك. النظام يحسب التأخير من بداية الشفت، والانصراف والأوفر تايم من نهايته.',
              shifts.length ? pill(`${shifts.length} ${shifts.length === 1 ? 'شفت' : 'شفتات'}`, 'ok') : pill('ما فيه شفتات', 'warn'))}

            {shifts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, marginBottom: 14 }}>
                {shifts.map((sh: any) => {
                  const n = staffOn(sh.id)
                  return (
                    <div key={sh.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 14, padding: '14px 14px 12px', background: colors.surface, position: 'relative' as const }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>{sh.name}</div>
                        <button onClick={() => deleteShift(sh.id)} aria-label={`حذف ${sh.name}`} title="حذف الشفت"
                          style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                      {sh.is_24h ? (
                        <div style={{ fontSize: 13, color: colors.text2, marginTop: 6, fontWeight: 600 }}>دوام 24 ساعة</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13.5, color: colors.text2, marginTop: 6, fontWeight: 600 }}>من {t12(sh.start_time)} إلى {t12(sh.end_time)}</div>
                          <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 3 }}>
                            {durLabel(durMin(sh.start_time, sh.end_time))}{crossesMidnight(sh.start_time, sh.end_time) ? ' · ينتهي اليوم الثاني' : ''}
                          </div>
                        </>
                      )}
                      <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: n ? colors.primary : colors.text4 }}>{n ? `${n} موظف على هالشفت` : 'ما عليه موظفين'}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* إضافة شفت */}
            <div style={{ border: `1.5px dashed ${colors.border2}`, borderRadius: 14, padding: 14, background: colors.bg }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginBottom: 10 }}>شفت جديد</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, alignItems: 'end' }}>
                <div style={{ gridColumn: 'span 2' as const, minWidth: 0 }}>
                  <label style={fieldLabel}>اسم الشفت</label>
                  <input value={newShiftName} onChange={e => setNewShiftName(e.target.value)} placeholder="مثلاً: الشفت الصباحي" style={inp()} />
                </div>
                {!newShift24h && (
                  <>
                    <div>
                      <label style={fieldLabel}>يبدأ الساعة</label>
                      <input type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} style={inp()} />
                    </div>
                    <div>
                      <label style={fieldLabel}>ينتهي الساعة</label>
                      <input type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} style={inp()} />
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' as const }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.text2, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={newShift24h} onChange={e => setNewShift24h(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.primary }} />
                  دوام 24 ساعة (بدون تأخير ولا أوفر تايم)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!newShift24h && newShiftStart && newShiftEnd && newDur > 0 && (
                    <span style={{ fontSize: 12, color: colors.text3 }}>من {t12(newShiftStart)} إلى {t12(newShiftEnd)} · {durLabel(newDur)}{crossesMidnight(newShiftStart, newShiftEnd) ? ' · ينتهي اليوم الثاني' : ''}</span>
                  )}
                  <button onClick={addShift} disabled={savingShift} style={{ ...btnPrimary, padding: '10px 18px' }}>{savingShift ? 'جاري الإضافة...' : 'إضافة الشفت'}</button>
                </div>
              </div>
            </div>
          </div>

          {/* 2) شفت كل موظف */}
          <div style={box}>
            {step(2, 'شفت كل موظف وإجازته', 'اختر لكل موظف شفته وأيام إجازته بالأسبوع. يوم إجازته ما ينحسب غياب، ولو داوم فيه ينحسب يوم إضافي. تغيير الشفت وهو داخل دوامه يتطبّق من دوامه الجاي.',
              staffList.length === 0 ? null : withoutShift ? pill(`${withoutShift} بدون شفت`, 'warn') : pill('كل الموظفين مربوطين', 'ok'))}
            {staffList.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.text4, textAlign: 'center' as const, padding: 16 }}>ما فيه موظفين نشطين بهذا الفرع</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {shifts.length === 0 && <div style={{ fontSize: 12.5, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px' }}>أضف شفت في الخطوة 1 أول، بعدها تقدر تربط الموظفين.</div>}
                {staffList.map((x: any) => (
                  <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${x.shift_id ? colors.border : '#fde68a'}`, background: x.shift_id ? colors.surface : '#fffdf5', borderRadius: 12, flexWrap: 'wrap' as const }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.primaryLight, color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{(x.name || '?').trim()[0]}</span>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.text }}>{x.name}</div>
                      {!x.shift_id && <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 2 }}>بدون شفت — ما ينحسب له تأخير ولا أوفر تايم، والانصراف مفتوح له أي وقت</div>}
                    </div>
                    <select value={x.shift_id || ''} onChange={e => assignShift(x.id, e.target.value)} disabled={shifts.length === 0} style={{ ...inp(), width: 250, maxWidth: '100%' }}>
                      <option value="">بدون شفت</option>
                      {shifts.map((sh: any) => (<option key={sh.id} value={sh.id}>{sh.name}{sh.is_24h ? ' (24 ساعة)' : ` (${t12(sh.start_time)} – ${t12(sh.end_time)})`}</option>))}
                    </select>
                    <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, paddingTop: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.text3, marginInlineEnd: 4 }}>الإجازة:</span>
                      <select value={x.days_off_mode || 'weekly'} onChange={e => setOffMode(x.id, { days_off_mode: e.target.value as any })}
                        style={{ ...inp(), width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                        <option value="weekly">أيام ثابتة بالأسبوع</option>
                        <option value="monthly">عدد أيام بالشهر</option>
                      </select>
                      {(x.days_off_mode || 'weekly') === 'weekly' ? (
                        <>
                          {WEEKDAYS_AR.map((dn, di) => {
                            const on = (x.weekly_off_days || []).includes(di)
                            return (
                              <button key={di} onClick={() => toggleOffDay(x.id, di)} aria-pressed={on}
                                style={{ padding: '5px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, border: `1.5px solid ${on ? '#3b82f6' : colors.border}`, background: on ? '#eff6ff' : colors.surface, color: on ? '#1d4ed8' : colors.text3 }}>
                                {dn}
                              </button>
                            )
                          })}
                          <span style={{ fontSize: 11.5, color: colors.text4, marginInlineStart: 4 }}>
                            {(x.weekly_off_days || []).length ? `${weeklyOffCount(saudiToday().slice(0, 7), x.weekly_off_days)} أيام إجازة هالشهر` : 'بدون إجازة أسبوعية'}
                          </span>
                        </>
                      ) : (
                        <>
                          <input type="number" min={0} max={15} value={x.monthly_off_days ?? 0}
                            onChange={e => setStaffList(prev => prev.map((y: any) => y.id === x.id ? { ...y, monthly_off_days: e.target.value } : y))}
                            onBlur={e => setOffMode(x.id, { monthly_off_days: Math.max(0, Math.min(15, Math.round(Number(e.target.value) || 0))) })}
                            style={{ ...inp(), width: 70, padding: '5px 10px', fontSize: 12 }} />
                          <span style={{ fontSize: 11.5, color: colors.text3 }}>أيام بالشهر — أي يوم ما يداوم فيه ينحسب إجازة لين يخلص رصيده، وبعدها غياب</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3) التأخير والخصم */}
          {late && (() => {
            const g = Number(late.grace || 0), rate = Number(late.perHour || 0)
            const exLate = Math.max(g + 4, 14)
            const exAmount = Math.round(rate * exLate / 60 * 100) / 100
            return (
              <div style={box}>
                {step(3, 'التأخير والخصم', 'التأخير ضمن وقت السماح ما يتسجّل. لو تعدّاه ينحسب التأخير كامل من بداية الشفت، وينخصم من الراتب بالنسبة والتناسب. وتقدر تلغي خصم أي يوم من تبويب التقرير.',
                  rate > 0 ? pill(`${rate} ر.س للساعة`, 'ok') : pill('بدون خصم', 'muted'))}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>وقت السماح</label>
                    <div style={{ position: 'relative' as const }}>
                      <input type="number" min={0} max={120} inputMode="numeric" value={late.grace} onChange={e => setLate({ ...late, grace: e.target.value })} placeholder="0" style={{ ...inp(), paddingInlineEnd: 60 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>دقيقة</span>
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>الخصم لكل ساعة تأخير</label>
                    <div style={{ position: 'relative' as const }}>
                      <input type="number" min={0} step="0.5" inputMode="decimal" value={late.perHour} onChange={e => setLate({ ...late, perHour: e.target.value })} placeholder="فاضي = بدون خصم" style={{ ...inp(), paddingInlineEnd: 50 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>ر.س</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: colors.text2, background: colors.bg, borderRadius: 10, padding: '11px 14px', marginTop: 12, lineHeight: 1.8 }}>
                  {g > 0 ? <>تأخير لين <b>{g} دقيقة</b> ما يتسجّل. </> : <>أي تأخير يتسجّل من أول دقيقة. </>}
                  {rate > 0
                    ? <>مثال: تأخر <b>{exLate} دقيقة</b> ← خصم <b style={{ color: colors.danger }}>{exAmount} ر.س</b> ({rate} × {exLate} ÷ 60).</>
                    : <>بدون مبلغ للساعة: التأخير يتسجّل بدون خصم.</>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button onClick={saveLate} disabled={savingLate} style={{ ...btnPrimary, padding: '10px 22px' }}>{savingLate ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
              </div>
            )
          })()}

          {/* 4) الأوفر تايم */}
          {ot && (
          <div style={box}>
            {step(4, 'الأوفر تايم', 'ينحسب من وقت انصراف الموظف بعد نهاية شفته، ويطلع له بكشف الراتب ولك بتقرير الموظفين.',
              ot.mode === 'off' ? pill('موقّف', 'muted') : ot.mode === 'fixed' ? pill(ot.fixedRate ? `${ot.fixedRate} ر.س للساعة` : 'مبلغ ثابت', 'ok') : pill(`تلقائي × ${ot.multiplier}`, 'ok'))}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 14 }}>
              {([
                ['auto', 'تلقائي من الراتب', 'أجر الساعة = الراتب الأساسي ÷ 30 ÷ ساعات الشفت × المضاعف'],
                ['fixed', 'مبلغ ثابت للساعة', 'نفس المبلغ لكل ساعة إضافية لكل الموظفين'],
                ['off', 'بدون أوفر تايم', 'ما ينحسب أي وقت إضافي'],
              ] as const).map(([v, title, sub]) => (
                <label key={v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${ot.mode === v ? colors.primary : colors.border}`, background: ot.mode === v ? colors.primaryLight : colors.surface }}>
                  <input type="radio" name="ot-mode" checked={ot.mode === v} onChange={() => setOt({ ...ot, mode: v })} style={{ marginTop: 3, accentColor: colors.primary }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: colors.text }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: colors.text3, marginTop: 3, lineHeight: 1.6 }}>{sub}</span>
                  </span>
                </label>
              ))}
            </div>

            {ot.mode !== 'off' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
                {ot.mode === 'auto' ? (
                  <div>
                    <label style={fieldLabel}>المضاعف</label>
                    <select value={ot.multiplier} onChange={e => setOt({ ...ot, multiplier: e.target.value })} style={inp()}>
                      {['1', '1.25', '1.5', '1.75', '2'].map(m => <option key={m} value={m}>× {m}{m === '1.5' ? ' (نظام العمل)' : ''}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={fieldLabel}>مبلغ الساعة</label>
                    <div style={{ position: 'relative' as const }}>
                      <input type="number" min="0" step="0.5" value={ot.fixedRate} onChange={e => setOt({ ...ot, fixedRate: e.target.value })} placeholder="مثلاً 25" style={{ ...inp(), paddingInlineEnd: 50 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>ر.س</span>
                    </div>
                  </div>
                )}
                <div>
                  <label style={fieldLabel}>أقل مدة تنحسب باليوم</label>
                  <div style={{ position: 'relative' as const }}>
                    <input type="number" min="0" max="240" value={ot.minMinutes} onChange={e => setOt({ ...ot, minMinutes: e.target.value })} style={{ ...inp(), paddingInlineEnd: 60 }} />
                    <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>دقيقة</span>
                  </div>
                </div>
              </div>
            )}

            {ot.mode === 'auto' && (
              <div style={{ fontSize: 12.5, color: colors.text2, background: colors.bg, borderRadius: 10, padding: '11px 14px', marginBottom: 12, lineHeight: 1.8 }}>
                مثال: راتب أساسي 3,000 وشفت 8 ساعات ← أجر الساعة {Math.round(3000 / 30 / 8 * 100) / 100} ر.س ← الساعة الإضافية <b>{Math.round(3000 / 30 / 8 * (Number(ot.multiplier) || 1.5) * 100) / 100} ر.س</b>
              </div>
            )}
            {ot.mode !== 'off' && (
              <div style={{ fontSize: 12, color: colors.text3, marginBottom: 12 }}>لو الموظف انصرف بعد نهاية شفته بأقل من {ot.minMinutes || 0} دقيقة، ما ينحسب له أوفر تايم ذاك اليوم.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={saveOvertime} disabled={savingOt} style={{ ...btnPrimary, padding: '10px 22px' }}>{savingOt ? 'جاري الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
          )}

        </div>
        )
      })()}
    </div>
  )
}
