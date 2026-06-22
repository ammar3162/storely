'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffLoginPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('staff_session')
    if (saved) router.push('/staff/dispense')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'حدث خطأ'); setLoading(false); return }
      localStorage.setItem('staff_session', JSON.stringify(data.staff))
      router.push('/staff/dispense')
    } catch {
      setError('حدث خطأ، تأكد من الاتصال بالإنترنت')
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0',
    borderRadius: 12, fontSize: 16, outline: 'none', boxSizing: 'border-box',
    background: 'white', color: '#1e293b', fontFamily: 'system-ui', fontWeight: 600,
    textAlign: 'center',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/storely-logo.png" alt="Storely" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 8px', display: 'block', objectFit: 'cover' }}/>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>دخول الموظف</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>أدخل رقم جوالك ورمز PIN الخاص بك</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={inp}
              placeholder="رقم الجوال"
              type="tel"
              inputMode="numeric"
              required
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ ...inp, letterSpacing: 8, fontSize: 22, fontWeight: 800 }}
              placeholder="••••"
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 14, background: loading ? '#94a3b8' : '#16a34a',
              color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(22,163,74,.25)',
            }}
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
