// أسعار الباقات وحساب الفاتورة — مصدر واحد للوحة الإدارة (الفاتورة المرسلة) وحساب العميل (الإعدادات)
export type PlanKey = 'basic' | 'pro' | 'advanced'
export type BillingCycle = 'monthly' | 'yearly'

export const PLAN_PRICING: Record<PlanKey, { label: string; monthly: number; yearly: number }> = {
  basic:    { label: 'الأساسية', monthly: 99,  yearly: 950 },
  pro:      { label: 'المتوسطة', monthly: 249, yearly: 2390 },
  advanced: { label: 'المتقدمة', monthly: 399, yearly: 3830 },
}

// إضافات تنباع بالوحدة (السعر × الكمية)
export const QTY_ADDON_SLUGS = ['extra_branch', 'extra_staff', 'extra_suppliers']

export function planKeyOf(plan: string | null | undefined, maxBranches?: number | null): PlanKey {
  if (plan === 'basic' || plan === 'pro' || plan === 'advanced') return plan
  const b = Number(maxBranches) || 1
  return b === 1 ? 'basic' : b <= 3 ? 'pro' : 'advanced'
}

type AddonSub = { isValid?: boolean; quantity?: number | null }
type AddonRow = { name: string; slug: string; monthly_price: number | string; subscription?: AddonSub | null; subscriptions?: AddonSub[] }
export type BillLine = { label: string; amount: number }

export function billLines(plan: PlanKey, cycle: BillingCycle, addons: AddonRow[]): { lines: BillLine[]; total: number } {
  const p = PLAN_PRICING[plan]
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
    const price = Number(a.monthly_price) || 0
    if (QTY_ADDON_SLUGS.includes(a.slug)) {
      const qty = active.reduce((s, x) => s + Math.max(1, Number(x.quantity) || 1), 0)
      lines.push({ label: `إضافة "${a.name}" (${qty} × ${price} ر.س${months > 1 ? ' × 12 شهر' : ''})`, amount: qty * price * months })
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
