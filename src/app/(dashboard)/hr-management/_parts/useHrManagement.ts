'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getAddonsMarket } from '@/lib/addonsCache'
import { getMe, getOrgId } from '@/lib/session'
import { colors } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'

/** حالة صفحة الموارد البشرية ودوالها — منقولة كما هي من page.tsx */
export function useHrManagement() {
  const [orgId, setOrgId] = useState('')
  const [salaryVisible, setSalaryVisible] = useState<boolean|null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [curr, setCurr] = useState('⃁')
  const [orgPlan, setOrgPlan] = useState<string | null>(null)   // null = لسا ما عرفنا الباقة — لا نعرض القفل قبلها
  const [hasHrAddon, setHasHrAddon] = useState(false)
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [savingLocationId, setSavingLocationId] = useState<string|null>(null)

  const [salaryForm, setSalaryForm] = useState<{base:string,housing:string,transport:string,food:string}>({base:'',housing:'',transport:'',food:''})
  const [savingSalary, setSavingSalary] = useState(false)

  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loadingAdjustments, setLoadingAdjustments] = useState(false)
  const [newAdjAmount, setNewAdjAmount] = useState('')
  const [newAdjReason, setNewAdjReason] = useState('')
  const [savingAdj, setSavingAdj] = useState(false)

  const [tasks, setTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPhoto, setNewTaskPhoto] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [loadingLeave, setLoadingLeave] = useState(false)
  const [pendingLeaveCounts, setPendingLeaveCounts] = useState<Record<string, number>>({})
  const [pendingAdvanceCounts, setPendingAdvanceCounts] = useState<Record<string, number>>({})
  // ملخص راتب الشهر الحالي لكل موظف — نفس حساب كشف راتب الموظف بالضبط
  const [cardPayroll, setCardPayroll] = useState<Record<string, any>>({})
  const [extraDays, setExtraDays] = useState<any[]>([])          // أيام إضافية بانتظار قرار المالك
  const [canDecideExtra, setCanDecideExtra] = useState(false)
  const [excuseRequests, setExcuseRequests] = useState<any[]>([])
  const [loadingExcuse, setLoadingExcuse] = useState(false)

  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0,7))
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [showReport, setShowReport] = useState(false)
  // تبويبات لوحة الموظف — تفتح على أول تبويب فيه شي ينتظر قرارك
  const [hrTab, setHrTab] = useState<'salary'|'adj'|'leave'|'excuse'|'tasks'>('salary')

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(orgId, ['staff_payroll_adjustments','staff_leave_requests','staff_tasks','attendance_permission_requests'], ()=>{ if(expandedId){ loadAdjustments(expandedId); loadTasks(expandedId); loadLeave(expandedId); loadExcuse(expandedId) } })
  useEffect(()=>{ init() },[])
  useEffect(()=>{ if (showReport && orgId) loadReport() },[showReport, reportMonth, orgId])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    // عرض كاش الموظفين فوراً لو متوفر
    if (oid) {
      const cachedStaff = cache.get('hr-staff:'+oid)
      const cachedAccess = cache.get('hr-access:'+oid) as { plan: string; addon: boolean } | null
      if (cachedAccess) { setOrgPlan(cachedAccess.plan); setHasHrAddon(cachedAccess.addon) }
      if (cachedStaff) { setStaff((cachedStaff as any[]).filter((s:any) => !s.hidden_from_list)); setLoading(false) }
    }
    if(!oid){
      oid = await getOrgId()
      if(!oid) return
    }
    setOrgId(oid)
    api.get('/api/org-settings', { org_id: oid, scope: 'full' }).then(r => { if (r.success) setSalaryVisible(r.settings?.staff_salary_visible === true) }).catch(()=>{})
    getMe().then(m => setIsOwner(m?.role === 'owner')).catch(()=>{})
    const bid = sessionStorage.getItem('s_branch_id')
    const curMonth = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7)
    const [me, staffRes, leaveRes, advRes, payRes, , addonRes, branchesRes] = await Promise.all([
      getMe(),
      api.get('/api/staff-members', { org_id: oid, branch_id: bid }),
      api.get('/api/staff-leave', { org_id: oid }),
      api.get('/api/staff-payroll-adjustments', { org_id: oid }),
      api.get('/api/staff-report', { org_id: oid, month: curMonth }),
      api.get('/api/extra-days', { org_id: oid, status: 'pending' }).then(r => { if (r.success) { setExtraDays(r.extra_days || []); setCanDecideExtra(!!r.canDecide) } return r }),
      getAddonsMarket(oid),
      api.get('/api/branches', { org_id: oid }),
    ])
    // نفس قاعدة صفحة الموظفين: الموظفين الموقوفين تلقائياً بانتهاء إضافة «موظف إضافي» ما يطلعون
    const data = (staffRes.staff || []).filter((s:any) => !s.hidden_from_list)
    setBranches(branchesRes.branches||[])
    // نفس قرار الخادم (/api/me features): إضافة «إدارة الموظفين» أو التجربة المجانية
    const hrAddon = (addonRes?.addons||[]).find((a:any)=>a.slug==='hr_full')
    const access = { plan: me?.org?.plan || 'basic', addon: !!me?.org?.features?.hr || !!hrAddon?.subscription?.isValid }
    setOrgPlan(access.plan); setHasHrAddon(access.addon)
    cache.set('hr-access:'+oid, access)
    setStaff(data||[])
    cache.set('hr-staff:'+oid, data||[])
    if (leaveRes?.success) {
      const counts: Record<string, number> = {}
      for (const req of (leaveRes.requests||[])) {
        if (req.status === 'pending') counts[req.staff_id] = (counts[req.staff_id]||0) + 1
      }
      setPendingLeaveCounts(counts)
    }
    if (advRes?.success) {
      const counts2: Record<string, number> = {}
      for (const req of (advRes.adjustments||advRes.requests||[])) {
        if (req.status === 'pending') counts2[req.staff_id] = (counts2[req.staff_id]||0) + 1
      }
      setPendingAdvanceCounts(counts2)
    }
    if (payRes?.success) {
      const map: Record<string, any> = {}
      for (const r of (payRes.report||[])) map[r.staffId] = r
      setCardPayroll(map)
    }
    setLoading(false)
  }

  // أي جهاز ينفع (اللابتوب يعطي موقع تقريبي) — الدقة تنحفظ ونطاق الحضور يتوسع بقدرها
  const MAX_ACCEPTABLE_ACCURACY_M = 150

  function getPositionOnce(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:10000, maximumAge:0 })
    })
  }

  // الفرع المختار من القائمة فوق (sessionStorage) — موقعه بس اللي يتحدد من هالجهاز
  const [currentBranchId, setCurrentBranchId] = useState<string|null>(null)
  useEffect(() => { try { setCurrentBranchId(sessionStorage.getItem('s_branch_id')) } catch {} }, [])

  async function saveBranchLocation(id:string) {
    if(!navigator.geolocation){ toast('المتصفح لا يدعم تحديد الموقع','error'); return }
    // الموقع ينحفظ من مكان الجهاز — نتأكد إن المالك فعلاً داخل الفرع
    if (id !== currentBranchId) { toast('اختر هذا الفرع من القائمة أعلاه وأنت موجود فيه','warning'); return }
    const bName = branches.find((b:any)=>b.id===id)?.name || 'الفرع'
    if (!(await confirmDialog({ title:`تحديد موقع ${bName}`, message:`تأكد أنك موجود الآن داخل ${bName} — يُسجَّل الموقع من مكان جهازك، ويسجّل الموظفون حضورهم بناءً عليه.`, confirmText:'أنا داخل الفرع — حدّد', type:'warning' }))) return
    setSavingLocationId(id)

    let bestPos: GeolocationPosition | null = null
    const MAX_ATTEMPTS = 3
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const pos = await getPositionOnce()
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos
        if (pos.coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) break
        if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1500))
      }
    } catch {
      setSavingLocationId(null)
      toast('تعذر الوصول لموقعك — تأكد من السماح للمتصفح بالوصول للموقع','error')
      return
    }

    if (!bestPos) { setSavingLocationId(null); toast('تعذر تحديد موقعك','error'); return }
    if (bestPos.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
      setSavingLocationId(null)
      toast(`إشارة الموقع ضعيفة (±${Math.round(bestPos.coords.accuracy)} متر) — حاول مرة ثانية`,'error')
      return
    }

    const r = await api.patch('/api/branches', { org_id: orgId, id, latitude: bestPos.coords.latitude, longitude: bestPos.coords.longitude, accuracy_m: bestPos.coords.accuracy })
    setSavingLocationId(null)
    if(!r.success){ toast('فشل حفظ الموقع — حاول مرة أخرى','error'); return }
    setBranches(prev=>prev.map((br:any)=>br.id===id?{...br,latitude:bestPos!.coords.latitude,longitude:bestPos!.coords.longitude}:br))
    toast('تم حفظ موقع الفرع — يمكن للموظفين الآن تسجيل حضورهم')
  }

  function toggleExpand(s:any) {
    if (expandedId === s.id) { setExpandedId(null); return }
    setExpandedId(s.id)
    setHrTab(pendingLeaveCounts[s.id] > 0 ? 'leave' : pendingAdvanceCounts[s.id] > 0 ? 'adj' : 'salary')
    setSalaryForm({
      base: String(s.monthly_salary || 0),
      housing: String(s.housing_allowance || 0),
      transport: String(s.transport_allowance || 0),
      food: String(s.food_allowance || 0),
    })
    loadAdjustments(s.id)
    loadTasks(s.id)
    loadLeave(s.id)
    loadExcuse(s.id)
  }

  async function loadLeave(staffId:string) {
    setLoadingLeave(true)
    try {
      const res = await fetch(`/api/staff-leave?org_id=${orgId}&staff_id=${staffId}`)
      const j = await res.json()
      setLeaveRequests(j.success ? (j.requests||[]) : [])
    } catch { setLeaveRequests([]) }
    setLoadingLeave(false)
  }

  async function reviewLeave(staffId:string, requestId:string, decision:'approved'|'rejected') {
    const res = await fetch('/api/staff-leave', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, request_id: requestId, decision }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(decision==='approved' ? 'تم قبول طلب الإجازة' : 'تم رفض الطلب')
    loadLeave(staffId)
    setPendingLeaveCounts(prev => {
      const next = { ...prev }
      if (next[staffId] > 1) next[staffId] -= 1
      else delete next[staffId]
      return next
    })
    if (decision==='approved') {
      const res2 = await fetch(`/api/staff-leave?org_id=${orgId}&staff_id=${staffId}`)
      const j2 = await res2.json()
      const balance = j2.requests?.[0]?.staff_members?.leave_balance_days
      if (balance !== undefined) setStaff(prev => prev.map((s:any)=> s.id===staffId ? {...s, leave_balance_days:balance} : s))
    }
  }

  async function loadExcuse(staffId:string) {
    setLoadingExcuse(true)
    try {
      const res = await fetch(`/api/attendance-permission-request?org_id=${orgId}`)
      const j = await res.json()
      setExcuseRequests(j.success ? (j.requests||[]).filter((r:any)=>r.staff_id===staffId) : [])
    } catch { setExcuseRequests([]) }
    setLoadingExcuse(false)
  }

  async function reviewExcuse(staffId:string, requestId:string, action:'approve'|'reject') {
    const res = await fetch('/api/attendance-permission-request', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, id: requestId, action }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(action==='approve' ? 'تمت الموافقة على الاستئذان' : 'تم رفض الطلب')
    loadExcuse(staffId)
  }

  // كشف الراتب للموظفين — المالك يفعّله أو يقفله
  async function toggleSalaryVisible() {
    const next = !salaryVisible
    setSalaryVisible(next)
    const r = await api.patch('/api/org-settings', { org_id: orgId, staff_salary_visible: next })
    if (!r.success) { setSalaryVisible(!next); toast(r.error || 'حدث خطأ', 'error'); return }
    toast(next ? 'يمكن للموظفين الآن الاطلاع على كشوف رواتبهم' : 'تم إخفاء كشف الراتب عن الموظفين')
  }

  async function loadReport() {
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/staff-report?org_id=${orgId}&month=${reportMonth}`)
      const j = await res.json()
      setReportData(j.success ? (j.report||[]) : [])
      if (!j.success && j.error) toast(j.error,'error')
    } catch { setReportData([]) }
    setLoadingReport(false)
  }

  const totalSalary = (Number(salaryForm.base)||0) + (Number(salaryForm.housing)||0) + (Number(salaryForm.transport)||0) + (Number(salaryForm.food)||0)

  async function saveSalary(staffId:string) {
    setSavingSalary(true)
    const res = await fetch('/api/staff-salary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: orgId, staff_id: staffId,
        monthly_salary: Number(salaryForm.base)||0,
        housing_allowance: Number(salaryForm.housing)||0,
        transport_allowance: Number(salaryForm.transport)||0,
        food_allowance: Number(salaryForm.food)||0,
      }),
    })
    const j = await res.json()
    setSavingSalary(false)
    if (!j.success) { toast(j.error || 'خطأ', 'error'); return }
    toast('تم حفظ الراتب والبدلات')
    setStaff(prev => prev.map((s:any)=> s.id===staffId ? {...s, monthly_salary:Number(salaryForm.base)||0, housing_allowance:Number(salaryForm.housing)||0, transport_allowance:Number(salaryForm.transport)||0, food_allowance:Number(salaryForm.food)||0} : s))
  }

  async function loadAdjustments(staffId:string) {
    setLoadingAdjustments(true)
    try {
      const res = await fetch(`/api/staff-payroll-adjustments?org_id=${orgId}&staff_id=${staffId}`)
      const j = await res.json()
      setAdjustments(j.success ? (j.adjustments||[]) : [])
    } catch { setAdjustments([]) }
    setLoadingAdjustments(false)
  }

  async function addDeduction(staffId:string) {
    const amt = Number(newAdjAmount)
    if (!(amt>0)) { toast('أدخل مبلغ صحيح','warning'); return }
    setSavingAdj(true)
    const res = await fetch('/api/staff-payroll-adjustments', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, staff_id: staffId, type:'deduction', amount: amt, reason: newAdjReason || null }),
    })
    const j = await res.json()
    setSavingAdj(false)
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast('تم إضافة الخصم')
    setNewAdjAmount(''); setNewAdjReason('')
    loadAdjustments(staffId)
  }

  async function reviewAdvance(staffId:string, adjustmentId:string, decision:'approved'|'rejected') {
    const res = await fetch('/api/staff-payroll-adjustments', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, adjustment_id: adjustmentId, decision }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(decision==='approved' ? 'تم قبول طلب السلفة' : 'تم رفض الطلب')
    loadAdjustments(staffId)
    setPendingAdvanceCounts(prev => {
      const next = { ...prev }
      if (next[staffId] > 1) next[staffId] -= 1
      else delete next[staffId]
      return next
    })
  }

  async function loadTasks(staffId:string) {
    setLoadingTasks(true)
    try {
      const res = await fetch(`/api/staff-tasks?org_id=${orgId}&staff_id=${staffId}`)
      const j = await res.json()
      setTasks(j.success ? (j.tasks||[]) : [])
    } catch { setTasks([]) }
    setLoadingTasks(false)
  }

  async function createTask(staffId:string) {
    if (!newTaskTitle.trim()) { toast('اكتب عنوان المهمة','warning'); return }
    setSavingTask(true)
    const res = await fetch('/api/staff-tasks', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, staff_ids:[staffId], title:newTaskTitle.trim(), description:newTaskDesc||null, requires_photo:newTaskPhoto }),
    })
    const j = await res.json()
    setSavingTask(false)
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast('تم إنشاء المهمة')
    setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskPhoto(false)
    loadTasks(staffId)
  }

  async function reviewTask(staffId:string, taskId:string, decision:'confirmed'|'rejected') {
    const res = await fetch('/api/staff-tasks', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, task_id: taskId, decision }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(decision==='confirmed' ? 'تم تأكيد اكتمال المهمة' : 'تم رفض المهمة')
    loadTasks(staffId)
  }

  async function toggleDaily(staffId:string, taskId:string) {
    const res = await fetch('/api/staff-tasks', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, task_id: taskId, toggle_daily: true }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(j.is_daily ? 'أصبحت مهمة يومية' : 'تم إيقاف التكرار اليومي')
    loadTasks(staffId)
  }

  const TASK_STATUS_LABEL:Record<string,{label:string,color:string,bg:string}> = {
    pending:   {label:'قيد الانتظار', color: colors.text3,   bg: colors.bg},
    completed: {label:'بانتظار تأكيدك', color: colors.warning, bg: colors.warningLight},
    confirmed: {label:'مؤكدة ',       color: colors.primary, bg: colors.primaryLight},
    rejected:  {label:'مرفوضة',        color: colors.danger,  bg: colors.dangerLight},
  }

  return { orgId, setOrgId, salaryVisible, setSalaryVisible, isOwner, setIsOwner, curr, setCurr, orgPlan, setOrgPlan, hasHrAddon, setHasHrAddon, staff, setStaff, loading, setLoading, expandedId, setExpandedId, branches, setBranches, savingLocationId, setSavingLocationId, salaryForm, setSalaryForm, savingSalary, setSavingSalary, adjustments, setAdjustments, loadingAdjustments, setLoadingAdjustments, newAdjAmount, setNewAdjAmount, newAdjReason, setNewAdjReason, savingAdj, setSavingAdj, tasks, setTasks, loadingTasks, setLoadingTasks, newTaskTitle, setNewTaskTitle, newTaskDesc, setNewTaskDesc, newTaskPhoto, setNewTaskPhoto, savingTask, setSavingTask, leaveRequests, setLeaveRequests, loadingLeave, setLoadingLeave, pendingLeaveCounts, setPendingLeaveCounts, pendingAdvanceCounts, setPendingAdvanceCounts, cardPayroll, setCardPayroll, extraDays, setExtraDays, canDecideExtra, setCanDecideExtra, excuseRequests, setExcuseRequests, loadingExcuse, setLoadingExcuse, reportMonth, setReportMonth, reportData, setReportData, loadingReport, setLoadingReport, showReport, setShowReport, hrTab, setHrTab, currentBranchId, setCurrentBranchId, MAX_ACCEPTABLE_ACCURACY_M, totalSalary, TASK_STATUS_LABEL, init, getPositionOnce, saveBranchLocation, toggleExpand, loadLeave, reviewLeave, loadExcuse, reviewExcuse, toggleSalaryVisible, loadReport, saveSalary, loadAdjustments, addDeduction, reviewAdvance, loadTasks, createTask, reviewTask, toggleDaily }
}

export type HrPage = ReturnType<typeof useHrManagement>
/** قيم محسوبة لكل موظف في البطاقة */
export type CardVals = { isOpen: boolean; pendingAdvances: any[]; totalDeducted: number; savedTotal: number }
