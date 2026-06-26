import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.WASENDER_API_KEY!
const SESSION      = process.env.WASENDER_SESSION_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '').replace(/^\+/, '')
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05'))  return '966' + clean.slice(1)
  if (clean.startsWith('5'))   return '966' + clean
  return '966' + clean
}

async function sendWhatsApp(phone: string, text: string) {
  const res = await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'X-Session-Id': SESSION },
    body: JSON.stringify({ to: phone, text }),
  })
  return res.ok
}

function buildOrderMessage(orgName: string, items: { name: string; qty: number; unit: string; orderQty: number }[]) {
  const itemsList = items
    .map((it, i) => `${i + 1}. *${it.name}*\n   الكمية الحالية: ${it.qty} ${it.unit}\n   الكمية المطلوب توريدها: ${it.orderQty} ${it.unit}`)
    .join('\n\n')

  return `📦 *طلب توريد جديد*\n\nمرحباً،\n\nنفيدكم بأن المخزون التالي وصل للحد الذي يستوجب إعادة التوريد من *${orgName}*:\n\n${itemsList}\n\nنرجو التكرم بتزويدنا بأسرع وقت ممكن.\n\nشكراً لتعاونكم 🙏\n_رسالة آلية من نظام Storely_`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const orgId = body?.org_id

    const supabase = sb()

    let query = supabase
      .from('products')
      .select('id, name, qty, unit, supplier_id, supplier_reorder_point, supplier_order_qty, org_id, organizations(name)')
      .not('supplier_id', 'is', null)
      .not('supplier_reorder_point', 'is', null)
      .eq('is_active', true)

    if (orgId) query = query.eq('org_id', orgId)

    const { data: products, error } = await query
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    const due = (products || []).filter(
      (p: any) => p.qty <= p.supplier_reorder_point
    )

    if (!due.length) return NextResponse.json({ success: true, sent: 0, message: 'لا توجد منتجات تحتاج طلب توريد' })

    const bySupplier: Record<string, any[]> = {}
    for (const p of due) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentLog } = await supabase
        .from('supplier_order_logs')
        .select('id')
        .eq('product_id', p.id)
        .gte('created_at', since)
        .maybeSingle()

      if (recentLog) continue

      if (!bySupplier[p.supplier_id]) bySupplier[p.supplier_id] = []
      bySupplier[p.supplier_id].push(p)
    }

    let totalSent = 0

    for (const supplierId of Object.keys(bySupplier)) {
      const items = bySupplier[supplierId]
      const { data: supplier } = await supabase.from('suppliers').select('name, phone').eq('id', supplierId).single()
      if (!supplier?.phone) continue

      const orgName = (items[0] as any).organizations?.name || 'المتجر'
      const messageItems = items.map((p: any) => ({
        name: p.name,
        qty: p.qty,
        unit: p.unit || 'قطعة',
        orderQty: p.supplier_order_qty || p.supplier_reorder_point || 0,
      }))

      const text = buildOrderMessage(orgName, messageItems)
      const ok = await sendWhatsApp(formatPhone(supplier.phone), text)

      for (const p of items) {
        await supabase.from('supplier_order_logs').insert({
          product_id: p.id,
          supplier_id: supplierId,
          qty_at_trigger: p.qty,
          status: ok ? 'sent' : 'failed',
        })
      }

      if (ok) totalSent += items.length
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST', body: '{}' }))
}
