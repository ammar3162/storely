// أسعار الباقات وحساب الفاتورة — مصدر واحد للوحة الإدارة (الفاتورة المرسلة) وحساب العميل (الإعدادات)
export type PlanKey = 'basic' | 'pro' | 'advanced'
export type BillingCycle = 'monthly' | 'yearly'

export const PLAN_PRICING: Record<PlanKey, { label: string; monthly: number; yearly: number }> = {
  basic:    { label: 'الأساسية', monthly: 99,  yearly: 950 },
  pro:      { label: 'المتوسطة', monthly: 249, yearly: 2390 },
  advanced: { label: 'المتقدمة', monthly: 499, yearly: 4790 },
}

// السنوي = الشهري × 12 بخصم 20%
export const yearlyOf = (monthly: number) => Math.round(monthly * 12 * 0.8)

/** سعر الباقة للمنشأة: المثبّت لها (مشترك قبل تغيير الأسعار) أو سعر الباقة الحالي */
export function planPriceFor(plan: PlanKey, lockedMonthly?: number | string | null): { label: string; monthly: number; yearly: number } {
  const p = PLAN_PRICING[plan]
  const locked = Number(lockedMonthly) || 0
  return locked > 0 ? { label: p.label, monthly: locked, yearly: yearlyOf(locked) } : p
}

// إضافات تنباع بالوحدة (السعر × الكمية) — المنيو: الكمية = عدد الفروع المشتركة
export const QTY_ADDON_SLUGS = ['extra_branch', 'extra_staff', 'extra_suppliers', 'online_menu']

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
    // الإضافات تتجدد مع الباقة: بالباقة السنوية = سعرها الشهري × 12
    const months = cycle === 'yearly' ? 12 : 1
    const per = cycle === 'yearly' ? 'سنوياً' : 'شهرياً'
    const price = unitPrice(a.monthly_price, active[0])
    if (QTY_ADDON_SLUGS.includes(a.slug)) {
      const qty = active.reduce((s, x) => s + Math.max(1, Number(x.quantity) || 1), 0)
      const amount = active.reduce((s, x) => s + Math.max(1, Number(x.quantity) || 1) * unitPrice(a.monthly_price, x), 0)
      const same = active.every(x => unitPrice(a.monthly_price, x) === price)
      lines.push({ label: `إضافة "${a.name}" (${same ? `${qty} × ${price} ر.س` : `${qty} وحدات`}${months > 1 ? ' × 12 شهر' : ''})`, amount: amount * months })
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
