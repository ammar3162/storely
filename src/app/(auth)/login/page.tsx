'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  const inp: React.CSSProperties = {
    width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }
  const btnPrimary: React.CSSProperties = {
    width:'100%', padding:'14px', background:'linear-gradient(135deg,#667eea,#764ba2)',
    color:'white', border:'none', borderRadius:12, fontSize:15, fontWeight:800,
    cursor:'pointer', fontFamily:'system-ui', boxShadow:'0 4px 14px rgba(102,126,234,0.4)',
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('البريد أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }
    if (data.session) {
      window.location.href = '/inventory'
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) { setError('أدخل اسم المؤسسة'); return }
    if (!phone.trim())   { setError('أدخل رقم الجوال'); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const { data: org } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim(), whatsapp_number: phone.trim(), low_stock_threshold: 5 })
        .select().single()
      if (org) {
        await supabase.from('profiles').upsert({
          id: data.user.id, org_id: org.id,
          full_name: orgName.trim(), role: 'owner', phone: phone.trim(),
        })
      }
      setError('')
      alert('تم إنشاء الحساب! تحقق من بريدك للتأكيد ثم سجل دخول')
      setMode('login')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',fontFamily:'system-ui',direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:24,padding:'40px 36px',width:'100%',maxWidth:440,boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,background:'linear-gradient(135deg,#667eea,#764ba2)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 14px'}}>🏪</div>
          <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',margin:'0 0 4px'}}>Storely</h1>
          <p style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>نظام إدارة المخزون</p>
        </div>

        <div style={{display:'flex',background:'#f1f5f9',borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          {(['login','register'] as const).map(m => (
            <button key={m} type="button" onClick={() => {setMode(m);setError('')}}
              style={{flex:1,padding:'10px',border:'none',borderRadius:10,background:mode===m?'white':'transparent',color:mode===m?'#667eea':'#64748b',fontWeight:mode===m?800:500,fontSize:14,cursor:'pointer',fontFamily:'system-ui',transition:'all 0.2s'}}>
              {m==='login'?'تسجيل الدخول':'حساب جديد'}
            </button>
          ))}
        </div>

        {error && <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>⚠️ {error}</div>}

        {mode==='login' && (
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="example@email.com"/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inp} placeholder="••••••••"/>
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        )}

        {mode==='register' && (
          <form onSubmit={handleRegister}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المؤسسة</label>
              <input type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} style={inp} placeholder="مثال: مستودع النجمة"/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="example@email.com"/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم الجوال</label>
              <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} style={inp} placeholder="0561234567"/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={inp} placeholder="6 أحرف على الأقل"/>
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><LoginPage /></Suspense>
}
