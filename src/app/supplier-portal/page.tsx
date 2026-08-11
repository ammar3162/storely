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
  const [showPassword, setShowPassword] = useState(false)
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
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#ffffff',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sp-inp{width:100%;padding:13px 16px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;background:white;color:#111827;font-family:inherit;transition:border-color .2s}
        .sp-inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}
        .sp-inp::placeholder{color:#9ca3af}
        .sp-btn-main{width:100%;padding:14px;background:#16a34a;color:white;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s}
        .sp-btn-main:hover{background:#15803d}
        .sp-btn-main:disabled{opacity:.6;cursor:not-allowed}
        @media(max-width:768px){.sp-right-panel{display:none!important}}
      `}</style>

      {/* Navbar */}
      <nav style={{padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:38,height:38,borderRadius:10,objectFit:'cover'}}/>
          <span style={{fontSize:18,fontWeight:800,color:'#111827',letterSpacing:'-0.3px'}}>Storely</span>
          <span style={{fontSize:12,fontWeight:700,color:'#16a34a',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'3px 10px',marginRight:4}}>بوابة الموردين</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:13,color:'#6b7280'}}>{mode==='login'?'ما عندك حساب؟':'عندك حساب؟'}</span>
          <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}
            style={{padding:'8px 18px',background:'none',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'#374151',transition:'border-color .2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#16a34a'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
            {mode==='login'?'تسجيل جديد':'تسجيل الدخول'}
          </button>
        </div>
      </nav>

      <div style={{flex:1,display:'flex'}}>
        {/* Left — Form */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
          <div style={{width:'100%',maxWidth:420,animation:'fadeUp .4s ease'}}>

            {mode==='login' ? (
              <>
                <div style={{marginBottom:32,textAlign:'center' as const}}>
                  <h1 style={{fontSize:28,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>أهلاً بعودتك</h1>
                  <p style={{fontSize:15,color:'#6b7280'}}>سجّل دخولك لإدارة أصنافك وأسعارك</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                    <input className="sp-inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
                    <input className="sp-inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
                  </div>
                  <button type="submit" disabled={loading} className="sp-btn-main" style={{marginTop:8}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الدخول...</span>:'دخول'}
                  </button>
                </form>
                <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'#6b7280'}}>
                  ما عندك حساب مورد؟{' '}
                  <button onClick={()=>{setMode('register');setError('')}} style={{background:'none',border:'none',color:'#16a34a',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    سجّل الآن
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{marginBottom:28}}>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>سجّل كمورد</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>أضف بيانات منشأتك وابدأ باستلام الطلبات</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>اسم المنشأة *</label>
                    <input className="sp-inp" type="text" required value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="مثال: مؤسسة الوفاء للتوريد"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>رقم الجوال</label>
                    <input className="sp-inp" type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05xxxxxxxx"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>الموقع / المدينة</label>
                    <input className="sp-inp" type="text" value={location} onChange={e=>setLocation(e.target.value)} placeholder="مثال: جدة"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني *</label>
                    <input className="sp-inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور *</label>
                    <div style={{position:'relative'}}>
                      <input className="sp-inp" type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل" style={{paddingLeft:44}}/>
                      <button type="button" onClick={()=>setShowPassword(s=>!s)}
                        style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#9ca3af',padding:4}}
                        aria-label={showPassword?'إخفاء كلمة المرور':'إظهار كلمة المرور'}>
                        {showPassword?'🙈':'👁️'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="sp-btn-main" style={{marginTop:4}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الإنشاء...</span>:'إنشاء حساب مورد'}
                  </button>
                </form>
                <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
                  عندك حساب؟{' '}
                  <button onClick={()=>{setMode('login');setError('')}} style={{background:'none',border:'none',color:'#16a34a',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    سجّل الدخول
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — Branding */}
        <div className="sp-right-panel" style={{width:'45%',background:'#f9fafb',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 44px',borderRight:'1px solid #f3f4f6'}}>
          <div style={{maxWidth:400,width:'100%'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:700,color:'#16a34a',marginBottom:20}}>
              🚚 بوابة الموردين
            </div>
            <h2 style={{fontSize:30,fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:12,letterSpacing:'-1px'}}>
              نظّم توريدك<br/>
              <span style={{color:'#16a34a'}}>بذكاء وسهولة</span>
            </h2>
            <p style={{fontSize:14,color:'#6b7280',lineHeight:1.75,marginBottom:24}}>
              استلم طلبات التوريد فورياً، حدّث أسعارك وأصنافك بضغطة، وتابع حالة كل طلب مع كل فرع من مكان واحد
            </p>

            <div style={{position:'relative',borderRadius:16,overflow:'hidden',boxShadow:'0 16px 40px rgba(15,23,42,.12)',marginBottom:24}}>
              <img src="/supplier-team.jpg" alt="Storely" style={{width:'100%',display:'block',objectFit:'cover'}}/>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:11,marginTop:24}}>
              {[
                {icon:'📦',text:'استلام طلبات التوريد فور وصولها'},
                {icon:'💰',text:'تحديث أصنافك وأسعارك بسهولة'},
                {icon:'💬',text:'تواصل مباشر مع الفروع الطالبة'},
                {icon:'📊',text:'تتبّع كل طلباتك ومدفوعاتك'},
              ].map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:11}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{f.icon}</div>
                  <span style={{fontSize:13,color:'#374151',fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
