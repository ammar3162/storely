import type { SupabaseClient } from '@supabase/supabase-js'

// ميزة "إدارة الموظفين": الباقة المتوسطة/المتقدمة، أو إضافة hr_full سارية على الباقة الأساسية
export async function orgHasHrFeature(db: SupabaseClient, orgId: string, plan?: string | null) {
  if (plan && plan !== 'basic') return true
  if (!plan) {
    const { data: org } = await db.from('organizations').select('plan').eq('id', orgId).single()
    if ((org as any)?.plan && (org as any).plan !== 'basic') return true
  }
  const { data } = await db.from('org_addon_subscriptions')
    .select('expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').eq('marketplace_addons.slug', 'hr_full')
  return ((data || []) as any[]).some(s => !s.expires_at || new Date(s.expires_at).getTime() > Date.now())
}
