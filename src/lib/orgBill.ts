// الفاتورة الشهرية للمنشأة (الباقة + الإضافات السارية) — نفس حساب صفحة الإضافات والأدمن
import type { SupabaseClient } from '@supabase/supabase-js'
import { billLines, planKeyOf } from '@/lib/planPricing'

type Org = { id: string; plan?: string | null; max_branches?: number | null; locked_plan_monthly?: number | null }

/** فواتير عدة منشآت باستعلامين بس (لقائمة العملاء بالأدمن) */
export async function monthlyBills(db: SupabaseClient, orgs: Org[]): Promise<Record<string, number>> {
  const ids = orgs.map(o => o.id)
  if (!ids.length) return {}
  const [{ data: addons }, { data: subs }] = await Promise.all([
    db.from('marketplace_addons').select('id,name,slug,monthly_price'),
    db.from('org_addon_subscriptions').select('org_id,addon_id,status,expires_at,quantity,locked_price').in('org_id', ids).eq('status', 'active'),
  ])
  const now = Date.now()
  const out: Record<string, number> = {}
  for (const o of orgs) {
    const mine = ((subs || []) as any[]).filter(s => s.org_id === o.id)
    const rows = ((addons || []) as any[]).map(a => ({
      ...a, subscriptions: mine.filter(s => s.addon_id === a.id).map(s => ({ ...s, isValid: new Date(s.expires_at).getTime() > now })),
    }))
    out[o.id] = billLines(planKeyOf(o.plan, o.max_branches), 'monthly', rows, o.locked_plan_monthly).total
  }
  return out
}

export async function monthlyBill(db: SupabaseClient, orgId: string) {
  const { data: org } = await db.from('organizations').select('id,plan,max_branches,locked_plan_monthly').eq('id', orgId).maybeSingle()
  if (!org) return 0
  return (await monthlyBills(db, [org as any]))[orgId] || 0
}
