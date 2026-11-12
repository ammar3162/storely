import { notifyInsert } from '@/lib/notify'
// انتقال المشتركين الحاليين للأسعار الجديدة (2026-11-08، قرار المالك):
// أول ما يدخل المالك (اشتراك مدفوع على باقة قديمة أو جاهزة) تطلع له رسالة شكر ويختار المزايا اللي يحتاجها.
// الاختيار يُطبَّق مع تجديد اشتراكه القادم (activate-user) بسعره الجديد، حتى لو أعلى (قرار المالك 2026-11-09).
import type { SupabaseClient } from '@supabase/supabase-js'
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, PLAN_CAPS, addonIncludedIn, isCustomPlan } from '@/lib/planPricing'
import { computeOrgRevenue } from '@/lib/orgBill'
import { changeOrgPlan } from '@/lib/changePlan'

type Org = { id: string; name?: string | null; plan?: string | null; max_branches?: number | null; locked_plan_monthly?: number | null; billing_cycle?: string | null; staff_included?: number | null; discount_type?: string | null; discount_value?: number | string | null; discount_note?: string | null; discount_until?: string | null }
type Addon = { id: string; name: string; slug: string; monthly_price: number }
type Sub = { org_id: string; addon_id: string; status: string; expires_at: string; quantity?: number | null; locked_price?: number | null }

const FAR = '2999-01-01T00:00:00Z'   // للحساب فقط: الاشتراك المتوقع ساري

export type BranchMap = Record<string, string[]>
/**
 * فروع كل ميزة (للمنشآت متعددة الفروع): يرجع لكل ميزة «لكل فرع» مختارة قائمة فروعها النشطة.
 * ميزة بدون قائمة (أو كل قائمتها فروع مقفلة) = كل الفروع النشطة. الفروع اللي مو من المنشأة تنشال.
 */
export function resolveBranchMap(raw: unknown, modules: string[], activeIds: string[]): BranchMap {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const out: BranchMap = {}
  for (const slug of modules) {
    if (!CUSTOM_MODULES[slug]?.perBranch) continue
    const ids = Array.isArray(src[slug]) ? (src[slug] as unknown[]).filter((x): x is string => typeof x === 'string' && activeIds.includes(x)) : []
    out[slug] = ids.length ? Array.from(new Set(ids)) : [...activeIds]
  }
  return out
}
/** للحفظ: نخزّن بس المزايا اللي ما تشمل كل الفروع (الباقي = كل الفروع) */
export const compactBranchMap = (map: BranchMap, activeIds: string[]): BranchMap | null => {
  const out: BranchMap = {}
  for (const [slug, ids] of Object.entries(map)) if (ids.length < activeIds.length) out[slug] = ids
  return Object.keys(out).length ? out : null
}

/** يظهر له الاختيار؟ مالك باشتراك مدفوع على باقة غير «ابنِ باقتك» وما اختار قبل */
export function eligibleForSwitch(plan: string | null | undefined, subscriptionType: string | null | undefined, alreadyChosen: boolean): boolean {
  return subscriptionType === 'paid' && !isCustomPlan(plan) && !alreadyChosen
}

/** المزايا اللي عنده الحين — تكون محددة مسبقاً في الاختيار */
export function currentModules(plan: string | null | undefined, addons: Addon[], subs: Sub[], now = Date.now()): string[] {
  const live = new Set(subs.filter(s => s.status === 'active' && new Date(s.expires_at).getTime() > now).map(s => addons.find(a => a.id === s.addon_id)?.slug).filter(Boolean) as string[])
  return CUSTOM_MODULE_ORDER.filter(slug => addonIncludedIn(plan, slug) || live.has(slug))
}

