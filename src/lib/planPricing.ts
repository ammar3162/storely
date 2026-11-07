// أسعار الباقات وحساب الفاتورة — مصدر واحد للوحة الإدارة (الفاتورة المرسلة) وحساب العميل (الإعدادات)
// الباقات القديمة (basic/pro/advanced) باقية للمشتركين قبل 2026-11 بأسعارهم وحدودهم بدون تغيير.
// الباقات الجديدة (essential/ops/full) سعرها لكل فرع: الفرع الأول + الفرع الإضافي × (عدد فروع الباقة − 1).
export type LegacyPlanKey = 'basic' | 'pro' | 'advanced'
export type NewPlanKey = 'essential' | 'ops' | 'full'
export type PlanKey = LegacyPlanKey | NewPlanKey
export type BillingCycle = 'monthly' | 'yearly'

export const NEW_PLANS: NewPlanKey[] = ['essential', 'ops', 'full']
export const LEGACY_PLANS: LegacyPlanKey[] = ['basic', 'pro', 'advanced']
export const isNewPlan = (plan: string | null | undefined): plan is NewPlanKey => NEW_PLANS.includes(plan as NewPlanKey)

// السنوي = الشهري × 12 بخصم 20%
export const YEARLY_FACTOR = 0.8
export const yearlyOf = (monthly: number) => Math.round(monthly * 12 * YEARLY_FACTOR)

export const PLAN_PRICING: Record<PlanKey, { label: string; monthly: number; yearly: number }> = {
  basic:     { label: 'الأساسية', monthly: 99,  yearly: 950 },
  pro:       { label: 'الشاملة', monthly: 249, yearly: 2390 },
  advanced:  { label: 'المتقدمة', monthly: 499, yearly: 4790 },
  essential: { label: 'الأساسية', monthly: 119, yearly: yearlyOf(119) },
  ops:       { label: 'التشغيل', monthly: 159, yearly: yearlyOf(159) },
  full:      { label: 'الكاملة', monthly: 219, yearly: yearlyOf(219) },
}

/** اسم الباقة للأدمن — يميّز القديمة عن الجديدة اللي بنفس الاسم */
export const adminPlanLabel = (plan: string | null | undefined, maxBranches?: number | null) =>
  planLabel(plan, maxBranches) + (isNewPlan(plan) ? '' : ' (قديمة)')

/**
 * أسعار الإضافات للباقات الجديدة — المشتركين القدامى يكملون بأسعار marketplace_addons (29/59/29…).
 * perBranch = السعر × عدد الفروع اللي اختارها (branch_ids). included = الباقات اللي فيها الإضافة أصلاً.
 */
export const NEW_ADDON_PRICES: Record<string, { monthly: number; perBranch: boolean; includedIn: NewPlanKey[] }> = {
  cashier_closing: { monthly: 40, perBranch: true,  includedIn: ['ops', 'full'] },
  hr_full:         { monthly: 69, perBranch: true,  includedIn: ['full'] },
  ai_tools:        { monthly: 15, perBranch: false, includedIn: ['full'] },
  profitability:   { monthly: 0,  perBranch: false, includedIn: ['essential', 'ops', 'full'] },
  extra_staff:     { monthly: 10, perBranch: false, includedIn: [] },
}

/** سعر الإضافة لمنشأة على باقة جديدة (null = يستخدم سعر الإضافة العادي) */
export function addonPriceFor(plan: string | null | undefined, slug: string): number | null {
  if (!isNewPlan(plan)) return null
  if (slug === 'extra_branch') return PLAN_CAPS[plan].branchPrice
  const p = NEW_ADDON_PRICES[slug]
  return p ? p.monthly : null
}

/** الإضافة مضمّنة بالباقة (ما تنباع لها) */
export function addonIncludedIn(plan: string | null | undefined, slug: string): boolean {
  if (isNewPlan(plan)) return !!NEW_ADDON_PRICES[slug]?.includedIn.includes(plan)
  return (plan === 'pro' || plan === 'advanced') && ['hr_full', 'profitability', 'ai_tools', 'cashier_closing'].includes(slug)
}

/**
 * الإضافات اللي تنعرض للمنشأة حسب باقتها: نشيل المضمّنة بالباقة، والجديدة تاخذ سعرها من NEW_ADDON_PRICES
 * (per_branch = السعر لكل فرع). الموردين بالباقات الجديدة مجاناً لين حدها، فما تنباع «مورد إضافي».
 */
