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

const PLANS = [
  { v:1,  label:'الأساسية',  price:'149', desc:'فرع · 2 موظفين · 3 موردين',                    color:'#16a34a' },
  { v:3,  label:'المتوسطة',  price:'249', desc:'3 فروع · 10 موظفين · 10 موردين',               color:'#0d9488' },
  { v:10, label:'المتقدمة',  price:'399', desc:'فروع غير محدودة · موظفون وموردون غير محدودين', color:'#7c3aed' },
]

const BUSINESS_TYPES = [
  {v:'مطعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخبز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدلية',icon:'💊'},{v:'مستودع',icon:'🏭'},
  {v:'متجر إلكتروني',icon:'🛍️'},{v:'أخرى',icon:'🏢'},
]

function LoginPage() {
  const [mode, setMode] = useState<'login'|'register'|'forgot'|'forgot-sent'>(() => {
    if (typeof window !== 'undefined') {
      if (new URLSearchParams(window.location.search).get('mode') === 'register') return 'register'
    }
    return 'login'
  })
  const [step, setStep]               = useState(1)
  const [otpSent, setOtpSent]         = useState(false)
  const [otp, setOtp]                 = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [sendingOtp, setSendingOtp]   = useState(false)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [orgName, setOrgName]         = useState('')
  const [phone, setPhone]             = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [businessType, setBusinessType] = useState('')
  const [branchCount, setBranchCount] = useState<number|null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://storely.dev/reset-password' })
    setLoading(false)
    if (error) { setError('تأكد من صحة البريد'); return }
    setMode('forgot-sent')
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!orgName.trim()) { setError('أدخل اسم المؤسسة'); return }
    if (!phone.trim())   { setError('أدخل رقم الجوال'); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setStep(2)
  }

  async function sendOtp() {
    if (!phone.trim()) { setError('أدخل رقم الجوال أولاً'); return }
    setSendingOtp(true); setError('')
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone: phone.trim(), countryCode })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSendingOtp(false); return }
    setOtpSent(true); setSendingOtp(false)
  }

  async function verifyOtp() {
    if (!otp.trim()) { setError('أدخل رمز التحقق'); return }
    setSendingOtp(true); setError('')
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone: phone.trim(), countryCode, otp })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSendingOtp(false); return }
    setOtpVerified(true); setSendingOtp(false); setError('')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!otpVerified) { setError('يجب التحقق من رقم الجوال أولاً'); return }
    if (!branchCount) { setError('اختر الباقة المناسبة'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setError('📧 هذا البريد الإلكتروني مسجّل مسبقاً — سجّل الدخول أو استعد كلمة المرور')
      } else {
        setError(error.message)
      }
      setLoading(false); return
    }
    if (data.user) {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '')
      // تحقق من تكرار رقم الجوال
      const { data: existingPhone } = await supabase.from('profiles').select('id').eq('phone', phone.trim()).maybeSingle()
      if (existingPhone) {
        await supabase.auth.admin?.deleteUser?.(data.user.id).catch(()=>{})
        setError('رقم الجوال هذا مرتبط بحساب آخر — استخدم رقماً مختلفاً')
        setLoading(false); return
      }
      const trialEnds = new Date(Date.now() + 14*24*60*60*1000).toISOString()
      // استخدم service role API لإنشاء المنشأة
      const regRes = await fetch('/api/register-org', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          userId: data.user.id,
          orgName: orgName.trim(),
          fullPhone,
          businessType: businessType||'مطعم',
          branchCount,
          phone: phone.trim(),
          trialEnds
        })
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        await fetch('/api/cleanup-failed-registration', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ userId: data.user.id })
        }).catch(()=>{})
        setError('خطأ في إنشاء المنشأة: ' + regData.error)
        setLoading(false); return
      }
      fetch('/api/notify-welcome', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: orgName.trim(), phone: fullPhone })
      }).catch(()=>{})
      // حاول تسجيل الدخول مباشرة بعد التسجيل
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr) {
        window.location.href = '/dashboard'
      } else {
        setMode('registered' as any)
      }
    }
    setLoading(false)
  }

  const phonePlaceholder = countryCode==='+966'?'5xxxxxxxx':countryCode==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#ffffff',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .inp{width:100%;padding:13px 16px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;background:white;color:#111827;font-family:inherit;transition:border-color .2s}
        .inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}
        .inp::placeholder{color:#9ca3af}
        .btn-main{width:100%;padding:14px;background:#16a34a;color:white;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn-main:hover{background:#15803d}
        .btn-main:disabled{opacity:.6;cursor:not-allowed}
        .tab{flex:1;padding:12px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s}
        .biz{padding:12px 8px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;font-size:12px;font-weight:600;color:#374151}
        .biz:hover{border-color:#16a34a}
        .biz.on{border-color:#16a34a;background:#f0fdf4;color:#16a34a}
        @media(max-width:768px){.right-panel{display:none!important}}
      `}</style>

      {/* Navbar */}
      <nav style={{padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:38,height:38,borderRadius:10,objectFit:'cover'}}/>
          <span style={{fontSize:18,fontWeight:800,color:'#111827',letterSpacing:'-0.3px'}}>Storely</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:13,color:'#6b7280'}}>عندك حساب؟</span>
          <button onClick={()=>{setMode('login');setError('');setStep(1)}}
            style={{padding:'8px 18px',background:'none',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'#374151',transition:'border-color .2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#16a34a'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
            تسجيل الدخول
          </button>
        </div>
      </nav>

      <div style={{flex:1,display:'flex'}}>
        {/* Left — Form */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
          <div style={{width:'100%',maxWidth:420,animation:'fadeUp .4s ease'}}>

            {/* Login */}
            {mode==='login' && (
              <>
                <div style={{marginBottom:32}}>
                  <h1 style={{fontSize:28,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>أهلاً بعودتك</h1>
                  <p style={{fontSize:15,color:'#6b7280'}}>سجّل دخولك لإدارة مخزونك</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>كلمة المرور</label>
                      <button type="button" onClick={()=>{setMode('forgot');setError('')}}
                        style={{background:'none',border:'none',fontSize:13,color:'#16a34a',cursor:'pointer',fontFamily:'inherit',fontWeight:600,padding:0}}>
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>
                  </div>
                  <button type="submit" disabled={loading} className="btn-main" style={{marginTop:8}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الدخول...</span>:'دخول'}
                  </button>
                </form>
                <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'#6b7280'}}>
                  ما عندك حساب؟{' '}
                  <button onClick={()=>{setMode('register');setError('');setStep(1)}} style={{background:'none',border:'none',color:'#16a34a',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    سجّل الآن مجاناً
                  </button>
                </div>
              </>
            )}

            {/* Register Step 1 */}
            {mode==='register' && step===1 && (
              <>
                <div style={{marginBottom:28}}>
                  <div style={{display:'flex',gap:4,marginBottom:20}}>
                    {[1,2].map(s=>(
                      <div key={s} style={{flex:1,height:3,borderRadius:99,background:step>=s?'#16a34a':'#e5e7eb',transition:'background .3s'}}/>
                    ))}
                  </div>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>أنشئ حسابك مجاناً</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>7 أيام تجربة مجانية — لا يتطلب بطاقة</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={nextStep} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>اسم المؤسسة *</label>
                    <input className="inp" type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="مثال: مستودع النجمة"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:8}}>نوع النشاط</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
                      {BUSINESS_TYPES.map(b=>(
                        <button key={b.v} type="button" onClick={()=>setBusinessType(b.v)} className={`biz${businessType===b.v?' on':''}`}>
                          <span style={{fontSize:20}}>{b.icon}</span>
                          <span style={{fontSize:11}}>{b.v}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني *</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>رقم واتساب *</label>
                    <div style={{display:'flex',border:'1.5px solid #e5e7eb',borderRadius:10,overflow:'hidden',background:'white',transition:'border-color .2s'}}
                      onFocusCapture={e=>(e.currentTarget as HTMLElement).style.borderColor='#16a34a'}
                      onBlurCapture={e=>(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb'}>
                      <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                        style={{background:'transparent',border:'none',borderLeft:'1.5px solid #e5e7eb',padding:'12px 8px',fontSize:13,fontFamily:'inherit',outline:'none',cursor:'pointer',direction:'ltr',color:'#111827',minWidth:100}}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input type="tel" required value={phone} onChange={e=>{setPhone(e.target.value);setOtpSent(false);setOtpVerified(false);setOtp('')}}
                        placeholder={phonePlaceholder} dir="ltr"
                        style={{background:'transparent',border:'none',padding:'12px 14px',fontSize:14,color:'#111827',flex:1,outline:'none',fontFamily:'inherit'}}/>
                    </div>
                    {/* زر إرسال OTP */}
                    {!otpVerified && (
                      <button type="button" onClick={sendOtp} disabled={sendingOtp||!phone.trim()}
                        style={{marginTop:8,width:'100%',padding:'10px',background:otpSent?'#f0fdf4':'#16a34a',color:otpSent?'#16a34a':'white',border:`1.5px solid #16a34a`,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
                        {sendingOtp?'⏳ جاري الإرسال...':otpSent?'✅ تم الإرسال — أعد الإرسال':'📲 أرسل رمز التحقق عبر واتساب'}
                      </button>
                    )}
                    {/* خانة OTP */}
                    {otpSent && !otpVerified && (
                      <div style={{marginTop:8,display:'flex',gap:8}}>
                        <input type="number" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="أدخل الرمز المكون من 6 أرقام"
                          style={{flex:1,padding:'11px 14px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit',direction:'ltr',textAlign:'center',letterSpacing:4}}/>
                        <button type="button" onClick={verifyOtp} disabled={sendingOtp||!otp.trim()}
                          style={{padding:'11px 16px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                          {sendingOtp?'...':'تحقق ✓'}
                        </button>
                      </div>
                    )}
                    {otpVerified && (
                      <div style={{marginTop:8,padding:'10px 14px',background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,color:'#16a34a',textAlign:'center'}}>
                        ✅ تم التحقق من رقم الجوال
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>كلمة المرور *</label>
                    <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/>
                    {password.length>0 && (
                      <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                        {[1,2,3].map(l=>(
                          <div key={l} style={{flex:1,height:3,borderRadius:99,background:password.length>=l*3?(l===1?'#ef4444':l===2?'#f59e0b':'#16a34a'):'#e5e7eb',transition:'background .3s'}}/>
                        ))}
                        <span style={{fontSize:11,color:'#9ca3af',flexShrink:0}}>{password.length<4?'ضعيفة':password.length<7?'متوسطة':'قوية'}</span>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn-main" style={{marginTop:4}}>التالي — اختر الباقة →</button>
                </form>
                <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
                  عندك حساب؟{' '}
                  <button onClick={()=>{setMode('login');setError('')}} style={{background:'none',border:'none',color:'#16a34a',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    سجّل الدخول
                  </button>
                </div>
              </>
            )}

            {/* Register Step 2 */}
            {mode==='register' && step===2 && (
              <>
                <div style={{marginBottom:28}}>
                  <div style={{display:'flex',gap:4,marginBottom:20}}>
                    {[1,2].map(s=>(
                      <div key={s} style={{flex:1,height:3,borderRadius:99,background:step>=s?'#16a34a':'#e5e7eb',transition:'background .3s'}}/>
                    ))}
                  </div>
                  <button type="button" onClick={()=>{setStep(1);setError('')}}
                    style={{background:'none',border:'none',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0,marginBottom:12,display:'flex',alignItems:'center',gap:4}}>
                    ← رجوع
                  </button>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>اختر الباقة المناسبة</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>يمكنك تغييرها لاحقاً</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:10}}>
                  {PLANS.map(p=>(
                    <button key={p.v} type="button" onClick={()=>setBranchCount(p.v)}
                      style={{padding:'16px 18px',borderRadius:12,border:`1.5px solid ${branchCount===p.v?p.color:'#e5e7eb'}`,background:branchCount===p.v?p.color+'08':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:branchCount===p.v?p.color:'#111827',marginBottom:3}}>{p.label}</div>
                        <div style={{fontSize:12,color:'#6b7280'}}>{p.desc}</div>
                      </div>
                      <div style={{flexShrink:0,marginRight:12,textAlign:'left'}}>
                        <span style={{fontSize:20,fontWeight:800,color:branchCount===p.v?p.color:'#111827'}}>{p.price}</span>
                        <span style={{fontSize:12,color:'#9ca3af'}}> ر.س/شهر</span>
                      </div>
                    </button>
                  ))}

                  {branchCount && (
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'11px 14px',fontSize:13,color:'#16a34a',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      ✓ 7 أيام تجربة مجانية — سيتم التواصل معك لإتمام الدفع
                    </div>
                  )}

                  <button type="submit" disabled={loading||!branchCount} className="btn-main" style={{marginTop:8,opacity:!branchCount?.6:1}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>جاري الإنشاء...</span>:'إنشاء الحساب'}
                  </button>
                </form>
              </>
            )}

            {/* Forgot */}
            {mode==='forgot' && (
              <>
                <button onClick={()=>{setMode('login');setError('')}}
                  style={{background:'none',border:'none',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0,marginBottom:24,display:'flex',alignItems:'center',gap:4}}>
                  ← رجوع
                </button>
                <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>استعادة كلمة المرور</h1>
                <p style={{fontSize:14,color:'#6b7280',marginBottom:28}}>سنرسل لك رابط الاستعادة على بريدك</p>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleForgot} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <button type="submit" disabled={loading} className="btn-main">
                    {loading?'جاري الإرسال...':'إرسال رابط الاستعادة'}
                  </button>
                </form>
              </>
            )}

            {/* Forgot Sent */}
            {(mode as any)==='registered' && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:56,marginBottom:16}}>📬</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>تحقق من بريدك الإلكتروني</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.8,marginBottom:8}}>
                  أرسلنا رابط التفعيل إلى<br/>
                  <b style={{color:'#111827'}}>{email}</b>
                </p>
                <p style={{fontSize:13,color:'#9ca3af',marginBottom:28,lineHeight:1.7}}>
                  اضغط الرابط في البريد لتفعيل حسابك والدخول.<br/>
                  تأكد من مجلد Spam إذا ما وصلك البريد.
                </p>
                <button onClick={()=>setMode('login')} style={{background:'#16a34a',color:'white',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  رجوع لتسجيل الدخول
                </button>
              </div>
            )}
            {mode==='forgot-sent' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>📧</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>تم الإرسال!</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:28}}>تحقق من بريدك <b style={{color:'#111827'}}>{email}</b><br/>واضغط الرابط لإعادة تعيين كلمة المرور</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">رجوع لتسجيل الدخول</button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Branding */}
        <div className="right-panel" style={{width:'45%',background:'#f9fafb',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 48px',borderRight:'1px solid #f3f4f6'}}>
          <div style={{maxWidth:400}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:700,color:'#16a34a',marginBottom:28}}>
              ✓ نظام إدارة مخزون سعودي
            </div>
            <h2 style={{fontSize:36,fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:16,letterSpacing:'-1px'}}>
              أدر مخزونك<br/>
              <span style={{color:'#16a34a'}}>بذكاء وسهولة</span>
            </h2>
            <p style={{fontSize:15,color:'#6b7280',lineHeight:1.8,marginBottom:36}}>
              تتبع مخزونك لحظة بلحظة، واستقبل تنبيهات واتساب عند نقص الأصناف، وأدر موظفيك وفروعك من مكان واحد
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[
                {icon:'📦',text:'تتبع المخزون لحظة بلحظة'},
                {icon:'📲',text:'تنبيهات واتساب تلقائية'},
                {icon:'👥',text:'إدارة الموظفين والفروع'},
                {icon:'📊',text:'تقارير وإحصائيات احترافية'},
              ].map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:9,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{f.icon}</div>
                  <span style={{fontSize:14,color:'#374151',fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:36,padding:'18px 20px',background:'white',borderRadius:12,border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',gap:24}}>
                {[['149 ر.س','يبدأ من'],['14 يوم','تجربة مجانية'],['7','لغات مدعومة']].map(([n,l])=>(
                  <div key={l}>
                    <div style={{fontSize:20,fontWeight:900,color:'#16a34a'}}>{n}</div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><LoginPage /></Suspense>
}
