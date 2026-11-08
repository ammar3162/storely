import { PLAN_CAPS, isNewPlan, planKeyOf, planPriceFor, adminPlanLabel, type PlanKey, type OrgDiscount } from '@/lib/planPricing'
import type { Tone } from './kit'

export type Customer = {
  id: string; full_name: string; phone: string; reg_phone: string; role: string
  status: string; created_at: string; org_id: string; org_name: string
  subscription_type: string; subscription_ends_at: string | null; billing_cycle: 'monthly' | 'yearly'
  max_branches: number; plan: PlanKey; requested_plan: string; staff_included?: number | null
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
const NEW_DESC: Record<string, string> = { essential: 'المخزون والمشتريات', ops: '+ إقفال الكاشير', full: 'كل المزايا', custom: 'يختار المزايا بنفسه (من الإضافات)' }
const capsDesc = (k: PlanKey) => {
  const c = PLAN_CAPS[k]
  if (k === 'custom') return `يختار المزايا بنفسه (من الإضافات تحت) · ${c.staff} موظفين لكل فرع · بدون حد أدنى للفاتورة`
  if (isNewPlan(k)) return `لكل فرع: ${c.staff} موظفين · ${c.suppliers} مورد · ${NEW_DESC[k]} · الفرع الإضافي ${c.branchPrice} ⃁ · يوصل ${c.maxBranches} فروع`
  return `${c.branches === 1 ? 'فرع' : c.branches + ' فروع'} · ${c.staff} موظف · ${c.suppliers} مورد · ${k === 'basic' ? 'المميزات بالإضافات' : 'كل المميزات'} · يوصل ${c.maxBranches} فروع`
}
export const PLAN_LIMITS = Object.fromEntries(
  (Object.keys(PLAN_CAPS) as PlanKey[]).map(k => [k, { ...PLAN_CAPS[k], desc: capsDesc(k) }]),
) as unknown as Record<PlanKey, { branches: number; staff: number; suppliers: number; desc: string }>

// الجديدة أول (للمشتركين الجدد) — القديمة باقية للمشتركين قبل 2026-11
export const PLAN_KEYS: PlanKey[] = ['essential', 'ops', 'full', 'custom', 'basic', 'pro', 'advanced']
// المتقدمة بفروع فوق حدها = «المؤسسات»
// بالأدمن نميّز الباقات القديمة «(قديمة)» عن الجديدة اللي بنفس الاسم
export const planLabel = (k: PlanKey, maxBranches?: number | null) => adminPlanLabel(k, maxBranches)
export const PLAN_TONE: Record<PlanKey, Tone> = { basic: 'primary', pro: 'info', advanced: 'violet', essential: 'primary', ops: 'info', full: 'violet', custom: 'warning' }

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
    staff_included: p.organizations?.staff_included ?? null,
    monthly_bill: p.monthly_bill ?? null,
    bill_addons: p.bill_addons ?? null,
    discount: { discount_type: p.organizations?.discount_type ?? null, discount_value: p.organizations?.discount_value ?? null, discount_note: p.organizations?.discount_note ?? null, discount_until: p.organizations?.discount_until ?? null },
  }
}

/** الإيراد الشهري المتوقع من المشتركين المدفوعين النشطين = فاتورتهم الفعلية (الباقة + الإضافات − الخصم، السنوي ÷ 12).
 *  لو ما وصلت الفاتورة من الخادم نرجع لسعر الباقة بس */
export function monthlyRevenue(list: Customer[]) {
  const paid = list.filter(u => u.subscription_type === 'paid' && u.status === 'active')
  const planOnly = (u: Customer) => { const p = planPriceFor(u.plan, u.locked_plan_monthly, u.max_branches); return u.billing_cycle === 'yearly' ? p.yearly / 12 : p.monthly }
  const total = paid.reduce((s, u) => s + (u.monthly_bill ?? planOnly(u)), 0)
  const addons = paid.reduce((s, u) => s + (u.bill_addons ?? 0), 0)
  return { total, addons }
}
