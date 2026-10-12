'use client'
import { useState } from 'react'

// صفحة انضمام الموردين — عامة (بدون تسجيل دخول). الطلب يروح للإدارة تراجعه وتفعّل المورد
const TYPES = [
  { v: 'مطاعم', icon: '🍔' }, { v: 'كوفي', icon: '☕' }, { v: 'مخابز وحلويات', icon: '🥐' },
  { v: 'بقالة وتموينات', icon: '🛒' }, { v: 'أخرى', icon: '🏢' },
]
const BENEFITS = [
  { icon: '📲', t: 'الطلب يجيك قبل ما يخلص المخزون', d: 'ستورلي يرسل لك طلب العميل على واتساب أول ما يقرب الصنف يخلص عنده.' },
  { icon: '⭐', t: 'تطلع في قائمة الموردين المعتمدين', d: 'أصحاب المطاعم والكوفيهات يشوفونك داخل النظام ويضيفونك بضغطة.' },
  { icon: '🧾', t: 'بوابة تدير منها طلباتك', d: 'ترد بالسعر، تعرض أصنافك، توزع على مناديبك، وتتابع تقاريرك.' },
]
const STEPS = ['تسجّل بياناتك هنا', 'نراجع طلبك ونكلّمك', 'نفعّلك مورد معتمد وتبدأ توصلك الطلبات']

// الألوان: كحلي ستورلي للنص، تيل للأفعال، نعناعي للخلفية، وأخضر فقاعة واتساب للطلب
const C = { teal: '#0f766e', teal2: '#029FA2', ink: '#13294b', muted: '#5b6b82', line: '#dbe7e5', mint: '#e9f6f3', bubble: '#e3f7e9' }
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', border: `1.5px solid ${C.line}`, borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: '#fff', color: C.ink }
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }

