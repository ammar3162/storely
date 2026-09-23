import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { sendPushToOrg } from '@/lib/push'
import { orderedSinceLastRestock, logSupplierOrder } from '@/lib/supplierOrderGate'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

async function sendWA(phone: string, text: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: formatPhone(phone), text }),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, product_id, new_qty, reorder_point, staff_name, qty_dispensed, product_name, product_unit } = await req.json()
    if (!org_id || !product_id) return NextResponse.json({ success: false })

    // تحقق مزدوج: يقبل إما توكن موظف صالح، أو جلسة مالك صالحة — يخدم الاثنين
    const staffAuth = await verifyStaffToken(extractStaffToken(req))
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
      .select('id,name,qty,unit,reorder_point,supplier_id,supplier_reorder_point,supplier_order_qty,supplier_notes,branch_id,marketplace_catalog_item_id,org_id')
      .eq('id', product_id).single()
    console.log('product:', product)
    if (!product || (product as any).org_id !== org_id) return NextResponse.json({ success: false })

    // الحد الفعلي من قاعدة البيانات (مو من الطلب): حد المورد لو محدد، وإلا الحد الأدنى العام
    const threshold = (product as any).supplier_reorder_point ?? (product as any).reorder_point
    const supplierDue = Number((product as any).qty) <= Number(threshold)

    const orderQty = (product as any).supplier_order_qty || (product as any).reorder_point

    // إرسال للمورد إذا موجود ووافق على استلام الرسائل
    let sentToSupplier = false
    let sentAsMarketplaceOrder = false
    console.log('supplier_id:', (product as any).supplier_id)
    // طلب واحد فقط لكل نزول تحت الحد — لو انرسل طلب ولسا ما انعاد تعبئة الصنف، ما نرسل شي للمورد
    if ((product as any).supplier_id && supplierDue && !(await orderedSinceLastRestock(db as any, product_id))) {
      const { data: supplier } = await (db as any).from('suppliers')
        .select('name,phone,whatsapp_consent,marketplace_supplier_id').eq('id', (product as any).supplier_id).single()

      if ((supplier as any)?.marketplace_supplier_id && (product as any).marketplace_catalog_item_id) {
        const { data: catalogItem } = await (db as any).from('supplier_catalog_items')
          .select('name,unit,price').eq('id', (product as any).marketplace_catalog_item_id).maybeSingle()
        if (catalogItem) {
          const unitPrice = Number((catalogItem as any).price) || 0
          await (db as any).from('quote_requests').insert({
            supplier_id: (supplier as any).marketplace_supplier_id,
            org_id, org_name: (org as any).name,
            branch_id: (product as any).branch_id || null,
            items: [{ name: (product as any).name, qty: orderQty, unit: (product as any).unit }],
            status: 'accepted',
            quoted_price: unitPrice * orderQty,
            quoted_note: 'طلب توريد تلقائي — وصل المخزون للحد الأدنى',
          })
          sentToSupplier = true
          sentAsMarketplaceOrder = true
          await logSupplierOrder(db as any, { product_id, supplier_id: (product as any).supplier_id, qty_at_trigger: Number((product as any).qty), ok: true })
        }
      }

      if (!sentAsMarketplaceOrder && (supplier as any)?.phone && (supplier as any)?.whatsapp_consent === true) {
        const notesLine = (product as any).supplier_notes ? `\n📝 ${(product as any).supplier_notes}\n` : ''

        const orderItems = [{ name: (product as any).name, qty: orderQty, unit: (product as any).unit }]
        const { error: orderErr } = await (db as any).from('supplier_orders').insert({
          org_id,
          branch_id: (product as any).branch_id || null,
          product_id,
          supplier_id: (product as any).supplier_id,
          supplier_name: (supplier as any).name,
          supplier_phone: (supplier as any).phone,
          items: orderItems,
          status: 'pending',
          current_priority: 1,
        })
        if (orderErr) {
          return NextResponse.json({ success: false, debug: orderErr.message })
        }

        const supplierMsg = `🟢 *Storely*\n\nمرحباً ${(supplier as any).name}،\n\nطلب توريد من *${(org as any).name}*\n\n• ${(product as any).name} — *${orderQty} ${(product as any).unit}*${notesLine}\nللتأكيد رد بكلمة: *تم*\nلو الصنف غير متوفر حالياً، رد بـ: *0*`
        const sent = await sendWA((supplier as any).phone, supplierMsg)
        await logSupplierOrder(db as any, { product_id, supplier_id: (product as any).supplier_id, qty_at_trigger: Number((product as any).qty), ok: sent.ok })
        sentToSupplier = sent.ok
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

    // رقم الفرع المخصص له الأولوية على رقم المؤسسة الرئيسي
    let notifyPhone = (org as any).whatsapp_number
    if ((product as any).branch_id) {
      const { data: prodBranch } = await db.from('branches').select('whatsapp_number').eq('id', (product as any).branch_id).maybeSingle()
      notifyPhone = (prodBranch as any)?.whatsapp_number || notifyPhone
    }

    // رسالة المدير — وصل للحد الأدنى
    if (notifyPhone && ownerConsented) {
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
      const ownerSendResult = await sendWA(notifyPhone, adminMsg)
      try {
        await db.from('notification_logs').insert({
          org_id: org_id,
          notification_type: 'low_stock_owner',
          phone: notifyPhone,
          status: ownerSendResult.ok ? 'sent' : 'failed',
        })
      } catch {}
      // إشعار فوري بالمتصفح/الجوال — لا يعتمد على واتساب إطلاقاً
      sendPushToOrg(org_id, '⚠️ نقص مخزون', `${(product as any).name} وصل للحد الأدنى — المتبقي ${new_qty} ${(product as any).unit}`, '/inventory').catch(()=>{})
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
