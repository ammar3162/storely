import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { eligibleForSwitch, currentModules, projectSwitch, loadSwitchContext } from '@/lib/pricingSwitch'
import { CUSTOM_MODULE_ORDER, CUSTOM_MODULES, customModuleAmount } from '@/lib/planPricing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// اختيار المزايا بالأسعار الجديدة للمشتركين الحاليين (المالك فقط) — lib/pricingSwitch
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ success: true, show: false })
  const ctx = await loadSwitchContext(sb(), org_id)
  if (!ctx || !eligibleForSwitch(ctx.org.plan, ctx.owner.subscription_type, !!ctx.chosen)) return NextResponse.json({ success: true, show: false })
  const selected = currentModules(ctx.org.plan, ctx.addons, ctx.subs)
  const p = projectSwitch({ org: ctx.org, addons: ctx.addons, subs: ctx.subs, modules: selected, branches: ctx.branches, activeStaff: ctx.activeStaff })
  return NextResponse.json({
    success: true, show: true,
    orgName: ctx.org.name || '', branches: p.branches, renewsAt: ctx.owner.subscription_ends_at || null,
    current: p.current, selected,
    features: CUSTOM_MODULE_ORDER.map(slug => ({ slug, perBranch: CUSTOM_MODULES[slug].perBranch, amount: customModuleAmount(slug, p.branches) })),
  })
}

// POST { org_id, modules, preview? } — preview يرجع الفاتورة المتوقعة بدون حفظ
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const org_id = typeof body.org_id === 'string' ? body.org_id : ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ error: 'هذا الاختيار لمالك المنشأة' }, { status: 403 })
  const modules = Array.isArray(body.modules) ? CUSTOM_MODULE_ORDER.filter(s => body.modules.includes(s)) : []
  if (!modules.length) return NextResponse.json({ error: 'اختر ميزة واحدة على الأقل' }, { status: 400 })
  const db = sb()
  const ctx = await loadSwitchContext(db, org_id)
  if (!ctx) return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 })
  if (!eligibleForSwitch(ctx.org.plan, ctx.owner.subscription_type, !!ctx.chosen)) return NextResponse.json({ error: 'تم تسجيل اختيارك مسبقاً' }, { status: 409 })
  const p = projectSwitch({ org: ctx.org, addons: ctx.addons, subs: ctx.subs, modules, branches: ctx.branches, activeStaff: ctx.activeStaff })
  if (body.preview) return NextResponse.json({ success: true, current: p.current, projected: p.projected, outcome: p.outcome })
  const { error } = await db.from('pricing_switches').insert({
    org_id, modules: p.modules, branches: p.branches, current_monthly: p.current, new_monthly: p.projected, outcome: p.outcome, chosen_by: access.userId || null,
  } as any)
  if (error) return NextResponse.json({ error: 'تعذر حفظ اختيارك، حاول مرة أخرى' }, { status: 500 })
  return NextResponse.json({ success: true, current: p.current, projected: p.projected, outcome: p.outcome, renewsAt: ctx.owner.subscription_ends_at || null })
}
