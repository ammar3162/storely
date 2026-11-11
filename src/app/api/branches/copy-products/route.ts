import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SOURCE_FIELDS = 'id,name,unit,category,reorder_point,recipe_unit,recipe_unit_factor,supplier_id,backup_supplier_id,supplier_reorder_point,supplier_order_qty'

// أصناف الفرع المصدر المتاحة للنسخ (المالك فقط)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const from_branch_id = searchParams.get('from_branch_id')
    if (!org_id || !from_branch_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذه الصلاحية للمالك فقط' }, { status: 403 })

    const { data, error } = await sb().from('products').select(SOURCE_FIELDS)
      .eq('org_id', org_id).eq('branch_id', from_branch_id).eq('is_active', true).order('name')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, products: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// نسخ أصناف مختارة من فرع لفرع (بدون كميات) — الخادم يقرأ بيانات الأصناف بنفسه من الفرع المصدر
export async function POST(req: Request) {
  try {
    const { org_id, from_branch_id, to_branch_id, product_ids } = await req.json()
    if (!org_id || !from_branch_id || !to_branch_id || !Array.isArray(product_ids) || !product_ids.length) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذه الصلاحية للمالك فقط' }, { status: 403 })

    const db = sb()
    const { data: target } = await db.from('branches').select('id').eq('id', to_branch_id).eq('org_id', org_id).maybeSingle()
    if (!target) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    const { data: source, error: srcErr } = await db.from('products').select(SOURCE_FIELDS)
      .eq('org_id', org_id).eq('branch_id', from_branch_id).in('id', product_ids.slice(0, 2000))
    if (srcErr) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    const rows = (source || []).map((p: any) => ({
      org_id, branch_id: to_branch_id, name: p.name, unit: p.unit, category: p.category,
      reorder_point: p.reorder_point, recipe_unit: p.recipe_unit, recipe_unit_factor: p.recipe_unit_factor,
      // الموردين وإعدادات الطلب التلقائي تنتقل مع الصنف (الموردين على مستوى المنشأة)
      supplier_id: p.supplier_id, backup_supplier_id: p.backup_supplier_id, supplier_reorder_point: p.supplier_reorder_point, supplier_order_qty: p.supplier_order_qty,
      qty: 0, is_active: true,
    }))
    if (!rows.length) return NextResponse.json({ error: 'لا توجد أصناف للنسخ' }, { status: 400 })

    const { data: inserted, error } = await db.from('products').insert(rows as any).select('id')
    if (error) return NextResponse.json({ error: 'فشل نسخ المنتجات' }, { status: 500 })
    // وحدات الشراء المحفوظة («الكرتون فيه 12») تنتقل للصنف الجديد — نفس الترتيب اللي انضافت فيه الأصناف
    try {
      const map = new Map<string, string>()
      ;((inserted || []) as any[]).forEach((r, i) => { const src = (source || [])[i] as any; if (src) map.set(src.id, r.id) })
      const { data: units } = map.size ? await db.from('product_units').select('product_id,unit,factor').eq('org_id', org_id).in('product_id', [...map.keys()]) : { data: [] as any[] }
      const unitRows = ((units || []) as any[]).map(u => ({ org_id, product_id: map.get(u.product_id), unit: u.unit, factor: u.factor })).filter(u => u.product_id)
      if (unitRows.length) await db.from('product_units').insert(unitRows as any)
    } catch { /* الوحدات تحسين — فشلها ما يلغي النسخ */ }
    return NextResponse.json({ success: true, count: rows.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
