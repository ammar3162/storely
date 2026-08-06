'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SupplierPortalAuthPage() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sb = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error, data } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError('البريد أو كلمة المرور غير صحيحة'); setLoading(false); return }
    if (data.session) window.location.href = '/supplier-portal/dashboard'
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    if (!businessName.trim() || !email.trim() || !password.trim()) {
      setError('عبّي كل الحقول المطلوبة'); setLoading(false); return
    }
    const { error: signUpErr, data } = await sb.auth.signUp({ email, password })
    if (signUpErr) {
      setError(signUpErr.message.includes('already registered') ? 'هذا البريد مسجّل مسبقاً — سجّل الدخول' : signUpErr.message)
      setLoading(false); return
    }
    if (!data.user) { setError('حدث خطأ أثناء إنشاء الحساب'); setLoading(false); return }

    const { error: profileErr } = await sb.from('supplier_profiles' as any).insert({
      id: data.user.id, business_name: businessName.trim(), phone: phone.trim() || null,
      email: email.trim(), location: location.trim() || null,
    })
    if (profileErr) { setError('حدث خطأ أثناء حفظ بيانات المورد'); setLoading(false); return }

    if (data.session) window.location.href = '/supplier-portal/dashboard'
    else { setError(''); setMode('login') }
  }

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:'#f5f5f4',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,padding:28,border:'1px solid #ebebea'}}>
        <div style={{textAlign:'center' as const,marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:800,color:'#1c1c1a'}}>🚚 بوابة الموردين</div>
          <div style={{fontSize:12,color:'#888780',marginTop:4}}>Storely — إدارة أصنافك وأسعارك</div>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:18,background:'#f5f5f4',borderRadius:10,padding:4}}>
          <button onClick={()=>{setMode('login');setError('')}} style={{flex:1,padding:'8px',borderRadius:8,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:mode==='login'?'white':'transparent',color:mode==='login'?'#16a34a':'#888780'}}>دخول</button>
          <button onClick={()=>{setMode('register');setError('')}} style={{flex:1,padding:'8px',borderRadius:8,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:mode==='register'?'white':'transparent',color:mode==='register'?'#16a34a':'#888780'}}>تسجيل جديد</button>
        </div>

        {error && <div style={{background:'#fef2f2',color:'#dc2626',fontSize:12,padding:'8px 12px',borderRadius:8,marginBottom:14}}>{error}</div>}

        {mode==='login' ? (
          <form onSubmit={handleLogin}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" required
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:10,fontSize:14,boxSizing:'border-box' as const}}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" required
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:16,fontSize:14,boxSizing:'border-box' as const}}/>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:14,cursor:'pointer'}}>
              {loading?'⏳ جاري الدخول...':'دخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="اسم المنشأة" required
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:10,fontSize:14,boxSizing:'border-box' as const}}/>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="رقم الجوال"
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:10,fontSize:14,boxSizing:'border-box' as const}}/>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="الموقع / المدينة"
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:10,fontSize:14,boxSizing:'border-box' as const}}/>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني" required
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:10,fontSize:14,boxSizing:'border-box' as const}}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" required
              style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #e5e5e3',marginBottom:16,fontSize:14,boxSizing:'border-box' as const}}/>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:14,cursor:'pointer'}}>
              {loading?'⏳ جاري الإنشاء...':'إنشاء حساب مورد'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
