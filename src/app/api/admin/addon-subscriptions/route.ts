import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { syncBranchesToLimit } from '@/lib/branchLimit'
import { activateAddon } from '@/lib/addonActivation'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { org_id, addon_id, org_name, addon_name, quantity, branch_ids } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const r = await activateAddon(sb(), { orgId: org_id, addonId: addon_id, quantity, branchIds: Array.isArray(branch_ids) ? branch_ids : null })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  await logAdminAction(admin, 'activate_addon', org_id, org_name || null, { addon_id, addon_name, expires_at: r.expiresAt, quantity: r.quantity, prorated_amount: r.proratedAmount, ...(r.branchIds ? { branch_ids: r.branchIds } : {}) })
  return NextResponse.json({ success: true, expiresAt: r.expiresAt, proratedAmount: r.proratedAmount, proratedDays: r.proratedDays })
}

export async function DELETE(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { org_id, addon_id, org_name, addon_name } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const supabase = sb()
  const { data: existingSub } = await supabase.from('org_addon_subscriptions').select('id,quantity').eq('org_id', org_id).eq('addon_id', addon_id).maybeSingle()
  const existingSubId = (existingSub as any)?.id
  const existingQty = Math.max(1, (existingSub as any)?.quantity || 1)

  const { error } = await supabase.from('org_addon_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
    .eq('org_id', org_id).eq('addon_id', addon_id)

  if (error) return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 })

  const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
  const slug = (addonRow as any)?.slug
  if (slug === 'extra_branch') {
    await syncBranchesToLimit(supabase, org_id)
  } else if (slug === 'extra_staff') {
    const { data: org } = await supabase.from('organizations').select('max_staff').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_staff: Math.max(0, ((org as any)?.max_staff || existingQty) - existingQty) } as any).eq('id', org_id)
    if (existingSubId) {
      await supabase.from('staff_members').update({ is_active: false, hidden_from_list: true } as any).eq('addon_subscription_id', existingSubId)
    }
  } else if (slug === 'extra_suppliers') {
    const { data: org } = await supabase.from('organizations').select('max_suppliers').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_suppliers: Math.max(0, ((org as any)?.max_suppliers || existingQty) - existingQty) } as any).eq('id', org_id)
    if (existingSubId) {
      await supabase.from('suppliers').update({ is_active: false } as any).eq('addon_subscription_id', existingSubId)
    }
  }

  await logAdminAction(admin, 'cancel_addon', org_id, org_name || null, { addon_id, addon_name })

  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const org_id = searchParams.get('org_id')
  if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

  const supabase = sb()
  const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
  const orgPlan = (org as any)?.plan || 'basic'
  const INCLUDED_FROM_STANDARD = ['hr_full', 'profitability', 'ai_tools', 'cashier_closing']

  const { data: addonsRaw } = await supabase.from('marketplace_addons').select('*').eq('is_active', true).order('sort_order')
  const addons = orgPlan === 'basic'
    ? addonsRaw
    : (addonsRaw || []).filter((a: any) => !INCLUDED_FROM_STANDARD.includes(a.slug))
  const { data: subs } = await supabase.from('org_addon_subscriptions').select('addon_id,status,expires_at,quantity,branch_ids,locked_price').eq('org_id', org_id)
  const { data: branches } = await supabase.from('branches').select('id,name').eq('org_id', org_id).eq('is_active', true).order('created_at')

  const now = new Date()
  const subsMap: Record<string, any> = {}
  for (const s of subs || []) subsMap[(s as any).addon_id] = s

  const result = (addons || []).map((a: any) => {
    const s = subsMap[a.id]
    return { ...a, subscription: s ? { ...s, isValid: s.status === 'active' && new Date(s.expires_at) > now } : null }
  })

  return NextResponse.json({ success: true, addons: result, branches: branches || [] })
}