export default function SuppliersJoinPage() {
  const [form, setForm] = useState({ company_name: '', contact_name: '', phone: '', email: '', business_type: [] as string[], description: '', offer: '', website: '', marketplace_consent: false })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (v: string) => set('business_type', form.business_type.includes(v) ? form.business_type.filter(x => x !== v) : [...form.business_type, v])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.phone.trim()) return setError('عبّ اسم المنشأة واسم المسؤول ورقم الجوال')
    if (!form.business_type.length) return setError('اختر مجال واحد على الأقل')
    if (!form.marketplace_consent) return setError('لازم توافق على ظهور بياناتك للعملاء')
    setLoading(true); setError('')
    const res = await fetch('/api/supplier-apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const j = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok && j.success) setDone(true)
    else setError(j.error || 'تعذر إرسال الطلب، حاول مرة ثانية')
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: "'IBM Plex Sans Arabic',system-ui,sans-serif", color: C.ink,
      background: '#f6faf9' }}>
      <style>{`*{box-sizing:border-box}.sj-inp:focus{border-color:${C.teal2}!important;box-shadow:0 0 0 3px rgba(2,159,162,.12)}
        .sj-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .sj-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:32px;align-items:center;margin:8px 0 40px}
        .sj-phone{background:#fff;border-radius:26px;border:1px solid ${C.line};box-shadow:0 24px 60px -28px rgba(19,41,75,.35);overflow:hidden}
        .sj-bubble{background:${C.bubble};border-radius:16px 4px 16px 16px;padding:12px 14px;font-size:14.5px;line-height:1.6;max-width:300px;animation:sjIn .7s cubic-bezier(.2,.8,.2,1) .3s both}
        @keyframes sjIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.sj-bubble{animation:none}}
        .sj-steps{list-style:none;padding:0;margin:0 0 26px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;counter-reset:s}
        .sj-steps li{display:flex;gap:10px;align-items:center;font-size:14.5px;font-weight:600;color:#334155;background:${C.mint};border-radius:12px;padding:12px 14px}
        .sj-steps span{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:${C.ink};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
        a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid ${C.teal2};outline-offset:2px}
        @media(max-width:720px){.sj-hero{grid-template-columns:1fr;gap:22px}.sj-hero h1{font-size:28px!important}.sj-steps{grid-template-columns:1fr}}
        @media(max-width:640px){.sj-grid2{grid-template-columns:1fr}.sj-card{padding:22px 18px!important}}`}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <a href="/"><img src="/storely-logo.png" alt="Storely" style={{ width: 46, height: 46 }} /></a>
          <a href="/supplier-portal" style={{ fontSize: 13.5, fontWeight: 700, color: C.teal, textDecoration: 'none', border: `1.5px solid ${C.line}`, background: '#fff', borderRadius: 10, padding: '8px 14px' }}>عندي حساب مورد — دخول</a>
        </div>

        {done ? (
          <div className="sj-card" style={{ background: '#fff', borderRadius: 20, padding: '44px 32px', textAlign: 'center', border: `1px solid ${C.line}`, boxShadow: '0 12px 40px rgba(2,159,162,.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>وصلنا طلبك</h1>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 22 }}>بنراجعه ونتواصل معك على واتساب خلال يوم إلى يومين.</p>
            <a href="https://wa.me/966594351667" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 8, padding: '12px 22px', background: C.teal2, color: '#fff', borderRadius: 12, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>📲 تواصل معنا الحين</a>
          </div>
        ) : <>
          <section className="sj-hero">
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.35, marginBottom: 12, letterSpacing: '-.01em' }}>خلّ عملاءك يطلبون منك بدون ما يتصلون</h1>
              <p style={{ fontSize: 16.5, color: C.muted, lineHeight: 1.85, maxWidth: 420 }}>المطاعم والكوفيهات اللي تستخدم ستورلي توصلك طلباتها على واتساب أول ما يقرب مخزونها يخلص.</p>
              <a href="#join" style={{ display: 'inline-block', marginTop: 20, padding: '13px 22px', background: C.teal, color: '#fff', borderRadius: 12, fontSize: 15.5, fontWeight: 700, textDecoration: 'none' }}>سجّل كمورد</a>
            </div>
            {/* الطلب نفسه كما يوصل المورد — هذا قلب الفكرة */}
            <div className="sj-phone" aria-label="مثال لطلب يوصل المورد على واتساب">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.line}` }}>
                <img src="/storely-logo.png" alt="" style={{ width: 34, height: 34, borderRadius: 9, boxShadow: `0 0 0 1px ${C.line}` }} />
                <div><b style={{ fontSize: 14.5 }}>ستورلي</b><div style={{ fontSize: 12, color: C.muted }}>طلبات تلقائية</div></div>
              </div>
              <div style={{ padding: 14, background: '#f4f8f7' }}>
                <div className="sj-bubble">
                  <b>طلب جديد من كوفي يوكا</b>
                  <div style={{ margin: '8px 0', display: 'grid', gap: 3 }}>
                    <span>☕ بن مختص — ٥ كيلو</span><span>🥛 حليب طازج — ٢٠ لتر</span><span>🥤 أكواب ١٢ أونص — ٢ كرتون</span>
                  </div>
                  <span style={{ color: C.muted, fontSize: 12.5 }}>المخزون عندهم قارب يخلص</span>
                  <div style={{ textAlign: 'left', fontSize: 11, color: '#7a8a9e', marginTop: 4 }} dir="ltr">9:41 ✓✓</div>
                </div>
              </div>
            </div>
          </section>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px', display: 'grid', gap: 18 }}>
            {BENEFITS.map(b => (
              <li key={b.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span aria-hidden style={{ fontSize: 24, lineHeight: 1.2 }}>{b.icon}</span>
                <div><div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{b.t}</div><div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.75 }}>{b.d}</div></div>
              </li>
            ))}
          </ul>

          <ol className="sj-steps">
            {STEPS.map((s, i) => (
              <li key={s}><span>{i + 1}</span>{s}</li>
            ))}
          </ol>

          <form id="join" onSubmit={submit} className="sj-card" style={{ background: '#fff', borderRadius: 20, padding: 30, border: `1px solid ${C.line}`, display: 'grid', gap: 14 }}>
            <h2 style={{ fontSize: 21, fontWeight: 700 }}>سجّل كمورد</h2>
            {error && <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', color: '#dc2626', fontSize: 13.5, fontWeight: 600 }}>{error}</div>}
            <div className="sj-grid2">
              <div><label style={lbl}>اسم الشركة / المؤسسة *</label><input className="sj-inp" style={inp} value={form.company_name} maxLength={150} onChange={e => set('company_name', e.target.value)} placeholder="مثال: محمصة الريف" /></div>
              <div><label style={lbl}>اسم المسؤول *</label><input className="sj-inp" style={inp} value={form.contact_name} maxLength={100} onChange={e => set('contact_name', e.target.value)} placeholder="الاسم" /></div>
            </div>
            <div className="sj-grid2">
              <div><label style={lbl}>جوال واتساب * <span style={{ fontWeight: 500, color: C.muted }}>(الطلبات توصلك عليه)</span></label><input className="sj-inp" style={inp} type="tel" inputMode="tel" dir="ltr" value={form.phone} maxLength={20} onChange={e => set('phone', e.target.value)} placeholder="05xxxxxxxx" /></div>
              <div><label style={lbl}>الإيميل</label><input className="sj-inp" style={inp} type="email" dir="ltr" value={form.email} maxLength={150} onChange={e => set('email', e.target.value)} placeholder="name@company.com" /></div>
            </div>
            <div>
              <label style={lbl}>مين تخدم؟ * <span style={{ fontWeight: 500, color: C.muted }}>(اختر واحد أو أكثر)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TYPES.map(b => { const on = form.business_type.includes(b.v); return (
                  <button key={b.v} type="button" onClick={() => toggle(b.v)} aria-pressed={on}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 99, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${on ? C.teal2 : C.line}`, background: on ? C.mint : '#fff', color: on ? C.teal : '#334155' }}>{b.icon} {b.v}</button>) })}
              </div>
            </div>
            <div><label style={lbl}>وش تورّد؟</label><textarea className="sj-inp" style={{ ...inp, minHeight: 84, resize: 'vertical' }} value={form.description} maxLength={1500} onChange={e => set('description', e.target.value)} placeholder="مثال: بن مختص، حليب وألبان، أكواب وتغليف…" /></div>
            <div className="sj-grid2">
              <div><label style={lbl}>عرض خاص لعملاء ستورلي <span style={{ fontWeight: 500, color: C.muted }}>(اختياري)</span></label><input className="sj-inp" style={inp} value={form.offer} maxLength={500} onChange={e => set('offer', e.target.value)} placeholder="مثال: توصيل مجاني فوق 500 ريال" /></div>
              <div><label style={lbl}>الموقع الإلكتروني <span style={{ fontWeight: 500, color: C.muted }}>(اختياري)</span></label><input className="sj-inp" style={inp} dir="ltr" value={form.website} maxLength={200} onChange={e => set('website', e.target.value)} placeholder="https://" /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: `1px solid ${C.line}` }}>
              <input type="checkbox" checked={form.marketplace_consent} onChange={e => set('marketplace_consent', e.target.checked)} style={{ marginTop: 3, accentColor: C.teal2, width: 17, height: 17, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>أوافق إن اسم منشأتي ورقم التواصل يظهرون لعملاء ستورلي في قائمة الموردين المعتمدين لو انقبل طلبي — حسب <a href="/privacy" target="_blank" style={{ color: C.teal, textDecoration: 'underline' }}>سياسة الخصوصية</a></span>
            </label>
            <button type="submit" disabled={loading} style={{ padding: 15, border: 'none', borderRadius: 12, fontFamily: 'inherit', fontSize: 16, fontWeight: 800, color: '#fff', cursor: loading ? 'wait' : 'pointer',
              background: loading ? '#94a3b8' : C.teal }}>{loading ? 'جاري الإرسال…' : 'أرسل طلب الانضمام'}</button>
          </form>
        </>}

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 12.5, color: '#94a3b8' }}>Storely — نظام واحد يربط كل أعمال منشأتك</div>
      </div>
    </div>
  )
}
