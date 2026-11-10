'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, FileSpreadsheet, Download, Building2, Receipt, MessageSquareText, ShieldCheck, ChevronLeft, Search } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { periodLabel } from '@/lib/accountantSchedule'
import { PortalShell, PeriodBar, presetRange, OrgLogo, Stat, Badge } from '@/components/accountant/PortalShell'

// بوابة المحاسب — الدخول برمز على الإيميل، وبعدها نظرة عامة على كل العملاء
type Filter = 'all' | 'action' | 'done' | 'missing' | 'replies'
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontSize: 15, fontFamily: font.family, boxSizing: 'border-box' as const, background:'#fff' }
const btn: React.CSSProperties = { width: '100%', padding: 13, borderRadius: 12, border: 'none', background: colors.primary, color:'#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }

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
  const points = [['جميع عملائك في حساب واحد', Building2], ['الفواتير الضريبية جاهزة للإقرار', Receipt], ['اطلب النواقص من المنشأة مباشرة', MessageSquareText], ['قراءة فقط · دخول برمز بدون كلمة مرور', ShieldCheck]] as const
  return (
    <div dir="rtl" className="ap-login" style={{ minHeight: '100vh', display: 'grid', fontFamily: font.family, background: colors.bg }}>
      <style>{`.ap-login{grid-template-columns:1fr}.ap-brand{display:none}@media(min-width:960px){.ap-login{grid-template-columns:1.05fr 1fr}.ap-brand{display:flex}}`}</style>
      <section className="ap-brand" style={{ background: colors.primary, color:'#fff', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <img src="/storely-logo.png" alt="Storely" width={46} height={46} style={{ borderRadius: 12, background:'#fff' }} />
          <div><div style={{ fontSize: 20, fontWeight: 800 }} dir="ltr">Storely</div><div style={{ fontSize: 13, opacity: .7 }}>بوابة المحاسب</div></div>
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.35, fontWeight: 800, margin: '0 0 22px' }}>جميع حسابات عملائك<br /><span style={{ color:'rgba(255,255,255,.75)' }}>في شاشة واحدة</span></h1>
          {points.map(([t, Icon]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 15, opacity: .92 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} /></span>{t}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: .5, position: 'relative' }} dir="ltr">storely.dev</div>
      </section>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400, background:'#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 28, boxShadow: '0 20px 50px rgba(15,23,42,.08)' }}>
          <img src="/storely-logo.png" alt="" width={44} height={44} style={{ borderRadius: 12, marginBottom: 14 }} />
          <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>{step === 'email' ? 'الدخول إلى بوابة المحاسب' : 'اكتب الرمز'}</div>
          <div style={{ fontSize: 13.5, color: colors.text3, lineHeight: 1.7, marginBottom: 18 }}>
            {step === 'email' ? 'سنرسل لك رمز دخول إلى بريدك الإلكتروني — دون كلمة مرور.' : <>وصلك رمز من 6 أرقام على <b dir="ltr">{email}</b></>}
          </div>
          {step === 'email' ? (<>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" placeholder="name@office.sa" style={inp} onKeyDown={e => e.key === 'Enter' && email && send()} autoFocus />
            <button onClick={send} disabled={busy || !email} style={{ ...btn, marginTop: 12, opacity: busy || !email ? .6 : 1 }}>{busy ? 'جاري الإرسال...' : 'أرسل رمز الدخول'}</button>
          </>) : (<>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="••••••"
              style={{ ...inp, textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 800 }} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} autoFocus />
            <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn, marginTop: 12, opacity: busy || code.length !== 6 ? .6 : 1 }}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
            <button onClick={() => { setStep('email'); setCode(''); setMsg(null) }} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize: 13, marginTop: 4 }}>تغيير البريد الإلكتروني أو طلب رمز جديد</button>
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
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
      .then(j => j.success ? setData(j) : j.error === 'سجّل الدخول' ? setMe(null) : setError(j.error || 'تعذر التحميل')).catch(() => setError('تأكد من الإنترنت'))
  }, [me, range, reload])

  if (me === undefined) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={26} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
  if (!me) return <Login onDone={loadMe} />

  const clients = ((data?.clients || []) as any[]).slice().sort((a, b) => rank(b) - rank(a))
  const live = clients.filter(c => c.totals)
  const sum = (f: (c: any) => number | null) => live.reduce((s, c) => s + (Number(f(c)) || 0), 0)
  const replies = clients.reduce((s, c) => s + (c.requests?.answered || 0), 0)
  const missingAll = sum(c => c.totals.incomplete), mismatchAll = sum(c => c.totals.mismatch)
  const needs = (c: any) => !!((c.totals?.incomplete || 0) + (c.totals?.mismatch || 0) + (c.requests?.answered || 0))
  const q = search.trim()
  const shown = clients.filter(c => (!q || c.name.includes(q) || (c.branch || '').includes(q))
    && (filter === 'all' || (filter === 'action' ? needs(c) : filter === 'missing' ? (c.totals?.incomplete || 0) + (c.totals?.mismatch || 0) > 0 : filter === 'replies' ? c.requests?.answered > 0 : !needs(c) && !c.expired && !c.inactive)))
  const open = (c: any) => { if (!(c.inactive || c.expired)) router.push(`/accountant-portal/${c.org_id}?from=${range.from}&to=${range.to}`) }
  const xlsxOf = (c: any) => `/api/accountant-portal/report?org_id=${c.org_id}&from=${range.from}&to=${range.to}&format=xlsx`
  const FILTERS: [Filter, string, number][] = [['all', 'الكل', clients.length], ['action', 'تحتاج إجراء', clients.filter(needs).length], ['done', 'مكتملة', clients.filter(c => !needs(c) && !c.expired && !c.inactive).length]]
  const money = (v: number | null | undefined) => v == null ? <span style={{ color: colors.text4 }}>—</span> : fmt(v)

  return (
    <PortalShell title="عملائي" subtitle={data?.period ? `${clients.length} ${clients.length > 2 && clients.length < 11 ? 'منشآت' : 'منشأة'} · ${periodLabel(data.period)}` : undefined}
      actions={clients.length > 0 ? <a href={`/api/accountant-portal/clients?from=${range.from}&to=${range.to}&format=xlsx`} className="ap-btn sec" title="ملخص كل العملاء">
        <FileSpreadsheet size={16} /><span className="ap-lbl">ملخص كل العملاء</span></a> : undefined}>

      {(data?.invites || []).map((v: any) => (
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, background: '#fff', border: `1px solid ${colors.border}`, borderInlineStart: `3px solid ${colors.primary}`, borderRadius: radius.xl, padding: '12px 16px', marginBottom: 12 }}>
          <OrgLogo name={v.org} url={v.logo_url} size={38} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{v.org} تدعوك لتكون محاسبها{v.branch ? ` · فرع ${v.branch}` : ''}</div>
            <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 2 }}>ستطّلع على: {v.sections.join('، ')}</div>
          </div>
          <button onClick={() => answerInvite(v.id, 'decline')} disabled={!!inviteBusy} className="ap-btn sec">{inviteBusy === v.id + 'decline' ? 'جاري...' : 'رفض'}</button>
          <button onClick={() => answerInvite(v.id, 'accept')} disabled={!!inviteBusy} className="ap-btn pri">{inviteBusy === v.id + 'accept' ? 'جاري...' : 'قبول الدعوة'}</button>
        </div>
      ))}

      <PeriodBar from={range.from} to={range.to} onChange={setRange} />

      {error ? <div style={{ color: colors.danger, fontSize: 14, padding: 20 }}>{error}</div>
        : !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
        : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,140px),1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="الضريبة المستحقة" value={fmt(sum(c => c.totals.vatNet))} hint="مجموع كل العملاء" icon={<Receipt size={16} />} />
            <Stat label="فواتير ضريبية ناقصة" value={String(missingAll)} hint={mismatchAll ? `و${mismatchAll} بمبلغ أكبر من الأصلية` : 'اضغط لعرض المنشآت'} tone={missingAll ? 'red' : 'teal'} icon={<AlertTriangle size={16} />}
              onClick={() => setFilter(f => f === 'missing' ? 'all' : 'missing')} active={filter === 'missing'} />
            <Stat label="ردود جديدة من المنشآت" value={String(replies)} hint="اضغط لعرض المنشآت" tone={replies ? 'blue' : 'teal'} icon={<MessageSquareText size={16} />}
              onClick={() => setFilter(f => f === 'replies' ? 'all' : 'replies')} active={filter === 'replies'} />
            <Stat label="العملاء" value={String(clients.length)} hint={`${live.length} نشط`} icon={<Building2 size={16} />} />
          </div>

          {!clients.length ? <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 40, textAlign: 'center', color: colors.text3, fontSize: 14 }}>لا يوجد لديك عملاء مفعّلون بعد — تظهر المنشأة هنا فور قبولك دعوتها</div>
          : <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, padding: 12, borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
                <Search size={16} color={colors.text3} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم المنشأة أو الفرع" aria-label="بحث"
                  style={{ width: '100%', boxSizing: 'border-box' as const, padding: '9px 36px 9px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 16, fontFamily: font.family, background: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: 2, padding: 3, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                {FILTERS.map(([k, l, n]) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                  style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: font.family, fontSize: 12.5, fontWeight: filter === k ? 700 : 600, whiteSpace: 'nowrap' as const,
                    background: filter === k ? '#fff' : 'transparent', color: filter === k ? colors.text : colors.text3, boxShadow: filter === k ? '0 1px 2px rgba(15,23,42,.08)' : 'none' }}>{l} <span style={{ color: colors.text4, fontWeight: 500 }}>{n}</span></button>)}
              </div>
            </div>

            {!shown.length ? <div style={{ padding: 32, textAlign: 'center', color: colors.text3, fontSize: 13.5 }}>لا توجد منشآت تطابق البحث</div> : <>
              {/* الكمبيوتر: جدول */}
              <div className="ap-desk" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 820 }}>
                  <thead><tr>{['المنشأة', 'الحالة', 'المبيعات', 'المشتريات', 'الضريبة المستحقة', 'للموردين', ''].map((h, i) =>
                    <th key={i} style={{ textAlign: i >= 2 && i <= 5 ? 'left' : 'right', padding: '10px 16px', background: '#F6F8F9', color: colors.text3, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' as const, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>{shown.map(c => {
                    const locked = c.inactive || c.expired, t = c.totals
                    return (
                      <tr key={c.org_id} className={locked ? undefined : 'ap-row'} onClick={() => open(c)} style={{ opacity: locked ? .6 : 1 }}>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <OrgLogo name={c.name} url={c.logo_url} size={34} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: colors.text3 }}>{c.branch || 'كل الفروع'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}><StatusBadges c={c} /></td>
                        {[t?.sales, t?.purchases, t?.vatNet, t?.payables].map((v, i) =>
                          <td key={i} dir="ltr" style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, textAlign: 'left', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' as const }}>{locked ? '' : money(v)}</td>)}
                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, width: 80 }}>
                          {!locked && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <a href={xlsxOf(c)} onClick={e => e.stopPropagation()} title="تحميل إكسل" aria-label={`تحميل إكسل ${c.name}`}
                              style={{ display: 'inline-flex', padding: 7, borderRadius: 8, border: `1px solid ${colors.border}`, color: colors.text3 }}><Download size={15} /></a>
                            <ChevronLeft size={18} color={colors.text4} />
                          </div>}
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
              {/* الجوال: صفوف مختصرة */}
              <div className="ap-mob">
                {shown.map((c, i) => {
                  const locked = c.inactive || c.expired, t = c.totals
                  return (
                    <div key={c.org_id} className={locked ? undefined : 'ap-row'} onClick={() => open(c)} style={{ padding: 14, borderTop: i ? `1px solid ${colors.border}` : 'none', opacity: locked ? .6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <OrgLogo name={c.name} url={c.logo_url} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: colors.text3 }}>{c.branch || 'كل الفروع'}</div>
                        </div>
                        {!locked && <ChevronLeft size={18} color={colors.text4} />}
                      </div>
                      <div style={{ marginTop: 10 }}><StatusBadges c={c} /></div>
                      {!locked && t && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, fontSize: 12.5 }}>
                        {[['المبيعات', t.sales], ['المشتريات', t.purchases], ['الضريبة المستحقة', t.vatNet], ['للموردين', t.payables]].filter(([, v]) => v != null).map(([k, v]) => (
                          <div key={k as string}><div style={{ color: colors.text3 }}>{k}</div><div dir="ltr" style={{ fontWeight: 600, fontSize: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(v as number)}</div></div>))}
                      </div>}
                    </div>
                  )
                })}
              </div>
            </>}
          </section>}
        </>}
    </PortalShell>
  )
}

