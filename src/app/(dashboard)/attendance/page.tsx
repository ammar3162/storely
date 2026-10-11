'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, LockKeyhole, Plus, Settings, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { exportReportPdf } from '@/lib/pdfExport'
import {
  StorelyButton,
  StorelyCard,
  StorelyDataTable,
  StorelyEmptyState,
  StorelyFormField,
  StorelyMetricStrip,
  StorelyPageHeader,
  StorelyStatusBadge,
  StorelyTableAction,
  StorelyTableActionGroup,
  type StorelyDataTableColumn,
  type StorelyMetric,
} from '@/components/ui'

const inputClass =
  'h-8 w-full rounded-[5px] border border-[#D7CDC2] bg-white px-2.5 text-sm text-[#203640] outline-none transition focus:border-[#203640] focus:ring-2 focus:ring-[#203640]/15'

function formatNumber(value: number) {
  return value.toLocaleString('ar-SA', { numberingSystem: 'latn' })
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('ar-SA', {
    numberingSystem: 'latn',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function attendanceTone(status: string, lateMinutes?: number | null) {
  if (status === 'لم يحضر' || status === 'غائب') return 'danger'
  if (lateMinutes && lateMinutes > 0) return 'warning'
  if (status === 'حاضر') return 'success'
  return 'info'
}

export default function AttendancePage() {
  const [tab, setTab] = useState<'report'|'settings'>('report')
  const [orgId, setOrgId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [locked, setLocked] = useState(false)
  const [branchId, setBranchId] = useState<string|null>(null)
  const [periodMode, setPeriodMode] = useState<'day'|'range'>('day')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rangeFrom, setRangeFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10) })
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<any[]>([])
  const [rangeRows, setRangeRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [monthStats, setMonthStats] = useState<{totalPenalty:number; attendanceRate:number|null; mostLate:{name:string;minutes:number}|null}|null>(null)

  const [shifts, setShifts] = useState<any[]>([])
  const [newShiftName, setNewShiftName] = useState('')
  const [newShiftStart, setNewShiftStart] = useState('08:00')
  const [newShiftEnd, setNewShiftEnd] = useState('16:00')
  const [newShift24h, setNewShift24h] = useState(false)
  const [savingShift, setSavingShift] = useState(false)

  const [staffList, setStaffList] = useState<any[]>([])

  const [rules, setRules] = useState<any[]>([])
  const [newRuleMin, setNewRuleMin] = useState('')
  const [newRuleMax, setNewRuleMax] = useState('')
  const [newRuleAmount, setNewRuleAmount] = useState('')
  const [savingRule, setSavingRule] = useState(false)

  async function init() {
    const me = await api.get('/api/me')
    if (!me.success || !me.org_id) return
    const oid: string = me.org_id
    sessionStorage.setItem('s_org_id', oid)
    const orgName = me.org?.name || '', orgPlan = me.org?.plan || ''
    setOrgId(oid)
    setOrgName(orgName)
    if (orgPlan === 'basic') {
      const addonRes = await api.get('/api/addons-market', { org_id: oid })
      const hrAddon = (addonRes?.addons||[]).find((a:any)=>a.slug==='hr_full')
      if (!hrAddon?.subscription?.isValid) setLocked(true)
    }
    const bid = sessionStorage.getItem('s_branch_id')
    setBranchId(bid)
    load(oid, date)
    loadShifts(oid, bid)
    loadStaff(oid, bid)
    loadRules(oid)
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
      const totalPossible = j.rows.length * j.totalDays
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
      const j = await api.get('/api/attendance-report', { org_id: oid, from, to, branch_id: bid })
      if (j.success) setRangeRows(j.rows || [])
      else toast(j.message || j.error || 'تعذر تحميل السجل', 'error')
    } catch { toast('خطأ بالاتصال', 'error') }
    setLoading(false)
  }

  async function exportRangePdf() {
    setExporting(true)
    try {
      await exportReportPdf({
        title: 'تقرير الحضور والانصراف',
        subtitle: `من ${rangeFrom} إلى ${rangeTo}`,
        orgName,
        columns: [
          { header: 'الموظف', key: 'name' },
          { header: 'أيام الحضور', key: 'days_present', align: 'center' },
          { header: 'أيام الغياب', key: 'days_absent', align: 'center' },
          { header: 'إجمالي دقائق التأخير', key: 'total_late_minutes', align: 'center' },
          { header: 'إجمالي الخصومات (ر.س)', key: 'total_penalty', align: 'center' },
        ],
        rows: rangeRows,
        totalsRow: {
          name: 'الإجمالي',
          days_present: rangeRows.reduce((s,r)=>s+r.days_present,0),
          days_absent: rangeRows.reduce((s,r)=>s+r.days_absent,0),
          total_late_minutes: rangeRows.reduce((s,r)=>s+r.total_late_minutes,0),
          total_penalty: Math.round(rangeRows.reduce((s,r)=>s+r.total_penalty,0)*100)/100,
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
      const j = await api.get('/api/attendance-report', { org_id: oid, date: d, branch_id: bid })
      if (j.success) setRows(j.rows || [])
      else toast(j.message || j.error || 'تعذر تحميل السجل', 'error')
    } catch { toast('خطأ بالاتصال', 'error') }
    setLoading(false)
  }

  async function loadShifts(oid: string, bid: string|null) {
    const j = await api.get('/api/shifts', { org_id: oid, branch_id: bid })
    if (j.success) setShifts(j.shifts || [])
  }

  async function loadStaff(oid: string, bid: string|null) {
    const j = await api.get('/api/staff-shifts', { org_id: oid, branch_id: bid })
    if (j.success) setStaffList(j.staff || [])
  }

  async function loadRules(oid: string) {
    const j = await api.get('/api/late-penalty-rules', { org_id: oid })
    if (j.success) setRules(j.rules || [])
  }

  async function addShift() {
    if (!newShiftName.trim() || !branchId) { toast('أدخل اسم الشفت — وتأكد إنك حددت فرع نشط', 'warning'); return }
    setSavingShift(true)
    const j = await api.post('/api/shifts', { org_id: orgId, branch_id: branchId, name: newShiftName.trim(), start_time: newShiftStart, end_time: newShiftEnd, is_24h: newShift24h })
    setSavingShift(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    setNewShiftName(''); setNewShift24h(false)
    toast('تم إضافة الشفت')
    loadShifts(orgId, branchId)
  }

  async function deleteShift(id: string) {
    if (!(await confirmDialog({ title: 'حذف الشفت', message: 'حذف هذا الشفت؟ الموظفين المرتبطين فيه راح ينفكون منه تلقائياً' }))) return
    const j = await api.del('/api/shifts', { id })
    if (!j.success) { toast(j.error || 'فشل الحذف', 'error'); return }
    toast('تم الحذف')
    loadShifts(orgId, branchId)
    loadStaff(orgId, branchId)
  }

  async function assignShift(staffId: string, shiftId: string) {
    const j = await api.patch('/api/staff-shifts', { org_id: orgId, staff_id: staffId, shift_id: shiftId || null })
    if (!j.success) { toast(j.error || 'فشل الربط', 'error'); return }
    toast('تم تحديد شفت الموظف')
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, shift_id: shiftId || null } : s))
  }

  async function addRule() {
    if (!newRuleMin || !newRuleAmount) { toast('أدخل الحد الأدنى للدقائق والمبلغ', 'warning'); return }
    setSavingRule(true)
    const j = await api.post('/api/late-penalty-rules', { org_id: orgId, min_minutes: newRuleMin, max_minutes: newRuleMax || null, penalty_amount: newRuleAmount })
    setSavingRule(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    setNewRuleMin(''); setNewRuleMax(''); setNewRuleAmount('')
    toast('تم إضافة نطاق الغرامة')
    loadRules(orgId)
  }

  async function deleteRule(id: string) {
    if (!(await confirmDialog({ title: 'حذف النطاق', message: 'حذف نطاق الغرامة هذا؟' }))) return
    const j = await api.del('/api/late-penalty-rules', { id })
    if (!j.success) { toast(j.error || 'فشل الحذف', 'error'); return }
    toast('تم الحذف')
    loadRules(orgId)
  }

  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId && periodMode === 'day') load(orgId, date) }, [date, periodMode])
  useEffect(() => { if (orgId && periodMode === 'range') loadRange(orgId, rangeFrom, rangeTo) }, [rangeFrom, rangeTo, periodMode])

  const presentCount = rows.filter(r => r.status !== 'لم يحضر').length
  const absentCount = rows.filter(r => r.status === 'لم يحضر').length

  const dailyMetrics: StorelyMetric[] = [
    { label: 'حضروا اليوم', value: formatNumber(presentCount), tone: 'success' },
    { label: 'لم يحضروا', value: formatNumber(absentCount), tone: absentCount > 0 ? 'danger' : 'neutral' },
  ]

  const monthMetrics: StorelyMetric[] = monthStats ? [
    {
      label: 'معدل الحضور هذا الشهر',
      value: monthStats.attendanceRate !== null ? `${formatNumber(monthStats.attendanceRate)}%` : '—',
      tone: 'neutral',
    },
    {
      label: 'إجمالي الخصومات هذا الشهر',
      value: monthStats.totalPenalty > 0 ? `${formatNumber(monthStats.totalPenalty)} ر.س` : '—',
      tone: monthStats.totalPenalty > 0 ? 'danger' : 'neutral',
    },
    {
      label: 'الأكثر تأخيراً هذا الشهر',
      value: monthStats.mostLate ? monthStats.mostLate.name : '—',
      helper: monthStats.mostLate ? `${formatNumber(monthStats.mostLate.minutes)} دقيقة` : undefined,
      tone: monthStats.mostLate ? 'warning' : 'neutral',
    },
  ] : []

  const dailyColumns = useMemo<StorelyDataTableColumn<any>[]>(() => [
    {
      key: 'employee',
      header: 'الموظف',
      className: 'min-w-[180px] font-semibold',
      cell: (row) => row.name,
    },
    {
      key: 'status',
      header: 'الحالة',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <StorelyStatusBadge status={attendanceTone(row.status, row.late_minutes)}>{row.status}</StorelyStatusBadge>
          {row.is_excused ? <StorelyStatusBadge status="warning">مستأذن</StorelyStatusBadge> : null}
        </div>
      ),
    },
    {
      key: 'checkIn',
      header: 'وقت الحضور',
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (row) => formatTime(row.check_in),
    },
    {
      key: 'checkOut',
      header: 'وقت الانصراف',
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (row) => formatTime(row.check_out),
    },
    {
      key: 'hours',
      header: 'إجمالي الساعات',
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (row) => row.hours_worked !== null ? `${formatNumber(row.hours_worked)} ساعة` : '—',
    },
    {
      key: 'late',
      header: 'التأخير',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <span className={row.late_minutes ? 'font-semibold text-[#B45309]' : 'text-[#8EA0B1]'}>
          {row.late_minutes ? `${formatNumber(row.late_minutes)} دقيقة` : '—'}
        </span>
      ),
    },
    {
      key: 'penalty',
      header: 'الخصم',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <span className={row.penalty_amount ? 'font-semibold text-[#B91C1C]' : 'text-[#8EA0B1]'}>
          {row.penalty_amount ? `${formatNumber(row.penalty_amount)} ر.س` : '—'}
        </span>
      ),
    },
  ], [])

  const rangeColumns = useMemo<StorelyDataTableColumn<any>[]>(() => [
    {
      key: 'employee',
      header: 'الموظف',
      className: 'min-w-[180px] font-semibold',
      cell: (row) => row.name,
    },
    {
      key: 'present',
      header: 'أيام الحضور',
      className: 'whitespace-nowrap text-center font-semibold text-[#047857]',
      headerClassName: 'text-center',
      cell: (row) => formatNumber(row.days_present),
    },
    {
      key: 'absent',
      header: 'أيام الغياب',
      className: 'whitespace-nowrap text-center font-semibold text-[#B91C1C]',
      headerClassName: 'text-center',
      cell: (row) => formatNumber(row.days_absent),
    },
    {
      key: 'late',
      header: 'إجمالي التأخير',
      className: 'whitespace-nowrap text-center',
      headerClassName: 'text-center',
      cell: (row) => (
        <span className={row.total_late_minutes ? 'font-semibold text-[#B45309]' : 'text-[#8EA0B1]'}>
          {row.total_late_minutes ? `${formatNumber(row.total_late_minutes)} دقيقة` : '—'}
        </span>
      ),
    },
    {
      key: 'penalty',
      header: 'إجمالي الخصومات',
      className: 'whitespace-nowrap text-center',
      headerClassName: 'text-center',
      cell: (row) => (
        <span className={row.total_penalty ? 'font-semibold text-[#B91C1C]' : 'text-[#8EA0B1]'}>
          {row.total_penalty ? `${formatNumber(row.total_penalty)} ر.س` : '—'}
        </span>
      ),
    },
  ], [])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8" dir="rtl">
      <StorelyPageHeader
        title="الحضور والانصراف"
        description="سجل حضور الفريق اليومي وتقارير الفترات وإعدادات الشفتات والغرامات."
      />

      {locked ? (
        <div className="mb-4 flex items-start gap-3 rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB] p-3">
          <LockKeyhole className="mt-0.5 shrink-0 text-[#B45309]" size={16} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#203640]">وضع قراءة فقط</div>
            <div className="mt-1 text-xs leading-5 text-[#66737C]">
              انتهى اشتراك ميزة إدارة الموظفين الكاملة. السجلات القديمة محفوظة ويمكن عرضها.
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 rounded-[6px] border border-[#E7E1D8] bg-white p-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[5px] border border-[#D7CDC2] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setTab('report')}
              className={`h-7 rounded-[4px] px-3 text-xs font-semibold transition ${tab === 'report' ? 'bg-[#203640] text-white' : 'text-[#66737C] hover:bg-[#F8EEDF]'}`}
            >
              التقرير
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`h-7 rounded-[4px] px-3 text-xs font-semibold transition ${tab === 'settings' ? 'bg-[#203640] text-white' : 'text-[#66737C] hover:bg-[#F8EEDF]'}`}
            >
              الشفتات والغرامات
            </button>
          </div>

          {tab === 'report' ? (
            <div className="inline-flex rounded-[5px] border border-[#D7CDC2] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPeriodMode('day')}
                className={`h-7 rounded-[4px] px-3 text-xs font-semibold transition ${periodMode === 'day' ? 'bg-[#F8EEDF] text-[#203640]' : 'text-[#66737C] hover:bg-[#F8EEDF]/60'}`}
              >
                يوم واحد
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('range')}
                className={`h-7 rounded-[4px] px-3 text-xs font-semibold transition ${periodMode === 'range' ? 'bg-[#F8EEDF] text-[#203640]' : 'text-[#66737C] hover:bg-[#F8EEDF]/60'}`}
              >
                فترة مخصصة
              </button>
            </div>
          ) : null}
        </div>

        {tab === 'report' ? (
          periodMode === 'day' ? (
            <StorelyFormField label="التاريخ" controlClassName="min-w-44">
              <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </StorelyFormField>
          ) : (
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <StorelyFormField label="من" controlClassName="min-w-40">
                <input className={inputClass} type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} />
              </StorelyFormField>
              <StorelyFormField label="إلى" controlClassName="min-w-40">
                <input className={inputClass} type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} />
              </StorelyFormField>
              <StorelyButton
                variant="secondary"
                icon={<Download size={16} />}
                disabled={exporting || rangeRows.length === 0}
                onClick={exportRangePdf}
              >
                {exporting ? 'جاري التصدير' : 'تصدير PDF'}
              </StorelyButton>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#66737C]">
            <Settings size={15} />
            إعدادات الحضور
          </div>
        )}
      </div>

      {tab === 'report' ? (
        <>
          {monthMetrics.length ? <StorelyMetricStrip metrics={monthMetrics} className="mb-4" /> : null}
          {periodMode === 'day' ? <StorelyMetricStrip metrics={dailyMetrics} className="mb-4" /> : null}

          {loading ? (
            <StorelyCard className="mb-4">
              <div className="space-y-2 p-3">
                <div className="h-8 rounded-[5px] bg-[#F3F5F6]" />
                <div className="h-8 rounded-[5px] bg-[#F3F5F6]" />
                <div className="h-8 rounded-[5px] bg-[#F3F5F6]" />
              </div>
            </StorelyCard>
          ) : periodMode === 'day' ? (
            rows.length === 0 ? (
              <StorelyEmptyState
                icon={<CalendarDays size={16} />}
                title="لا يوجد موظفون نشطون بهذا الفرع"
                description="غيّر الفرع من أعلى النظام أو أضف موظفين نشطين لظهور سجل الحضور."
              />
            ) : (
              <StorelyDataTable
                columns={dailyColumns}
                data={rows}
                rowKey="staff_id"
                searchable={false}
                pageSize={rows.length || 12}
                emptyState={<StorelyEmptyState title="لا توجد بيانات" description="لا توجد سجلات حضور لهذا اليوم." />}
              />
            )
          ) : rangeRows.length === 0 ? (
            <StorelyEmptyState
              icon={<CalendarDays size={16} />}
              title="لا توجد بيانات لهذه الفترة"
              description="اختر فترة أخرى لعرض تقرير الحضور والانصراف."
            />
          ) : (
            <StorelyDataTable
              columns={rangeColumns}
              data={rangeRows}
              rowKey="staff_id"
              searchable={false}
              pageSize={rangeRows.length || 12}
              emptyState={<StorelyEmptyState title="لا توجد بيانات" description="لا توجد سجلات ضمن الفترة المحددة." />}
            />
          )}
        </>
      ) : (
        <div className="space-y-4">
          <StorelyCard
            title="الشفتات"
            description="حدد أوقات الشفتات المستخدمة لحساب التأخير."
          >
            <div className="space-y-3 p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_120px_120px_120px_auto] lg:items-end">
                <StorelyFormField label="اسم الشفت">
                  <input
                    className={inputClass}
                    value={newShiftName}
                    onChange={(event) => setNewShiftName(event.target.value)}
                    placeholder="مثلاً: الشفت الأول"
                  />
                </StorelyFormField>
                {!newShift24h ? (
                  <>
                    <StorelyFormField label="وقت البداية">
                      <input className={inputClass} type="time" value={newShiftStart} onChange={(event) => setNewShiftStart(event.target.value)} />
                    </StorelyFormField>
                    <StorelyFormField label="وقت النهاية">
                      <input className={inputClass} type="time" value={newShiftEnd} onChange={(event) => setNewShiftEnd(event.target.value)} />
                    </StorelyFormField>
                  </>
                ) : (
                  <div className="hidden lg:block" />
                )}
                <label className="flex h-8 items-center gap-2 text-sm font-semibold text-[#43525B]">
                  <input className="size-4 accent-[#203640]" type="checkbox" checked={newShift24h} onChange={(event) => setNewShift24h(event.target.checked)} />
                  24 ساعة
                </label>
                <StorelyButton variant="primary" icon={<Plus size={16} />} disabled={savingShift} onClick={addShift}>
                  {savingShift ? 'جاري الإضافة' : 'إضافة'}
                </StorelyButton>
              </div>

              {shifts.length === 0 ? (
                <StorelyEmptyState title="لا توجد شفتات بعد" description="أضف أول شفت لربط الموظفين به." />
              ) : (
                <div className="overflow-hidden rounded-[6px] border border-[#E7E1D8]">
                  {shifts.map((shift: any) => (
                    <div key={shift.id} className="flex flex-col gap-2 border-b border-[#E7E1D8] p-3 last:border-b-0 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#203640]">{shift.name}</div>
                        <div className="mt-1 text-xs text-[#66737C]">
                          {shift.is_24h ? '24 ساعة' : `${shift.start_time?.slice(0,5)} — ${shift.end_time?.slice(0,5)}`}
                        </div>
                      </div>
                      <StorelyTableActionGroup>
                        <StorelyTableAction action="delete" onClick={() => deleteShift(shift.id)} />
                      </StorelyTableActionGroup>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </StorelyCard>

          <StorelyCard
            title="تحديد شفت كل موظف"
            description="اربط كل موظف بالشفت المناسب لحساب التأخير بشكل صحيح."
          >
            <div className="p-3">
              {staffList.length === 0 ? (
                <StorelyEmptyState title="لا يوجد موظفون نشطون" description="سيظهر الموظفون النشطون هنا عند توفرهم." />
              ) : (
                <div className="overflow-hidden rounded-[6px] border border-[#E7E1D8]">
                  {staffList.map((staff: any) => (
                    <div key={staff.id} className="flex flex-col gap-2 border-b border-[#E7E1D8] p-3 last:border-b-0 md:flex-row md:items-center md:justify-between">
                      <div className="truncate text-sm font-semibold text-[#203640]">{staff.name}</div>
                      <select
                        className={`${inputClass} md:max-w-64`}
                        value={staff.shift_id || ''}
                        onChange={(event) => assignShift(staff.id, event.target.value)}
                      >
                        <option value="">بدون شفت محدد</option>
                        {shifts.map((shift: any) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </StorelyCard>

          <StorelyCard
            title="غرامات التأخير"
            description="حدد مبلغ الخصم حسب مدة التأخير بالدقائق."
          >
            <div className="space-y-3 p-3">
              <div className="grid gap-3 md:grid-cols-[140px_180px_150px_auto] md:items-end">
                <StorelyFormField label="من دقيقة">
                  <input className={inputClass} type="number" value={newRuleMin} onChange={(event) => setNewRuleMin(event.target.value)} placeholder="0" />
                </StorelyFormField>
                <StorelyFormField label="إلى دقيقة">
                  <input className={inputClass} type="number" value={newRuleMax} onChange={(event) => setNewRuleMax(event.target.value)} placeholder="اختياري" />
                </StorelyFormField>
                <StorelyFormField label="المبلغ">
                  <input className={inputClass} type="number" value={newRuleAmount} onChange={(event) => setNewRuleAmount(event.target.value)} placeholder="ر.س" />
                </StorelyFormField>
                <StorelyButton variant="primary" icon={<Plus size={16} />} disabled={savingRule} onClick={addRule}>
                  {savingRule ? 'جاري الإضافة' : 'إضافة'}
                </StorelyButton>
              </div>

              {rules.length === 0 ? (
                <StorelyEmptyState
                  title="لا توجد نطاقات غرامة"
                  description="سيتم تسجيل التأخير بدون غرامة حتى تضيف نطاقاً."
                />
              ) : (
                <div className="overflow-hidden rounded-[6px] border border-[#E7E1D8]">
                  {rules.map((rule: any) => (
                    <div key={rule.id} className="flex flex-col gap-2 border-b border-[#E7E1D8] p-3 last:border-b-0 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-[#203640]">
                        من <span className="font-semibold">{formatNumber(rule.min_minutes)}</span> دقيقة{' '}
                        {rule.max_minutes ? <>إلى <span className="font-semibold">{formatNumber(rule.max_minutes)}</span> دقيقة</> : 'فأكثر'}
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#B91C1C]">
                          <Trash2 size={14} className="text-[#8EA0B1]" />
                          {formatNumber(rule.penalty_amount)} ر.س
                        </span>
                        <StorelyTableAction action="delete" onClick={() => deleteRule(rule.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </StorelyCard>
        </div>
      )}
    </div>
  )
}
