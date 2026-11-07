'use client'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { StorelyFormField } from '@/components/ui/form-field'
import { StorelyStatusBadge } from '@/components/ui/status-badge'
import { StorelyEmptyState } from '@/components/ui/empty-state'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { colors } from '@/lib/ds'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'
import { Wallet, ThumbsUp, ThumbsDown, ClipboardList, ChevronDown, Plus, Camera, CalendarDays, BarChart3 } from 'lucide-react'


const HR_STYLES = `
  @keyframes hrSpin{to{transform:rotate(360deg)}}
  .hr-page,.hr-access,.hr-loading{font-family:${T.typography.family};direction:rtl;color:${T.color.text};line-height:${T.typography.lineHeight}}
  .hr-page{max-width:1200px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;background:${T.color.background};border-radius:${T.radius.panel};font-size:${T.typography.body}px}
  .hr-page *,.hr-access *{box-sizing:border-box}
  .hr-page>header{margin-bottom:${T.spacing[6]}px}
  .hr-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .hr-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .hr-page .hr-workspace{background:${T.color.surface};border-color:${T.color.border};border-radius:${T.radius.card};margin-bottom:${T.spacing[6]}px;min-width:0;overflow:hidden}
  .hr-locations,.hr-report{padding:${T.spacing[6]}px}
  .hr-section-title{font-size:${T.typography.section}px;font-weight:600;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[4]}px}
  .hr-section-label{font-size:${T.typography.body}px;font-weight:600;margin-bottom:${T.spacing[4]}px}
  .hr-supporting{font-size:${T.typography.supporting}px;line-height:1.8;color:${T.color.textMuted}}
  .hr-strong{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight}}
  .hr-inline{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px;min-width:0}
  .hr-between{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[2]}px ${T.spacing[4]}px;min-width:0}
  .hr-list{display:flex;flex-direction:column;gap:${T.spacing[3]}px;min-width:0}
  .hr-locations>.hr-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[3]}px}
  .hr-page .hr-button{height:auto;min-height:40px;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[4]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};font-family:inherit;font-size:${T.typography.body}px;font-weight:600;line-height:1.6;white-space:normal;background:${T.color.surface};color:${T.color.navy};gap:${T.spacing[2]}px;cursor:pointer;box-shadow:none}
  .hr-page .hr-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .hr-page .hr-button:disabled{opacity:.5;cursor:not-allowed}
  .hr-page .hr-button svg{width:16px;height:16px;flex-shrink:0;stroke-width:1.75}
  .hr-page .hr-primary{border-color:${T.color.navy};background:${T.color.navy};color:${T.color.surface}}
  .hr-page .hr-primary:hover:not(:disabled){border-color:${T.color.navy};background:${T.color.navy};color:${T.color.surface}}
  .hr-page .hr-danger{border-color:${T.color.dangerBorder};background:${T.color.surface};color:${T.color.danger}}
  .hr-page .hr-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .hr-page .hr-full{width:100%}
  .hr-page .hr-location-row{display:flex;align-items:flex-start;justify-content:space-between;text-align:start;padding:${T.spacing[3]}px ${T.spacing[4]}px;gap:${T.spacing[4]}px}
  .hr-location-row>span:first-child{font-size:${T.typography.body}px;font-weight:600}
  .hr-location-row>span{min-width:0;overflow-wrap:anywhere}
  .hr-report-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[4]}px;margin-bottom:${T.spacing[5]}px}
  .hr-report-header>.hr-section-title{margin-bottom:0}
  .hr-report-header>.hr-control{width:auto;max-width:100%}
  .hr-page .hr-control{width:100%;min-width:0;height:44px;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .hr-page .hr-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .hr-page input[type=number],.hr-page input[type=month]{direction:ltr;font-variant-numeric:tabular-nums}
  .hr-page input[type=number]{text-align:right}
  .hr-page .hr-control:focus-visible,.hr-page button:focus-visible,.hr-page input[type=checkbox]:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .hr-table-scroll{overflow-x:auto;max-width:100%;overscroll-behavior-inline:contain;border-block:1px solid ${T.color.border}}
  .hr-table{width:100%;min-width:980px;border-collapse:collapse;font-size:${T.typography.body}px;text-align:start;font-variant-numeric:tabular-nums}
  .hr-table th{padding:${T.spacing[3]}px ${T.spacing[4]}px;background:${T.color.background};font-size:${T.typography.supporting}px;font-weight:600;text-align:right;white-space:nowrap;border-bottom:1px solid ${T.color.border}}
  .hr-table td{height:56px;padding:${T.spacing[3]}px ${T.spacing[4]}px;text-align:right;white-space:nowrap;border-bottom:1px solid ${T.color.border}}
  .hr-table tr:last-child td{border-bottom:0}
  .hr-table tbody tr:hover{background:${T.color.background}}
  .hr-table td:first-child,.hr-table td:nth-child(5){font-weight:600}
  .hr-rating{display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:28px;padding:${T.spacing[1]}px ${T.spacing[2]}px;border:1px solid currentColor;border-radius:${T.radius.control};font-weight:600}
  .hr-page .hr-staff-list{padding:0}
  .hr-record{padding:${T.spacing[6]}px;border-bottom:1px solid ${T.color.border};min-width:0}
  .hr-record:last-child{border-bottom:0}
  .hr-record-header{display:flex;align-items:flex-start;justify-content:space-between;gap:${T.spacing[4]}px;cursor:pointer}
  .hr-record-header>div{min-width:0}
  .hr-record-header>.hr-supporting{font-size:${T.typography.body}px}
  .hr-record-header .hr-inline>div:first-child{font-size:16px;font-weight:600;line-height:${T.typography.lineHeight};overflow-wrap:anywhere}
  .hr-record-header>div>.hr-supporting{margin-top:${T.spacing[1]}px}
  .hr-record-header>svg{flex-shrink:0;margin-top:${T.spacing[1]}px;transition:transform .2s}
  .hr-count{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 ${T.spacing[1]}px;font-size:${T.typography.supporting}px;font-weight:600;border:1px solid;border-radius:${T.radius.control};font-variant-numeric:tabular-nums}
  .hr-count-danger{color:${T.color.danger};border-color:${T.color.dangerBorder};background:${T.color.dangerBg}}
  .hr-count-warning{color:${T.color.warning};border-color:${T.color.warningBorder};background:${T.color.warningBg}}
  .hr-payroll-summary{margin-top:${T.spacing[4]}px;padding:${T.spacing[4]}px 0 0;border-top:1px solid ${T.color.border};display:flex;flex-direction:column;gap:${T.spacing[3]}px;font-size:${T.typography.supporting}px}
  .hr-payroll-summary>.hr-between:last-child{padding-top:${T.spacing[3]}px;border-top:1px solid ${T.color.border};font-weight:600;font-size:${T.typography.body}px}
  .hr-payroll-summary .hr-button{min-height:36px;padding:${T.spacing[1]}px ${T.spacing[3]}px;font-size:${T.typography.supporting}px}
  .hr-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:${T.spacing[8]}px;margin-top:${T.spacing[6]}px;padding-top:${T.spacing[6]}px;border-top:1px solid ${T.color.border}}
  .hr-detail-section{min-width:0}
  .hr-detail-section:last-child{grid-column:1/-1;padding-top:${T.spacing[6]}px;border-top:1px solid ${T.color.border}}
  .hr-detail-section>.hr-section-title,.hr-detail-section>.hr-between:first-child{color:${T.color.text}!important;font-size:${T.typography.section}px;font-weight:600;margin-bottom:${T.spacing[4]}px}
  .hr-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[4]}px;margin-bottom:${T.spacing[5]}px}
  .hr-page label{font-size:${T.typography.supporting}px;line-height:${T.typography.lineHeight};color:${T.color.textMuted}}
  .hr-salary-total{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[2]}px;padding:${T.spacing[4]}px 0;margin-bottom:${T.spacing[4]}px;border-block:1px solid ${T.color.border}}
  .hr-total-value{font-size:${T.typography.section}px;font-weight:600;font-variant-numeric:tabular-nums}
  .hr-request{background:${T.color.surface};border:1px solid ${T.color.warningBorder};border-inline-start:3px solid ${T.color.warningBorder};border-radius:${T.radius.control};padding:${T.spacing[4]}px;overflow-wrap:anywhere}
  .hr-request>.hr-between{margin-bottom:${T.spacing[2]}px}
  .hr-request>.hr-supporting{margin-bottom:${T.spacing[3]}px}
  .hr-group{margin-bottom:${T.spacing[5]}px}
  .hr-group>.hr-supporting{margin-bottom:${T.spacing[3]}px}
  .hr-actions{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px;margin-top:${T.spacing[3]}px}
  .hr-actions>.hr-button{flex:1 1 100px}
  .hr-entry-form{display:flex;flex-direction:column;gap:${T.spacing[3]}px;padding:${T.spacing[4]}px 0;margin-bottom:${T.spacing[4]}px;border-block:1px solid ${T.color.border}}
  .hr-adjustment-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:${T.spacing[3]}px}
  .hr-label{display:flex;align-items:flex-start;gap:${T.spacing[2]}px;cursor:pointer}
  .hr-label>span{font-size:${T.typography.body}px}
  .hr-checkbox{width:16px;height:16px;flex-shrink:0;margin-top:${T.spacing[1]}px;accent-color:${T.color.navy}}
  .hr-list>.hr-between{padding:${T.spacing[3]}px 0;border-bottom:1px solid ${T.color.border};font-size:${T.typography.body}px}
  .hr-list>.hr-between:last-child{border-bottom:0}
  .hr-task{padding:${T.spacing[4]}px;border:1px solid ${T.color.border};border-radius:${T.radius.control};background:${T.color.surface};min-width:0;overflow-wrap:anywhere}
  .hr-task>.hr-between{gap:${T.spacing[3]}px;margin-bottom:${T.spacing[2]}px}
  .hr-task>.hr-between>.hr-strong{flex:1;min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px}
  .hr-task>.hr-supporting{margin-bottom:${T.spacing[3]}px;font-size:${T.typography.body}px}
  .hr-daily-badge{display:inline-flex;align-items:center;padding:${T.spacing[1]}px ${T.spacing[2]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.infoBg};color:${T.color.navy};font-size:${T.typography.supporting}px;font-weight:600}
  .hr-page .hr-daily-toggle{width:100%;margin-top:${T.spacing[3]}px}
  .hr-page .hr-daily-toggle[aria-pressed=true]{border-color:${T.color.navy};background:${T.color.infoBg}}
  .hr-link{display:inline-block;margin-bottom:${T.spacing[3]}px;font-size:${T.typography.supporting}px;color:${T.color.info};text-decoration:underline;text-underline-offset:3px}
  .hr-inline-empty{padding:${T.spacing[5]}px 0;text-align:center;font-size:${T.typography.supporting}px}
  .hr-page .hr-empty{padding:${T.spacing[8]}px ${T.spacing[6]}px;border-color:${T.color.border};border-radius:${T.radius.card}}
  .hr-empty>div:first-child{background:${T.color.background};border-color:${T.color.border}}
  .hr-loading,.hr-access{min-height:50vh;display:flex;align-items:center;justify-content:center;background:${T.color.surface};padding:${T.spacing[6]}px;text-align:center;border-radius:${T.radius.panel}}
  .hr-spinner{width:32px;height:32px;border:3px solid ${T.color.border};border-top-color:${T.color.navy};border-radius:50%;animation:hrSpin .7s linear infinite}
  .hr-access-icon{font-size:32px;margin-bottom:${T.spacing[4]}px}
  .hr-access .hr-section-title{margin-bottom:${T.spacing[2]}px}
  @media(max-width:900px){.hr-details{grid-template-columns:minmax(0,1fr)}.hr-detail-section+.hr-detail-section{padding-top:${T.spacing[6]}px;border-top:1px solid ${T.color.border}}}
  @media(max-width:640px){
    .hr-page{padding:${T.spacing[4]}px}
    .hr-locations,.hr-report,.hr-record{padding:${T.spacing[5]}px}
    .hr-locations>.hr-list{grid-template-columns:minmax(0,1fr)}
    .hr-page .hr-location-row{flex-wrap:wrap;gap:${T.spacing[1]}px}
    .hr-location-row>span:last-child{flex-basis:100%}
    .hr-report-header{align-items:stretch;flex-direction:column}
    .hr-report-header>.hr-control{width:100%}
    .hr-details{gap:${T.spacing[6]}px}
    .hr-adjustment-fields{grid-template-columns:minmax(0,1fr)}
    .hr-payroll-summary>.hr-between{flex-direction:column;gap:${T.spacing[1]}px}
    .hr-payroll-summary .hr-inline{justify-content:space-between;width:100%}
    .hr-detail-section>.hr-between:first-child{align-items:flex-start}
  }
  @media(max-width:420px){.hr-fields{grid-template-columns:minmax(0,1fr)}}
  @media(prefers-reduced-motion:reduce){.hr-page *,.hr-spinner{animation:none!important;transition:none!important}}
`

