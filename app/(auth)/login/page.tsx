'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register' | 'forgot' | 'verify' | 'newpass'

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [newPass, setNewPass]   = useState('')
  const [otp, setOtp]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('البريد أو كلمة المرور غير صحيحة'); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) { setError('أدخل اسم المؤسسة'); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true); setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('هذا البريد الإلكتروني مسجل مسبقاً — جرب تسجيل الدخول')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: org } = await supabase.from('organizations').insert({
        name: orgName.trim(),
        plan: 'basic',
        plan_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single()

      if (org) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          org_id: org.id,
          full_name: orgName.trim(),
          role: 'owner'
        })
      }
    }

    router.push('/dashboard')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('تم إرسال كود التحقق لبريدك الإلكتروني')
    setLoading(false)
    setMode('verify')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({
      email, token: otp, type: 'email'
    })
    if (error) { setError('الكود غير صحيح أو منتهي الصلاحية'); setLoading(false); return }
    setMode('newpass')
    setLoading(false)
  }

  async function handleNewPass(e: React.FormEvent) {
    e.preventDefault()
    if (newPass.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('تم تغيير كلمة المرور بنجاح!')
    setLoading(false)
    setTimeout(() => { setMode('login'); setSuccess('') }, 2000)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }

  const btnPrimary: React.CSSProperties = {
    width:'100%', padding:'14px',
    background:'linear-gradient(135deg,#667eea,#764ba2)',
    color:'white', border:'none', borderRadius:12, fontSize:15, fontWeight:800,
    cursor:'pointer', fontFamily:'system-ui',
    boxShadow:'0 4px 14px rgba(102,126,234,0.4)', marginBottom:12
  }

  const btnSecondary: React.CSSProperties = {
    width:'100%', padding:'12px', background:'#f1f5f9', color:'#64748b',
    border:'none', borderRadius:12, fontSize:14, fontWeight:600,
    cursor:'pointer', fontFamily:'system-ui'
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      fontFamily:'system-ui', direction:'rtl', padding:20
    }}>
      <div style={{
        background:'white', borderRadius:24, padding:'40px 36px',
        width:'100%', maxWidth:440,
        boxShadow:'0 25px 60px rgba(0,0,0,0.25)'
      }}>
        <style>{`input:focus { border-color: #667eea !important; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }`}</style>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{
            width:64,height:64,
            background:'linear-gradient(135deg,#667eea,#764ba2)',
            borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:30,margin:'0 auto 14px',
            boxShadow:'0 8px 24px rgba(102,126,234,0.4)'
          }}>🏪</div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',margin:'0 0 4px'}}>Storely</h1>
          <p style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>نظام إدارة المخزون للمعلات</p>
        </div>

        {/* Tabs */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{display:'flex',background:'#f1f5f9',borderRadius:12,padding:4,marginBottom:24,gap:4}}>
            {(['login','register'] as Mode[]).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
                flex:1, padding:'10px', border:'none', borderRadius:10,
                background: mode===m ? 'white' : 'transparent',
                color: mode===m ? '#667eea' : '#64748b',
                fontWeight: mode===m ? 800 : 500, fontSize:14, cursor:'pointer',
                boxShadow: mode===m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                fontFamily:'system-ui', transition:'all 0.2s'
              }}>
                {m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </button>
            ))}
          </div>
        )}

        {/* Mode Title للصفحات الأخرى */}
        {mode !== 'login' && mode !== 'register' && (
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{fontSize:32,marginBottom:8}}>
              {mode==='forgot'?'🔑':mode==='verify'?'📧':'🔒'}
            </div>
            <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>
              {mode==='forgot'?'نسيت كلمة المرور؟':mode==='verify'?'أدخل كود التحقق':'كلمة مرور جديدة'}
            </h2>
            <p style={{fontSize:13,color:'#64748b',margin:0}}>
              {mode==='forgot'?'سنرسل كود التحقق لبريدك':mode==='verify'?'تحقق من بريدك الإلكتروني':'اختر كلمة مرور قوية وآمنة'}
            </p>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#16a34a'}}>
            ✅ {success}
          </div>
        )}

        {/* Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" placeholder="example@email.com" required value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            </div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
              <input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} style={inp} />
            </div>
            <div style={{textAlign:'left',marginBottom:20}}>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{background:'none',border:'none',color:'#667eea',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>
                نسيت كلمة المرور؟
              </button>
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? '⏳ جاري الدخول...' : 'دخول →'}
            </button>
          </form>
        )}

        {/* Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                🏪 اسم المؤسسة / المعل
              </label>
              <input type="text" placeholder="مثال: كوفي نصيف، مطعم الوليد..." required
                value={orgName} onChange={e => setOrgName(e.target.value)}
                style={{...inp,border:'2px solid #c7d2fe',background:'#eef2ff'}} />
              <div style={{fontSize:11,color:'#6366f1',marginTop:4,fontWeight:600}}>
                ℹ️ سيظهر هذا الاسم في لوحة التحكم
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" placeholder="example@email.com" required value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
              <input type="password" placeholder="6 أحرف على الأقل" required value={password} onChange={e => setPassword(e.target.value)} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? '⏳ جاري الإنشاء...' : '🚀 إنشاء الحساب'}
            </button>
          </form>
        )}

        {/* Forgot */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" placeholder="example@email.com" required value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? '⏳ جاري الإرسال...' : '📧 إرسال كود التحقق'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={btnSecondary}>
              ← رجوع لتسجيل الدخول
            </button>
          </form>
        )}

        {/* Verify */}
        {mode === 'verify' && (
          <form onSubmit={handleVerify}>
            <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#16a34a',fontWeight:600}}>
              📧 تم إرسال الكود إلى: {email}
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كود التحقق</label>
              <input type="text" placeholder="أدخل الكود" required value={otp}
                onChange={e => setOtp(e.target.value)}
                style={{...inp,textAlign:'center',fontSize:24,fontWeight:800,letterSpacing:6}} />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? '⏳ جاري التحقق...' : '✅ تحقق من الكود'}
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={btnSecondary}>
              ← إعادة إرسال الكود
            </button>
          </form>
        )}

        {/* New Password */}
        {mode === 'newpass' && (
          <form onSubmit={handleNewPass}>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور الجديدة</label>
              <input type="password" placeholder="6 أحرف على الأقل" required value={newPass}
                onChange={e => setNewPass(e.target.value)} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? '⏳ جاري الحفظ...' : '🔒 حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}