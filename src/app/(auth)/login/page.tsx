'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import StoreMascot from '@/components/StoreMascot'
import { LanguageProvider, useTranslation } from '@/lib/i18n/LanguageContext'

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

const PHONE_RULES: Record<string,{length:number, prefix:string, placeholder:string}> = {
  '+966': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // السعودية
  '+971': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // الإمارات
  '+965': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // الكويت
  '+973': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // البحرين
  '+974': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // قطر
  '+968': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // عُمان
  '+967': { length:9,  prefix:'7',  placeholder:'7xxxxxxxx'   },  // اليمن
  '+20':  { length:10, prefix:'1',  placeholder:'1xxxxxxxxx'  },  // مصر
  '+962': { length:9,  prefix:'7',  placeholder:'7xxxxxxxx'   },  // الأردن
  '+961': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // لبنان
  '+963': { length:9,  prefix:'9',  placeholder:'9xxxxxxxx'   },  // سوريا
  '+964': { length:10, prefix:'7',  placeholder:'7xxxxxxxxx'  },  // العراق
  '+212': { length:9,  prefix:'6',  placeholder:'6xxxxxxxx'   },  // المغرب
  '+213': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // الجزائر
  '+216': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // تونس
  '+249': { length:9,  prefix:'9',  placeholder:'9xxxxxxxx'   },  // السودان
  '+1':   { length:10, prefix:'',   placeholder:'xxxxxxxxxx'  },  // أمريكا
  '+44':  { length:10, prefix:'7',  placeholder:'7xxxxxxxxx'  },  // بريطانيا
  '+91':  { length:10, prefix:'',   placeholder:'xxxxxxxxxx'  },  // الهند
  '+92':  { length:10, prefix:'3',  placeholder:'3xxxxxxxxx'  },  // باكستان
  '+880': { length:10, prefix:'1',  placeholder:'1xxxxxxxxx'  },  // بنغلاديش
  '+63':  { length:10, prefix:'9',  placeholder:'9xxxxxxxxx'  },  // الفلبين
}

const PLANS = [
  { v:1,  label:'الأساسية',  price:'149', yearlyPrice:'1430', desc:'فرع · 2 موظفين · 3 موردين',                    color:'#16a34a' },
  { v:3,  label:'المتوسطة',  price:'249', yearlyPrice:'2390', desc:'3 فروع · 10 موظفين · 10 موردين',               color:'#0d9488' },
  { v:10, label:'المتقدمة',  price:'399', yearlyPrice:'3830', desc:'فروع غير محدودة · موظفون وموردون غير محدودين', color:'#7c3aed' },
]

const BUSINESS_TYPES = [
  {v:'مطعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخبز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدلية',icon:'💊'},{v:'مستودع',icon:'🏭'},
  {v:'متجر إلكتروني',icon:'🛍️'},{v:'أخرى',icon:'🏢'},
]

