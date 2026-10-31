// أسعار الباقات وحساب الفاتورة — مصدر واحد للوحة الإدارة (الفاتورة المرسلة) وحساب العميل (الإعدادات)
export type PlanKey = 'basic' | 'pro' | 'advanced'
export type BillingCycle = 'monthly' | 'yearly'

export const PLAN_PRICING: Record<PlanKey, { label: string; monthly: number; yearly: number }> = {
  basic:    { label: 'الأساسية', monthly: 99,  yearly: 950 },
  pro:      { label: 'الشاملة', monthly: 249, yearly: 2390 },
  advanced: { label: 'المتقدمة', monthly: 499, yearly: 4790 },
}

// «المؤسسات» = المتقدمة بفروع أكثر من حدها (سعر وحدود يحددها الأدمن لكل منشأة)
export const ENTERPRISE_LABEL = 'المؤسسات'

/**
 * حدود كل باقة — مصدر واحد للتسجيل وتغيير الباقة وفحص الحدود والصفحات.
 * staff/suppliers للمنشأة كلها (توزّع على الفروع). كل فرع إضافي يزيد branchStaff/branchSuppliers.
 * maxBranches = أقصى فروع يقدر العميل يوصلها بنفسه بإضافة «فرع إضافي» (بسعر branchPrice).
 */
export const PLAN_CAPS: Record<PlanKey, { branches: number; maxBranches: number; staff: number; suppliers: number; branchStaff: number; branchSuppliers: number; branchPrice: number }> = {
  basic:    { branches: 1, maxBranches: 2,  staff: 3,  suppliers: 5,  branchStaff: 3, branchSuppliers: 5, branchPrice: 79 },
  pro:      { branches: 3, maxBranches: 5,  staff: 15, suppliers: 20, branchStaff: 5, branchSuppliers: 5, branchPrice: 79 },
  advanced: { branches: 6, maxBranches: 10, staff: 50, suppliers: 50, branchStaff: 5, branchSuppliers: 5, branchPrice: 59 },
}

/** اسم الباقة للعرض — المتقدمة بفروع فوق حدها تنعرض «المؤسسات» */
export function planLabel(plan: string | null | undefined, maxBranches?: number | null): string {
  const k = planKeyOf(plan, maxBranches)
  if (k === 'advanced' && (Number(maxBranches) || 0) > PLAN_CAPS.advanced.maxBranches) return ENTERPRISE_LABEL
  return PLAN_PRICING[k].label
}

// المنشآت القديمة اللي حدها «غير محدود» (999) تحتفظ فيه
const UNLIMITED = 999
const keepUnlimited = (stored: number | null | undefined, cap: number) => (Number(stored) || 0) >= UNLIMITED ? UNLIMITED : cap

/** حد موظفين المنشأة (قبل إضافة «موظف إضافي»): حد الباقة + موظفين كل فرع إضافي */
export function staffBase(plan: string | null | undefined, storedMax: number | null | undefined, extraBranches: number): number {
  const c = PLAN_CAPS[planKeyOf(plan)]
  return keepUnlimited(storedMax, c.staff) + Math.max(0, extraBranches) * c.branchStaff
}

/** حد موردين المنشأة (قبل إضافة «مورد إضافي») */
export function supplierBase(plan: string | null | undefined, storedMax: number | null | undefined, extraBranches: number): number {
  const c = PLAN_CAPS[planKeyOf(plan)]
  return keepUnlimited(storedMax, c.suppliers) + Math.max(0, extraBranches) * c.branchSuppliers
}

/** أقصى فروع يوصلها العميل بنفسه — المنشآت القديمة اللي باقتها فيها فروع أكثر تحتفظ فيها */
export function maxSelfServeBranches(plan: string | null | undefined, baseBranches: number | null | undefined): number {
  return Math.max(PLAN_CAPS[planKeyOf(plan)].maxBranches, Number(baseBranches) || 1)
}

/** سعر الفرع الإضافي الشهري حسب الباقة */
export const branchPriceFor = (plan: string | null | undefined) => PLAN_CAPS[planKeyOf(plan)].branchPrice

// السنوي = الشهري × 12 بخصم 20%
export const YEARLY_FACTOR = 0.8
export const yearlyOf = (monthly: number) => Math.round(monthly * 12 * YEARLY_FACTOR)

/** سعر الباقة للمنشأة: المثبّت لها (مشترك قبل تغيير الأسعار) أو سعر الباقة الحالي */
export function planPriceFor(plan: PlanKey, lockedMonthly?: number | string | null): { label: string; monthly: number; yearly: number } {
  const p = PLAN_PRICING[plan]
  const locked = Number(lockedMonthly) || 0
  return locked > 0 ? { label: p.label, monthly: locked, yearly: yearlyOf(locked) } : p
}

