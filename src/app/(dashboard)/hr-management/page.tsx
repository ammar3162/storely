'use client'
import PageIcon from '@/components/PageIcon'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import ExtraDayDecision from '@/components/ExtraDayDecision'
import { cache } from '@/lib/cache'
import { ThumbsUp, ThumbsDown, ClipboardList, ChevronDown, Plus, Camera, CalendarDays, BarChart3 } from 'lucide-react'

export default function HRManagementPage() {
  const [orgId, setOrgId] = useState('')
  const [salaryVisible, setSalaryVisible] = useState<boolean|null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [curr, setCurr] = useState('ر.س')
  const [orgPlan, setOrgPlan] = useState('basic')
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


  useEffect(()=>{ init() },[])
  useEffect(()=>{ if (showReport && orgId) loadReport() },[showReport, reportMonth, orgId])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    // عرض كاش الموظفين فوراً لو متوفر
    if (oid) {
      const cachedStaff = cache.get('hr-staff:'+oid)
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
      api.get('/api/addons-market', { org_id: oid }),
      api.get('/api/branches', { org_id: oid }),
    ])
    // نفس قاعدة صفحة الموظفين: الموظفين الموقوفين تلقائياً بانتهاء إضافة «موظف إضافي» ما يطلعون
    const data = (staffRes.staff || []).filter((s:any) => !s.hidden_from_list)
    setBranches(branchesRes.branches||[])
    setOrgPlan(me?.org?.plan || 'basic')
    const hrAddon = (addonRes?.addons||[]).find((a:any)=>a.slug==='hr_full')
    setHasHrAddon(!!hrAddon?.subscription?.isValid)
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
    if(!navigator.geolocation){ toast('المتصفح ما يدعم تحديد الموقع','error'); return }
    // الموقع ينحفظ من مكان الجهاز — نتأكد إن المالك فعلاً داخل الفرع
    if (id !== currentBranchId) { toast('اختر هذا الفرع من القائمة فوق وأنت موجود فيه','warning'); return }
    const bName = branches.find((b:any)=>b.id===id)?.name || 'الفرع'
    if (!(await confirmDialog({ title:`تحديد موقع ${bName}`, message:`تأكد إنك موجود الحين داخل ${bName} — الموقع يتسجّل من مكان جهازك، والموظفين يحضّرون بناءً عليه.`, confirmText:'أنا داخل الفرع — حدّد', type:'warning' }))) return
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
    toast('✅ تم حفظ موقع الفرع — الموظفون الآن يقدروا يسجّلوا حضورهم')
  }

  function toggleExpand(s:any) {
    if (expandedId === s.id) { setExpandedId(null); return }
    setExpandedId(s.id)
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
    toast(decision==='approved' ? '✅ تم قبول طلب الإجازة' : 'تم رفض الطلب')
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
    toast(action==='approve' ? '✅ تمت الموافقة على الاستئذان' : 'تم رفض الطلب')
    loadExcuse(staffId)
  }

  // كشف الراتب للموظفين — المالك يفعّله أو يقفله
  async function toggleSalaryVisible() {
    const next = !salaryVisible
    setSalaryVisible(next)
    const r = await api.patch('/api/org-settings', { org_id: orgId, staff_salary_visible: next })
    if (!r.success) { setSalaryVisible(!next); toast(r.error || 'حدث خطأ', 'error'); return }
    toast(next ? '✅ الموظفين يقدرون يشوفون كشف رواتبهم الحين' : 'انقفل كشف الراتب عن الموظفين')
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
    toast('✅ تم حفظ الراتب والبدلات')
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
    toast('✅ تم إضافة الخصم')
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
    toast(decision==='approved' ? '✅ تم قبول طلب السلفة' : 'تم رفض الطلب')
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
    toast('✅ تم إنشاء المهمة')
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
    toast(decision==='confirmed' ? '✅ تم تأكيد اكتمال المهمة' : 'تم رفض المهمة')
    loadTasks(staffId)
  }

  async function toggleDaily(staffId:string, taskId:string) {
    const res = await fetch('/api/staff-tasks', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, task_id: taskId, toggle_daily: true }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(j.is_daily ? '🔁 صارت مهمة يومية' : 'تم إيقاف التكرار اليومي')
    loadTasks(staffId)
  }

  const TASK_STATUS_LABEL:Record<string,{label:string,color:string,bg:string}> = {
    pending:   {label:'قيد الانتظار', color: colors.text3,   bg: colors.bg},
    completed: {label:'بانتظار تأكيدك', color: colors.warning, bg: colors.warningLight},
    confirmed: {label:'مؤكدة ✓',       color: colors.primary, bg: colors.primaryLight},
    rejected:  {label:'مرفوضة',        color: colors.danger,  bg: colors.dangerLight},
  }

  if (loading) return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (orgPlan === 'basic' && !hasHrAddon) return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:20}}>
      <div>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontSize:16,fontWeight:800,color:colors.text,marginBottom:8}}>إدارة الموظفين متاحة بالباقة المتوسطة أو المتقدمة</div>
        <div className="hide-in-app" style={{fontSize:13,color:colors.text3}}>رقّي باقتك عشان تفعّل إدارة الرواتب والمهام لفريقك</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div>
            <h1 style={pageTitle}><PageIcon/>إدارة الموظفين</h1>
            <p style={pageSub}>الرواتب والبدلات، الخصومات والسلف، والمهام لكل موظف</p>
          </div>
        </div>
        <button onClick={()=>setShowReport(v=>!v)} style={{...btnSecondary,display:'flex',alignItems:'center',gap:6}}>
          <BarChart3 size={15} strokeWidth={2.25}/> تقرير الموظفين
        </button>
      </div>

      {/* أيام إضافية (دوام بيوم إجازة) بانتظار قرار المالك */}
      {extraDays.length > 0 && (
        <div style={{...card,padding:'14px 16px',marginBottom:20,border:`1px solid ${colors.primaryBorder}`}}>
          <div style={{fontSize:13.5,fontWeight:800,color:colors.text}}>أيام إضافية بانتظار قرارك ({extraDays.length})</div>
          <div style={{fontSize:12,color:colors.text3,marginTop:3,marginBottom:10}}>موظفين داوموا بيوم إجازتهم — حدد التعويض: مبلغ ينضاف لراتبهم أو يوم إجازة بديل.</div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {extraDays.map((e:any)=>(
              <div key={e.id} style={{background:colors.bg,borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:13,fontWeight:700,color:colors.text}}>{e.name}</div>
                <div style={{fontSize:11.5,color:colors.text3,marginTop:2}}>
                  {e.reason==='monthly' ? 'داوم بعد ما خلّص أيام دوامه المطلوبة هالشهر' : 'داوم بيوم إجازته'} — {new Date(`${e.work_date}T12:00:00Z`).toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'long',calendar:'gregory',numberingSystem:'latn',timeZone:'UTC'})}
                </div>
                <ExtraDayDecision item={e} orgId={orgId} canDecide={canDecideExtra} onDone={()=>setTimeout(()=>setExtraDays(prev=>prev.filter((x:any)=>x.id!==e.id)),1200)}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* كشف الراتب للموظف */}
      {isOwner && salaryVisible !== null && (
        <div style={{...card,padding:'14px 16px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:colors.text}}>كشف الراتب للموظف</div>
            <div style={{fontSize:12,color:colors.text3,marginTop:3,lineHeight:1.6}}>الموظف يشوف بلغته: الراتب والبدلات، والأوفر تايم، وكل خصم بسببه وتاريخه (غرامات التأخير، خصوماتك، عجز الكاشير اللي تعتمده، والسلف)، والصافي</div>
          </div>
          <button onClick={toggleSalaryVisible} role="switch" aria-checked={!!salaryVisible} aria-label="كشف الراتب للموظف"
            style={{width:52,height:30,borderRadius:99,border:'none',cursor:'pointer',flexShrink:0,position:'relative' as const,background:salaryVisible?colors.primary:colors.border2,transition:'background .2s'}}>
            <span style={{position:'absolute' as const,top:3,width:24,height:24,borderRadius:'50%',background:'white',boxShadow:shadow.md,transition:'right .2s',right:salaryVisible?3:25}}/>
          </button>
        </div>
      )}

      {/* موقع الفرع — يتحدد من داخل الفرع نفسه: يطلع بس للفرع المختار حالياً (لفرع ثاني: انتقل له من قائمة الفروع) */}
      {(() => {
        const b = branches.find((x:any)=>x.id===currentBranchId)
        if (!b) return null
        return (
          <div style={{...card,padding:14,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:colors.text}}>📍 موقع {b.name} (لتسجيل الحضور)</div>
              <div style={{fontSize:11,color:b.latitude?colors.primary:colors.warning,marginTop:3}}>{b.latitude ? '✓ الموقع محدّد' : 'الموقع غير محدّد — الموظفين ما يقدرون يحضّرون'}</div>
              <div style={{fontSize:10.5,color:colors.text4,marginTop:3}}>يتسجّل من مكان جهازك — حدّده وأنت داخل الفرع.{branches.length > 1 ? ' لفرع ثاني: انتقل له من قائمة الفروع فوق.' : ''}</div>
            </div>
            <button onClick={()=>saveBranchLocation(b.id)} disabled={savingLocationId===b.id}
              style={{...btnPrimary,padding:'9px 16px',fontSize:12.5,whiteSpace:'nowrap' as const,opacity:savingLocationId===b.id?.7:1}}>
              {savingLocationId===b.id ? 'جاري التحديد...' : b.latitude ? 'إعادة الضبط من هنا' : 'حدّد الموقع من هنا'}
            </button>
          </div>
        )
      })()}

      {showReport && (
        <div style={{...card,padding:'18px 20px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap' as const,gap:10}}>
            <div style={{fontSize:14,fontWeight:800,color:colors.text}}>تقرير الموظفين الشهري</div>
            <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{...inp(),width:'auto',fontSize:13,padding:'8px 12px'}}/>
          </div>
          {loadingReport ? (
            <div style={{fontSize:12,color:colors.text4}}>جاري تحميل التقرير...</div>
          ) : reportData.length===0 ? (
            <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>ما فيه بيانات لهذا الشهر</div>
          ) : (
            <div style={{overflowX:'auto' as const}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12,minWidth:820}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${colors.border}`}}>
                    {['الموظف','الراتب الإجمالي','الأوفر تايم','الخصومات','السلف','صافي الراتب','الحضور','التأخير','الإجازات','المهام','التقييم'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'right' as const,color:colors.text4,fontWeight:700,whiteSpace:'nowrap' as const}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r:any)=>{
                    const ratingColor = r.rating>=80?colors.primary:r.rating>=50?colors.warning:colors.danger
                    return (
                      <tr key={r.staffId} style={{borderBottom:`1px solid ${colors.border}`}}>
                        <td style={{padding:'10px',fontWeight:700,color:colors.text,whiteSpace:'nowrap' as const}}>{r.name}</td>
                        <td style={{padding:'10px',color:colors.text2}}>{r.grossSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td style={{padding:'10px',color:colors.primary,whiteSpace:'nowrap' as const}}>{r.overtimePay>0?`+${r.overtimePay.toLocaleString('ar-SA',{numberingSystem:'latn'})} (${Math.round(r.overtimeMinutes/6)/10} س)`:'—'}</td>
                        <td style={{padding:'10px',color:colors.danger}}>{r.deductionsTotal>0?`-${r.deductionsTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td style={{padding:'10px',color:colors.danger}}>{r.advancesTotal>0?`-${r.advancesTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td style={{padding:'10px',fontWeight:800,color:colors.primary}}>{r.netSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td style={{padding:'10px',color:colors.text2,whiteSpace:'nowrap' as const}}>{r.daysPresent}/{r.daysInMonth} ({r.attendanceRate}%)</td>
                        <td style={{padding:'10px',color:r.lateCount>0?colors.warning:colors.text2}}>{r.lateCount} مرة</td>
                        <td style={{padding:'10px',color:colors.text2,whiteSpace:'nowrap' as const}}>{r.leaveDaysTaken} يوم (متبقي {r.leaveBalance})</td>
                        <td style={{padding:'10px',color:colors.text2}}>{r.tasksConfirmed}/{r.tasksTotal} ({r.taskCompletionRate}%)</td>
                        <td style={{padding:'10px'}}>
                          <span style={{display:'inline-block',padding:'4px 10px',borderRadius:99,fontWeight:800,color:'white',background:ratingColor}}>{r.rating}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {staff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center' as const}}>
          <div style={{fontSize:13,color:colors.text4}}>ما فيه موظفين بعد — أضفهم من صفحة "الموظفون" أول</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {staff.map((s:any)=>{
            const isOpen = expandedId===s.id
            const pendingAdvances = adjustments.filter((a:any)=>a.type==='advance'&&a.status==='pending')
            const totalDeducted = adjustments.filter((a:any)=>a.status==='approved').reduce((sum:number,a:any)=>sum+Number(a.amount),0)
            const savedTotal = (Number(s.monthly_salary)||0)+(Number(s.housing_allowance)||0)+(Number(s.transport_allowance)||0)+(Number(s.food_allowance)||0)
            return (
              <div key={s.id} style={{...card,padding:'16px 18px'}}>
                <div onClick={()=>toggleExpand(s)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>{s.name}</div>
                      {pendingLeaveCounts[s.id] > 0 && (
                        <span style={{background:colors.danger,color:'white',fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px'}} title="عنده طلب إجازة بانتظار الموافقة">
                          {pendingLeaveCounts[s.id]}
                        </span>
                      )}
                      {pendingAdvanceCounts[s.id] > 0 && (
                        <span style={{background:'#f79009',color:'white',fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px'}} title="عنده طلب سلفة/خصم بانتظار الموافقة">
                          {pendingAdvanceCounts[s.id]}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:colors.text4,marginTop:2}}>إجمالي الراتب: {savedTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</div>
                  </div>
                  <ChevronDown size={16} color={colors.text3} strokeWidth={2.25} style={{transition:'transform .2s',transform:isOpen?'rotate(180deg)':'none'}}/>
                </div>

                {(() => {
                  // راتب الشهر الحالي — نفس أرقام كشف راتب الموظف
                  const p = cardPayroll[s.id]
                  if (!p) return null
                  const fmtN = (n:number) => Number(n||0).toLocaleString('ar-SA',{numberingSystem:'latn'})
                  const line = (label:string, value:string, color:string) => (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                      <span style={{color:colors.text3}}>{label}</span>
                      <span style={{color,fontWeight:700}}>{value}</span>
                    </div>
                  )
                  const hasAny = p.bonusesTotal>0 || p.overtimePay>0 || p.latePenaltiesTotal>0 || p.otherDeductionsTotal>0 || p.advancesTotal>0 || p.pendingDeficitsTotal>0
                  if (!hasAny) return null
                  return (
                    <div style={{marginTop:10,padding:'10px 12px',background:colors.bg,borderRadius:10,display:'flex',flexDirection:'column' as const,gap:6}}>
                      <div style={{fontSize:10.5,fontWeight:700,color:colors.text4}}>هذا الشهر</div>
                      {p.overtimePay>0 && line('أوفر تايم', `+${fmtN(p.overtimePay)} ${curr}`, colors.primary)}
                      {p.bonusesTotal>0 && line('تعويض أيام إضافية', `+${fmtN(p.bonusesTotal)} ${curr}`, colors.primary)}
                      {p.latePenaltiesTotal>0 && line(`غرامات تأخير (${p.latePenaltiesCount})`, `−${fmtN(p.latePenaltiesTotal)} ${curr}`, colors.danger)}
                      {p.otherDeductionsTotal>0 && line('خصومات', `−${fmtN(p.otherDeductionsTotal)} ${curr}`, colors.danger)}
                      {p.advancesTotal>0 && line('سلف معتمدة', `−${fmtN(p.advancesTotal)} ${curr}`, colors.warning)}
                      {p.pendingDeficitsTotal>0 && line('عجز كاشير بانتظار قرارك', `${fmtN(p.pendingDeficitsTotal)} ${curr}`, colors.text3)}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800,paddingTop:6,borderTop:`1px dashed ${colors.border}`}}>
                        <span style={{color:colors.text}}>الصافي حتى الآن</span>
                        <span style={{color:colors.primary}}>{fmtN(p.netSalary)} {curr}</span>
                      </div>
                    </div>
                  )
                })()}

                {isOpen && (
                  <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${colors.border}`,display:'flex',flexDirection:'column' as const,gap:22}}>

                    {/* الراتب والبدلات */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10}}>الراتب الأساسي والبدلات</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الراتب الأساسي</label>
                          <input type="number" value={salaryForm.base} onChange={e=>setSalaryForm({...salaryForm,base:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل السكن</label>
                          <input type="number" value={salaryForm.housing} onChange={e=>setSalaryForm({...salaryForm,housing:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل المواصلات</label>
                          <input type="number" value={salaryForm.transport} onChange={e=>setSalaryForm({...salaryForm,transport:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل الأكل</label>
                          <input type="number" value={salaryForm.food} onChange={e=>setSalaryForm({...salaryForm,food:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:10}}>
                        <span style={{fontSize:12,fontWeight:700,color:colors.primary}}>الإجمالي الشهري</span>
                        <span style={{fontSize:18,fontWeight:900,color:colors.primary}}>{totalSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                      </div>
                      <button onClick={()=>saveSalary(s.id)} disabled={savingSalary} style={{...btnPrimary,width:'100%',padding:'10px',fontSize:13,opacity:savingSalary?0.6:1}}>{savingSalary?'...':'حفظ الراتب والبدلات'}</button>
                    </div>

                    {/* السلف والخصومات */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10}}>الخصومات والسلف</div>
                      {loadingAdjustments ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : (
                        <>
                          {pendingAdvances.length>0 && (
                            <div style={{marginBottom:14}}>
                              <div style={{fontSize:11,fontWeight:700,color:colors.warning,marginBottom:8}}>طلبات سلفة بانتظار الموافقة</div>
                              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                                {pendingAdvances.map((a:any)=>(
                                  <div key={a.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                      <span style={{fontSize:15,fontWeight:800,color:colors.warning}}>{a.amount} {curr}</span>
                                      <span style={{fontSize:10,color:colors.text4}}>{new Date(a.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn'})}</span>
                                    </div>
                                    {a.reason && <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{a.reason}</div>}
                                    <div style={{display:'flex',gap:8}}>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'approved')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px',marginBottom:12}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:8,marginBottom:8}}>
                              <input type="number" value={newAdjAmount} onChange={e=>setNewAdjAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),fontSize:13}}/>
                              <input value={newAdjReason} onChange={e=>setNewAdjReason(e.target.value)} placeholder="السبب (اختياري)" style={{...inp(),fontSize:13}}/>
                            </div>
                            <button onClick={()=>addDeduction(s.id)} disabled={savingAdj||!newAdjAmount} style={{...btnSecondary,width:'100%',padding:'9px',fontSize:13,opacity:(savingAdj||!newAdjAmount)?0.6:1}}>{savingAdj?'...':'+ إضافة خصم'}</button>
                          </div>
                          {adjustments.length>0 && (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                              {adjustments.map((a:any)=>(
                                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:colors.bg,borderRadius:radius.sm,opacity:a.status==='rejected'?0.5:1}}>
                                  <div>
                                    <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{a.type==='advance'?'سلفة':'خصم'}</span>
                                    {a.reason && <span style={{fontSize:11,color:colors.text4,marginRight:6}}>— {a.reason}</span>}
                                    {a.status==='pending' && <span style={{fontSize:9,color:colors.warning,marginRight:6,fontWeight:700}}>(معلّق)</span>}
                                  </div>
                                  <span style={{fontSize:12,fontWeight:700,color:colors.danger}}>-{a.amount} {curr}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* الإجازات */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{display:'flex',alignItems:'center',gap:6}}><CalendarDays size={14} strokeWidth={2.25}/> الإجازات</span>
                        <span style={{fontSize:11,color:colors.primary,fontWeight:800}}>الرصيد المتبقي: {s.leave_balance_days ?? 21} يوم</span>
                      </div>
                      {loadingLeave ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : (
                        <>
                          {leaveRequests.filter((l:any)=>l.status==='pending').length>0 && (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:12}}>
                              {leaveRequests.filter((l:any)=>l.status==='pending').map((l:any)=>(
                                <div key={l.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                    <span style={{fontSize:13,fontWeight:800,color:colors.warning}}>{l.days_count} يوم</span>
                                    <span style={{fontSize:10,color:colors.text4}}>{l.start_date} → {l.end_date}</span>
                                  </div>
                                  {l.reason && <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{l.reason}</div>}
                                  <div style={{display:'flex',gap:8}}>
                                    <button onClick={()=>reviewLeave(s.id,l.id,'approved')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                    <button onClick={()=>reviewLeave(s.id,l.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {leaveRequests.length===0 ? (
                            <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه طلبات إجازة بعد</div>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                              {leaveRequests.filter((l:any)=>l.status!=='pending').map((l:any)=>(
                                <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:colors.bg,borderRadius:radius.sm}}>
                                  <span style={{fontSize:12,color:colors.text}}>{l.start_date} → {l.end_date} ({l.days_count} يوم)</span>
                                  <span style={{fontSize:11,fontWeight:700,color:l.status==='approved'?colors.primary:colors.danger}}>{l.status==='approved'?'موافَق':'مرفوض'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* طلبات الاستئذان */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10}}>طلبات الاستئذان (انصراف مبكر)</div>
                      {loadingExcuse ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : excuseRequests.filter((e:any)=>e.status==='pending').length===0 ? (
                        <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه طلبات استئذان معلّقة</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                          {excuseRequests.filter((e:any)=>e.status==='pending').map((e:any)=>(
                            <div key={e.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                              <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{e.reason || 'بدون سبب محدد'}</div>
                              <div style={{display:'flex',gap:8}}>
                                <button onClick={()=>reviewExcuse(s.id,e.id,'approve')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                <button onClick={()=>reviewExcuse(s.id,e.id,'reject')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* المهام */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><ClipboardList size={14} strokeWidth={2.25}/> المهام</div>
                      <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px',marginBottom:12}}>
                        <input value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} placeholder="عنوان المهمة" style={{...inp(),fontSize:13,marginBottom:8}}/>
                        <input value={newTaskDesc} onChange={e=>setNewTaskDesc(e.target.value)} placeholder="تفاصيل إضافية (اختياري)" style={{...inp(),fontSize:13,marginBottom:8}}/>
                        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,cursor:'pointer'}}>
                          <input type="checkbox" checked={newTaskPhoto} onChange={e=>setNewTaskPhoto(e.target.checked)} style={{accentColor:colors.primary,width:14,height:14}}/>
                          <span style={{fontSize:12,color:colors.text2,display:'flex',alignItems:'center',gap:5}}><Camera size={13} strokeWidth={2.25}/> تتطلب صورة إثبات عند الإكمال</span>
                        </label>
                        <button onClick={()=>createTask(s.id)} disabled={savingTask||!newTaskTitle.trim()} style={{...btnSecondary,width:'100%',padding:'9px',fontSize:13,opacity:(savingTask||!newTaskTitle.trim())?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Plus size={14} strokeWidth={2.25}/> إنشاء مهمة</button>
                      </div>
                      {loadingTasks ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : tasks.length===0 ? (
                        <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه مهام بعد</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                          {tasks.map((t:any)=>{
                            const st = TASK_STATUS_LABEL[t.status] || TASK_STATUS_LABEL.pending
                            return (
                              <div key={t.id} style={{background:t.is_daily?colors.primaryLight:st.bg,border:`1px solid ${t.is_daily?colors.primaryBorder:colors.border2}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                                  <span style={{fontSize:13,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',gap:6}}>
                                    {t.title}
                                    {t.is_daily && <span style={{fontSize:9,fontWeight:800,color:colors.primary,background:'white',padding:'2px 6px',borderRadius:99}}>🔁 يومية</span>}
                                  </span>
                                  {!t.template_id && !t.is_daily && <span style={{fontSize:10,fontWeight:700,color:st.color}}>{st.label}</span>}
                                </div>
                                {t.description && <div style={{fontSize:12,color:colors.text3,marginBottom:8}}>{t.description}</div>}
                                {t.photo_url && (
                                  <a href={t.photo_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:colors.info,textDecoration:'underline',display:'inline-block',marginBottom:8}}>عرض صورة الإثبات</a>
                                )}
                                {t.status==='completed' && (
                                  <div style={{display:'flex',gap:8,marginTop:6,marginBottom:6}}>
                                    <button onClick={()=>reviewTask(s.id,t.id,'confirmed')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>تأكيد الإتمام</button>
                                    <button onClick={()=>reviewTask(s.id,t.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>رفض</button>
                                  </div>
                                )}
                                {!t.template_id && (
                                  <button onClick={()=>toggleDaily(s.id,t.id)} style={{width:'100%',padding:'6px',marginTop:4,background:'transparent',border:`1px dashed ${t.is_daily?colors.primary:colors.border2}`,borderRadius:8,fontSize:11,fontWeight:700,color:t.is_daily?colors.primary:colors.text4,cursor:'pointer',fontFamily:'inherit'}}>
                                    {t.is_daily ? 'إيقاف التكرار اليومي' : 'اجعلها مهمة يومية 🔁'}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
