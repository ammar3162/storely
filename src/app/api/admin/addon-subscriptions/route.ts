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

  const { org_id, addon_id, duration_days, org_name, addon_name } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const supabase = sb()
  const days = Number(duration_days) || 30
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('org_addon_subscriptions').upsert({
    org_id, addon_id, status: 'active', activated_at: new Date().toISOString(), expires_at: expiresAt, cancelled_at: null,
  } as any, { onConflict: 'org_id,addon_id' })

  if (error) return NextResponse.json({ error: 'فشل التفعيل' }, { status: 500 })

  // تعديل حدود المنشأة تلقائياً حسب نوع الإضافة — بدون هذا، تفعيل الإضافة ما ينعكس فعلياً على أي صفحة
  const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
  const slug = (addonRow as any)?.slug
  if (slug === 'extra_branch') {
    const { data: org } = await supabase.from('organizations').select('max_branches').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_branches: ((org as any)?.max_branches || 1) + 1 } as any).eq('id', org_id)
  } else if (slug === 'extra_staff_sup') {
    const { data: org } = await supabase.from('organizations').select('max_staff,max_suppliers').eq('id', org_id).single()
    await supabase.from('organizations').update({
      max_staff: ((org as any)?.max_staff || 0) + 5,
      max_suppliers: ((org as any)?.max_suppliers || 0) + 5,
    } as any).eq('id', org_id)
  }

  await logAdminAction(admin, 'activate_addon', org_id, org_name || null, { addon_id, addon_name, expires_at: expiresAt })

  return NextResponse.json({ success: true, expiresAt })
}

export async function DELETE(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { org_id, addon_id, org_name, addon_name } = await req.json()
  if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const supabase = sb()
  const { error } = await supabase.from('org_addon_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
    .eq('org_id', org_id).eq('addon_id', addon_id)

  if (error) return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 })

  // تراجع عن زيادة الحدود اللي صارت وقت التفعيل — نفس المنطق بالعكس
  const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
  const slug = (addonRow as any)?.slug
  if (slug === 'extra_branch') {
    const { data: org } = await supabase.from('organizations').select('max_branches').eq('id', org_id).single()
    await supabase.from('organizations').update({ max_branches: Math.max(1, ((org as any)?.max_branches || 2) - 1) } as any).eq('id', org_id)
  } else if (slug === 'extra_staff_sup') {
    const { data: org } = await supabase.from('organizations').select('max_staff,max_suppliers').eq('id', org_id).single()
    await supabase.from('organizations').update({
      max_staff: Math.max(0, ((org as any)?.max_staff || 5) - 5),
      max_suppliers: Math.max(0, ((org as any)?.max_suppliers || 5) - 5),
    } as any).eq('id', org_id)
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
  const { data: addons } = await supabase.from('marketplace_addons').select('*').eq('is_active', true).order('sort_order')
  const { data: subs } = await supabase.from('org_addon_subscriptions').select('addon_id,status,expires_at').eq('org_id', org_id)

  const now = new Date()
  const subsMap: Record<string, any> = {}
  for (const s of subs || []) subsMap[(s as any).addon_id] = s

  const result = (addons || []).map((a: any) => {
    const s = subsMap[a.id]
    return { ...a, subscription: s ? { ...s, isValid: s.status === 'active' && new Date(s.expires_at) > now } : null }
  })

  return NextResponse.json({ success: true, addons: result })
}
