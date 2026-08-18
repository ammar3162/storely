'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChoosePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [canDispense, setCanDispense] = useState(false)
  const [canReservations, setCanReservations] = useState(false)
  const [isCashier, setIsCashier] = useState(false)
  const [staffData, setStaffData] = useState<any>(null)
  const [todayEvents, setTodayEvents] = useState<any[]>([])
  const [loadingToday, setLoadingToday] = useState(true)
  const [marking, setMarking] = useState<'check_in'|'check_out'|null>(null)
  const [attError, setAttError] = useState('')
  const [shift, setShift] = useState<any>(null)
  const [permReq, setPermReq] = useState<any>(null)
  const [showPermForm, setShowPermForm] = useState(false)
  const [permReason, setPermReason] = useState('')
  const [submittingPerm, setSubmittingPerm] = useState(false)

  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setCanReservations(!!parsed.permissions?.reservations)
    setIsCashier(parsed.role==='cashier')
    setStaffData(parsed)
    loadToday(parsed)
  },[])

  async function loadToday(parsed:any) {
    try {
      const res = await fetch(`/api/staff-attendance?staff_id=${parsed.id}&org_id=${parsed.org_id}`)
      const j = await res.json()
      if(j.success) { setTodayEvents(j.today||[]); setShift(j.shift||null) }
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

  async function markAttendance(type:'check_in'|'check_out') {
    if(!staffData) return
    setAttError('')
    if(!navigator.geolocation) { setAttError('المتصفح ما يدعم تحديد الموقع'); return }
    setMarking(type)
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      try {
        const res = await fetch('/api/staff-attendance', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            staff_id: staffData.id, org_id: staffData.org_id, branch_id: staffData.branch_id,
            type, latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          })
        })
        const j = await res.json()
        if(!j.success) { setAttError(j.error||'حدث خطأ'); setMarking(null); return }
        await loadToday(staffData)
      } catch {
        setAttError('حدث خطأ بالاتصال')
      }
      setMarking(null)
    }, ()=>{
      setMarking(null)
      setAttError('تعذر الوصول لموقعك — تأكد من السماح للمتصفح بالوصول للموقع')
    }, { enableHighAccuracy:true, timeout:10000 })
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0d2818,#1a4731)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:24,padding:'40px 32px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
        <div style={{fontSize:48,marginBottom:12}}>👋</div>
        <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>أهلاً {name}</h2>
        <p style={{fontSize:13,color:'#64748b',marginBottom:24}}>اختر الوظيفة التي تريد القيام بها</p>

        {/* تسجيل الحضور والانصراف */}
        {!loadingToday && (
          <div style={{
            background: isCheckedIn ? 'linear-gradient(135deg,#f0fdf4,#ecfdf5)' : '#f8fafc',
            border: `1.5px solid ${isCheckedIn ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: 18, padding: 18, marginBottom: 24, textAlign: 'right'
          }}>
            {/* حالة الموظف الآن */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:800,color: isCheckedIn ? '#15803d' : '#64748b'}}>
                {isCheckedIn ? 'أنت حاضر الآن' : lastCheckOut ? 'انصرفت اليوم' : 'ما سجّلت حضورك بعد'}
              </span>
              <span style={{
                width:9,height:9,borderRadius:'50%',
                background: isCheckedIn ? '#16a34a' : lastCheckOut ? '#94a3b8' : '#f59e0b',
                boxShadow: isCheckedIn ? '0 0 0 4px rgba(22,163,74,.15)' : 'none',
              }}/>
            </div>

            {/* أوقات الحضور والانصراف */}
            {(lastCheckIn || lastCheckOut) && (
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                {lastCheckIn && (
                  <div style={{flex:1,background:'white',borderRadius:12,padding:'10px 12px',border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>وقت الحضور</div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{new Date(lastCheckIn.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )}
                {lastCheckOut && (
                  <div style={{flex:1,background:'white',borderRadius:12,padding:'10px 12px',border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>وقت الانصراف</div>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{new Date(lastCheckOut.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                )}
              </div>
            )}

            {/* الزر الرئيسي */}
            {!lastCheckOut && (
              !isCheckedIn ? (
                <button onClick={()=>markAttendance('check_in')} disabled={marking!==null}
                  style={{width:'100%',padding:'15px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'0 6px 16px rgba(22,163,74,.3)'}}>
                  <span style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📍</span>
                  {marking==='check_in' ? 'جاري تحديد موقعك...' : 'تسجيل حضور'}
                </button>
              ) : (
                <>
                  <button onClick={()=>markAttendance('check_out')} disabled={marking!==null || !canCheckOut}
                    style={{width:'100%',padding:'15px',background: canCheckOut ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#cbd5e1',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor: canCheckOut ? 'pointer' : 'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow: canCheckOut ? '0 6px 16px rgba(220,38,38,.3)' : 'none'}}>
                    <span style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📍</span>
                    {marking==='check_out' ? 'جاري تحديد موقعك...' : 'تسجيل انصراف'}
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
                        <textarea value={permReason} onChange={e=>setPermReason(e.target.value)} placeholder="سبب الاستئذان (اختياري)..." rows={2}
                          style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',resize:'vertical' as const,marginBottom:8,boxSizing:'border-box' as const}}/>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={submitPermissionRequest} disabled={submittingPerm}
                            style={{flex:1,padding:'10px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            {submittingPerm ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </button>
                          <button onClick={()=>setShowPermForm(false)} style={{padding:'10px 16px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setShowPermForm(true)} style={{width:'100%',marginTop:10,padding:'11px',background:'#fffbeb',color:'#b45309',border:'1.5px solid #fde68a',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        🙋 طلب استئذان (ظرف طارئ)
                      </button>
                    )
                  )}
                </>
              )
            )}
            {lastCheckOut && (
              <div style={{textAlign:'center' as const,fontSize:11,color:'#94a3b8',fontWeight:600,padding:'6px 0'}}>✓ اكتمل دوامك لهذا اليوم</div>
            )}
            {attError && <div style={{fontSize:11,color:'#dc2626',marginTop:10,lineHeight:1.6,textAlign:'center' as const}}>{attError}</div>}
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {canDispense && (
            <button onClick={()=>router.push('/staff/dispense')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#0d2818,#16a34a)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{fontSize:28}}>📤</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>صرف المخزون</div>
                <div style={{fontSize:12,opacity:.8}}>تسجيل صرف المنتجات</div>
              </div>
            </button>
          )}
          {canReservations && (
            <button onClick={()=>router.push('/staff/reservations')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#78350f,#b45309)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{fontSize:28}}>🗓️</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>الحجوزات</div>
                <div style={{fontSize:12,opacity:.8}}>متابعة حجوزات اليوم</div>
              </div>
            </button>
          )}
          {isCashier && (
            <button onClick={()=>router.push('/staff/cashier-closing')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#1e293b,#334155)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{fontSize:28}}>🏪</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>إقفال الكاشير</div>
                <div style={{fontSize:12,opacity:.8}}>تقرير نهاية اليوم</div>
              </div>
            </button>
          )}
          {!canDispense && !isCashier && (
            <button onClick={()=>router.push('/staff/dispense')}
              style={{width:'100%',padding:'20px',background:'linear-gradient(135deg,#0d2818,#16a34a)',color:'white',border:'none',borderRadius:16,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{fontSize:28}}>📦</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:800}}>الدخول للنظام</div>
              </div>
            </button>
          )}
        </div>
        <button onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}}
          style={{marginTop:20,background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>
    </div>
  )
}
