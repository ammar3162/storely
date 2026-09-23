import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type DB = ReturnType<typeof sb>

const LIST_FIELDS = 'id,name,sku,unit,qty,reorder_point,category,branch_id'
const FULL_FIELDS = 'id,name,sku,unit,qty,reorder_point,category,branch_id,org_id,is_active,created_at,updated_at,recipe_unit,recipe_unit_factor,expiry_date'

/** فرع العملية: فرع المدير إجباري، وإلا المرسل (بعد التحقق)، وإلا أول فرع نشط */
async function targetBranch(db: DB, access: any, org_id: string, requested: string | null) {
  const bid = enforcedBranchId(access, requested)
  if (bid) {
    const { data } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
    return data ? bid : undefined
  }
  const { data } = await db.from('branches').select('id').eq('org_id', org_id).eq('is_active', true).order('created_at').limit(1).maybeSingle()
  return (data as any)?.id || null
}

/** الحقول القابلة للتعديل من نموذج الصنف */
function editableFields(body: any) {
  const f: Record<string, unknown> = {}
  if ('name' in body) f.name = String(body.name || '').trim()
  if ('sku' in body) f.sku = body.sku || null
  if ('unit' in body) f.unit = body.unit
  if ('reorder_point' in body) f.reorder_point = Number(body.reorder_point) || 0
  if ('category' in body) f.category = String(body.category || '').trim() || null
  if ('expiry_date' in body) f.expiry_date = body.expiry_date || null
  if ('recipe_unit' in body) f.recipe_unit = body.recipe_unit || null
  if ('recipe_unit_factor' in body) f.recipe_unit_factor = body.recipe_unit_factor ? Number(body.recipe_unit_factor) : null
  return f
}

// قائمة الأصناف النشطة لفرع معيّن (أو كل الفروع للمالك لو ما حدد فرع)
// full=1: كل حقول صفحة المخزون
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const sort = searchParams.get('sort') === 'qty' ? 'qty' : 'name'
    const full = searchParams.get('full') === '1'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    let q = sb().from('products').select(full ? FULL_FIELDS : LIST_FIELDS).eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q.order(sort, { ascending: true })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, products: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة صنف جديد. الكمية الابتدائية تُسجّل كحركة "in" (الـ trigger يحسب qty من مجموع الحركات)
//   { items: [{ name, unit, category }] }: إضافة أصناف قالب جاهزة بكمية صفر (بدون حركات)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const bid = await targetBranch(db, access, org_id, body.branch_id || null)
    if (bid === undefined) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    if (Array.isArray(body.items)) {
      const rows = body.items.slice(0, 500).filter((i: any) => String(i.name || '').trim()).map((i: any) => ({
        org_id, branch_id: bid, name: String(i.name).trim(), unit: i.unit, qty: 0, reorder_point: 5, category: i.category || null, is_active: true,
      }))
      if (!rows.length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      const { data, error } = await db.from('products').insert(rows as any).select('id')
      if (error) return NextResponse.json({ error: 'فشل إضافة الأصناف' }, { status: 500 })
      return NextResponse.json({ success: true, ids: (data || []).map((p: any) => p.id) })
    }

    const fields = editableFields(body)
    const qty = Number(body.qty)
    if (!fields.name) return NextResponse.json({ error: 'أدخل اسم المنتج' }, { status: 400 })
    if (!(qty > 0)) return NextResponse.json({ error: 'أدخل كمية أكبر من صفر' }, { status: 400 })
    if (fields.recipe_unit_factor != null && !((fields.recipe_unit_factor as number) > 0)) {
      return NextResponse.json({ error: 'معامل التحويل لازم يكون رقم أكبر من صفر' }, { status: 400 })
    }

    const { data: np, error } = await db.from('products').insert({
      org_id, branch_id: bid, ...fields, qty, is_active: true, requires_staff_assignment: true,
    } as any).select('id').single()
    if (error || !np) return NextResponse.json({ error: 'فشل إضافة المنتج' }, { status: 500 })

    const { error: moveErr } = await db.from('stock_movements').insert({
      product_id: (np as any).id, org_id, profile_id: access.userId, type: 'in', qty_change: qty, note: 'إضافة أولية',
    } as any)
    return NextResponse.json({ success: true, id: (np as any).id, movement_failed: !!moveErr })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

/** يتأكد إن الصنف تابع للمنشأة (ولفرع المدير) */
async function ownedProduct(db: DB, access: any, org_id: string, id: string) {
  const { data } = await db.from('products').select('id,branch_id,qty').eq('id', id).eq('org_id', org_id).maybeSingle()
  if (!data) return null
  const bid = enforcedBranchId(access)
  if (bid && (data as any).branch_id !== bid) return null
  return data as any
}

// تعديل صنف + (اختياري) add_qty: إضافة كمية عبر حركة "in"
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id, id } = body
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await ownedProduct(db, access, org_id, id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const fields = editableFields(body)
    if ('name' in fields && !fields.name) return NextResponse.json({ error: 'أدخل اسم المنتج' }, { status: 400 })
    if (fields.recipe_unit_factor != null && !((fields.recipe_unit_factor as number) > 0)) {
      return NextResponse.json({ error: 'معامل التحويل لازم يكون رقم أكبر من صفر' }, { status: 400 })
    }
    if (Object.keys(fields).length) {
      const { error } = await db.from('products').update(fields as any).eq('id', id).eq('org_id', org_id)
      if (error) return NextResponse.json({ error: 'فشل حفظ التعديلات' }, { status: 500 })
    }

    const addQty = Number(body.add_qty) || 0
    let movementFailed = false
    if (addQty > 0) {
      const { error } = await db.from('stock_movements').insert({
        product_id: id, org_id, profile_id: access.userId, type: 'in', qty_change: addQty, note: 'إضافة مخزون',
      } as any)
      movementFailed = !!error
    }
    return NextResponse.json({ success: true, movement_failed: movementFailed })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف صنف = تعطيله + إزالته من قوائم تخصيص الموظفين
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await ownedProduct(db, access, org_id, id))) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })

    const { error } = await db.from('products').update({ is_active: false } as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل حذف المنتج' }, { status: 500 })

    const { data: staffWithProduct } = await db.from('staff_members').select('id,assigned_products').eq('org_id', org_id).contains('assigned_products', [id])
    for (const s of (staffWithProduct || []) as any[]) {
      await db.from('staff_members').update({ assigned_products: (s.assigned_products || []).filter((pid: string) => pid !== id) } as any).eq('id', s.id)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