// ترتيب العملاء: اللي يحتاج إجراء أولاً، والموقوف آخراً
function rank(c: any) {
  if (c.expired || c.inactive) return -1
  return (c.totals?.incomplete || 0) * 3 + (c.totals?.mismatch || 0) * 3 + (c.requests?.answered || 0) * 2 + (c.requests?.open || 0)
}

// حالة المنشأة في سطر واحد — الأهم أولاً
function StatusBadges({ c }: { c: any }) {
  if (c.expired) return <Badge tone="grey">انتهى الإذن {c.expires_on ? <span dir="ltr">{c.expires_on}</span> : null}</Badge>
  if (c.inactive) return <Badge tone="grey">اشتراك المنشأة متوقف</Badge>
  const t = c.totals || {}, out: React.ReactNode[] = []
  if (t.incomplete) out.push(<Badge key="i" tone="red">{t.incomplete === 1 ? 'فاتورة ناقصة' : `${t.incomplete} فواتير ناقصة`}</Badge>)
  if (t.mismatch) out.push(<Badge key="m" tone="red">{t.mismatch === 1 ? 'مبلغ مختلف' : `${t.mismatch} مبالغ مختلفة`}</Badge>)
  if (c.requests?.answered) out.push(<Badge key="a" tone="blue">{c.requests.answered === 1 ? 'رد جديد' : `${c.requests.answered} ردود جديدة`}</Badge>)
  if (c.requests?.open) out.push(<Badge key="o" tone="amber">بانتظار المنشأة</Badge>)
  if (!out.length) out.push(<Badge key="ok" tone="green">مكتملة</Badge>)
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{out}</div>
}
