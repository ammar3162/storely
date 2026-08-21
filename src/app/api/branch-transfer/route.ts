import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const org_id = searchParams.get('org_id')
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to')     // YYYY-MM-DD
  if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

  const db = sb()
  let q = db
    .from('stock_movements')
    .select('id,type,qty_change,note,created_at,branch_id,products!inner(name,unit,org_id)')
    .eq('products.org_id', org_id)
    .eq('type', 'transfer_out')
    .order('created_at', { ascending: false })
    .limit(500)
  if (from) q = q.gte('created_at', `${from}T00:00:00`)
  if (to) q = q.lte('created_at', `${to}T23:59:59`)
  const { data, error } = await q

  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true, transfers: data || [] })
}

export async function POST(req: Request) {
  try {
    const { org_id, from_branch_id, to_branch_id, product_id, qty } = await req.json()
    if (!org_id || !from_branch_id || !to_branch_id || !product_id || !qty) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (from_branch_id === to_branch_id) {
      return NextResponse.json({ error: 'لازم يكون الفرعين مختلفين' }, { status: 400 })
    }
    const transferQty = Number(qty)
    if (!(transferQty > 0)) return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role === 'manager') {
      return NextResponse.json({ error: 'نقل المخزون بين الفروع متاح للمالك فقط' }, { status: 403 })
    }

    const db = sb()

    const { data: sourceProduct } = await db
      .from('products')
      .select('id,org_id,branch_id,name,unit,category,reorder_point,qty')
      .eq('id', product_id).eq('org_id', org_id).eq('branch_id', from_branch_id)
      .maybeSingle()
    if (!sourceProduct) return NextResponse.json({ error: 'المنتج غير موجود بالفرع المصدر' }, { status: 404 })
    if (Number((sourceProduct as any).qty) < transferQty) {
      return NextResponse.json({ error: 'الكمية المطلوبة أكبر من المتوفر بالمخزون' }, { status: 400 })
    }

    const { data: branches } = await db
      .from('branches').select('id,name').eq('org_id', org_id).in('id', [from_branch_id, to_branch_id])
    const fromBranch = (branches || []).find((b: any) => b.id === from_branch_id)
    const toBranch = (branches || []).find((b: any) => b.id === to_branch_id)
    if (!fromBranch || !toBranch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    const { data: destExisting } = await db
      .from('products')
      .select('id')
      .eq('org_id', org_id).eq('branch_id', to_branch_id).eq('name', (sourceProduct as any).name)
      .maybeSingle()

    let destProductId = (destExisting as any)?.id
    if (!destProductId) {
      const { data: newProduct, error: createErr } = await db
        .from('products')
        .insert({
          org_id, branch_id: to_branch_id,
          name: (sourceProduct as any).name, unit: (sourceProduct as any).unit,
          category: (sourceProduct as any).category, reorder_point: (sourceProduct as any).reorder_point,
          qty: 0, is_active: true,
        })
        .select('id').single()
      if (createErr || !newProduct) return NextResponse.json({ error: 'فشل إنشاء المنتج بالفرع الوجهة' }, { status: 500 })
      destProductId = (newProduct as any).id
    }

    const { error: outErr } = await db.from('stock_movements').insert({
      product_id: (sourceProduct as any).id, org_id, profile_id: access.userId,
      type: 'transfer_out', qty_change: -transferQty, branch_id: from_branch_id,
      note: `نقل إلى فرع ${(toBranch as any).name}`,
    } as any)
    if (outErr) return NextResponse.json({ error: 'فشل تسجيل حركة الفرع المصدر' }, { status: 500 })

    const { error: inErr } = await db.from('stock_movements').insert({
      product_id: destProductId, org_id, profile_id: access.userId,
      type: 'transfer_in', qty_change: transferQty, branch_id: to_branch_id,
      note: `نقل من فرع ${(fromBranch as any).name}`,
    } as any)
    if (inErr) return NextResponse.json({ error: 'فشل تسجيل حركة الفرع الوجهة' }, { status: 500 })

    // إشعارات النظام لكل فرع بما يخصّه — يظهر بجرس الإشعارات فوراً
    const productName = (sourceProduct as any).name
    const unit = (sourceProduct as any).unit
    await db.from('notifications').insert([
      {
        org_id, branch_id: from_branch_id, type: 'info',
        title: 'نقل مخزون صادر',
        message: `تم نقل ${transferQty} ${unit} من "${productName}" إلى فرع ${(toBranch as any).name}`,
      },
      {
        org_id, branch_id: to_branch_id, type: 'success',
        title: 'نقل مخزون وارد',
        message: `استلم هذا الفرع ${transferQty} ${unit} من "${productName}" من فرع ${(fromBranch as any).name}`,
      },
    ] as any)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
