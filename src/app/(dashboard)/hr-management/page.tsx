'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { Wallet, ThumbsUp, ThumbsDown, ClipboardList, ChevronDown, Plus, Camera, CalendarDays, BarChart3 } from 'lucide-react'

export default function HRManagementPage() {
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [orgPlan, setOrgPlan] = useState('basic')
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string|null>(null)

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
  const [cashierSummary, setCashierSummary] = useState<Record<string, {deficit:number, surplus:number, count:number}>>({})
  const [approvedAdvances, setApprovedAdvances] = useState<Record<string, number>>({})
  const [latePenalties, setLatePenalties] = useState<Record<string, number>>({})
  const [applyingPenalty, setApplyingPenalty] = useState<string|null>(null)
  const [latePenalties, setLatePenalties] = useState<Record<string, number>>({})
  const [applyingPenalty, setApplyingPenalty] = useState<string|null>(null)
  const [excuseRequests, setExcuseRequests] = useState<any[]>([])
  const [loadingExcuse, setLoadingExcuse] = useState(false)

  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0,7))
  const [reportData, setReportData] = useState<any[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if (showReport && orgId) loadReport() },[showReport, reportMonth, orgId])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    if(!oid){
      const{data:{user}}=await sb.auth.getUser()
      if(!user) return
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p) return
      oid=p.org_id; sessionStorage.setItem('s_org_id',oid!)
    }
    setOrgId(oid!)
    const bid = sessionStorage.getItem('s_branch_id')
    let q = (sb.from('staff_members' as any) as any).select('*').eq('org_id',oid!)
    if (bid) q = q.eq('branch_id', bid)
    const [{data:org}, {data}, leaveRes, advRes, cashierRes, penaltyRes] = await Promise.all([
      sb.from('organizations' as any).select('plan,currency').eq('id',oid!).single(),
      q.order('created_at',{ascending:false}),
      fetch(`/api/staff-leave?org_id=${oid}`).then(r=>r.json()).catch(()=>({success:false})),
      fetch(`/api/staff-payroll-adjustments?org_id=${oid}`).then(r=>r.json()).catch(()=>({success:false})),
      (sb.from('cashier_closings' as any) as any).select('staff_id,difference,status').eq('org_id',oid!),
      fetch(`/api/apply-late-penalties?org_id=${oid}`).then(r=>r.json()).catch(()=>({success:false})),
    ])
    setOrgPlan((org as any)?.plan || 'basic')
    setStaff(data||[])
    if (leaveRes?.success) {
      const counts: Record<string, number> = {}
      for (const req of (leaveRes.requests||[])) {
        if (req.status === 'pending') counts[req.staff_id] = (counts[req.staff_id]||0) + 1
      }
      setPendingLeaveCounts(counts)
    }
    if (advRes?.success) {
      const counts2: Record<string, number> = {}
      const approvedSums: Record<string, number> = {}
      for (const req of (advRes.adjustments||advRes.requests||[])) {
        if (req.status === 'pending') counts2[req.staff_id] = (counts2[req.staff_id]||0) + 1
        if (req.status === 'approved' && req.type === 'advance') approvedSums[req.staff_id] = (approvedSums[req.staff_id]||0) + Number(req.amount||0)
      }
      setPendingAdvanceCounts(counts2)
      setApprovedAdvances(approvedSums)
    }
    if (cashierRes?.data) {
      const summary: Record<string, {deficit:number, surplus:number, count:number}> = {}
      for (const c of (cashierRes.data as any[])) {
        if (!c.staff_id) continue
        if (!summary[c.staff_id]) summary[c.staff_id] = {deficit:0, surplus:0, count:0}
        summary[c.staff_id].count += 1
        if (c.status === 'deficit') summary[c.staff_id].deficit += Math.abs(Number(c.difference||0))
        else if (c.status === 'surplus') summary[c.staff_id].surplus += Number(c.difference||0)
      }
      setCashierSummary(summary)
    }
    if (penaltyRes?.success) {
      const penaltySums: Record<string, number> = {}
      for (const r of (penaltyRes.records||[])) {
        if (!r.staff_id) continue
        penaltySums[r.staff_id] = (penaltySums[r.staff_id]||0) + Number(r.penalty_amount||0)
      }
      setLatePenalties(penaltySums)
    }
    setLoading(false)
  }

  async function applyLatePenalty(staffId:string) {
    setApplyingPenalty(staffId)
    const res = await fetch('/api/apply-late-penalties', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, staff_id: staffId }),
    })
    const j = await res.json()
    setApplyingPenalty(null)
    if (!j.success) { toast(j.error || 'خطأ', 'error'); return }
    toast(`✅ تم تسجيل خصم بقيمة ${j.total} ر.س (${j.count} غرامة تأخير)`)
    setLatePenalties(prev => { const next = {...prev}; delete next[staffId]; return next })
    loadAdjustments(staffId)
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

  if (orgPlan === 'basic') return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:20}}>
      <div>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontSize:16,fontWeight:800,color:colors.text,marginBottom:8}}>إدارة الموظفين متاحة بالباقة المتوسطة أو المتقدمة</div>
        <div style={{fontSize:13,color:colors.text3}}>رقّي باقتك عشان تفعّل إدارة الرواتب والمهام لفريقك</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:radius.md,background:'#fdf4ff',border:'1px solid #f5d0fe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Wallet size={20} color="#a21caf" strokeWidth={1.75}/>
          </div>
          <div>
            <h1 style={pageTitle}>إدارة الموظفين</h1>
            <p style={pageSub}>الرواتب والبدلات، الخصومات والسلف، والمهام لكل موظف</p>
          </div>
        </div>
        <button onClick={()=>setShowReport(v=>!v)} style={{...btnSecondary,display:'flex',alignItems:'center',gap:6}}>
          <BarChart3 size={15} strokeWidth={2.25}/> تقرير الموظفين
        </button>
      </div>

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
                    {['الموظف','الراتب الإجمالي','الخصومات','السلف','صافي الراتب','الحضور','التأخير','الإجازات','المهام','التقييم'].map(h=>(
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
                        <span style={{background:colors.warning,color:'white',fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px'}} title="عنده طلب سلفة/خصم بانتظار الموافقة">
                          {pendingAdvanceCounts[s.id]}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:colors.text4,marginTop:2}}>إجمالي الراتب: {savedTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</div>
                  </div>
                  <ChevronDown size={16} color={colors.text3} strokeWidth={2.25} style={{transition:'transform .2s',transform:isOpen?'rotate(180deg)':'none'}}/>
                </div>

                {(() => {
                  const cs = cashierSummary[s.id]
                  const advDeducted = approvedAdvances[s.id] || 0
                  const cashierDeficit = cs?.deficit || 0
                  const pendingPenalty = latePenalties[s.id] || 0
                  const netSalary = savedTotal - advDeducted - cashierDeficit
                  const hasAnyDeduction = advDeducted > 0 || cashierDeficit > 0 || pendingPenalty > 0
                  if (!hasAnyDeduction) return null
                  return (
                    <div style={{marginTop:10,padding:'10px 12px',background:colors.bg,borderRadius:10,display:'flex',flexDirection:'column' as const,gap:6}}>
                      {advDeducted > 0 && (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                          <span style={{color:colors.text3}}>سلف مخصومة (معتمدة)</span>
                          <span style={{color:colors.warning,fontWeight:700}}>−{advDeducted.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                        </div>
                      )}
                      {cashierDeficit > 0 && (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                          <span style={{color:colors.text3}}>عجز إقفال كاشير ({cs?.count} إقفال)</span>
                          <span style={{color:colors.danger,fontWeight:700}}>−{cashierDeficit.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                        </div>
                      )}
                      {pendingPenalty > 0 && (
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:11}} onClick={e=>e.stopPropagation()}>
                          <span style={{color:colors.text3}}>غرامات تأخير (لسه ما اتخصمت)</span>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{color:colors.danger,fontWeight:700}}>{pendingPenalty.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                            <button onClick={()=>applyLatePenalty(s.id)} disabled={applyingPenalty===s.id}
                              style={{padding:'3px 10px',background:colors.danger,color:'white',border:'none',borderRadius:99,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const}}>
                              {applyingPenalty===s.id?'...':'طبّقها كخصم'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800,paddingTop:6,borderTop:`1px dashed ${colors.border}`}}>
                        <span style={{color:colors.text}}>الصافي المتوقع</span>
                        <span style={{color:colors.primary}}>{netSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
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
