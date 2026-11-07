'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyFormField, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
}

const STATUS_LABEL: Record<string, {label:string; color:string; bg:string}> = {
  pending:  { label: 'بانتظار الموافقة', color: storelyTokens.color.warning, bg: storelyTokens.color.warningBg },
  approved: { label: 'موافَق عليها ✓',   color: storelyTokens.color.success, bg: storelyTokens.color.successBg },
  rejected: { label: 'مرفوضة',           color: storelyTokens.color.danger, bg: storelyTokens.color.dangerBg },
}

export default function StaffLeavePage() {
  const router = useRouter()
  const [session, setSession] = useState<StaffSession|null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [balance, setBalance] = useState<number|null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){ router.push('/staff'); return }
    setSession(JSON.parse(saved) as StaffSession)
    loadRequests()
  },[])

  async function loadRequests() {
    setLoading(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-leave', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      const list = j.success ? (j.requests||[]) : []
      setRequests(list)
      if (list.length > 0) setBalance(list[0]?.staff_members?.leave_balance_days ?? null)
    } catch { setRequests([]) }
    setLoading(false)
  }

  async function submitRequest() {
    if (!startDate || !endDate) { setError('اختر تاريخ البداية والنهاية'); return }
    setError('')
    setSubmitting(true)
    const token = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason || null }),
    })
    const j = await res.json()
    setSubmitting(false)
    if (!j.success) { setError(j.error || 'حدث خطأ'); return }
    setStartDate(''); setEndDate(''); setReason('')
    loadRequests()
  }

  if (!session) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] text-[var(--storely-navy)]">
      <LoaderCircle size={28} className="animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--storely-background)] text-[var(--storely-navy)]" dir="rtl">
      <div className="!mx-auto max-w-4xl !space-y-6 !px-4 !py-6 sm:!p-8">
        <StorelyPageHeader title="طلب إجازة" description={session.name}
          actions={<StorelyButton onClick={()=>router.back()}>رجوع</StorelyButton>} />
        {balance !== null && (
          <StorelyCard>
            <div className="flex flex-wrap items-center justify-between gap-4 !p-5 sm:!p-6">
              <div className="text-sm text-[var(--storely-muted)]">رصيدك المتبقي</div>
              <div className="text-[28px] font-semibold tabular-nums">{balance} <span className="text-base font-medium">يوم</span></div>
            </div>
          </StorelyCard>
        )}
        <StorelyCard title="طلب إجازة جديد">
          <div className="!space-y-5 !p-5 sm:!p-6">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <StorelyFormField label="من تاريخ" htmlFor="leave-start">
                <input id="leave-start" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="storely-input min-w-0" />
              </StorelyFormField>
              <StorelyFormField label="إلى تاريخ" htmlFor="leave-end">
                <input id="leave-end" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="storely-input min-w-0" />
              </StorelyFormField>
            </div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="السبب (اختياري)" className="storely-input !h-auto min-h-24 resize-y" />
            {error && <div className="storely-notice" style={{color:storelyTokens.color.danger,borderColor:storelyTokens.color.dangerBorder}}>{error}</div>}
            <StorelyButton onClick={submitRequest} disabled={submitting||!startDate||!endDate} variant="primary" className="w-full sm:w-auto">
              {submitting?'جاري الإرسال...':'إرسال الطلب'}
            </StorelyButton>
          </div>
        </StorelyCard>
        <section className="!space-y-4">
          <h2 className="text-lg font-semibold">طلباتي</h2>
          {loading ? (
            <div className="storely-loading">جاري التحميل...</div>
          ) : requests.length===0 ? (
            <StorelyEmptyState title="ما فيه طلبات إجازة بعد" />
          ) : (
            <div className="flex min-w-0 flex-col gap-4">
              {requests.map((r:any)=>{
                const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending
                return (
                  <StorelyCard key={r.id}>
                    <div className="!space-y-3 !p-5 sm:!p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold tabular-nums">{r.start_date} → {r.end_date}</span>
                        <span className="storely-badge" style={{color:st.color,background:st.bg}}>{st.label}</span>
                      </div>
                      <div className="break-words text-sm leading-7 text-[var(--storely-muted)]">{r.days_count} يوم{r.reason?` — ${r.reason}`:''}</div>
                    </div>
                  </StorelyCard>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