export function addonsForPlan<T extends { slug: string; monthly_price: number | string }>(plan: string | null | undefined, addons: T[]): (T & { per_branch?: boolean })[] {
  return addons
    .filter(a => !addonIncludedIn(plan, a.slug))
    .filter(a => !(isNewPlan(plan) && a.slug === 'extra_suppliers'))
    .map(a => {
      const p = addonPriceFor(plan, a.slug)
      return p != null ? { ...a, monthly_price: p, per_branch: !!NEW_ADDON_PRICES[a.slug]?.perBranch } : a
    })
}

/** الإضافات اللي يقدر يختارها وقت التسجيل مع الباقة (غير المضمّنة فيها) */
export const SIGNUP_ADDONS = ['cashier_closing', 'hr_full', 'ai_tools'] as const
export const signupAddonsFor = (plan: string | null | undefined) => SIGNUP_ADDONS.filter(slug => !addonIncludedIn(plan, slug))
/** سعر إضافات التسجيل الشهري لعدد الفروع (لكل فرع × الفروع، أو مرة وحدة للمنشأة) */
export const signupAddonsMonthly = (plan: string | null | undefined, slugs: string[], branches: number) =>
  signupAddonsFor(plan).filter(s => slugs.includes(s))
    .reduce((t, s) => t + NEW_ADDON_PRICES[s].monthly * (NEW_ADDON_PRICES[s].perBranch ? Math.max(1, branches) : 1), 0)

/** الباقات الأعلى من نفس العائلة (طلب الترقية) — القديم يرقّى للقديمة، والانتقال للجديدة من الأدمن */
export function higherPlans(plan: string | null | undefined): PlanKey[] {
  const order: PlanKey[] = isNewPlan(plan) ? NEW_PLANS : LEGACY_PLANS
  const i = order.indexOf((plan || 'basic') as PlanKey)
  return i >= 0 ? order.slice(i + 1) : []
}

/** الباقة الأعلى (للترقية) */
export function nextPlanOf(plan: string | null | undefined): PlanKey | null {
  const order: PlanKey[] = isNewPlan(plan) ? NEW_PLANS : LEGACY_PLANS
  const i = order.indexOf((plan || 'basic') as PlanKey)
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null
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
  // الجديدة: لكل فرع 6 موظفين و15 مورد (staff/suppliers هنا = للفرع الواحد)
  essential: { branches: 1, maxBranches: 10, staff: 6, suppliers: 15, branchStaff: 6, branchSuppliers: 15, branchPrice: 30 },
  ops:       { branches: 1, maxBranches: 10, staff: 6, suppliers: 15, branchStaff: 6, branchSuppliers: 15, branchPrice: 40 },
  full:      { branches: 1, maxBranches: 10, staff: 6, suppliers: 15, branchStaff: 6, branchSuppliers: 15, branchPrice: 55 },
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

// الباقات الجديدة: الحد لكل فرع × فروع الباقة (baseBranches) — القديمة: حد ثابت للباقة
const perPlan = (plan: string | null | undefined, cap: number, baseBranches?: number | null) =>
  isNewPlan(plan) ? cap * Math.max(1, Number(baseBranches) || 1) : cap

/** حد موظفين المنشأة (قبل إضافة «موظف إضافي»): حد الباقة + موظفين كل فرع إضافي */
export function staffBase(plan: string | null | undefined, storedMax: number | null | undefined, extraBranches: number, baseBranches?: number | null): number {
  const c = PLAN_CAPS[planKeyOf(plan)]
  return keepUnlimited(storedMax, perPlan(plan, c.staff, baseBranches)) + Math.max(0, extraBranches) * c.branchStaff
}

/** حد موردين المنشأة (قبل إضافة «مورد إضافي») */
export function supplierBase(plan: string | null | undefined, storedMax: number | null | undefined, extraBranches: number, baseBranches?: number | null): number {
  const c = PLAN_CAPS[planKeyOf(plan)]
  return keepUnlimited(storedMax, perPlan(plan, c.suppliers, baseBranches)) + Math.max(0, extraBranches) * c.branchSuppliers
}

/** أقصى فروع يوصلها العميل بنفسه — المنشآت القديمة اللي باقتها فيها فروع أكثر تحتفظ فيها */
export function maxSelfServeBranches(plan: string | null | undefined, baseBranches: number | null | undefined): number {
  return Math.max(PLAN_CAPS[planKeyOf(plan)].maxBranches, Number(baseBranches) || 1)
}

/** سعر الفرع الإضافي الشهري حسب الباقة */
export const branchPriceFor = (plan: string | null | undefined) => PLAN_CAPS[planKeyOf(plan)].branchPrice

/**
 * سعر الباقة للمنشأة: المثبّت لها (مشترك قبل تغيير الأسعار / سعر خاص) أو سعر الباقة الحالي.
 * الباقات الجديدة: branches = فروع الباقة (organizations.max_branches) — الفرع الأول + الإضافي × الباقي.
 */
export function planPriceFor(plan: PlanKey, lockedMonthly?: number | string | null, branches?: number | null): { label: string; monthly: number; yearly: number } {
  const p = PLAN_PRICING[plan]
  const locked = Number(lockedMonthly) || 0
  if (locked > 0) return { label: p.label, monthly: locked, yearly: yearlyOf(locked) }
  if (!isNewPlan(plan)) return p
  const monthly = p.monthly + PLAN_CAPS[plan].branchPrice * (Math.max(1, Number(branches) || 1) - 1)
  return { label: p.label, monthly, yearly: yearlyOf(monthly) }
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
  if (plan === 'basic' || plan === 'pro' || plan === 'advanced' || isNewPlan(plan)) return plan as PlanKey
  const b = Number(maxBranches) || 1
  return b === 1 ? 'basic' : b <= 3 ? 'pro' : 'advanced'
}

type AddonSub = { isValid?: boolean; quantity?: number | null; locked_price?: number | string | null; branch_ids?: string[] | null }
// سعر وحدة الاشتراك: المثبّت له لو موجود، وإلا سعر الإضافة الحالي
export const unitPrice = (addonPrice: number | string, sub?: AddonSub | null) => Number(sub?.locked_price) > 0 ? Number(sub!.locked_price) : (Number(addonPrice) || 0)
type AddonRow = { name: string; slug: string; monthly_price: number | string; subscription?: AddonSub | null; subscriptions?: AddonSub[] }
export type BillLine = { label: string; amount: number }

// خصم خاص للمنشأة (من لوحة الإدارة): نسبة من الفاتورة كلها، أو مبلغ ثابت شهرياً (×12 بالسنوي) — لين تاريخ انتهائه لو محدد
export type OrgDiscount = { discount_type?: string | null; discount_value?: number | string | null; discount_note?: string | null; discount_until?: string | null }

/** الخصم الساري (أو null لو ما فيه/انتهى) — until = آخر يوم يشمله الخصم */
export function activeDiscount(d: OrgDiscount | null | undefined, now = new Date()): { type: 'percent' | 'amount'; value: number; note: string; until: string | null } | null {
  if (!d || (d.discount_type !== 'percent' && d.discount_type !== 'amount')) return null
  const value = Number(d.discount_value) || 0
  if (value <= 0) return null
  const until = d.discount_until ? String(d.discount_until).slice(0, 10) : null
  if (until && until < new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 10)) return null   // بتوقيت السعودية
  return { type: d.discount_type, value: d.discount_type === 'percent' ? Math.min(100, value) : value, note: String(d.discount_note || '').trim(), until }
}

