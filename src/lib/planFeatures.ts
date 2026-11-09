// مصدر واحد يحدد الميزات المتاحة للمنشأة: الباقة + الإضافات السارية (والتجربة المجانية: كل المميزات مفتوحة، والعدد حسب باقتها).
// القديمة: الشاملة (pro) والمتقدمة فيها كل الميزات، والأساسية تفتح كل ميزة بإضافتها من المتجر.
// الجديدة: الأساسية (الربحية) ← التشغيل (+الكاشير) ← الكاملة (كل شي). الإضافة ممكن تكون لفروع معيّنة (branch_ids).
// أي مكان يقفل/يفتح ميزة (API أو صفحة) لازم يمر من هنا — عشان ما يصير الكاشير مفتوح بصفحة ومقفل بصفحة.
import type { SupabaseClient } from '@supabase/supabase-js'

// الإضافة اللي تفتح كل ميزة على الأساسية
export const FEATURE_ADDONS = {
  // المخزون والمشتريات مفتوحة لكل الباقات — تنقفل بـ «ابنِ باقتك» (custom) لو ما اختارها
  inventory: ['mod_inventory'],
  purchases: ['mod_purchases'],
  cashier: ['cashier_closing'],
  hr: ['hr_full'],
  ai: ['ai_tools'],
  profitability: ['profitability'],
} as const
export type Feature = keyof typeof FEATURE_ADDONS
export type Features = Record<Feature, boolean>

const ALL: Feature[] = ['inventory', 'purchases', 'cashier', 'hr', 'ai', 'profitability']
// الميزات المضمّنة بكل باقة (بدون إضافات)
const PLAN_FEATURES: Record<string, Feature[]> = {
  pro: ALL, advanced: ALL, full: ALL,
  ops: ['inventory', 'purchases', 'cashier', 'profitability'],
  essential: ['inventory', 'purchases', 'profitability'],
  basic: ['inventory', 'purchases'],
  custom: ['profitability'],
}
// باقة غير معروفة = الأساسية القديمة (نفس السلوك القبل)
export const planIncludes = (plan: string | null | undefined, f: Feature) => (PLAN_FEATURES[plan || 'basic'] || PLAN_FEATURES.basic).includes(f)
const planHasAll = (plan: string | null | undefined) => ALL.every(f => planIncludes(plan, f))

export const FEATURE_LABEL: Record<Feature, string> = {
  inventory: 'المخزون والموردين',
  purchases: 'المشتريات والفواتير',
  cashier: 'إقفال الكاشير',
  hr: 'الحضور والرواتب',
  ai: 'الذكاء الاصطناعي',
  profitability: 'الربحية',
}

/** يحسب الميزات من الباقة وقائمة الإضافات السارية (slugs) — trial = تجربة مجانية سارية: كل الميزات */
export function featuresFrom(plan: string | null | undefined, activeAddons: string[], trial = false): Features {
  const out = {} as Features
  for (const f of ALL) out[f] = trial || planIncludes(plan, f) || FEATURE_ADDONS[f].some(slug => activeAddons.includes(slug))
  return out
}

/** الإضافة تشمل الفرع؟ branch_ids فاضي = كل الفروع (الإضافات القديمة) */
export const addonCoversBranch = (branchIds: string[] | null | undefined, branchId?: string | null) =>
  !branchId || !branchIds || branchIds.length === 0 || branchIds.includes(branchId)

/**
 * الإضافات السارية الحين (حالتها active وما انتهت).
 * branchId = الإضافات اللي تشمل هالفرع بس؛ بدونه = أي إضافة سارية (المنشأة فيها الميزة بفرع واحد على الأقل).
 */
export async function activeAddonSlugs(db: SupabaseClient, orgId: string, branchId?: string | null): Promise<string[]> {
  const { data } = await db.from('org_addon_subscriptions')
    .select('expires_at,branch_ids,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active')
  const now = Date.now()
  return ((data || []) as any[])
    .filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now)
    .filter(s => addonCoversBranch(s.branch_ids, branchId))
    .map(s => s.marketplace_addons?.slug).filter(Boolean)
}