/** الفاتورة الشهرية الحالية والمتوقعة بعد الاختيار (السنوي يتحوّل لمقابله الشهري) */
export function projectSwitch(input: { org: Org; addons: Addon[]; subs: Sub[]; modules: string[]; branches: number; activeStaff: number; activeSuppliers?: number; counts?: Record<string, number>; now?: number }) {
  const { org, addons, subs } = input
  const now = input.now ?? Date.now()
  const branches = Math.max(1, Math.min(10, Math.round(Number(input.branches) || 1)))
  const modules = CUSTOM_MODULE_ORDER.filter(s => input.modules.includes(s))
  // عدد فروع كل ميزة (افتراضياً كل الفروع)
  const qtyOf = (slug: string) => Math.max(1, Math.min(branches, Math.round(Number(input.counts?.[slug]) || branches)))
  // الفاتورة الحالية: الاشتراكات الفعّالة بس (الملغاة تبقى صفوفها بالقاعدة) — نفس حساب orgRevenues
  const activeSubs = subs.filter(s => s.status === 'active')
  const current = computeOrgRevenue([org], addons, activeSubs, now)[org.id].total

  // بعد الانتقال: الخدمات المختارة + الموظفين/الموردين الإضافيين اللي يحتاجهم فعلاً فوق المشمول بـ«ابنِ باقتك»
  // (6 موظفين و15 مورد لكل فرع). اللي اشتراها على الباقة القديمة (3 موظفين مشمولة مثلاً) ما تنحسب لو صارت مشمولة.
  const extraStaff = Math.max(0, Math.round(Number(input.activeStaff) || 0) - PLAN_CAPS.custom.staff * branches)
  const ownedSuppliers = subs.filter(s => s.status === 'active' && new Date(s.expires_at).getTime() > now && addons.find(a => a.id === s.addon_id)?.slug === 'extra_suppliers').reduce((t, s) => t + (Number(s.quantity) || 0), 0)
  const extraSuppliers = input.activeSuppliers == null ? ownedSuppliers : Math.min(ownedSuppliers, Math.max(0, Math.round(Number(input.activeSuppliers) || 0) - PLAN_CAPS.custom.suppliers * branches))
  const extraRow = (slug: string, quantity: number): Sub[] => quantity > 0 ? [{ org_id: org.id, addon_id: addons.find(a => a.slug === slug)?.id || slug, status: 'active', expires_at: FAR, quantity, locked_price: null }] : []
  const projectedSubs: Sub[] = [
    ...modules.map(slug => ({ org_id: org.id, addon_id: addons.find(a => a.slug === slug)?.id || slug, status: 'active', expires_at: FAR, quantity: CUSTOM_MODULES[slug].perBranch ? qtyOf(slug) : 1, locked_price: null })),
    ...extraRow('extra_staff', extraStaff),
    ...extraRow('extra_suppliers', extraSuppliers),
  ]
  const projectedAddons = [...addons, ...CUSTOM_MODULE_ORDER.filter(s => !addons.some(a => a.slug === s)).map(s => ({ id: s, name: s, slug: s, monthly_price: 0 }))]
  const projectedOrg: Org = { ...org, plan: 'custom', max_branches: branches, locked_plan_monthly: null, staff_included: null }
  const projected = modules.length ? computeOrgRevenue([projectedOrg], projectedAddons, projectedSubs, now)[org.id].total : current
  // 2026-11-09 (قرار المالك): من يختار خدماته تتفعّل له تلقائياً عند التجديد بسعرها الجديد، حتى لو أعلى من فاتورته الحالية
  const outcome: 'switch' | 'keep' = modules.length ? 'switch' : 'keep'
  return { current, projected, outcome, branches, modules, extraStaff, extraSuppliers }
}

