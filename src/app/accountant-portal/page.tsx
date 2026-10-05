'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, AlertTriangle, ChevronLeft } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange } from '@/components/accountant/PortalShell'

// بوابة المحاسب — الدخول برمز على الإيميل، وبعدها كل العملاء في شاشة وحدة
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontSize: 15, fontFamily: font.family, boxSizing: 'border-box' as const }
const btn: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: colors.primary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  useEffect(() => { const e = new URLSearchParams(window.location.search).get('email'); if (e) setEmail(e) }, [])

  async function send() {
    setBusy(true); setMsg(null)
    const j = await fetch('/api/accountant-portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy(false)
    if (j.error) { setMsg({ t: j.error, bad: true }); return }
    setStep('code'); setMsg({ t: j.message })
  }
  async function verify() {
    setBusy(true); setMsg(null)
    const j = await fetch('/api/accountant-portal/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy(false)
    if (j.error) { setMsg({ t: j.error, bad: true }); return }
    onDone()
  }
  return (
    <div style={{ maxWidth: 400, margin: '30px auto', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>أهلاً بك</div>
      <div style={{ fontSize: 13.5, color: colors.text3, lineHeight: 1.7, marginBottom: 18 }}>
        تابع حسابات كل عملائك اللي يستخدمون Storely من مكان واحد. الدخول برمز يوصلك على الإيميل — بدون كلمة مرور.
      </div>
      {step === 'email' ? (<>
        <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>إيميلك</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" placeholder="name@office.sa" style={inp} onKeyDown={e => e.key === 'Enter' && email && send()} />
        <button onClick={send} disabled={busy || !email} style={{ ...btn, marginTop: 12, opacity: busy || !email ? .6 : 1 }}>{busy ? 'جاري الإرسال...' : 'أرسل رمز الدخول'}</button>
      </>) : (<>
        <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>الرمز اللي وصلك على <span dir="ltr">{email}</span></label>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="••••••"
          style={{ ...inp, textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 800 }} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} autoFocus />
        <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn, marginTop: 12, opacity: busy || code.length !== 6 ? .6 : 1 }}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
        <button onClick={() => { setStep('email'); setCode(''); setMsg(null) }} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize: 13, marginTop: 6 }}>تغيير الإيميل أو طلب رمز جديد</button>
      </>)}
      {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.bad ? colors.danger : colors.text3, lineHeight: 1.7 }}>{msg.t}</div>}
    </div>
  )
}

export default function AccountantPortalPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined)
  const [range, setRange] = useState(() => presetRange('month'))
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const loadMe = () => fetch('/api/accountant-portal/me').then(r => r.json()).then(j => setMe(j.success ? j.accountant : null)).catch(() => setMe(null))
  useEffect(() => { loadMe() }, [])
  useEffect(() => {
    if (!me) return
    setData(null); setError('')
    fetch(`/api/accountant-portal/clients?from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(j => j.success ? setData(j) : j.error === 'سجّل دخولك' ? setMe(null) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [me, range])

  if (me === undefined) return <PortalShell><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} color={colors.primary} className="spin" /></div></PortalShell>
  if (!me) return <PortalShell><Login onDone={loadMe} /></PortalShell>

  const clients = ((data?.clients || []) as any[]).slice().sort((a, b) => (b.totals?.incomplete || 0) + (b.totals?.mismatch || 0) - (a.totals?.incomplete || 0) - (a.totals?.mismatch || 0))
  return (
    <PortalShell email={me.email}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>عملاءك</div>
      <div style={{ fontSize: 13, color: colors.text3, marginBottom: 14 }}>كل منشأة أعطتك إذن تطلع هنا — اللي فيها نواقص أول.</div>
      <PeriodBar from={range.from} to={range.to} onChange={setRange} />
      {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
        : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /></div>
        : !clients.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 30, textAlign: 'center', color: colors.text3, fontSize: 14 }}>ما عندك عملاء مفعّلين للحين — أول ما تدعوك منشأة تطلع هنا.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {clients.map(c => {
            const t = c.totals, issues = (t?.incomplete || 0) + (t?.mismatch || 0)
            return (
              <button key={c.org_id} onClick={() => !c.inactive && router.push(`/accountant-portal/${c.org_id}?from=${range.from}&to=${range.to}`)} disabled={c.inactive}
                style={{ textAlign: 'right', background: '#fff', border: `1.5px solid ${issues ? '#fecaca' : colors.border}`, borderRadius: radius.xl, padding: 16, cursor: c.inactive ? 'default' : 'pointer', fontFamily: font.family, opacity: c.inactive ? .6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: colors.primaryLight, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={19} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: colors.text4 }}>{c.branch || 'كل الفروع'}</div>
                  </div>
                  {!c.inactive && <ChevronLeft size={18} color={colors.text4} />}
                </div>
                {c.inactive ? <div style={{ fontSize: 12.5, color: colors.text3 }}>اشتراك المنشأة متوقف حالياً</div> : t ? (<>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                    {t.sales != null && <div><div style={{ color: colors.text4 }}>المبيعات</div><b dir="ltr">{fmt(t.sales)}</b></div>}
                    {t.purchases != null && <div><div style={{ color: colors.text4 }}>المشتريات</div><b dir="ltr">{fmt(t.purchases)}</b></div>}
                    {t.vatNet != null && <div><div style={{ color: colors.text4 }}>الضريبة المستحقة</div><b dir="ltr">{fmt(t.vatNet)}</b></div>}
                    {t.payables != null && <div><div style={{ color: colors.text4 }}>للموردين</div><b dir="ltr">{fmt(t.payables)}</b></div>}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: issues ? colors.danger : '#059669', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {issues ? <><AlertTriangle size={14} /> {t.incomplete ? `${t.incomplete} فاتورة ناقصة` : ''}{t.incomplete && t.mismatch ? ' · ' : ''}{t.mismatch ? `${t.mismatch} مبلغها أكبر من الأصلية` : ''}</>
                      : t.taxInvoices ? '✓ الفواتير الضريبية مكتملة' : 'ما فيه فواتير ضريبية بهذي الفترة'}
                  </div>
                </>) : <div style={{ fontSize: 12.5, color: colors.text3 }}>افتح المنشأة لعرض التفاصيل</div>}
              </button>
            )
          })}
        </div>}
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}'}</style>
    </PortalShell>
  )
}
