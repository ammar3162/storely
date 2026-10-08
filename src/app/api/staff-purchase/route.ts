import { NextResponse } from 'next/server'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { netFromTotal } from '@/lib/vat'
import { resolvePurchaseTax, notifyQrMismatch } from '@/lib/taxInvoice'
import { staffHasPermission, NO_PURCHASES } from '@/lib/staffPermission'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const rawStaffToken = extractStaffToken(req)
    const auth = await verifyStaffToken(rawStaffToken)
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    const { org_id, staff_id, branch_id } = auth.data!

    const body = await req.json()
    const { category, name, qty, unit, reorder_point,
            supplier, note, invoice_image, staff_name } = body

    // المبلغ قبل الضريبة يُحسب هنا: شاملة ضريبة ← الإجمالي ÷ 1.15، بدون ← الإجمالي نفسه
    // (توافق مع النسخة القديمة من الصفحة اللي كانت ترسل amount جاهز وتعتبر الكل شامل ضريبة)
    const hasVat = body.has_vat !== false
    const total = Number(body.total_amount)
    const amount = Number.isFinite(total) && total > 0
      ? netFromTotal(total, hasVat)
      : Number(body.amount)
    if (!(amount > 0)) return NextResponse.json({ error: 'أدخل المبلغ' }, { status: 400 })

    if (qty != null && qty !== '' && !(Number.isInteger(Number(qty)) && Number(qty) >= 0)) return NextResponse.json({ error: 'الكمية لازم رقم صحيح — لو فيها كسور استخدم وحدة أصغر (غرام بدل كيلو مثلاً)' }, { status: 400 })
    if (!org_id || !name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()
    if (!(await staffHasPermission(supabase, staff_id, org_id, 'purchases'))) return NextResponse.json({ error: NO_PURCHASES }, { status: 403 })
    const tax = await resolvePurchaseTax(supabase, org_id, supplier || null, body, hasVat, Number.isFinite(total) && total > 0 ? total : amount)
    if (!tax.ok) return NextResponse.json({ error: tax.error }, { status: tax.status })

    const { error } = await supabase.from('purchases').insert({
      org_id, branch_id: branch_id || null,
      category, name, qty: qty || null, unit: unit || null,
      reorder_point: reorder_point || 5,
      amount, has_vat: hasVat,
      supplier, note: note || `تسجيل بواسطة الموظف: ${staff_name}`,
      invoice_image: invoice_image || null,
      profile_id: null,
      ...tax.tax,
    } as any)

    if (error && lockedFromError(error)) return NextResponse.json({ error: lockedFromError(error) }, { status: 423 })
    if (error) { console.error('STAFF_PURCHASE_FAILED', error.message); return NextResponse.json({ error: 'تعذر تسجيل الشراء، حاول مرة ثانية' }, { status: 500 }) }
    if (tax.alert) {
      // اسم الموظف من قاعدة البيانات (مو من الطلب)
      const { data: me } = await supabase.from('staff_members').select('name').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
      await notifyQrMismatch(supabase, org_id, branch_id || null, tax.alert, (me as any)?.name || undefined)
    }

    // تحديث المخزون لو مخزون
    if (category === 'مخزون' && name && qty) {
      const purchasedQty = Number(qty)
      const unitCost = purchasedQty > 0 ? (Number(amount) || 0) / purchasedQty : 0

      let existingQ = supabase.from('products')
        .select('id,qty,avg_cost').eq('org_id', org_id).eq('name', name)
      if (branch_id) existingQ = existingQ.eq('branch_id', branch_id)
      const { data: existing } = await existingQ.limit(1)

      if (existing && existing.length > 0) {
        const oldQty = Number(existing[0].qty) || 0
        const oldAvgCost = Number((existing[0] as any).avg_cost) || 0
        const newAvgCost = (oldQty + purchasedQty) > 0
          ? ((oldQty * oldAvgCost) + (purchasedQty * unitCost)) / (oldQty + purchasedQty)
          : 0

        await supabase.from('stock_movements').insert({
          product_id: existing[0].id, org_id, type: 'in',
          qty_change: purchasedQty,
          note: `شراء من: ${supplier} بواسطة: ${staff_name}`
        } as any)
        await supabase.from('products').update({ avg_cost: newAvgCost }).eq('id', existing[0].id)
        if (staff_id) await addToAssignedProducts(supabase, staff_id, existing[0].id)
      } else {
        const { data: np } = await supabase.from('products').insert({
          org_id, branch_id: branch_id || null,
          name, unit: unit || 'قطعة', qty: 0,
          reorder_point: reorder_point || 5, is_active: true,
          avg_cost: unitCost,
          requires_staff_assignment: true,
        } as any).select().single()
        if (np && purchasedQty > 0) {
          await supabase.from('stock_movements').insert({
            product_id: np.id, org_id, type: 'in',
            qty_change: purchasedQty,
            note: `شراء جديد من: ${supplier} بواسطة: ${staff_name}`
          } as any)
          // منتج جديد كلياً — يبقى مخفي عن الكل لحد ما المالك يخصصه يدوياً من صفحة الموظفين
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
    // قائمة فاضية = يشوف كل المنتجات — إضافة منتج لها كانت تخليه ما يشوف غيره
    if (assigned.length && !assigned.includes(productId)) {
      await supabase.from('staff_members').update({ assigned_products: [...assigned, productId] }).eq('id', staffId)
    }
  } catch {}
}
