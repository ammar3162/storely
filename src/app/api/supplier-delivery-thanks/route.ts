import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * يُستدعى بعد تسجيل مشترية ناجحة. يتحقق: هل اسم المورد المكتوب بالمشترية
 * يطابق فعلياً أحد الموردين المرتبطين بهذا الصنف (أساسي أو بديل)؟
 * لو تطابق → يرسل رسالة شكر تلقائية للمورد على إتمام التوصيل.
 * لو ما تطابق (اسم مختلف أو صنف غير مرتبط) → لا يرسل شيء (تجنب الخطأ).
 */
export async function POST(req: Request) {
  try {
    const { org_id, product_name, supplier_name } = await req.json()
    if (!org_id || !product_name || !supplier_name) return NextResponse.json({ sent: false })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ sent: false }, { status: access.status })

    const db = sb()

    // نلقى المنتج بالاسم (لنفس المؤسسة)
    const { data: product } = await db.from('products').select('id').eq('org_id', org_id).ilike('name', product_name.trim()).limit(1).maybeSingle()
    if (!product) return NextResponse.json({ sent: false, reason: 'product_not_found' })

    // نلقى الموردين المرتبطين بهذا المنتج (أساسي وبديل)
    const { data: links } = await (db as any).from('product_suppliers').select('supplier_id').eq('product_id', product.id)
    const linkedSupplierIds = (links || []).map((l: any) => l.supplier_id)
    if (linkedSupplierIds.length === 0) return NextResponse.json({ sent: false, reason: 'no_linked_supplier' })

    const { data: suppliers } = await db.from('suppliers').select('id,name,phone,whatsapp_consent').in('id', linkedSupplierIds)

    // نتحقق: هل اسم المورد المكتوب يطابق أحد الموردين المرتبطين فعلياً (تطابق نص، بدون حساسية لحالة الأحرف/المسافات)
    const typedName = supplier_name.trim().toLowerCase()
    const matchedSupplier = (suppliers || []).find((s: any) => (s.name || '').trim().toLowerCase() === typedName)

    if (!matchedSupplier) return NextResponse.json({ sent: false, reason: 'supplier_mismatch' })

    // إشعار داخلي — دايماً يصل بغض النظر عن موافقة واتساب
    await (db as any).from('notifications').insert({
      org_id, title: `توصيل مؤكد: ${matchedSupplier.name}`,
      message: `تم استلام "${product_name}" — أُرسلت رسالة شكر للمورد`, type: 'success', read: false,
    })

    if (!matchedSupplier.phone || matchedSupplier.whatsapp_consent !== true) {
      return NextResponse.json({ sent: false, reason: 'no_consent' })
    }

    const msg = `🟢 *Storely*\n\nشكراً لكم على توصيل الطلب بنجاح ✅\n\nالصنف: *${product_name}*\n\nنقدّر تعاملكم ونتطلع للتعامل معكم دايماً 🌿`

    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: formatPhone(matchedSupplier.phone), text: msg }),
    })

    return NextResponse.json({ sent: true, supplier: matchedSupplier.name })
  } catch (err: any) {
    return NextResponse.json({ sent: false, error: 'حدث خطأ' }, { status: 500 })
  }
}
