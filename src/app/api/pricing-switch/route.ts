import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { eligibleForSwitch, currentModules, projectSwitch, loadSwitchContext, resolveBranchMap, compactBranchMap } from '@/lib/pricingSwitch'
import { CUSTOM_MODULE_ORDER, CUSTOM_MODULES, customModuleAmount } from '@/lib/planPricing'
import { uncoveredBranches, uncoveredMessage } from '@/lib/branchCoverage'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// اختيار المزايا بالأسعار الجديدة للمشتركين الحاليين (المالك فقط) — lib/pricingSwitch
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ success: true, show: false })
  const ctx = await loadSwitchContext(sb(), org_id)
  if (!ctx || !eligibleForSwitch(ctx.org.plan, ctx.owner.subscription_type, !!ctx.chosen)) {
    // اختار قبل: نرجّع اختياره (للإعدادات) بدون إظهار الرسالة
    const chosen = ctx?.chosen ? { modules: ctx.chosen.modules, outcome: ctx.chosen.outcome, applied: !!ctx.chosen.applied_at } : null
    return NextResponse.json({ success: true, show: false, chosen })
  }
  const selected = currentModules(ctx.org.plan, ctx.addons, ctx.subs)
  const p = projectSwitch({ org: ctx.org, addons: ctx.addons, subs: ctx.subs, modules: selected, branches: ctx.branches, activeStaff: ctx.activeStaff })
  return NextResponse.json({
    success: true, show: true,
    orgName: ctx.org.name || '', branches: p.branches, renewsAt: ctx.owner.subscription_ends_at || null,
    current: p.current, selected,
    // منشأة بأكثر من فرع: يختار لكل ميزة فروعها
    branchList: ctx.branchList.length > 1 ? ctx.branchList : [],
    features: CUSTOM_MODULE_ORDER.map(slug => ({ slug, perBranch: CUSTOM_MODULES[slug].perBranch, amount: customModuleAmount(slug, p.branches) })),
  })
}

// POST { org_id, modules, branch_map?, preview? } — preview يرجع الفاتورة المتوقعة بدون حفظ
// branch_map = { slug: [branch_id...] } لمزايا «لكل فرع» — بدونها = كل الفروع النشطة
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const org_id = typeof body.org_id === 'string' ? body.org_id : ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ error: 'هذا الاختيار لمالك المنشأة' }, { status: 403 })
  const modules = Array.isArray(body.modules) ? CUSTOM_MODULE_ORDER.filter(s => body.modules.includes(s)) : []
  if (!modules.length) return NextResponse.json({ error: 'اختر خدمة واحدة على الأقل' }, { status: 400 })
  const db = sb()
  const ctx = await loadSwitchContext(db, org_id)
  if (!ctx) return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 })
  if (!eligibleForSwitch(ctx.org.plan, ctx.owner.subscription_type, !!ctx.chosen)) return NextResponse.json({ error: 'تم تسجيل اختيارك مسبقاً' }, { status: 409 })
  const activeIds = ctx.branchList.map(b => b.id)
  const map = resolveBranchMap(body.branch_map, modules, activeIds)
  const counts = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length]))
  const p = projectSwitch({ org: ctx.org, addons: ctx.addons, subs: ctx.subs, modules, branches: ctx.branches, activeStaff: ctx.activeStaff, counts })
  if (body.preview) return NextResponse.json({ success: true, current: p.current, projected: p.projected, outcome: p.outcome })
  // كل فرع نشط لازم يكون عليه خدمة واحدة على الأقل (ما فيه فرع مجاني)
  const missing = uncoveredBranches(activeIds, modules.map(slug => ({ slug, branchIds: map[slug] && map[slug].length < activeIds.length ? map[slug] : null })))
  if (missing.length) return NextResponse.json({ error: uncoveredMessage(missing.map(id => ctx.branchList.find(b => b.id === id)?.name || 'فرع')), code: 'branch_without_service' }, { status: 400 })
  const { error } = await db.from('pricing_switches').insert({
    org_id, modules: p.modules, branch_map: compactBranchMap(map, activeIds), branches: p.branches, current_monthly: p.current, new_monthly: p.projected, outcome: p.outcome, chosen_by: access.userId || null,
  } as any)
  if (error) return NextResponse.json({ error: 'تعذر حفظ اختيارك، حاول مرة أخرى' }, { status: 500 })
  return NextResponse.json({ success: true, current: p.current, projected: p.projected, outcome: p.outcome, renewsAt: ctx.owner.subscription_ends_at || null })
}
