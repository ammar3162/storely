'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, FileSpreadsheet, Download, Building2, Receipt, MessageSquareText, ShieldCheck, ChevronLeft } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { PortalShell, PeriodBar, presetRange, OrgLogo, Stat } from '@/components/accountant/PortalShell'

// بوابة المحاسب — الدخول برمز على الإيميل، وبعدها نظرة عامة على كل العملاء
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontSize: 15, fontFamily: font.family, boxSizing: 'border-box' as const, background: '#fff' }
const btn: React.CSSProperties = { width: '100%', padding: 13, borderRadius: 12, border: 'none', background: colors.primary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  useEffect(() => { const e = new URLSearchParams(window.location.search).get('email'); if (e) setEmail(e) }, [])
  const post = (u: string, b: any) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
  async function send() {
    setBusy(true); setMsg(null)
    const j = await post('/api/accountant-portal/login', { email }); setBusy(false)
    if (j.error) return setMsg({ t: j.error, bad: true })
    setStep('code'); setMsg({ t: j.message })
  }
  async function verify() {
    setBusy(true); setMsg(null)
    const j = await post('/api/accountant-portal/verify', { email, code }); setBusy(false)
    if (j.error) return setMsg({ t: j.error, bad: true })
    onDone()
  }
  const points = [['كل عملاءك بحساب واحد', Building2], ['الفواتير الضريبية جاهزة للإقرار', Receipt], ['اطلب النواقص من المنشأة مباشرة', MessageSquareText], ['قراءة فقط · دخول برمز بدون كلمة مرور', ShieldCheck]] as const
  return (
    <div dir="rtl" className="ap-login" style={{ minHeight: '100vh', display: 'grid', fontFamily: font.family, background: '#f3f6f6' }}>
      <style>{`.ap-login{grid-template-columns:1fr}.ap-brand{display:none}@media(min-width:960px){.ap-login{grid-template-columns:1.05fr 1fr}.ap-brand{display:flex}}`}</style>
      <section className="ap-brand" style={{ background: 'linear-gradient(160deg,#0d4543 0%,#0b3b3a 50%,#08292a 100%)', color: '#fff', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', insetInlineStart: -120, top: -120, width: 380, height: 380, borderRadius: 999, background: 'radial-gradient(circle,#14b8a655,transparent 70%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <img src="/storely-logo.png" alt="Storely" width={46} height={46} style={{ borderRadius: 12, background: '#fff' }} />
          <div><div style={{ fontSize: 20, fontWeight: 800 }} dir="ltr">Storely</div><div style={{ fontSize: 13, opacity: .7 }}>بوابة المحاسب</div></div>
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.35, fontWeight: 800, margin: '0 0 22px' }}>كل حسابات عملاءك<br /><span style={{ color: '#5eead4' }}>في شاشة وحدة</span></h1>
          {points.map(([t, Icon]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 15, opacity: .92 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>{t}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: .5, position: 'relative' }} dir="ltr">storely.dev</div>
      </section>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 28, boxShadow: '0 20px 50px rgba(15,23,42,.08)' }}>
          <img src="/storely-logo.png" alt="" width={44} height={44} style={{ borderRadius: 12, marginBottom: 14 }} />
          <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>{step === 'email' ? 'ادخل بوابة المحاسب' : 'اكتب الرمز'}</div>
          <div style={{ fontSize: 13.5, color: colors.text3, lineHeight: 1.7, marginBottom: 18 }}>
            {step === 'email' ? 'نرسل لك رمز دخول على إيميلك — بدون كلمة مرور.' : <>وصلك رمز من ٦ أرقام على <b dir="ltr">{email}</b></>}
          </div>
          {step === 'email' ? (<>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" placeholder="name@office.sa" style={inp} onKeyDown={e => e.key === 'Enter' && email && send()} autoFocus />
            <button onClick={send} disabled={busy || !email} style={{ ...btn, marginTop: 12, opacity: busy || !email ? .6 : 1 }}>{busy ? 'جاري الإرسال...' : 'أرسل رمز الدخول'}</button>
          </>) : (<>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="••••••"
              style={{ ...inp, textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 800 }} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} autoFocus />
            <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn, marginTop: 12, opacity: busy || code.length !== 6 ? .6 : 1 }}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
            <button onClick={() => { setStep('email'); setCode(''); setMsg(null) }} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize: 13, marginTop: 4 }}>تغيير الإيميل أو طلب رمز جديد</button>
          </>)}
          {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.bad ? colors.danger : colors.text3, lineHeight: 1.7 }}>{msg.t}</div>}
        </div>
      </section>
    </div>
  )
}

