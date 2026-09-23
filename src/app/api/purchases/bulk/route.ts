import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// حفظ عدة أصناف مستخرجة من صورة فاتورة (OCR) — كل صنف فاتورة شراء مستقلة بسعره وضريبته،
// والمخزون يتحدث عبر حركة "in" (الـ trigger يعيد حساب الكمية من مجموع الحركات)
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, supplier, note, invoice_image, has_vat, invoice_date, items } = await req.json()
    if (!org_id || !Array.isArray(items) || !items.length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    if (!DATE_RE.test(String(invoice_date || ''))) return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const bid = enforcedBranchId(access, branch_id)
    if (bid) {
      const { data: b } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
      if (!b) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }
    const isVat = has_vat === true

    let saved = 0
    for (const item of items.slice(0, 200)) {
      const name = String(item.name || '').trim()
      if (!name) continue
      const qty = Number(item.qty) || 0
      const unit = item.unit || 'قطعة'
      const itemTotal = Number(item.total) || 0
      const itemNet = itemTotal / (isVat ? 1.15 : 1)
      const itemVat = itemTotal - itemNet

      await db.from('purchases').insert({
        org_id, profile_id: access.userId, branch_id: bid || null,
        category: 'مخزون', name: item.name, qty, unit,
        reorder_point: 5, total_amount: itemTotal,
        amount: itemNet, vat_amount: itemVat, supplier: supplier || null,
        note: note || null, invoice_image: invoice_image || null,
        hasVat: isVat, invoice_date,
      } as any)

      // مطابقة الصنف بالاسم داخل نفس الفرع (نفس منطق الواجهة السابق: قائمة أصناف الفرع النشطة)
      let pq = db.from('products').select('id').eq('org_id', org_id).eq('is_active', true).eq('name', name)
      if (bid) pq = pq.eq('branch_id', bid)
      const { data: existing } = await pq.limit(1)

      let productId: string | null = (existing as any)?.[0]?.id || null
      let noteText = `شراء من: ${supplier || '—'} (OCR)`
      if (!productId) {
        const { data: np } = await db.from('products').insert({
          org_id, branch_id: bid || null, name, unit, qty: 0, reorder_point: 5, is_active: true,
        } as any).select('id').single()
        productId = (np as any)?.id || null
        noteText = `شراء جديد من: ${supplier || '—'} (OCR)`
      }
      if (productId && qty > 0) {
        await db.from('stock_movements').insert({ product_id: productId, org_id, profile_id: access.userId, type: 'in', qty_change: qty, note: noteText } as any)
      }
      saved++
    }

    return NextResponse.json({ success: true, saved })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
