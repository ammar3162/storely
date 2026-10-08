'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Clock, ShieldCheck, Eye } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { OrgLogo } from '@/components/accountant/PortalShell'

// صفحة قبول دعوة المحاسب (من زر «قبول الدعوة» في الإيميل)
type State = 'loading' | 'pending' | 'accepted' | 'expired' | 'invalid' | 'gone' | 'declined' | 'error'
const btn: React.CSSProperties = { width: '100%', padding: 13, borderRadius: 12, border: 'none', background: colors.primary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }

export default function AcceptInvitePage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [state, setState] = useState<State>('loading')
  const [inv, setInv] = useState<any>(null)
  const [busy, setBusy] = useState<'' | 'accept' | 'decline'>('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || ''
    setToken(t)
    if (!t) { setState('invalid'); return }
    fetch(`/api/accountant-portal/invite?t=${encodeURIComponent(t)}`).then(r => r.json())
      .then(j => { if (!j.success) { setState('error'); return } setInv(j.invite || null); setState(j.state) })
      .catch(() => setState('error'))
  }, [])

  async function act(action: 'accept' | 'decline') {
    setBusy(action); setErr('')
    const j = await fetch('/api/accountant-portal/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, action }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy('')
    if (!j.success) { setErr(j.error || 'حدث خطأ، حاول مرة ثانية'); return }
    if (action === 'decline') { setState('declined'); return }
    router.replace(`/accountant-portal/${j.org_id}`)
  }

  const msg: Partial<Record<State, { icon: any; tone: string; title: string; text: string }>> = {
    accepted: { icon: CheckCircle2, tone: '#047857', title: 'قبلت الدعوة من قبل', text: 'ادخل صفحتك برمز يوصلك على إيميلك.' },
    expired: { icon: Clock, tone: '#b45309', title: 'رابط الدعوة انتهى', text: 'اطلب من المنشأة تضغط «إعادة إرسال الدعوة» من إعداداتها.' },
    invalid: { icon: XCircle, tone: '#b91c1c', title: 'الرابط غير صحيح', text: 'افتح الرابط من إيميل الدعوة نفسه بدون تعديل.' },
    gone: { icon: XCircle, tone: '#b91c1c', title: 'الدعوة ما عادت موجودة', text: 'يمكن المنشأة سحبتها. تواصل معهم إذا تتوقع غير كذا.' },
    declined: { icon: CheckCircle2, tone: colors.text3, title: 'رفضت الدعوة', text: 'وصلنا للمنشأة إنك رفضت، وما راح تشوف شي من بياناتها.' },
    error: { icon: XCircle, tone: '#b91c1c', title: 'تعذر التحميل', text: 'تأكد من الإنترنت وحدّث الصفحة.' },
  }
  const m = msg[state]

  return (
    <div dir="rtl" style={{ minHeight: '100vh', fontFamily: font.family, background: 'linear-gradient(180deg,#0d4543 0,#0b3b3a 260px,#f3f6f6 260px)', padding: '36px 16px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', marginBottom: 22 }}>
          <img src="/storely-logo.png" alt="Storely" width={38} height={38} style={{ borderRadius: 10, background: '#fff' }} />
          <div><div style={{ fontSize: 17, fontWeight: 800 }} dir="ltr">Storely</div><div style={{ fontSize: 12, opacity: .7 }}>بوابة المحاسب</div></div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 26, boxShadow: '0 20px 50px rgba(15,23,42,.10)' }}>
          {state === 'loading' ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={26} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>
          : state === 'pending' && inv ? (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <OrgLogo name={inv.org} url={inv.logo_url} size={52} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: colors.text3 }}>دعوة من</div>
                <div style={{ fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.org}</div>
                {inv.branch && <div style={{ fontSize: 12, color: colors.text4 }}>فرع {inv.branch}</div>}
              </div>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.8, color: colors.text2, marginBottom: 14 }}>
              {inv.name ? `هلا ${inv.name}، ` : ''}المنشأة تبيك تكون محاسبها في Storely. بعد القبول تشوف بياناتها وتحمّلها إكسل لأي فترة.
            </div>
            <div style={{ background: '#f8fafa', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: colors.text2, marginBottom: 8 }}><Eye size={14} /> اللي بتشوفه</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {inv.sections.map((s: string) => <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: colors.primaryLight, color: colors.primary }}>{s}</span>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: colors.text4, marginTop: 10 }}><ShieldCheck size={13} /> قراءة بس — ما تقدر تعدّل شي، والمنشأة تسحب الإذن متى ما بغت</div>
            </div>
            <button onClick={() => act('accept')} disabled={!!busy} style={{ ...btn, opacity: busy ? .7 : 1 }}>{busy === 'accept' ? 'جاري القبول...' : 'قبول الدعوة والدخول'}</button>
            <button onClick={() => act('decline')} disabled={!!busy} style={{ ...btn, background: 'transparent', color: colors.text3, fontSize: 13.5, marginTop: 6 }}>{busy === 'decline' ? 'جاري الرفض...' : 'رفض الدعوة'}</button>
            {err && <div style={{ marginTop: 10, fontSize: 13, color: colors.danger, lineHeight: 1.7, textAlign: 'center' as const }}>{err}</div>}
            <div style={{ fontSize: 11.5, color: colors.text4, textAlign: 'center' as const, marginTop: 10 }} dir="ltr">{inv.email}</div>
          </>) : m && (
            <div style={{ textAlign: 'center' as const, padding: '10px 0' }}>
              <m.icon size={40} color={m.tone} />
              <div style={{ fontSize: 19, fontWeight: 800, margin: '10px 0 6px' }}>{m.title}</div>
              <div style={{ fontSize: 14, color: colors.text3, lineHeight: 1.8, marginBottom: 18 }}>{m.text}</div>
              {state !== 'declined' && <a href="/accountant-portal" style={{ ...btn, display: 'block', textDecoration: 'none', boxSizing: 'border-box' as const }}>ادخل بوابة المحاسب</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
