'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { canCloseCashier } from '@/lib/staffRoles'
import { useEffect, useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { useRouter } from 'next/navigation'
import { Bell, MapPin, PackageMinus, Receipt, ListChecks, FileText, Wallet, Plane, UserCheck, Boxes, ShoppingCart, Clock, LogOut, Check, ChevronLeft } from 'lucide-react'
import { C, card, btnPrimary, btnSecondary, sectionLabel, iconBox, num } from '../_ui/theme'
import { staffHeaderBtn } from '@/components/StaffHeader'
import { getStaffOrg } from '@/lib/session'
import { canCheckOutAt } from '@/lib/attendanceState'
import { useStaffLang } from '@/lib/staffLang'
import { CHOOSE } from '@/lib/staffI18n/choose'
import StaffLangButton from '@/components/StaffLangButton'

export default function ChoosePage() {
  const { t, rtl, dir, locale } = useStaffLang(CHOOSE)
  const router = useRouter()
  const [name, setName] = useState('')
  const [canDispense, setCanDispense] = useState(false)
  const [isCashier, setIsCashier] = useState(false)
  const [canInventory, setCanInventory] = useState(false)
  const [canPurchases, setCanPurchases] = useState(false)
  const [staffData, setStaffData] = useState<any>(null)
  const [todayEvents, setTodayEvents] = useState<any[]>([])
  const [attendanceLocked, setAttendanceLocked] = useState(false)
  const [loadingToday, setLoadingToday] = useState(true)
  const [marking, setMarking] = useState<'check_in'|'check_out'|null>(null)
  const [attError, setAttError] = useState('')
  const [locatingHint, setLocatingHint] = useState('')
  const [shift, setShift] = useState<any>(null)
  const [dayOff, setDayOff] = useState<'weekly'|'leave'|'comp'|'monthly'|null>(null)   // اليوم إجازته (أسبوعية، معتمدة، بديلة، أو خلّص أيام شهره)
  const [permReq, setPermReq] = useState<any>(null)
  const [showPermForm, setShowPermForm] = useState(false)
  const [permReason, setPermReason] = useState('')
  const [submittingPerm, setSubmittingPerm] = useState(false)
  const [taskCount, setTaskCount] = useState(0)
  const [salaryVisible, setSalaryVisible] = useState(false)
  const [hasHrFeature, setHasHrFeature] = useState(false) // مخفي افتراضياً لحد ما يتأكد الفحص — يمنع ظهور الأزرار للحظة ثم اختفائها
  const [hasCashierFeature, setHasCashierFeature] = useState(false) // نفس المبدأ — مخفي لحد ما يتأكد الفحص
  // المخزون والمشتريات مفتوحة لكل الباقات — تنقفل بس لـ «ابنِ باقتك» لو ما اختارها
  const [hasInvFeature, setHasInvFeature] = useState(true)
  const [hasPurFeature, setHasPurFeature] = useState(true)
  const [showRequests, setShowRequests] = useState(false)
  const [requestHistory, setRequestHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showAdvanceForm, setShowAdvanceForm] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [submittingAdvance, setSubmittingAdvance] = useState(false)
  const [advanceMsg, setAdvanceMsg] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showPermRequestModal, setShowPermRequestModal] = useState(false)
  const [orgLogo, setOrgLogo] = useState('')

  // تحديث فوري: لما تتغير البيانات من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(staffData?.org_id, ['staff_notifications','staff_tasks','staff_leave_requests','attendance_permission_requests','staff_payroll_adjustments','staff_attendance'], ()=>{ loadNotifications(); loadTaskCount(); const s=localStorage.getItem('staff_session'); if(s) loadToday(JSON.parse(s)) })
  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setIsCashier(canCloseCashier(parsed))
    setCanInventory(!!parsed.permissions?.inventory)
    setCanPurchases(!!parsed.permissions?.purchases)
    setStaffData(parsed)
    // الصلاحيات من الخادم — لو المالك عدّلها (مثلاً أعطاه إقفال الكاشير) تطلع فوراً بدون تسجيل خروج
    fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('staff_token')}`},body:'{}'})
      .then(r=>r.ok?r.json():null).then(d=>{
        if(!d?.permissions) return
        const fresh={...parsed,permissions:d.permissions}
        localStorage.setItem('staff_session',JSON.stringify(fresh))
        setCanDispense(!!d.permissions.dispense);setCanInventory(!!d.permissions.inventory);setCanPurchases(!!d.permissions.purchases);setIsCashier(canCloseCashier(fresh));setStaffData(fresh)
      }).catch(()=>{})
    loadToday(parsed)
    loadTaskCount()
    loadNotifications()
    getStaffOrg().then(org=>{ if(org?.logo_url) setOrgLogo(org.logo_url) })
    // مهامي وطلباتي جزء من ميزة "إدارة الموظفين" — ما نعرضهم إلا لو الباقة تشملها أو عندهم إضافة hr_full
    getStaffOrg()
      .then((org)=>{
        setSalaryVisible(org?.staff_salary_visible === true)
        // السيرفر يحدد الميزات (الباقة أو الإضافات المشتراة)
        setHasHrFeature(!!org?.hr_feature)
        setHasCashierFeature(!!org?.cashier_feature)
        setHasInvFeature(org?.inventory_feature !== false)
        setHasPurFeature(org?.purchases_feature !== false)
      })
    const interval = setInterval(loadNotifications, 30000) // احتياط — الإشعارات توصل فوراً عبر useLiveRefresh
    // تحديث دوري لحالة الحضور وطلب الاستئذان -- بدونه الموظف يفضل يشوف "قيد الانتظار" حتى لو انوافق عليه فعلياً، لين يسوي رفرش يدوي
    const attendanceInterval = setInterval(()=>loadToday(parsed), 60000)
    return () => { clearInterval(interval); clearInterval(attendanceInterval) }
  },[])

  async function loadNotifications() {
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-notifications', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) setNotifications(j.notifications||[])
    } catch {}
  }

  async function markNotificationsRead() {
    // نحذفها بالخلفية فور فتح النافذة — تفضل ظاهرة بالجلسة الحالية بس تختفي المرة الجاية
    const token = localStorage.getItem('staff_token')
    await fetch('/api/staff-notifications', {
      method:'DELETE', headers:{'Authorization':`Bearer ${token}`},
    }).catch(()=>{})
  }

  async function loadTaskCount() {
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-tasks', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) setTaskCount((j.tasks||[]).filter((t:any)=>t.status==='pending').length)
    } catch {}
  }

  async function loadRequestHistory() {
    if (!staffData) return
    setLoadingHistory(true)
    try {
      const token = localStorage.getItem('staff_token')
      const [advRes, leaveRes, excuseRes] = await Promise.all([
        fetch('/api/staff-payroll-adjustments', { headers: { 'Authorization': `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({success:false})),
        fetch('/api/staff-leave', { headers: { 'Authorization': `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({success:false})),
        fetch(`/api/attendance-permission-request?history=true`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({success:false})),
      ])
      const combined: any[] = []
      if (advRes?.success) for (const a of (advRes.adjustments||[])) {
        if (a.type !== 'advance') continue
        combined.push({ kind:'advance', id:a.id, date:a.created_at, status:a.status, label:t('advanceLabel',{amount:a.amount}) })
      }
      if (leaveRes?.success) for (const l of (leaveRes.requests||[])) {
        combined.push({ kind:'leave', id:l.id, date:l.requested_at, status:l.status, label:t('leaveLabel',{days:l.days_count}) })
      }
      if (excuseRes?.success) for (const ex of (excuseRes.requests||[])) {
        combined.push({ kind:'excuse', id:ex.id, date:ex.requested_at, status:ex.status, label:t('requestExcuse') })
      }
      combined.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
      setRequestHistory(combined.slice(0,20))
    } catch {}
    setLoadingHistory(false)
  }

  async function submitAdvanceRequest() {
    const amt = Number(advanceAmount)
    if (!(amt>0)) { setAdvanceMsg(t('validAmount')); return }
    setSubmittingAdvance(true); setAdvanceMsg('')
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-payroll-adjustments', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ type:'advance', amount: amt, reason: advanceReason || null }),
      })
      const j = await res.json()
      if (!j.success) { setAdvanceMsg(j.error||t('error')); setSubmittingAdvance(false); return }
      setShowAdvanceForm(false); setShowRequests(false)
      setAdvanceAmount(''); setAdvanceReason('')
    } catch { setAdvanceMsg(t('netError')) }
    setSubmittingAdvance(false)
  }

  async function loadToday(parsed:any) {
    try {
      const res = await fetch('/api/staff-attendance', { headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` } })
      const j = await res.json()
      if(j.success) { setTodayEvents(j.today||[]); setShift(j.shift||null); setAttendanceLocked(!!j.locked); setDayOff(j.state?.dayOff || null) }
    } catch {}
    try {
      const pr = await fetch(`/api/attendance-permission-request`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` } })
      const pj = await pr.json()
      if (pj.success) setPermReq(pj.request)
    } catch {}
    setLoadingToday(false)
  }

  async function submitPermissionRequest() {
    if (!staffData) return
    setSubmittingPerm(true)
    try {
      const res = await fetch('/api/attendance-permission-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ reason: permReason }),
      })
      const j = await res.json()
      if (!j.success) { setAttError(j.error || t('sendFailed')); setSubmittingPerm(false); return }
      setPermReq({ status: 'pending', reason: permReason })
      setShowPermForm(false); setPermReason('')
    } catch { setAttError(t('netError')) }
    setSubmittingPerm(false)
  }

  const lastCheckIn = todayEvents.find(e=>e.type==='check_in')
  const lastCheckOut = todayEvents.find(e=>e.type==='check_out')
  const isCheckedIn = !!lastCheckIn && !lastCheckOut

  // يمنع الانصراف قبل نهاية الشفت اللي حضر عليه (نفس قاعدة السيرفر — تغطي الشفت الليلي والحضور المبكر)
  let canCheckOut = true
  let checkOutHint = ''
  if (shift && !shift.is_24h && shift.end_time && lastCheckIn) {
    canCheckOut = canCheckOutAt(Date.now(), Date.parse(lastCheckIn.recorded_at), shift)
    if (!canCheckOut && permReq?.status === 'approved') canCheckOut = true
    if (!canCheckOut) checkOutHint = t('checkOutAt',{time:String(shift.end_time).slice(0,5)})
  }

  // حد أقصى مقبول لدقة GPS (بالمتر) — أي قراءة أسوأ من هذا نعتبرها غير موثوقة
  const MAX_ACCEPTABLE_ACCURACY_M = 100

  function getPositionOnce(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:10000, maximumAge:0 })
    })
  }

  async function markAttendance(type:'check_in'|'check_out') {
    if(!staffData) return
    setAttError('')
    if(!navigator.geolocation) { setAttError(t('geoUnsupported')); return }
    setMarking(type)

    let bestPos: GeolocationPosition | null = null
    const MAX_ATTEMPTS = 3
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setLocatingHint(attempt === 1 ? t('markingLocation') : t('improvingGps',{n:attempt,max:MAX_ATTEMPTS}))
        const pos = await getPositionOnce()
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos
        if (pos.coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) break
        if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1500))
      }
    } catch {
      setLocatingHint('')
      setMarking(null)
      setAttError(t('geoDenied'))
      return
    }
    setLocatingHint('')

    if (!bestPos) { setMarking(null); setAttError(t('geoFailed')); return }
    if (bestPos.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
      setMarking(null)
      setAttError(t('weakGps',{m:Math.round(bestPos.coords.accuracy)}))
      return
    }

    try {
      const res = await fetch('/api/staff-attendance', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('staff_token')}`},
        body: JSON.stringify({
          staff_id: staffData.id, org_id: staffData.org_id, branch_id: staffData.branch_id,
          type, latitude: bestPos.coords.latitude, longitude: bestPos.coords.longitude, accuracy_m: bestPos.coords.accuracy,
        })
      })
      const j = await res.json()
      if(res.status===401) {
        // الجلسة انتهت أو التوكن مفقود — نرجّع الموظف لتسجيل الدخول بدل رسالة محيّرة
        localStorage.removeItem('staff_session'); localStorage.removeItem('staff_token')
        router.push('/staff'); return
      }
      if(!j.success) { setAttError(j.error||t('error')); setMarking(null); return }
      await loadToday(staffData)
    } catch {
      setAttError(t('netError'))
    }
    setMarking(null)
  }

  const isAr = rtl
  const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString(locale, { numberingSystem:'latn', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Riyadh' })
  const todayLabel = new Date().toLocaleDateString(locale, { numberingSystem:'latn', weekday:'long', day:'numeric', month:'long', calendar:'gregory', timeZone:'Asia/Riyadh' })
  const offToday = !!dayOff && !isCheckedIn && !lastCheckOut
  const statusTxt = isCheckedIn ? t('checkedIn') : lastCheckOut ? t('checkedOutToday') : offToday ? t(dayOff === 'leave' ? 'dayOffLeave' : dayOff === 'comp' ? 'dayOffComp' : 'dayOff') : t('notCheckedIn')
  const statusClr = isCheckedIn ? { c:C.accentInk, bg:C.accentSoft, dot:'#15803d' } : lastCheckOut ? { c:'#4b5565', bg:'#eceef1', dot:'#6b7487' } : offToday ? { c:C.t2, bg:C.raised, dot:'#2563eb' } : { c:C.t2, bg:C.raised, dot:'#d97706' }

  // أقسام العمل — صفوف قائمة بأيقونة رمادية (تصميم «كاونتر»)
  const workActions = [
    canDispense && hasInvFeature && { key:'d', icon:<PackageMinus size={18} strokeWidth={1.75}/>, title:t('dispense'), sub:t('dispenseSub'), c:'#0f766e', bg:'#e7f3f1', go:()=>router.push('/staff/dispense') },
    isCashier && hasCashierFeature && { key:'c', icon:<Receipt size={18} strokeWidth={1.75}/>, title:t('cashierClosing'), sub:t('cashierSub'), c:'#1f2937', bg:'#eceef1', go:()=>router.push('/staff/cashier-closing') },
    canInventory && hasInvFeature && { key:'i', icon:<Boxes size={18} strokeWidth={1.75}/>, title:t('inventory'), sub:t('inventorySub'), c:C.t2, bg:C.raised, go:()=>router.push('/staff/inventory') },
    canPurchases && hasPurFeature && { key:'p', icon:<ShoppingCart size={18} strokeWidth={1.75}/>, title:t('purchases'), sub:t('purchasesSub'), c:C.t2, bg:C.raised, go:()=>router.push('/staff/purchases') },
    !(canDispense && hasInvFeature) && !(isCashier && hasCashierFeature) && hasInvFeature && { key:'e', icon:<PackageMinus size={18} strokeWidth={1.75}/>, title:t('enterSystem'), sub:t('dispenseSub'), c:'#0f766e', bg:'#e7f3f1', go:()=>router.push('/staff/dispense') },
  ].filter(Boolean) as { key:string; icon:any; title:string; sub:string; c:string; bg:string; go:()=>void }[]

  const sectionTitle = (txt: string) => (
    <div style={{...sectionLabel,textAlign:isAr?'right':'left'}}>{txt}</div>
  )
  const cardBase: React.CSSProperties = { ...card, overflow:'hidden' }
  const Chevron = () => <ChevronLeft size={16} strokeWidth={1.75} color={C.t3} style={{flexShrink:0,transform:isAr?'none':'scaleX(-1)'}}/>
  const listRow = (i: number, n: number): React.CSSProperties => ({ width:'100%',minHeight:60,background:'white',border:'none',borderTop:i>0?`1px solid ${C.line}`:'none',padding:'10px 16px',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12,textAlign:isAr?'right':'left' })

  return (
    <div style={{minHeight:'100vh',background:'#f4f5f6',display:'flex',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:isAr?'rtl':'ltr'}}>
      <div style={{maxWidth:480,width:'100%',minHeight:'100vh',boxSizing:'border-box' as const,padding:'0 0 32px'}}>

        {/* الهيدر */}
        {/* فاتح مثل لوحة المالك */}
        <div style={{background:'#ffffff',padding:'12px 16px',borderBottom:`1px solid ${C.line}`,color:C.t1,position:'sticky' as const,top:0,zIndex:50}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
              {orgLogo && (
                <div style={{width:36,height:36,borderRadius:10,background:'white',border:`1px solid ${C.line}`,overflow:'hidden' as const,flexShrink:0}}>
                  <img src={orgLogo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                </div>
              )}
              <div style={{textAlign:isAr?'right':'left',minWidth:0}}>
                <div style={{fontSize:17,fontWeight:600,lineHeight:'24px'}}>{todayLabel}</div>
                <div style={{fontSize:13,color:C.t2,lineHeight:'20px',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{ setShowNotifications(true); markNotificationsRead() }} aria-label={t('notifications')}
                style={{...staffHeaderBtn,position:'relative' as const,padding:0}}>
                <Bell size={16} strokeWidth={1.75}/>
                {notifications.some((n:any)=>!n.is_read) && (
                  <span style={{position:'absolute' as const,top:7,insetInlineEnd:8,width:8,height:8,borderRadius:'50%',background:C.neg,border:'2px solid #eceef1'}}/>
                )}
              </button>
              <StaffLangButton/>
            </div>
          </div>
        </div>

        <div style={{padding:'16px 16px 0'}}>

          {/* دوام اليوم */}
          {!loadingToday && !attendanceLocked && (
            <div style={{...card,padding:16,textAlign:isAr?'right':'left'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:600,color:C.t1}}>{t('todayShift')}</div>
                <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:C.t2,whiteSpace:'nowrap' as const}}>
                  <span style={{width:6,height:6,borderRadius:3,background:statusClr.dot}}/>{statusTxt}
                </span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:shift && !shift.is_24h && shift.start_time ? '1fr 1fr 1fr' : '1fr 1fr',border:`1px solid ${C.line}`,borderRadius:10,marginBottom:16,overflow:'hidden'}}>
                {shift && !shift.is_24h && shift.start_time && (
                  <div style={{padding:12,borderInlineStart:`1px solid ${C.line}`,marginInlineStart:-1}}>
                    <div style={{fontSize:12,color:C.t3,marginBottom:4}}>{t('shift')}</div>
                    <div style={{...num,fontSize:15,fontWeight:500,color:C.t1,textAlign:isAr?'right':'left'}}>{String(shift.start_time).slice(0,5)}–{String(shift.end_time||'').slice(0,5)}</div>
                  </div>
                )}
                <div style={{padding:12,borderInlineStart:`1px solid ${C.line}`,marginInlineStart:-1}}>
                  <div style={{fontSize:12,color:C.t3,marginBottom:4}}>{t('checkInTime')}</div>
                  <div style={{...num,fontSize:22,fontWeight:500,color:lastCheckIn?C.t1:C.t3,textAlign:isAr?'right':'left'}}>{lastCheckIn ? fmtClock(lastCheckIn.recorded_at) : '--:--'}</div>
                </div>
                <div style={{padding:12,borderInlineStart:`1px solid ${C.line}`,marginInlineStart:-1}}>
                  <div style={{fontSize:12,color:C.t3,marginBottom:4}}>{t('checkOutTime')}</div>
                  <div style={{...num,fontSize:22,fontWeight:500,color:lastCheckOut?C.t1:C.t3,textAlign:isAr?'right':'left'}}>{lastCheckOut ? fmtClock(lastCheckOut.recorded_at) : '--:--'}</div>
                </div>
              </div>

              {offToday && (
                <div style={{background:'#f4f5f6',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#111827'}}>{t(dayOff === 'leave' ? 'offLeaveTitle' : dayOff === 'comp' ? 'offCompTitle' : dayOff === 'monthly' ? 'offMonthlyTitle' : 'offTitle')}</div>
                  <div style={{fontSize:13,color:'#4b5565',marginTop:4,lineHeight:1.6}}>{t('offNote')}</div>
                </div>
              )}
              {!lastCheckOut && (
                !isCheckedIn ? (
                  <button onClick={()=>markAttendance('check_in')} disabled={marking!==null}
                    style={offToday
                      ? {...btnSecondary,color:C.accentInk,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:marking?0.8:1}
                      : {...btnPrimary,opacity:marking?0.8:1}}>
                    <MapPin size={18} strokeWidth={1.75}/>
                    {marking==='check_in' ? t('markingLocation') : offToday ? t('checkInExtra') : t('checkIn')}
                  </button>
                ) : (
                  <>
                    <button onClick={()=>markAttendance('check_out')} disabled={marking!==null || !canCheckOut}
                      style={{width:'100%',height:48,background:canCheckOut?C.t1:C.raised,color:canCheckOut?'white':C.t2,border:'none',borderRadius:10,fontSize:canCheckOut?16:14,fontWeight:canCheckOut?600:500,cursor:canCheckOut?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:canCheckOut?'0 6px 14px rgba(220,38,38,.22)':'none'}}>
                      {canCheckOut ? <MapPin size={18} strokeWidth={1.75}/> : <Clock size={16} strokeWidth={1.75}/>}
                      {marking==='check_out' ? t('markingLocation') : canCheckOut ? t('checkOut') : (checkOutHint || t('checkOut'))}
                    </button>
                    {!canCheckOut && (
                      permReq?.status === 'pending' ? (
                        <div style={{textAlign:'center' as const,fontSize:12,color:'#b45309',fontWeight:600,marginTop:10,background:'#fffbeb',borderRadius:10,padding:'9px 10px'}}>{t('excuseWaiting')}</div>
                      ) : permReq?.status === 'rejected' ? (
                        <div style={{textAlign:'center' as const,fontSize:12,color:'#dc2626',fontWeight:600,marginTop:10,background:'#fef2f2',borderRadius:10,padding:'9px 10px'}}>{t('excuseRejected')}</div>
                      ) : showPermForm ? (
                        <div style={{marginTop:10}}>
                          <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={2}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid #e5e7eb',borderRadius:12,fontSize:13,fontFamily:'inherit',resize:'vertical' as const,marginBottom:8,boxSizing:'border-box' as const}}/>
                          <div style={{display:'flex',gap:8}}>
                            <button onClick={submitPermissionRequest} disabled={submittingPerm}
                              style={{flex:1,height:42,background:'#0f766e',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                              {submittingPerm ? t('sending') : t('sendRequest')}
                            </button>
                            <button onClick={()=>setShowPermForm(false)} style={{height:42,padding:'0 16px',background:'#eceef1',color:'#4b5565',border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t('cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>setShowPermForm(true)} style={{width:'100%',marginTop:10,height:40,background:'none',color:'#b45309',border:'none',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                          <UserCheck size={14} strokeWidth={2.25}/> {t('askExcuse')}
                        </button>
                      )
                    )}
                  </>
                )
              )}
              {lastCheckOut && (
                <div style={{textAlign:'center' as const,fontSize:12.5,color:'#0f766e',fontWeight:600,background:'#e7f3f1',borderRadius:12,padding:'11px 0',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Check size={15}/>{t('dayDone')}</div>
              )}
              {locatingHint && <div style={{fontSize:11.5,color:'#4b5565',marginTop:10,textAlign:'center' as const,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><MapPin size={13}/>{locatingHint}</div>}
              {attError && <div style={{fontSize:12,color:'#dc2626',marginTop:10,lineHeight:1.6,textAlign:'center' as const,background:'#fef2f2',borderRadius:10,padding:'8px 10px'}}>{attError}</div>}
            </div>
          )}

          {/* العمل */}
          {workActions.length > 0 && sectionTitle(t('work'))}
          {workActions.length > 0 && (
            <div style={cardBase}>
              {workActions.map((a, i) => (
                <button key={a.key} onClick={a.go} style={listRow(i, workActions.length)}>
                  <span style={iconBox}>{a.icon}</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:'block',fontSize:15,fontWeight:500,color:C.t1,lineHeight:'22px'}}>{a.title}</span>
                    <span style={{display:'block',fontSize:13,color:C.t3,lineHeight:'18px'}}>{a.sub}</span>
                  </span>
                  <Chevron/>
                </button>
              ))}
            </div>
          )}

          {/* شؤوني */}
          {hasHrFeature && (
            <>
              {sectionTitle(t('myStuff'))}
              <div style={{...cardBase,overflow:'hidden'}}>
                {[
                  { key:'t', icon:<ListChecks size={18} strokeWidth={1.75}/>, c:C.t2, bg:C.raised, title:t('myTasksLabel'), sub:t('myTasksSub'), badge:taskCount, go:()=>router.push('/staff/tasks') },
                  { key:'r', icon:<FileText size={18} strokeWidth={1.75}/>, c:C.t2, bg:C.raised, title:t('myRequests'), sub:t('myRequestsSub'), badge:0, go:()=>{setShowRequests(true);loadRequestHistory()} },
                  ...(salaryVisible ? [{ key:'s', icon:<Wallet size={18} strokeWidth={1.75}/>, c:C.t2, bg:C.raised, title:t('payslip'), sub:t('payslipSub'), badge:0, go:()=>router.push('/staff/salary') }] : []),
                ].map((row, i, arr) => (
                  <button key={row.key} onClick={row.go} style={listRow(i, arr.length)}>
                    <span style={iconBox}>{row.icon}</span>
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{display:'block',fontSize:15,fontWeight:500,color:C.t1,lineHeight:'22px'}}>{row.title}</span>
                      <span style={{display:'block',fontSize:13,color:C.t3,lineHeight:'18px'}}>{row.sub}</span>
                    </span>
                    {row.badge > 0 && <span style={{...num,background:C.t1,color:'white',fontSize:12,fontWeight:500,minWidth:22,height:22,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>{row.badge}</span>}
                    <Chevron/>
                  </button>
                ))}
              </div>
            </>
          )}

          <button onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}}
            style={{...btnSecondary,marginTop:24,height:44,color:C.t2,fontSize:14}}>
            <LogOut size={16} strokeWidth={1.75}/> {t('logout')}
          </button>
        </div>
      </div>

      {/* نافذة طلباتي */}
      {showRequests && !showAdvanceForm && (
        <div onClick={()=>setShowRequests(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:0}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'24px 24px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:420,textAlign:'start' as const}}>
            <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:16}}>{t('myRequests')}</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
              <button onClick={()=>setShowAdvanceForm(true)}
                style={{width:'100%',padding:'16px',background:'#f4f5f6',border:'1.5px solid #e5e7eb',borderRadius:14,fontSize:14,fontWeight:600,color:'#111827',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <Wallet size={18} strokeWidth={2}/> {t('requestAdvance')}
              </button>
              <button onClick={()=>{setShowRequests(false);router.push('/staff/leave')}}
                style={{width:'100%',padding:'16px',background:'#f4f5f6',border:'1.5px solid #e5e7eb',borderRadius:14,fontSize:14,fontWeight:600,color:'#111827',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <Plane size={18} strokeWidth={2}/> {t('requestLeave')}
              </button>
              <button onClick={()=>{setShowRequests(false);setShowPermRequestModal(true)}}
                style={{width:'100%',padding:'16px',background:'#f4f5f6',border:'1.5px solid #e5e7eb',borderRadius:14,fontSize:14,fontWeight:600,color:'#111827',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <UserCheck size={18} strokeWidth={2}/> {t('requestExcuse')}
              </button>
            </div>

            {/* سجل الطلبات السابقة -- كل الأنواع الثلاثة مع حالتها */}
            <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid #eceef1'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#4b5565',marginBottom:10}}>{t('history')}</div>
              {loadingHistory ? (
                <div style={{fontSize:12,color:'#4b5565',textAlign:'center' as const,padding:'12px 0'}}>{t('loading')}</div>
              ) : requestHistory.length===0 ? (
                <div style={{fontSize:12,color:'#4b5565',textAlign:'center' as const,padding:'12px 0'}}>{t('noHistory')}</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column' as const,gap:6,maxHeight:220,overflowY:'auto' as const}}>
                  {requestHistory.map((r:any)=>{
                    const statusStyle = r.status==='approved'||r.status==='approve' ? {bg:'#f0fdf4',color:'#16a34a',label:t('approved')}
                      : r.status==='rejected'||r.status==='reject' ? {bg:'#fef2f2',color:'#dc2626',label:t('rejected')}
                      : {bg:'#fffbeb',color:'#d97706',label:t('pending')}
                    return (
                      <div key={r.kind+r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#f4f5f6',borderRadius:10}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'#111827'}}>{r.label}</div>
                          <div style={{fontSize:10,color:'#4b5565',marginTop:1}}>{new Date(r.date).toLocaleDateString(locale,{numberingSystem:'latn',day:'numeric',month:'short'})}</div>
                        </div>
                        <span style={{fontSize:12,fontWeight:500,color:statusStyle.color,background:statusStyle.bg,padding:'2px 8px',borderRadius:6}}>{statusStyle.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button onClick={()=>setShowRequests(false)} style={{width:'100%',padding:'12px',marginTop:14,background:'none',border:'none',color:'#4b5565',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {/* نموذج طلب السلفة */}
      {showAdvanceForm && (
        <div onClick={()=>{setShowAdvanceForm(false);setShowRequests(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,textAlign:'start' as const}}>
            <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:16}}>{t('advanceTitle')}</div>
            <label style={{fontSize:12,color:'#4b5565',display:'block',marginBottom:6}}>{t('amount')}</label>
            <NumberInput value={advanceAmount} onChange={e=>setAdvanceAmount(e.target.value)} placeholder="0"
              style={{width:'100%',padding:'12px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:16,fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:12}}/>
            <label style={{fontSize:12,color:'#4b5565',display:'block',marginBottom:6}}>{t('reasonOptional')}</label>
            <textarea value={advanceReason} onChange={e=>setAdvanceReason(e.target.value)} placeholder={t('advanceReasonPh')}
              style={{width:'100%',padding:'12px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const,minHeight:60,resize:'none' as const,marginBottom:12}}/>
            {advanceMsg && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{advanceMsg}</div>}
            <button onClick={submitAdvanceRequest} disabled={submittingAdvance||!advanceAmount}
              style={{width:'100%',padding:'12px',background:(submittingAdvance||!advanceAmount)?'#6b7487':'#0f766e',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:(submittingAdvance||!advanceAmount)?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:8}}>
              {submittingAdvance?t('sending'):t('sendRequest')}
            </button>
            <button onClick={()=>setShowAdvanceForm(false)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:'#4b5565',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}

      {/* نموذج طلب استئذان مستقل (يشتغل بأي حالة، مو بس أثناء الحضور) */}
      {showPermRequestModal && (
        <div onClick={()=>setShowPermRequestModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,textAlign:'start' as const}}>
            <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:4}}>{t('excuseTitle')}</div>
            <p style={{fontSize:12,color:'#4b5565',marginBottom:16}}>{t('excuseDesc')}</p>
            {permReq?.status === 'pending' ? (
              <div style={{textAlign:'center' as const,fontSize:13,color:'#d97706',fontWeight:600,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px'}}>{t('excusePending')}</div>
            ) : (
              <>
                <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={3}
                  style={{width:'100%',padding:'12px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:13,fontFamily:'inherit',resize:'none' as const,marginBottom:12,boxSizing:'border-box' as const}}/>
                {attError && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{attError}</div>}
                <button onClick={async ()=>{ await submitPermissionRequest(); setShowPermRequestModal(false) }} disabled={submittingPerm}
                  style={{width:'100%',padding:'12px',background:submittingPerm?'#6b7487':'#0f766e',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:submittingPerm?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:8}}>
                  {submittingPerm?t('sending'):t('sendRequest')}
                </button>
              </>
            )}
            <button onClick={()=>setShowPermRequestModal(false)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:'#4b5565',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}

      {/* نافذة الإشعارات */}
      {showNotifications && (
        <div onClick={()=>setShowNotifications(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:220,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:0}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'24px 24px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:420,maxHeight:'75vh',overflowY:'auto' as const,textAlign:'start' as const}}>
            <div style={{fontSize:16,fontWeight:600,color:'#111827',marginBottom:16}}>{t('notifications')}</div>
            {notifications.length===0 ? (
              <div style={{textAlign:'center' as const,padding:'30px 0',fontSize:13,color:'#4b5565'}}>{t('noNotifications')}</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                {notifications.map((n:any)=>{
                  const bg = n.type==='success'?'#e7f3f1':n.type==='danger'?'#fef2f2':n.type==='warning'?'#fffbeb':'#f4f5f6'
                  const border = n.type==='success'?'#b9dcd7':n.type==='danger'?'#fecaca':n.type==='warning'?'#fde68a':'#e5e7eb'
                  return (
                    <div key={n.id} style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#111827',marginBottom:4}}>{n.title}</div>
                      <div style={{fontSize:12,color:'#4b5565',lineHeight:1.6}}>{n.message}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={()=>setShowNotifications(false)} style={{width:'100%',padding:'12px',marginTop:16,background:'#eceef1',color:'#1f2937',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
