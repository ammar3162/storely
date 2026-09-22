import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// سجل الصرف والهدر الأخير (المالك/مدير الفرع)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 200)
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    let q = sb().from('stock_movements')
      .select('id,qty_change,type,waste_reason,created_at,products!inner(name,unit,org_id,branch_id)')
      .in('type', ['out', 'waste']).eq('products.org_id', org_id)
    if (effectiveBranchId) q = q.eq('products.branch_id', effectiveBranchId)
    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit)

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, movements: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// صرف ({ type: 'out' }) أو هدر ({ type: 'waste', waste_reason }) من المالك/مدير الفرع
// الكمية تنخصم تلقائياً عبر trigger "after_stock_movement" بقاعدة البيانات
export async function POST(req: Request) {
  try {
    const { org_id, product_id, type, qty, waste_reason } = await req.json()
    const qn = Number(qty)
    if (!org_id || !product_id || !(qn > 0) || (type !== 'out' && type !== 'waste')) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (type === 'waste' && !waste_reason) return NextResponse.json({ error: 'سبب الهدر مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: product } = await supabase.from('products').select('id,qty,branch_id').eq('id', product_id).eq('org_id', org_id).single()
    if (!product) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const effectiveBranchId = enforcedBranchId(access)
    if (effectiveBranchId && (product as any).branch_id !== effectiveBranchId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    if (Number((product as any).qty) < qn) return NextResponse.json({ error: 'الكمية أكبر من المتاح!' }, { status: 400 })

    const { error } = await supabase.from('stock_movements').insert({
      product_id,
      org_id,
      profile_id: access.userId,
      type,
      qty_change: -qn,
      ...(type === 'waste'
        ? { waste_reason, note: `هدر: ${waste_reason}` }
        : { note: 'استهلاك يومي' }),
    } as any)

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
