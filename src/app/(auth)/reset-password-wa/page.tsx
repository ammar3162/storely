'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordWaPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setChecking(false); setValidationError('رابط غير صحيح'); return }
    fetch('/api/reset-password-wa-confirm?token=' + encodeURIComponent(token))
      .then(r => r.json())
      .then(data => {
        setValid(!!data.valid)
        if (!data.valid) setValidationError(data.error || 'رابط غير صحيح')
        setChecking(false)
      })
      .catch(() => { setChecking(false); setValidationError('حدث خطأ، حاول مرة أخرى') })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return }

    setLoading(true)
    const res = await fetch('/api/reset-password-wa-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'حدث خطأ'); return }
    setDone(true)
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', border:'1.5px solid #e5e7eb', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif", direction:'rtl', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', padding:20 }}>
      <div style={{ background:'white', borderRadius:18, padding:32, width:'100%', maxWidth:400, boxShadow:'0 10px 40px rgba(0,0,0,.08)' }}>

        {checking && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:14, color:'#6b7280' }}>⏳ جاري التحقق من الرابط...</div>
          </div>
        )}

        {!checking && !valid && (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 16px' }}>⚠️</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:8 }}>{validationError}</h2>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:24, lineHeight:1.7 }}>اطلب رابط جديد من صفحة تسجيل الدخول</p>
            <button onClick={()=>router.push('/login')} style={{ padding:'12px 28px', background:'#16a34a', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              رجوع لتسجيل الدخول
            </button>
          </div>
        )}

        {!checking && valid && !done && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', marginBottom:6 }}>تعيين كلمة مرور جديدة</h1>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>أدخل كلمة المرور الجديدة لحسابك</p>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>كلمة المرور الجديدة</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8 أحرف على الأقل" style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>تأكيد كلمة المرور</label>
                <input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة المرور" style={inp}/>
              </div>
              <button type="submit" disabled={loading} style={{ padding:'13px', background:'#16a34a', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?.7:1 }}>
                {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </button>
            </form>
          </>
        )}

        {done && (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 16px' }}>✅</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:8 }}>تم تغيير كلمة المرور بنجاح</h2>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>تقدر الآن تسجّل الدخول بكلمة المرور الجديدة</p>
            <button onClick={()=>router.push('/login')} style={{ padding:'12px 28px', background:'#16a34a', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              تسجيل الدخول
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><ResetPasswordWaPage/></Suspense>
}
