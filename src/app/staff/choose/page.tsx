'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MapPin, Package, Store, ClipboardList, Send, Wallet, Plane, UserCheck, Boxes, ShoppingCart, Clock, LogOut } from 'lucide-react'
import { getStaffOrg } from '@/lib/session'

const CS: Record<string, Record<'ar'|'en', string>> = {
  welcome:        { ar:'أهلاً', en:'Welcome' },
  chooseTask:     { ar:'اختر الوظيفة التي تريد القيام بها', en:'Choose what you want to do' },
  checkedIn:      { ar:'أنت حاضر الآن', en:"You're checked in" },
  checkedOutToday:{ ar:'انصرفت اليوم', en:'You checked out today' },
  notCheckedIn:   { ar:'ما سجّلت حضورك بعد', en:"You haven't checked in yet" },
  checkInTime:    { ar:'وقت الحضور', en:'Check-in time' },
  checkOutTime:   { ar:'وقت الانصراف', en:'Check-out time' },
  checkIn:        { ar:'تسجيل حضور', en:'Check In' },
  checkOut:       { ar:'تسجيل انصراف', en:'Check Out' },
  markingLocation:{ ar:'جاري تحديد موقعك...', en:'Getting your location...' },
  dispense:       { ar:'صرف المخزون', en:'Dispense Stock' },
  dispenseSub:    { ar:'تسجيل صرف المنتجات', en:'Record product dispensing' },
  cashierClosing: { ar:'إقفال الكاشير', en:'Cashier Closing' },
  cashierSub:     { ar:'تقرير نهاية اليوم', en:'End of day report' },
  inventory:      { ar:'المخزون', en:'Inventory' },
  inventorySub:   { ar:'عرض وتعديل الأصناف', en:'View and edit items' },
  purchases:      { ar:'المشتريات', en:'Purchases' },
  purchasesSub:   { ar:'تسجيل فواتير الشراء', en:'Record purchase invoices' },
  enterSystem:    { ar:'الدخول للنظام', en:'Enter System' },
  myTasksLabel:   { ar:'مهامي', en:'My Tasks' },
  myRequests:     { ar:'طلباتي', en:'My Requests' },
  logout:         { ar:'خروج', en:'Logout' },
  requestAdvance: { ar:'طلب سلفة', en:'Request Advance' },
  requestLeave:   { ar:'طلب إجازة', en:'Request Leave' },
  requestExcuse:  { ar:'طلب استئذان', en:'Request Early Leave' },
  cancel:         { ar:'إلغاء', en:'Cancel' },
  back:           { ar:'رجوع', en:'Back' },
  advanceTitle:   { ar:'طلب سلفة', en:'Advance Request' },
  amount:         { ar:'المبلغ', en:'Amount' },
  reasonOptional: { ar:'السبب (اختياري)', en:'Reason (optional)' },
  advanceReasonPh:{ ar:'سبب طلب السلفة...', en:'Reason for the advance...' },
  sendRequest:    { ar:'إرسال الطلب', en:'Send Request' },
  sending:        { ar:'جاري الإرسال...', en:'Sending...' },
  excuseTitle:    { ar:'طلب استئذان', en:'Early Leave Request' },
  excuseDesc:     { ar:'يوصل طلبك للمالك عبر واتساب ليوافق أو يرفض', en:'Your request will reach the owner via WhatsApp for approval' },
  excusePending:  { ar:'⏳ عندك طلب استئذان بانتظار رد المالك بالفعل', en:'⏳ You already have a pending early-leave request' },
  excuseReasonPh: { ar:'سبب الاستئذان (اختياري)...', en:'Reason for early leave (optional)...' },
  notifications:  { ar:'الإشعارات', en:'Notifications' },
  noNotifications:{ ar:'ما فيه إشعارات بعد', en:'No notifications yet' },
}

