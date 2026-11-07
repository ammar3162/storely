'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, CircleAlert, CircleX, ClipboardCheck } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function PermissionPage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState<any>(null)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<'approved'|'rejected'|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance-permission-request?token=${token}`)
      const j = await res.json()
      if (!j.success) { setError(j.error || 'الطلب غير موجود'); setLoading(false); return }
      setReq(j.request)
      if (j.request.status !== 'pending') setResult(j.request.status)
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  async function respond(action: 'approve'|'reject') {
    setResolving(true)
    try {
      const res = await fetch('/api/attendance-permission-request', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const j = await res.json()
      if (j.success) setResult(j.status)
      else setError(j.error || 'حدث خطأ')
    } catch { setError('حدث خطأ') }
    setResolving(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] !p-4" dir="rtl">
      <StorelyCard className="w-full max-w-lg !p-6 text-center sm:!p-8">
        {loading ? (
          <div className="storely-loading">جاري التحميل...</div>
        ) : error ? (
          <div>
            <CircleAlert size={28} className="!mx-auto !mb-5" style={{color:storelyTokens.color.danger}} />
            <div className="break-words text-sm font-semibold leading-7" style={{color:storelyTokens.color.danger}}>{error}</div>
          </div>
        ) : result ? (
          <div>
            <div className="!mb-5 flex justify-center">{result === 'approved' ? <CheckCircle2 size={28} style={{color:storelyTokens.color.success}} /> : <CircleX size={28} style={{color:storelyTokens.color.danger}} />}</div>
            <div className="!mb-3 text-lg font-semibold leading-8">
              {result === 'approved' ? 'تمت الموافقة على الاستئذان' : 'تم رفض الاستئذان'}
            </div>
            <div className="break-words text-sm leading-7 text-[var(--storely-muted)]">{req?.staff_name} تم إبلاغه بالنتيجة</div>
          </div>
        ) : (
          <div>
            <ClipboardCheck size={28} className="!mx-auto !mb-5 text-[var(--storely-navy)]" />
            <StorelyPageHeader title="طلب استئذان" className="text-center [&_.storely-page-title]:text-2xl" />
            <div className="!mb-5 break-words text-base font-semibold">{req?.staff_name}</div>
            {req?.reason && (
              <div className="!mb-6 rounded-[var(--radius-sm)] border border-[var(--storely-border)] !p-4 text-start text-sm leading-7 text-[var(--storely-muted)]">
                {req.reason}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <StorelyButton onClick={() => respond('approve')} disabled={resolving} variant="primary" className="flex-1" icon={<CheckCircle2 size={16} />}>
                {resolving ? '...' : 'موافقة'}
              </StorelyButton>
              <StorelyButton onClick={() => respond('reject')} disabled={resolving} variant="danger" className="flex-1" icon={<CircleX size={16} />}>
                {resolving ? '...' : 'رفض'}
              </StorelyButton>
            </div>
          </div>
        )}
        <p className="!mt-6 border-t border-[var(--storely-border)] !pt-5 text-xs text-[var(--storely-muted)]" dir="ltr">Storely · storely.dev</p>
      </StorelyCard>
    </div>
  )
}
