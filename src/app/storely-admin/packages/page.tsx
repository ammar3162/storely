'use client'
import { useEffect, useState } from 'react'
import { PLAN_PRICING } from '@/lib/planPricing'
import { adminFetch, useAdmin } from '../_admin/kit'
import { StorelyCard, StorelyPageHeader } from '@/components/ui'
import { type Customer, PLAN_KEYS, PLAN_LIMITS, mapCustomer } from '../_admin/customers'

const lim = (n: number, unit: string) => (n >= 999 ? `${unit} بلا حد` : `${n} ${unit}`)

export default function PackagesPage() {
  const { can } = useAdmin()
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!can('manage_users')) { setLoading(false); return }
    adminFetch('/api/admin/list-users').then(j => { if (j.users) setList(j.users.map(mapCustomer)); setLoading(false) })
  }, [])

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="الباقات والأسعار" description="الأسعار والحدود المعتمدة في التسجيل والفواتير وصفحات الموقع" />
      {loading ? <div className="storely-loading">جاري التحميل...</div> : (
        <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {PLAN_KEYS.map(k => {
            const p = PLAN_PRICING[k]
            const l = PLAN_LIMITS[k]
            const active = list.filter(u => u.plan === k && u.status === 'active')
            const paid = active.filter(u => u.subscription_type === 'paid').length
            return (
              <StorelyCard key={k} className="flex h-full flex-col">
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="text-lg font-semibold">{p.label}</div>
                  <div className="mt-6 flex flex-wrap items-baseline gap-2">
                    <span className="text-[30px] leading-tight font-semibold tabular-nums">{p.monthly}</span>
                    <span className="text-sm text-[var(--storely-muted)]">ر.س / شهر</span>
                  </div>
                  <div className="mt-3 text-sm text-[var(--storely-muted)]">{p.yearly} ر.س / سنة</div>
                  <ul className="mt-6 flex flex-1 list-none flex-col gap-4 text-sm leading-7 text-[var(--storely-muted)]">
                    <li>{lim(l.branches, 'فروع')}</li>
                    <li>{lim(l.staff, 'موظفين')} لكل فرع</li>
                    <li>{lim(l.suppliers, 'موردين')}</li>
                  </ul>
                  {can('manage_users') && (
                    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[var(--storely-border)] pt-5 text-sm">
                      <span className="text-[var(--storely-muted)]">المشتركين المفعّلين</span>
                      <span className="font-semibold">{paid} مدفوع · {active.length - paid} تجربة</span>
                    </div>
                  )}
                </div>
              </StorelyCard>
            )
          })}
        </div>
      )}
      <div className="text-sm leading-7 text-[var(--storely-muted)]">
        الفرع الإضافي: 49 ر.س للفرع شهرياً لأي باقة — يُفعَّل من صفحة العميل ← الإضافات.
      </div>
    </div>
  )
}
