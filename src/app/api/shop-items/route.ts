import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { resolveMenuScope, canEditItemBranch } from '@/lib/shopMenu'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, item_id, name, category, price, description, image_url, is_featured, branch_id, scope: target, branch_ids } = await req.json()
    if (!org_id || !name) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const scope = await resolveMenuScope(supabase, org_id, access, branch_id)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })

    const payload: Record<string, unknown> = {
      org_id, name: name.trim(), category: category?.trim() || 'منتجات خارجية',
      price: price !== undefined && price !== '' && price !== null ? Number(price) : null,
      description: description?.trim() || null, image_url: image_url || null,
      is_featured: !!is_featured,
    }
    // منيو بالفروع: الصنف لهالفرع، أو "all" = لكل الفروع (للمالك بس)
    if (scope.mode === 'branch') {
      if (target === 'all' && !scope.canManageOrg) return NextResponse.json({ error: 'أصناف كل الفروع يضيفها مالك المنشأة' }, { status: 403 })
      if (target !== undefined) payload.branch_id = target === 'all' ? null : scope.branchId
    }

    if (item_id) {
      const { data: existing } = await supabase.from('shop_items').select('org_id,branch_id').eq('id', item_id).maybeSingle()
      if (!existing || (existing as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      if (!canEditItemBranch(scope, (existing as any).branch_id)) return NextResponse.json({ error: 'هذا الصنف لكل الفروع — يعدّله مالك المنشأة' }, { status: 403 })
      const { error } = await supabase.from('shop_items').update(payload as any).eq('id', item_id).eq('org_id', org_id)
      if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
      return NextResponse.json({ success: true, id: item_id })
    } else {
      if (scope.mode === 'branch' && payload.branch_id === undefined) payload.branch_id = scope.branchId
      // المالك يقدر يضيف الصنف لعدة فروع بمرة: كل الفروع المشتركة = صنف واحد "لكل الفروع"، وإلا نسخة لكل فرع
      let rows: Record<string, unknown>[] = [payload]
      if (scope.mode === 'branch' && scope.canManageOrg && Array.isArray(branch_ids) && target !== 'all') {
        const picked = scope.branches.filter(b => branch_ids.includes(b.id)).map(b => b.id)
        if (!picked.length) return NextResponse.json({ error: 'اختر فرع واحد على الأقل' }, { status: 400 })
        rows = picked.length === scope.branches.length && scope.branches.length > 1
          ? [{ ...payload, branch_id: null }]
          : picked.map(id => ({ ...payload, branch_id: id }))
      }
      const { data, error } = await supabase.from('shop_items').insert(rows as any).select('id')
      if (error) return NextResponse.json({ error: 'فشل الإضافة' }, { status: 500 })
      return NextResponse.json({ success: true, id: (data as any)?.[0]?.id, count: (data || []).length })
    }
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تبديل سريع من القائمة: متوفر/نفدت، إخفاء من المنيو، تمييز
const TOGGLES = ['is_available', 'is_hidden', 'is_featured'] as const

export async function PATCH(req: Request) {
  try {
    const { org_id, item_id, field, value } = await req.json()
    if (!org_id || !item_id || !TOGGLES.includes(field)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: existing } = await supabase.from('shop_items').select('org_id,branch_id').eq('id', item_id).maybeSingle()
    if (!existing || (existing as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    const scope = await resolveMenuScope(supabase, org_id, access)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })
    if (!canEditItemBranch(scope, (existing as any).branch_id)) return NextResponse.json({ error: 'هذا الصنف لكل الفروع — يعدّله مالك المنشأة' }, { status: 403 })

    const { error } = await supabase.from('shop_items').update({ [field]: !!value } as any).eq('id', item_id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { org_id, old_category, new_category, branch_id } = await req.json()
    if (!org_id || !old_category || !new_category?.trim()) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const scope = await resolveMenuScope(supabase, org_id, access, branch_id)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })

    // يتغير اسم القسم للأصناف اللي يشوفها بهالمنيو بس (مدير الفرع: أصناف فرعه)
    let q = supabase.from('shop_items').update({ category: new_category.trim() } as any).eq('org_id', org_id).eq('category', old_category)
    if (scope.mode === 'branch') {
      q = scope.canManageOrg ? q.or(`branch_id.eq.${scope.branchId},branch_id.is.null`) : q.eq('branch_id', scope.branchId)
    }
    const { error } = await q
    if (error) return NextResponse.json({ error: 'فشل تغيير اسم القسم' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { org_id, item_id } = await req.json()
    if (!org_id || !item_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: existing } = await supabase.from('shop_items').select('org_id,branch_id').eq('id', item_id).maybeSingle()
    if (!existing || (existing as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const scope = await resolveMenuScope(supabase, org_id, access)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })
    if (!canEditItemBranch(scope, (existing as any).branch_id)) return NextResponse.json({ error: 'هذا الصنف لكل الفروع — يحذفه مالك المنشأة' }, { status: 403 })

    const { error } = await supabase.from('shop_items').delete().eq('id', item_id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
