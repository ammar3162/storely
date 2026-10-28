import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { saveInvoice } from '@/lib/saveInvoice'
import type { AgentItem } from '@/lib/invoiceAgent'

// تاريخ اليوم بتوقيت السعودية (لو الفاتورة ما فيها تاريخ واضح)
const todayRiyadh = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تأكيد العميل: المسودة الجاهزة تنحفظ مشتريات بنفس منطق صفحة المشتريات (ضريبة، تكرار، شهر مقفل، مخزون)
export async function POST(req: Request) {
  try {
    const { org_id, id, allow_duplicate } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()
    const { data: draft } = await db.from('invoice_drafts').select('*').eq('id', id).eq('org_id', org_id).maybeSingle()
    if (!draft) return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 })
    const dr = draft as any
    const bid = enforcedBranchId(access)
    if (bid && dr.branch_id !== bid) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    if (dr.status === 'saved') return NextResponse.json({ error: 'الفاتورة انحفظت قبل' }, { status: 409 })
    if (dr.status !== 'ready') return NextResponse.json({ error: 'فيه أصناف تنتظر إجابتك قبل الحفظ' }, { status: 400 })
    if (!dr.supplier) return NextResponse.json({ error: 'اكتب اسم المورد' }, { status: 400 })

    // نحجز المسودة أول (ضغطتين ورا بعض ما يحفظونها مرتين) — ولو فشل الحفظ نرجّعها
    const { data: claimed } = await db.from('invoice_drafts').update({ status: 'saved', saved_at: new Date().toISOString() } as any)
      .eq('id', id).eq('org_id', org_id).eq('status', 'ready').select('id')
    if (!claimed?.length) return NextResponse.json({ error: 'الفاتورة انحفظت قبل' }, { status: 409 })
    const release = () => db.from('invoice_drafts').update({ status: 'ready', saved_at: null } as any).eq('id', id).eq('status', 'saved')

    const items = ((dr.items || []) as AgentItem[]).filter(it => it.status === 'matched' || it.status === 'new' || it.status === 'expense')
      .map(it => ({ name: it.name, qty: it.qty ?? 0, unit: it.unit || 'قطعة', total: it.total, product_id: it.status === 'new' ? 'new' : it.status === 'expense' ? 'expense' : it.product_id }))
    let r: Awaited<ReturnType<typeof saveInvoice>>
    try {
      r = await saveInvoice(db, { orgId: org_id, branchId: dr.branch_id || null, profileId: access.userId ?? null, body: {
        supplier: dr.supplier, invoice_image: dr.invoice_image, invoice_date: dr.invoice_date || todayRiyadh(), has_vat: dr.has_vat,
        invoice_number: dr.has_vat ? dr.invoice_number : null, supplier_vat_number: dr.has_vat ? dr.supplier_vat_number : null,
        allow_duplicate: !!allow_duplicate, items,
      } })
    } catch (e) { await release(); throw e }
    if (!r.ok) { await release(); return NextResponse.json({ error: r.error, duplicate: r.duplicate }, { status: r.status }) }
    await db.from('invoice_drafts').update({ result_summary: r.summary } as any).eq('id', id)
    return NextResponse.json({ success: true, saved: r.saved, summary: r.summary })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
