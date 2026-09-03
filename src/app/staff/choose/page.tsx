'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MapPin, Package, CalendarDays, Store, ClipboardList, Send, Wallet, Plane, UserCheck, Boxes, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  reservations:   { ar:'الحجوزات', en:'Reservations' },
  reservationsSub:{ ar:'متابعة حجوزات اليوم', en:"Track today's reservations" },
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
  const [canReservations, setCanReservations] = useState(false)
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
  const [showRequests, setShowRequests] = useState(false)
  const [showAdvanceForm, setShowAdvanceForm] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [submittingAdvance, setSubmittingAdvance] = useState(false)
  const [advanceMsg, setAdvanceMsg] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showPermRequestModal, setShowPermRequestModal] = useState(false)
  const [orgLogo, setOrgLogo] = useState('')
  const sb = createClient()

  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setCanReservations(!!parsed.permissions?.reservations)
    setIsCashier(parsed.role==='cashier')
    setCanInventory(!!parsed.permissions?.inventory)
    setCanPurchases(!!parsed.permissions?.purchases)
    setStaffData(parsed)
    loadToday(parsed)
    loadTaskCount()
    loadNotifications()
    sb.from('organizations' as any).select('logo_url').eq('id',parsed.org_id).single()
      .then(({data}:any)=>{ if(data?.logo_url) setOrgLogo(data.logo_url) })
    const savedLang = localStorage.getItem('staff_lang')
    if (savedLang === 'en') setLang('en')
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
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
      const res = await fetch(`/api/staff-attendance?staff_id=${parsed.id}&org_id=${parsed.org_id}`)
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
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          staff_id: staffData.id, org_id: staffData.org_id, branch_id: staffData.branch_id,
          type, latitude: bestPos.coords.latitude, longitude: bestPos.coords.longitude, accuracy_m: bestPos.coords.accuracy,
        })
      })
      const j = await res.json()
      if(!j.success) { setAttError(j.error||'حدث خطأ'); setMarking(null); return }
      await loadToday(staffData)
    } catch {
      setAttError('حدث خطأ بالاتصال')
    }
    setMarking(null)
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#042f2e,#0C213B)',display:'flex',flexDirection:'column' as const,alignItems:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:lang==='en'?'ltr':'rtl'}}>
      <div style={{background:'white',borderRadius:0,padding:'32px 24px 40px',maxWidth:480,width:'100%',minHeight:'100vh',boxSizing:'border-box' as const,textAlign:'center',position:'relative' as const,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <button onClick={()=>{
              const nl=lang==='ar'?'en':'ar'; setLang(nl); localStorage.setItem('staff_lang',nl)
              const token = localStorage.getItem('staff_token')
              fetch('/api/staff-set-lang',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({lang:nl})}).catch(()=>{})
            }}
            style={{background:'#f1f5f9',border:'none',borderRadius:20,padding:'6px 12px',fontSize:12,fontWeight:700,color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>
            {lang==='ar'?'EN':'عربي'}
          </button>
          <button onClick={()=>{ setShowNotifications(true); markNotificationsRead() }}
            style={{position:'relative' as const,background:'#f1f5f9',border:'none',borderRadius:'50%',width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}}>
            <Bell size={17} strokeWidth={2.25}/>
            {notifications.some((n:any)=>!n.is_read) && (
              <span style={{position:'absolute' as const,top:-2,left:-2,width:10,height:10,borderRadius:'50%',background:'#dc2626',border:'2px solid white'}}/>
            )}
          </button>
        </div>
        <div style={{width:60,height:60,borderRadius:18,background: orgLogo ? 'white' : 'linear-gradient(135deg,#029FA2,#0f766e)',border: orgLogo ? '1px solid #e5e7eb' : 'none',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow: orgLogo ? '0 4px 12px rgba(0,0,0,.08)' : '0 8px 20px rgba(22,163,74,.28)',overflow:'hidden' as const}}>
          {orgLogo ? (
            <img src={orgLogo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          ) : (
            <span style={{fontSize:24,fontWeight:800,color:'white'}}>{name?.trim()?.[0] || '👤'}</span>
          )}
        </div>
        <h2 style={{fontSize:21,fontWeight:800,color:'#0f172a',marginBottom:5,letterSpacing:'-.2px'}}>{t('welcome')} {name}</h2>
        <p style={{fontSize:13.5,color:'#94a3b8',marginBottom:28}}>{t('chooseTask')}</p>

        {/* تسجيل الحضور والانصراف */}
        {!loadingToday && !attendanceLocked && (
          <div style={{
            background: isCheckedIn ? 'linear-gradient(135deg,#f0fdfa,#f0fdfa)' : '#f8fafc',
            border: `1.5px solid ${isCheckedIn ? '#99f6e4' : '#e2e8f0'}`,
            borderRadius: 18, padding: 18, marginBottom: 24, textAlign: 'right'
          }}>
            {/* حالة الموظف الآن */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:800,color: isCheckedIn ? '#0f766e' : '#64748b'}}>
                {isCheckedIn ? t('checkedIn') : lastCheckOut ? t('checkedOutToday') : t('notCheckedIn')}
              </span>
              <span style={{
                width:9,height:9,borderRadius:'50%',
                background: isCheckedIn ? '#029FA2' : lastCheckOut ? '#94a3b8' : '#f59e0b',
                boxShadow: isCheckedIn ? '0 0 0 4px rgba(22,163,74,.15)' : 'none',
              }}/>
            </div>

            {/* أوقات الحضور والانصراف */}
            {(lastCheckIn || lastCheckOut) && (
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                {lastCheckIn && (
                  <div style={{flex:1,background:'white',borderRadius:12,padding:'10px 12px',border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>{t('checkInTime')}</div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{new Date(lastCheckIn.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )}
                {lastCheckOut && (
                  <div style={{flex:1,background:'white',borderRadius:12,padding:'10px 12px',border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>{t('checkOutTime')}</div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{new Date(lastCheckOut.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )}
              </div>
            )}

            {/* الزر الرئيسي */}
            {!lastCheckOut && (
              !isCheckedIn ? (
                <button onClick={()=>markAttendance('check_in')} disabled={marking!==null}
                  style={{width:'100%',padding:'15px',background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'0 6px 16px rgba(22,163,74,.3)'}}>
                  <span style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><MapPin size={14} strokeWidth={2.25}/></span>
                  {marking==='check_in' ? t('markingLocation') : t('checkIn')}
                </button>
              ) : (
                <>
                  <button onClick={()=>markAttendance('check_out')} disabled={marking!==null || !canCheckOut}
                    style={{width:'100%',padding:'15px',background: canCheckOut ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#cbd5e1',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor: canCheckOut ? 'pointer' : 'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow: canCheckOut ? '0 6px 16px rgba(220,38,38,.3)' : 'none'}}>
                    <span style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><MapPin size={14} strokeWidth={2.25}/></span>
                    {marking==='check_out' ? t('markingLocation') : t('checkOut')}
                  </button>
                  {!canCheckOut && checkOutHint && (
                    <div style={{textAlign:'center' as const,fontSize:11,color:'#94a3b8',fontWeight:600,marginTop:8}}>⏰ {checkOutHint}</div>
                  )}
                  {!canCheckOut && (
                    permReq?.status === 'pending' ? (
                      <div style={{textAlign:'center' as const,fontSize:12,color:'#d97706',fontWeight:700,marginTop:10,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'8px 10px'}}>⏳ طلب الاستئذان بانتظار رد المالك</div>
                    ) : permReq?.status === 'rejected' ? (
                      <div style={{textAlign:'center' as const,fontSize:12,color:'#dc2626',fontWeight:700,marginTop:10,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'8px 10px'}}>🚫 تم رفض طلب الاستئذان</div>
                    ) : showPermForm ? (
                      <div style={{marginTop:10}}>
                        <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder={t('excuseReasonPh')} rows={2}
                          style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',resize:'vertical' as const,marginBottom:8,boxSizing:'border-box' as const}}/>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={submitPermissionRequest} disabled={submittingPerm}
                            style={{flex:1,padding:'10px',background:'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            {submittingPerm ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </button>
                          <button onClick={()=>setShowPermForm(false)} style={{padding:'10px 16px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setShowPermForm(true)} style={{width:'100%',marginTop:10,padding:'11px',background:'#fffbeb',color:'#b45309',border:'1.5px solid #fde68a',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        <UserCheck size={13} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> طلب استئذان (ظرف طارئ)
                      </button>
                    )
                  )}
                </>
              )
            )}
            {lastCheckOut && (
              <div style={{textAlign:'center' as const,fontSize:11,color:'#94a3b8',fontWeight:600,padding:'6px 0'}}>✓ اكتمل دوامك لهذا اليوم</div>
            )}
            {locatingHint && <div style={{fontSize:11,color:'#64748b',marginTop:10,textAlign:'center' as const}}>📍 {locatingHint}</div>}
            {attError && <div style={{fontSize:11,color:'#dc2626',marginTop:10,lineHeight:1.6,textAlign:'center' as const}}>{attError}</div>}
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {canDispense && (
            <button onClick={()=>router.push('/staff/dispense')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#042f2e,#029FA2)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Package size={22} strokeWidth={2}/></span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('dispense')}</div>
                <div style={{fontSize:12,opacity:.8}}>{t('dispenseSub')}</div>
              </div>
            </button>
          )}
          {canReservations && (
            <button onClick={()=>router.push('/staff/reservations')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#78350f,#b45309)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><CalendarDays size={22} strokeWidth={2}/></span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('reservations')}</div>
                <div style={{fontSize:12,opacity:.8}}>{t('reservationsSub')}</div>
              </div>
            </button>
          )}
          {isCashier && (
            <button onClick={()=>router.push('/staff/cashier-closing')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#1e293b,#334155)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Store size={22} strokeWidth={2}/></span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('cashierClosing')}</div>
                <div style={{fontSize:12,opacity:.8}}>{t('cashierSub')}</div>
              </div>
            </button>
          )}
          {canInventory && (
            <button onClick={()=>router.push('/staff/inventory')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#5b21b6,#7c3aed)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Boxes size={22} strokeWidth={2}/></span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('inventory')}</div>
                <div style={{fontSize:12,opacity:.8}}>{t('inventorySub')}</div>
              </div>
            </button>
          )}
          {canPurchases && (
            <button onClick={()=>router.push('/staff/purchases')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#1d4ed8,#2563eb)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ShoppingCart size={22} strokeWidth={2}/></span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('purchases')}</div>
                <div style={{fontSize:12,opacity:.8}}>{t('purchasesSub')}</div>
              </div>
            </button>
          )}
          {!canDispense && !isCashier && (
            <button onClick={()=>router.push('/staff/dispense')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#042f2e,#029FA2)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{fontSize:28}}>📦</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>{t('enterSystem')}</div>
              </div>
            </button>
          )}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:12}}>
          <button onClick={()=>router.push('/staff/tasks')}
            style={{position:'relative' as const,padding:'16px 8px',background:'white',color:'#1c1c1a',border:'1.5px solid #e5e7eb',borderRadius:16,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:6}}>
            {taskCount>0 && (
              <span style={{position:'absolute' as const,top:6,left:6,background:'#dc2626',color:'white',fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{taskCount}</span>
            )}
            <span style={{width:38,height:38,borderRadius:11,background:'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center',color:'#029FA2'}}><ClipboardList size={19} strokeWidth={2}/></span>
            {t('myTasksLabel')}
          </button>
          <button onClick={()=>setShowRequests(true)}
            style={{padding:'16px 8px',background:'white',color:'#1c1c1a',border:'1.5px solid #e5e7eb',borderRadius:16,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:6}}>
            <span style={{width:38,height:38,borderRadius:11,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',color:'#2563eb'}}><Send size={19} strokeWidth={2}/></span>
            {t('myRequests')}
          </button>
        </div>

        <button onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}}
          style={{marginTop:20,background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
          {t('logout')}
        </button>
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
