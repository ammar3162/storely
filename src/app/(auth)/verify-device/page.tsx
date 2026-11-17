'use client'
// التحقق من الجهاز: رمز على الإيميل عند التسجيل أو الدخول من جهاز جديد — بعدها ما يُطلب رمز على هذا الجهاز
import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Mail, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { DEVICE_STORAGE_KEY } from '@/lib/deviceMessages'

const toLatin = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 6)

export default function VerifyDevicePage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(0)
  const [sending, setSending] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const started = useRef(false)

  // تطبيق الجوال يحفظ معرّف الجهاز بنفسه (الموقع بكوكي)
  const keepDevice = (j: { device_token?: string }) => { if (j.device_token) try { localStorage.setItem(DEVICE_STORAGE_KEY, j.device_token) } catch {} }

  async function goNext() {
    const me = await api.get('/api/me')
    if (me.status === 'pending') { window.location.href = '/pending'; return }
    if (me.org_id && me.org && !me.org.onboarding_done) { window.location.href = '/onboarding'; return }
    window.location.href = '/dashboard'
  }

  async function send() {
    setSending(true); setError(''); setInfo('')
    const j = await api.post('/api/device/send-code')
    keepDevice(j)
    setSending(false)
    if (j.trusted) { await goNext(); return }
    if (!j.success) { setError(j.error || 'تعذّر إرسال الرمز'); return }
    if (j.email) setEmail(j.email)
    setWait(Number(j.wait) || 60)
    if (j.sent) setInfo('أرسلنا رمزاً جديداً')
    setTimeout(() => inputRef.current?.focus(), 0)   // بعد ما يرجع الحقل مفعّل
  }

  async function verify(value = code) {
    if (value.length !== 6) { setError('أدخل الرمز المكوّن من 6 أرقام'); return }
    setChecking(true); setError(''); setInfo('')
    const j = await api.post('/api/device/verify-code', { code: value })
    if (!j.success) {
      setChecking(false); setError(j.error || 'الرمز غير صحيح'); setCode('')
      inputRef.current?.focus()
      return
    }
    await goNext()
  }

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    send()
  }, [])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  return (
    <div className="vd">
      <style>{`
        .vd{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl;
          font-family:var(--storely-font);background:var(--storely-background)}
        .vd-card{width:100%;max-width:420px;background:#fff;border:none;border-radius:22px;padding:32px 26px;box-shadow:0 12px 40px rgba(0,0,0,.06);text-align:center}
        .vd-icon{width:60px;height:60px;border-radius:18px;background:var(--storely-background);color:#203640;display:grid;place-items:center;margin:0 auto 16px}
        .vd h1{font-size:22px;font-weight:600;color:var(--storely-text);margin:0 0 8px}
        .vd p{font-size:17px;color:var(--storely-text);line-height:1.6;margin:0}
        .vd-email{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 12px;border-radius:99px;background:var(--storely-fill);font-size:15px;font-weight:600;color:var(--storely-text)}
        .vd label{display:block;text-align:start;font-size:15px;font-weight:500;color:var(--storely-text);margin:22px 0 6px}
        .vd input{width:100%;padding:14px;border:1px solid var(--storely-control-border);border-radius:14px;font-size:26px;font-weight:600;letter-spacing:10px;text-align:center;color:var(--storely-text);font-family:inherit;outline:none;direction:ltr}
        .vd input:disabled{background:var(--storely-fill)}
        .vd input:focus{border-color:#203640;box-shadow:0 0 0 3px rgba(32,54,64,.15)}
        .vd-btn{width:100%;min-height:50px;margin-top:14px;padding:13px;border:none;border-radius:999px;background:#203640;color:#fff;font-size:17px;font-weight:500;font-family:inherit;cursor:pointer}
        .vd-btn:disabled{opacity:.6;cursor:not-allowed}
        .vd-err{margin-top:12px;padding:10px 12px;border-radius:12px;background:#fef2f2;color:#991b1b;font-size:15px;font-weight:600}
        .vd-info{margin-top:12px;font-size:15px;color:#203640;font-weight:600}
        .vd-links{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px;font-size:15px}
        .vd-link{background:none;border:none;padding:0;font:inherit;font-weight:600;color:#203640;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
        .vd-link:disabled{color:#6b7280;cursor:default}
        .vd-hint{margin-top:16px;font-size:15px;color:var(--storely-text);line-height:1.7}
      `}</style>
      <div className="vd-card">
        <div className="vd-icon"><ShieldCheck size={30} /></div>
        <h1>تحقق من جهازك</h1>
        <p>{email
          ? 'أرسلنا رمزاً من 6 أرقام إلى بريدك الإلكتروني. أدخله لإكمال الدخول، ولن نطلبه منك مرة أخرى على هذا الجهاز.'
          : sending ? 'جاري إرسال رمز التحقق إلى بريدك الإلكتروني…' : 'هذا الجهاز جديد على حسابك. اطلب رمز التحقق لإكمال الدخول.'}</p>
        {email && <div className="vd-email"><Mail size={15} /><span dir="ltr">{email}</span></div>}

        <form onSubmit={e => { e.preventDefault(); verify() }}>
          <label htmlFor="vd-code">رمز التحقق</label>
          <input id="vd-code" ref={inputRef} value={code} disabled={sending} inputMode="numeric" autoComplete="one-time-code" placeholder="------"
            onChange={e => { const v = toLatin(e.target.value); setCode(v); setError(''); if (v.length === 6 && !checking) verify(v) }} />
          <button className="vd-btn" type="submit" disabled={checking || code.length !== 6}>{checking ? 'جاري التحقق…' : 'تأكيد'}</button>
        </form>

        {error && <div className="vd-err" role="alert">{error}</div>}
        {info && !error && <div className="vd-info">{info}</div>}

        <div className="vd-links">
          <button type="button" className="vd-link" onClick={send} disabled={sending || wait > 0}>
            {wait > 0 ? `إعادة الإرسال بعد ${wait} ثانية` : 'إرسال الرمز مرة أخرى'}
          </button>
          <button type="button" className="vd-link" onClick={logout}><LogOut size={15} />تسجيل الخروج</button>
        </div>
        <div className="vd-hint">لم يصلك الرمز؟ تحقق من مجلد الرسائل غير المرغوب فيها، أو تواصل مع فريق ستورلي.</div>
      </div>
    </div>
  )
}
