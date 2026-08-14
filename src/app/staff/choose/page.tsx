'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChoosePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [canDispense, setCanDispense] = useState(false)
  const [isCashier, setIsCashier] = useState(false)
  const [staffData, setStaffData] = useState<any>(null)
  const [todayEvents, setTodayEvents] = useState<any[]>([])
  const [loadingToday, setLoadingToday] = useState(true)
  const [marking, setMarking] = useState<'check_in'|'check_out'|null>(null)
  const [attError, setAttError] = useState('')

  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setIsCashier(parsed.role==='cashier')
    setStaffData(parsed)
    loadToday(parsed)
  },[])

  async function loadToday(parsed:any) {
    try {
      const res = await fetch(`/api/staff-attendance?staff_id=${parsed.id}&org_id=${parsed.org_id}`)
      const j = await res.json()
      if(j.success) setTodayEvents(j.today||[])
    } catch {}
    setLoadingToday(false)
  }

  const lastCheckIn = todayEvents.find(e=>e.type==='check_in')
  const lastCheckOut = todayEvents.find(e=>e.type==='check_out')
  const isCheckedIn = !!lastCheckIn && !lastCheckOut

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
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:16,padding:16,marginBottom:24,textAlign:'right'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
              📍 الحضور والانصراف
            </div>
            {lastCheckIn && (
              <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>
                🟢 حضور: {new Date(lastCheckIn.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}
                {lastCheckOut && <span> — 🔴 انصراف: {new Date(lastCheckOut.recorded_at).toLocaleTimeString('ar-SA',{numberingSystem:'latn',hour:'2-digit',minute:'2-digit'})}</span>}
              </div>
            )}
            {!isCheckedIn ? (
              <button onClick={()=>markAttendance('check_in')} disabled={marking!==null}
                style={{width:'100%',padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {marking==='check_in' ? '⏳ جاري تحديد موقعك...' : '🟢 تسجيل حضور'}
              </button>
            ) : (
              <button onClick={()=>markAttendance('check_out')} disabled={marking!==null}
                style={{width:'100%',padding:'12px',background:'#dc2626',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {marking==='check_out' ? '⏳ جاري تحديد موقعك...' : '🔴 تسجيل انصراف'}
              </button>
            )}
            {attError && <div style={{fontSize:11,color:'#dc2626',marginTop:8,lineHeight:1.6}}>{attError}</div>}
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
