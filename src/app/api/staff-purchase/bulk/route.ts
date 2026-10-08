import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { resolvePurchaseTax, notifyQrMismatch } from '@/lib/taxInvoice'
import { staffHasPermission, NO_PURCHASES } from '@/lib/staffPermission'
import { cleanItems, saveInvoiceItems, itemsSummary } from '@/lib/purchaseItems'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// الموظف يحفظ أصناف فاتورة وحدة (بعد القراءة الذكية) — الفرع والموظف من جلسته، والصلاحية من قاعدة البيانات
export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason === 'subscription_expired' ? 403 : 401 })
    const { org_id, staff_id, branch_id } = auth.data!
    const body = await req.json()
    const items = cleanItems(body.items)
    if (items.some(it => !Number.isInteger(it.qty))) return NextResponse.json({ error: 'الكمية لازم رقم صحيح — لو فيها كسور استخدم وحدة أصغر (غرام بدل كيلو مثلاً)' }, { status: 400 })
    if (!items.length) return NextResponse.json({ error: 'حدد صنف واحد على الأقل واكتب سعره' }, { status: 400 })
    const supplier = String(body.supplier || '').trim().slice(0, 120)
    if (!supplier) return NextResponse.json({ error: 'اكتب اسم المورد' }, { status: 400 })

    const db = sb()
    if (!(await staffHasPermission(db, staff_id, org_id, 'purchases'))) return NextResponse.json({ error: NO_PURCHASES }, { status: 403 })
    const hasVat = body.has_vat !== false
    if (hasVat && !body.invoice_image) return NextResponse.json({ error: 'صوّر الفاتورة أول' }, { status: 400 })
    const tax = await resolvePurchaseTax(db, org_id, supplier, body, hasVat, items.reduce((s, it) => s + it.total, 0))
    if (!tax.ok) return NextResponse.json({ error: tax.error }, { status: tax.status })

    const { data: me } = await db.from('staff_members').select('name,assigned_products').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    const staffName = (me as any)?.name || 'موظف'
    const results = await saveInvoiceItems(db, { orgId: org_id, branchId: branch_id || null, items, hasVat, supplier, invoiceImage: body.invoice_image || null,
      tax: tax.tax, staffName, staffCreatesHidden: true })

    // الأصناف الموجودة اللي اشتراها تنضاف لقائمته — بس لو عنده قائمة محددة (الفاضية = يشوف كل شي)
    const had: string[] = (me as any)?.assigned_products || []
    const extra = results.filter(r => r.action === 'added' && r.productId && !had.includes(r.productId)).map(r => r.productId!)
    if (had.length && extra.length) await db.from('staff_members').update({ assigned_products: [...had, ...new Set(extra)] } as any).eq('id', staff_id).eq('org_id', org_id)

    const saved = results.filter(r => r.action !== 'failed').length
    if (saved && tax.alert) await notifyQrMismatch(db, org_id, branch_id || null, tax.alert, staffName)
    if (!saved) return NextResponse.json({ error: 'ما انحفظ شي — حاول مرة ثانية', results }, { status: 500 })
    return NextResponse.json({ success: true, saved, results, summary: itemsSummary(results) })
  } catch (e: any) {
    console.error('STAFF_BULK_FAILED', e?.message)
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
