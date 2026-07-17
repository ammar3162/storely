import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

async function sendWhatsApp(phone: string, text: string) {
  try {
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: phone, text }),
    })
    return res.ok
  } catch { return false }
}

async function logPerformance(supplierId: string, orgId: string, orderId: string, eventType: 'confirmed'|'unavailable'|'timeout', responseMinutes: number | null) {
  const db = sb()
  await (db as any).from('supplier_performance_log').insert({
    supplier_id: supplierId,
    org_id: orgId,
    order_id: orderId,
    event_type: eventType,
    response_minutes: responseMinutes,
  }).catch(() => {})
}

/**
 * يحوّل طلب توريد تلقائياً لأعلى مورد أولوية تالٍ (priority + 1) لكل صنف.
 * لو صنف ما عنده مورد بأولوية أعلى، يتوقف السلسلة له (ما فيه بديل ثالث/رابع مثلاً).
 */
export async function escalateOrder(order: any, reason: 'unavailable' | 'timeout') {
  const db = sb()
  const items: any[] = order.items || []
  const currentPriority = order.current_priority || 1

  // سجّل أداء المورد الحالي (رفض أو عدم رد)
  const responseMinutes = reason === 'unavailable'
    ? Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
    : null
  await logPerformance(order.supplier_id, order.org_id, order.id, reason, responseMinutes)

  const productIds = items.map((i: any) => i.product_id).filter(Boolean)
  if (!productIds.length) return { escalated: false, reason: 'no_product_ids' as const }

  const { data: nextLinks } = await db
    .from('product_suppliers')
    .select('product_id, supplier_id, priority, order_qty')
    .in('product_id', productIds)
    .gt('priority', currentPriority)
    .order('priority', { ascending: true })

  // لكل منتج، خذ أقرب أولوية تالية (أصغر priority أكبر من الحالي)
  const nextForProduct: Record<string, { supplier_id: string; priority: number; order_qty?: number }> = {}
  for (const link of nextLinks || []) {
    const existing = nextForProduct[(link as any).product_id]
    if (!existing || (link as any).priority < existing.priority) {
      nextForProduct[(link as any).product_id] = link as any
    }
  }

  // جمّع الأصناف حسب المورد التالي + أولويته
  const bySupplier: Record<string, { priority: number; items: any[] }> = {}
  for (const item of items) {
    const next = nextForProduct[item.product_id]
    if (!next) continue
    if (!bySupplier[next.supplier_id]) bySupplier[next.supplier_id] = { priority: next.priority, items: [] }
    bySupplier[next.supplier_id].items.push({ ...item, qty: next.order_qty || item.qty })
  }

  const supplierIds = Object.keys(bySupplier)
  if (!supplierIds.length) return { escalated: false, reason: 'no_backup' as const }

  const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', order.org_id).single()
  const { data: allBranches } = await db.from('branches').select('id,name').eq('org_id', order.org_id).eq('is_active', true)
  const isMultiBranch = (allBranches || []).length > 1
  const branchName = order.branch_id ? (allBranches || []).find((b: any) => b.id === order.branch_id)?.name : null
  const escalatedNames: string[] = []

  for (const supplierId of supplierIds) {
    const { data: supplier } = await db.from('suppliers').select('id,name,phone,whatsapp_consent').eq('id', supplierId).single()
    if (!supplier?.phone || (supplier as any)?.whatsapp_consent !== true) continue

    const { items: its, priority } = bySupplier[supplierId]
    const itemsList = its.map((it: any, i: number) => `${i + 1}. *${it.name}* — ${it.qty} ${it.unit}`).join('\n')
    const orgName = (org as any)?.name || 'المتجر'
    const reasonNote = reason === 'unavailable'
      ? `⚠️ هذا الطلب مُحوّل تلقائياً لأن المورد السابق أبلغ بعدم توفر الصنف`
      : `⚠️ هذا الطلب مُحوّل تلقائياً لأن المورد السابق لم يرد بالوقت المحدد`

    const msg = `📦 *طلب توريد — ${orgName}*\n\n${reasonNote}\n\nنحتاج توريد المواد التالية:\n\n${itemsList}\n\nنرجو التوريد في أقرب وقت. شكراً 🙏\n\nللتأكيد رد بكلمة: *تم*\nإن لم يتوفر الصنف، رد بكلمة: *غير متوفر*\n\n_Storely — نظام إدارة المخزون_`

    await (db as any).from('supplier_orders').insert({
      org_id: order.org_id,
      branch_id: order.branch_id || null,
      supplier_id: supplierId,
      supplier_name: supplier.name,
      supplier_phone: supplier.phone,
      items: its,
      status: 'pending',
      current_priority: priority,
      escalated_from: order.id,
      escalated_at: new Date().toISOString(),
    })

    await sendWhatsApp(formatPhone(supplier.phone), msg)
    escalatedNames.push(supplier.name)
  }

  await (db as any).from('supplier_orders').update({ status: 'escalated' }).eq('id', order.id)

  const { data: ownerProfile } = await db.from('profiles').select('whatsapp_consent').eq('org_id', order.org_id).eq('role', 'owner').maybeSingle()
  const ownerConsented = (ownerProfile as any)?.whatsapp_consent === true

  // إشعار داخل النظام — يصل دائماً بغض النظر عن موافقة واتساب
  if (escalatedNames.length) {
    await (db as any).from('notifications').insert({
      org_id: order.org_id, title: 'تحويل طلب توريد تلقائياً', message: `تم تحويل الطلب إلى: ${escalatedNames.join('، ')}`, type: 'supplier_escalated', read: false
    })
  }

  if ((org as any)?.whatsapp_number && escalatedNames.length && ownerConsented) {
    const ownerPhone = (org as any).whatsapp_number.replace(/\D/g, '').replace(/^0/, '966')
    const reasonText = reason === 'unavailable' ? 'أبلغ بعدم توفر الصنف' : 'لم يرد بالوقت المحدد'
    const branchLine = (isMultiBranch && branchName) ? `🏪 الفرع: *${branchName}*\n` : ''
    const ownerMsg = `🟢 *Storely*\n\n🔄 تم التحويل التلقائي\n${branchLine}\nالمورد *${order.supplier_name}* ${reasonText}، فتم إرسال الطلب تلقائياً إلى المورد التالي بالأولوية:\n${escalatedNames.map(n => `• ${n}`).join('\n')}\n\nبانتظار تأكيدهم`
    await sendWhatsApp(ownerPhone, ownerMsg)
  }

  return { escalated: escalatedNames.length > 0, suppliers: escalatedNames }
}

export async function logConfirmation(order: any) {
  const responseMinutes = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
  await logPerformance(order.supplier_id, order.org_id, order.id, 'confirmed', responseMinutes)
}
