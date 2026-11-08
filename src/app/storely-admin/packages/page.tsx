'use client'
import { useEffect, useState } from 'react'
import { PLAN_PRICING, PLAN_CAPS, ENTERPRISE_LABEL, isNewPlan, isCustomPlan, CUSTOM_MODULES, CUSTOM_MODULE_ORDER, STARTING_PRICE } from '@/lib/planPricing'

const MOD_AR: Record<string, string> = { mod_inventory: 'المخزون والموردين', mod_purchases: 'المشتريات والفواتير', cashier_closing: 'إقفال الكاشير', hr_full: 'الحضور والرواتب', ai_tools: 'الذكاء الاصطناعي' }
import { Check, Info } from 'lucide-react'
import { A, Badge, Card, Loading, Notice, PageHeader, Stack, adminFetch, useAdmin } from '../_admin/kit'
import { type Customer, PLAN_KEYS, PLAN_LIMITS, PLAN_TONE, mapCustomer, planLabel } from '../_admin/customers'

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
      <Stack>
      {loading ? <Loading /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap: 20 }}>
          {PLAN_KEYS.map(k => {
            const p = PLAN_PRICING[k]
            const l = PLAN_LIMITS[k]
            const active = list.filter(u => u.plan === k && u.status === 'active')
            const paid = active.filter(u => u.subscription_type === 'paid').length
            return (
              <Card key={k} style={isCustomPlan(k) ? { borderColor: `${A.primary}66`, boxShadow: `0 0 0 3px ${A.primary}14` } : undefined}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Badge tone={PLAN_TONE[k]}>{planLabel(k)}</Badge>
                  {isCustomPlan(k) && <span style={{ fontSize: 12, color: A.primary, fontWeight: 600 }}>للمشتركين الجدد</span>}
                </div>
                {isCustomPlan(k) ? (<>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                    <span style={{ fontSize: 13, color: A.text2 }}>يبدأ من</span>
                    <span style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{STARTING_PRICE}</span>
                    <span style={{ fontSize: 13, color: A.text2 }}>⃁ للفرع شهرياً</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}>بدون حد أدنى، ولكل ميزة سعرها (الفرع الأول / كل فرع بعده)</div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.border}`, fontSize: 13.5, color: A.text }}>
                    {CUSTOM_MODULE_ORDER.map(sl => <Li key={sl}><span style={{ flex: 1 }}>{MOD_AR[sl]}</span><span style={{ color: A.text2, fontVariantNumeric: 'tabular-nums' }}>{CUSTOM_MODULES[sl].first} ⃁{CUSTOM_MODULES[sl].perBranch ? ` / ${CUSTOM_MODULES[sl].extra} ⃁` : ' للمنشأة'}</span></Li>)}
                    <Li>{PLAN_CAPS.custom.staff} موظفين مشمولين لكل فرع</Li>
                  </ul>
                </>) : (<>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.monthly}</span>
                  <span style={{ fontSize: 13, color: A.text2 }}>⃁ شهرياً{isNewPlan(k) ? ' للفرع الأول' : ''}</span>
                </div>
                <div style={{ fontSize: 12.5, color: A.text3, marginTop: 2 }}>{p.yearly} ⃁ سنوياً</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.border}`, fontSize: 13.5, color: A.text }}>
                  {isNewPlan(k) ? (<>
                    <Li>كل فرع إضافي {PLAN_CAPS[k].branchPrice} ⃁، وحتى {PLAN_CAPS[k].maxBranches} فروع</Li>
                    <Li>{PLAN_CAPS[k].staff} موظفين و{PLAN_CAPS[k].suppliers} مورداً لكل فرع</Li>
                    <Li>{k === 'essential' ? 'المخزون والمشتريات، والكاشير 39 والحضور 69 لكل فرع، والذكاء الاصطناعي 15 للمنشأة' : k === 'ops' ? 'المخزون والمشتريات وإقفال الكاشير، والحضور 69 لكل فرع، والذكاء الاصطناعي 15' : 'كل المزايا مشمولة'}</Li>
                  </>) : (<>
                  <Li>{lim(l.branches, 'فروع')}، وحتى {PLAN_CAPS[k].maxBranches} بفرع إضافي {PLAN_CAPS[k].branchPrice} ⃁</Li>
                  <Li>{lim(l.staff, 'موظفين')} للمنشأة كلها (+{PLAN_CAPS[k].branchStaff} مع كل فرع إضافي)</Li>
                  <Li>{lim(l.suppliers, 'موردين')} (+{PLAN_CAPS[k].branchSuppliers} مع كل فرع إضافي)</Li>
                  <Li>{k === 'basic' ? 'المزايا عبر الإضافات: الكاشير وإدارة الموظفين والربحية والذكاء الاصطناعي' : 'كل المزايا مشمولة'}</Li>
                  </>)}
                </ul>
                </>)}
                {can('manage_users') && (
                  <div style={{ borderTop: `1px solid ${A.border}`, marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: A.text2 }}>المشتركون المفعّلون</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{paid} مدفوع · {active.length - paid} تجربة</span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <Notice tone="neutral">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 3 }} />
          <span>يطلب العميل الفرع الإضافي من صفحة الفروع (حتى حد باقته)، ويصلك الطلب في «طلبات الإضافات» للموافقة عليه، ويُحتسب سعره حسب باقته. تُفعَّل باقة {ENTERPRISE_LABEL} (أكثر من {PLAN_CAPS.advanced.maxBranches} فروع) من ملف العميل بحدود وسعر خاصين. التجربة المجانية تشمل كل المزايا، وتظهر الباقة التي اختارها العميل في ملفه ضمن «الباقة المطلوبة عند التسجيل».</span>
        </div>
      </Notice>
      </Stack>
    </>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.6 }}>
      <Check size={15} color={A.primary} style={{ flexShrink: 0, marginTop: 3 }} />
      <span style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</span>
    </li>
  )
}
