'use client'
import { useEffect, useState } from 'react'
import { PLAN_PRICING, PLAN_CAPS, ENTERPRISE_LABEL } from '@/lib/planPricing'
import { A, Badge, Card, Loading, PageHeader, adminFetch, useAdmin } from '../_admin/kit'
import { type Customer, PLAN_KEYS, PLAN_LIMITS, PLAN_TONE, mapCustomer } from '../_admin/customers'

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
    <>
      <PageHeader title="الباقات والأسعار" subtitle="الأسعار والحدود المعتمدة في التسجيل والفواتير وصفحات الموقع" />
      {loading ? <Loading /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {PLAN_KEYS.map(k => {
            const p = PLAN_PRICING[k]
            const l = PLAN_LIMITS[k]
            const active = list.filter(u => u.plan === k && u.status === 'active')
            const paid = active.filter(u => u.subscription_type === 'paid').length
            return (
              <Card key={k}>
                <Badge tone={PLAN_TONE[k]}>{p.label}</Badge>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                  <span style={{ fontSize: 30, fontWeight: 800 }}>{p.monthly}</span>
                  <span style={{ fontSize: 13, color: A.text2 }}>⃁ / شهر</span>
                </div>
                <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}>{p.yearly} ⃁ / سنة</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, fontSize: 13, color: A.text2 }}>
                  <li>{lim(l.branches, 'فروع')} — ويوصل {PLAN_CAPS[k].maxBranches} بفرع إضافي {PLAN_CAPS[k].branchPrice} ⃁</li>
                  <li>{lim(l.staff, 'موظفين')} للمنشأة كلها (+{PLAN_CAPS[k].branchStaff} مع كل فرع إضافي)</li>
                  <li>{lim(l.suppliers, 'موردين')} (+{PLAN_CAPS[k].branchSuppliers} مع كل فرع إضافي)</li>
                  <li>{k === 'basic' ? 'المميزات بالإضافات: الكاشير، إدارة الموظفين، الربحية، الذكاء الاصطناعي' : 'كل المميزات مشمولة'}</li>
                </ul>
                {can('manage_users') && (
                  <div style={{ borderTop: `1px solid ${A.border}`, marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: A.text2 }}>المشتركين المفعّلين</span>
                    <span style={{ fontWeight: 700 }}>{paid} مدفوع · {active.length - paid} تجربة</span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 12.5, color: A.text3 }}>
        الفرع الإضافي يطلبه العميل من صفحة الفروع (لين حد باقته) ويوصلك بطلبات الإضافات توافق عليه، وسعره حسب باقته. باقة {ENTERPRISE_LABEL} (أكثر من {PLAN_CAPS.advanced.maxBranches} فروع) تتفعّل من ملف العميل بحدود وسعر خاص. التجربة المجانية على الشاملة بكل المميزات، والباقة اللي اختارها العميل تبان بملفه «الباقة المطلوبة عند التسجيل».
      </div>
    </>
  )
}
