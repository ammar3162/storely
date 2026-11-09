import type { SupabaseClient } from '@supabase/supabase-js'
import { orgHasFeature } from '@/lib/planFeatures'

// ميزة "إدارة الموظفين": الباقة الشاملة/المتقدمة، أو إضافة hr_full سارية على الباقة الأساسية
// branchId = لفرع معيّن (إضافة الحضور ممكن تكون لفروع معيّنة بالباقات الجديدة)
export async function orgHasHrFeature(db: SupabaseClient, orgId: string, plan?: string | null, branchId?: string | null) {
  return orgHasFeature(db, orgId, 'hr', plan, branchId)
}

// إضافة سارية من متجر الإضافات (مثل cashier_closing) — للباقة الأساسية
export async function orgHasAddon(db: SupabaseClient, orgId: string, slug: string) {
  const { data } = await db.from('org_addon_subscriptions')
    .select('expires_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'active').eq('marketplace_addons.slug', slug)
  return ((data || []) as any[]).some(s => !s.expires_at || new Date(s.expires_at).getTime() > Date.now())
}
