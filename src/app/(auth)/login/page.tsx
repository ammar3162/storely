'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'register' | 'success'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [successData, setSuccessData] = useState({name:'',phone:''})
  const router   = useRouter()
  const supabase = createClient()

  const inp: React.CSSProperties = {
    width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500,
  }
  const btnPrimary: React.CSSProperties = {
    width:'100%', padding:'14px', background:'#2d7a4f',
    color:'white', border:'none', borderRadius:12, fontSize:15, fontWeight:800,
    cursor:'pointer', fontFamily:'system-ui', boxShadow:'0 4px 14px rgba(26,71,49,0.4)',
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
        setSuccessData({name:orgName.trim(),phone:phone.trim()})
        await supabase.from('profiles').upsert({
          id: data.user.id, org_id: org.id,
          full_name: orgName.trim(), role: 'owner', phone: phone.trim(),
          status: 'pending',
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
      setError('')
      setMode('success')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#1a4731 0%,#0d2818 100%)',fontFamily:'system-ui',direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:24,padding:'40px 36px',width:'100%',maxWidth:440,boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,background:'#2d7a4f',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 14px'}}>🏪</div>
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

        {mode==='success' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم إنشاء حسابك!</h2>
            <p style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>
              حسابك بانتظار التفعيل.<br/>للاشتراك أو الاستفسار عن الأسعار تواصل معنا:
            </p>
            <a href={`https://wa.me/966594351667?text=${encodeURIComponent('مرحباً، سجلت في Storely باسم: '+successData.name+' - أريد الاشتراك')}`}
              target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',padding:'14px',background:'#25d366',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer',textDecoration:'none',boxShadow:'0 4px 14px rgba(37,211,102,.4)',marginBottom:12}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل معنا على واتساب
            </a>
            <button onClick={()=>setMode('login')} style={{width:'100%',padding:'12px',background:'transparent',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'system-ui'}}>
              العودة لتسجيل الدخول
            </button>
          </div>
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
