'use client'
import { useState, useEffect, Suspense } from 'react'
import { isInApp, isStaffDevice, setStaffDevice } from '@/lib/inApp'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
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
  { v:1,  label:'الأساسية',  price:'99', yearlyPrice:'950', desc:'فرع · 3 موظفين · 3 موردين',                    color:'#203640' },
  { v:3,  label:'المتوسطة',  price:'249', yearlyPrice:'2390', desc:'3 فروع · 10 موظفين · 10 موردين',               color:'#203640' },
  { v:10, label:'المتقدمة',  price:'399', yearlyPrice:'3830', desc:'10 فروع · موظفون وموردون غير محدودين', color:'#203640' },
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

const BUSINESS_TYPES = [
  {v:'مطعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخبز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدلية',icon:'💊'},{v:'مستودع',icon:'🏭'},
  {v:'متجر إلكتروني',icon:'🛍️'},{v:'أخرى',icon:'🏢'},
]

function LoginPage() {
  const { t, lang, setLang } = useTranslation()
  const [forgotMethod, setForgotMethod] = useState<'email'|'whatsapp'>('email')
  const [forgotPhone, setForgotPhone] = useState('')
  // oauth: دخل بـ Google وما عنده منشأة بعد — يكمل بيانات المنشأة بدون بريد وكلمة مرور
  const [oauth, setOauth] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'complete')
  const [mode, setMode] = useState<'login'|'register'|'forgot'|'forgot-sent'|'forgot-sent-wa'|'registered'>(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('mode')
      if (m === 'register' || m === 'complete') return 'register'
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
  const [error, setError]             = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'google'
      ? 'تعذّر الدخول بحساب Google — حاول مرة ثانية' : '')
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

  // جهاز موظف داخل التطبيق: يفتح على دخول الموظفين مباشرة
  useEffect(() => {
    if (isInApp() && (isStaffDevice() || localStorage.getItem('staff_session'))) window.location.replace('/staff')
  }, [])

  useEffect(() => {
    if (!oauth) return
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) { setEmail(data.user.email); return }
      setOauth(false); setMode('login')
    })
  }, [oauth, supabase])

  async function handleGoogle() {
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError('تعذّر الدخول بحساب Google — حاول مرة ثانية'); setLoading(false) }
  }

  async function leaveOauth() {
    await supabase.auth.signOut()
    setOauth(false); setMode('login'); setStep(1); setError(''); setEmail('')
    window.history.replaceState(null, '', '/login')
  }

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
      // رسالة واحدة موحّدة بغض النظر عن السبب الفعلي — نتجنب كشف
      // أي إيميل مسجّل عندنا كعميل ولّا لأ (ثغرة "تعداد الإيميلات")
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة — تقدر تستخدم "نسيت كلمة المرور؟"')
      setLoading(false); return
    }
    if (data.session) {
      const me = await api.get('/api/me')
      const profile = { status: me.status as string | null, org_id: me.org_id as string | null }

      if (profile?.status === 'suspended' || profile?.status === 'deleted') {
        await supabase.auth.signOut()
        setAccountStatus(profile.status as 'suspended'|'deleted')
        setLoading(false)
        return
      }
      if (profile?.status === 'pending') { window.location.href = '/pending'; return }

      if (profile?.org_id && me.org && !me.org.onboarding_done) { window.location.href = '/onboarding'; return }
      window.location.href = '/dashboard'
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/forgot-password-email', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'تأكد من صحة البريد'); return }
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
    if (oauth) { setStep(2); return }
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
    if (oauth) {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '')
      const regRes = await fetch('/api/register-org', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          orgName: orgName.trim(), fullPhone, businessType: businessType||'مطعم', branchCount, billing,
          phone: phone.trim(), countryCode,
          trialEnds: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
          termsAcceptedAt: new Date().toISOString(),
        })
      })
      const regData = await regRes.json()
      if (!regRes.ok) { setError('خطأ في إنشاء المنشأة: ' + regData.error); setLoading(false); return }
      fetch('/api/notify-welcome', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: orgName.trim(), phone: fullPhone })
      }).catch(()=>{})
      window.location.href = '/dashboard'
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setError('هذا البريد الإلكتروني مسجّل مسبقاً — سجّل الدخول أو استعد كلمة المرور')
      } else {
        setError(error.message)
      }
      setLoading(false); return
    }
    if (data.user) {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '')
      // تكرار رقم الجوال يُفحص على الخادم داخل /api/register-org
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
        setMode('registered')
      }
    }
    setLoading(false)
  }

  const phoneRule = PHONE_RULES[countryCode] || { length:10, prefix:'', placeholder:'xxxxxxxxxx' }
  const phonePlaceholder = phoneRule.placeholder

  return (
    <div className={`login-shell${mode==='register' ? ' register-shell' : ''}`} style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',background:'#ffffff',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .login-shell{background:#fff!important;color:#203640}
        .login-nav{height:72px!important;padding:0 clamp(20px,4vw,56px)!important;border-bottom:1px solid #E7EAED!important;background:#fff!important}
        .login-main{flex:1;display:grid!important;grid-template-columns:minmax(420px,0.95fr) minmax(420px,1.05fr);direction:ltr;background:#fff}
        .login-form-wrap{padding:clamp(40px,6vw,72px) clamp(28px,5vw,72px)!important;background:#fff!important;direction:rtl;order:2}
        .login-card{max-width:456px!important}
        .right-panel{width:auto!important;background:#fff!important;border-right:0!important;border-left:1px solid #E7EAED!important;padding:clamp(44px,6vw,76px)!important;direction:rtl;align-items:flex-start!important;order:1}
        .brand-panel-inner{max-width:460px!important}
        .inp{width:100%;min-height:48px!important;padding:0 15px!important;border:1px solid #D7DEE3!important;border-radius:6px!important;font-size:15px!important;line-height:1.6!important;outline:none;background:white;color:#203640!important;font-family:inherit;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
        .inp:focus{border-color:#203640!important;box-shadow:0 0 0 3px rgba(32,54,64,.14)!important}
        .inp::placeholder{color:#8EA0B1}
        .btn-main{width:100%;min-height:48px!important;padding:0 20px!important;background:#203640!important;color:white;border:1px solid #203640!important;border-radius:6px!important;font-size:15px!important;font-weight:700;cursor:pointer;font-family:inherit;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}
        .btn-main:hover{background:#16262D!important;border-color:#16262D!important}
        .btn-main:disabled{opacity:.6;cursor:not-allowed}
        .tab{flex:1;padding:11px 12px;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s}
        .biz{min-height:68px;padding:11px 8px;border-radius:6px;border:1px solid #D7DEE3!important;background:white;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:all .15s;font-size:12px;font-weight:600;color:#43525B!important}
        .biz:hover{border-color:#203640!important;background:#F8EEDF55}
        .biz.on{border-color:#203640!important;background:#F8EEDF!important;color:#203640!important}
        .biz span:first-child{font-size:11px!important;color:#8EA0B1!important;font-weight:800;letter-spacing:.04em}
        .auth-note-icon{width:36px;height:36px;border-radius:6px;border:1px solid #D7DEE3;background:#fff;display:inline-flex;align-items:center;justify-content:center;color:#203640;font-size:13px;font-weight:800;flex-shrink:0}
        .auth-secondary-btn{width:100%;min-height:48px;padding:0 18px;background:white;border:1px solid #D7DEE3;border-radius:6px;font-size:15px;font-weight:700;color:#203640;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;transition:border-color .16s ease,background .16s ease}
        .auth-secondary-btn:hover{border-color:#203640;background:#FAFBFC}
        .auth-divider{display:flex;align-items:center;gap:14px;margin:22px 0;color:#8EA0B1;font-size:13px;font-weight:600}
        .auth-divider::before,.auth-divider::after{content:"";flex:1;height:1px;background:#E7EAED}
        .auth-error{background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:12px 14px;margin-bottom:18px;font-size:14px;color:#B91C1C;font-weight:600;line-height:1.7}
        .auth-link-btn{background:none;border:none;color:#203640;cursor:pointer;font-family:inherit;font-weight:700;padding:0;text-decoration:none}
        .auth-link-btn:hover{text-decoration:underline}
        .brand-image{position:relative;border-radius:8px!important;overflow:hidden;border:1px solid #E7EAED;margin-bottom:28px!important;background:#F8FAFC;box-shadow:none!important}
        .brand-kicker{display:inline-flex!important;align-items:center;gap:8px!important;background:#F8EEDF!important;border:1px solid #E7D9C7!important;border-radius:6px!important;padding:7px 12px!important;font-size:13px!important;font-weight:700;color:#203640!important;margin-bottom:22px!important}
        .brand-stat-card{margin-top:28px!important;padding:18px 20px!important;background:#fff;border-radius:8px!important;border:1px solid #E7EAED!important}
        .register-shell .login-main{grid-template-columns:minmax(430px,.9fr) minmax(520px,1.1fr)}
        .register-shell .login-form-wrap{padding-block:clamp(42px,5vw,68px)!important}
        .register-card{max-width:588px!important}
        .register-heading{margin-bottom:32px}
        .register-progress{display:flex;gap:8px;margin-bottom:24px}
        .register-progress span{flex:1;height:4px;border-radius:999px;background:#E7EAED;transition:background .18s ease}
        .register-progress span.active{background:#203640}
        .register-title{font-size:29px;font-weight:850;color:#203640;margin:0 0 10px;letter-spacing:0;line-height:1.38}
        .register-subtitle{font-size:15px;color:#66737C;margin:0;line-height:1.9;max-width:520px}
        .register-form{display:flex;flex-direction:column;gap:22px}
        .register-field{display:flex;flex-direction:column;gap:8px}
        .register-label{font-size:13px;font-weight:750;color:#203640;line-height:1.6}
        .register-help{font-size:12px;color:#8EA0B1;margin-top:3px;line-height:1.75}
        .register-phone{display:flex;min-height:52px;border:1px solid #D7DEE3;border-radius:6px;overflow:hidden;background:#fff;transition:border-color .16s ease,box-shadow .16s ease}
        .register-phone:focus-within{border-color:#203640;box-shadow:0 0 0 3px rgba(32,54,64,.14)}
        .register-business-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
        .register-actions-note{text-align:center;margin-top:24px;font-size:14px;color:#66737C;line-height:1.85}
        .register-back{background:none;border:none;color:#66737C;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;padding:0;margin-bottom:16px;display:inline-flex;align-items:center;gap:6px}
        .register-back:hover{color:#203640}
        .register-billing{display:flex;justify-content:center;margin-bottom:12px}
        .register-billing-inner{display:inline-flex;gap:4px;background:#F4F6F7;padding:4px;border-radius:8px;border:1px solid #E7EAED}
        .register-plan{padding:20px;border-radius:8px;border:1px solid #D7DEE3;background:#fff;cursor:pointer;font-family:inherit;text-align:right;transition:border-color .16s ease,background .16s ease,box-shadow .16s ease;display:flex;justify-content:space-between;align-items:center;gap:18px}
        .register-plan:hover{border-color:#8EA0B1;background:#FAFBFC}
        .register-plan.selected{border-color:#203640;background:#F8EEDF;box-shadow:inset 0 0 0 1px #203640}
        .register-trial-note{background:#F6F8F2;border:1px solid #D9DDC6;border-radius:8px;padding:13px 15px;font-size:13px;color:#203640;font-weight:700;line-height:1.8}
        .register-terms{display:flex;align-items:flex-start;gap:11px;font-size:13px;color:#43525B;cursor:pointer;margin-top:2px;line-height:1.95}
        .register-terms input{margin-top:6px;flex-shrink:0;cursor:pointer;accent-color:#203640}
        .register-password-meta{margin-top:8px;display:flex;align-items:center;gap:7px}
        .register-password-meta span{font-size:12px;color:#8EA0B1;flex-shrink:0}
        .register-password-bar{flex:1;height:4px;border-radius:99px;transition:background .3s}
        @media(max-width:980px){
          .login-main{grid-template-columns:1fr}
          .right-panel{display:none!important}
          .login-form-wrap{padding:40px 22px 56px!important}
          .login-card{max-width:460px!important}
          .register-card{max-width:608px!important}
        }
        @media(max-width:560px){
          .login-nav{height:auto!important;min-height:66px!important;padding:12px 18px!important;gap:12px}
          .login-nav > div:last-child{gap:6px!important}
          .login-nav span{display:none}
          .login-form-wrap{align-items:flex-start!important;padding:30px 18px 46px!important}
          .login-card{max-width:none!important}
          .register-heading{margin-bottom:26px}
          .register-progress{margin-bottom:20px}
          .register-title{font-size:24px}
          .register-subtitle{font-size:14px}
          .register-form{gap:18px}
          .register-business-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
          .register-phone{min-height:50px}
          .register-billing{justify-content:stretch}
          .register-billing-inner{width:100%}
          .register-billing-inner button{flex:1;justify-content:center}
          .register-plan{align-items:flex-start;flex-direction:column;gap:8px}
          .register-plan .hide-in-app{margin-right:0!important;text-align:right!important}
        }
      `}</style>

      {/* Navbar */}
      <nav className="login-nav" style={{padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #f3f4f6'}}>
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
            style={{minHeight:38,padding:'0 18px',background:'white',border:'1px solid #D7DEE3',borderRadius:6,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#203640',transition:'border-color .2s,background .2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#203640'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#D7DEE3'}>
            {t('login.loginNav')}
          </button>
        </div>
      </nav>

      <div className="login-main" style={{flex:1,display:'flex'}}>
        {/* Left — Form */}
        <div className="login-form-wrap" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
          <div className={`login-card${mode==='register' ? ' register-card' : ''}`} style={{width:'100%',maxWidth:420,animation:'fadeUp .4s ease'}}>

            {/* Account suspended/deleted — professional blocking card */}
            {accountStatus && (
              <div style={{textAlign:'center' as const,padding:'8px 4px'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:accountStatus==='suspended'?'#fef2f2':'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                  <span style={{fontSize:13,fontWeight:800,color:'#203640'}}>{accountStatus==='suspended'?'LOCK':'STOP'}</span>
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
                  style={{display:'inline-flex',alignItems:'center',gap:8,background:'#203640',color:'white',padding:'13px 28px',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(22,163,74,.25)'}}>
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
                <div style={{marginBottom:32,textAlign:'center' as const}}>
                  <h1 style={{fontSize:28,fontWeight:800,color:'#111827',marginBottom:8,letterSpacing:'-0.5px'}}>{t('login.welcomeBack')}</h1>
                  <p style={{fontSize:15,color:'#6b7280'}}>{t('login.welcomeSub')}</p>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="button" onClick={handleGoogle} disabled={loading} className="auth-secondary-btn">
                  <GoogleIcon/> {t('login.continueWithGoogle')}
                </button>
                <div className="auth-divider">{t('login.orWithEmail')}</div>
                <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:18}}>
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
                        className="auth-link-btn" style={{fontSize:13}}>
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
                  <button onClick={()=>{setMode('register');setError('');setStep(1)}} className="auth-link-btn" style={{fontSize:13}}>
                    {t('login.signupNow')}
                  </button>
                </div>
                <button type="button" className="show-in-app" onClick={()=>{setStaffDevice(true);window.location.href='/staff'}}
                  style={{width:'100%',marginTop:16,minHeight:46,padding:'0 16px',background:'white',border:'1px solid #D7DEE3',borderRadius:6,fontSize:14,fontWeight:700,color:'#203640',cursor:'pointer',fontFamily:'inherit'}}>
                  أنا موظف — دخول برقم الجوال و PIN
                </button>
              </>
            )}

            {/* Register Step 1 */}
            {mode==='register' && step===1 && (
              <>
                <div className="register-heading">
                  <div className="register-progress">
                    {[1,2].map(s=>(
                      <span key={s} className={step>=s ? 'active' : ''}/>
                    ))}
                  </div>
                  <h1 className="register-title">{oauth ? t('login.completeTitle') : t('login.createAccountFree')}</h1>
                  <p className="register-subtitle">{oauth ? <>{t('login.completeSub')} <b style={{color:'#203640'}} dir="ltr">{email}</b></> : t('login.freeTrialNoCard')}</p>
                </div>
                {error && <div className="auth-error">{error}</div>}
                {!oauth && <>
                  <button type="button" onClick={handleGoogle} disabled={loading} className="auth-secondary-btn">
                  <GoogleIcon/> {t('login.continueWithGoogle')}
                </button>
                <div className="auth-divider">{t('login.orWithEmail')}</div>
                </>}
                <form onSubmit={nextStep} className="register-form">
                  <div className="register-field">
                    <label className="register-label">{t('login.orgNameLabel')}</label>
                    <input className="inp" type="text" required value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder={t('login.orgNamePlaceholder')}/>
                  </div>
                  <div className="register-field">
                    <label className="register-label">{t('login.businessTypeLabel')}</label>
                    <div className="register-business-grid">
                      {BUSINESS_TYPES.map(b=>(
                        <button key={b.v} type="button" onClick={()=>setBusinessType(b.v)} className={`biz${businessType===b.v?' on':''}`}>
                          <span style={{fontSize:20}}>{String(BUSINESS_TYPES.findIndex((item) => item.v === b.v) + 1).padStart(2, '0')}</span>
                          <span style={{fontSize:11}}>{b.v}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {!oauth && <div className="register-field">
                    <label className="register-label">{t('login.email')} *</label>
                    <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                  </div>}
                  <div className="register-field">
                    <label className="register-label">{t('login.whatsappLabel')}</label>
                    <div className="register-phone">
                      <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                        style={{background:'transparent',border:'none',borderLeft:'1px solid #D7DEE3',padding:'0 10px',fontSize:14,fontFamily:'inherit',outline:'none',cursor:'pointer',direction:'ltr',color:'#203640',minWidth:104}}>
                        {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input type="tel" required value={phone} onChange={e=>{setPhone(e.target.value);setOtpSent(false);setOtpVerified(false);setOtp('')}}
                        placeholder={phonePlaceholder} dir="ltr"
                        style={{background:'transparent',border:'none',padding:'0 15px',fontSize:15,color:'#203640',flex:1,outline:'none',fontFamily:'inherit'}}/>
                    </div>
                    <div className="register-help">
                      {PHONE_RULES[countryCode] ? `${PHONE_RULES[countryCode].length} أرقام${PHONE_RULES[countryCode].prefix ? ` · يبدأ بـ ${PHONE_RULES[countryCode].prefix}` : ''}` : ''}
                    </div>
                    {/* واجهة تحقق OTP معطّلة مؤقتاً (2026-07-24) لحين حل مشكلة توصيل واتساب — راجع notification_logs */}
                  </div>
                  {!oauth && <div className="register-field">
                    <label className="register-label">{t('login.passwordHintLabel')}</label>
                    <div style={{position:'relative'}}>
                      <input className="inp" type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} style={{paddingLeft:44}}/>
                      <button type="button" onClick={()=>setShowPassword(s=>!s)}
                        style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#9ca3af',padding:4}}
                        aria-label={showPassword?t('login.hidePassword'):t('login.showPassword')}>
                        {showPassword?'إخفاء':'عرض'}
                      </button>
                    </div>
                    {password.length>0 && (
                      <div className="register-password-meta">
                        {[1,2,3,4].map(l=>{
                          const checks = [/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)]
                          const score = checks.filter(Boolean).length
                          const colors = ['#B91C1C','#B45309','#8EA0B1','#203640']
                          return <div key={l} className="register-password-bar" style={{background:score>=l?colors[score-1]:'#e5e7eb'}}/>
                        })}
                        <span>
                          {(()=>{const c=[/[A-Z]/.test(password),/[a-z]/.test(password),/[0-9]/.test(password),/[@#$!%^&*]/.test(password)];const s=c.filter(Boolean).length;return s===0?'':s===1?t('login.pwVeryWeak'):s===2?t('login.pwWeak'):s===3?t('login.pwMedium'):t('login.pwStrong')})()}
                        </span>
                      </div>
                    )}
                  </div>}
                  <button type="submit" className="btn-main" style={{marginTop:4}}>{t('login.nextChoosePlan')}</button>
                </form>
                {oauth ? (
                  <div className="register-actions-note">
                    <button onClick={leaveOauth} className="auth-link-btn" style={{fontSize:13}}>
                      {t('login.useAnotherAccount')}
                    </button>
                  </div>
                ) : (
                  <div className="register-actions-note">
                    {t('login.alreadyHaveAccount')}{' '}
                    <button onClick={()=>{setMode('login');setError('')}} className="auth-link-btn" style={{fontSize:13}}>
                      {t('login.loginNow')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Register Step 2 */}
            {mode==='register' && step===2 && (
              <>
                <div className="register-heading">
                  <div className="register-progress">
                    {[1,2].map(s=>(
                      <span key={s} className={step>=s ? 'active' : ''}/>
                    ))}
                  </div>
                  <button type="button" onClick={()=>{setStep(1);setError('')}}
                    className="register-back">
                    {t('login.back')}
                  </button>
                  <h1 className="register-title">{t('login.choosePlanTitle')}</h1>
                  <p className="register-subtitle">{t('login.changePlanLater')}</p>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={handleRegister} className="register-form" style={{gap:16}}>
                  <div className="hide-in-app register-billing">
                    <div className="register-billing-inner">
                      <button type="button" onClick={()=>setBilling('monthly')} style={{padding:'9px 18px',borderRadius:6,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',background:billing==='monthly'?'white':'transparent',color:billing==='monthly'?'#203640':'#66737C',boxShadow:'none'}}>{t('login.planMonthly')}</button>
                      <button type="button" onClick={()=>setBilling('yearly')} style={{padding:'9px 18px',borderRadius:6,border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,background:billing==='yearly'?'white':'transparent',color:billing==='yearly'?'#203640':'#66737C',boxShadow:'none'}}>
                        {t('login.planYearly')} <span style={{background:'#F8EEDF',color:'#717553',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:6}}>{t('login.planSave')}</span>
                      </button>
                    </div>
                  </div>
                  {PLANS.map(p=>(
                    <button key={p.v} type="button" onClick={()=>setBranchCount(p.v)}
                      className={`register-plan${branchCount===p.v?' selected':''}`}>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:branchCount===p.v?p.color:'#203640',marginBottom:4,lineHeight:1.45}}>{p.label}</div>
                        <div style={{fontSize:13,color:'#66737C',lineHeight:1.7}}>{p.desc}</div>
                      </div>
                      <div className="hide-in-app" style={{flexShrink:0,marginRight:12,textAlign:'left'}}>
                        <span style={{fontSize:20,fontWeight:800,color:branchCount===p.v?p.color:'#111827'}}>{billing==='yearly'?p.yearlyPrice:p.price}</span>
                        <span style={{fontSize:12,color:'#9ca3af'}}> {lang==='ar'?'ر.س':'SAR'}/{billing==='yearly'?(lang==='ar'?'سنة':'yr'):(lang==='ar'?'شهر':'mo')}</span>
                      </div>
                    </button>
                  ))}

                  {branchCount && (
                    <div className="register-trial-note">
                      {t('login.freeTrialConfirm')}
                    </div>
                  )}

                  <label className="register-terms">
                    <input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)}
                    />
                    <span>
                      {t('login.agreeTo')}{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:'#203640',fontWeight:700,textDecoration:'underline'}}>{t('login.termsAndConditions')}</a>
                      {' '}{t('login.andWord')}{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:'#203640',fontWeight:700,textDecoration:'underline'}}>{t('login.privacyPolicy')}</a>
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

                <div style={{display:'flex',gap:4,marginBottom:24,background:'#F4F6F7',borderRadius:8,padding:4,border:'1px solid #E7EAED'}}>
                  <button type="button" onClick={()=>{setForgotMethod('email');setError('')}}
                    style={{flex:1,padding:'10px',border:'none',borderRadius:6,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='email'?'white':'transparent',color:forgotMethod==='email'?'#203640':'#66737C',boxShadow:'none'}}>
                    {t('login.viaEmail')}
                  </button>
                  <button type="button" onClick={()=>{setForgotMethod('whatsapp');setError('')}}
                    style={{flex:1,padding:'10px',border:'none',borderRadius:6,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:forgotMethod==='whatsapp'?'white':'transparent',color:forgotMethod==='whatsapp'?'#203640':'#66737C',boxShadow:'none'}}>
                    {t('login.viaWhatsapp')}
                  </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {forgotMethod==='email' ? (
                  <form onSubmit={handleForgot} style={{display:'flex',flexDirection:'column',gap:18}}>
                    <div>
                      <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>{t('login.email')}</label>
                      <input className="inp" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com"/>
                    </div>
                    <button type="submit" disabled={loading} className="btn-main">
                      {loading?t('login.sending'):t('login.sendRecoveryLink')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotWhatsapp} style={{display:'flex',flexDirection:'column',gap:18}}>
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
                <div className="auth-note-icon" style={{width:64,height:64,margin:'0 auto 20px'}}>WA</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkWhatsapp')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:8}}>{t('login.ifRegisteredMsg')}</p>
                <p style={{fontSize:12,color:'#9ca3af',marginBottom:28}}>{t('login.linkValidHour')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}

            {/* Forgot Sent */}
            {mode==='registered' && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div className="auth-note-icon" style={{width:64,height:64,margin:'0 auto 16px'}}>MAIL</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.checkYourEmail')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.8,marginBottom:8}}>
                  {t('login.activationLinkSent')}<br/>
                  <b style={{color:'#111827'}}>{email}</b>
                </p>
                <p style={{fontSize:13,color:'#9ca3af',marginBottom:28,lineHeight:1.7}}>
                  {t('login.clickLinkToActivate')}<br/>
                  {t('login.checkSpam')}
                </p>
                <button onClick={()=>setMode('login')} style={{background:'#203640',color:'white',border:'none',borderRadius:12,padding:'13px 32px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {t('login.backToLogin')}
                </button>
              </div>
            )}
            {mode==='forgot-sent' && (
              <div style={{textAlign:'center',padding:'40px 0'}}>
                <div className="auth-note-icon" style={{width:64,height:64,margin:'0 auto 20px'}}>MAIL</div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#111827',marginBottom:8}}>{t('login.sentTitle')}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:28}}>{t('login.checkEmailMsg')} <b style={{color:'#111827'}}>{email}</b><br/>{t('login.clickToReset')}</p>
                <button onClick={()=>{setMode('login');setError('')}} className="btn-main">{t('login.backToLogin')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Branding */}
        <div className="right-panel" style={{width:'45%',background:'#f9fafb',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 44px',borderRight:'1px solid #f3f4f6'}}>
          <div className="brand-panel-inner" style={{maxWidth:400,width:'100%'}}>
            <div className="brand-kicker" style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:700,color:'#203640',marginBottom:20}}>
              {t('login.badge')}
            </div>
            <h2 style={{fontSize:34,fontWeight:900,color:'#203640',lineHeight:1.25,marginBottom:14,letterSpacing:0}}>
              Storely<br/>
              <span style={{color:'#203640'}}>{t('login.headline')}</span>
            </h2>
            <p style={{fontSize:15,color:'#43525B',lineHeight:1.9,marginBottom:28}}>
              {t('login.subtitle')}
            </p>

            {/* صورة حقيقية بدل المعاينة المزيّفة */}
            <div className="brand-image" style={{position:'relative',borderRadius:16,overflow:'hidden',boxShadow:'0 16px 40px rgba(15,23,42,.12)',marginBottom:24}}>
              <img src="/storely-team.jpg" alt="Storely" style={{width:'100%',display:'block',objectFit:'cover'}}/>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:14,marginTop:24}}>
              {[
                {text:t('login.feature1')},
                {text:t('login.feature2')},
                {text:t('login.feature3')},
                {text:t('login.feature4')},
              ].map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:11}}>
                  <div className="auth-note-icon">{String(i + 1).padStart(2, '0')}</div>
                  <span style={{fontSize:14,color:'#43525B',fontWeight:600,lineHeight:1.7}}>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="hide-in-app brand-stat-card" style={{marginTop:24,padding:'16px 18px',background:'white',borderRadius:12,border:'1px solid #e5e7eb'}}>
              <div style={{display:'flex',gap:28,justifyContent:'space-between'}}>
                {[['99 '+(lang==='ar'?'ر.س':'SAR'),t('login.statStart')],['14 '+(lang==='ar'?'يوم':'days'),t('login.statTrial')],['7',t('login.statLangs')]].map(([n,l])=>(
                  <div key={l}>
                    <div style={{fontSize:18,fontWeight:900,color:'#203640'}}>{n}</div>
                    <div style={{fontSize:11,color:'#66737C',marginTop:4,fontWeight:600}}>{l}</div>
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
