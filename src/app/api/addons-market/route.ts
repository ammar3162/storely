import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: Request) {
  try {
    const { org_id, addon_id } = await req.json()
    if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { error } = await supabase.from('org_addon_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
      .eq('org_id', org_id).eq('addon_id', addon_id)

    if (error) return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 })

    // تراجع عن زيادة الحدود اللي صارت وقت التفعيل — نفس المنطق الموجود بمسار الأدمن،
    // كان ناقص هنا فقط (لما المالك نفسه يلغي من صفحة الإضافات)، فيفضل max_branches والفرع الزايد بدون تراجع
    const { data: addonRow } = await supabase.from('marketplace_addons').select('slug').eq('id', addon_id).single()
    const slug = (addonRow as any)?.slug
    if (slug === 'extra_branch') {
      const { data: org } = await supabase.from('organizations').select('max_branches').eq('id', org_id).single()
      await supabase.from('organizations').update({ max_branches: Math.max(1, ((org as any)?.max_branches || 2) - 1) } as any).eq('id', org_id)
      const { data: latestBranch } = await supabase.from('branches').select('id').eq('org_id', org_id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (latestBranch) {
        await supabase.from('branches').update({ is_active: false } as any).eq('id', (latestBranch as any).id)
      }
    } else if (slug === 'extra_staff_sup') {
      const { data: org } = await supabase.from('organizations').select('max_staff,max_suppliers').eq('id', org_id).single()
      await supabase.from('organizations').update({
        max_staff: Math.max(0, ((org as any)?.max_staff || 5) - 5),
        max_suppliers: Math.max(0, ((org as any)?.max_suppliers || 5) - 5),
      } as any).eq('id', org_id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const orgPlan = (org as any)?.plan || 'basic'
    // إضافات مضمّنة مجاناً ضمن مميزات الباقة المتوسطة والمتقدمة أصلاً -- ما نعرضها بالمتجر لعميل مشترك فيها
    const INCLUDED_FROM_STANDARD = ['hr_full', 'profitability', 'ai_tools']

    const { data: addonsRaw } = await supabase.from('marketplace_addons').select('*').eq('is_active', true).order('sort_order')
    const addons = orgPlan === 'basic'
      ? addonsRaw
      : (addonsRaw || []).filter((a: any) => !INCLUDED_FROM_STANDARD.includes(a.slug))
    const { data: subs } = await supabase.from('org_addon_subscriptions').select('addon_id,status,expires_at').eq('org_id', org_id).eq('status', 'active')

    const now = new Date()
    const subsMap: Record<string, any> = {}
    for (const s of subs || []) {
      subsMap[(s as any).addon_id] = { ...(s as any), isValid: new Date((s as any).expires_at) > now }
    }

    const result = (addons || []).map((a: any) => ({
      ...a,
      subscription: subsMap[a.id] || null,
    }))

    return NextResponse.json({ success: true, addons: result })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
