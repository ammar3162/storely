'use client'
import { useEffect, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import RenewSubscription from '@/components/RenewSubscription'

// صفحة «تجديد الاشتراك» — يوصلها زر الإيميل وزر الشريط في لوحة التحكم
const arDate = (d: string) => new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })

export default function RenewPage() {
  const [info, setInfo] = useState<any>(undefined)
  useEffect(() => {
    fetch('/api/subscription/renew').then(async r => ({ status: r.status, j: await r.json().catch(() => ({})) }))
      .then(({ status, j }) => setInfo(status === 401 ? 'login' : status === 403 && j.role ? 'manager' : j.success ? j : 'error'))
      .catch(() => setInfo('error'))
  }, [])
  const card: React.CSSProperties = { width: '100%', maxWidth: 440, background: 'var(--storely-surface)', border: '1px solid var(--storely-border)', borderRadius: 'var(--radius)', padding: '32px 24px', boxShadow: 'var(--storely-shadow)', textAlign: 'center' }
  const link: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, background: 'var(--storely-navy)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 600, textDecoration: 'none' }
  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--storely-background)', padding: 20 }}>
      <div style={card}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--storely-background)', color: 'var(--storely-muted)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><RefreshCcw size={26} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--storely-navy)', margin: '0 0 8px' }}>تجديد الاشتراك</h1>
        {info === undefined ? <p style={{ color: 'var(--storely-muted)', fontSize: 14 }}>جارٍ التحميل...</p>
          : info === 'login' ? <>
            <p style={{ fontSize: 14, color: 'var(--storely-text)', lineHeight: 1.8, margin: '0 0 20px' }}>سجّل الدخول إلى حسابك أولاً، ثم اضغط «تجديد الاشتراك».</p>
            <a href="/login" style={link}>تسجيل الدخول</a>
          </>
          : info === 'manager' ? <p style={{ fontSize: 14, color: 'var(--storely-text)', lineHeight: 1.8 }}>تجديد الاشتراك من مالك المنشأة. أبلغه لتجديده.</p>
          : info === 'error' ? <p style={{ fontSize: 14, color: '#B42318' }}>تعذر التحميل، حدّث الصفحة وحاول مرة أخرى.</p>
          : <>
            <p style={{ fontSize: 14, color: 'var(--storely-text)', lineHeight: 1.8, margin: '0 0 20px' }}>
              {info.pending ? 'استلمنا طلب تجديدك، وسيتواصل معك فريق Storely لإتمام الدفع.'
                : info.expired ? 'انتهى اشتراكك. جدّد الآن ليعمل حسابك فوراً، وسيتواصل معك فريقنا لإتمام الدفع.'
                : info.endsAt ? `ينتهي اشتراكك يوم ${arDate(info.endsAt)}. جدّد الآن، وسيتواصل معك فريقنا لإتمام الدفع.` : 'جدّد اشتراكك، وسيتواصل معك فريقنا لإتمام الدفع.'}
            </p>
            {info.pending ? <a href="/dashboard" style={link}>الدخول إلى حسابك</a> : <RenewSubscription />}
          </>}
      </div>
    </div>
  )
}
