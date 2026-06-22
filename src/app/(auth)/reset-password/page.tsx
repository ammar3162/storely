'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (password !== password2) { setError('كلمتا المرور غير متطابقتين'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('حدث خطأ، حاول مرة أخرى أو اطلب رابط جديد'); return }
    setDone(true)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }
  const btn: React.CSSProperties = {
    width:'100%', padding:'14px', background:'#2d7a4f',
    color:'white', border:'none', borderRadius:12, fontSize:15, fontWeight:800,
    cursor:'pointer', fontFamily:'system-ui', boxShadow:'0 4px 14px rgba(26,71,49,0.4)',
  }

  return (
    <div style={{minHeight:'100vh',background:'#f5f7fa',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'system-ui',direction:'rtl'}}>
      <div style={{width:'100%',maxWidth:400,background:'white',borderRadius:20,padding:32,boxShadow:'0 8px 32px rgba(0,0,0,.08)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:56,height:56,borderRadius:16,margin:'0 auto 12px',display:'block',objectFit:'cover'}}/>
          <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',margin:'0 0 6px'}}>إعادة تعيين كلمة المرور</h1>
        </div>

        {error && <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>⚠️ {error}</div>}

        {done ? (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:56,marginBottom:12}}>✅</div>
            <h2 style={{fontSize:18,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم تغيير كلمة المرور!</h2>
            <p style={{fontSize:14,color:'#64748b',marginBottom:20}}>يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.</p>
            <button onClick={()=>window.location.href='/login'} style={btn}>تسجيل الدخول</button>
          </div>
        ) : !ready ? (
          <div style={{textAlign:'center',padding:20}}>
            <p style={{fontSize:14,color:'#64748b',marginBottom:20}}>الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.</p>
            <button onClick={()=>window.location.href='/login'} style={btn}>رجوع لتسجيل الدخول</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور الجديدة</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inp} placeholder="6 أحرف على الأقل"/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>تأكيد كلمة المرور</label>
              <input type="password" required value={password2} onChange={e=>setPassword2(e.target.value)} style={inp} placeholder="أعد إدخال كلمة المرور"/>
            </div>
            <button type="submit" disabled={loading} style={{...btn,opacity:loading?0.7:1,cursor:loading?'not-allowed':'pointer'}}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