/** كل اللي تحتاجه صفحة الاختيار من القاعدة */
export async function loadSwitchContext(db: SupabaseClient, orgId: string) {
  const [{ data: org }, { data: owner }, { data: addons }, { data: subs }, { data: branchRows }, { count: staffCount }, { data: chosen }, { count: supplierCount }] = await Promise.all([
    db.from('organizations').select('id,name,plan,max_branches,locked_plan_monthly,billing_cycle,staff_included,discount_type,discount_value,discount_note,discount_until').eq('id', orgId).maybeSingle(),
    db.from('profiles').select('subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('marketplace_addons').select('id,name,slug,monthly_price'),
    db.from('org_addon_subscriptions').select('org_id,addon_id,status,expires_at,quantity,locked_price').eq('org_id', orgId),
    db.from('branches').select('id,name').eq('org_id', orgId).eq('is_active', true).order('created_at'),
    db.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
    db.from('pricing_switches').select('modules,branch_map,outcome,chosen_at,applied_at').eq('org_id', orgId).maybeSingle(),
    db.from('suppliers').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
  ])
  if (!org) return null
  return {
    org: org as Org, owner: (owner || {}) as { subscription_type?: string | null; subscription_ends_at?: string | null },
    addons: (addons || []) as Addon[], subs: (subs || []) as Sub[],
    branches: Math.max(1, (branchRows || []).length), activeStaff: staffCount || 0, activeSuppliers: supplierCount || 0,
    branchList: ((branchRows || []) as { id: string; name: string | null }[]).map(b => ({ id: b.id, name: b.name || '' })),
    chosen: chosen as { modules: string[]; branch_map: BranchMap | null; outcome: string; chosen_at: string; applied_at: string | null } | null,
  }
}

/**
 * يطبّق الاختيار مع التجديد (يناديه activate-user بعد تمديد الاشتراك): ينقل المنشأة لـ «ابنِ باقتك»
 * بالمزايا المختارة لفروعها النشطة، ويلغي المزايا اللي ما اختارها. المطبّق قبل: ما يسوي شي.
 * يُنادى أيضاً من لوحة الأدمن («طبّق الآن») بتاريخ انتهاء الاشتراك الحالي بدون تجديد.
 */
export async function applyPricingSwitch(db: SupabaseClient, orgId: string, endsAt: string) {
  const ctx = await loadSwitchContext(db, orgId)
  if (!ctx?.chosen || ctx.chosen.applied_at || !ctx.chosen.modules?.length || isCustomPlan(ctx.org.plan)) return { applied: false as const }
  // نعيد الحساب وقت التجديد بحالة المنشأة الحين (الفروع النشطة والإضافات) — مهما كانت النتيجة وقت الاختيار:
  // (الفروع النشطة الحين، وفروع كل خدمة) — والانتقال يصير دايماً ما دام اختار خدمة
  const activeIds = ctx.branchList.map(b => b.id)
  const map = resolveBranchMap(ctx.chosen.branch_map, ctx.chosen.modules, activeIds)
  const counts = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length]))
  const p = projectSwitch({ org: ctx.org, addons: ctx.addons, subs: ctx.subs, modules: ctx.chosen.modules, branches: ctx.branches, activeStaff: ctx.activeStaff, activeSuppliers: ctx.activeSuppliers, counts })
  const nowIso = new Date().toISOString()
  if (p.outcome !== 'switch') {
    // يبقى على باقته؛ نحدّث الأرقام بس ونخلي الاختيار مفتوح للتجديد الجاي (ما نقفله)
    await db.from('pricing_switches').update({ outcome: 'keep', current_monthly: p.current, new_monthly: p.projected, branches: p.branches } as any).eq('org_id', orgId)
    return { applied: false as const, kept: true, current: p.current, projected: p.projected }
  }
  const br = p.branches
  const res = await changeOrgPlan(db, orgId, { planName: 'custom', maxBranches: br, maxStaff: PLAN_CAPS.custom.staff * br, maxSuppliers: PLAN_CAPS.custom.suppliers * br })
  if (!res.ok) return { applied: false as const, error: res.error }
  const bySlug = new Map(ctx.addons.map(a => [a.slug, a.id]))
  for (const slug of CUSTOM_MODULE_ORDER) {
    const addonId = bySlug.get(slug)
    if (!addonId) continue
    const existing = ctx.subs.find(s => s.addon_id === addonId)
    if (p.modules.includes(slug)) {
      const ids = map[slug]
      // ميزة لبعض الفروع: الكمية = عددها والصلاحية تنفتح لها بس (branch_ids)؛ كل الفروع = بدون قائمة
      const partial = !!ids && ids.length < activeIds.length
      const row = { status: 'active', quantity: CUSTOM_MODULES[slug].perBranch ? (ids?.length || br) : 1, expires_at: endsAt, locked_price: null, branch_ids: partial ? ids : null, cancelled_at: null }
      if (existing) await db.from('org_addon_subscriptions').update(row as any).eq('org_id', orgId).eq('addon_id', addonId)
      else await db.from('org_addon_subscriptions').insert({ org_id: orgId, addon_id: addonId, ...row } as any)
    } else if (existing?.status === 'active') {
      await db.from('org_addon_subscriptions').update({ status: 'cancelled', cancelled_at: nowIso } as any).eq('org_id', orgId).eq('addon_id', addonId)
    }
  }
  // الموظفين/الموردين الإضافيين: الكمية = اللي يحتاجه فوق المشمول بالضبط (ولو صفر تنلغي)
  for (const [slug, qty] of [['extra_staff', p.extraStaff], ['extra_suppliers', p.extraSuppliers]] as const) {
    const id = bySlug.get(slug)
    if (!id) continue
    const ex = ctx.subs.find(s => s.addon_id === id && s.status === 'active')
    if (qty > 0) await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: id, status: 'active', quantity: qty, expires_at: endsAt, locked_price: null, cancelled_at: null } as any, { onConflict: 'org_id,addon_id' })
    else if (ex) await db.from('org_addon_subscriptions').update({ status: 'cancelled', cancelled_at: nowIso } as any).eq('org_id', orgId).eq('addon_id', id)
  }
  await db.from('pricing_switches').update({ outcome: 'switch', applied_at: nowIso, current_monthly: p.current, new_monthly: p.projected, branches: br } as any).eq('org_id', orgId)
  await notifyInsert(db, { org_id: orgId, type: 'success', read: false, title: 'تم تطبيق اختيارك للمزايا', message: `بدأت فاتورتك الجديدة: ${p.projected} ⃁ شهرياً للمزايا التي اخترتها.` } as any)
  return { applied: true as const, monthly: p.projected }
}
