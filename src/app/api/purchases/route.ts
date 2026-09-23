import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { currencySymbol } from '@/lib/currencySymbol'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type DB = ReturnType<typeof sb>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** الفرع الفعلي للعملية: فرع المدير إجباري، وإلا المرسل، وإلا (للإضافة فقط) أول فرع نشط */
async function resolveBranch(db: DB, access: any, org_id: string, requested: string | null, fallbackToFirst: boolean) {
  const bid = enforcedBranchId(access, requested)
  if (bid) {
    const { data } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
    return data ? bid : undefined
  }
  if (!fallbackToFirst) return null
  const { data } = await db.from('branches').select('id').eq('org_id', org_id).eq('is_active', true).order('created_at').limit(1).maybeSingle()
  return (data as any)?.id || null
}

// view=history (آخر 50 فاتورة) | view=payables (غير المدفوعة، مرتبة بتاريخ الاستحقاق)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const view = searchParams.get('view') || 'history'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, branch_id)
    const db = sb()

    if (view === 'payables') {
      let q = db.from('purchases').select('id,name,supplier,total_amount,due_date,created_at')
        .eq('org_id', org_id).eq('payment_status', 'unpaid').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(200)
      if (bid) q = q.eq('branch_id', bid)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      const sorted = (data || []).slice().sort((a: any, b: any) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
      return NextResponse.json({ success: true, payables: sorted })
    }

    let q = db.from('purchases')
      .select('id,category,name,qty,unit,amount,vat_amount,total_amount,supplier,invoice_image,created_at')
      .eq('org_id', org_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(50)
    if (bid) q = q.eq('branch_id', bid)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, purchases: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تسجيل فاتورة شراء واحدة + تحديث/إضافة الصنف بالمخزون + متوسط التكلفة + إشعار
// كل الخطوات على الخادم (كانت تتنفذ من المتصفح خطوة خطوة — انقطاع الاتصال بالنص كان يخلي البيانات ناقصة)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    const total = Number(body.total_amount)
    const supplier = String(body.supplier || '').trim()
    const category = String(body.category || '')
    const name = String(body.name || '')
    if (!org_id || !(total > 0) || !supplier || !category) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    if (!DATE_RE.test(String(body.invoice_date || ''))) return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const purchaseBranch = await resolveBranch(db, access, org_id, body.branch_id || null, false)
    if (purchaseBranch === undefined) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    // نفس الحساب السابق بالواجهة بالضبط: المبلغ قبل الضريبة = الإجمالي ÷ 1.15
    const amount = parseFloat((total / 1.15).toFixed(2))
    const invoiceTs = `${body.invoice_date}T12:00:00+03:00`
    const qty = body.qty ? Number(body.qty) : 0

    const { error: insErr } = await db.from('purchases').insert({
      org_id, profile_id: access.userId, branch_id: purchaseBranch,
      category, name, qty: body.qty ? Number(body.qty) : null,
      unit: body.unit || null, reorder_point: Number(body.reorder_point) || 5,
      amount, supplier, note: body.note || null, invoice_image: body.invoice_image || null,
      created_at: invoiceTs, payment_status: body.payment_status === 'unpaid' ? 'unpaid' : 'paid', due_date: body.due_date || null,
    } as any)
    if (insErr) return NextResponse.json({ error: 'خطأ: ' + insErr.message }, { status: 500 })

    const { data: org } = await db.from('organizations').select('currency').eq('id', org_id).single()
    await db.from('notifications').insert({
      org_id, branch_id: purchaseBranch,
      title: `فاتورة جديدة: ${name || category}`,
      message: `${total.toFixed(2)} ${currencySymbol((org as any)?.currency || 'SAR')} — ${supplier}${body.payment_status === 'unpaid' ? ' (غير مدفوعة)' : ''}`,
      type: 'success', read: false,
    } as any)

    let productId: string | null = null
    let productAction: 'updated' | 'created' | null = null

    if (category === 'مخزون' && name) {
      const unitCost = qty > 0 ? (amount || 0) / qty : 0
      let existing: any = null
      let byName = db.from('products').select('id,qty,sku,avg_cost').eq('org_id', org_id).eq('name', name)
      if (purchaseBranch) byName = byName.eq('branch_id', purchaseBranch)
      const { data: byNameArr } = await byName.order('created_at', { ascending: false }).limit(1)
      if (byNameArr?.length) existing = byNameArr[0]
      else if (body.sku) {
        let bySku = db.from('products').select('id,qty,sku,name,avg_cost').eq('org_id', org_id).eq('sku', body.sku)
        if (purchaseBranch) bySku = bySku.eq('branch_id', purchaseBranch)
        const { data: bySkuArr } = await bySku.order('created_at', { ascending: false }).limit(1)
        if (bySkuArr?.length) existing = bySkuArr[0]
      }

      if (existing) {
        if (body.sku && !existing.sku) await db.from('products').update({ sku: body.sku } as any).eq('id', existing.id)
        if (qty > 0) {
          await db.from('stock_movements').insert({ product_id: existing.id, org_id, profile_id: access.userId, type: 'in', qty_change: qty, note: `شراء من: ${supplier}`, created_at: invoiceTs } as any)
        }
        // متوسط التكلفة المرجّح — الكمية القديمة من قبل الإضافة
        const oldQty = Number(existing.qty) || 0
        const oldAvg = Number(existing.avg_cost) || 0
        const newAvg = (oldQty + qty) > 0 ? ((oldQty * oldAvg) + (qty * unitCost)) / (oldQty + qty) : 0
        await db.from('products').update({ avg_cost: newAvg } as any).eq('id', existing.id)
        productId = existing.id
        productAction = 'updated'
      } else {
        const branchForNew = purchaseBranch || await resolveBranch(db, access, org_id, null, true)
        const { data: np } = await db.from('products').insert({
          org_id, branch_id: branchForNew, name: name.trim(), sku: body.sku || null, unit: body.unit || 'قطعة',
          qty: 0, reorder_point: Number(body.reorder_point) || 5, is_active: true, avg_cost: unitCost,
        } as any).select('id').single()
        if (np) {
          productId = (np as any).id
          productAction = 'created'
          if (qty > 0) {
            await db.from('stock_movements').insert({ product_id: productId, org_id, profile_id: access.userId, type: 'in', qty_change: qty, note: `شراء جديد من: ${supplier}`, created_at: invoiceTs } as any)
          }
        }
      }
    }

    // هل نعرض على المالك إرسال رسالة شكر للمورد؟ فقط لو المورد مسجّل والمنتج مرتبط فيه
    let thanksCandidate = false
    if (productId) {
      const { data: sup } = await db.from('suppliers').select('id').eq('org_id', org_id).ilike('name', supplier.replace(/[%_\\]/g, '\\$&')).limit(1)
      const supplierId = (sup as any)?.[0]?.id
      if (supplierId) {
        const { data: direct } = await db.from('products').select('id').eq('id', productId).eq('supplier_id', supplierId).limit(1)
        let linked = !!direct?.length
        if (!linked) {
          const { data: alt } = await db.from('product_suppliers').select('id').eq('product_id', productId).eq('supplier_id', supplierId).limit(1)
          linked = !!alt?.length
        }
        thanksCandidate = linked
      }
    }

    return NextResponse.json({ success: true, product_id: productId, product_action: productAction, qty, thanks_candidate: thanksCandidate })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تسجيل الدفع لفاتورة غير مدفوعة
export async function PATCH(req: Request) {
  try {
    const { org_id, id, mark_paid } = await req.json()
    if (!org_id || !id || mark_paid !== true) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    let q = sb().from('purchases').update({ payment_status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', id).eq('org_id', org_id)
    const bid = enforcedBranchId(access)
    if (bid) q = q.eq('branch_id', bid)
    const { data, error } = await q.select('id')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف فاتورة (حذف ناعم) — لو كانت "مخزون" نرجّع الكمية اللي أضافتها عبر حركة "out"
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const { data: purchase } = await db.from('purchases').select('id,category,name,qty,supplier,branch_id,deleted_at').eq('id', id).eq('org_id', org_id).maybeSingle()
    if (!purchase || (purchase as any).deleted_at) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
    const p: any = purchase
    const bid = enforcedBranchId(access)
    if (bid && p.branch_id !== bid) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    if (p.category === 'مخزون' && p.name && Number(p.qty) > 0) {
      let pq = db.from('products').select('id').eq('org_id', org_id).eq('name', p.name)
      if (p.branch_id) pq = pq.eq('branch_id', p.branch_id)
      const { data: matched } = await pq.limit(1)
      if (matched?.length) {
        await db.from('stock_movements').insert({
          product_id: (matched[0] as any).id, org_id, profile_id: access.userId, type: 'out',
          qty_change: -Number(p.qty), note: `إلغاء فاتورة شراء محذوفة (${p.supplier || '—'})`,
        } as any)
      }
    }

    const { error } = await db.from('purchases').update({ deleted_at: new Date().toISOString(), deleted_by: access.userId } as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل حذف الفاتورة' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