/** ميزات المنشأة — branchId = ميزات هالفرع بالذات (الإضافات اللي لفروع معيّنة) */
export async function orgFeatures(db: SupabaseClient, orgId: string, plan?: string | null, branchId?: string | null): Promise<Features> {
  let p = plan
  if (p === undefined) {
    const { data: org } = await db.from('organizations').select('plan').eq('id', orgId).maybeSingle()
    p = (org as any)?.plan
  }
  // باقة فيها كل شي ما تحتاج تقرأ الإضافات
  if (planHasAll(p)) return featuresFrom(p, [])
  if (await orgOnTrial(db, orgId)) return featuresFrom(p, [], true)
  return featuresFrom(p, await activeAddonSlugs(db, orgId, branchId))
}

/** المنشأة بتجربتها المجانية الحين (حساب المالك trial وما انتهت) */
export async function orgOnTrial(db: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await db.from('profiles').select('subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
  return (data as any)?.subscription_type === 'trial' && !!(data as any)?.subscription_ends_at && new Date((data as any).subscription_ends_at).getTime() > Date.now()
}

/**
 * ميزات كل فرع (للواجهة) — للباقات اللي إضافاتها ممكن تكون لفروع معيّنة. استعلام واحد للإضافات.
 * باقة فيها كل شي أو تجربة: نفس الميزات لكل الفروع.
 */
export async function branchFeaturesMap(db: SupabaseClient, orgId: string, plan: string | null | undefined, branchIds: string[]): Promise<Record<string, Features>> {
  const out: Record<string, Features> = {}
  if (!branchIds.length) return out
  if (planHasAll(plan) || await orgOnTrial(db, orgId)) {
    const f = featuresFrom(plan, [], !planHasAll(plan))
    for (const id of branchIds) out[id] = f
    return out
  }
  const { data } = await db.from('org_addon_subscriptions')
    .select('expires_at,branch_ids,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active')
  const now = Date.now()
  const live = ((data || []) as any[]).filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now)
  for (const id of branchIds) out[id] = featuresFrom(plan, live.filter(s => addonCoversBranch(s.branch_ids, id)).map(s => s.marketplace_addons?.slug).filter(Boolean))
  return out
}

/** branchId = نتحقق إن الميزة مفعّلة لهالفرع بالذات */
export async function orgHasFeature(db: SupabaseClient, orgId: string, f: Feature, plan?: string | null, branchId?: string | null) {
  let p = plan
  if (p === undefined) {
    const { data: org } = await db.from('organizations').select('plan').eq('id', orgId).maybeSingle()
    p = (org as any)?.plan ?? null
  }
  // الباقة فيها الميزة: بدون استعلامات زيادة (أغلب الطلبات — مثل المخزون لكل الباقات الثابتة)
  if (planIncludes(p, f)) return true
  return (await orgFeatures(db, orgId, p, branchId))[f]
}

/** رسالة موحّدة لما الميزة مقفلة — forBranch = مفعّلة بفروع ثانية بس */
export function lockedMessage(f: Feature, forBranch = false) {
  return forBranch
    ? `ميزة ${FEATURE_LABEL[f]} غير مفعّلة لهذا الفرع — يمكن للمالك إضافتها للفرع من صفحة الإضافات`
    : `ميزة ${FEATURE_LABEL[f]} غير مشمولة بباقتك — أضفها من صفحة الإضافات أو رقّ باقتك`
}

/** يتحقق من الميزة للفرع ويرجّع رسالة القفل المناسبة (null = مسموح) */
export async function branchFeatureError(db: SupabaseClient, orgId: string, f: Feature, plan: string | null | undefined, branchId?: string | null): Promise<string | null> {
  if (await orgHasFeature(db, orgId, f, plan, branchId)) return null
  const elsewhere = !!branchId && await orgHasFeature(db, orgId, f, plan)
  return lockedMessage(f, elsewhere)
}
