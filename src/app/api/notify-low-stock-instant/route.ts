import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
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

    // تحقق مزدوج: يقبل إما توكن موظف صالح، أو جلسة مالك صالحة — يخدم الاثنين
    const staffAuth = verifyStaffToken(extractStaffToken(req))
    if (staffAuth.valid) {
      if (staffAuth.data!.org_id !== org_id) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 })
    } else {
      const ownerAuth = await verifyOrgAccess(org_id)
      if (!ownerAuth.authorized) return NextResponse.json({ success: false, error: ownerAuth.error }, { status: ownerAuth.status })
    }

    // لا ترسل إذا المخزون لا يزال كافٍ
    if (new_qty > reorder_point) return NextResponse.json({ success: false, message: 'كافٍ' })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('notify-instant called:', { org_id, product_id, new_qty, reorder_point })
    const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', org_id).single()
    console.log('org:', org)
    if (!org) return NextResponse.json({ success: false })

    const subActive = await isSubscriptionActive(db, org_id)
    if (!subActive) return NextResponse.json({ success: false, message: 'الاشتراك منتهي — لا يتم إرسال إشعارات' })

    const { data: product } = await db.from('products')
      .select('id,name,qty,unit,reorder_point,supplier_id,supplier_order_qty,supplier_notes,branch_id')
      .eq('id', product_id).single()
    console.log('product:', product)
    if (!product) return NextResponse.json({ success: false })

    const orderQty = (product as any).supplier_order_qty || (product as any).reorder_point

    // إرسال للمورد إذا موجود ووافق على استلام الرسائل
    let sentToSupplier = false
    console.log('supplier_id:', (product as any).supplier_id)
    if ((product as any).supplier_id) {
      const { data: supplier } = await (db as any).from('suppliers')
        .select('name,phone,whatsapp_consent').eq('id', (product as any).supplier_id).single()

      if ((supplier as any)?.phone && (supplier as any)?.whatsapp_consent === true) {
        const notesLine = (product as any).supplier_notes ? `\n📝 ${(product as any).supplier_notes}\n` : ''

        // تحقق: فيه طلب معلّق لنفس الصنف ونفس المورد؟ لو فيه، نرسل تذكير بس بدل طلب جديد مكرر
        const { data: pendingExisting } = await (db as any).from('supplier_orders')
          .select('*')
          .eq('org_id', org_id)
          .eq('product_id', product_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (pendingExisting) {
          const items = (pendingExisting as any).items || []
          const itemsText = items.map((i: any) => `• ${i.name} — *${i.qty} ${i.unit}*`).join('\n')
          const reminderMsg = `🟢 *Storely*\n\nمرحباً ${(supplier as any).name}،\n\n🔔 *تذكير بطلب سابق لسا ما تأكد*\n\n${itemsText}${notesLine}\nللتأكيد رد بكلمة: *تم*\nلو الصنف غير متوفر حالياً، رد بـ: *0*`
          await sendWA((supplier as any).phone, reminderMsg)
          sentToSupplier = true
        } else {
          const orderItems = [{ name: (product as any).name, qty: orderQty, unit: (product as any).unit }]
          const { data: orderData, error: orderErr } = await (db as any).from('supplier_orders').insert({
            org_id,
            product_id,
            supplier_name: (supplier as any).name,
            supplier_phone: (supplier as any).phone,
            items: orderItems,
          }).select('token').single()
          if (orderErr) {
            return NextResponse.json({ success: false, debug: orderErr.message })
          }

          const supplierMsg = `🟢 *Storely*\n\nمرحباً ${(supplier as any).name}،\n\nطلب توريد من *${(org as any).name}*\n\n• ${(product as any).name} — *${orderQty} ${(product as any).unit}*${notesLine}\nللتأكيد رد بكلمة: *تم*\nلو الصنف غير متوفر حالياً، رد بـ: *0*`
          await sendWA((supplier as any).phone, supplierMsg)
          sentToSupplier = true
        }
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

    // إشعار داخل النظام — يصل دائماً بغض النظر عن موافقة واتساب
    const notifTitle = `نقص مخزون: ${(product as any).name}`
    const notifMsg = `المتبقي: ${new_qty} ${(product as any).unit}` + (sentToSupplier ? ' — تم إرسال طلب توريد للمورد تلقائياً' : ' — يرجى الطلب في أقرب وقت')
    await (db as any).from('notifications').insert({
      org_id, branch_id: (product as any).branch_id || null, title: notifTitle, message: notifMsg, type: 'warning', read: false
    })

    // تحقق من موافقة المالك قبل إرسال رسالة نقص المخزون له عبر واتساب
    const { data: ownerProfile } = await db.from('profiles')
      .select('whatsapp_consent')
      .eq('org_id', org_id)
      .eq('role', 'owner')
      .maybeSingle()
    const ownerConsented = (ownerProfile as any)?.whatsapp_consent === true

    // رسالة المدير — وصل للحد الأدنى
    if ((org as any).whatsapp_number && ownerConsented) {
      const daysMsg = daysLeft !== null 
        ? `⏳ *المخزون سينفد خلال ${daysLeft} يوم* (بناءً على معدل صرفك ${dailyRate.toFixed(1)} ${(product as any).unit}/يوم)`
        : ''
      
      const adminMsg = sentToSupplier
        ? `╔══════════════════════╗
   📦 Storely Alert
╚══════════════════════╝

🏢 *${(org as any).name}*

⚠️ *${(product as any).name}* وصل للحد الأدنى
📊 المتبقي: *${new_qty} ${(product as any).unit}*
${daysMsg}

✅ *تم إرسال طلب توريد للمورد تلقائياً*
سيتواصل معك المورد قريباً للتأكيد`
        : `╔══════════════════════╗
   📦 Storely Alert
╚══════════════════════╝

🏢 *${(org as any).name}*

⚠️ *${(product as any).name}* وصل للحد الأدنى
📊 المتبقي: *${new_qty} ${(product as any).unit}*
${daysMsg}

🛒 *يرجى الطلب في أقرب وقت*`
      await sendWA((org as any).whatsapp_number, adminMsg)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
