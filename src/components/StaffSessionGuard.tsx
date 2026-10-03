'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

// حارس جلسة الموظف — يغلّف كل صفحات /staff:
// 1) لو أي طلب للسيرفر رجع «انتهت الجلسة»، تطلع نافذة رمز PIN، وبعد الدخول نعيد نفس الطلب
//    تلقائياً — الموظف يكمل اللي كان يسويه بدون ما يضيع شي ولا يشوف رسالة تقنية.
// 2) لو نشرنا نسخة جديدة والصفحة مفتوحة من قبل، تتحدّث لحالها (لما يرجع للصفحة أو كل دقيقتين وهو ما يكتب).

const SKIP = ['/api/staff-login', '/api/staff-reauth', '/api/version']
const SESSION_ENDED = 'انتهت جلستك — أدخل رمزك من جديد'   // نفس نص lib/staffAuth
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'

type Waiter = { resolve: (ok: boolean) => void }

export default function StaffSessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const waiters = useRef<Waiter[]>([])

  // ── 1) اعتراض الطلبات المنتهية الجلسة ──
  useEffect(() => {
    const original = window.fetch
    const askPin = () => new Promise<boolean>(resolve => {   // كل الطلبات المنتهية تنتظر نفس النافذة
      waiters.current.push({ resolve })
      try { setName(JSON.parse(localStorage.getItem('staff_session') || '{}').name || '') } catch {}
      setOpen(true)
    })

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init)
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (res.status !== 401 || !url.includes('/api/') || SKIP.some(p => url.includes(p))) return res
      if (!localStorage.getItem('staff_session')) return res
      // نطلب PIN بس لما الجلسة نفسها انتهت (رسالة verifyStaffToken) — مو لأي 401 ثاني أو انتهاء الاشتراك
      const body = await res.clone().json().catch(() => null)
      if (body?.error !== SESSION_ENDED || body?.reason === 'subscription_expired') return res

      const ok = await askPin()
      if (!ok) return res
      // نعيد نفس الطلب بالرمز الجديد
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
      headers.set('Authorization', `Bearer ${localStorage.getItem('staff_token')}`)
      return original(input, { ...init, headers })
    }
    return () => { window.fetch = original }
  }, [])

  async function submit() {
    if (!pin || busy) return
    setBusy(true); setErr('')
    try {
      const session = JSON.parse(localStorage.getItem('staff_session') || '{}')
      const res = await fetch('/api/staff-reauth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: session.id, pin }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.token) { setErr(j.error || 'الرمز غير صحيح'); setPin(''); setBusy(false); return }
      localStorage.setItem('staff_token', j.token)
      if (j.staff) localStorage.setItem('staff_session', JSON.stringify(j.staff))
      // المالك نقله لفرع ثاني: نحدّث الصفحة عشان كل شي (المنتجات، الموقع، الشفت) يجي من فرعه الجديد
      if (j.staff && (j.staff.branch_id ?? null) !== (session.branch_id ?? null)) { window.location.reload(); return }
      setOpen(false); setPin(''); setBusy(false)
      waiters.current.splice(0).forEach(w => w.resolve(true))
    } catch { setErr('خطأ بالاتصال — حاول مرة ثانية'); setBusy(false) }
  }

  function logout() {
    waiters.current.splice(0).forEach(w => w.resolve(false))
    setOpen(false)
    localStorage.removeItem('staff_session'); localStorage.removeItem('staff_token')
    router.replace('/staff')
  }

  // ── 2) تحديث تلقائي للنسخة الجديدة ──
  useEffect(() => {
    if (BUILD === 'dev') return
    let stopped = false
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      // ما نقاطع الموظف وهو يكتب أو نافذة الرمز مفتوحة
      const el = document.activeElement as HTMLElement | null
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        const j = await r.json()
        if (j?.build && j.build !== 'dev' && j.build !== BUILD) window.location.reload()
      } catch {}
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    const t = setInterval(check, 120000)
    check()
    return () => { stopped = true; document.removeEventListener('visibilitychange', onVisible); clearInterval(t) }
  }, [])

  return (
    <>
      {children}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: 'rtl' }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 340, padding: 26, textAlign: 'center', boxShadow: '0 20px 50px rgba(15,23,42,.25)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Lock size={24} /></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>أدخل رمزك للمتابعة</div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, marginBottom: 16 }}>{name ? `${name}، ` : ''}انتهت جلستك للأمان — بعد الرمز نكمل طلبك تلقائياً</div>
            <input type="password" inputMode="numeric" autoFocus maxLength={6} value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="••••"
              style={{ width: '100%', height: 54, fontSize: 24, fontWeight: 800, textAlign: 'center', letterSpacing: 8, border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 14, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
            {err && <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, marginTop: 8 }}>{err}</div>}
            <button onClick={submit} disabled={!pin || busy}
              style={{ width: '100%', height: 48, marginTop: 14, background: !pin || busy ? '#94a3b8' : '#0f766e', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: !pin || busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'جاري التحقق...' : 'متابعة'}
            </button>
            <button onClick={logout} style={{ width: '100%', marginTop: 8, padding: 10, background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>تسجيل خروج</button>
          </div>
        </div>
      )}
    </>
  )
}
