import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'
import { monthlyBills } from '@/lib/orgBill'
import { adminPlanLabel, isCustomPlan } from '@/lib/planPricing'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// اختيارات الأسعار الجديدة (lib/pricingSwitch): كل مشترك مدفوع على باقة ثابتة، ومن اختار وفاتورته قبل/بعد
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  const [{ data: owners }, { data: switches }] = await Promise.all([
    db.from('profiles').select('org_id,full_name,phone,subscription_type,subscription_ends_at').eq('role', 'owner').eq('subscription_type', 'paid').not('org_id', 'is', null),
    db.from('pricing_switches').select('org_id,modules,branches,current_monthly,new_monthly,outcome,chosen_at,applied_at'),
  ])
  const sw = new Map(((switches || []) as any[]).map(s => [s.org_id, s]))
  const ownerRows = (owners || []) as any[]
  const ids = Array.from(new Set([...ownerRows.map(o => o.org_id), ...sw.keys()]))
  if (!ids.length) return NextResponse.json({ success: true, rows: [] })
  const { data: orgs } = await db.from('organizations')
    .select('id,name,plan,max_branches,locked_plan_monthly,billing_cycle,staff_included,discount_type,discount_value,discount_note,discount_until').in('id', ids)
  const orgList = (orgs || []) as any[]
  const bills = await monthlyBills(db, orgList)
  const ownerBy = new Map(ownerRows.map(o => [o.org_id, o]))
  // الظاهرين: اللي اختاروا (حتى لو انتقلوا) + المشتركين المدفوعين اللي باقي على باقة ثابتة
  const rows = orgList.filter(o => sw.has(o.id) || (ownerBy.has(o.id) && !isCustomPlan(o.plan))).map(o => {
    const s = sw.get(o.id), ow = ownerBy.get(o.id) || {}
    const status = !s ? 'pending' : s.applied_at ? (s.outcome === 'switch' ? 'applied' : 'kept') : s.outcome === 'switch' ? 'will_switch' : 'will_keep'
    return {
      org_id: o.id, name: o.name, plan: adminPlanLabel(o.plan, o.max_branches), owner: ow.full_name || null, phone: ow.phone || null,
      renews_at: ow.subscription_ends_at || null, bill_now: bills[o.id] ?? null,
      modules: s?.modules || [], branches: s?.branches || null, current_monthly: s ? Number(s.current_monthly) : null, new_monthly: s ? Number(s.new_monthly) : null,
      chosen_at: s?.chosen_at || null, applied_at: s?.applied_at || null, status,
    }
  })
  const order: Record<string, number> = { will_switch: 0, will_keep: 1, pending: 2, applied: 3, kept: 4 }
  rows.sort((a, b) => (order[a.status] - order[b.status]) || String(a.renews_at || '').localeCompare(String(b.renews_at || '')))
  return NextResponse.json({ success: true, rows })
}
