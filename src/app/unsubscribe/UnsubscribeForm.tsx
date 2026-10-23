'use client'
import { useState } from 'react'

export default function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function confirm() {
    setState('busy')
    const res = await fetch('/api/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ e: email, t: token }) })
    const j = await res.json().catch(() => ({}))
    if (j.success) setState('done')
    else { setState('error'); setMsg(j.error || 'حدث خطأ') }
  }

  if (!email || !token) return <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>الرابط غير مكتمل.</p>
  if (state === 'done') return (
    <>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>تم إلغاء اشتراكك</div>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, margin: 0 }}>ما راح توصلك إعلانات Storely على <span dir="ltr" style={{ display: 'inline-block', fontWeight: 700, color: '#0f172a' }}>{email}</span>. الإيميلات المهمة مثل الفواتير واستعادة كلمة المرور توصلك عادي.</p>
    </>
  )
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>إلغاء الاشتراك بالإعلانات</div>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, margin: '0 0 20px' }}>توقف إعلانات Storely عن <span dir="ltr" style={{ display: 'inline-block', fontWeight: 700, color: '#0f172a' }}>{email}</span>؟ الفواتير وإيميلات الحساب المهمة توصلك عادي.</p>
      <button onClick={confirm} disabled={state === 'busy'} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#029FA2', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        {state === 'busy' ? 'جاري الإلغاء...' : 'أوقف الإعلانات'}
      </button>
      {state === 'error' && <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 12 }}>{msg}</p>}
    </>
  )
}
