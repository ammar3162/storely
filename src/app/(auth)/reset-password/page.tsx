'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

/* eslint-disable @next/next/no-img-element */

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkToken() {
      const params = new URLSearchParams(window.location.search)
      const token_hash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')
      const hash = window.location.hash

      // محاولة 1: token_hash (الطريقة الجديدة)
      if (token_hash && type) {
        const { data } = await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType })
        if (data?.session) { setReady(true); return }
      }

      // محاولة 2: code (PKCE)
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        if (data?.session) { setReady(true); return }
      }

      // محاولة 3: access_token في hash
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token') || ''
        if (access_token) {
          const { data } = await supabase.auth.setSession({ access_token, refresh_token })
          if (data?.session) { setReady(true); return }
        }
      }

      // محاولة 4: session موجودة
      const { data } = await supabase.auth.getSession()
      if (data?.session) { setReady(true); return }

      setReady(false)
    }
    checkToken()
    // Keep the original one-time token check behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (password !== password2) { setError('كلمتا المرور غير متطابقتين'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('حدث خطأ، حاول مرة أخرى أو اطلب رابط جديد'); return }
    setDone(true)
  }

  return (
    <div className="reset-auth" dir="rtl">
      <header className="reset-topbar">
        <img src="/storely-logo.png" alt="Storely" className="reset-logo" />
      </header>

      <main className="reset-shell">
        <section className="reset-brand" aria-label="Storely">
          <div className="reset-brand-inner">
            <img src="/storely-logo.png" alt="Storely" className="reset-brand-logo" />
            <div className="reset-brand-image">
              <img src="/storely-team.jpg" alt="Storely" />
            </div>
          </div>
        </section>

        <section className="reset-panel" aria-labelledby="reset-title">
          <div className="reset-card">
            <div className="reset-heading">
              <img src="/storely-logo.png" alt="Storely" className="reset-card-logo" />
              <h1 id="reset-title">إعادة تعيين كلمة المرور</h1>
            </div>

            {error && <div className="reset-error">⚠️ {error}</div>}

            {done ? (
              <div className="reset-state">
                <div className="reset-state-icon">✅</div>
                <h2>تم تغيير كلمة المرور!</h2>
                <p>يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.</p>
                <button onClick={()=>window.location.href='/login'} className="reset-primary">تسجيل الدخول</button>
              </div>
            ) : !ready ? (
              <div className="reset-state">
                <p>الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.</p>
                <button onClick={()=>window.location.href='/login'} className="reset-secondary">رجوع لتسجيل الدخول</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="reset-form">
                <div className="reset-field">
                  <label>كلمة المرور الجديدة</label>
                  <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل"/>
                </div>
                <div className="reset-field">
                  <label>تأكيد كلمة المرور</label>
                  <input type="password" required value={password2} onChange={e=>setPassword2(e.target.value)} placeholder="أعد إدخال كلمة المرور"/>
                </div>
                <button type="submit" disabled={loading} className="reset-primary">
                  {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .reset-auth {
          min-height: 100vh;
          background: #fff;
          color: #203640;
          font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
        }

        .reset-topbar {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 56px;
          border-bottom: 1px solid #e7eaed;
          background: #fff;
        }

        .reset-logo {
          width: 44px;
          height: 44px;
          display: block;
          object-fit: cover;
          border-radius: 8px;
        }

        .reset-shell {
          min-height: calc(100vh - 72px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(420px, 45%);
          align-items: center;
          gap: 64px;
          padding: 72px 10.25vw;
          direction: ltr;
        }

        .reset-brand {
          display: flex;
          justify-content: center;
          direction: rtl;
        }

        .reset-brand-inner {
          width: min(100%, 460px);
          text-align: center;
        }

        .reset-brand-logo {
          width: 82px;
          height: 82px;
          display: block;
          object-fit: cover;
          border-radius: 8px;
          margin: 0 auto 32px;
        }

        .reset-brand-image {
          overflow: hidden;
          border: 1px solid #e7eaed;
          border-radius: 8px;
          background: #f8fafb;
        }

        .reset-brand-image img {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: block;
          object-fit: cover;
        }

        .reset-panel {
          display: flex;
          justify-content: center;
          direction: rtl;
        }

        .reset-card {
          width: min(100%, 456px);
        }

        .reset-heading {
          margin-bottom: 26px;
          text-align: center;
        }

        .reset-card-logo {
          width: 76px;
          height: 76px;
          display: block;
          object-fit: cover;
          border-radius: 8px;
          margin: 0 auto 22px;
        }

        .reset-heading h1 {
          margin: 0;
          color: #111827;
          font-size: 28px;
          font-weight: 900;
          line-height: 1.45;
          letter-spacing: 0;
        }

        .reset-error {
          margin-bottom: 18px;
          padding: 12px 15px;
          border: 1px solid #fecaca;
          border-radius: 6px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.7;
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .reset-field label {
          display: block;
          margin-bottom: 7px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }

        .reset-field input {
          width: 100%;
          height: 48px;
          box-sizing: border-box;
          padding: 0 16px;
          border: 1px solid #d7dee3;
          border-radius: 6px;
          outline: none;
          background: #fff;
          color: #203640;
          font: inherit;
          font-size: 15px;
          font-weight: 500;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .reset-field input::placeholder {
          color: #9aa7b2;
        }

        .reset-field input:focus {
          border-color: #203640;
          box-shadow: 0 0 0 3px rgba(32, 54, 64, .1);
        }

        .reset-primary,
        .reset-secondary {
          width: 100%;
          min-height: 48px;
          border-radius: 6px;
          padding: 12px 22px;
          font: inherit;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, opacity .18s ease;
        }

        .reset-primary {
          margin-top: 6px;
          border: 1px solid #203640;
          background: #203640;
          color: #fff;
        }

        .reset-primary:hover:not(:disabled) {
          background: #172b33;
          border-color: #172b33;
        }

        .reset-primary:disabled {
          cursor: not-allowed;
          opacity: .7;
        }

        .reset-secondary {
          margin-top: 4px;
          border: 1px solid #d7dee3;
          background: #fff;
          color: #203640;
        }

        .reset-secondary:hover {
          border-color: #8ea0b1;
          background: #f8fafb;
        }

        .reset-state {
          text-align: center;
        }

        .reset-state-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          border: 1px solid #d8d9c6;
          border-radius: 8px;
          background: #f8eedf;
          color: #717553;
          font-size: 26px;
          font-weight: 900;
        }

        .reset-state h2 {
          margin: 0 0 8px;
          color: #111827;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.5;
        }

        .reset-state p {
          margin: 0 0 24px;
          color: #66737c;
          font-size: 14px;
          line-height: 1.85;
        }

        @media (max-width: 1024px) {
          .reset-shell {
            grid-template-columns: 1fr;
            gap: 42px;
            padding: 54px 32px;
          }

          .reset-brand {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .reset-topbar {
            height: 68px;
            padding: 0 36px;
          }

          .reset-shell {
            min-height: calc(100vh - 68px);
            align-items: start;
            padding: 44px 36px 56px;
          }

          .reset-card {
            width: 100%;
          }

          .reset-card-logo {
            width: 68px;
            height: 68px;
            margin-bottom: 18px;
          }

          .reset-heading {
            margin-bottom: 24px;
          }

          .reset-heading h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </div>
  )
}
