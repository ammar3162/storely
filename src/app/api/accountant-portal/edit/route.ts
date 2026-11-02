import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessFor } from '@/lib/accountantPortalAuth'
import { editClosing } from '@/lib/cashierClosingEdit'
import { editPurchase } from '@/lib/purchaseEdit'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID = /^[0-9a-f-]{36}$/i
// الأقسام اللي تسمح بالتعديل: الإقفال (المبيعات/المصروفات/فروقات الكاشير)، والمشتريات (المشتريات/الضريبة)
const CLOSING_SECTIONS = ['sales', 'expenses', 'cash_diff']
const PURCHASE_SECTIONS = ['purchases', 'vat']

// المحاسب يعدّل إقفال كاشير أو فاتورة مشتريات — يتطبّق على طول، وينحفظ بالسجل، ويوصل المالك إشعار
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const access = await accessFor(db, me.id, String(b.org_id || ''))
    if (!access) return NextResponse.json({ error: 'ما عندك صلاحية على هالمنشأة' }, { status: 403 })
    if (!UUID.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const sections: string[] = Array.isArray(access.sections) ? access.sections : []
    const editor = me.name || me.email
    const orgId = access.org_id as string

    if (b.kind === 'closing') {
      if (!sections.some(s => CLOSING_SECTIONS.includes(s))) return NextResponse.json({ error: 'ما عندك صلاحية على الإقفالات' }, { status: 403 })
      const { data: c } = await db.from('cashier_closings').select('id,branch_id,closing_date,staff_name').eq('id', b.id).eq('org_id', orgId).maybeSingle()
      if (!c) return NextResponse.json({ error: 'الإقفال غير موجود' }, { status: 404 })
      if (access.branch_id && (c as any).branch_id !== access.branch_id) return NextResponse.json({ error: 'هالإقفال من فرع ثاني' }, { status: 403 })
      // حقول التعديل المسموحة فقط (التاريخ يبقى زي ما هو)
      const r = await editClosing(db, orgId, b.id, {
        total_sales: b.total_sales, mada_amount: b.mada_amount, visa_amount: b.visa_amount, mastercard_amount: b.mastercard_amount,
        cash_amount: b.cash_amount, purchases: b.purchases, delivery: b.delivery, deficit_reason: b.deficit_reason,
      }, editor, { source: 'accountant', accountantId: me.id })
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
      await db.from('notifications').insert({ org_id: orgId, branch_id: (c as any).branch_id, type: 'warning', read: false, title: 'محاسبك عدّل إقفال كاشير',
        message: `${editor} عدّل إقفال ${(c as any).staff_name || ''} بتاريخ ${(c as any).closing_date}. تقدر تشوف التعديل وترجّعه من التقارير ← إقفال الكاشير.`.slice(0, 600),
        ref_type: 'accountant_edit', ref_id: r.editId } as any)
      return NextResponse.json({ success: true, closing: r.closing })
    }

    if (b.kind === 'purchase') {
      if (!sections.some(s => PURCHASE_SECTIONS.includes(s))) return NextResponse.json({ error: 'ما عندك صلاحية على المشتريات' }, { status: 403 })
      const r = await editPurchase(db, orgId, b.id, {
        amount: b.amount, has_vat: b.has_vat, invoice_number: b.invoice_number, supplier_vat_number: b.supplier_vat_number,
      }, editor, { source: 'accountant', accountantId: me.id }, access.branch_id || null)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
      const { data: p } = await db.from('purchases').select('supplier,branch_id').eq('id', b.id).maybeSingle()
      await db.from('notifications').insert({ org_id: orgId, branch_id: (p as any)?.branch_id ?? null, type: 'warning', read: false, title: 'محاسبك عدّل فاتورة مشتريات',
        message: `${editor} عدّل فاتورة ${(p as any)?.supplier || ''}: ${r.summary.join('، ')}. تقدر ترجّعه من صفحة المشتريات.`.slice(0, 600),
        ref_type: 'accountant_edit', ref_id: r.batchId } as any)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
