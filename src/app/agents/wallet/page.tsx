'use client'
import { useEffect, useState } from 'react'
import { Loader2, Wallet, Copy, Check, MessageCircle, LogOut, Users, BadgeCheck, Banknote } from 'lucide-react'
import { colors, font } from '@/lib/ds'

// محفظة السفير: الدخول برمز على الإيميل، وبعدها الرصيد والمنشآت والصرف
const sar = (n: number) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const dt = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })
const inp: React.CSSProperties = { width: '100%', minHeight: 44, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--storely-control-border)', fontSize:17, fontFamily: font.family, boxSizing: 'border-box', background:'#fff' }
const btn: React.CSSProperties = { width: '100%', minHeight: 50, padding: 13, borderRadius: 999, border: 'none', background: colors.primary, color:'#fff', fontSize: 17, fontWeight: 500, cursor: 'pointer', fontFamily: font.family }
const post = (u: string, b: any) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ error: 'تحقق من اتصالك بالإنترنت' }))
const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  trial: { l: 'في الفترة التجريبية', bg: '#fffbeb', c: '#b45309' }, paid: { l: 'اشتركت', bg: '#ecfdf5', c: '#047857' }, cancelled: { l: 'ملغاة', bg: 'var(--storely-fill)', c: 'var(--storely-muted)' },
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  async function send() { setBusy(true); setMsg(null); const j = await post('/api/agents/login', { email }); setBusy(false); if (j.success) { setStep('code'); setMsg({ t: j.message }) } else setMsg({ t: j.error, bad: true }) }
  async function verify() { setBusy(true); setMsg(null); const j = await post('/api/agents/verify', { email, code }); setBusy(false); if (j.success) onDone(); else setMsg({ t: j.error, bad: true }) }
  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background:'linear-gradient(180deg,#203640 0,#203640 240px,var(--storely-background) 240px)', padding: '30px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <a href="/agents" style={{ display: 'flex', alignItems: 'center', gap: 10, color:'#fff', textDecoration: 'none', marginBottom: 26 }}>
          <img src="/storely-logo.png" alt="Storely" width={38} height={38} style={{ borderRadius:12, background:'#fff' }} />
          <div><div style={{ fontSize: 17, fontWeight:600 }} dir="ltr">Storely</div><div style={{ fontSize:13, opacity: .7 }}>محفظة السفير</div></div>
        </a>
        <div style={{ background:'#fff', border: 'none', borderRadius: 20, padding: 26, boxShadow: '0 12px 40px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 20, fontWeight:600, marginBottom: 6 }}>{step === 'email' ? 'الدخول إلى محفظتك' : 'أدخل الرمز'}</div>
          <div style={{ fontSize:15, color: colors.text3, lineHeight: 1.7, marginBottom: 16 }}>{step === 'email' ? 'نرسل رمز الدخول إلى البريد الإلكتروني الذي سجّلت به.' : <>أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">{email}</b></>}</div>
          {step === 'email' ? (<>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" placeholder="name@email.com" style={inp} onKeyDown={e => e.key === 'Enter' && email && send()} autoFocus />
            <button onClick={send} disabled={busy || !email} style={{ ...btn, marginTop: 12, opacity: busy || !email ? .6 : 1 }}>{busy ? 'جارٍ الإرسال…' : 'أرسل رمز الدخول'}</button>
          </>) : (<>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="••••••"
              style={{ ...inp, textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight:600 }} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} autoFocus />
            <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn, marginTop: 12, opacity: busy || code.length !== 6 ? .6 : 1 }}>{busy ? 'جارٍ الدخول…' : 'دخول'}</button>
            <button onClick={() => { setStep('email'); setCode(''); setMsg(null) }} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize:15, marginTop: 4 }}>تغيير البريد الإلكتروني أو طلب رمز جديد</button>
          </>)}
          {msg && <div style={{ marginTop: 12, fontSize:15, color: msg.bad ? colors.danger : colors.text3, lineHeight: 1.7 }}>{msg.t}</div>}
          <div style={{ fontSize:15, color: colors.text3, marginTop: 16, textAlign: 'center' }}>ليس لديك حساب؟ <a href="/agents" style={{ color: colors.primary, fontWeight:600 }}>سجّل سفيراً</a></div>
        </div>
      </div>
    </div>
  )
}

