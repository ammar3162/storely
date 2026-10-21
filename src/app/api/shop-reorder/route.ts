import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { resolveMenuScope } from '@/lib/shopMenu'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يستقبل قائمة مرتّبة من عناصر فئة واحدة (منتجات مخزون + عناصر منيو مخصّصة) ويحفظ ترتيبها
export async function POST(req: Request) {
  try {
    const { org_id, items } = await req.json()
    if (!org_id || !Array.isArray(items)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const scope = await resolveMenuScope(supabase, org_id, access)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })
    // مدير الفرع يرتّب أصناف فرعه بس (أصناف "كل الفروع" ومنتجات الفروع الثانية ما تتأثر)
    const forced = scope.mode === 'branch' ? (scope.canManageOrg ? null : scope.branchId) : enforcedBranchId(access, null)
    const updates = items.slice(0, 500).map((it: any, index: number) => {
      const table = it.type === 'shop_item' ? 'shop_items' : 'products'
      let q = supabase.from(table).update({ sort_order: index } as any).eq('id', it.id).eq('org_id', org_id)
      if (forced && (table === 'products' || scope.mode === 'branch')) q = q.eq('branch_id', forced)
      return q
    })
    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
