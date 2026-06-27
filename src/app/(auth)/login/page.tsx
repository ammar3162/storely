'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن' },
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+249', flag: '🇸🇩', name: 'السودان' },
  { code: '+1',   flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44',  flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+91',  flag: '🇮🇳', name: 'الهند' },
  { code: '+92',  flag: '🇵🇰', name: 'باكستان' },
  { code: '+880', flag: '🇧🇩', name: 'بنغلاديش' },
  { code: '+63',  flag: '🇵🇭', name: 'الفلبين' },
]

const BUSINESS_TYPES = [
  {v:'مطعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخبز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدلية',icon:'💊'},{v:'مستودع',icon:'🏭'},
  {v:'متجر إلكتروني',icon:'🛍️'},{v:'أخرى',icon:'🏢'},
]

const PLANS = [
  {v:1,  label:'الأساسية', price:'149', desc:'فرع · 2 موظف · 3 موردين',              color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
  {v:3,  label:'المتوسطة', price:'249', desc:'3 فروع · 10 موظفين · 10 موردين',       color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe'},
  {v:10, label:'المتقدمة', price:'399', desc:'فروع غير محدودة · موظفون وموردون غير محدودين', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe'},
]

function LoginPage() {
  const [mode, setMode] = useState<'login'|'register'|'success'|'forgot'|'forgot-sent'>(() => {
    if (typeof window !== 'undefined') {
      if (new URLSearchParams(window.location.search).get('mode') === 'register') return 'register'
    }
    return 'login'
  })
  const [step, setStep]             = useState(1) // register steps: 1=info, 2=plan
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [orgName, setOrgName]       = useState('')
  const [phone, setPhone]           = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [businessType, setBusinessType] = useState('')
  const [branchCount, setBranchCount] = useState<number|null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [successData, setSuccessData] = useState({name:'',phone:''})
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash
    if (hash?.includes('type=recovery') && hash.includes('access_token')) {
      window.location.href = '/reset-password' + hash
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('البريد أو كلمة المرور غير صحيحة'); setLoading(false); return }
    if (data.session) {
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', data.session.user.id).single()
      if (profile?.org_id) {
        const { data: org } = await (supabase.from('organizations') as any).select('onboarding_done').eq('id', profile.org_id).single()
        if (org && !org.onboarding_done) { window.location.href = '/onboarding'; return }
      }
      window.location.href = '/dashboard'
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://storely.dev/reset-password' })
    setLoading(false)
    if (error) { setError('تأكد من صحة البريد الإلكتروني'); return }
    setMode('forgot-sent')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!branchCount) { setError('اختر الباقة المناسبة'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '')
      const { data: org, error: orgErr } = await supabase.from('organizations')
        .insert({ name: orgName.trim(), whatsapp_number: fullPhone, low_stock_threshold: 5, business_type: businessType||'مطعم', requested_plan: branchCount===1?'basic':branchCount<=3?'pro':'advanced' } as any)
        .select().single()
      if (orgErr) { setError('خطأ في إنشاء المؤسسة'); setLoading(false); return }
      if (org) {
        const maxB = branchCount===1?1:branchCount<=3?3:10
        const planName = branchCount===1?'basic':branchCount<=3?'pro':'advanced'
        await (supabase.from('organizations') as any).update({ max_branches:maxB, plan:planName, max_staff:branchCount===1?1:999 }).eq('id',org.id)
        const trialEnds = new Date(Date.now() + 7*24*60*60*1000).toISOString()
        await supabase.from('profiles').upsert({ id:data.user.id, org_id:org.id, full_name:orgName.trim(), role:'owner', phone:phone.trim(), status:'active', subscription_type:'trial', subscription_ends_at:trialEnds } as any, { onConflict:'id' })
        // رسالة ترحيب
        fetch('/api/notify-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: orgName.trim(), phone: countryCode + phone.trim().replace(/^0+/, '') })
        }).catch(()=>{})
        setSuccessData({name:orgName.trim(),phone:phone.trim()})
        window.location.href = '/onboarding'
      }
    }
    setLoading(false)
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!orgName.trim()) { setError('أدخل اسم المؤسسة'); return }
    if (!phone.trim())   { setError('أدخل رقم الجوال'); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setStep(2)
  }

  const phonePlaceholder = countryCode==='+966'?'5xxxxxxxx':countryCode==='+20'?'1xxxxxxxxx':countryCode==='+1'?'xxxxxxxxxx':'xxxxxxxxxx'

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif", direction:'rtl', background:'linear-gradient(160deg,#0a1f13 0%,#0d2818 60%,#0a1a0d 100%)', position:'relative', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.8;transform:scale(1.05)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .fade-up{animation:fadeUp .4s ease both}
        .fade-in{animation:fadeIn .3s ease both}
        .inp{width:100%;padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;background:#f8fafc;color:#0f172a;font-family:inherit;font-weight:500;transition:border-color .2s,box-shadow .2s}
        .inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.1)}
        .inp::placeholder{color:#94a3b8}
        .btn-main{width:100%;padding:15px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 6px 20px rgba(22,163,74,.3)}
        .btn-main:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(22,163,74,.4)}
        .btn-main:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
        .tab{flex:1;padding:11px;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s}
        .biz-btn{padding:12px 6px;border-radius:12px;border:2px solid #e2e8f0;background:white;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all .15s;font-size:12px;font-weight:700;color:#374151}
        .biz-btn:hover{border-color:#16a34a;background:#f0fdf4}
        .biz-btn.active{border-color:#16a34a;background:#f0fdf4;color:#16a34a}
        @media(max-width:768px){.left-panel{display:none!important}}
      `}</style>

      {/* bg blobs */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        <div style={{position:'absolute',top:'-15%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.15),transparent 70%)',animation:'pulse 7s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'-10%',left:'5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,222,128,.1),transparent 70%)',animation:'pulse 9s ease-in-out infinite 3s'}}/>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.03}} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
      </div>

      {/* Left — branding */}
      <div className="left-panel" style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px 72px',position:'relative',zIndex:1}}>
        <div style={{animation:'fadeUp .6s ease both'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:52}}>
            <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,boxShadow:'0 8px 24px rgba(22,163,74,.3)'}}>🏪</div>
            <span style={{fontSize:28,fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>Storely</span>
          </div>
          <h1 style={{fontSize:52,fontWeight:900,color:'white',lineHeight:1.1,marginBottom:18,letterSpacing:'-1.5px'}}>
            أدر مخزونك<br/>
            <span style={{background:'linear-gradient(135deg,#4ade80,#16a34a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>بذكاء وسهولة</span>
          </h1>
          <p style={{fontSize:17,color:'rgba(255,255,255,.5)',lineHeight:1.8,marginBottom:52,maxWidth:420}}>
            منصة عربية متكاملة لإدارة المخزون مع تنبيهات واتساب، إدارة الموظفين، والتقارير.
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:0,background:'rgba(255,255,255,.05)',borderRadius:20,border:'1px solid rgba(255,255,255,.08)',overflow:'hidden'}}>
            {[
              {icon:'📦',title:'تتبع لحظي',desc:'راقب كل صنف في الوقت الحقيقي'},
              {icon:'📲',title:'تنبيهات واتساب',desc:'إشعار فوري قبل نفاد المخزون'},
              {icon:'🌍',title:'7 لغات',desc:'واجهة موظفين متعددة اللغات'},
              {icon:'📊',title:'تقارير متقدمة',desc:'تصدير CSV بضغطة واحدة'},
            ].map((f,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'18px 24px',borderBottom:i<3?'1px solid rgba(255,255,255,.06)':'none'}}>
                <div style={{width:42,height:42,borderRadius:12,background:'rgba(74,222,128,.12)',border:'1px solid rgba(74,222,128,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{f.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'white'}}>{f.title}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{width:'100%',maxWidth:480,display:'flex',alignItems:'center',justifyContent:'center',padding:'28px 20px',position:'relative',zIndex:10,minHeight:'100vh'}}>
        <div style={{width:'100%',background:'white',borderRadius:28,padding:'36px 32px',boxShadow:'0 32px 80px rgba(0,0,0,.45)',animation:'fadeUp .5s ease both',maxHeight:'calc(100vh - 40px)',overflowY:'auto'}}>

          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{width:52,height:52,borderRadius:15,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 10px',boxShadow:'0 6px 18px rgba(22,163,74,.25)'}}>🏪</div>
            <div style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>Storely</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>نظام إدارة المخزون</div>
          </div>

          {/* Tabs */}
          {(mode==='login'||mode==='register') && (
            <div style={{display:'flex',background:'#f1f5f9',borderRadius:14,padding:4,marginBottom:24,gap:4}}>
              {(['login','register'] as const).map(m=>(
                <button key={m} type="button" className="tab" onClick={()=>{setMode(m);setError('');setStep(1)}}
                  style={{background:mode===m?'white':'transparent',color:mode===m?'#16a34a':'#64748b',fontWeight:mode===m?800:500,boxShadow:mode===m?'0 2px 8px rgba(0,0,0,.08)':'none'}}>
                  {m==='login'?'تسجيل الدخول':'حساب جديد'}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="fade-in" style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'11px 14px',marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center',gap:8}}>
              ⚠️ {error}
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode==='login' && (
            <form onSubmit={handleLogin} className="fade-in">
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
              </div>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور</label>
                <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
              </div>
              <button type="submit" disabled={loading} className="btn-main">
                {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الدخول...</span>:'دخول ←'}
              </button>
              <button type="button" onClick={()=>{setMode('forgot');setError('')}}
                style={{width:'100%',marginTop:12,padding:'10px',background:'none',color:'#64748b',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                نسيت كلمة المرور؟
              </button>
            </form>
          )}

          {/* ── REGISTER STEP 1 ── */}
          {mode==='register' && step===1 && (
            <form onSubmit={nextStep} className="fade-in">
              {/* Progress */}
              <div style={{display:'flex',gap:6,marginBottom:22}}>
                {[1,2].map(s=>(
                  <div key={s} style={{flex:1,height:4,borderRadius:99,background:step>=s?'#16a34a':'#e2e8f0',transition:'background .3s'}}/>
                ))}
              </div>
              <div style={{fontSize:13,color:'#94a3b8',marginBottom:18,fontWeight:500}}>الخطوة 1 من 2 — بياناتك</div>

              {/* اسم المؤسسة */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>اسم المؤسسة *</label>
                <input className="inp" type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="مثال: مستودع النجمة"/>
              </div>

              {/* نوع النشاط */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8}}>نوع النشاط</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {BUSINESS_TYPES.map(b=>(
                    <button key={b.v} type="button" onClick={()=>setBusinessType(b.v)}
                      className={`biz-btn${businessType===b.v?' active':''}`}>
                      <span style={{fontSize:22}}>{b.icon}</span>
                      <span style={{fontSize:11}}>{b.v}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* البريد */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني *</label>
                <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
              </div>

              {/* الجوال */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>رقم واتساب التنبيهات *</label>
                <div style={{display:'flex',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',overflow:'hidden',transition:'border-color .2s,box-shadow .2s'}}
                  onFocusCapture={e=>{(e.currentTarget as HTMLElement).style.borderColor='#16a34a';(e.currentTarget as HTMLElement).style.boxShadow='0 0 0 3px rgba(22,163,74,.1)'}}
                  onBlurCapture={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e2e8f0';(e.currentTarget as HTMLElement).style.boxShadow='none'}}>
                  <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                    style={{background:'transparent',border:'none',borderLeft:'1.5px solid #e2e8f0',padding:'12px 8px',fontSize:13,fontFamily:'inherit',outline:'none',cursor:'pointer',direction:'ltr',color:'#0f172a',minWidth:110}}>
                    {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)}
                    placeholder={phonePlaceholder} dir="ltr"
                    style={{background:'transparent',border:'none',padding:'12px 14px',fontSize:14,color:'#0f172a',flex:1,outline:'none',fontFamily:'inherit',fontWeight:500}}/>
                </div>
              </div>

              {/* كلمة المرور */}
              <div style={{marginBottom:22}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور *</label>
                <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/>
                {password.length>0 && (
                  <div style={{marginTop:6,display:'flex',gap:4}}>
                    {[1,2,3].map(l=>(
                      <div key={l} style={{flex:1,height:3,borderRadius:99,background:password.length>=l*3?(l===1?'#ef4444':l===2?'#f59e0b':'#16a34a'):'#e2e8f0',transition:'background .3s'}}/>
                    ))}
                    <span style={{fontSize:10,color:'#94a3b8',marginRight:4}}>
                      {password.length<4?'ضعيفة':password.length<7?'متوسطة':'قوية'}
                    </span>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-main">التالي — اختر الباقة ←</button>
            </form>
          )}

          {/* ── REGISTER STEP 2 ── */}
          {mode==='register' && step===2 && (
            <form onSubmit={handleRegister} className="fade-in">
              {/* Progress */}
              <div style={{display:'flex',gap:6,marginBottom:22}}>
                {[1,2].map(s=>(
                  <div key={s} style={{flex:1,height:4,borderRadius:99,background:step>=s?'#16a34a':'#e2e8f0',transition:'background .3s'}}/>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <button type="button" onClick={()=>{setStep(1);setError('')}}
                  style={{background:'none',border:'none',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,padding:0}}>
                  ← رجوع
                </button>
                <span style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>الخطوة 2 من 2 — الباقة</span>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                {PLANS.map(p=>(
                  <button key={p.v} type="button" onClick={()=>setBranchCount(p.v)}
                    style={{padding:'16px 18px',borderRadius:16,border:`2px solid ${branchCount===p.v?p.color:p.border}`,background:branchCount===p.v?p.bg:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',display:'flex',justifyContent:'space-between',alignItems:'center',position:'relative',overflow:'hidden'}}>
                    {branchCount===p.v && (
                      <div style={{position:'absolute',top:10,left:14,width:22,height:22,borderRadius:'50%',background:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white',fontWeight:800}}>✓</div>
                    )}
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:branchCount===p.v?p.color:'#0f172a',marginBottom:3}}>{p.label}</div>
                      <div style={{fontSize:12,color:'#64748b'}}>{p.desc}</div>
                    </div>
                    <div style={{textAlign:'left',flexShrink:0,marginRight:branchCount===p.v?28:8}}>
                      <span style={{fontSize:22,fontWeight:900,color:branchCount===p.v?p.color:'#0f172a'}}>{p.price}</span>
                      <span style={{fontSize:12,color:'#94a3b8'}}> ر.س/شهر</span>
                    </div>
                  </button>
                ))}
              </div>

              {branchCount && (
                <div className="fade-in" style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'12px 16px',marginBottom:18,fontSize:13,color:'#16a34a',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                  ✅ سيتم التواصل معك بعد التسجيل لإتمام الدفع وتفعيل الحساب
                </div>
              )}

              <button type="submit" disabled={loading||!branchCount} className="btn-main"
                style={{opacity:!branchCount?.6:1}}>
                {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الإنشاء...</span>:'إنشاء الحساب ←'}
              </button>
            </form>
          )}

          {/* ── SUCCESS ── */}
          {mode==='success' && (
            <div className="fade-in" style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:72,marginBottom:16,animation:'float 3s ease-in-out infinite'}}>🎉</div>
              <h2 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم إنشاء حسابك!</h2>
              <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:28}}>حسابك بانتظار التفعيل.<br/>تواصل معنا لإتمام الاشتراك:</p>
              <a href={`https://wa.me/966594351667?text=${encodeURIComponent('مرحباً، سجلت في Storely باسم: '+successData.name+' — أريد الاشتراك')}`}
                target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'15px',background:'#25d366',color:'white',borderRadius:14,fontSize:15,fontWeight:800,textDecoration:'none',boxShadow:'0 6px 20px rgba(37,211,102,.35)',marginBottom:12}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                تواصل معنا على واتساب
              </a>
              <button onClick={()=>setMode('login')} style={{width:'100%',padding:'12px',background:'transparent',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                العودة لتسجيل الدخول
              </button>
            </div>
          )}

          {/* ── FORGOT ── */}
          {mode==='forgot' && (
            <form onSubmit={handleForgotPassword} className="fade-in">
              <button type="button" onClick={()=>{setMode('login');setError('')}}
                style={{background:'none',border:'none',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16,padding:0,display:'flex',alignItems:'center',gap:4}}>
                ← رجوع
              </button>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:48,marginBottom:12}}>🔑</div>
                <h3 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:6}}>استعادة كلمة المرور</h3>
                <p style={{fontSize:13,color:'#64748b',lineHeight:1.7}}>سنرسل لك رابط الاستعادة على بريدك</p>
              </div>
              <div style={{marginBottom:22}}>
                <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
              </div>
              <button type="submit" disabled={loading} className="btn-main">
                {loading?'جاري الإرسال...':'إرسال رابط الاستعادة'}
              </button>
            </form>
          )}

          {/* ── FORGOT SENT ── */}
          {mode==='forgot-sent' && (
            <div className="fade-in" style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:64,marginBottom:16}}>📧</div>
              <h2 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:8}}>تم الإرسال!</h2>
              <p style={{fontSize:14,color:'#64748b',lineHeight:1.8,marginBottom:24}}>تحقق من بريدك<br/><b style={{color:'#0f172a'}}>{email}</b><br/>واضغط الرابط لإعادة تعيين كلمة المرور.</p>
              <button onClick={()=>{setMode('login');setError('')}} className="btn-main">رجوع لتسجيل الدخول</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><LoginPage /></Suspense>
}