export default function ChoosePage() {
  const [lang, setLang] = useState<'ar'|'en'>('ar')
  function t(key: string) { return CS[key]?.[lang] || key }
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
  const [permReq, setPermReq] = useState<any>(null)
  const [showPermForm, setShowPermForm] = useState(false)
  const [permReason, setPermReason] = useState('')
  const [submittingPerm, setSubmittingPerm] = useState(false)
  const [taskCount, setTaskCount] = useState(0)
  const [salaryVisible, setSalaryVisible] = useState(false)
  const [hasHrFeature, setHasHrFeature] = useState(false) // مخفي افتراضياً لحد ما يتأكد الفحص — يمنع ظهور الأزرار للحظة ثم اختفائها
  const [hasCashierFeature, setHasCashierFeature] = useState(false) // نفس المبدأ — مخفي لحد ما يتأكد الفحص
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

  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setIsCashier(parsed.role==='cashier')
    setCanInventory(!!parsed.permissions?.inventory)
    setCanPurchases(!!parsed.permissions?.purchases)
    setStaffData(parsed)
    loadToday(parsed)
    loadTaskCount()
    loadNotifications()
    getStaffOrg().then(org=>{ if(org?.logo_url) setOrgLogo(org.logo_url) })
    // مهامي وطلباتي جزء من ميزة "إدارة الموظفين" — ما نعرضهم إلا لو الباقة تشملها أو عندهم إضافة hr_full
    getStaffOrg()
      .then(async (org)=>{
        setSalaryVisible(org?.staff_salary_visible === true)
        if (org?.plan !== 'basic') { setHasHrFeature(true); setHasCashierFeature(true); return }
        const j = await fetch(`/api/addons-market?org_id=${parsed.org_id}`).then(r=>r.json()).catch(()=>null)
        const addon = (j?.addons||[]).find((a:any)=>a.slug==='hr_full')
        setHasHrFeature(!!addon?.subscription?.isValid)
        const cashierAddon = (j?.addons||[]).find((a:any)=>a.slug==='cashier_closing')
        setHasCashierFeature(!!cashierAddon?.subscription?.isValid)
      })
    const savedLang = localStorage.getItem('staff_lang')
    if (savedLang === 'en') setLang('en')
    const interval = setInterval(loadNotifications, 5000) // مسرّع لـ5 ثوانٍ (شبه لحظي) بدل 30 — نظام الموظف يستخدم توكن مخصص مو حساب Supabase عادي، فما نقدر نستخدم Realtime مباشر بأمان هنا
    // تحديث دوري لحالة الحضور وطلب الاستئذان -- بدونه الموظف يفضل يشوف "قيد الانتظار" حتى لو انوافق عليه فعلياً، لين يسوي رفرش يدوي
    const attendanceInterval = setInterval(()=>loadToday(parsed), 15000)
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
        fetch(`/api/attendance-permission-request?staff_id=${staffData.id}&history=true`).then(r=>r.json()).catch(()=>({success:false})),
      ])
      const combined: any[] = []
      if (advRes?.success) for (const a of (advRes.adjustments||[])) {
        if (a.type !== 'advance') continue
        combined.push({ kind:'advance', id:a.id, date:a.created_at, status:a.status, label:`طلب سلفة ${a.amount} ر.س` })
      }
      if (leaveRes?.success) for (const l of (leaveRes.requests||[])) {
        combined.push({ kind:'leave', id:l.id, date:l.requested_at, status:l.status, label:`طلب إجازة ${l.days_count} يوم` })
      }
      if (excuseRes?.success) for (const ex of (excuseRes.requests||[])) {
        combined.push({ kind:'excuse', id:ex.id, date:ex.requested_at, status:ex.status, label:'طلب استئذان' })
      }
      combined.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
      setRequestHistory(combined.slice(0,20))
    } catch {}
    setLoadingHistory(false)
  }

  async function submitAdvanceRequest() {
    const amt = Number(advanceAmount)
    if (!(amt>0)) { setAdvanceMsg('أدخل مبلغ صحيح'); return }
    setSubmittingAdvance(true); setAdvanceMsg('')
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-payroll-adjustments', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ type:'advance', amount: amt, reason: advanceReason || null }),
      })
      const j = await res.json()
      if (!j.success) { setAdvanceMsg(j.error||'حدث خطأ'); setSubmittingAdvance(false); return }
      setShowAdvanceForm(false); setShowRequests(false)
      setAdvanceAmount(''); setAdvanceReason('')
    } catch { setAdvanceMsg('حدث خطأ بالاتصال') }
    setSubmittingAdvance(false)
  }

  async function loadToday(parsed:any) {
    try {
      const res = await fetch('/api/staff-attendance', { headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` } })
      const j = await res.json()
      if(j.success) { setTodayEvents(j.today||[]); setShift(j.shift||null); setAttendanceLocked(!!j.locked) }
    } catch {}
    try {
      const pr = await fetch(`/api/attendance-permission-request?staff_id=${parsed.id}`)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: staffData.org_id, branch_id: staffData.branch_id, staff_id: staffData.id, staff_name: staffData.name, reason: permReason }),
      })
      const j = await res.json()
      if (!j.success) { setAttError(j.error || 'فشل إرسال الطلب'); setSubmittingPerm(false); return }
      setPermReq({ status: 'pending', reason: permReason })
      setShowPermForm(false); setPermReason('')
    } catch { setAttError('حدث خطأ بالاتصال') }
    setSubmittingPerm(false)
  }

  const lastCheckIn = todayEvents.find(e=>e.type==='check_in')
  const lastCheckOut = todayEvents.find(e=>e.type==='check_out')
  const isCheckedIn = !!lastCheckIn && !lastCheckOut

  // يمنع الانصراف قبل الوقت المحدد بالشفت (إلا لو الشفت 24 ساعة أو ما فيه شفت مخصص)
  let canCheckOut = true
  let checkOutHint = ''
  if (shift && !shift.is_24h && shift.end_time) {
    const now = new Date()
    const saudiMinutes = ((now.getUTCHours()+3)%24)*60 + now.getUTCMinutes()
    const [eh, em] = String(shift.end_time).slice(0,5).split(':').map(Number)
    const endMinutes = eh*60 + em
    const [sh2, sm2] = String(shift.start_time||'00:00').slice(0,5).split(':').map(Number)
    const startMinutes = sh2*60 + sm2
    const isOvernight = endMinutes <= startMinutes
    canCheckOut = isOvernight
      ? (saudiMinutes >= endMinutes && saudiMinutes < startMinutes)
      : (saudiMinutes >= endMinutes)
    if (!canCheckOut && permReq?.status === 'approved') canCheckOut = true
    if (!canCheckOut) checkOutHint = `زر الانصراف يفعّل الساعة ${String(shift.end_time).slice(0,5)}`
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
    if(!navigator.geolocation) { setAttError('المتصفح ما يدعم تحديد الموقع'); return }
    setMarking(type)

    let bestPos: GeolocationPosition | null = null
    const MAX_ATTEMPTS = 3
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setLocatingHint(attempt === 1 ? 'جاري تحديد موقعك...' : `جاري تحسين دقة الموقع (محاولة ${attempt}/${MAX_ATTEMPTS})...`)
        const pos = await getPositionOnce()
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos
        if (pos.coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) break
        if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1500))
      }
    } catch {
      setLocatingHint('')
      setMarking(null)
      setAttError('تعذر الوصول لموقعك — تأكد من السماح للمتصفح بالوصول للموقع')
      return
    }
    setLocatingHint('')

    if (!bestPos) { setMarking(null); setAttError('تعذر تحديد موقعك'); return }
    if (bestPos.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
      setMarking(null)
      setAttError(`إشارة GPS ضعيفة (دقة ${Math.round(bestPos.coords.accuracy)} متر) — جرّب تطلع لمكان مفتوح بعيد عن الجدران وحاول مرة ثانية`)
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
      if(!j.success) { setAttError(j.error||'حدث خطأ'); setMarking(null); return }
      await loadToday(staffData)
    } catch {
      setAttError('حدث خطأ بالاتصال')
    }
    setMarking(null)
  }

  const isAr = lang === 'ar'
  const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA', { numberingSystem:'latn', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Riyadh' })
  const todayLabel = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { numberingSystem:'latn', weekday:'long', day:'numeric', month:'long', calendar:'gregory', timeZone:'Asia/Riyadh' })
  const statusTxt = isCheckedIn ? t('checkedIn') : lastCheckOut ? t('checkedOutToday') : t('notCheckedIn')
  const statusClr = isCheckedIn ? { c:'#0f766e', bg:'#ecfdf5', dot:'#10b981' } : lastCheckOut ? { c:'#475569', bg:'#f1f5f9', dot:'#94a3b8' } : { c:'#b45309', bg:'#fffbeb', dot:'#f59e0b' }

  // أزرار العمل — نفس الشكل للكل، اللون بس بالأيقونة
  const workActions = [
    canDispense && { key:'d', icon:<Package size={20} strokeWidth={2}/>, title:t('dispense'), sub:t('dispenseSub'), c:'#0f766e', bg:'#f0fdfa', go:()=>router.push('/staff/dispense') },
    isCashier && hasCashierFeature && { key:'c', icon:<Store size={20} strokeWidth={2}/>, title:t('cashierClosing'), sub:t('cashierSub'), c:'#334155', bg:'#f1f5f9', go:()=>router.push('/staff/cashier-closing') },
    canInventory && { key:'i', icon:<Boxes size={20} strokeWidth={2}/>, title:t('inventory'), sub:t('inventorySub'), c:'#6d28d9', bg:'#f5f3ff', go:()=>router.push('/staff/inventory') },
    canPurchases && { key:'p', icon:<ShoppingCart size={20} strokeWidth={2}/>, title:t('purchases'), sub:t('purchasesSub'), c:'#1d4ed8', bg:'#eff6ff', go:()=>router.push('/staff/purchases') },
    !canDispense && !isCashier && { key:'e', icon:<Package size={20} strokeWidth={2}/>, title:t('enterSystem'), sub:t('dispenseSub'), c:'#0f766e', bg:'#f0fdfa', go:()=>router.push('/staff/dispense') },
  ].filter(Boolean) as { key:string; icon:any; title:string; sub:string; c:string; bg:string; go:()=>void }[]

  const sectionTitle = (txt: string) => (
    <div style={{fontSize:12,fontWeight:700,color:'#64748b',margin:'22px 4px 10px',textAlign:isAr?'right':'left'}}>{txt}</div>
  )
  const cardBase: React.CSSProperties = { background:'white', border:'1px solid #e8ecf1', borderRadius:16, boxShadow:'0 1px 2px rgba(16,24,40,.04)' }
  const Chevron = () => <span style={{color:'#cbd5e1',fontSize:18,lineHeight:1,transform:isAr?'none':'scaleX(-1)'}}>‹</span>

  return (
    <div style={{minHeight:'100vh',background:'#f4f6f8',display:'flex',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:isAr?'rtl':'ltr'}}>
      <div style={{maxWidth:480,width:'100%',minHeight:'100vh',boxSizing:'border-box' as const,padding:'0 0 32px'}}>

        {/* الهيدر */}
        <div style={{background:'linear-gradient(160deg,#0b3b3a 0%,#0f766e 100%)',padding:'18px 20px 64px',borderRadius:'0 0 28px 28px',color:'white'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:46,height:46,borderRadius:14,background:orgLogo?'white':'rgba(255,255,255,.14)',border:'1px solid rgba(255,255,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' as const,flexShrink:0}}>
                {orgLogo ? <img src={orgLogo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:19,fontWeight:800}}>{name?.trim()?.[0] || '👤'}</span>}
              </div>
              <div style={{textAlign:isAr?'right':'left'}}>
                <div style={{fontSize:12,opacity:.75,fontWeight:500}}>{t('welcome')} 👋</div>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:'-.2px'}}>{name}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{
                  const nl=lang==='ar'?'en':'ar'; setLang(nl); localStorage.setItem('staff_lang',nl)
                  const token = localStorage.getItem('staff_token')
                  fetch('/api/staff-set-lang',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({lang:nl})}).catch(()=>{})
                }}
                style={{height:38,padding:'0 12px',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,fontSize:12,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'inherit'}}>
                {isAr?'EN':'عربي'}
              </button>
              <button onClick={()=>{ setShowNotifications(true); markNotificationsRead() }} aria-label={t('notifications')}
                style={{position:'relative' as const,width:38,height:38,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white'}}>
                <Bell size={17} strokeWidth={2.25}/>
                {notifications.some((n:any)=>!n.is_read) && (
                  <span style={{position:'absolute' as const,top:7,insetInlineEnd:8,width:8,height:8,borderRadius:'50%',background:'#f87171',border:'2px solid #0f766e'}}/>
                )}
              </button>
            </div>
          </div>
        </div>

        <div style={{padding:'0 16px',marginTop:-44}}>

          {/* دوام اليوم */}
          {!loadingToday && !attendanceLocked && (
            <div style={{...cardBase,padding:18,textAlign:isAr?'right':'left',boxShadow:'0 8px 24px rgba(15,23,42,.08)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:14}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{isAr?'دوام اليوم':"Today's shift"}</div>
                  <div style={{fontSize:11.5,color:'#94a3b8',marginTop:2}}>{todayLabel}</div>
                </div>
                <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11.5,fontWeight:700,color:statusClr.c,background:statusClr.bg,padding:'5px 10px',borderRadius:99,whiteSpace:'nowrap' as const}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:statusClr.dot,boxShadow:isCheckedIn?'0 0 0 3px rgba(16,185,129,.2)':'none'}}/>{statusTxt}
                </span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:shift && !shift.is_24h && shift.start_time ? '1fr 1fr 1fr' : '1fr 1fr',gap:8,marginBottom:16}}>
                {shift && !shift.is_24h && shift.start_time && (
                  <div style={{background:'#f8fafc',borderRadius:12,padding:'10px 12px'}}>
                    <div style={{fontSize:10.5,color:'#94a3b8',fontWeight:600,marginBottom:3}}>{isAr?'الشفت':'Shift'}</div>
                    <div style={{fontSize:13,fontWeight:800,color:'#334155',direction:'ltr',textAlign:isAr?'right':'left'}}>{String(shift.start_time).slice(0,5)}–{String(shift.end_time||'').slice(0,5)}</div>
                  </div>
                )}
                <div style={{background:'#f8fafc',borderRadius:12,padding:'10px 12px'}}>
                  <div style={{fontSize:10.5,color:'#94a3b8',fontWeight:600,marginBottom:3}}>{t('checkInTime')}</div>
                  <div style={{fontSize:15,fontWeight:800,color:lastCheckIn?'#0f172a':'#cbd5e1'}}>{lastCheckIn ? fmtClock(lastCheckIn.recorded_at) : '--:--'}</div>
                </div>
                <div style={{background:'#f8fafc',borderRadius:12,padding:'10px 12px'}}>
                  <div style={{fontSize:10.5,color:'#94a3b8',fontWeight:600,marginBottom:3}}>{t('checkOutTime')}</div>
                  <div style={{fontSize:15,fontWeight:800,color:lastCheckOut?'#0f172a':'#cbd5e1'}}>{lastCheckOut ? fmtClock(lastCheckOut.recorded_at) : '--:--'}</div>
                </div>
              </div>

              {!lastCheckOut && (
                !isCheckedIn ? (
                  <button onClick={()=>markAttendance('check_in')} disabled={marking!==null}
                    style={{width:'100%',height:52,background:'#0f766e',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 6px 14px rgba(15,118,110,.25)',opacity:marking?0.8:1}}>
                    <MapPin size={17} strokeWidth={2.25}/>
                    {marking==='check_in' ? t('markingLocation') : t('checkIn')}
                  </button>
                ) : (
                  <>
                    <button onClick={()=>markAttendance('check_out')} disabled={marking!==null || !canCheckOut}
                      style={{width:'100%',height:52,background:canCheckOut?'#dc2626':'#f1f5f9',color:canCheckOut?'white':'#94a3b8',border:canCheckOut?'none':'1px dashed #cbd5e1',borderRadius:14,fontSize:canCheckOut?15:13.5,fontWeight:canCheckOut?800:700,cursor:canCheckOut?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:canCheckOut?'0 6px 14px rgba(220,38,38,.22)':'none'}}>
                      {canCheckOut ? <MapPin size={17} strokeWidth={2.25}/> : <Clock size={16} strokeWidth={2.25}/>}
                      {marking==='check_out' ? t('markingLocation') : canCheckOut ? t('checkOut') : (checkOutHint || t('checkOut'))}
                    </button>
                    {!canCheckOut && (
                      permReq?.status === 'pending' ? (
                        <div style={{textAlign:'center' as const,fontSize:12,color:'#b45309',fontWeight:700,marginTop:10,background:'#fffbeb',borderRadius:10,padding:'9px 10px'}}>⏳ طلب الاستئذان بانتظار رد المالك</div>
                      ) : permReq?.status === 'rejected' ? (
                        <div style={{textAlign:'center' as const,fontSize:12,color:'#dc2626',fontWeight:700,marginTop:10,background:'#fef2f2',borderRadius:10,padding:'9px 10px'}}>تم رفض طلب الاستئذان</div>
                      ) : showPermForm ? (
                        <div style={{marginTop:10}}>
                          <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={2}
                            style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:12,fontSize:13,fontFamily:'inherit',resize:'vertical' as const,marginBottom:8,boxSizing:'border-box' as const}}/>
                          <div style={{display:'flex',gap:8}}>
                            <button onClick={submitPermissionRequest} disabled={submittingPerm}
                              style={{flex:1,height:42,background:'#0f766e',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                              {submittingPerm ? 'جاري الإرسال...' : 'إرسال الطلب'}
                            </button>
                            <button onClick={()=>setShowPermForm(false)} style={{height:42,padding:'0 16px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>setShowPermForm(true)} style={{width:'100%',marginTop:10,height:40,background:'none',color:'#b45309',border:'none',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                          <UserCheck size={14} strokeWidth={2.25}/> عندك ظرف طارئ؟ اطلب استئذان
                        </button>
                      )
                    )}
                  </>
                )
              )}
              {lastCheckOut && (
                <div style={{textAlign:'center' as const,fontSize:12.5,color:'#0f766e',fontWeight:700,background:'#f0fdfa',borderRadius:12,padding:'11px 0'}}>✓ اكتمل دوامك لهذا اليوم</div>
              )}
              {locatingHint && <div style={{fontSize:11.5,color:'#64748b',marginTop:10,textAlign:'center' as const}}>📍 {locatingHint}</div>}
              {attError && <div style={{fontSize:12,color:'#dc2626',marginTop:10,lineHeight:1.6,textAlign:'center' as const,background:'#fef2f2',borderRadius:10,padding:'8px 10px'}}>{attError}</div>}
            </div>
          )}

          {/* العمل */}
          {workActions.length > 0 && sectionTitle(isAr ? 'العمل' : 'Work')}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {workActions.map((a, i) => (
              <button key={a.key} onClick={a.go}
                style={{...cardBase,gridColumn: workActions.length % 2 === 1 && i === workActions.length - 1 ? '1 / -1' : undefined,padding:'16px 14px',cursor:'pointer',fontFamily:'inherit',textAlign:isAr?'right':'left',display:'flex',flexDirection:'column' as const,alignItems:'flex-start',gap:12,minHeight:118}}>
                <span style={{width:42,height:42,borderRadius:12,background:a.bg,color:a.c,display:'flex',alignItems:'center',justifyContent:'center'}}>{a.icon}</span>
                <span>
                  <span style={{display:'block',fontSize:14.5,fontWeight:800,color:'#0f172a'}}>{a.title}</span>
                  <span style={{display:'block',fontSize:11.5,color:'#94a3b8',marginTop:3,lineHeight:1.5}}>{a.sub}</span>
                </span>
              </button>
            ))}
          </div>

          {/* شؤوني */}
          {hasHrFeature && (
            <>
              {sectionTitle(isAr ? 'شؤوني' : 'My stuff')}
              <div style={{...cardBase,overflow:'hidden'}}>
                {[
                  { key:'t', icon:<ClipboardList size={18} strokeWidth={2}/>, c:'#0f766e', bg:'#f0fdfa', title:t('myTasksLabel'), sub:isAr?'المهام المطلوبة منك':'Tasks assigned to you', badge:taskCount, go:()=>router.push('/staff/tasks') },
                  { key:'r', icon:<Send size={18} strokeWidth={2}/>, c:'#2563eb', bg:'#eff6ff', title:t('myRequests'), sub:isAr?'سلفة، إجازة، استئذان':'Advance, leave, early leave', badge:0, go:()=>{setShowRequests(true);loadRequestHistory()} },
                  ...(salaryVisible ? [{ key:'s', icon:<Wallet size={18} strokeWidth={2}/>, c:'#b45309', bg:'#fffbeb', title:isAr?'راتبي':'My salary', sub:isAr?'الراتب والخصومات والأوفر تايم':'Salary, deductions & overtime', badge:0, go:()=>router.push('/staff/salary') }] : []),
                ].map((row, i, arr) => (
                  <button key={row.key} onClick={row.go}
                    style={{width:'100%',background:'white',border:'none',borderBottom:i<arr.length-1?'1px solid #f1f5f9':'none',padding:'14px 16px',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12,textAlign:isAr?'right':'left'}}>
                    <span style={{width:38,height:38,borderRadius:11,background:row.bg,color:row.c,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{row.icon}</span>
                    <span style={{flex:1,minWidth:0}}>
                      <span style={{display:'block',fontSize:14,fontWeight:700,color:'#0f172a'}}>{row.title}</span>
                      <span style={{display:'block',fontSize:11.5,color:'#94a3b8',marginTop:2}}>{row.sub}</span>
                    </span>
                    {row.badge > 0 && <span style={{background:'#dc2626',color:'white',fontSize:11,fontWeight:800,minWidth:20,height:20,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>{row.badge}</span>}
                    <Chevron/>
                  </button>
                ))}
              </div>
            </>
          )}

          <button onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}}
            style={{width:'100%',marginTop:22,height:46,background:'white',border:'1px solid #e8ecf1',borderRadius:14,color:'#64748b',fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <LogOut size={16} strokeWidth={2}/> {t('logout')}
          </button>
        </div>
      </div>

      {/* نافذة طلباتي */}
      {showRequests && !showAdvanceForm && (
        <div onClick={()=>setShowRequests(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:0}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'24px 24px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:420,textAlign:'right' as const}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>{t('myRequests')}</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
              <button onClick={()=>setShowAdvanceForm(true)}
                style={{width:'100%',padding:'16px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:700,color:'#1c1c1a',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <Wallet size={18} strokeWidth={2}/> {t('requestAdvance')}
              </button>
              <button onClick={()=>{setShowRequests(false);router.push('/staff/leave')}}
                style={{width:'100%',padding:'16px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:700,color:'#1c1c1a',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <Plane size={18} strokeWidth={2}/> {t('requestLeave')}
              </button>
              <button onClick={()=>{setShowRequests(false);setShowPermRequestModal(true)}}
                style={{width:'100%',padding:'16px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:14,fontSize:14,fontWeight:700,color:'#1c1c1a',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                <UserCheck size={18} strokeWidth={2}/> {t('requestExcuse')}
              </button>
            </div>

            {/* سجل الطلبات السابقة -- كل الأنواع الثلاثة مع حالتها */}
            <div style={{marginTop:18,paddingTop:16,borderTop:'1px solid #f1f5f9'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:10}}>سجل طلباتي</div>
              {loadingHistory ? (
                <div style={{fontSize:12,color:'#94a3b8',textAlign:'center' as const,padding:'12px 0'}}>جاري التحميل...</div>
              ) : requestHistory.length===0 ? (
                <div style={{fontSize:12,color:'#94a3b8',textAlign:'center' as const,padding:'12px 0'}}>ما فيه طلبات سابقة بعد</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column' as const,gap:6,maxHeight:220,overflowY:'auto' as const}}>
                  {requestHistory.map((r:any)=>{
                    const statusStyle = r.status==='approved'||r.status==='approve' ? {bg:'#f0fdf4',color:'#16a34a',label:'مقبول'}
                      : r.status==='rejected'||r.status==='reject' ? {bg:'#fef2f2',color:'#dc2626',label:'مرفوض'}
                      : {bg:'#fffbeb',color:'#d97706',label:'قيد الانتظار'}
                    return (
                      <div key={r.kind+r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#f8fafc',borderRadius:10}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'#1c1c1a'}}>{r.label}</div>
                          <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{new Date(r.date).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}</div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:statusStyle.color,background:statusStyle.bg,padding:'3px 9px',borderRadius:99}}>{statusStyle.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button onClick={()=>setShowRequests(false)} style={{width:'100%',padding:'12px',marginTop:14,background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {/* نموذج طلب السلفة */}
      {showAdvanceForm && (
        <div onClick={()=>{setShowAdvanceForm(false);setShowRequests(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:20,padding:24,width:'100%',maxWidth:360,textAlign:'right' as const}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>{t('advanceTitle')}</div>
            <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:6}}>{t('amount')}</label>
            <input type="number" value={advanceAmount} onChange={e=>setAdvanceAmount(e.target.value)} placeholder="0"
              style={{width:'100%',padding:'12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:16,fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:12}}/>
            <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:6}}>{t('reasonOptional')}</label>
            <textarea value={advanceReason} onChange={e=>setAdvanceReason(e.target.value)} placeholder={t('advanceReasonPh')}
              style={{width:'100%',padding:'12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const,minHeight:60,resize:'none' as const,marginBottom:12}}/>
            {advanceMsg && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{advanceMsg}</div>}
            <button onClick={submitAdvanceRequest} disabled={submittingAdvance||!advanceAmount}
              style={{width:'100%',padding:'12px',background:(submittingAdvance||!advanceAmount)?'#94a3b8':'#029FA2',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:(submittingAdvance||!advanceAmount)?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:8}}>
              {submittingAdvance?t('sending'):t('sendRequest')}
            </button>
            <button onClick={()=>setShowAdvanceForm(false)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}

      {/* نموذج طلب استئذان مستقل (يشتغل بأي حالة، مو بس أثناء الحضور) */}
      {showPermRequestModal && (
        <div onClick={()=>setShowPermRequestModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:20,padding:24,width:'100%',maxWidth:360,textAlign:'right' as const}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>{t('excuseTitle')}</div>
            <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>{t('excuseDesc')}</p>
            {permReq?.status === 'pending' ? (
              <div style={{textAlign:'center' as const,fontSize:13,color:'#d97706',fontWeight:700,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px'}}>{t('excusePending')}</div>
            ) : (
              <>
                <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={3}
                  style={{width:'100%',padding:'12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',resize:'none' as const,marginBottom:12,boxSizing:'border-box' as const}}/>
                {attError && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{attError}</div>}
                <button onClick={async ()=>{ await submitPermissionRequest(); setShowPermRequestModal(false) }} disabled={submittingPerm}
                  style={{width:'100%',padding:'12px',background:submittingPerm?'#94a3b8':'#029FA2',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:submittingPerm?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:8}}>
                  {submittingPerm?t('sending'):t('sendRequest')}
                </button>
              </>
            )}
            <button onClick={()=>setShowPermRequestModal(false)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}

      {/* نافذة الإشعارات */}
      {showNotifications && (
        <div onClick={()=>setShowNotifications(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:220,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:0}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'24px 24px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:420,maxHeight:'75vh',overflowY:'auto' as const,textAlign:lang==='en'?'left' as const:'right' as const}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>{t('notifications')}</div>
            {notifications.length===0 ? (
              <div style={{textAlign:'center' as const,padding:'30px 0',fontSize:13,color:'#94a3b8'}}>{t('noNotifications')}</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                {notifications.map((n:any)=>{
                  const bg = n.type==='success'?'#f0fdfa':n.type==='danger'?'#fef2f2':n.type==='warning'?'#fffbeb':'#f8fafc'
                  const border = n.type==='success'?'#99f6e4':n.type==='danger'?'#fecaca':n.type==='warning'?'#fde68a':'#e2e8f0'
                  return (
                    <div key={n.id} style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:4}}>{n.title}</div>
                      <div style={{fontSize:12,color:'#475569',lineHeight:1.6}}>{n.message}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={()=>setShowNotifications(false)} style={{width:'100%',padding:'12px',marginTop:16,background:'#f1f5f9',color:'#334155',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('back')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
