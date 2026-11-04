// الفاتورة الشهرية للمنشأة (الباقة + الإضافات السارية − الخصم) — نفس حساب صفحة الإضافات والأدمن
import type { SupabaseClient } from '@supabase/supabase-js'
import { billLines, planKeyOf, type BillingCycle } from '@/lib/planPricing'

import type { OrgDiscount } from '@/lib/planPricing'

type Org = { id: string; plan?: string | null; max_branches?: number | null; locked_plan_monthly?: number | null; billing_cycle?: string | null } & OrgDiscount

/** فاتورة المنشأة بالشهر: total = المجموع بعد الخصم، plan = الباقة، addons = الإضافات، discount = الخصم (موجب) */
export type OrgRevenue = { total: number; plan: number; addons: number; discount: number }

type AddonRow = { id: string; name: string; slug: string; monthly_price: number }
type SubRow = { org_id: string; addon_id: string; status: string; expires_at: string; quantity?: number | null; locked_price?: number | null }

/** يحسب فاتورة كل منشأة من بيانات جاهزة (بدون قاعدة) — السنوي يتحوّل لمقابله الشهري (÷ 12) */
export function computeOrgRevenue(orgs: Org[], addons: AddonRow[], subs: SubRow[], now = Date.now()): Record<string, OrgRevenue> {
  const out: Record<string, OrgRevenue> = {}
  for (const o of orgs) {
    const mine = subs.filter(s => s.org_id === o.id)
    const rows = addons.map(a => ({
      ...a, subscriptions: mine.filter(s => s.addon_id === a.id).map(s => ({ ...s, isValid: new Date(s.expires_at).getTime() > now })),
    }))
    const cycle: BillingCycle = o.billing_cycle === 'yearly' ? 'yearly' : 'monthly'
    const div = cycle === 'yearly' ? 12 : 1
    const { lines, total } = billLines(planKeyOf(o.plan, o.max_branches), cycle, rows as any, o.locked_plan_monthly, o)
    const plan = lines[0]?.amount || 0
    const discount = lines.filter(l => l.amount < 0).reduce((s, l) => s - l.amount, 0)
    const r = (n: number) => Math.round(n / div)
    out[o.id] = { total: r(total), plan: r(plan), addons: r(total + discount - plan), discount: r(discount) }
  }
  return out
}

/** فواتير عدة منشآت باستعلامين بس (لقائمة العملاء والإيراد بالأدمن) */
export async function orgRevenues(db: SupabaseClient, orgs: Org[]): Promise<Record<string, OrgRevenue>> {
  const ids = orgs.map(o => o.id)
  if (!ids.length) return {}
  const [{ data: addons }, { data: subs }] = await Promise.all([
    db.from('marketplace_addons').select('id,name,slug,monthly_price'),
    db.from('org_addon_subscriptions').select('org_id,addon_id,status,expires_at,quantity,locked_price').in('org_id', ids).eq('status', 'active'),
  ])
  return computeOrgRevenue(orgs, (addons || []) as AddonRow[], (subs || []) as SubRow[])
}

/** الفاتورة الشهرية (المجموع بس) لكل منشأة */
export async function monthlyBills(db: SupabaseClient, orgs: Org[]): Promise<Record<string, number>> {
  const r = await orgRevenues(db, orgs)
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.total]))
}

export async function monthlyBill(db: SupabaseClient, orgId: string) {
  const { data: org } = await db.from('organizations').select('id,plan,max_branches,locked_plan_monthly,discount_type,discount_value,discount_note,discount_until').eq('id', orgId).maybeSingle()
  if (!org) return 0
  return (await monthlyBills(db, [org as any]))[orgId] || 0
}
