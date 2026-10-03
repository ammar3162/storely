import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UNITS = ['قطعة', 'كيلو', 'كيس', 'كرتون', 'لتر', 'علبة', 'باكيت', 'رول', 'غرام']

// الموظف يضيف منتج للمخزون (بدون فاتورة شراء): لو المنتج موجود بنفس الاسم بفرعه تزيد كميته،
// وإلا ينضاف منتج جديد ويظهر لموظفين الفرع. الفرع من بيانات الموظف (مو من الطلب). المالك يوصله إشعار.
export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: auth.reason === 'subscription_expired' ? 403 : 401 })
    const { org_id, staff_id } = auth.data

    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 120)
    const qty = Number(body.qty)
    const unit = UNITS.includes(String(body.unit)) ? String(body.unit) : 'قطعة'
    const category = String(body.category || '').trim().slice(0, 60) || null
    if (!name) return NextResponse.json({ error: 'اكتب اسم المنتج' }, { status: 400 })
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1_000_000) return NextResponse.json({ error: 'اكتب كمية صحيحة' }, { status: 400 })

    const db = sb()
    const { data: staff } = await db.from('staff_members').select('name,branch_id,permissions').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staff) return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
    if (!(staff as any).permissions?.inventory) return NextResponse.json({ error: 'ما عندك صلاحية المخزون' }, { status: 403 })
    const branch_id: string | null = (staff as any).branch_id ?? null
    const staffName: string = (staff as any).name

    let q = db.from('products').select('id,name').eq('org_id', org_id).eq('is_active', true).ilike('name', name)
    q = branch_id ? q.eq('branch_id', branch_id) : q.is('branch_id', null)
    const { data: existing } = await q.limit(1).maybeSingle()

    let productId: string
    let created = false
    if (existing) {
      productId = (existing as any).id
    } else {
      const { data: np, error } = await db.from('products').insert({
        org_id, branch_id, name, unit, qty: 0, reorder_point: 5, is_active: true,
        ...(category ? { category } : {}),
        requires_staff_assignment: false,   // أضافه موظف الفرع — يظهر لموظفين الفرع على طول
      } as any).select('id').single()
      if (error || !np) return NextResponse.json({ error: 'تعذر إضافة المنتج — حاول مرة ثانية' }, { status: 500 })
      productId = (np as any).id
      created = true
    }

    // الكمية دايماً عن طريق حركة مخزون (الـtrigger يحدّث qty)
    const { error: mvErr } = await db.from('stock_movements').insert({
      product_id: productId, org_id, type: 'in', qty_change: qty,
      note: `${created ? 'منتج جديد' : 'إضافة كمية'} بواسطة الموظف: ${staffName}`,
    } as any)
    if (mvErr) return NextResponse.json({ error: 'تعذر تسجيل الكمية — حاول مرة ثانية' }, { status: 500 })

    // لو الموظف عنده منتجات مخصصة، نضيف هذا لقائمته عشان يشوفه
    const { data: me } = await db.from('staff_members').select('assigned_products').eq('id', staff_id).maybeSingle()
    const assigned: string[] = (me as any)?.assigned_products || []
    if (assigned.length && !assigned.includes(productId)) {
      await db.from('staff_members').update({ assigned_products: [...assigned, productId] } as any).eq('id', staff_id).eq('org_id', org_id)
    }

    await db.from('notifications').insert({
      org_id, branch_id, type: 'info', read: false,
      title: created ? `منتج جديد من ${staffName}` : `إضافة كمية من ${staffName}`,
      message: `${name} — ${qty} ${unit}${created ? ' (منتج جديد)' : ''}`,
    } as any)

    return NextResponse.json({ success: true, product_id: productId, created })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ — حاول مرة ثانية' }, { status: 500 })
  }
}
