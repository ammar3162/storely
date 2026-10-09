'use client'
import { useState } from 'react'
import { Wallet, Link2, BellRing, Banknote, Copy, Check, MessageCircle, ChevronDown, Loader2 } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { AGENT_REWARD } from '@/lib/agentRewards'
import { AGENT_TERMS } from '@/lib/agentTerms'

// صفحة برنامج المناديب: شرح + تسجيل + الرابط الخاص مباشرة بعد التسجيل
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontSize: 15, fontFamily: font.family, boxSizing: 'border-box', background: '#fff' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: colors.text2, marginBottom: 6 }
const btn: React.CSSProperties = { width: '100%', padding: 14, borderRadius: 12, border: 'none', background: colors.primary, color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }

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
    if (!f.name.trim() || !f.phone.trim() || !f.email.trim()) return setErr('عبّ الاسم والجوال والإيميل')
    if (!f.payout_method) return setErr('اختر طريقة استلام المكافأة')
    if (f.payout_method === 'transfer' && !f.iban.trim()) return setErr('اكتب رقم الآيبان')
    if (!agree) return setErr('لازم توافق على الشروط والأحكام')
    setBusy(true)
    const j = await fetch('/api/agents/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, accept_terms: true }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy(false)
    if (!j.success) return setErr(j.error || 'تعذر التسجيل')
    setDone({ code: j.code, link: j.link })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const share = done ? `هلا 👋\nتعرف Storely؟ نظام واحد يربط كل أعمال منشأتك: المخزون، الكاشير، المشتريات، الموظفين، والمحاسب.\nجرّبه مجاناً من هنا: ${done.link}` : ''

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background: '#f3f6f6' }}>
      <div style={{ background: 'linear-gradient(160deg,#0d4543 0%,#0b3b3a 55%,#08292a 100%)', color: '#fff', padding: '28px 16px 90px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 34 }}>
            <img src="/storely-logo.png" alt="Storely" width={40} height={40} style={{ borderRadius: 10, background: '#fff' }} />
            <div><div style={{ fontSize: 18, fontWeight: 800 }} dir="ltr">Storely</div><div style={{ fontSize: 12, opacity: .7 }}>برنامج المناديب</div></div>
            <a href="/agents/wallet" style={{ marginInlineStart: 'auto', color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '8px 14px' }}>محفظتي</a>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', lineHeight: 1.4, fontWeight: 800, margin: '0 0 12px' }}>عرّف المحلات على Storely<br /><span style={{ color: '#5eead4' }}>واكسب على كل اشتراك</span></h1>
          <p style={{ fontSize: 16, opacity: .85, lineHeight: 1.8, margin: 0, maxWidth: 560 }}>سجّل مجاناً، خذ رابطك الخاص، وكل منشأة تشترك عن طريقك تنضاف مكافأتك في محفظتك ويوصلك إشعار.</p>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '-64px auto 0', padding: '0 16px 40px', display: 'grid', gap: 18 }} className="ag-grid">
        <style>{`.ag-grid{grid-template-columns:1fr}@media(min-width:900px){.ag-grid{grid-template-columns:1fr 420px;align-items:start}}`}</style>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>مكافأتك على كل منشأة تشترك</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
              {([['الأساسية', AGENT_REWARD.basic], ['المتوسطة', AGENT_REWARD.pro], ['المتقدمة', AGENT_REWARD.advanced]] as const).map(([l, v]) => (
                <div key={l} style={{ background: '#f0fdfa', border: `1px solid ${colors.primaryBorder}`, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12.5, color: colors.text3 }}>{l}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: colors.primary, margin: '4px 0' }}>{v}</div>
                  <div style={{ fontSize: 11.5, color: colors.text3 }}>ريال</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: colors.text3, marginTop: 10 }}>والاشتراك السنوي <b style={{ color: colors.text }}>ضعف المبلغ</b>. بدون حد لعدد المنشآت.</div>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>كيف يمشي</div>
            {[[Link2, 'سجّل وخذ رابطك', 'رابط وكود خاص فيك تنشره للمطاعم والكافيهات والمحلات.'],
              [BellRing, 'المنشأة تسجّل وتشترك', 'من رابطك أو بكتابة كودك عند التسجيل — ويوصلك إشعار.'],
              [Wallet, 'مكافأتك في محفظتك', 'أول ما تدفع المنشأة تنضاف المكافأة وتشوفها في محفظتك.'],
              [Banknote, 'تستلم كاش أو تحويل', 'على الطريقة اللي تختارها، ويوصلك إشعار عند كل صرف.']].map(([Icon, t, d]: any, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: '#f0fdfa', color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} /></span>
                <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</div><div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.7 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 22, boxShadow: '0 20px 50px rgba(15,23,42,.08)' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 99, background: '#ecfdf5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Check size={28} color="#047857" /></div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>أهلاً فيك معنا 🎉</div>
              <div style={{ fontSize: 13.5, color: colors.text3, margin: '6px 0 16px', lineHeight: 1.7 }}>هذا رابطك وكودك — أرسلناهم لك على الواتساب والإيميل بعد.</div>
              <div style={{ background: '#f8fafa', border: `1px dashed ${colors.primary}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: colors.text3 }}>كودك</div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, color: colors.primary }} dir="ltr">{done.code}</div>
                <div style={{ fontSize: 13, color: colors.text2, marginTop: 6, wordBreak: 'break-all' }} dir="ltr">{done.link}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => { navigator.clipboard?.writeText(done.link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ ...btn, background: '#fff', color: colors.primary, border: `1.5px solid ${colors.primary}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'انتسخ' : 'نسخ الرابط'}</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}><MessageCircle size={16} /> شاركه</a>
              </div>
              <a href="/agents/wallet" style={{ display: 'block', marginTop: 12, fontSize: 14, fontWeight: 700, color: colors.primary }}>ادخل محفظتك</a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>سجّل كمندوب</div>
              <div style={{ fontSize: 13, color: colors.text3, marginBottom: 16 }}>مجاناً — وتاخذ رابطك على طول.</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div><label style={lbl}>الاسم</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={80} autoComplete="name" style={inp} /></div>
                <div><label style={lbl}>رقم الجوال</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" autoComplete="tel" style={inp} /></div>
                <div><label style={lbl}>الإيميل</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} type="email" dir="ltr" placeholder="name@email.com" autoComplete="email" style={inp} /></div>
                <div>
                  <label style={lbl}>كيف تستلم مكافأتك؟</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([['cash', 'كاش'], ['transfer', 'تحويل بنكي']] as const).map(([k, l]) => (
                      <button type="button" key={k} onClick={() => setF({ ...f, payout_method: k })} aria-pressed={f.payout_method === k}
                        style={{ padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 800, fontFamily: font.family, cursor: 'pointer', border: `1.5px solid ${f.payout_method === k ? colors.primary : colors.border}`, background: f.payout_method === k ? '#f0fdfa' : '#fff', color: f.payout_method === k ? colors.primary : colors.text2 }}>{l}</button>
                    ))}
                  </div>
                </div>
                {f.payout_method === 'transfer' && (
                  <div><label style={lbl}>رقم الآيبان</label><input value={f.iban} onChange={e => setF({ ...f, iban: e.target.value.toUpperCase() })} inputMode="text" dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" maxLength={34} autoComplete="off" style={inp} />
                    <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 4 }}>باسمك — ٢٤ خانة يبدأ بـ SA. محفوظ مشفّر.</div></div>
                )}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                  <button type="button" onClick={() => setShowTerms(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, fontSize: 13.5, fontWeight: 700, color: colors.text2 }}>
                    الشروط والأحكام <ChevronDown size={16} style={{ transform: showTerms ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {showTerms && (
                    <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 12px 12px', fontSize: 12.5, color: colors.text2, lineHeight: 1.8 }}>
                      {AGENT_TERMS.map(s => <div key={s.t} style={{ marginTop: 8 }}><b>{s.t}</b>{s.p.map((x, i) => <p key={i} style={{ margin: '2px 0' }}>{x}</p>)}</div>)}
                    </div>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: colors.text2, cursor: 'pointer', lineHeight: 1.6 }}>
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 4, width: 16, height: 16 }} /> قرأت الشروط والأحكام وأوافق عليها
                </label>
                {err && <div style={{ fontSize: 13, color: colors.danger, background: '#fef2f2', borderRadius: 10, padding: '9px 12px' }}>{err}{err.includes('محفظتك') && <> — <a href="/agents/wallet" style={{ color: colors.danger, fontWeight: 800 }}>ادخل هنا</a></>}</div>}
                <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? .7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{busy && <Loader2 size={16} className="spin" />}{busy ? 'جاري التسجيل...' : 'سجّلني وخذ رابطي'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{'.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
