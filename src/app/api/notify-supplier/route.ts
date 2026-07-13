import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

function buildOrderMessage(orgName: string, items: { name: string; unit: string; orderQty: number; notes?: string }[], notes?: string) {
  const itemsList = items
    .map((it, i) => `${i + 1}. *${it.name}* — ${it.orderQty} ${it.unit}${it.notes ? '\n   📝 ' + it.notes : ''}`)
    .join('\n')

  const notesSection = notes ? `\n\n📝 *ملاحظات:* ${notes}` : ''

  return `📦 *طلب توريد — ${orgName}*\n\nمرحباً،\n\nنحتاج توريد المواد التالية:\n\n${itemsList}${notesSection}\n\nنرجو التوريد في أقرب وقت. شكراً 🙏\n_Storely — نظام إدارة المخزون_`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const orgId = body?.org_id

    const supabase = sb()

    // جلب المؤسسات التي حان وقت إرسالها
    let orgsQuery = supabase.from('organizations').select('id,name,supplier_notify_mode,supplier_notify_time,supplier_notify_day')
    if (orgId) orgsQuery = orgsQuery.eq('id', orgId)
    const { data: orgs } = await orgsQuery

    const now = new Date()
    const currentHour = now.getUTCHours() + 3 // توقيت السعودية
    const currentDay = now.getDay()
    const currentMinute = now.getMinutes()

    const eligibleOrgIds: string[] = []
    for (const org of orgs || []) {
      const mode = org.supplier_notify_mode || 'daily'
      if (orgId) { eligibleOrgIds.push(org.id); continue } // يدوي
      if (mode === 'instant') continue // يشتغل من صفحة الصرف
      if (mode === 'daily') {
        const [h, m] = (org.supplier_notify_time || '08:00').split(':').map(Number)
        if (currentHour === h && currentMinute < 30) eligibleOrgIds.push(org.id)
      }
      if (mode === 'weekly') {
        const [h, m] = (org.supplier_notify_time || '08:00').split(':').map(Number)
        if (currentDay === (org.supplier_notify_day || 0) && currentHour === h && currentMinute < 30) eligibleOrgIds.push(org.id)
      }
    }

    if (!eligibleOrgIds.length && !orgId) { 
      // إذا كان طلب يدوي أضف كل المؤسسات
      const isManual = body?.manual === true
      if (!isManual) return NextResponse.json({ success: true, sent: 0, message: 'لا توجد مؤسسات في وقت الإرسال' })
      for (const org of orgs || []) eligibleOrgIds.push(org.id)
    }

    let query = supabase
      .from('products')
      .select('id, name, qty, unit, supplier_id, supplier_reorder_point, supplier_order_qty, supplier_notes, org_id, organizations(name)')
      .not('supplier_id', 'is', null)
      .not('supplier_reorder_point', 'is', null)
      .eq('is_active', true)
      .in('org_id', eligibleOrgIds)

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
      const { data: supplier } = await supabase.from('suppliers').select('name, phone, notes').eq('id', supplierId).single()
      if (!supplier?.phone) continue

      const orgName = (items[0] as any).organizations?.name || 'المتجر'
      const messageItems = items.map((p: any) => ({
        name: p.name,
        unit: p.unit || 'قطعة',
        orderQty: p.supplier_order_qty || p.supplier_reorder_point || 0,
        notes: p.supplier_notes || '',
      }))

      const orgIdForOrder = (items[0] as any).org_id
      const orderItems = items.map((p: any, i: number) => ({
        product_id: p.id,
        name: messageItems[i].name,
        qty: messageItems[i].orderQty,
        unit: messageItems[i].unit,
      }))
      const { error: orderErr } = await (supabase as any).from('supplier_orders').insert({
        org_id: orgIdForOrder,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        supplier_phone: supplier.phone,
        items: orderItems,
        status: 'pending',
        current_priority: 1,
      })
      if (orderErr) console.log('supplier_orders insert error:', orderErr.message)

      const text = buildOrderMessage(orgName, messageItems, supplier.notes) + '\n\nللتأكيد رد بكلمة: *تم*\nإن لم يتوفر الصنف، رد بكلمة: *غير متوفر*'
      const result = await sendWhatsAppMessage(formatPhone(supplier.phone), text)
      const ok = result.ok

      for (const p of items) {
        await supabase.from('supplier_order_logs').insert({
          product_id: p.id,
          supplier_id: supplierId,
          qty_at_trigger: p.qty,
          status: ok ? 'sent' : 'failed',
        })
      }

      if (ok) totalSent += items.length
      await delay(600) // فاصل زمني يحمي من تجاوز حدود إرسال Wasender API
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ manual: true }) }))
}