export default function AccountantPortalPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined)
  const [range, setRange] = useState(() => presetRange('month'))
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [inviteBusy, setInviteBusy] = useState('')
  async function answerInvite(id: string, action: 'accept' | 'decline') {
    setInviteBusy(id + action)
    const j = await fetch('/api/accountant-portal/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setInviteBusy('')
    if (!j.success) { setError(j.error || 'حدث خطأ'); return }
    if (action === 'accept') { window.location.reload(); return }   // القائمة الجانبية تتحدث بالمنشأة الجديدة
    setReload(n => n + 1)
  }
  const loadMe = () => fetch('/api/accountant-portal/me').then(r => r.json()).then(j => setMe(j.success ? j.accountant : null)).catch(() => setMe(null))
  useEffect(() => { loadMe() }, [])
  useEffect(() => {
    if (!me) return
    setData(null); setError('')
    fetch(`/api/accountant-portal/clients?from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(j => j.success ? setData(j) : j.error === 'سجّل دخولك' ? setMe(null) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [me, range, reload])

  if (me === undefined) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={26} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
  if (!me) return <Login onDone={loadMe} />

  const clients = ((data?.clients || []) as any[]).slice().sort((a, b) => (b.totals?.incomplete || 0) + (b.totals?.mismatch || 0) - (a.totals?.incomplete || 0) - (a.totals?.mismatch || 0))
  const live = clients.filter(c => c.totals)
  const sum = (f: (c: any) => number | null) => live.reduce((s, c) => s + (Number(f(c)) || 0), 0)
  const replies = clients.reduce((s, c) => s + (c.requests?.answered || 0), 0)
  const label = range.from.slice(0, 7) === range.to.slice(0, 7) ? 'هالفترة' : 'الفترة'

  return (
    <PortalShell title="نظرة عامة" subtitle="كل عملاءك اللي يستخدمون Storely — اللي فيهم نواقص أول"
      actions={clients.length > 0 ? <a href={`/api/accountant-portal/clients?from=${range.from}&to=${range.to}&format=xlsx`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 11, background: colors.primary, color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
        <FileSpreadsheet size={16} /> ملخص كل العملاء</a> : undefined}>
      <PeriodBar from={range.from} to={range.to} onChange={setRange} />
      {(data?.invites || []).map((v: any) => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, background: '#fff', border: `1.5px solid ${colors.primaryBorder}`, borderRadius: radius.xl, padding: '14px 16px', marginBottom: 12, boxShadow: '0 6px 18px rgba(2,159,162,.08)' }}>
          <OrgLogo name={v.org} url={v.logo_url} size={42} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{v.org} تدعوك تكون محاسبها{v.branch ? ` · فرع ${v.branch}` : ''}</div>
            <div style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>بتشوف: {v.sections.join('، ')}</div>
          </div>
          <button onClick={() => answerInvite(v.id, 'accept')} disabled={!!inviteBusy} style={{ padding: '9px 16px', borderRadius: 11, border: 'none', background: colors.primary, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }}>{inviteBusy === v.id + 'accept' ? 'جاري...' : 'قبول'}</button>
          <button onClick={() => answerInvite(v.id, 'decline')} disabled={!!inviteBusy} style={{ padding: '9px 14px', borderRadius: 11, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>{inviteBusy === v.id + 'decline' ? 'جاري...' : 'رفض'}</button>
        </div>
      ))}
      {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
        : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
        : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="العملاء" value={String(clients.length)} hint={`${live.length} مفعّل`} icon={<Building2 size={16} />} />
            <Stat label={`الضريبة المستحقة ${label}`} value={fmt(sum(c => c.totals.vatNet))} hint="مجموع كل العملاء" tone="blue" icon={<Receipt size={16} />} />
            <Stat label="فواتير ضريبية ناقصة" value={String(sum(c => c.totals.incomplete))} hint={sum(c => c.totals.mismatch) ? `و${sum(c => c.totals.mismatch)} مبلغها أكبر من الأصلية` : 'تحتاج الرقم الضريبي أو رقم الفاتورة'} tone={sum(c => c.totals.incomplete) ? 'red' : 'teal'} icon={<AlertTriangle size={16} />} />
            <Stat label="ردود جديدة من المنشآت" value={String(replies)} hint="على طلباتك" tone={replies ? 'amber' : 'teal'} icon={<MessageSquareText size={16} />} />
          </div>

          {!clients.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 40, textAlign: 'center', color: colors.text3, fontSize: 14 }}>ما عندك عملاء مفعّلين للحين — أول ما تقبل دعوة منشأة تطلع هنا.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {clients.map(c => {
                const t = c.totals, issues = (t?.incomplete || 0) + (t?.mismatch || 0), locked = c.inactive || c.expired
                const go = () => !locked && router.push(`/accountant-portal/${c.org_id}?from=${range.from}&to=${range.to}`)
                return (
                  <div key={c.org_id} role="button" tabIndex={0} onClick={go} onKeyDown={e => e.key === 'Enter' && go()} className="ap-card"
                    style={{ background: '#fff', border: `1px solid ${issues ? '#fecaca' : colors.border}`, borderRadius: 18, padding: 18, cursor: locked ? 'default' : 'pointer', opacity: locked ? .6 : 1, transition: 'box-shadow .2s, transform .2s' }}>
                    <style>{'.ap-card:hover{box-shadow:0 14px 32px rgba(15,23,42,.08);transform:translateY(-2px)}'}</style>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <OrgLogo name={c.name} url={c.logo_url} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: colors.text4 }}>{c.branch || 'كل الفروع'}{c.expires_on && !locked ? ` · الإذن لين ${c.expires_on}` : ''}</div>
                      </div>
                      {!locked && <a href={`/api/accountant-portal/report?org_id=${c.org_id}&from=${range.from}&to=${range.to}&format=xlsx`} onClick={e => e.stopPropagation()} title="تحميل ملف الإكسل"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 10, border: `1px solid ${colors.primaryBorder}`, background: colors.primaryLight, color: colors.primary, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                        <Download size={13} /> إكسل</a>}
                    </div>
                    {c.expired ? <div style={{ fontSize: 13, color: colors.text3 }}>انتهى الإذن بتاريخ <span dir="ltr">{c.expires_on}</span> — تواصل مع المنشأة لو تحتاج تمديد</div>
                      : c.inactive ? <div style={{ fontSize: 13, color: colors.text3 }}>اشتراك المنشأة متوقف حالياً</div>
                      : t ? (<>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                          {[['المبيعات', t.sales], ['المشتريات', t.purchases], ['الضريبة المستحقة', t.vatNet], ['للموردين', t.payables]].filter(([, v]) => v != null).map(([k, v]) => (
                            <div key={k as string}><div style={{ fontSize: 11.5, color: colors.text4 }}>{k}</div><div style={{ fontSize: 15, fontWeight: 800 }} dir="ltr">{fmt(v as number)}</div></div>
                          ))}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, flexWrap: 'wrap' as const }}>
                          <span style={{ color: issues ? colors.danger : '#059669' }}>
                            {issues ? `⚠️ ${t.incomplete ? `${t.incomplete} فاتورة ناقصة` : ''}${t.incomplete && t.mismatch ? ' · ' : ''}${t.mismatch ? `${t.mismatch} أكبر من الأصلية` : ''}` : t.taxInvoices ? '✓ الفواتير الضريبية مكتملة' : 'ما فيه فواتير ضريبية بهذي الفترة'}
                          </span>
                          {c.requests?.answered ? <span style={{ color: '#1d4ed8' }}>· 💬 {c.requests.answered} رد جديد</span> : null}
                          {c.requests?.open ? <span style={{ color: '#b45309' }}>· {c.requests.open} طلب بانتظار الرد</span> : null}
                          <ChevronLeft size={16} color={colors.text4} style={{ marginInlineStart: 'auto' }} />
                        </div>
                      </>) : <div style={{ fontSize: 13, color: colors.text3 }}>افتح المنشأة لعرض التفاصيل</div>}
                  </div>
                )
              })}
            </div>}
        </>}
    </PortalShell>
  )
}