/** branches = فروع الباقة (organizations.max_branches) — يأثر على الباقات الجديدة بس */
export function billLines(plan: PlanKey, cycle: BillingCycle, addons: AddonRow[], lockedPlanMonthly?: number | string | null, discount?: OrgDiscount | null, branches?: number | null): { lines: BillLine[]; total: number } {
  const p = planPriceFor(plan, lockedPlanMonthly, branches)
  const n = Math.max(1, Number(branches) || 1)
  const lines: BillLine[] = [{
    label: `اشتراك باقة "${p.label}"${isNewPlan(plan) && n > 1 && !(Number(lockedPlanMonthly) > 0) ? ` (${n} فروع)` : ''} (${cycle === 'yearly' ? 'سنوياً' : 'شهرياً'})`,
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
      // إضافة لكل فرع (الباقات الجديدة): السعر × عدد الفروع المختارة — القديمة كميتها 1
      const qty = Math.max(1, Number(active[0].quantity) || 1)
      lines.push({ label: qty > 1 ? `إضافة "${a.name}" (${qty} فروع × ${price} ر.س${months > 1 ? ' × 12 شهر' : ''})` : `إضافة "${a.name}" (${per})`, amount: price * qty * months })
    }
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const d = activeDiscount(discount)
  if (d && subtotal > 0) {
    const raw = d.type === 'percent' ? subtotal * d.value / 100 : d.value * (cycle === 'yearly' ? 12 : 1)
    const off = Math.min(subtotal, Math.round(raw))
    if (off > 0) lines.push({ label: `خصم${d.note ? ` "${d.note}"` : ''} (${d.type === 'percent' ? `${d.value}%` : `${d.value} ر.س${cycle === 'yearly' ? ' × 12 شهر' : ' شهرياً'}`})`, amount: -off })
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
