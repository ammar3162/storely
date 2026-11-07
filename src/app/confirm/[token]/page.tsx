'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, CircleX, LoaderCircle } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function ConfirmPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading'|'confirm'|'done'|'error'>('loading')
  const [order, setOrder]   = useState<any>(null)

  useEffect(()=>{ load() },[])

  async function load() {
    try {
      const res = await fetch(`/api/supplier-confirmed?token=${params.token}`)
      const data = await res.json()
      if(!res.ok || !data.success){ setStatus('error'); return }
      if(data.status==='confirmed'){ setStatus('done'); return }
      setOrder({ supplier_name: data.supplier_name, items: data.items, org_name: data.org_name })
      setStatus('confirm')
    } catch {
      setStatus('error')
    }
  }

  async function confirm() {
    setStatus('loading')
    const res = await fetch('/api/supplier-confirmed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.token})})
    const data = await res.json()
    if(!res.ok || data.success===false){ setStatus('error'); return }
    setStatus('done')
  }

  if(status==='loading') return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] text-[var(--storely-navy)]" dir="rtl">
      <LoaderCircle size={28} className="animate-spin" />
    </div>
  )

  if(status==='error') return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] !p-4" dir="rtl">
      <StorelyCard className="w-full max-w-md !p-6 text-center sm:!p-8">
        <CircleX size={28} className="!mx-auto !mb-5" style={{color:storelyTokens.color.danger}} />
        <div className="text-xl font-semibold">رابط غير صالح</div>
        <div className="!mt-3 text-sm leading-7 text-[var(--storely-muted)]">هذا الرابط غير موجود أو منتهي</div>
      </StorelyCard>
    </div>
  )

  if(status==='done') return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] !p-4" dir="rtl">
      <StorelyCard className="w-full max-w-md !p-6 text-center sm:!p-8">
        <CheckCircle2 size={28} className="!mx-auto !mb-5" style={{color:storelyTokens.color.success}} />
        <div className="text-xl font-semibold">تم التأكيد</div>
        <div className="!mt-3 text-sm leading-7 text-[var(--storely-muted)]">شكراً — تم إبلاغ العميل بتأكيدك</div>
      </StorelyCard>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--storely-background)] !p-4" dir="rtl">
      <StorelyCard className="w-full max-w-xl">
        <div className="border-b border-[var(--storely-border)] !p-5 sm:!p-6">
          <div className="!mb-4 text-sm font-semibold text-[var(--storely-muted)]">Storely</div>
          <StorelyPageHeader title="طلب توريد" description={order?.supplier_name} className="!mb-0" />
        </div>
        <div className="!space-y-5 !p-5 sm:!p-6">
          <h2 className="text-lg font-semibold">تفاصيل الطلب</h2>
          <div>
            <div className="!mb-4 text-sm text-[var(--storely-muted)]">من: <b className="text-[var(--storely-navy)]">{order?.org_name||'العميل'}</b></div>
            {(order?.items||[]).map((item:any,i:number)=>(
              <div key={i} className="flex flex-wrap items-center justify-between gap-4 !py-4" style={{borderBottom:i<order.items.length-1?`1px solid ${storelyTokens.color.border}`:'none'}}>
                <span className="min-w-0 break-words text-sm font-medium">{item.name}</span>
                <span className="text-sm font-semibold tabular-nums">{item.qty} {item.unit}</span>
              </div>
            ))}
          </div>
          <StorelyButton onClick={confirm} variant="primary" className="w-full" icon={<CheckCircle2 size={16} />}>تأكيد الطلب</StorelyButton>
          <div className="text-center text-sm leading-7 text-[var(--storely-muted)]">بالضغط على التأكيد سيتم إبلاغ العميل فوراً</div>
        </div>
      </StorelyCard>
    </div>
  )
}
