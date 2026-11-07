'use client'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Boxes, CircleX, ClipboardList, Clock3, MapPin, Package, Plane, Send, ShoppingCart, Store, UserCheck, Wallet, UserRound } from 'lucide-react'
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

  return (
    <div className="min-h-screen !p-4 sm:!p-8 flex flex-col items-center text-[var(--storely-navy)]" style={{background:uiTokens.color.background, direction:lang==='en'?'ltr':'rtl'}}>
      <div className="storely-card !p-5 sm:!p-8 max-w-4xl w-full text-center relative flex flex-col text-[var(--storely-navy)]" style={{background:uiTokens.color.surface}}>
        <div className="flex justify-between items-center !mb-2 flex-wrap gap-4">
          <StorelyButton onClick={()=>{
              const nl=lang==='ar'?'en':'ar'; setLang(nl); localStorage.setItem('staff_lang',nl)
              const token = localStorage.getItem('staff_token')
              fetch('/api/staff-set-lang',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({lang:nl})}).catch(()=>{})
            }} variant="secondary">
            {lang==='ar'?'EN':'عربي'}
          </StorelyButton>
          <StorelyButton onClick={()=>{ setShowNotifications(true); markNotificationsRead() }} className="relative flex items-center justify-center !px-0" style={{width:40, height:40}} variant="secondary">
            <Bell size={17} strokeWidth={2.25}/>
            {notifications.some((n:any)=>!n.is_read) && (
              <span className="absolute rounded-full" style={{top:-2, left:-2, width:10, height:10, background:uiTokens.color.danger, border:'2px solid white'}}/>
            )}
          </StorelyButton>
        </div>
        <div className="rounded-[var(--radius)] flex items-center justify-center !mt-0 !mx-auto !mb-4" style={{width:60, height:60, background:orgLogo ? uiTokens.color.surface : uiTokens.color.surface, border:orgLogo ? `1px solid ${uiTokens.color.border}` : 'none', boxShadow:uiTokens.shadow.surface, overflow:'hidden' as const}}>
          {orgLogo ? (
            <img src={orgLogo} alt="" className="w-full object-cover" style={{height:'100%'}}/>
          ) : (
            <span className="text-2xl font-semibold" style={{color:uiTokens.color.navy}}>{name?.trim()?.[0] || <UserRound size={24}/>}</span>
          )}
        </div>
        <StorelyPageHeader title={<> {t('welcome')} {name} </>} className="!mb-2" />
        <p className="text-sm !mb-6" style={{color:uiTokens.color.textMuted}}>{t('chooseTask')}</p>

        {/* تسجيل الحضور والانصراف */}
        {!loadingToday && !attendanceLocked && (
          <div className="rounded-[var(--radius)] !p-4 !mb-6 text-right" style={{background:isCheckedIn ? uiTokens.color.surface : uiTokens.color.background, border:`1.5px solid ${isCheckedIn ? uiTokens.color.successBorder : uiTokens.color.border}`}}>
            {/* حالة الموظف الآن */}
            <div className="flex items-center justify-end gap-2 !mb-3">
              <span className="text-sm font-semibold" style={{color:isCheckedIn ? uiTokens.color.success : uiTokens.color.textMuted}}>
                {isCheckedIn ? t('checkedIn') : lastCheckOut ? t('checkedOutToday') : t('notCheckedIn')}
              </span>
              <span className="rounded-full" style={{width:9, height:9, background:isCheckedIn ? uiTokens.color.success : lastCheckOut ? uiTokens.color.background : uiTokens.color.warning, boxShadow:uiTokens.shadow.surface}}/>
            </div>

            {/* أوقات الحضور والانصراف */}
            {(lastCheckIn || lastCheckOut) && (
              <div className="flex gap-2 !mb-4">
                {lastCheckIn && (
                  <StorelyCard className="min-w-0 flex-1 rounded-[var(--radius)] !py-2 !px-3" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                    <div className="text-xs font-semibold !mb-1" style={{color:uiTokens.color.textMuted}}>{t('checkInTime')}</div>
                    <div className="text-base font-semibold" style={{color:uiTokens.color.text}}>{new Date(lastCheckIn.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </StorelyCard>
                )}
                {lastCheckOut && (
                  <StorelyCard className="min-w-0 flex-1 rounded-[var(--radius)] !py-2 !px-3" style={{background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
                    <div className="text-xs font-semibold !mb-1" style={{color:uiTokens.color.textMuted}}>{t('checkOutTime')}</div>
                    <div className="text-base font-semibold" style={{color:uiTokens.color.text}}>{new Date(lastCheckOut.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </StorelyCard>
                )}
              </div>
            )}

            {/* الزر الرئيسي */}
            {!lastCheckOut && (
              !isCheckedIn ? (
                <StorelyButton onClick={()=>markAttendance('check_in')} disabled={marking!==null} className="w-full flex items-center justify-center gap-2" variant="primary">
                  <span className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.surface}}><MapPin size={14} strokeWidth={2.25}/></span>
                  {marking==='check_in' ? t('markingLocation') : t('checkIn')}
                </StorelyButton>
              ) : (
                <>
                  <StorelyButton onClick={()=>markAttendance('check_out')} disabled={marking!==null || !canCheckOut} className="w-full flex items-center justify-center gap-2" style={{background:canCheckOut ? uiTokens.color.surface : uiTokens.color.background}} variant="danger">
                    <span className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.surface}}><MapPin size={14} strokeWidth={2.25}/></span>
                    {marking==='check_out' ? t('markingLocation') : t('checkOut')}
                  </StorelyButton>
                  {!canCheckOut && checkOutHint && (
                    <div className="text-center text-xs font-semibold !mt-2" style={{color:uiTokens.color.textMuted}}><Clock3 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {checkOutHint}</div>
                  )}
                  {!canCheckOut && (
                    permReq?.status === 'pending' ? (
                      <div className="text-center text-sm font-semibold !mt-2 rounded-[var(--radius-sm)] !py-2 !px-2" style={{color:uiTokens.color.warning, background:uiTokens.color.warningBg, border:`1px solid ${uiTokens.color.warningBorder}`}}><Clock3 size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> طلب الاستئذان بانتظار رد المالك</div>
                    ) : permReq?.status === 'rejected' ? (
                      <div className="text-center text-sm font-semibold !mt-2 rounded-[var(--radius-sm)] !py-2 !px-2" style={{color:uiTokens.color.danger, background:uiTokens.color.dangerBg, border:`1px solid ${uiTokens.color.dangerBorder}`}}><CircleX size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> تم رفض طلب الاستئذان</div>
                    ) : showPermForm ? (
                      <div className="!mt-2">
                        <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={2} className="w-full rounded-[var(--radius-sm)] text-sm resize-y !mb-2 storely-input min-w-0 !h-auto" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                        <div className="flex flex-wrap gap-3">
                          <StorelyButton onClick={submitPermissionRequest} disabled={submittingPerm} className="min-w-0 flex-1" variant="primary">
                            {submittingPerm ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </StorelyButton>
                          <StorelyButton onClick={()=>setShowPermForm(false)} variant="secondary">إلغاء</StorelyButton>
                        </div>
                      </div>
                    ) : (
                      <StorelyButton onClick={()=>setShowPermForm(true)} className="w-full !mt-2" variant="secondary">
                        <UserCheck  size={13} strokeWidth={2.25} className="!ml-1" style={{display:'inline', verticalAlign:'-2px'}}/> طلب استئذان (ظرف طارئ)
                      </StorelyButton>
                    )
                  )}
                </>
              )
            )}
            {lastCheckOut && (
              <div className="text-center text-xs font-semibold !py-1 !px-0" style={{color:uiTokens.color.textMuted}}>✓ اكتمل دوامك لهذا اليوم</div>
            )}
            {locatingHint && <div className="text-xs !mt-2 text-center" style={{color:uiTokens.color.textMuted}}><MapPin size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> {locatingHint}</div>}
            {attError && <div className="text-xs !mt-2 text-center" style={{color:uiTokens.color.danger, lineHeight:1.6}}>{attError}</div>}
          </div>
        )}

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {canDispense && (
            <StorelyButton onClick={()=>router.push('/staff/dispense')} className="w-full !h-auto !min-h-28 !p-5 !justify-start gap-4 text-start" variant="secondary">
              <span className="rounded-[var(--radius)] flex items-center justify-center shrink-0" style={{width:44, height:44, background:uiTokens.color.surface}}><Package size={22} strokeWidth={2}/></span>
              <div className="text-right">
                <div className="text-base font-semibold">{t('dispense')}</div>
                <div className="text-sm" style={{opacity:.8}}>{t('dispenseSub')}</div>
              </div>
            </StorelyButton>
          )}
          {isCashier && hasCashierFeature && (
            <StorelyButton onClick={()=>router.push('/staff/cashier-closing')} className="w-full flex items-center justify-center gap-3" variant="primary">
              <span className="rounded-[var(--radius)] flex items-center justify-center shrink-0" style={{width:44, height:44, background:uiTokens.color.surface}}><Store size={22} strokeWidth={2}/></span>
              <div className="text-right">
                <div className="text-base font-semibold">{t('cashierClosing')}</div>
                <div className="text-sm" style={{opacity:.8}}>{t('cashierSub')}</div>
              </div>
            </StorelyButton>
          )}
          {canInventory && (
            <StorelyButton onClick={()=>router.push('/staff/inventory')} className="w-full flex items-center justify-center gap-3" variant="primary">
              <span className="rounded-[var(--radius)] flex items-center justify-center shrink-0" style={{width:44, height:44, background:uiTokens.color.surface}}><Boxes size={22} strokeWidth={2}/></span>
              <div className="text-right">
                <div className="text-base font-semibold">{t('inventory')}</div>
                <div className="text-sm" style={{opacity:.8}}>{t('inventorySub')}</div>
              </div>
            </StorelyButton>
          )}
          {canPurchases && (
            <StorelyButton onClick={()=>router.push('/staff/purchases')} className="w-full flex items-center justify-center gap-3" variant="primary">
              <span className="rounded-[var(--radius)] flex items-center justify-center shrink-0" style={{width:44, height:44, background:uiTokens.color.surface}}><ShoppingCart size={22} strokeWidth={2}/></span>
              <div className="text-right">
                <div className="text-base font-semibold">{t('purchases')}</div>
                <div className="text-sm" style={{opacity:.8}}>{t('purchasesSub')}</div>
              </div>
            </StorelyButton>
          )}
          {!canDispense && !isCashier && (
            <StorelyButton onClick={()=>router.push('/staff/dispense')} className="w-full flex items-center justify-center gap-3" variant="primary">
              <span className="text-[28px]"><Package size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></span>
              <div className="text-right">
                <div className="text-base font-semibold">{t('enterSystem')}</div>
              </div>
            </StorelyButton>
          )}
        </div>
        {hasHrFeature && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 !mt-3">
          <StorelyButton onClick={()=>router.push('/staff/tasks')} className="relative flex flex-col items-center gap-2" variant="secondary">
            {taskCount>0 && (
              <span className="absolute text-xs font-semibold rounded-[var(--radius)] flex items-center justify-center !py-0 !px-1" style={{top:6, left:6, background:uiTokens.color.danger, color:uiTokens.color.onPrimary, minWidth:20, height:18}}>{taskCount}</span>
            )}
            <span className="rounded-[var(--radius)] flex items-center justify-center" style={{width:38, height:38, background:uiTokens.color.surface, color:uiTokens.color.navy}}><ClipboardList size={19} strokeWidth={2}/></span>
            {t('myTasksLabel')}
          </StorelyButton>
          <StorelyButton onClick={()=>{setShowRequests(true);loadRequestHistory()}} className="flex flex-col items-center gap-2" variant="secondary">
            <span className="rounded-[var(--radius)] flex items-center justify-center" style={{width:38, height:38, background:uiTokens.color.infoBg, color:uiTokens.color.info}}><Send size={19} strokeWidth={2}/></span>
            {t('myRequests')}
          </StorelyButton>
        </div>
        )}

        <StorelyButton onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}} className="!mt-5" variant="secondary">
          {t('logout')}
        </StorelyButton>
      </div>

      {/* نافذة طلباتي */}
      {showRequests && !showAdvanceForm && (
        <div onClick={()=>setShowRequests(false)} className="fixed flex items-end justify-center !p-0 overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:200}}>
          <div onClick={e=>e.stopPropagation()} className="rounded-[var(--radius)] !pt-6 !px-5 !pb-8 w-full max-w-lg text-right" style={{background:uiTokens.color.surface}}>
            <div className="text-base font-semibold !mb-4" style={{color:uiTokens.color.text}}>{t('myRequests')}</div>
            <div className="flex flex-col gap-2">
              <StorelyButton onClick={()=>setShowAdvanceForm(true)} className="w-full flex items-center gap-3" variant="secondary">
                <Wallet size={18} strokeWidth={2}/> {t('requestAdvance')}
              </StorelyButton>
              <StorelyButton onClick={()=>{setShowRequests(false);router.push('/staff/leave')}} className="w-full flex items-center gap-3" variant="secondary">
                <Plane size={18} strokeWidth={2}/> {t('requestLeave')}
              </StorelyButton>
              <StorelyButton onClick={()=>{setShowRequests(false);setShowPermRequestModal(true)}} className="w-full flex items-center gap-3" variant="secondary">
                <UserCheck size={18} strokeWidth={2}/> {t('requestExcuse')}
              </StorelyButton>
            </div>

            {/* سجل الطلبات السابقة -- كل الأنواع الثلاثة مع حالتها */}
            <div className="!mt-4 !pt-4" style={{borderTop:`1px solid ${uiTokens.color.border}`}}>
              <div className="text-sm font-semibold !mb-2" style={{color:uiTokens.color.textMuted}}>سجل طلباتي</div>
              {loadingHistory ? (
                <div className="text-sm text-center !py-3 !px-0" style={{color:uiTokens.color.textMuted}}>جاري التحميل...</div>
              ) : requestHistory.length===0 ? (
                <div className="text-sm text-center !py-3 !px-0" style={{color:uiTokens.color.textMuted}}>ما فيه طلبات سابقة بعد</div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto" style={{maxHeight:220}}>
                  {requestHistory.map((r:any)=>{
                    const statusStyle = r.status==='approved'||r.status==='approve' ? {bg:'#f0fdf4',color:'#16a34a',label:'مقبول'}
                      : r.status==='rejected'||r.status==='reject' ? {bg:'#fef2f2',color:'#dc2626',label:'مرفوض'}
                      : {bg:'#fffbeb',color:'#d97706',label:'قيد الانتظار'}
                    return (
                      <div key={r.kind+r.id} className="flex justify-between items-center !py-2 !px-2 rounded-[var(--radius-sm)] flex-wrap gap-4" style={{background:uiTokens.color.background}}>
                        <div>
                          <div className="text-sm font-semibold" style={{color:uiTokens.color.text}}>{r.label}</div>
                          <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{new Date(r.date).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}</div>
                        </div>
                        <span className="text-xs font-semibold !py-1 !px-2 rounded-[var(--radius)]" style={{color:statusStyle.color, background:statusStyle.bg}}>{statusStyle.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <StorelyButton onClick={()=>setShowRequests(false)} className="w-full !mt-3" variant="secondary">{t('cancel')}</StorelyButton>
          </div>
        </div>
      )}

      {/* نموذج طلب السلفة */}
      {showAdvanceForm && (
        <div onClick={()=>{setShowAdvanceForm(false);setShowRequests(false)}} className="fixed flex items-center justify-center !p-5 overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:210}}>
          <StorelyCard onClick={e=>e.stopPropagation()} className="min-w-0 max-h-[90dvh] overflow-y-auto rounded-[var(--radius)] !p-6 w-full max-w-lg text-right" style={{background:uiTokens.color.surface}}>
            <div className="text-base font-semibold !mb-4" style={{color:uiTokens.color.text}}>{t('advanceTitle')}</div>
            <label className="text-sm block !mb-1" style={{color:uiTokens.color.textMuted}}>{t('amount')}</label>
            <input type="number" value={advanceAmount} onChange={e=>setAdvanceAmount(e.target.value)} placeholder="0" className="w-full rounded-[var(--radius-sm)] !text-base !mb-3 storely-input min-w-0" style={{border:`1px solid ${uiTokens.color.border}`}}/>
            <label className="text-sm block !mb-1" style={{color:uiTokens.color.textMuted}}>{t('reasonOptional')}</label>
            <textarea value={advanceReason} onChange={e=>setAdvanceReason(e.target.value)} placeholder={t('advanceReasonPh')} className="w-full rounded-[var(--radius-sm)] text-sm resize-y !mb-3 storely-input min-w-0 !h-auto" style={{border:`1px solid ${uiTokens.color.border}`, minHeight:60}}/>
            {advanceMsg && <div className="text-sm !mb-2" style={{color:uiTokens.color.danger}}>{advanceMsg}</div>}
            <StorelyButton onClick={submitAdvanceRequest} disabled={submittingAdvance||!advanceAmount} className="w-full !mb-2" variant="primary">
              {submittingAdvance?t('sending'):t('sendRequest')}
            </StorelyButton>
            <StorelyButton onClick={()=>setShowAdvanceForm(false)} className="w-full" variant="secondary">{t('back')}</StorelyButton>
          </StorelyCard>
        </div>
      )}

      {/* نموذج طلب استئذان مستقل (يشتغل بأي حالة، مو بس أثناء الحضور) */}
      {showPermRequestModal && (
        <div onClick={()=>setShowPermRequestModal(false)} className="fixed flex items-center justify-center !p-5 overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:210}}>
          <StorelyCard onClick={e=>e.stopPropagation()} className="min-w-0 max-h-[90dvh] overflow-y-auto rounded-[var(--radius)] !p-6 w-full max-w-lg text-right" style={{background:uiTokens.color.surface}}>
            <div className="text-base font-semibold !mb-1" style={{color:uiTokens.color.text}}>{t('excuseTitle')}</div>
            <p className="text-sm !mb-4" style={{color:uiTokens.color.textMuted}}>{t('excuseDesc')}</p>
            {permReq?.status === 'pending' ? (
              <div className="text-center text-sm font-semibold rounded-[var(--radius-sm)] !p-3" style={{color:uiTokens.color.warning, background:uiTokens.color.warningBg, border:`1px solid ${uiTokens.color.warningBorder}`}}>{t('excusePending')}</div>
            ) : (
              <>
                <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={3} className="w-full rounded-[var(--radius-sm)] text-sm resize-y !mb-3 storely-input min-w-0 !h-auto" style={{border:`1px solid ${uiTokens.color.border}`}}/>
                {attError && <div className="text-sm !mb-2" style={{color:uiTokens.color.danger}}>{attError}</div>}
                <StorelyButton onClick={async ()=>{ await submitPermissionRequest(); setShowPermRequestModal(false) }} disabled={submittingPerm} className="w-full !mb-2" variant="secondary">
                  {submittingPerm?t('sending'):t('sendRequest')}
                </StorelyButton>
              </>
            )}
            <StorelyButton onClick={()=>setShowPermRequestModal(false)} className="w-full" variant="secondary">{t('back')}</StorelyButton>
          </StorelyCard>
        </div>
      )}

      {/* نافذة الإشعارات */}
      {showNotifications && (
        <div onClick={()=>setShowNotifications(false)} className="fixed flex items-end justify-center !p-0 overflow-y-auto" style={{inset:0, background:uiTokens.color.backdrop, zIndex:220}}>
          <div onClick={e=>e.stopPropagation()} className="rounded-[var(--radius)] !pt-6 !px-5 !pb-8 w-full max-w-lg overflow-y-auto" style={{background:uiTokens.color.surface, maxHeight:'75vh', textAlign:lang==='en'?'left' as const:'right' as const}}>
            <div className="text-base font-semibold !mb-4" style={{color:uiTokens.color.text}}>{t('notifications')}</div>
            {notifications.length===0 ? (
              <div className="text-center !py-8 !px-0 text-sm" style={{color:uiTokens.color.textMuted}}>{t('noNotifications')}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {notifications.map((n:any)=>{
                  const bg = n.type==='success'?'#f0fdfa':n.type==='danger'?'#fef2f2':n.type==='warning'?'#fffbeb':'#f8fafc'
                  const border = n.type==='success'?'#99f6e4':n.type==='danger'?'#fecaca':n.type==='warning'?'#fde68a':'#e2e8f0'
                  return (
                    <div key={n.id} className="rounded-[var(--radius)] !py-3 !px-3" style={{background:bg, border:`1px solid ${border}`}}>
                      <div className="text-sm font-semibold !mb-1" style={{color:uiTokens.color.text}}>{n.title}</div>
                      <div className="text-sm" style={{color:uiTokens.color.textMuted, lineHeight:1.6}}>{n.message}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <StorelyButton onClick={()=>setShowNotifications(false)} className="w-full !mt-4" variant="secondary">{t('back')}</StorelyButton>
          </div>
        </div>
      )}
    </div>
  )
}
