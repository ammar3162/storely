import { PLAN_CAPS, planKeyOf, planPriceFor, planLabel as planLabelLib, type PlanKey, type OrgDiscount } from '@/lib/planPricing'
import type { Tone } from './kit'

export type Customer = {
  id: string; full_name: string; phone: string; reg_phone: string; role: string
  status: string; created_at: string; org_id: string; org_name: string
  subscription_type: string; subscription_ends_at: string | null; billing_cycle: 'monthly' | 'yearly'
  max_branches: number; plan: PlanKey; requested_plan: string
  locked_plan_monthly: number | null   // سعر مثبّت لمشترك قبل تغيير الأسعار
  monthly_bill: number | null          // الباقة + الإضافات السارية شهرياً (بعد الخصم، السنوي ÷ 12)
  bill_addons: number | null           // منها: الإضافات
  discount: OrgDiscount                // خصم خاص من لوحة الإدارة
}

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'بانتظار التفعيل', tone: 'warning' },
  active: { label: 'مفعّل', tone: 'primary' },
  suspended: { label: 'موقوف', tone: 'danger' },
  deleted: { label: 'محذوف', tone: 'neutral' },
}

// حدود كل باقة (فروع الباقة الأساسية — الفروع الإضافية تنحسب من الإضافات)
// من مصدر واحد (lib/planPricing PLAN_CAPS) — الموظفين والموردين للمنشأة كلها
const capsDesc = (k: PlanKey) => { const c = PLAN_CAPS[k]; return `${c.branches === 1 ? 'فرع' : c.branches + ' فروع'} · ${c.staff} موظف · ${c.suppliers} مورد · ${k === 'basic' ? 'المميزات بالإضافات' : 'كل المميزات'} · يوصل ${c.maxBranches} فروع` }
export const PLAN_LIMITS: Record<PlanKey, { branches: number; staff: number; suppliers: number; desc: string }> = {
  basic: { ...PLAN_CAPS.basic, desc: capsDesc('basic') },
  pro: { ...PLAN_CAPS.pro, desc: capsDesc('pro') },
  advanced: { ...PLAN_CAPS.advanced, desc: capsDesc('advanced') },
}

export const PLAN_KEYS: PlanKey[] = ['basic', 'pro', 'advanced']
// المتقدمة بفروع فوق حدها = «المؤسسات»
export const planLabel = (k: PlanKey, maxBranches?: number | null) => planLabelLib(k, maxBranches)
export const PLAN_TONE: Record<PlanKey, Tone> = { basic: 'primary', pro: 'info', advanced: 'violet' }

export function mapCustomer(p: any): Customer {
  const maxB = p.organizations?.max_branches || 1
  return {
    // رقم التواصل = رقم واتساب اللي حدده العميل بإعداداته (يقدر يغيّره)، ولو ما حدد نرجع لجوال التسجيل
    id: p.id, full_name: p.full_name || '—', phone: p.organizations?.whatsapp_number || p.phone || '', reg_phone: p.phone || '',
    role: p.role, status: p.status || 'pending', created_at: p.created_at,
    org_id: p.org_id, org_name: p.organizations?.name || '—',
    subscription_type: p.subscription_type || 'trial',
    subscription_ends_at: p.subscription_ends_at || null,
    billing_cycle: p.organizations?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
    max_branches: maxB,
    plan: planKeyOf(p.organizations?.plan, maxB),
    requested_plan: p.organizations?.requested_plan || '',
    locked_plan_monthly: p.organizations?.locked_plan_monthly ?? null,
    monthly_bill: p.monthly_bill ?? null,
    bill_addons: p.bill_addons ?? null,
    discount: { discount_type: p.organizations?.discount_type ?? null, discount_value: p.organizations?.discount_value ?? null, discount_note: p.organizations?.discount_note ?? null, discount_until: p.organizations?.discount_until ?? null },
  }
}

/** الإيراد الشهري المتوقع من المشتركين المدفوعين النشطين = فاتورتهم الفعلية (الباقة + الإضافات − الخصم، السنوي ÷ 12).
 *  لو ما وصلت الفاتورة من الخادم نرجع لسعر الباقة بس */
export function monthlyRevenue(list: Customer[]) {
  const paid = list.filter(u => u.subscription_type === 'paid' && u.status === 'active')
  const planOnly = (u: Customer) => { const p = planPriceFor(u.plan, u.locked_plan_monthly); return u.billing_cycle === 'yearly' ? p.yearly / 12 : p.monthly }
  const total = paid.reduce((s, u) => s + (u.monthly_bill ?? planOnly(u)), 0)
  const addons = paid.reduce((s, u) => s + (u.bill_addons ?? 0), 0)
  return { total, addons }
}