export default function AgentWalletPage() {
  const [d, setD] = useState<any>(undefined)
  const [copied, setCopied] = useState(false)
  const [edit, setEdit] = useState<{ method: 'cash' | 'transfer'; iban: string } | null>(null)
  const [msg, setMsg] = useState('')
  const load = () => fetch('/api/agents/me').then(r => r.json()).then(j => setD(j.success ? j : null)).catch(() => setD(null))
  useEffect(() => { load() }, [])

  if (d === undefined) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={26} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
  if (!d) return <Login onDone={load} />

  const share = `مرحباً،\nهل تعرف Storely؟ نظام واحد يربط كل أعمال منشأتك: المخزون والكاشير والمشتريات والموظفين والمحاسب.\nجرّبه مجاناً من هنا: ${d.link}`
  const paidCount = d.customers.filter((c: any) => c.status === 'paid').length
  async function savePayout() {
    if (!edit) return
    setMsg('')
    const j = await fetch('/api/agents/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payout_method: edit.method, iban: edit.iban }) }).then(r => r.json()).catch(() => ({ error: 'تحقق من اتصالك بالإنترنت' }))
    if (!j.success) return setMsg(j.error || 'تعذر الحفظ')
    setEdit(null); load()
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background:'var(--storely-background)' }}>
      <div style={{ background:'#203640', color:'#fff', padding: '22px 16px 80px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/storely-logo.png" alt="Storely" width={36} height={36} style={{ borderRadius:12, background:'#fff' }} />
            <div><div style={{ fontSize:17, fontWeight:600 }}>{d.agent.name}</div><div style={{ fontSize:13, opacity: .7 }}>سفير Storely · <span dir="ltr">{d.agent.code}</span></div></div>
            <button onClick={async () => { await post('/api/agents/logout', {}); setD(null) }} title="خروج" style={{ marginInlineStart: 'auto', background: 'rgba(255,255,255,.1)', border: 'none', color:'#fff', borderRadius:999, padding: 9, cursor: 'pointer' }}><LogOut size={16} /></button>
          </div>
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize:15, opacity: .75, display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={15} /> رصيدك</div>
            <div style={{ fontSize: 44, fontWeight:600, lineHeight: 1.2 }}>{sar(d.wallet.balance)} <span style={{ fontSize:20, fontWeight:600, opacity: .8 }}>ريال</span></div>
            <div style={{ fontSize:15, opacity: .75 }}>كسبت {sar(d.wallet.earned)} · انصرف لك {sar(d.wallet.paid)}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '-50px auto 0', padding: '0 16px 40px', display: 'grid', gap: 14 }}>
        <div style={{ background:'#fff', border: 'none', borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize:17, fontWeight:600, marginBottom: 10 }}>رابطك الخاص</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', background:'var(--storely-background)', border: `1px dashed ${colors.primary}`, borderRadius:20, padding: '11px 12px', fontSize:17, wordBreak: 'break-all' }} dir="ltr">{d.link}</div>
            <button onClick={() => { navigator.clipboard?.writeText(d.link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ ...btn, width: 'auto', padding: '11px 16px', background:'#fff', color: colors.primary, border: `1.5px solid ${colors.primary}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'تم النسخ' : 'نسخ'}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, width: 'auto', padding: '11px 16px', background:'#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageCircle size={16} /> مشاركة</a>
          </div>
          <div style={{ fontSize:13, color: colors.text3, marginTop: 8 }}>أو تُدخل المنشأة رمزك <b dir="ltr" style={{ color: colors.text }}>{d.agent.code}</b> عند التسجيل.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {[[Users, 'سجّلت عن طريقك', d.customers.length], [BadgeCheck, 'اشتركت', paidCount], [Banknote, 'دفعات الصرف', d.payouts.length]].map(([Icon, l, v]: any) => (
            <div key={l} style={{ background:'#fff', border: 'none', borderRadius:20, padding: 14 }}>
              <div style={{ fontSize:13, color: colors.text3, display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={14} /> {l}</div>
              <div style={{ fontSize: 22, fontWeight:600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', border: 'none', borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize:17, fontWeight:600, marginBottom: 6 }}>المنشآت التي سجّلت عن طريقك</div>
          {!d.customers.length ? <div style={{ fontSize:15, color: colors.text3, padding: '14px 0', lineHeight: 1.8 }}>لم تسجّل أي منشأة عن طريقك بعد. شارك رابطك مع أصحاب المطاعم والمقاهي والمتاجر الذين تعرفهم </div>
            : d.customers.map((c: any, i: number) => {
              const st = STATUS[c.status] || STATUS.trial
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize:17, fontWeight:600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:13, color: colors.text4 }}>سجّلت {c.joined_at ? dt(c.joined_at) : ''}</div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, padding: '3px 10px', borderRadius: 99, background: st.bg, color: st.c }}>{st.l}</span>
                  <div dir="ltr" style={{ minWidth: 64, textAlign: 'left', fontSize:17, fontWeight:600, color: c.reward ? '#047857' : colors.text4 }}>{c.reward ? `+${sar(c.reward)}` : '—'}</div>
                </div>
              )
            })}
        </div>

        {d.payouts.length > 0 && (
          <div style={{ background:'#fff', border: 'none', borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize:17, fontWeight:600, marginBottom: 6 }}>الصرف</div>
            {d.payouts.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i ? `1px solid ${colors.border}` : 'none', fontSize:15 }}>
                <span>{dt(p.created_at)} · {p.method === 'transfer' ? 'تحويل' : 'نقداً'}</span><b>{sar(p.amount)} ريال</b>
              </div>
            ))}
          </div>
        )}

        <div style={{ background:'#fff', border: 'none', borderRadius: 18, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize:17, fontWeight:600 }}>طريقة الاستلام</div>
              <div style={{ fontSize:15, color: colors.text3, marginTop: 2 }}>{d.agent.payout_method === 'transfer' ? <>تحويل بنكي · آيبان ينتهي بـ <span dir="ltr">{d.agent.iban_last4}</span></> : 'نقداً'}</div>
            </div>
            {!edit && <button onClick={() => setEdit({ method: d.agent.payout_method, iban: '' })} style={{ background: 'var(--storely-fill)', border: 'none', borderRadius:99999, padding: '7px 12px', cursor: 'pointer', fontFamily: font.family, fontSize:15, fontWeight:600, color: colors.text2 }}>تعديل</button>}
          </div>
          {edit && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['cash', 'نقداً'], ['transfer', 'تحويل بنكي']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setEdit({ ...edit, method: k })} style={{ padding: 11, borderRadius:20, fontSize:17, fontWeight:600, fontFamily: font.family, cursor: 'pointer', border: `1.5px solid ${edit.method === k ? colors.primary : colors.border}`, background: edit.method === k ? 'var(--storely-fill)' : '#fff', color: edit.method === k ? colors.primary : colors.text2 }}>{l}</button>
                ))}
              </div>
              {edit.method === 'transfer' && <input value={edit.iban} onChange={e => setEdit({ ...edit, iban: e.target.value.toUpperCase() })} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" maxLength={34} style={inp} />}
              {msg && <div style={{ fontSize:15, color: colors.danger }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={savePayout} style={{ ...btn, flex: 1 }}>حفظ</button>
                <button onClick={() => { setEdit(null); setMsg('') }} style={{ ...btn, flex: 1, background:'var(--storely-fill)', color: colors.text, border: 'none' }}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
        <a href="/agents" style={{ fontSize:15, color: colors.text3, textAlign: 'center' }}>الشروط والأحكام ومبالغ المكافآت</a>
      </div>
    </div>
  )
}
