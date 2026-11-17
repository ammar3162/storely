'use client'
import { useState } from 'react'
import { Wallet, Link2, BellRing, Banknote, Copy, Check, MessageCircle, ChevronDown, Loader2 } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { AGENT_REWARD_TIERS } from '@/lib/agentRewards'
import { AGENT_TERMS } from '@/lib/agentTerms'

// صفحة برنامج السفراء: شرح + تسجيل + الرابط الخاص مباشرة بعد التسجيل
const inp: React.CSSProperties = { width: '100%', minHeight: 44, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--storely-control-border)', fontSize:17, fontFamily: font.family, boxSizing: 'border-box', background:'#fff' }
const lbl: React.CSSProperties = { display: 'block', fontSize:15, fontWeight:600, color: colors.text2, marginBottom: 6 }
const btn: React.CSSProperties = { width: '100%', minHeight: 50, padding: 13, borderRadius: 999, border: 'none', background: colors.primary, color:'#fff', fontSize: 17, fontWeight: 500, cursor: 'pointer', fontFamily: font.family }

export default function AgentsPage() {
  const [f, setF] = useState({ name: '', phone: '', email: '', payout_method: '' as '' | 'cash' | 'transfer', iban: '' })
  const [agree, setAgree] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ code: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!f.name.trim() || !f.phone.trim() || !f.email.trim()) return setErr('أدخل الاسم ورقم الجوال والبريد الإلكتروني')
    if (!f.payout_method) return setErr('اختر طريقة استلام المكافأة')
    if (f.payout_method === 'transfer' && !f.iban.trim()) return setErr('أدخل رقم الآيبان')
    if (!agree) return setErr('يجب الموافقة على الشروط والأحكام')
    setBusy(true)
    const j = await fetch('/api/agents/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, accept_terms: true }) })
      .then(r => r.json()).catch(() => ({ error: 'تحقق من اتصالك بالإنترنت' }))
    setBusy(false)
    if (!j.success) return setErr(j.error || 'تعذر التسجيل')
    setDone({ code: j.code, link: j.link })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const share = done ? `مرحباً،\nهل تعرف Storely؟ نظام واحد يربط كل أعمال منشأتك: المخزون والكاشير والمشتريات والموظفين والمحاسب.\nجرّبه مجاناً من هنا: ${done.link}` : ''

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background:'var(--storely-background)' }}>
      <div style={{ background:'#203640', color:'#fff', padding: '28px 16px 90px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 34 }}>
            <img src="/storely-logo.png" alt="Storely" width={40} height={40} style={{ borderRadius:12, background:'#fff' }} />
            <div><div style={{ fontSize:20, fontWeight:600 }} dir="ltr">Storely</div><div style={{ fontSize:13, opacity: .7 }}>برنامج السفراء</div></div>
            <a href="/agents/wallet" style={{ marginInlineStart: 'auto', color:'#fff', fontSize:15, fontWeight:500, textDecoration: 'none', border: 'none', background: 'rgba(255,255,255,.14)', borderRadius:999, padding: '8px 16px' }}>محفظتي</a>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', lineHeight: 1.4, fontWeight:600, margin: '0 0 12px' }}>عرّف المنشآت على Storely<br /><span style={{ color:'var(--storely-border)' }}>واكسب مكافأة عن كل اشتراك</span></h1>
          <p style={{ fontSize:17, opacity: .85, lineHeight: 1.8, margin: 0, maxWidth: 560 }}>سجّل مجاناً واحصل على رابطك الخاص. عن كل منشأة تشترك عن طريقك تُضاف مكافأتك إلى محفظتك ويصلك إشعار.</p>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '-64px auto 0', padding: '0 16px 40px', display: 'grid', gap: 18 }} className="ag-grid">
        <style>{`.ag-grid{grid-template-columns:1fr}@media(min-width:900px){.ag-grid{grid-template-columns:1fr 420px;align-items:start}}`}</style>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background:'#fff', border: 'none', borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize:17, fontWeight:600, marginBottom: 4 }}>مكافأتك عن كل منشأة تشترك</div>
            <div style={{ fontSize:15, color: colors.text3, marginBottom: 14 }}>بحسب قيمة اشتراكها الشهري، والعميل هو من يختار الخدمات التي يحتاجها</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {[...AGENT_REWARD_TIERS].reverse().map(({ label: l, amount: v }) => (
                <div key={l} style={{ background:'var(--storely-background)', border: 'none', borderRadius:16, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize:13, color: colors.text3, lineHeight: 1.5, minHeight: 36 }}>اشتراك {l}</div>
                  <div style={{ fontSize: 24, fontWeight:600, color: colors.primary, margin: '4px 0' }}>{v}</div>
                  <div style={{ fontSize:13, color: colors.text3 }}>ريال</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:15, color: colors.text3, marginTop: 10 }}>وللاشتراك السنوي <b style={{ color: colors.text }}>ضعف المبلغ</b>، دون حدٍّ لعدد المنشآت.</div>
          </div>
          <div style={{ background:'#fff', border: 'none', borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize:17, fontWeight:600, marginBottom: 14 }}>كيف يعمل البرنامج</div>
            {[[Link2, 'سجّل واحصل على رابطك', 'رابط ورمز خاصان بك، تمشاركةما مع المطاعم والمقاهي والمتاجر.'],
              [BellRing, 'تسجّل المنشأة وتشترك', 'عبر رابطك أو بإدخال رمزك عند التسجيل، ويصلك إشعار بذلك.'],
              [Wallet, 'مكافأتك في محفظتك', 'فور سداد المنشأة تُضاف المكافأة إلى محفظتك.'],
              [Banknote, 'تستلمها نقداً أو بتحويل بنكي', 'بالطريقة التي تختارها، ويصلك إشعار عند كل صرف.']].map(([Icon, t, d]: any, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <span style={{ width: 38, height: 38, borderRadius:20, background:'var(--storely-background)', color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} /></span>
                <div><div style={{ fontSize:17, fontWeight:600 }}>{t}</div><div style={{ fontSize:15, color: colors.text3, lineHeight: 1.7 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'#fff', border: 'none', borderRadius: 20, padding: 22, boxShadow: '0 12px 40px rgba(0,0,0,.06)' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 99, background:'#ecfdf5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Check size={28} color="#047857" /></div>
              <div style={{ fontSize: 20, fontWeight:600 }}>أهلاً بك في البرنامج</div>
              <div style={{ fontSize:15, color: colors.text3, margin: '6px 0 16px', lineHeight: 1.7 }}>هذا رابطك ورمزك، وأرسلناهما إليك أيضاً عبر الواتساب والبريد الإلكتروني.</div>
              <div style={{ background:'var(--storely-background)', border: `1px dashed ${colors.primary}`, borderRadius:20, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize:13, color: colors.text3 }}>رمزك</div>
                <div style={{ fontSize: 28, fontWeight:600, letterSpacing: 4, color: colors.primary }} dir="ltr">{done.code}</div>
                <div style={{ fontSize:15, color: colors.text2, marginTop: 6, wordBreak: 'break-all' }} dir="ltr">{done.link}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => { navigator.clipboard?.writeText(done.link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ ...btn, background:'#fff', color: colors.primary, border: `1.5px solid ${colors.primary}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'تم النسخ' : 'نسخ الرابط'}</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background:'#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}><MessageCircle size={16} /> مشاركة</a>
              </div>
              <a href="/agents/wallet" style={{ display: 'block', marginTop: 12, fontSize:17, fontWeight:600, color: colors.primary }}>الدخول إلى محفظتك</a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div style={{ fontSize:22, fontWeight:600, marginBottom: 4 }}>سجّل سفيراً</div>
              <div style={{ fontSize:15, color: colors.text3, marginBottom: 16 }}>مجاناً، وتحصل على رابطك فوراً.</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div><label style={lbl}>الاسم</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={80} autoComplete="name" style={inp} /></div>
                <div><label style={lbl}>رقم الجوال</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" autoComplete="tel" style={inp} /></div>
                <div><label style={lbl}>البريد الإلكتروني</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} type="email" dir="ltr" placeholder="name@email.com" autoComplete="email" style={inp} /></div>
                <div>
                  <label style={lbl}>كيف تريد استلام مكافأتك؟</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([['cash', 'نقداً'], ['transfer', 'تحويل بنكي']] as const).map(([k, l]) => (
                      <button type="button" key={k} onClick={() => setF({ ...f, payout_method: k })} aria-pressed={f.payout_method === k}
                        style={{ padding: 12, borderRadius:20, fontSize:17, fontWeight:600, fontFamily: font.family, cursor: 'pointer', border: `1.5px solid ${f.payout_method === k ? colors.primary : colors.border}`, background: f.payout_method === k ? 'var(--storely-fill)' : '#fff', color: f.payout_method === k ? colors.primary : colors.text2 }}>{l}</button>
                    ))}
                  </div>
                </div>
                {f.payout_method === 'transfer' && (
                  <div><label style={lbl}>رقم الآيبان</label><input value={f.iban} onChange={e => setF({ ...f, iban: e.target.value.toUpperCase() })} inputMode="text" dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" maxLength={34} autoComplete="off" style={inp} />
                    <div style={{ fontSize:13, color: colors.text4, marginTop: 4 }}>باسمك، من 24 خانة تبدأ بـ SA، ويُحفظ مشفّراً.</div></div>
                )}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius:20 }}>
                  <button type="button" onClick={() => setShowTerms(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, fontSize:15, fontWeight:600, color: colors.text2 }}>
                    الشروط والأحكام <ChevronDown size={16} style={{ transform: showTerms ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {showTerms && (
                    <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 12px 12px', fontSize:13, color: colors.text2, lineHeight: 1.8 }}>
                      {AGENT_TERMS.map(s => <div key={s.t} style={{ marginTop: 8 }}><b>{s.t}</b>{s.p.map((x, i) => <p key={i} style={{ margin: '2px 0' }}>{x}</p>)}</div>)}
                    </div>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize:15, color: colors.text2, cursor: 'pointer', lineHeight: 1.6 }}>
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16 }} /> قرأت الشروط والأحكام وأوافق عليها
                </label>
                {err && <div style={{ fontSize:15, color: colors.danger, background:'#fef2f2', borderRadius:12, padding: '9px 12px' }}>{err}{err.includes('محفظتك') && <> — <a href="/agents/wallet" style={{ color: colors.danger, fontWeight:600 }}>سجّل الدخول من هنا</a></>}</div>}
                <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? .7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{busy && <Loader2 size={16} className="spin" />}{busy ? 'جارٍ التسجيل…' : 'سجّلني واحصل على رابطي'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{'.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
