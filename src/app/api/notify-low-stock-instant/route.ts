import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

async function sendWA(phone: string, text: string) {
  return fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
      'X-Session-Id': process.env.WASENDER_SESSION_ID!,
    },
    body: JSON.stringify({ to: formatPhone(phone), text }),
  })
}

export async function POST(req: Request) {
  try {
    const { org_id, product_id, new_qty, reorder_point, staff_name, qty_dispensed, product_name, product_unit } = await req.json()
    if (!org_id || !product_id) return NextResponse.json({ success: false })

    // لا ترسل إذا المخزون لا يزال كافٍ
    if (new_qty > reorder_point) return NextResponse.json({ success: false, message: 'كافٍ' })

    // لا ترسل إذا كان ناقصاً مسبقاً — فقط عند الوصول للحد للمرة الأولى
    if (new_qty < reorder_point) return NextResponse.json({ success: false, message: 'كان ناقصاً مسبقاً' })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('notify-instant called:', { org_id, product_id, new_qty, reorder_point })
    const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', org_id).single()
    console.log('org:', org)
    if (!org) return NextResponse.json({ success: false })

    const { data: product } = await db.from('products')
      .select('id,name,qty,unit,reorder_point,supplier_id,supplier_order_qty,supplier_notes')
      .eq('id', product_id).single()
    console.log('product:', product)
    if (!product) return NextResponse.json({ success: false })

    const orderQty = (product as any).supplier_order_qty || (product as any).reorder_point

    // إرسال للمورد إذا موجود
    let sentToSupplier = false
    console.log('supplier_id:', (product as any).supplier_id)
    if ((product as any).supplier_id) {
      const { data: supplier } = await (db as any).from('suppliers')
        .select('name,phone').eq('id', (product as any).supplier_id).single()
      if ((supplier as any)?.phone) {
        // إنشاء طلب مع token
      const orderItems = [{ name: (product as any).name, qty: orderQty, unit: (product as any).unit }]
      const { data: orderData, error: orderErr } = await (db as any).from('supplier_orders').insert({
        org_id,
        supplier_name: (supplier as any).name,
        supplier_phone: (supplier as any).phone,
        items: orderItems,
      }).select('token').single()
      if (orderErr) {
        return NextResponse.json({ success: false, debug: orderErr.message })
      }
      const token = (orderData as any)?.token || ''
      const confirmUrl = `https://storely.dev/confirm/${token}`

      const notesLine = (product as any).supplier_notes ? `\n📝 ${(product as any).supplier_notes}\n` : ''
      const supplierMsg = `🟢 *Storely*\n\nمرحباً ${(supplier as any).name}،\n\nطلب توريد من *${(org as any).name}*\n\n• ${(product as any).name} — *${orderQty} ${(product as any).unit}*${notesLine}\nللتأكيد رد بكلمة: *تم*`
        await sendWA((supplier as any).phone, supplierMsg)
        sentToSupplier = true
      }
    }

    // احسب معدل الصرف اليومي لتوقع النفاد
    const since7 = new Date(Date.now() - 7*24*60*60*1000).toISOString()
    const { data: recentMov } = await db.from('stock_movements')
      .select('qty_change')
      .eq('product_id', product_id)
      .eq('type','out')
      .gte('created_at', since7)
    
    const total7 = (recentMov||[]).reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0)
    const dailyRate = total7/7
    const daysLeft = dailyRate>0 ? Math.floor(new_qty/dailyRate) : null

    // رسالة المدير — وصل للحد الأدنى
    if ((org as any).whatsapp_number) {
      const daysMsg = daysLeft !== null 
        ? `⏳ *المخزون سينفد خلال ${daysLeft} يوم* (بناءً على معدل صرفك ${dailyRate.toFixed(1)} ${(product as any).unit}/يوم)`
        : ''
      
      const adminMsg = sentToSupplier
        ? `🟢 *Storely*

مرحباً ${(org as any).name}،

⚠️ *${(product as any).name}* وصل للحد الأدنى
المتبقي: *${new_qty} ${(product as any).unit}*
${daysMsg}

✅ تم إرسال طلب توريد للمورد تلقائياً`
        : `🟢 *Storely*

مرحباً ${(org as any).name}،

⚠️ *${(product as any).name}* وصل للحد الأدنى
المتبقي: *${new_qty} ${(product as any).unit}*
${daysMsg}

يرجى الطلب في أقرب وقت 🛒`
      await sendWA((org as any).whatsapp_number, adminMsg)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
