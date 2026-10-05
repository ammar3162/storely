'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertTriangle } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import AccountantReportView from '@/components/accountant/AccountantReportView'

// تقرير المحاسب — يفتحه المحاسب من الرابط اللي وصله (بدون تسجيل دخول)
export default function AccountantReportPage() {
  const token = useParams().token as string
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/accountant-report?token=${encodeURIComponent(token)}`)
      .then(r => r.json()).then(j => j.success ? setData(j) : setError(j.error || 'الرابط غير صحيح'))
      .catch(() => setError('تعذر فتح التقرير — تأكد من الإنترنت'))
  }, [token])

  const shell = (children: React.ReactNode) => (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f4f7f7', fontFamily: font.family, color: colors.text }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 40px' }}>{children}</div>
    </div>
  )
  if (error) return shell(
    <div style={{ textAlign: 'center', padding: '80px 16px' }}>
      <AlertTriangle size={36} color={colors.warning} />
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>{error}</div>
    </div>)
  if (!data) return shell(<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={28} color={colors.primary} style={{ animation: 'spin .8s linear infinite' }} /><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>)

  return shell(<>
    <AccountantReportView data={data} downloadHref={`/api/accountant-report?token=${encodeURIComponent(token)}&format=xlsx`} />
    <footer style={{ textAlign: 'center', fontSize: 12, color: colors.text4, marginTop: 20 }}>
      صدر من <a href="https://www.storely.dev" style={{ color: colors.primary }}>Storely</a> · الرابط صالح ٧ أيام من تاريخ الإرسال
    </footer>
  </>)
}
