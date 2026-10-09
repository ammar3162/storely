'use client'
import { useEffect, useState } from 'react'
import { Loader2, Wallet, Copy, Check, MessageCircle, LogOut, Users, BadgeCheck, Banknote } from 'lucide-react'
import { colors, font } from '@/lib/ds'

// محفظة المندوب: الدخول برمز على الإيميل، وبعدها الرصيد والمنشآت والصرف
const sar = (n: number) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const dt = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontSize: 15, fontFamily: font.family, boxSizing: 'border-box', background: '#fff' }
const btn: React.CSSProperties = { width: '100%', padding: 13, borderRadius: 12, border: 'none', background: colors.primary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }
const post = (u: string, b: any) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  trial: { l: 'في التجربة', bg: '#fffbeb', c: '#b45309' }, paid: { l: 'اشتركت', bg: '#ecfdf5', c: '#047857' }, cancelled: { l: 'ملغاة', bg: '#f1f5f9', c: '#64748b' },
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  async function send() { setBusy(true); setMsg(null); const j = await post('/api/agents/login', { email }); setBusy(false); if (j.success) { setStep('code'); setMsg({ t: j.message }) } else setMsg({ t: j.error, bad: true }) }
  async function verify() { setBusy(true); setMsg(null); const j = await post('/api/agents/verify', { email, code }); setBusy(false); if (j.success) onDone(); else setMsg({ t: j.error, bad: true }) }
  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background: 'linear-gradient(180deg,#0d4543 0,#0b3b3a 240px,#f3f6f6 240px)', padding: '30px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <a href="/agents" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', marginBottom: 26 }}>
          <img src="/storely-logo.png" alt="Storely" width={38} height={38} style={{ borderRadius: 10, background: '#fff' }} />
          <div><div style={{ fontSize: 17, fontWeight: 800 }} dir="ltr">Storely</div><div style={{ fontSize: 12, opacity: .7 }}>محفظة المندوب</div></div>
        </a>
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 26, boxShadow: '0 20px 50px rgba(15,23,42,.1)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{step === 'email' ? 'ادخل محفظتك' : 'اكتب الرمز'}</div>
          <div style={{ fontSize: 13.5, color: colors.text3, lineHeight: 1.7, marginBottom: 16 }}>{step === 'email' ? 'نرسل لك رمز دخول على الإيميل اللي سجّلت فيه.' : <>وصلك رمز من ٦ أرقام على <b dir="ltr">{email}</b></>}</div>
          {step === 'email' ? (<>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" placeholder="name@email.com" style={inp} onKeyDown={e => e.key === 'Enter' && email && send()} autoFocus />
            <button onClick={send} disabled={busy || !email} style={{ ...btn, marginTop: 12, opacity: busy || !email ? .6 : 1 }}>{busy ? 'جاري الإرسال...' : 'أرسل رمز الدخول'}</button>
          </>) : (<>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="••••••"
              style={{ ...inp, textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 800 }} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} autoFocus />
            <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn, marginTop: 12, opacity: busy || code.length !== 6 ? .6 : 1 }}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
            <button onClick={() => { setStep('email'); setCode(''); setMsg(null) }} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize: 13, marginTop: 4 }}>تغيير الإيميل أو طلب رمز جديد</button>
          </>)}
          {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.bad ? colors.danger : colors.text3, lineHeight: 1.7 }}>{msg.t}</div>}
          <div style={{ fontSize: 13, color: colors.text3, marginTop: 16, textAlign: 'center' }}>ما عندك حساب؟ <a href="/agents" style={{ color: colors.primary, fontWeight: 800 }}>سجّل كمندوب</a></div>
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

  const share = `هلا 👋\nتعرف Storely؟ نظام واحد يربط كل أعمال منشأتك: المخزون، الكاشير، المشتريات، الموظفين، والمحاسب.\nجرّبه مجاناً من هنا: ${d.link}`
  const paidCount = d.customers.filter((c: any) => c.status === 'paid').length
  async function savePayout() {
    if (!edit) return
    setMsg('')
    const j = await fetch('/api/agents/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payout_method: edit.method, iban: edit.iban }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    if (!j.success) return setMsg(j.error || 'تعذر الحفظ')
    setEdit(null); load()
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background: '#f3f6f6' }}>
      <div style={{ background: 'linear-gradient(160deg,#0d4543 0%,#0b3b3a 55%,#08292a 100%)', color: '#fff', padding: '22px 16px 80px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/storely-logo.png" alt="Storely" width={36} height={36} style={{ borderRadius: 10, background: '#fff' }} />
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>{d.agent.name}</div><div style={{ fontSize: 12, opacity: .7 }}>مندوب Storely · <span dir="ltr">{d.agent.code}</span></div></div>
            <button onClick={async () => { await post('/api/agents/logout', {}); setD(null) }} title="خروج" style={{ marginInlineStart: 'auto', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: 10, padding: 9, cursor: 'pointer' }}><LogOut size={16} /></button>
          </div>
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 13, opacity: .75, display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={15} /> رصيدك</div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.2 }}>{sar(d.wallet.balance)} <span style={{ fontSize: 18, fontWeight: 700, opacity: .8 }}>ريال</span></div>
            <div style={{ fontSize: 13, opacity: .75 }}>كسبت {sar(d.wallet.earned)} · انصرف لك {sar(d.wallet.paid)}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '-50px auto 0', padding: '0 16px 40px', display: 'grid', gap: 14 }}>
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>رابطك الخاص</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', background: '#f8fafa', border: `1px dashed ${colors.primary}`, borderRadius: 12, padding: '11px 12px', fontSize: 14, wordBreak: 'break-all' }} dir="ltr">{d.link}</div>
            <button onClick={() => { navigator.clipboard?.writeText(d.link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ ...btn, width: 'auto', padding: '11px 16px', background: '#fff', color: colors.primary, border: `1.5px solid ${colors.primary}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'انتسخ' : 'نسخ'}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, width: 'auto', padding: '11px 16px', background: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageCircle size={16} /> شاركه</a>
          </div>
          <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 8 }}>أو المنشأة تكتب كودك <b dir="ltr" style={{ color: colors.text }}>{d.agent.code}</b> وقت التسجيل.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {[[Users, 'سجّلت عن طريقك', d.customers.length], [BadgeCheck, 'اشتركت', paidCount], [Banknote, 'دفعات الصرف', d.payouts.length]].map(([Icon, l, v]: any) => (
            <div key={l} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.text3, display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={14} /> {l}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>المنشآت اللي جبتها</div>
          {!d.customers.length ? <div style={{ fontSize: 13.5, color: colors.text3, padding: '14px 0', lineHeight: 1.8 }}>للحين ما سجّلت منشأة عن طريقك. شارك رابطك مع أصحاب المطاعم والكافيهات والمحلات اللي تعرفهم 👆</div>
            : d.customers.map((c: any, i: number) => {
              const st = STATUS[c.status] || STATUS.trial
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: colors.text4 }}>سجّلت {c.joined_at ? dt(c.joined_at) : ''}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: st.bg, color: st.c }}>{st.l}</span>
                  <div dir="ltr" style={{ minWidth: 64, textAlign: 'left', fontSize: 14, fontWeight: 900, color: c.reward ? '#047857' : colors.text4 }}>{c.reward ? `+${sar(c.reward)}` : '—'}</div>
                </div>
              )
            })}
        </div>

        {d.payouts.length > 0 && (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>الصرف</div>
            {d.payouts.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i ? `1px solid ${colors.border}` : 'none', fontSize: 13.5 }}>
                <span>{dt(p.created_at)} · {p.method === 'transfer' ? 'تحويل' : 'كاش'}</span><b>{sar(p.amount)} ريال</b>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>طريقة الاستلام</div>
              <div style={{ fontSize: 13, color: colors.text3, marginTop: 2 }}>{d.agent.payout_method === 'transfer' ? <>تحويل بنكي · آيبان ينتهي بـ <span dir="ltr">{d.agent.iban_last4}</span></> : 'كاش'}</div>
            </div>
            {!edit && <button onClick={() => setEdit({ method: d.agent.payout_method, iban: '' })} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontFamily: font.family, fontSize: 13, fontWeight: 700, color: colors.text2 }}>تعديل</button>}
          </div>
          {edit && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['cash', 'كاش'], ['transfer', 'تحويل بنكي']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setEdit({ ...edit, method: k })} style={{ padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 800, fontFamily: font.family, cursor: 'pointer', border: `1.5px solid ${edit.method === k ? colors.primary : colors.border}`, background: edit.method === k ? '#f0fdfa' : '#fff', color: edit.method === k ? colors.primary : colors.text2 }}>{l}</button>
                ))}
              </div>
              {edit.method === 'transfer' && <input value={edit.iban} onChange={e => setEdit({ ...edit, iban: e.target.value.toUpperCase() })} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" maxLength={34} style={inp} />}
              {msg && <div style={{ fontSize: 13, color: colors.danger }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={savePayout} style={{ ...btn, flex: 1 }}>حفظ</button>
                <button onClick={() => { setEdit(null); setMsg('') }} style={{ ...btn, flex: 1, background: '#fff', color: colors.text3, border: `1px solid ${colors.border}` }}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
        <a href="/agents" style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>الشروط والأحكام ومبالغ المكافآت</a>
      </div>
    </div>
  )
}
