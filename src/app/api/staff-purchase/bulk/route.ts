import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { netFromTotal } from '@/lib/vat'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { resolvePurchaseTax, notifyQrMismatch } from '@/lib/taxInvoice'
import { staffHasPermission, NO_PURCHASES } from '@/lib/staffPermission'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// الموظف يحفظ عدة أصناف من صورة فاتورة وحدة (بعد القراءة الذكية) — كلها فاتورة وحدة للمحاسب
// الفرع والموظف من جلسته، والصلاحية من قاعدة البيانات
export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason === 'subscription_expired' ? 403 : 401 })
    const { org_id, staff_id, branch_id } = auth.data!
    const body = await req.json()
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100)
      .map((it: any) => ({ name: String(it?.name || '').trim().slice(0, 120), qty: Math.max(0, Number(it?.qty) || 0), unit: String(it?.unit || 'قطعة').slice(0, 30), total: Number(it?.total) || 0 }))
      .filter((it: any) => it.name && it.total > 0)
    if (!items.length) return NextResponse.json({ error: 'حدد صنف واحد على الأقل واكتب سعره' }, { status: 400 })
    const supplier = String(body.supplier || '').trim().slice(0, 120)
    if (!supplier) return NextResponse.json({ error: 'اكتب اسم المورد' }, { status: 400 })

    const db = sb()
    if (!(await staffHasPermission(db, staff_id, org_id, 'purchases'))) return NextResponse.json({ error: NO_PURCHASES }, { status: 403 })
    const hasVat = body.has_vat !== false
    if (hasVat && !body.invoice_image) return NextResponse.json({ error: 'صوّر الفاتورة أول' }, { status: 400 })
    const enteredTotal = items.reduce((s: number, it: any) => s + it.total, 0)
    const tax = await resolvePurchaseTax(db, org_id, supplier, body, hasVat, enteredTotal)
    if (!tax.ok) return NextResponse.json({ error: tax.error }, { status: tax.status })

    const { data: me } = await db.from('staff_members').select('name,assigned_products').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    const staffName = (me as any)?.name || 'موظف'
    const assigned = new Set<string>((me as any)?.assigned_products || [])
    let saved = 0
    const failed: string[] = []
    for (const it of items) {
      const amount = netFromTotal(it.total, hasVat)
      const { error } = await db.from('purchases').insert({
        org_id, branch_id: branch_id || null, profile_id: null, category: 'مخزون', name: it.name, qty: it.qty || null, unit: it.unit, reorder_point: 5,
        amount, has_vat: hasVat, supplier, note: `تسجيل بواسطة الموظف: ${staffName}`, invoice_image: body.invoice_image || null, ...tax.tax,
      } as any)
      if (error) { failed.push(it.name); continue }
      saved++
      if (!(it.qty > 0)) continue
      // المخزون: صنف موجود بنفس الاسم بالفرع، أو صنف جديد مخفي لين المالك يخصصه
      let q = db.from('products').select('id,qty,avg_cost').eq('org_id', org_id).eq('name', it.name)
      if (branch_id) q = q.eq('branch_id', branch_id)
      const { data: ex } = await q.limit(1)
      const unitCost = amount / it.qty
      const p = (ex as any[])?.[0]
      if (p) {
        await db.from('stock_movements').insert({ product_id: p.id, org_id, type: 'in', qty_change: it.qty, note: `شراء من: ${supplier} بواسطة: ${staffName}` } as any)
        const oldQty = Number(p.qty) || 0, oldAvg = Number(p.avg_cost) || 0
        await db.from('products').update({ avg_cost: (oldQty + it.qty) > 0 ? (oldQty * oldAvg + it.qty * unitCost) / (oldQty + it.qty) : 0 } as any).eq('id', p.id)
        assigned.add(p.id)
      } else {
        const { data: np } = await db.from('products').insert({ org_id, branch_id: branch_id || null, name: it.name, unit: it.unit, qty: 0, reorder_point: 5, is_active: true,
          avg_cost: unitCost, requires_staff_assignment: true } as any).select('id').single()
        if (np) await db.from('stock_movements').insert({ product_id: (np as any).id, org_id, type: 'in', qty_change: it.qty, note: `شراء جديد من: ${supplier} بواسطة: ${staffName}` } as any)
      }
    }
    // قائمة فاضية = يشوف كل المنتجات — ما نحولها لقائمة محددة بالغلط
    const had = ((me as any)?.assigned_products || []).length
    if (had > 0 && assigned.size !== had) await db.from('staff_members').update({ assigned_products: [...assigned] } as any).eq('id', staff_id).eq('org_id', org_id)
    if (saved && tax.alert) await notifyQrMismatch(db, org_id, branch_id || null, tax.alert, staffName)
    if (!saved) return NextResponse.json({ error: 'ما انحفظ شي — حاول مرة ثانية', failed }, { status: 500 })
    return NextResponse.json({ success: true, saved, failed })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
