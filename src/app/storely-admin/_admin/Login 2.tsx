'use client'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { A, Btn, Field, inputStyle, type AdminInfo } from './kit'

export default function AdminLogin({ onLogin }: { onLogin: (admin: AdminInfo) => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [code, setCode] = useState('')
  const [pendingToken, setPendingToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function finalize(data: any) {
    document.cookie = `storely_admin_token=${data.token};path=/;max-age=86400;SameSite=Strict;Secure`
    document.cookie = `storely_admin_auth=true;path=/;max-age=86400;SameSite=Strict;Secure`
    sessionStorage.setItem('storely_admin_pass', data.token)
    sessionStorage.setItem('storely_admin_session_token', data.token)
    sessionStorage.setItem('storely_admin_info', JSON.stringify(data.admin))
    onLogin(data.admin)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok && data.success && data.needs2FA) { setPendingToken(data.pendingToken); return }
    if (res.ok && data.success) finalize(data)
    else setError('بيانات الدخول غير صحيحة')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/admin/2fa-login-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pendingToken, code }) })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok && data.success) finalize(data)
    else setError('الرمز غير صحيح')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: A.bg, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: '0 12px 32px rgba(16,24,40,.06)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: A.primarySoft, color: A.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <ShieldCheck size={24} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: A.text }}>لوحة إدارة Storely</h1>
        <p style={{ fontSize: 13, color: A.text2, marginTop: 4, marginBottom: 24 }}>
          {pendingToken ? 'أدخل الرمز من تطبيق المصادقة (6 أرقام)' : 'سجّل دخولك بحساب المشرف'}
        </p>

        {pendingToken ? (
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} dir="ltr" autoFocus required placeholder="000000"
              style={{ ...inputStyle, fontSize: 22, letterSpacing: 10, textAlign: 'center', padding: '12px' }} />
            {error && <div style={{ fontSize: 12.5, color: A.danger, fontWeight: 600 }}>{error}</div>}
            <Btn kind="primary" type="submit" loading={loading} full disabled={code.length !== 6}>تأكيد</Btn>
            <Btn kind="ghost" full onClick={() => { setPendingToken(''); setCode(''); setError('') }}>رجوع</Btn>
          </form>
        ) : (
          <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="البريد الإلكتروني">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" autoFocus required placeholder="admin@storely.dev" style={inputStyle} />
            </Field>
            <Field label="كلمة المرور">
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} dir="ltr" required style={inputStyle} />
            </Field>
            {error && <div style={{ fontSize: 12.5, color: A.danger, fontWeight: 600 }}>{error}</div>}
            <Btn kind="primary" type="submit" loading={loading} full>دخول</Btn>
          </form>
        )}
      </div>
    </div>
  )
}