function LoginPage() {
  const { t, lang, setLang } = useTranslation()
  const [forgotMethod, setForgotMethod] = useState<'email'|'whatsapp'>('email')
  const [forgotPhone, setForgotPhone] = useState('')
  const [mode, setMode] = useState<'login'|'register'|'forgot'|'forgot-sent'|'forgot-sent-wa'>(() => {
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
  const [mascotFocus, setMascotFocus] = useState<'email'|'password'|null>(null)
  const [cursorRatio, setCursorRatio] = useState(0.5)
  const [orgName, setOrgName]         = useState('')
  const [phone, setPhone]             = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [businessType, setBusinessType] = useState('')
  const [branchCount, setBranchCount] = useState<number|null>(() => {
    if (typeof window !== 'undefined') {
      const b = new URLSearchParams(window.location.search).get('branches')
      if (b && [1,3,10].includes(Number(b))) return Number(b)
    }
    return null
  })
  const [billing, setBilling] = useState<'monthly'|'yearly'>(() => {
    if (typeof window !== 'undefined') {
      if (new URLSearchParams(window.location.search).get('billing') === 'yearly') return 'yearly'
    }
    return 'monthly'
  })
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [accountStatus, setAccountStatus] = useState<'suspended'|'deleted'|null>(() => {
    if (typeof window !== 'undefined') {
      const reason = new URLSearchParams(window.location.search).get('reason')
      if (reason === 'suspended') return 'suspended'
      if (reason === 'deleted')   return 'deleted'
    }
    return null
  })
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    if (error) {
      try {
        const res = await fetch('/api/check-email-exists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
        const checkData = await res.json()
        if (checkData.exists === false) {
          setError('هذا الحساب غير موجود — سجّل حساب جديد مجاناً')
        } else {
          setError('كلمة المرور غير صحيحة — تقدر تستخدم "نسيت كلمة المرور؟"')
        }
      } catch {
        setError('البريد أو كلمة المرور غير صحيحة')
      }
      setLoading(false); return
    }
    if (data.session) {
      const { data: profile } = await supabase.from('profiles').select('org_id,status').eq('id', data.session.user.id).single()

      if (profile?.status === 'suspended' || profile?.status === 'deleted') {
        await supabase.auth.signOut()
        setAccountStatus(profile.status as 'suspended'|'deleted')
        setLoading(false)
        return
      }
      if (profile?.status === 'pending') { window.location.href = '/pending'; return }

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

  async function handleForgotWhatsapp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/forgot-password-whatsapp', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone: forgotPhone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'حدث خطأ'); return }
    setMode('forgot-sent-wa')
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!orgName.trim()) { setError('أدخل اسم المؤسسة'); return }
    if (!phone.trim())   { setError('أدخل رقم الجوال'); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    setStep(2)
  }

  function validatePassword(p: string): string|null {
    if (p.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    if (!/[A-Z]/.test(p)) return 'يجب أن تحتوي على حرف كبير (A-Z)'
    if (!/[a-z]/.test(p)) return 'يجب أن تحتوي على حرف صغير (a-z)'
    if (!/[0-9]/.test(p)) return 'يجب أن تحتوي على رقم'
    if (!/[@#$!%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(p)) return 'يجب أن تحتوي على رمز خاص (@#$!...)'
    return null
  }

  async function sendOtp() {
    if (!phone.trim()) { setError('أدخل رقم الجوال أولاً'); return }
    const rule = PHONE_RULES[countryCode] || { length:10, prefix:'', placeholder:'xxxxxxxxxx' }
    const cleanPhone = phone.trim().replace(/^0+/, '')
    if (cleanPhone.length !== rule.length) {
      setError(`رقم الجوال يجب أن يكون ${rule.length} أرقام لهذه الدولة`)
      return
    }
    if (rule.prefix && !cleanPhone.startsWith(rule.prefix)) {
      setError(`رقم الجوال يجب أن يبدأ بـ ${rule.prefix} لهذه الدولة`)
      return
    }
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
    // تم تعطيل إجبارية تحقق الـOTP مؤقتاً (2026-07-24) لحين حل مشكلة توصيل واتساب — راجع notification_logs
    if (!branchCount) { setError('اختر الباقة المناسبة'); return }
    if (!agreedTerms) { setError('يجب الموافقة على الشروط والأحكام للمتابعة'); return }
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
          billing,
          phone: phone.trim(),
          countryCode,
          trialEnds,
          termsAcceptedAt: new Date().toISOString()
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

  const phoneRule = PHONE_RULES[countryCode] || { length:10, prefix:'', placeholder:'xxxxxxxxxx' }
  const phonePlaceholder = phoneRule.placeholder

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#ffffff',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .inp{width:100%;padding:13px 16px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;background:white;color:#111827;font-family:inherit;transition:border-color .2s}
        .inp:focus{border-color:#0d9488;box-shadow:0 0 0 3px rgba(13,148,136,.08)}
        .inp::placeholder{color:#9ca3af}
        .btn-main{width:100%;padding:14px;background:#16233f;color:white;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn-main:hover{background:#0f1729}
        .btn-main:disabled{opacity:.6;cursor:not-allowed}
        .tab{flex:1;padding:12px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s}
        .biz{padding:12px 8px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;font-size:12px;font-weight:600;color:#374151}
        .biz:hover{border-color:#0d9488}
        .biz.on{border-color:#0d9488;background:#f0fdfa;color:#0d9488}
        @media(max-width:768px){.right-panel{display:none!important}}
      `}</style>

      {/* Navbar */}
      <nav style={{padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #f3f4f6'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/storely-logo.png" alt="Storely" style={{width:44,height:44,objectFit:'contain'}}/>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>setLang(lang==='ar'?'en':'ar')}
            style={{display:'none',padding:'8px 14px',background:'none',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#374151'}}>
            {lang==='ar'?'EN':'عربي'}
          </button>
          <span style={{fontSize:13,color:'#6b7280'}}>{t('login.haveAccount')}</span>
          <button onClick={()=>{setMode('login');setError('');setStep(1)}}
            style={{padding:'8px 18px',background:'none',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'#374151',transition:'border-color .2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#16a34a'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
            {t('login.loginNav')}
          </button>
        </div>
      </nav>

      <div style={{flex:1,display:'flex'}}>
        {/* Left — Form */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
          <div style={{width:'100%',maxWidth:420,animation:'fadeUp .4s ease'}}>

            {/* Account suspended/deleted — professional blocking card */}
            {accountStatus && (
              <div style={{textAlign:'center' as const,padding:'8px 4px'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:accountStatus==='suspended'?'#fef2f2':'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                  <span style={{fontSize:30}}>{accountStatus==='suspended'?'🔒':'🚫'}</span>
                </div>
                <h1 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:10,letterSpacing:'-0.4px'}}>
                  {accountStatus==='suspended' ? 'حسابك موقوف مؤقتاً' : 'هذا الحساب غير متاح'}
                </h1>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:28,maxWidth:340,marginInline:'auto'}}>
                  {accountStatus==='suspended'
                    ? 'إما انتهى اشتراكك أو تم إيقاف الحساب مؤقتاً. تواصل معنا وبنساعدك تفعّله من جديد خلال دقائق.'
                    : 'هذا الحساب لم يعد متاحاً على المنصة. تواصل معنا لو تحتاج مساعدة أو توضيح.'}
                </p>
                <a href="https://wa.me/966594351667?text=مرحباً، حسابي في Storely موقوف وأحتاج مساعدة"
                  target="_blank" rel="noopener noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:8,background:'#16a34a',color:'white',padding:'13px 28px',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(22,163,74,.25)'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  تواصل معنا عبر واتساب
                </a>
                <div style={{marginTop:20}}>
                  <button type="button" onClick={()=>{setAccountStatus(null);setEmail('');setPassword('')}}
                    style={{background:'none',border:'none',color:'#9ca3af',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
                    الرجوع لتسجيل الدخول
                  </button>
                </div>
              </div>
            )}

            {/* Login */}
            {!accountStatus && mode==='login' && (
              <>
                <StoreMascot focused={mascotFocus} cursorRatio={cursorRatio}/>
                <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                  <img src="/storely-logo.png" alt="Storely" style={{width:88,height:88,objectFit:'contain'}}/>
                </div>
                <div style={{marginBottom:32,textAlign:'center' as const}}>
                  <h1 style={{fontSize:28,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>{t('login.welcomeBack')}</h1>
                  <p style={{fontSize:15,color:'#6b7280'}}>{t('login.welcomeSub')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')}</label>
                    <input className="inp" type="email" required value={email}
                      onChange={e=>{setEmail(e.target.value);const pos=e.target.selectionStart||e.target.value.length;setCursorRatio(e.target.value.length?Math.min(Math.max(pos/Math.max(e.target.value.length,8),0),1):0.5)}}
                      onFocus={()=>setMascotFocus('email')} onBlur={()=>setMascotFocus(null)}
                      placeholder="example@email.com"/>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>{t('login.password')}</label>
                      <button type="button" onClick={()=>{setMode('forgot');setError('')}}
                        style={{background:'none',border:'none',fontSize:13,color:'#0d9488',cursor:'pointer',fontFamily:'inherit',fontWeight:600,padding:0}}>
                        {t('login.forgotPassword')}
                      </button>
                    </div>
                    <input className="inp" type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                      onFocus={()=>setMascotFocus('password')} onBlur={()=>setMascotFocus(null)}
                      placeholder="••••••••"/>
                  </div>
                  <button type="submit" disabled={loading} className="btn-main" style={{marginTop:8}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>{t('login.loggingIn')}</span>:t('login.loginBtn')}
                  </button>
                </form>
                <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'#6b7280'}}>
                  {t('login.noAccount')}{' '}
                  <button onClick={()=>{setMode('register');setError('');setStep(1)}} style={{background:'none',border:'none',color:'#0d9488',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    {t('login.signupNow')}
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
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>{t('login.createAccountFree')}</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>{t('login.freeTrialNoCard')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={nextStep} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.orgNameLabel')}</label>
                    <input className="inp" type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder={t('login.orgNamePlaceholder')}/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:8}}>{t('login.businessTypeLabel')}</label>
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
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')} *</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.whatsappLabel')}</label>
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
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>
                      {PHONE_RULES[countryCode] ? `${PHONE_RULES[countryCode].length} أرقام${PHONE_RULES[countryCode].prefix ? ` · يبدأ بـ ${PHONE_RULES[countryCode].prefix}` : ''}` : ''}
                    </div>
                    {/* واجهة تحقق OTP معطّلة مؤقتاً (2026-07-24) لحين حل مشكلة توصيل واتساب — راجع notification_logs */}
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.passwordHintLabel')}</label>
                    <div style={{position:'relative'}}>
                      <input className="inp" type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} style={{paddingLeft:44}}/>
                      <button type="button" onClick={()=>setShowPassword(s=>!s)}
                        style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#9ca3af',padding:4}}
                        aria-label={showPassword?t('login.hidePassword'):t('login.showPassword')}>
                        {showPassword?'🙈':'👁️'}
                      </button>
                    </div>
                    {password.length>0 && (
                      <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                        {[1,2,3,4].map(l=>{
                          const checks = [/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)]
                          const score = checks.filter(Boolean).length
                          const colors = ['#ef4444','#f59e0b','#3b82f6','#16a34a']
                          return <div key={l} style={{flex:1,height:3,borderRadius:99,background:score>=l?colors[score-1]:'#e5e7eb',transition:'background .3s'}}/>
                        })}
                        <span style={{fontSize:11,color:'#9ca3af',flexShrink:0}}>
                          {(()=>{const c=[/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)];const s=c.filter(Boolean).length;return s===0?'':s===1?t('login.pwVeryWeak'):s===2?t('login.pwWeak'):s===3?t('login.pwMedium'):t('login.pwStrong')})()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn-main" style={{marginTop:4}}>{t('login.nextChoosePlan')}</button>
                </form>
                <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
                  {t('login.alreadyHaveAccount')}{' '}
                  <button onClick={()=>{setMode('login');setError('')}} style={{background:'none',border:'none',color:'#16a34a',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                    {t('login.loginNow')}
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
                    {t('login.back')}
                  </button>
                  <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:6,letterSpacing:'-0.5px'}}>{t('login.choosePlanTitle')}</h1>
                  <p style={{fontSize:14,color:'#6b7280'}}>{t('login.changePlanLater')}</p>
                </div>
                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
                <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',justifyContent:'center',marginBottom:6}}>
                    <div style={{display:'inline-flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:12}}>
                      <button type="button" onClick={()=>setBilling('monthly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:billing==='monthly'?'white':'transparent',color:billing==='monthly'?'#111827':'#6b7280',boxShadow:billing==='monthly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>{t('login.planMonthly')}</button>
                      <button type="button" onClick={()=>setBilling('yearly')} style={{padding:'8px 18px',borderRadius:9,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,background:billing==='yearly'?'white':'transparent',color:billing==='yearly'?'#111827':'#6b7280',boxShadow:billing==='yearly'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                        {t('login.planYearly')} <span style={{background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:99}}>{t('login.planSave')}</span>
                      </button>
                    </div>
                  </div>
                  {PLANS.map(p=>(
                    <button key={p.v} type="button" onClick={()=>setBranchCount(p.v)}
                      style={{padding:'16px 18px',borderRadius:12,border:`1.5px solid ${branchCount===p.v?p.color:'#e5e7eb'}`,background:branchCount===p.v?p.color+'08':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:branchCount===p.v?p.color:'#111827',marginBottom:3}}>{p.label}</div>
                        <div style={{fontSize:12,color:'#6b7280'}}>{p.desc}</div>
                      </div>
                      <div style={{flexShrink:0,marginRight:12,textAlign:'left'}}>
                        <span style={{fontSize:20,fontWeight:800,color:branchCount===p.v?p.color:'#111827'}}>{billing==='yearly'?p.yearlyPrice:p.price}</span>
                        <span style={{fontSize:12,color:'#9ca3af'}}> {lang==='ar'?'ر.س':'SAR'}/{billing==='yearly'?(lang==='ar'?'سنة':'yr'):(lang==='ar'?'شهر':'mo')}</span>
                      </div>
                    </button>
                  ))}

                  {branchCount && (
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'11px 14px',fontSize:13,color:'#16a34a',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                      ✓ {t('login.freeTrialConfirm')}
                    </div>
                  )}

                  <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:'#4b5563',cursor:'pointer',marginTop:4}}>
                    <input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)}
                      style={{marginTop:2,flexShrink:0,cursor:'pointer'}}/>
                    <span>
                      {t('login.agreeTo')}{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:'#16a34a',fontWeight:700,textDecoration:'underline'}}>{t('login.termsAndConditions')}</a>
                      {' '}{t('login.andWord')}{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:'#16a34a',fontWeight:700,textDecoration:'underline'}}>{t('login.privacyPolicy')}</a>
                    </span>
                  </label>

                  <button type="submit" disabled={loading||!branchCount||!agreedTerms} className="btn-main" style={{marginTop:8,opacity:(!branchCount||!agreedTerms)?.6:1}}>
                    {loading?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}}/>{t('login.creatingAccount')}</span>:t('login.createAccountBtn')}
                  </button>
                </form>
              </>
            )}

            {/* Forgot */}
            {mode==='forgot' && (
              <>
                <button onClick={()=>{setMode('login');setError('')}}
                  style={{background:'none',border:'none',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0,marginBottom:24,display:'flex',alignItems:'center',gap:4}}>
                  {t('login.back')}
                </button>
                <h1 style={{fontSize:26,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>{t('login.restorePassword')}</h1>
                <p style={{fontSize:14,color:'#6b7280',marginBottom:20}}>{t('login.chooseRecoveryMethod')}</p>

                <div style={{display:'flex',gap:8,marginBottom:22,background:'#f3f4f6',borderRadius:10,padding:4}}>
                  <button type="button" onClick={()=>{setForgotMethod('email');setError('')}}
                    style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='email'?'white':'transparent',color:forgotMethod==='email'?'#111827':'#6b7280',boxShadow:forgotMethod==='email'?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                    📧 {t('login.viaEmail')}
                  </button>
                  <button type="button" onClick={()=>{setForgotMethod('whatsapp');setError('')}}
                    style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='whatsapp'?'white':'transparent',color:forgotMethod==='whatsapp'?'#111827':'#6b7280',boxShadow:forgotMethod==='whatsapp'?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                    📲 {t('login.viaWhatsapp')}
                  </button>
                </div>

                {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}

                {forgotMethod==='email' ? (
                  <form onSubmit={handleForgot} style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')}</label>
                      <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                    </div>
                    <button type="submit" disabled={loading} className="btn-main">
                      {loading?t('login.sending'):t('login.sendRecoveryLink')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotWhatsapp} style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.registeredPhone')}</label>
                      <input className="inp" type="tel" required dir="ltr" value={forgotPhone} onChange={e=>setForgotPhone(e.target.value)} placeholder="05xxxxxxxx"/>
                    </div>
                    <button type="submit" disabled={loading} className="btn-main">
                      {loading?t('login.sending'):t('login.sendViaWhatsapp')}
                    </button>
                  </form>
                )}
              </>
            )}

            {mode==='forgot-sent-wa' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>📲</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkWhatsapp')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:8}}>{t('login.ifRegisteredMsg')}</p>
                <p style={{fontSize:12,color:'#9ca3af',marginBottom:28}}>{t('login.linkValidHour')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}

            {/* Forgot Sent */}
            {(mode as any)==='registered' && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:56,marginBottom:16}}>📬</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkYourEmail')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.8,marginBottom:8}}>
                  {t('login.activationLinkSent')}<br/>
                  <b style={{color:'#111827'}}>{email}</b>
                </p>
                <p style={{fontSize:13,color:'#9ca3af',marginBottom:28,lineHeight:1.7}}>
                  {t('login.clickLinkToActivate')}<br/>
                  {t('login.checkSpam')}
                </p>
                <button onClick={()=>setMode('login')} style={{background:'#16a34a',color:'white',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {t('login.backToLogin')}
                </button>
              </div>
            )}
            {mode==='forgot-sent' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px'}}>📧</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.sentTitle')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:28}}>{t('login.checkEmailMsg')} <b style={{color:'#111827'}}>{email}</b><br/>{t('login.clickToReset')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Branding */}
        <div className="right-panel" style={{width:'45%',background:'#f9fafb',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 44px',borderRight:'1px solid #f3f4f6'}}>
          <div style={{maxWidth:400,width:'100%'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:700,color:'#16a34a',marginBottom:20}}>
              ✓ {t('login.badge')}
            </div>
            <h2 style={{fontSize:30,fontWeight:900,color:'#111827',lineHeight:1.2,marginBottom:12,letterSpacing:'-1px'}}>
              Storely<br/>
              <span style={{color:'#16a34a'}}>{t('login.headline')}</span>
            </h2>
            <p style={{fontSize:14,color:'#6b7280',lineHeight:1.75,marginBottom:24}}>
              {t('login.subtitle')}
            </p>

            {/* صورة حقيقية بدل المعاينة المزيّفة */}
            <div style={{position:'relative',borderRadius:16,overflow:'hidden',boxShadow:'0 16px 40px rgba(15,23,42,.12)',marginBottom:24}}>
              <img src="/storely-team.jpg" alt="Storely" style={{width:'100%',display:'block',objectFit:'cover'}}/>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:11,marginTop:24}}>
              {[
                {icon:'📦',text:t('login.feature1')},
                {icon:'📲',text:t('login.feature2')},
                {icon:'👥',text:t('login.feature3')},
                {icon:'📊',text:t('login.feature4')},
              ].map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:11}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{f.icon}</div>
                  <span style={{fontSize:13,color:'#374151',fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:24,padding:'16px 18px',background:'white',borderRadius:12,border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',gap:22}}>
                {[['149 '+(lang==='ar'?'ر.س':'SAR'),t('login.statStart')],['14 '+(lang==='ar'?'يوم':'days'),t('login.statTrial')],['7',t('login.statLangs')]].map(([n,l])=>(
                  <div key={l}>
                    <div style={{fontSize:18,fontWeight:900,color:'#16a34a'}}>{n}</div>
                    <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>{l}</div>
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
  return <LanguageProvider><Suspense fallback={null}><LoginPage /></Suspense></LanguageProvider>
}
