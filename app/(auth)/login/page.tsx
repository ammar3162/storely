'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('ادخل البريد وكلمة المرور'); return }
    if (password.length < 6) { setError('كلمة المرور 6 احرف على الاقل'); return }
    setLoading(true)
    setError('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('البريد او كلمة المرور غير صحيحة'); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    }
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f6fb',fontFamily:'system-ui',direction:'rtl'}}>
      <div style={{background:'white',borderRadius:20,padding:'40px 36px',width:'100%',maxWidth:420,boxShadow:'0 8px 40px rgba(0,0,0,0.10)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:56,height:56,background:'#667eea',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 12px'}}>🏪</div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#1a1a2e'}}>Storely</h1>
          <p style={{fontSize:13,color:'#888',marginTop:4}}>نظام ادارة المخزون للمعلات</p>
        </div>
        <div style={{display:'flex',background:'#f4f6fb',borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          <button type="button" onClick={() => setMode('login')} style={{flex:1,padding:'10px',border:'none',borderRadius:10,background:mode==='login'?'white':'transparent',color:mode==='login'?'#667eea':'#888',fontWeight:800,fontSize:14,cursor:'pointer'}}>تسجيل الدخول</button>
          <button type="button" onClick={() => setMode('register')} style={{flex:1,padding:'10px',border:'none',borderRadius:10,background:mode==='register'?'white':'transparent',color:mode==='register'?'#667eea':'#888',fontWeight:800,fontSize:14,cursor:'pointer'}}>حساب جديد</button>
        </div>
        {error && <div style={{background:'#fff1f1',border:'1.5px solid #fca5a5',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6}}>البريد الالكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{fontSize:12,fontWeight:700,color:'#555',display:'block',marginBottom:6}}>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box'}} />
          </div>
          <button type="submit" disabled={loading} style={{width:'100%',padding:'13px',background:'#667eea',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer'}}>{loading ? 'جاري...' : mode==='login' ? 'دخول' : 'انشاء حساب'}</button>
        </form>
      </div>
    </div>
  )
}
