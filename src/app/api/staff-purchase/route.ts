import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id, branch_id, category, name, qty, unit, reorder_point,
            amount, supplier, note, invoice_image, staff_name } = body

    if (!org_id || !name || !amount) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()

    const { error } = await supabase.from('purchases').insert({
      org_id, branch_id: branch_id || null,
      category, name, qty: qty || null, unit: unit || null,
      reorder_point: reorder_point || 5,
      amount,
      supplier, note: note || `تسجيل بواسطة الموظف: ${staff_name}`,
      invoice_image: invoice_image || null,
      profile_id: null,
    } as any)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // تحديث المخزون لو مخزون
    if (category === 'مخزون' && name && qty) {
      const { data: existing } = await supabase.from('products')
        .select('id,qty').eq('org_id', org_id).eq('name', name).limit(1)

      if (existing && existing.length > 0) {
        await supabase.from('stock_movements').insert({
          product_id: existing[0].id, type: 'in',
          qty_change: Number(qty),
          note: `شراء من: ${supplier} بواسطة: ${staff_name}`
        } as any)
        if (staff_id) await addToAssignedProducts(supabase, staff_id, existing[0].id)
      } else {
        const { data: np } = await supabase.from('products').insert({
          org_id, branch_id: branch_id || null,
          name, unit: unit || 'قطعة', qty: 0,
          reorder_point: reorder_point || 5, is_active: true
        } as any).select().single()
        if (np && qty > 0) {
          await supabase.from('stock_movements').insert({
            product_id: np.id, type: 'in',
            qty_change: Number(qty),
            note: `شراء جديد من: ${supplier} بواسطة: ${staff_name}`
          } as any)
          if (staff_id) await addToAssignedProducts(supabase, staff_id, np.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// دالة مساعدة لإضافة منتج لـ assigned_products للموظف
async function addToAssignedProducts(supabase: any, staffId: string, productId: string) {
  try {
    const { data: staff } = await supabase.from('staff_members').select('assigned_products').eq('id', staffId).single()
    const assigned = staff?.assigned_products || []
    if (!assigned.includes(productId)) {
      await supabase.from('staff_members').update({ assigned_products: [...assigned, productId] }).eq('id', staffId)
    }
  } catch {}
}
