'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChoosePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [canDispense, setCanDispense] = useState(false)
  const [isCashier, setIsCashier] = useState(false)

  useEffect(()=>{
    const s = localStorage.getItem('staff_session')
    if(!s) { router.replace('/staff'); return }
    const parsed = JSON.parse(s)
    setName(parsed.name||'')
    setCanDispense(!!parsed.permissions?.dispense)
    setIsCashier(parsed.role==='cashier')
    // لو خيار واحد بس متاح، ينتقل له مباشرة بدون ما يحتاج يختار
    if(parsed.role==='cashier' && !parsed.permissions?.dispense) { router.replace('/staff/cashier-closing'); return }
    if(parsed.role!=='cashier' && parsed.permissions?.dispense) { router.replace('/staff/dispense'); return }
    // موظف ما عنده صرف ولا هو كاشير (صلاحياته الأخرى — مخزون/مشتريات/تقارير — تُدار من داخل صفحة الصرف)
    if(parsed.role!=='cashier' && !parsed.permissions?.dispense) { router.replace('/staff/dispense'); return }
  },[])

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0d2818,#1a4731)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:24,padding:'40px 32px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,.3)'}}>
        <div style={{fontSize:48,marginBottom:12}}>👋</div>
        <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>أهلاً {name}</h2>
        <p style={{fontSize:13,color:'#64748b',marginBottom:32}}>اختر الوظيفة التي تريد القيام بها</p>
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
        </div>
        <button onClick={()=>{localStorage.removeItem('staff_session');router.replace('/staff')}}
          style={{marginTop:20,background:'none',border:'none',color:'#94a3b8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>
    </div>
  )
}
