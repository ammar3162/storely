// مصدر واحد يحدد الميزات المتاحة للمنشأة: الباقة + الإضافات السارية.
// المتوسطة (pro) والمتقدمة فيها كل الميزات، والأساسية تفتح كل ميزة بإضافتها من المتجر.
// أي مكان يقفل/يفتح ميزة (API أو صفحة) لازم يمر من هنا — عشان ما يصير الكاشير مفتوح بصفحة ومقفل بصفحة.
import type { SupabaseClient } from '@supabase/supabase-js'

export const FEATURE_ADDON = {
  cashier: 'cashier_closing',
  hr: 'hr_full',
  ai: 'ai_tools',
  profitability: 'profitability',
} as const
export type Feature = keyof typeof FEATURE_ADDON
export type Features = Record<Feature, boolean>

const FULL_PLANS = ['pro', 'advanced']

export const FEATURE_LABEL: Record<Feature, string> = {
  cashier: 'إقفال الكاشير',
  hr: 'إدارة الموظفين الكاملة',
  ai: 'الذكاء الاصطناعي',
  profitability: 'الربحية',
}

/** يحسب الميزات من الباقة وقائمة الإضافات السارية (slugs) */
export function featuresFrom(plan: string | null | undefined, activeAddons: string[]): Features {
  const full = FULL_PLANS.includes(plan || 'basic')
  const out = {} as Features
  for (const f of Object.keys(FEATURE_ADDON) as Feature[]) out[f] = full || activeAddons.includes(FEATURE_ADDON[f])
  return out
}

/** الإضافات السارية الحين (حالتها active وما انتهت) */
export async function activeAddonSlugs(db: SupabaseClient, orgId: string): Promise<string[]> {
  const { data } = await db.from('org_addon_subscriptions')
    .select('expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active')
  const now = Date.now()
  return ((data || []) as any[])
    .filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now)
    .map(s => s.marketplace_addons?.slug).filter(Boolean)
}

export async function orgFeatures(db: SupabaseClient, orgId: string, plan?: string | null): Promise<Features> {
  let p = plan
  if (p === undefined) {
    const { data: org } = await db.from('organizations').select('plan').eq('id', orgId).maybeSingle()
    p = (org as any)?.plan
  }
  // الباقة الكاملة ما تحتاج تقرأ الإضافات
  if (FULL_PLANS.includes(p || 'basic')) return featuresFrom(p, [])
  return featuresFrom(p, await activeAddonSlugs(db, orgId))
}

export async function orgHasFeature(db: SupabaseClient, orgId: string, f: Feature, plan?: string | null) {
  return (await orgFeatures(db, orgId, plan))[f]
}

/** رسالة موحّدة لما الميزة مقفلة */
export function lockedMessage(f: Feature) {
  return `ميزة ${FEATURE_LABEL[f]} متاحة بالباقة المتوسطة أو المتقدمة، أو بإضافة «${FEATURE_LABEL[f]}» من صفحة الإضافات`
}
