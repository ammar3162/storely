import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { org_id, addon_id, duration_days, org_name, addon_name, quantity, branch_id } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const supabase = sb()
  const days = Number(duration_days) || 30
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const qty = Math.max(1, Math.min(20, Number(quantity) || 1)) // موظف/مورد إضافي: حد أقصى 20 بالطلب الواحد

  const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
  const slug = (addonRow as any)?.slug

  if (slug === 'extra_staff' && !branch_id) {
    return NextResponse.json({ error: 'لازم تحدد الفرع اللي تنطبق عليه إضافة "موظف إضافي"' }, { status: 400 })
  }
  const rowBranchId = slug === 'extra_staff' ? branch_id : null

  let existingQuery = supabase.from('org_addon_subscriptions').select('id').eq('org_id', org_id).eq('addon_id', addon_id)
  existingQuery = rowBranchId ? existingQuery.eq('branch_id', rowBranchId) : existingQuery.is('branch_id', null)
  const { data: existingRow } = await existingQuery.maybeSingle()

  let saveError = null
  if (existingRow) {
    const { error } = await supabase.from('org_addon_subscriptions').update({
      status: 'active', activated_at: new Date().toISOString(), expires_at: expiresAt, cancelled_at: null, quantity: qty,
    } as any).eq('id', (existingRow as any).id)
    saveError = error
  } else {
    const { error } = await supabase.from('org_addon_subscriptions').insert({
      org_id, addon_id, branch_id: rowBranchId, status: 'active', activated_at: new Date().toISOString(), expires_at: expiresAt, cancelled_at: null, quantity: qty,
    } as any)
    saveError = error
  }
  if (saveError) return NextResponse.json({ error: 'فشل التفعيل' }, { status: 500 })

  if (slug === 'extra_branch') {
    const { data: org } = await supabase.from('organizations').select('max_branches').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_branches: ((org as any)?.max_branches || 1) + 1 } as any).eq('id', org_id)
  } else if (slug === 'extra_staff' && rowBranchId) {
    const { data: br } = await supabase.from('branches').select('max_staff').eq('id', rowBranchId).single()
    await supabase.from('branches').update({ max_staff: ((br as any)?.max_staff || 3) + qty } as any).eq('id', rowBranchId)
  } else if (slug === 'extra_suppliers') {
    const { data: org } = await supabase.from('organizations').select('max_suppliers').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_suppliers: ((org as any)?.max_suppliers || 0) + qty } as any).eq('id', org_id)
  }

  await logAdminAction(admin, 'activate_addon', org_id, org_name || null, { addon_id, addon_name, expires_at: expiresAt, branch_id: rowBranchId })

  return NextResponse.json({ success: true, expiresAt })
}

export async function DELETE(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { org_id, addon_id, org_name, addon_name, branch_id } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const supabase = sb()
  let existingQuery = supabase.from('org_addon_subscriptions').select('id,quantity').eq('org_id', org_id).eq('addon_id', addon_id)
  existingQuery = branch_id ? existingQuery.eq('branch_id', branch_id) : existingQuery.is('branch_id', null)
  const { data: existingSub } = await existingQuery.maybeSingle()
  const existingSubId = (existingSub as any)?.id
  const existingQty = Math.max(1, (existingSub as any)?.quantity || 1)

  if (!existingSubId) return NextResponse.json({ error: 'ما فيه اشتراك فعّال لإلغائه' }, { status: 404 })

  const { error } = await supabase.from('org_addon_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
    .eq('id', existingSubId)

  if (error) return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 })

  const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
  const slug = (addonRow as any)?.slug
  if (slug === 'extra_branch') {
    const { data: org } = await supabase.from('organizations').select('max_branches').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_branches: Math.max(1, ((org as any)?.max_branches || 2) - 1) } as any).eq('id', org_id)
    const { data: latestBranch } = await supabase.from('branches').select('id').eq('org_id', org_id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (latestBranch) {
      const deadBranchId = (latestBranch as any).id
      await supabase.from('branches').update({ is_active: false } as any).eq('id', deadBranchId)
      await supabase.from('staff_members').update({ is_active: false } as any).eq('branch_id', deadBranchId).eq('is_active', true)
    }
  } else if (slug === 'extra_staff') {
    if (branch_id) {
      const { data: br } = await supabase.from('branches').select('max_staff').eq('id', branch_id).single()
      await supabase.from('branches').update({ max_staff: Math.max(0, ((br as any)?.max_staff || existingQty) - existingQty) } as any).eq('id', branch_id)
    }
    if (existingSubId) {
      await supabase.from('staff_members').update({ is_active: false } as any).eq('addon_subscription_id', existingSubId)
    }
  } else if (slug === 'extra_suppliers') {
    const { data: org } = await supabase.from('organizations').select('max_suppliers').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_suppliers: Math.max(0, ((org as any)?.max_suppliers || existingQty) - existingQty) } as any).eq('id', org_id)
    if (existingSubId) {
      await supabase.from('suppliers').update({ is_active: false } as any).eq('addon_subscription_id', existingSubId)
    }
  }

  await logAdminAction(admin, 'cancel_addon', org_id, org_name || null, { addon_id, addon_name, branch_id })

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
  const { data: subs } = await supabase.from('org_addon_subscriptions').select('addon_id,status,expires_at,quantity,branch_id').eq('org_id', org_id)
  const { data: branches } = await supabase.from('branches').select('id,name').eq('org_id', org_id).eq('is_active', true)

  const now = new Date()
  const subsMap: Record<string, any[]> = {}
  for (const s of subs || []) {
    const key = (s as any).addon_id
    if (!subsMap[key]) subsMap[key] = []
    subsMap[key].push(s)
  }

  const result = (addons || []).map((a: any) => {
    const rows = subsMap[a.id] || []
    if (a.slug === 'extra_staff') {
      const subscriptions = rows.map((s: any) => ({ ...s, isValid: s.status === 'active' && new Date(s.expires_at) > now }))
      return { ...a, subscriptions }
    }
    const s = rows[0]
    return { ...a, subscription: s ? { ...s, isValid: s.status === 'active' && new Date(s.expires_at) > now } : null }
  })

  return NextResponse.json({ success: true, addons: result, branches: branches || [] })
}
