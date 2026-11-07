'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors, font } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { type OffPatch } from '@/components/StaffDaysOffEditor'
import { type SchedulePatch } from '@/components/StaffDayShiftsEditor'
import { saudiToday, fmtTime, fmtMinutes } from './format'
import { planIncludes } from '@/lib/planFeatures'

/** حالة صفحة الحضور ودوالها — منقولة كما هي من page.tsx */
export function useAttendance() {
  const [tab, setTab] = useState<'report'|'settings'>('report')
  const [orgId, setOrgId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [waiving, setWaiving] = useState<string|null>(null)
  // انصراف يسجّله المالك عن الموظف (طلع بدون ما يسجّل)
  const [checkoutFor, setCheckoutFor] = useState<{ attendance_id: string; name: string; check_in: string } | null>(null)
  const [coTime, setCoTime] = useState('')
  const [coExcused, setCoExcused] = useState(false)
  const [savingCo, setSavingCo] = useState(false)
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

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(orgId, ['staff_attendance','attendance_permission_requests','shifts','staff_members'], ()=>{ if(!orgId) return; if(periodMode==='day') load(orgId, date); else loadRange(orgId, rangeFrom, rangeTo) })
  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId && periodMode === 'day') load(orgId, date) }, [date, periodMode, staffFilter])
  useEffect(() => { if (orgId && periodMode === 'range') loadRange(orgId, rangeFrom, rangeTo) }, [rangeFrom, rangeTo, periodMode, staffFilter])

  async function init() {
    // نفس طلب /api/me اللي يسويه إطار لوحة التحكم (getMe يشاركه) — كانت الصفحة تطلبه مرة ثانية
    const me = await getMe()
    if (!me || !me.org_id) return
    const oid: string = me.org_id
    sessionStorage.setItem('s_org_id', oid)
    const orgName = me.org?.name || '', orgPlan = me.org?.plan || ''
    setOrgId(oid)
    setOrgName(orgName)
    setIsOwner(me.role === 'owner')
    // نفس قرار الخادم (/api/me features): الباقة، أو إضافة «إدارة الموظفين»، أو التجربة المجانية
    if (!planIncludes(orgPlan, 'hr') && !me.org?.features?.hr) setLocked(true)  // ما نوقف التحميل -- نخلي المالك يشوف سجلاته القديمة، السيرفر أصلاً يرفض أي تسجيل جديد بدون اشتراك
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
          overtime: d.overtime_minutes ? `${fmtMinutes(d.overtime_minutes)} (${d.overtime_pay} ⃁)` : '—',
        }))
        await (await import('@/lib/pdfExport')).exportReportPdf({
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
            overtime: one.total_overtime_minutes ? `${fmtMinutes(one.total_overtime_minutes)} (${one.total_overtime_pay} ⃁)` : '—',
          },
          fileName: `حضور-${one.name}-${rangeFrom}-${rangeTo}`,
        })
        setExporting(false)
        return
      }
      await (await import('@/lib/pdfExport')).exportReportPdf({
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
          { header: 'إجمالي الخصومات (⃁)', key: 'total_penalty', align: 'center' },
          { header: 'دقائق الأوفر تايم', key: 'total_overtime_minutes', align: 'center' },
          { header: 'مبلغ الأوفر تايم (⃁)', key: 'total_overtime_pay', align: 'center' },
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

  function openManualCheckout(r: any, name: string) {
    const now = new Date(Date.now() + 3 * 3600e3)
    setCoTime(`${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`)
    setCoExcused(false)
    setCheckoutFor({ attendance_id: r.attendance_id, name, check_in: r.check_in })
  }

  async function submitManualCheckout() {
    if (!orgId || !checkoutFor || !coTime) return
    setSavingCo(true)
    const j = await api.post('/api/attendance-manual-checkout', { org_id: orgId, attendance_id: checkoutFor.attendance_id, time: coTime, excused: coExcused })
    setSavingCo(false)
    if (!j.success) { toast(j.error || 'تعذر تسجيل الانصراف', 'error'); return }
    toast(`تم تسجيل انصراف ${checkoutFor.name}`)
    setCheckoutFor(null)
    if (periodMode === 'day') load(orgId, date); else loadRange(orgId, rangeFrom, rangeTo)
  }

  // خانة الانصراف: الوقت + «مستأذن» + «سجّله المالك»، أو زر تسجيل الانصراف للمالك لو الموظف ما انصرف
  function checkOutCell(r: any, name: string) {
    const badge = (txt: string, c: { fg: string; bg: string; bd: string }) =>
      <span style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{txt}</span>
    if (!r.check_out && r.check_in && r.attendance_id && isOwner) {
      return (
        <button onClick={() => openManualCheckout(r, name)} title="الموظف طلع بدون ما يسجّل انصرافه — سجّله عنه"
          style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${colors.border2}`, background: colors.surface, color: colors.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
          تسجيل انصراف
        </button>
      )
    }
    return (
      <>
        {fmtTime(r.check_out)}
        {r.is_excused && badge('مستأذن', { fg: '#b45309', bg: '#fffbeb', bd: '#fde68a' })}
        {r.checkout_by_owner && badge('سجّله المالك', { fg: colors.text3, bg: colors.bg, bd: colors.border2 })}
      </>
    )
  }

  function penaltyCell(r: any) {
    const amount = r.penalty_original ?? r.penalty_amount
    if (!amount) return <span style={{ color: colors.text4 }}>—</span>
    if (r.penalty_legacy) return <span style={{ color: colors.text4, whiteSpace: 'nowrap' as const }} title="غرامة قبل تفعيل الخصم التلقائي — ما تنخصم">{amount} ⃁ · <span style={{ fontSize: 10, fontWeight: 700 }}>ما انخصمت</span></span>
    const canToggle = isOwner && r.attendance_id && !r.penalty_locked
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' as const }}>
        <span style={{ color: r.penalty_waived ? colors.text4 : colors.danger, fontWeight: 700, textDecoration: r.penalty_waived ? 'line-through' : 'none' }}>{amount} ⃁</span>
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

  // إعداد إجازة الموظف — ينحفظ على طول مع كل تغيير، ويرجع لو فشل
  async function patchOff(staffId: string, patch: OffPatch | SchedulePatch) {
    const before = staffList.find((x: any) => x.id === staffId)
    setStaffList(prev => prev.map((x: any) => x.id === staffId ? { ...x, ...patch } : x))
    const j = await api.patch('/api/staff-shifts', { org_id: orgId, staff_id: staffId, ...patch })
    if (!j.success) {
      toast(j.error || 'تعذر الحفظ', 'error')
      setStaffList(prev => prev.map((x: any) => x.id === staffId ? before : x))
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

  // تعديل شفت موجود — نموذج داخل بطاقة الشفت نفسها
  const [editShift, setEditShift] = useState<{ id: string; name: string; start: string; end: string; is24h: boolean } | null>(null)
  const [savingEditShift, setSavingEditShift] = useState(false)

  function startEditShift(sh: any) {
    setEditShift({ id: sh.id, name: sh.name || '', start: String(sh.start_time || '08:00').slice(0, 5), end: String(sh.end_time || '16:00').slice(0, 5), is24h: !!sh.is_24h })
  }

  async function saveEditShift() {
    if (!editShift) return
    if (!editShift.name.trim()) { toast('أدخل اسم الشفت', 'warning'); return }
    setSavingEditShift(true)
    const j = await api.patch('/api/shifts', { id: editShift.id, name: editShift.name.trim(), start_time: editShift.start, end_time: editShift.end, is_24h: editShift.is24h })
    setSavingEditShift(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    setEditShift(null)
    toast('تم تعديل الشفت')
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
  return { editShift, setEditShift, savingEditShift, startEditShift, saveEditShift, tab, setTab, orgId, setOrgId, orgName, setOrgName, isOwner, setIsOwner, waiving, setWaiving, checkoutFor, setCheckoutFor, coTime, setCoTime, coExcused, setCoExcused, savingCo, setSavingCo, locked, setLocked, branchId, setBranchId, periodMode, setPeriodMode, date, setDate, rangeFrom, setRangeFrom, rangeTo, setRangeTo, staffFilter, setStaffFilter, rows, setRows, rangeRows, setRangeRows, loading, setLoading, exporting, setExporting, monthStats, setMonthStats, shifts, setShifts, newShiftName, setNewShiftName, newShiftStart, setNewShiftStart, newShiftEnd, setNewShiftEnd, newShift24h, setNewShift24h, savingShift, setSavingShift, staffList, setStaffList, late, setLate, savingLate, setSavingLate, ot, setOt, savingOt, setSavingOt, presentCount, absentCount, offCount, statusColor, statusBg, init, loadMonthOverview, loadRange, exportRangePdf, load, toggleWaive, openManualCheckout, submitManualCheckout, checkOutCell, penaltyCell, loadShifts, loadStaff, loadOvertime, saveOvertime, patchOff, addShift, deleteShift, assignShift, saveLate }
}

export type AttendancePage = ReturnType<typeof useAttendance>