// متى نقترح الترقية للشاملة: فاتورة الأساسية الشهرية وصلت هالحد أو أكثر
export const UPGRADE_HINT_FROM = 150
/** مرشّح للترقية: على الأساسية وفاتورته الشهرية قريبة من سعر الشاملة */
export const upgradeCandidate = (plan: string | null | undefined, monthlyBill: number) =>
  (plan || 'basic') === 'basic' && monthlyBill >= UPGRADE_HINT_FROM

// إضافات تغيّر سعرها: المشترك يكمل بسعره المثبّت لين تجديد اشتراكه، ومن التجديد يصير على السعر الجديد
// (إدارة الموظفين 39 → 59 — تغيير الباقات 2026-11)
export const PRICE_UPDATE_ON_RENEWAL = ['hr_full']

// إضافات تنباع بالوحدة (السعر × الكمية)
export const QTY_ADDON_SLUGS = ['extra_branch', 'extra_staff', 'extra_suppliers']

export function planKeyOf(plan: string | null | undefined, maxBranches?: number | null): PlanKey {
  if (plan === 'basic' || plan === 'pro' || plan === 'advanced') return plan
  const b = Number(maxBranches) || 1
  return b === 1 ? 'basic' : b <= 3 ? 'pro' : 'advanced'
}

type AddonSub = { isValid?: boolean; quantity?: number | null; locked_price?: number | string | null }
// سعر وحدة الاشتراك: المثبّت له لو موجود، وإلا سعر الإضافة الحالي
export const unitPrice = (addonPrice: number | string, sub?: AddonSub | null) => Number(sub?.locked_price) > 0 ? Number(sub!.locked_price) : (Number(addonPrice) || 0)
type AddonRow = { name: string; slug: string; monthly_price: number | string; subscription?: AddonSub | null; subscriptions?: AddonSub[] }
export type BillLine = { label: string; amount: number }

export function billLines(plan: PlanKey, cycle: BillingCycle, addons: AddonRow[], lockedPlanMonthly?: number | string | null): { lines: BillLine[]; total: number } {
  const p = planPriceFor(plan, lockedPlanMonthly)
  const lines: BillLine[] = [{
    label: `اشتراك باقة "${p.label}" (${cycle === 'yearly' ? 'سنوياً' : 'شهرياً'})`,
    amount: cycle === 'yearly' ? p.yearly : p.monthly,
  }]
  for (const a of addons) {
    const active = (a.subscriptions || (a.subscription ? [a.subscription] : [])).filter(s => s?.isValid)
    if (!active.length) continue
    // الإضافات تتجدد مع الباقة: بالباقة السنوية = سعرها الشهري × 12 (الفرع الإضافي بنفس خصم السنوي 20%)
    const months = cycle === 'yearly' ? (a.slug === 'extra_branch' ? 12 * YEARLY_FACTOR : 12) : 1
    const per = cycle === 'yearly' ? 'سنوياً' : 'شهرياً'
    const price = unitPrice(a.monthly_price, active[0])
    if (QTY_ADDON_SLUGS.includes(a.slug)) {
      const qty = active.reduce((s, x) => s + Math.max(1, Number(x.quantity) || 1), 0)
      const amount = active.reduce((s, x) => s + Math.max(1, Number(x.quantity) || 1) * unitPrice(a.monthly_price, x), 0)
      const same = active.every(x => unitPrice(a.monthly_price, x) === price)
      lines.push({ label: `إضافة "${a.name}" (${same ? `${qty} × ${price} ر.س` : `${qty} وحدات`}${months > 1 ? ' × 12 شهر' : ''})`, amount: Math.round(amount * months) })
    } else {
      lines.push({ label: `إضافة "${a.name}" (${per})`, amount: price * months })
    }
  }
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) }
}

const DAY = 24 * 60 * 60 * 1000

/**
 * الإضافة تنتهي مع الباقة: لو الاشتراك ساري (باقي أكثر من يوم) تاريخ انتهائه، وإلا 30 يوم من الحين
 */
export function addonPeriodEnd(subscriptionEndsAt: string | null | undefined, now = new Date()): Date {
  const ends = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null
  return ends && ends.getTime() - now.getTime() > DAY ? ends : new Date(now.getTime() + 30 * DAY)
}

/** المبلغ المستحق الحين عن الأيام الباقية لين تجديد الباقة (سعر اليوم = الشهري ÷ 30) */
export function proratedCharge(monthlyPrice: number, qty: number, until: Date, now = new Date()): { days: number; amount: number } {
  const days = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY))
  return { days, amount: Math.round((Number(monthlyPrice) || 0) * Math.max(0, qty) * days / 30) }
}
