'use client'
import { useState, useEffect } from 'react'
import { signupErrorAr } from '@/lib/authErrors'
import { isInApp, isStaffDevice } from '@/lib/inApp'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { captureUtm, type Utm } from '@/lib/signupSource'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { DEVICE_UNVERIFIED_REASON, VERIFY_DEVICE_PATH } from '@/lib/deviceMessages'
import { PHONE_RULES } from './constants'

/** حالة صفحة الدخول والتسجيل ودوالها — منقولة كما هي من page.tsx */
export function useLogin() {
  const { t, lang } = useTranslation()
  const [forgotMethod, setForgotMethod] = useState<'email'|'whatsapp'>('email')
  const [forgotPhone, setForgotPhone] = useState('')
  // oauth: دخل بـ Google وما عنده منشأة بعد — يكمل بيانات المنشأة بدون بريد وكلمة مرور
  const [oauth, setOauth] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'complete')
  const [mode, setMode] = useState<'login'|'register'|'forgot'|'forgot-sent'|'forgot-sent-wa'>(() => {
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
  const [orgName, setOrgName]         = useState('')
  const [phone, setPhone]             = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [businessType, setBusinessType] = useState('')
  // الباقة وعدد الفروع من رابط صفحة الأسعار (?plan=ops&branches=3)
  const [planChoice, setPlanChoice] = useState<'essential'|'ops'|'full'|'custom'|null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan')
      if (p === 'essential' || p === 'ops' || p === 'full' || p === 'custom') return p
      if (p === 'basic') return 'essential'
    }
    return null
  })
  // اختار باقته من صفحة الأسعار قبل التسجيل؟ نعرض ملخص اختياره بدل ما نسأله مرة ثانية (يقدر يغيّر)
  const [planFromLink] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const p = new URLSearchParams(window.location.search).get('plan')
    return p === 'essential' || p === 'ops' || p === 'full' || p === 'custom' || p === 'basic'
  })
  const [editPlan, setEditPlan] = useState(false)
  // إضافات يختارها مع الباقة (الكاشير / الحضور والرواتب / الذكاء)
  const [signupAddons, setSignupAddons] = useState<string[]>(() => {
    // «ابنِ باقتك» من صفحة الأسعار: ?modules=cashier_closing,mod_purchases
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('modules')
      if (m) return m.split(',').filter(x => /^[a-z_]{3,30}$/.test(x)).slice(0, 6)
    }
    return []
  })
  const [branchCount, setBranchCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const b = Math.round(Number(new URLSearchParams(window.location.search).get('branches')))
      if (b >= 1 && b <= 10) return b
    }
    return 1
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
  // كود السفير — ما فيه حقل بالنموذج، يجي بس من رابط السفير storely.dev/r/الكود
  const [agentCode, setAgentCode] = useState('')
  useEffect(() => { const r = new URLSearchParams(window.location.search).get('ref'); if (r) setAgentCode(r.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)) }, [])
  const [showPassword, setShowPassword] = useState(false)
  // مصدر العميل: «من وين سمعت عنا؟» + رابط الحملة (أول utm يفوز، محفوظ في المتصفح)
  const [signupSource, setSignupSource] = useState('')
  const [signupSourceDetail, setSignupSourceDetail] = useState('')
  const [utm, setUtm] = useState<Utm>({})
  useEffect(() => { let st: Storage | null = null; try { st = window.localStorage } catch {} setUtm(captureUtm(window.location.search, st)) }, [])
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
    document.cookie = 'oauth_next=; path=/; max-age=0'   // دخول عميل — مو تسجيل مورد
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
      // جهاز جديد: رمز على الإيميل قبل أي شي
      if (me.reason === DEVICE_UNVERIFIED_REASON) { window.location.href = VERIFY_DEVICE_PATH; return }
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
    if (!planChoice) { setError('اختر الباقة المناسبة'); return }
    if (planChoice === 'custom' && !signupAddons.length) { setError('اختر ميزة وحدة على الأقل'); return }
    if (!agreedTerms) { setError('يجب الموافقة على الشروط والأحكام للمتابعة'); return }
    setLoading(true); setError('')
    if (oauth) {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '')
      const regRes = await fetch('/api/register-org', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          orgName: orgName.trim(), fullPhone, businessType: businessType||'مطعم', plan: planChoice, addons: signupAddons, staff: 6 * branchCount, branchCount, billing,
          phone: phone.trim(), countryCode,
          trialEnds: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
          termsAcceptedAt: new Date().toISOString(),
          agentCode: agentCode.trim() || undefined,
          signupSource: signupSource || undefined, signupSourceDetail: signupSourceDetail.trim() || undefined, utm,
        })
      })
      const regData = await regRes.json()
      if (!regRes.ok) { setError('خطأ في إنشاء المنشأة: ' + regData.error); setLoading(false); return }
      fetch('/api/notify-welcome', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: orgName.trim(), phone: fullPhone })
      }).catch(()=>{})
      // حساب قوقل جديد: صفحة التحقق توثّق الجهاز مباشرة (قوقل أكّد الإيميل)
      window.location.href = VERIFY_DEVICE_PATH
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(signupErrorAr(error.message))
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
          plan: planChoice,
          addons: signupAddons,
          staff: 6 * branchCount,
          branchCount,
          billing,
          phone: phone.trim(),
          countryCode,
          trialEnds,
          termsAcceptedAt: new Date().toISOString(),
          agentCode: agentCode.trim() || undefined,
          signupSource: signupSource || undefined, signupSourceDetail: signupSourceDetail.trim() || undefined, utm,
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
        // رمز تأكيد الإيميل قبل الدخول للوحة
        window.location.href = VERIFY_DEVICE_PATH
      } else {
        setMode('registered' as any)
      }
    }
    setLoading(false)
  }

  const phoneRule = PHONE_RULES[countryCode] || { length:10, prefix:'', placeholder:'xxxxxxxxxx' }
  const phonePlaceholder = phoneRule.placeholder

  return { planFromLink, editPlan, setEditPlan, t, lang, forgotMethod, setForgotMethod, forgotPhone, setForgotPhone, oauth, setOauth, mode, setMode, step, setStep, otpSent, setOtpSent, otp, setOtp, otpVerified, setOtpVerified, sendingOtp, setSendingOtp, email, setEmail, password, setPassword, orgName, setOrgName, phone, setPhone, countryCode, setCountryCode, businessType, setBusinessType, planChoice, setPlanChoice, signupAddons, setSignupAddons, branchCount, setBranchCount, billing, setBilling, loading, setLoading, error, setError, accountStatus, setAccountStatus, agreedTerms, setAgreedTerms, agentCode, setAgentCode, showPassword, setShowPassword, signupSource, setSignupSource, signupSourceDetail, setSignupSourceDetail, utm, setUtm, supabase, phoneRule, phonePlaceholder, handleGoogle, leaveOauth, handleLogin, handleForgot, handleForgotWhatsapp, nextStep, validatePassword, sendOtp, verifyOtp, handleRegister }
}

export type LoginState = ReturnType<typeof useLogin>
