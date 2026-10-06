'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, AlertTriangle, ChevronLeft, FileSpreadsheet, Download, Smartphone } from 'lucide-react'
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

// «أجهزتي»: كل جهاز داخل على الحساب — يطلّعه بضغطة
function Devices() {
  const [list, setList] = useState<any[] | null>(null)
  const [open, setOpen] = useState(false)
  const load = () => fetch('/api/accountant-portal/sessions').then(r => r.json()).then(j => setList(j.sessions || [])).catch(() => setList([]))
  useEffect(() => { if (open && !list) load() }, [open])
  async function out(q: string) {
    await fetch(`/api/accountant-portal/sessions?${q}`, { method: 'DELETE' }).catch(() => {})
    load()
  }
  const ago = (iso: string) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? `قبل ${Math.max(1, m)} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم` }
  return (
    <div style={{ marginTop: 22 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: colors.text3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, padding: 0 }}>
        <Smartphone size={15} /> أجهزتي {open ? '▴' : '▾'}
      </button>
      {open && <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 12, marginTop: 8 }}>
        {!list ? <div style={{ fontSize: 12.5, color: colors.text4 }}>جاري التحميل...</div> : list.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
            <span style={{ flex: 1 }}><b>{d.device}</b>{d.current && <span style={{ color: '#059669', fontWeight: 700 }}> · هذا الجهاز</span>}<span style={{ color: colors.text4 }}> · آخر استخدام {ago(d.last_seen_at)}</span></span>
            {!d.current && <button onClick={() => out(`id=${d.id}`)} style={{ fontSize: 12, fontWeight: 700, color: colors.danger, background: 'none', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: font.family }}>طلّعه</button>}
          </div>
        ))}
        {list && list.filter(d => !d.current).length > 0 && <button onClick={() => out('others=1')} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: colors.danger, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family }}>طلّع كل الأجهزة الثانية</button>}
        <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 8 }}>لو شفت جهاز ما تعرفه، طلّعه — يحتاج رمز جديد على إيميلك عشان يدخل.</div>
      </div>}
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: 260 }}><PeriodBar from={range.from} to={range.to} onChange={setRange} /></div>
        {clients.length > 0 && <a href={`/api/accountant-portal/clients?from=${range.from}&to=${range.to}&format=xlsx`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: colors.primary, color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
          <FileSpreadsheet size={15} /> ملخص كل العملاء</a>}
      </div>
      {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
        : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /></div>
        : !clients.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 30, textAlign: 'center', color: colors.text3, fontSize: 14 }}>ما عندك عملاء مفعّلين للحين — أول ما تدعوك منشأة تطلع هنا.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {clients.map(c => {
            const t = c.totals, issues = (t?.incomplete || 0) + (t?.mismatch || 0), locked = c.inactive || c.expired
            return (
              <div key={c.org_id} role="button" tabIndex={0} onClick={() => !locked && router.push(`/accountant-portal/${c.org_id}?from=${range.from}&to=${range.to}`)}
                onKeyDown={e => e.key === 'Enter' && !locked && router.push(`/accountant-portal/${c.org_id}?from=${range.from}&to=${range.to}`)}
                style={{ textAlign: 'right', background: '#fff', border: `1.5px solid ${issues ? '#fecaca' : colors.border}`, borderRadius: radius.xl, padding: 16, cursor: locked ? 'default' : 'pointer', fontFamily: font.family, opacity: locked ? .6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: colors.primaryLight, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={19} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: colors.text4 }}>{c.branch || 'كل الفروع'}</div>
                  </div>
                  {!locked && <a href={`/api/accountant-portal/report?org_id=${c.org_id}&from=${range.from}&to=${range.to}&format=xlsx`} onClick={e => e.stopPropagation()} title="تحميل ملف الإكسل"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 9, border: `1px solid ${colors.primaryBorder}`, background: colors.primaryLight, color: colors.primary, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                    <Download size={13} /> إكسل</a>}
                  {!locked && <ChevronLeft size={18} color={colors.text4} />}
                </div>
                {c.expired ? <div style={{ fontSize: 12.5, color: colors.text3 }}>انتهى الإذن بتاريخ <span dir="ltr">{c.expires_on}</span> — تواصل مع المنشأة لو تحتاج تمديد</div>
                  : c.inactive ? <div style={{ fontSize: 12.5, color: colors.text3 }}>اشتراك المنشأة متوقف حالياً</div> : t ? (<>
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
                {!locked && (c.requests?.open || c.requests?.answered) ? <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>
                  {c.requests.answered ? <span style={{ color: '#1d4ed8' }}>💬 {c.requests.answered} رد جديد </span> : null}
                  {c.requests.open ? <span style={{ color: '#b45309' }}>🟡 {c.requests.open} طلب بانتظار الرد</span> : null}
                </div> : null}
                {!locked && c.expires_on && <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 6 }}>الإذن لين <span dir="ltr">{c.expires_on}</span></div>}
              </div>
            )
          })}
        </div>}
      <Devices />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}'}</style>
    </PortalShell>
  )
}