export default function HRManagementPage() {
  const [orgId, setOrgId] = useState('')
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
  const [cashierSummary, setCashierSummary] = useState<Record<string, {deficit:number, surplus:number, count:number}>>({})
  const [approvedAdvances, setApprovedAdvances] = useState<Record<string, number>>({})
  const [latePenalties, setLatePenalties] = useState<Record<string, number>>({})
  const [applyingPenalty, setApplyingPenalty] = useState<string|null>(null)
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
      if (cachedStaff) { setStaff(cachedStaff); setLoading(false) }
    }
    if(!oid){
      oid = await getOrgId()
      if(!oid) return
    }
    setOrgId(oid)
    const bid = sessionStorage.getItem('s_branch_id')
    const [me, staffRes, leaveRes, advRes, cashierRes, penaltyRes, addonRes, branchesRes] = await Promise.all([
      getMe(),
      api.get('/api/staff-members', { org_id: oid, branch_id: bid }),
      api.get('/api/staff-leave', { org_id: oid }),
      api.get('/api/staff-payroll-adjustments', { org_id: oid }),
      api.get('/api/cashier-closing', { org_id: oid }),
      api.get('/api/apply-late-penalties', { org_id: oid }),
      api.get('/api/addons-market', { org_id: oid }),
      api.get('/api/branches', { org_id: oid }),
    ])
    const data = staffRes.staff
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
      const approvedSums: Record<string, number> = {}
      for (const req of (advRes.adjustments||advRes.requests||[])) {
        if (req.status === 'pending') counts2[req.staff_id] = (counts2[req.staff_id]||0) + 1
        if (req.status === 'approved' && req.type === 'advance') approvedSums[req.staff_id] = (approvedSums[req.staff_id]||0) + Number(req.amount||0)
      }
      setPendingAdvanceCounts(counts2)
      setApprovedAdvances(approvedSums)
    }
    if (cashierRes?.success) {
      const summary: Record<string, {deficit:number, surplus:number, count:number}> = {}
      for (const c of (cashierRes.closings as any[])) {
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

  const MAX_ACCEPTABLE_ACCURACY_M = 100

  function getPositionOnce(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:10000, maximumAge:0 })
    })
  }

  async function saveBranchLocation(id:string) {
    if(!navigator.geolocation){ toast('المتصفح ما يدعم تحديد الموقع','error'); return }
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
      toast(`إشارة GPS ضعيفة (دقة ${Math.round(bestPos.coords.accuracy)} متر) — جرّب تطلع لمكان مفتوح وحاول مرة ثانية`,'error')
      return
    }

    const r = await api.patch('/api/branches', { org_id: orgId, id, latitude: bestPos.coords.latitude, longitude: bestPos.coords.longitude })
    setSavingLocationId(null)
    if(!r.success){ toast('فشل حفظ الموقع — حاول مرة أخرى','error'); return }
    setBranches(prev=>prev.map((br:any)=>br.id===id?{...br,latitude:bestPos!.coords.latitude}:br))
    toast('✅ تم حفظ موقع الفرع — الموظفون الآن يقدروا يسجّلوا حضورهم')
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
    <div className="hr-loading">
      <div className="hr-spinner" />
      <style>{HR_STYLES}</style>
    </div>
  )

  if (orgPlan === 'basic' && !hasHrAddon) return (
    <div className="hr-access">
      <style>{HR_STYLES}</style>
      <div>
        <div className="hr-access-icon">🔒</div>
        <div className="hr-section-title" style={{color:T.color.text}}>إدارة الموظفين متاحة بالباقة المتوسطة أو المتقدمة</div>
        <div className="hide-in-app hr-supporting" style={{color:T.color.textMuted}}>رقّي باقتك عشان تفعّل إدارة الرواتب والمهام لفريقك</div>
      </div>
    </div>
  )

  return (
    <div className="hr-page">
      <style>{HR_STYLES}</style>
      <StorelyPageHeader
        title="إدارة الموظفين"
        description="الرواتب والبدلات، الخصومات والسلف، والمهام لكل موظف"
        actions={<StorelyButton className="hr-button" onClick={()=>setShowReport(v=>!v)}><BarChart3 size={15} strokeWidth={2.25}/> تقرير الموظفين</StorelyButton>}
      />

      {/* مواقع الفروع -- لازمة لتفعيل تسجيل الحضور/الانصراف بكل فرع */}
      {branches.length>0 && (
        <StorelyCard className="hr-workspace hr-locations">
          <div className="hr-section-label" style={{color:T.color.text}}>📍 مواقع الفروع (لتسجيل الحضور)</div>
          <div className="hr-list">
            {branches.map((b:any)=>(
              <StorelyButton className="hr-button hr-location-row" key={b.id} onClick={()=>saveBranchLocation(b.id)} disabled={savingLocationId===b.id}>
                <span className="hr-supporting" style={{color:T.color.text}}>{b.name}</span>
                <span className="hr-supporting" style={{color:b.latitude?T.color.navy:T.color.textMuted}}>
                  {savingLocationId===b.id ? 'جاري تحديد الموقع...' : b.latitude ? 'تم تحديد الموقع — إعادة الضبط' : 'حدّد موقع الفرع'}
                </span>
              </StorelyButton>
            ))}
          </div>
        </StorelyCard>
      )}

      {showReport && (
        <StorelyCard className="hr-workspace hr-report">
          <div className="hr-report-header">
            <div className="hr-section-title" style={{color:T.color.text}}>تقرير الموظفين الشهري</div>
            <input className="hr-control" type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} />
          </div>
          {loadingReport ? (
            <div className="hr-supporting" style={{color:T.color.textMuted}}>جاري تحميل التقرير...</div>
          ) : reportData.length===0 ? (
            <div className="hr-inline-empty" style={{color:T.color.textMuted}}>ما فيه بيانات لهذا الشهر</div>
          ) : (
            <div className="hr-table-scroll">
              <table className="hr-table">
                <thead>
                  <tr>
                    {['الموظف','الراتب الإجمالي','الخصومات','السلف','صافي الراتب','الحضور','التأخير','الإجازات','المهام','التقييم'].map(h=>(
                      <th className="hr-cell" key={h} style={{color:T.color.textMuted}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r:any)=>{
                    const ratingColor = r.rating>=80?colors.primary:r.rating>=50?colors.warning:colors.danger
                    return (
                      <tr key={r.staffId}>
                        <td className="hr-cell" style={{color:T.color.text}}>{r.name}</td>
                        <td className="hr-cell" style={{color:T.color.text}}>{r.grossSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td className="hr-cell" style={{color:T.color.danger}}>{r.deductionsTotal>0?`-${r.deductionsTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td className="hr-cell" style={{color:T.color.danger}}>{r.advancesTotal>0?`-${r.advancesTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})}`:'—'}</td>
                        <td className="hr-cell" style={{color:T.color.navy}}>{r.netSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</td>
                        <td className="hr-cell" style={{color:T.color.text}}>{r.daysPresent}/{r.daysInMonth} ({r.attendanceRate}%)</td>
                        <td className="hr-cell" style={{color:r.lateCount>0?T.color.warning:T.color.text}}>{r.lateCount} مرة</td>
                        <td className="hr-cell" style={{color:T.color.text}}>{r.leaveDaysTaken} يوم (متبقي {r.leaveBalance})</td>
                        <td className="hr-cell" style={{color:T.color.text}}>{r.tasksConfirmed}/{r.tasksTotal} ({r.taskCompletionRate}%)</td>
                        <td className="hr-cell">
                          <span className="hr-rating" style={{color:ratingColor}}>{r.rating}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </StorelyCard>
      )}

      {staff.length===0 ? (
        <StorelyEmptyState className="hr-empty" icon={<Wallet size={20}/>} title={'ما فيه موظفين بعد — أضفهم من صفحة "الموظفون" أول'}/>
      ) : (
        <StorelyCard className="hr-workspace hr-staff-list">
          {staff.map((s:any)=>{
            const isOpen = expandedId===s.id
            const pendingAdvances = adjustments.filter((a:any)=>a.type==='advance'&&a.status==='pending')
            const totalDeducted = adjustments.filter((a:any)=>a.status==='approved').reduce((sum:number,a:any)=>sum+Number(a.amount),0)
            const savedTotal = (Number(s.monthly_salary)||0)+(Number(s.housing_allowance)||0)+(Number(s.transport_allowance)||0)+(Number(s.food_allowance)||0)
            return (
              <div className="hr-record" key={s.id}>
                <div className="hr-record-header" onClick={()=>toggleExpand(s)}>
                  <div>
                    <div className="hr-inline">
                      <div className="hr-supporting" style={{color:T.color.text}}>{s.name}</div>
                      {pendingLeaveCounts[s.id] > 0 && (
                        <span className="hr-count hr-count-danger"  title="عنده طلب إجازة بانتظار الموافقة">
                          {pendingLeaveCounts[s.id]}
                        </span>
                      )}
                      {pendingAdvanceCounts[s.id] > 0 && (
                        <span className="hr-count hr-count-warning"  title="عنده طلب سلفة/خصم بانتظار الموافقة">
                          {pendingAdvanceCounts[s.id]}
                        </span>
                      )}
                    </div>
                    <div className="hr-supporting" style={{color:T.color.textMuted}}>إجمالي الراتب: {savedTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</div>
                  </div>
                  <ChevronDown size={16} color={colors.text3} strokeWidth={2.25} style={{transform:isOpen?'rotate(180deg)':'none'}}/>
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
                    <div className="hr-payroll-summary">
                      {advDeducted > 0 && (
                        <div className="hr-between">
                          <span style={{color:T.color.textMuted}}>سلف مخصومة (معتمدة)</span>
                          <span className="hr-strong" style={{color:T.color.warning}}>−{advDeducted.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                        </div>
                      )}
                      {cashierDeficit > 0 && (
                        <div className="hr-between">
                          <span style={{color:T.color.textMuted}}>عجز إقفال كاشير ({cs?.count} إقفال)</span>
                          <span className="hr-strong" style={{color:T.color.danger}}>−{cashierDeficit.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                        </div>
                      )}
                      {pendingPenalty > 0 && (
                        <div className="hr-between"  onClick={e=>e.stopPropagation()}>
                          <span style={{color:T.color.textMuted}}>غرامات تأخير (لسه ما اتخصمت)</span>
                          <div className="hr-inline">
                            <span className="hr-strong" style={{color:T.color.danger}}>{pendingPenalty.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                            <StorelyButton className="hr-button hr-danger" variant="danger" onClick={()=>applyLatePenalty(s.id)} disabled={applyingPenalty===s.id}>
                              {applyingPenalty===s.id?'...':'طبّقها كخصم'}
                            </StorelyButton>
                          </div>
                        </div>
                      )}
                      <div className="hr-between">
                        <span style={{color:T.color.text}}>الصافي المتوقع</span>
                        <span style={{color:T.color.navy}}>{netSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                      </div>
                    </div>
                  )
                })()}

                {isOpen && (
                  <div className="hr-details">

                    {/* الراتب والبدلات */}
                    <div className="hr-detail-section">
                      <div className="hr-section-title" style={{color:T.color.textMuted}}>الراتب الأساسي والبدلات</div>
                      <div className="hr-fields">
                        <StorelyFormField label={<>الراتب الأساسي</>} htmlFor="hr-salary-1">
                          <input id="hr-salary-1" className="hr-control" type="number" value={salaryForm.base} onChange={e=>setSalaryForm({...salaryForm,base:e.target.value})}  placeholder="0"/>
                        </StorelyFormField>
                        <StorelyFormField label={<>بدل السكن</>} htmlFor="hr-salary-2">
                          <input id="hr-salary-2" className="hr-control" type="number" value={salaryForm.housing} onChange={e=>setSalaryForm({...salaryForm,housing:e.target.value})}  placeholder="0"/>
                        </StorelyFormField>
                        <StorelyFormField label={<>بدل المواصلات</>} htmlFor="hr-salary-3">
                          <input id="hr-salary-3" className="hr-control" type="number" value={salaryForm.transport} onChange={e=>setSalaryForm({...salaryForm,transport:e.target.value})}  placeholder="0"/>
                        </StorelyFormField>
                        <StorelyFormField label={<>بدل الأكل</>} htmlFor="hr-salary-4">
                          <input id="hr-salary-4" className="hr-control" type="number" value={salaryForm.food} onChange={e=>setSalaryForm({...salaryForm,food:e.target.value})}  placeholder="0"/>
                        </StorelyFormField>
                      </div>
                      <div className="hr-salary-total">
                        <span className="hr-strong" style={{color:T.color.navy}}>الإجمالي الشهري</span>
                        <span className="hr-total-value" style={{color:T.color.navy}}>{totalSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                      </div>
                      <StorelyButton className="hr-button hr-primary hr-full" variant="primary" onClick={()=>saveSalary(s.id)} disabled={savingSalary}>{savingSalary?'...':'حفظ الراتب والبدلات'}</StorelyButton>
                    </div>

                    {/* السلف والخصومات */}
                    <div className="hr-detail-section">
                      <div className="hr-section-title" style={{color:T.color.textMuted}}>الخصومات والسلف</div>
                      {loadingAdjustments ? (
                        <div className="hr-supporting" style={{color:T.color.textMuted}}>جاري التحميل...</div>
                      ) : (
                        <>
                          {pendingAdvances.length>0 && (
                            <div className="hr-group">
                              <div className="hr-supporting" style={{color:T.color.warning}}>طلبات سلفة بانتظار الموافقة</div>
                              <div className="hr-list">
                                {pendingAdvances.map((a:any)=>(
                                  <div className="hr-request" key={a.id}>
                                    <div className="hr-between">
                                      <span className="hr-strong" style={{color:T.color.warning}}>{a.amount} {curr}</span>
                                      <span className="hr-supporting" style={{color:T.color.textMuted}}>{new Date(a.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn'})}</span>
                                    </div>
                                    {a.reason && <div className="hr-supporting" style={{color:T.color.textMuted}}>{a.reason}</div>}
                                    <div className="hr-actions">
                                      <StorelyButton className="hr-button hr-primary" variant="primary" onClick={()=>reviewAdvance(s.id,a.id,'approved')}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</StorelyButton>
                                      <StorelyButton className="hr-button hr-danger" variant="danger" onClick={()=>reviewAdvance(s.id,a.id,'rejected')}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</StorelyButton>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="hr-entry-form">
                            <div className="hr-adjustment-fields">
                              <input className="hr-control" type="number" value={newAdjAmount} onChange={e=>setNewAdjAmount(e.target.value)} placeholder="المبلغ" />
                              <input className="hr-control" value={newAdjReason} onChange={e=>setNewAdjReason(e.target.value)} placeholder="السبب (اختياري)" />
                            </div>
                            <StorelyButton className="hr-button hr-full" onClick={()=>addDeduction(s.id)} disabled={savingAdj||!newAdjAmount}>{savingAdj?'...':'+ إضافة خصم'}</StorelyButton>
                          </div>
                          {adjustments.length>0 && (
                            <div className="hr-list">
                              {adjustments.map((a:any)=>(
                                <div className="hr-between" key={a.id} style={{opacity:a.status==='rejected'?0.5:1}}>
                                  <div>
                                    <span className="hr-strong" style={{color:T.color.text}}>{a.type==='advance'?'سلفة':'خصم'}</span>
                                    {a.reason && <span className="hr-supporting" style={{color:T.color.textMuted}}>— {a.reason}</span>}
                                    {a.status==='pending' && <span className="hr-strong" style={{color:T.color.warning}}>(معلّق)</span>}
                                  </div>
                                  <span className="hr-strong" style={{color:T.color.danger}}>-{a.amount} {curr}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* الإجازات */}
                    <div className="hr-detail-section">
                      <div className="hr-inline" style={{color:T.color.textMuted}}>
                        <span className="hr-inline"><CalendarDays size={14} strokeWidth={2.25}/> الإجازات</span>
                        <span className="hr-strong" style={{color:T.color.navy}}>الرصيد المتبقي: {s.leave_balance_days ?? 21} يوم</span>
                      </div>
                      {loadingLeave ? (
                        <div className="hr-supporting" style={{color:T.color.textMuted}}>جاري التحميل...</div>
                      ) : (
                        <>
                          {leaveRequests.filter((l:any)=>l.status==='pending').length>0 && (
                            <div className="hr-list">
                              {leaveRequests.filter((l:any)=>l.status==='pending').map((l:any)=>(
                                <div className="hr-request" key={l.id}>
                                  <div className="hr-between">
                                    <span className="hr-strong" style={{color:T.color.warning}}>{l.days_count} يوم</span>
                                    <span className="hr-supporting" style={{color:T.color.textMuted}}>{l.start_date} → {l.end_date}</span>
                                  </div>
                                  {l.reason && <div className="hr-supporting" style={{color:T.color.textMuted}}>{l.reason}</div>}
                                  <div className="hr-actions">
                                    <StorelyButton className="hr-button hr-primary" variant="primary" onClick={()=>reviewLeave(s.id,l.id,'approved')}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</StorelyButton>
                                    <StorelyButton className="hr-button hr-danger" variant="danger" onClick={()=>reviewLeave(s.id,l.id,'rejected')}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</StorelyButton>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {leaveRequests.length===0 ? (
                            <div className="hr-inline-empty" style={{color:T.color.textMuted}}>ما فيه طلبات إجازة بعد</div>
                          ) : (
                            <div className="hr-list">
                              {leaveRequests.filter((l:any)=>l.status!=='pending').map((l:any)=>(
                                <div className="hr-between" key={l.id}>
                                  <span className="hr-supporting" style={{color:T.color.text}}>{l.start_date} → {l.end_date} ({l.days_count} يوم)</span>
                                  <StorelyStatusBadge status={l.status==='approved'?'success':'danger'} className="hr-strong">{l.status==='approved'?'موافَق':'مرفوض'}</StorelyStatusBadge>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* طلبات الاستئذان */}
                    <div className="hr-detail-section">
                      <div className="hr-section-title" style={{color:T.color.textMuted}}>طلبات الاستئذان (انصراف مبكر)</div>
                      {loadingExcuse ? (
                        <div className="hr-supporting" style={{color:T.color.textMuted}}>جاري التحميل...</div>
                      ) : excuseRequests.filter((e:any)=>e.status==='pending').length===0 ? (
                        <div className="hr-inline-empty" style={{color:T.color.textMuted}}>ما فيه طلبات استئذان معلّقة</div>
                      ) : (
                        <div className="hr-list">
                          {excuseRequests.filter((e:any)=>e.status==='pending').map((e:any)=>(
                            <div className="hr-request" key={e.id}>
                              <div className="hr-supporting" style={{color:T.color.textMuted}}>{e.reason || 'بدون سبب محدد'}</div>
                              <div className="hr-actions">
                                <StorelyButton className="hr-button hr-primary" variant="primary" onClick={()=>reviewExcuse(s.id,e.id,'approve')}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</StorelyButton>
                                <StorelyButton className="hr-button hr-danger" variant="danger" onClick={()=>reviewExcuse(s.id,e.id,'reject')}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</StorelyButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* المهام */}
                    <div className="hr-detail-section">
                      <div className="hr-inline" style={{color:T.color.textMuted}}><ClipboardList size={14} strokeWidth={2.25}/> المهام</div>
                      <div className="hr-entry-form">
                        <input className="hr-control" value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} placeholder="عنوان المهمة" />
                        <input className="hr-control" value={newTaskDesc} onChange={e=>setNewTaskDesc(e.target.value)} placeholder="تفاصيل إضافية (اختياري)" />
                        <label className="hr-label">
                          <input className="hr-checkbox" type="checkbox" checked={newTaskPhoto} onChange={e=>setNewTaskPhoto(e.target.checked)} />
                          <span className="hr-inline" style={{color:T.color.text}}><Camera size={13} strokeWidth={2.25}/> تتطلب صورة إثبات عند الإكمال</span>
                        </label>
                        <StorelyButton className="hr-button hr-full" onClick={()=>createTask(s.id)} disabled={savingTask||!newTaskTitle.trim()}><Plus size={14} strokeWidth={2.25}/> إنشاء مهمة</StorelyButton>
                      </div>
                      {loadingTasks ? (
                        <div className="hr-supporting" style={{color:T.color.textMuted}}>جاري التحميل...</div>
                      ) : tasks.length===0 ? (
                        <div className="hr-inline-empty" style={{color:T.color.textMuted}}>ما فيه مهام بعد</div>
                      ) : (
                        <div className="hr-list">
                          {tasks.map((t:any)=>{
                            const st = TASK_STATUS_LABEL[t.status] || TASK_STATUS_LABEL.pending
                            return (
                              <div className="hr-task" key={t.id}>
                                <div className="hr-between">
                                  <span className="hr-strong" style={{color:T.color.text}}>
                                    {t.title}
                                    {t.is_daily && <span className="hr-daily-badge" style={{color:T.color.navy}}>🔁 يومية</span>}
                                  </span>
                                  {!t.template_id && !t.is_daily && <StorelyStatusBadge status={t.status==='confirmed'?'success':t.status==='rejected'?'danger':t.status==='completed'?'warning':'info'} className="hr-strong">{st.label}</StorelyStatusBadge>}
                                </div>
                                {t.description && <div className="hr-supporting" style={{color:T.color.textMuted}}>{t.description}</div>}
                                {t.photo_url && (
                                  <a className="hr-link" href={t.photo_url} target="_blank" rel="noreferrer" style={{color:T.color.info}}>عرض صورة الإثبات</a>
                                )}
                                {t.status==='completed' && (
                                  <div className="hr-actions">
                                    <StorelyButton className="hr-button hr-primary" variant="primary" onClick={()=>reviewTask(s.id,t.id,'confirmed')}>تأكيد الإتمام</StorelyButton>
                                    <StorelyButton className="hr-button hr-danger" variant="danger" onClick={()=>reviewTask(s.id,t.id,'rejected')}>رفض</StorelyButton>
                                  </div>
                                )}
                                {!t.template_id && (
                                  <StorelyButton className="hr-button hr-full hr-daily-toggle" aria-pressed={t.is_daily} onClick={()=>toggleDaily(s.id,t.id)}>
                                    {t.is_daily ? 'إيقاف التكرار اليومي' : 'اجعلها مهمة يومية 🔁'}
                                  </StorelyButton>
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
        </StorelyCard>
      )}
    </div>
  )
}
