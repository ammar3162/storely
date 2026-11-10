'use client'
import { useState } from 'react'
import { RefreshCcw, CheckCircle2, ArrowLeft } from 'lucide-react'

// زر «تجديد الاشتراك» (بدون بوابة دفع حالياً): الحساب يشتغل فوراً وفريق Storely يتواصل للدفع
// لما تنضاف بوابة الدفع: نفس الزر يوجّه للبوابة بدل هذي الرسالة
export default function RenewSubscription({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'already'>('idle')
  const [err, setErr] = useState('')
  async function renew() {
    setState('busy'); setErr('')
    const j = await fetch('/api/subscription/renew', { method: 'POST' }).then(r => r.json()).catch(() => ({ error: 'تأكد من اتصالك بالإنترنت' }))
    if (!j.success) { setErr(j.error || 'تعذر التجديد، حاول مرة أخرى'); setState('idle'); return }
    setState(j.created ? 'done' : 'already')
  }
  const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 48, padding: '12px 16px', background: 'var(--storely-navy)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }

  if (state === 'done' || state === 'already') return (
    <div role="status" style={{ textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ECFDF3', color: '#067647', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><CheckCircle2 size={26} /></div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--storely-navy)', marginBottom: 6 }}>{state === 'done' ? 'تم تجديد اشتراكك' : 'طلب التجديد قيد المتابعة'}</div>
      <p style={{ fontSize: 14, color: 'var(--storely-text)', lineHeight: 1.8, margin: '0 0 18px' }}>
        {state === 'done' ? 'حسابك يعمل الآن بشكل طبيعي. سيتواصل معك فريق Storely قريباً لإتمام الدفع.' : 'استلمنا طلبك مسبقاً، وسيتواصل معك فريق Storely قريباً لإتمام الدفع.'}
      </p>
      <a href="/dashboard" onClick={onDone} style={btn}>الدخول إلى حسابك <ArrowLeft size={17} /></a>
    </div>
  )
  return (
    <div>
      <button onClick={renew} disabled={state === 'busy'} style={{ ...btn, opacity: state === 'busy' ? .7 : 1 }}>
        <RefreshCcw size={17} />{state === 'busy' ? 'جاري التجديد...' : 'تجديد الاشتراك'}
      </button>
      {err && <div role="alert" style={{ marginTop: 10, fontSize: 13, color: '#B42318' }}>{err}</div>}
    </div>
  )
}
