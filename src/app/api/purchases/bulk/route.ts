import { NextResponse } from 'next/server'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { invoiceTimestamp } from '@/lib/invoiceTime'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { resolvePurchaseTax, notifyQrMismatch } from '@/lib/taxInvoice'
import { cleanItems, saveInvoiceItems, itemsSummary } from '@/lib/purchaseItems'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// حفظ أصناف فاتورة وحدة مقروءة من صورة (المالك/المدير): كل صنف سطر مشتريات،
// والصنف الموجود تزيد كميته (اختيار المستخدم أو تطابق قوي بالاسم) — الباقي ينضاف للمخزون
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id, branch_id, supplier, invoice_image, invoice_date, has_vat } = body
    const items = cleanItems(body.items)
    if (items.some(it => !Number.isInteger(it.qty))) return NextResponse.json({ error: 'الكمية لازم رقم صحيح — لو فيها كسور استخدم وحدة أصغر (غرام بدل كيلو مثلاً)' }, { status: 400 })
    if (!org_id || !items.length) return NextResponse.json({ error: 'حدد صنف واحد على الأقل واكتب سعره' }, { status: 400 })
    if (!DATE_RE.test(String(invoice_date || ''))) return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const bid = enforcedBranchId(access, branch_id)
    if (bid) {
      const { data: b } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
      if (!b) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }
    const locked = await lockedFor(db, org_id, [invoice_date])
    if (locked) return NextResponse.json({ error: locked }, { status: 423 })
    const hasVat = has_vat !== false
    const sup = String(supplier || '').trim().slice(0, 120) || null
    const tax = await resolvePurchaseTax(db, org_id, sup, body, hasVat, items.reduce((s, it) => s + it.total, 0))   // كل الأصناف = فاتورة وحدة للمحاسب
    if (!tax.ok) return NextResponse.json({ error: tax.error }, { status: tax.status })

    const results = await saveInvoiceItems(db, { orgId: org_id, branchId: bid || null, items, hasVat, supplier: sup || '—', invoiceImage: invoice_image || null,
      tax: tax.tax, createdAt: invoiceTimestamp(invoice_date), profileId: access.userId })
    const saved = results.filter(r => r.action !== 'failed').length
    if (saved && tax.alert) await notifyQrMismatch(db, org_id, bid || null, tax.alert)
    if (!saved) return NextResponse.json({ error: 'فشل حفظ الفاتورة', results }, { status: 500 })
    return NextResponse.json({ success: true, saved, results, summary: itemsSummary(results) })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
