'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'register' | 'success' | 'forgot' | 'forgot-sent'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [successData, setSuccessData] = useState({name:'',phone:''})
  const [branchCount, setBranchCount] = useState<number|null>(null)
  const [businessType, setBusinessType] = useState<string>('')
  const [mounted, setMounted]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery') && hash.includes('access_token')) {
      window.location.href = '/reset-password' + hash
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('البريد أو كلمة المرور غير صحيحة'); setLoading(false); return }
    if (data.session) window.location.href = '/inventory'
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://storely-hm1u.vercel.app/reset-password',
    })
    setLoading(false)
    if (error) { setError('حدث خطأ، تأكد من صحة البريد الإلكتروني'); return }
    setMode('forgot-sent')
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
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim(), whatsapp_number: phone.trim(), low_stock_threshold: 5, business_type: businessType||'مطعم' } as any)
        .select().single()
      if (orgErr) { setError('خطأ في إنشاء المؤسسة: ' + orgErr.message); setLoading(false); return }
      if (org) {
        if (branchCount) await supabase.from('profiles').update({branch_count:branchCount} as any).eq('id',data.user.id)
        await supabase.from('profiles').upsert({
          id: data.user.id, org_id: org.id,
          full_name: orgName.trim(), role: 'owner', phone: phone.trim(), status: 'pending',
        } as any, { onConflict: 'id', ignoreDuplicates: false })
        setSuccessData({name:orgName.trim(),phone:phone.trim()})
        window.location.href='/onboarding'
      }
      setError(''); setMode('success')
    }
    setLoading(false)
  }

  const features = [
    { icon: '📦', text: 'تتبع المخزون لحظة بلحظة' },
    { icon: '🌍', text: 'واجهة موظفين بـ 7 لغات' },
    { icon: '📊', text: 'تقارير وإحصائيات متقدمة' },
    { icon: '🔔', text: 'تنبيهات واتساب تلقائية' },
  ]

  return (
    <div style={{
      minHeight:'100vh', display:'flex', fontFamily:"'IBM Plex Sans Arabic', system-ui, sans-serif",
      direction:'rtl', background:'#0a1f13', position:'relative', overflow:'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-10px); } }
        @keyframes pulse { 0%,100% { opacity:.4; transform:scale(1); } 50% { opacity:.7; transform:scale(1.05); } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        .fade-up { animation: fadeUp .5s ease both; }
        .fade-in { animation: fadeIn .4s ease both; }
        .inp-field { width:100%; padding:13px 16px; border:1.5px solid rgba(255,255,255,.1); border-radius:12px; font-size:15px; outline:none; box-sizing:border-box; background:rgba(255,255,255,.06); color:white; font-family:inherit; font-weight:500; transition:all .2s; }
        .inp-field::placeholder { color:rgba(255,255,255,.3); }
        .inp-field:focus { border-color:#4ade80; background:rgba(74,222,128,.08); }
        .btn-primary { width:100%; padding:15px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:14px; font-size:16px; font-weight:800; cursor:pointer; font-family:inherit; transition:all .2s; position:relative; overflow:hidden; }
        .btn-primary:hover { transform:translateY(-1px); box-shadow:0 8px 25px rgba(22,163,74,.4); }
        .btn-primary:active { transform:translateY(0); }
        .btn-primary:disabled { opacity:.6; cursor:not-allowed; transform:none; }
        .tab-btn { flex:1; padding:11px; border:none; border-radius:10px; font-size:14px; cursor:pointer; font-family:inherit; transition:all .25s; font-weight:600; }
        .branch-btn { padding:14px 0; border-radius:12px; font-size:16px; font-weight:800; cursor:pointer; font-family:inherit; transition:all .2s; }
        .branch-btn:hover { transform:scale(1.05); }
        .feature-item { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.06); }
        .feature-item:last-child { border-bottom:none; }
      `}</style>

      {/* Animated background blobs */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.15) 0%,transparent 70%)',animation:'pulse 6s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,222,128,.1) 0%,transparent 70%)',animation:'pulse 8s ease-in-out infinite 2s'}}/>
        <div style={{position:'absolute',top:'40%',left:'30%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 70%)',animation:'pulse 10s ease-in-out infinite 4s'}}/>
        {/* Grid pattern */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.03}} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* Left panel — branding */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 80px',position:'relative',minWidth:0}} className="desk-only">
        <div style={{animation:'fadeUp .6s ease both'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:48}}>
            <img src="/storely-logo.png" alt="Storely" style={{width:52,height:52,borderRadius:14,objectFit:'cover'}}/>
            <span style={{fontSize:28,fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>Storely</span>
          </div>

          <h1 style={{fontSize:48,fontWeight:900,color:'white',lineHeight:1.15,marginBottom:20,letterSpacing:'-1px'}}>
            أدر مخزونك<br/>
            <span style={{background:'linear-gradient(135deg,#4ade80,#16a34a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              بذكاء وسهولة
            </span>
          </h1>
          <p style={{fontSize:17,color:'rgba(255,255,255,.55)',lineHeight:1.8,marginBottom:48,maxWidth:400}}>
            منصة إدارة مخزون عربية متكاملة — من تتبع المنتجات لإدارة الفروع والموظفين، كل شي في مكان واحد.
          </p>

          <div style={{background:'rgba(255,255,255,.05)',borderRadius:20,padding:'24px',border:'1px solid rgba(255,255,255,.08)',backdropFilter:'blur(10px)'}}>
            {features.map((f,i) => (
              <div key={i} className="feature-item" style={{animationDelay:`${i*0.1}s`}}>
                <div style={{width:40,height:40,borderRadius:12,background:'rgba(74,222,128,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{f.icon}</div>
                <span style={{fontSize:15,color:'rgba(255,255,255,.8)',fontWeight:500}}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{width:'100%',maxWidth:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'30px 24px',position:'relative',zIndex:10}}>
        <div style={{
          width:'100%',background:'rgba(255,255,255,.97)',borderRadius:28,padding:'40px 36px',
          boxShadow:'0 32px 80px rgba(0,0,0,.4)',animation:'fadeUp .5s ease both',
        }}>
          {/* Mobile logo */}
          <div style={{textAlign:'center',marginBottom:28}}>
            <img src="/storely-logo.png" alt="Storely" style={{width:56,height:56,borderRadius:16,margin:'0 auto 12px',display:'block',objectFit:'cover'}}/>
            <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:'0 0 4px'}}>Storely</h2>
            <p style={{fontSize:13,color:'#94a3b8',margin:0}}>نظام إدارة المخزون</p>
          </div>

          {/* Tabs */}
          {(mode==='login'||mode==='register') && (
            <div style={{display:'flex',background:'#f1f5f9',borderRadius:14,padding:4,marginBottom:28,gap:4}}>
              {(['login','register'] as const).map(m => (
                <button key={m} type="button" className="tab-btn" onClick={() => {setMode(m);setError('')}}
                  style={{background:mode===m?'white':'transparent',color:mode===m?'#16a34a':'#64748b',fontWeight:mode===m?800:500,boxShadow:mode===m?'0 2px 8px rgba(0,0,0,.08)':'none'}}>
                  {m==='login'?'تسجيل الدخول':'حساب جديد'}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="fade-in" style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:18,fontSize:13,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center',gap:8}}>
              ⚠️ {error}
            </div>
          )}

          {/* Login */}
          {mode==='login' && (
            <form onSubmit={handleLogin} className="fade-in">
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="inp-field" placeholder="example@email.com" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <div style={{marginBottom:28}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="inp-field" placeholder="••••••••" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>
                    جاري الدخول...
                  </span>
                ) : 'دخول ←'}
              </button>
            </form>
          )}

          {/* Register */}
          {mode==='register' && (
            <form onSubmit={handleRegister} className="fade-in">
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المؤسسة</label>
                <input type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} className="inp-field" placeholder="مثال: مستودع النجمة" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8}}>نوع النشاط</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[
                    {v:'مطعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخبز',icon:'🥖'},
                    {v:'بقالة',icon:'🛒'},{v:'صيدلية',icon:'💊'},{v:'مستودع',icon:'🏭'},
                    {v:'متجر إلكتروني',icon:'🛍️'},{v:'أخرى',icon:'🏢'},
                  ].map(b=>(
                    <button key={b.v} type="button" onClick={()=>setBusinessType(b.v)}
                      style={{padding:'10px 6px',borderRadius:10,border:`2px solid ${businessType===b.v?'#16a34a':'#e2e8f0'}`,background:businessType===b.v?'#f0fdf4':'white',color:businessType===b.v?'#16a34a':'#6b7280',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .15s'}}>
                      <span style={{fontSize:20}}>{b.icon}</span>
                      <span>{b.v}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'none'}}>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="inp-field" placeholder="example@email.com" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم الجوال</label>
                <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} className="inp-field" placeholder="0561234567" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="inp-field" placeholder="6 أحرف على الأقل" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:10}}>عدد الفروع</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                  {[{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5+'}].map(b=>(
                    <button key={b.v} type="button" className="branch-btn" onClick={()=>setBranchCount(b.v)}
                      style={{border:`2px solid ${branchCount===b.v?'#16a34a':'#e2e8f0'}`,background:branchCount===b.v?'#f0fdf4':'white',color:branchCount===b.v?'#16a34a':'#6b7280'}}>
                      {b.l}
                    </button>
                  ))}
                </div>
                {branchCount && (
                  <div className="fade-in" style={{marginTop:10,padding:'10px 14px',background:'#f0fdf4',borderRadius:10,fontSize:12,color:'#16a34a',fontWeight:700,border:'1px solid #bbf7d0'}}>
                    ✓ {branchCount===1?'الباقة الأساسية — 99 ر.س/شهر':branchCount<=3?'الباقة المتوسطة — 199 ر.س/شهر':'الباقة المتقدمة — 349 ر.س/شهر'}
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب ←'}
              </button>
            </form>
          )}

          {/* Success */}
          {mode==='success' && (
            <div className="fade-in" style={{textAlign:'center'}}>
              <div style={{fontSize:64,marginBottom:16,animation:'float 3s ease-in-out infinite'}}>🎉</div>
              <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم إنشاء حسابك!</h2>
              <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>
                حسابك بانتظار التفعيل.<br/>للاشتراك تواصل معنا:
              </p>
              <a href={`https://wa.me/966594351667?text=${encodeURIComponent('مرحباً، سجلت في Storely باسم: '+successData.name+' - أريد الاشتراك')}`}
                target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',padding:'15px',background:'#25d366',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',textDecoration:'none',boxShadow:'0 6px 20px rgba(37,211,102,.35)',marginBottom:12}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                تواصل معنا على واتساب
              </a>
              <button onClick={()=>setMode('login')} style={{width:'100%',padding:'12px',background:'transparent',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                العودة لتسجيل الدخول
              </button>
            </div>
          )}

          {/* Forgot */}
          {mode==='forgot' && (
            <form onSubmit={handleForgotPassword} className="fade-in">
              <button type="button" onClick={()=>{setMode('login');setError('')}} style={{background:'none',border:'none',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16,padding:0,display:'flex',alignItems:'center',gap:4}}>
                ← رجوع
              </button>
              <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:20}}>أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.</p>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="inp-field" placeholder="example@email.com" style={{background:'#f8fafc',color:'#1e293b',border:'1.5px solid #e2e8f0'}}/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
              </button>
            </form>
          )}

          {/* Forgot sent */}
          {mode==='forgot-sent' && (
            <div className="fade-in" style={{textAlign:'center'}}>
              <div style={{fontSize:56,marginBottom:16}}>📧</div>
              <h2 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم إرسال الرابط!</h2>
              <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>تحقق من بريدك ({email}) واضغط الرابط لإعادة تعيين كلمة المرور.</p>
              <button onClick={()=>{setMode('login');setError('')}} className="btn-primary">رجوع لتسجيل الدخول</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .desk-only { display: none !important; } }
        .desk-only { display: flex; flex-direction: column; }
      `}</style>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><LoginPage /></Suspense>
}
