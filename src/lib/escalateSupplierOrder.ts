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

/**
 * يحوّل طلب توريد تلقائياً لمورد بديل عند عدم توفر الصنف أو انتهاء مهلة الرد.
 * يُستخدم من مكانين: webhook.ts (فوري عند رد "غير متوفر") و escalate-supplier-orders (يومي عند انتهاء المهلة).
 */
export async function escalateOrder(order: any, reason: 'unavailable' | 'timeout') {
  const db = sb()
  const items: any[] = order.items || []
  const productIds = items.map((i: any) => i.product_id).filter(Boolean)
  if (!productIds.length) return { escalated: false, reason: 'no_product_ids' as const }

  const { data: products } = await db.from('products').select('id,name,unit,backup_supplier_id').in('id', productIds)

  const byBackup: Record<string, any[]> = {}
  for (const item of items) {
    const prod = (products || []).find((p: any) => p.id === item.product_id)
    if (!prod?.backup_supplier_id) continue
    if (!byBackup[prod.backup_supplier_id]) byBackup[prod.backup_supplier_id] = []
    byBackup[prod.backup_supplier_id].push(item)
  }

  const backupIds = Object.keys(byBackup)
  if (!backupIds.length) return { escalated: false, reason: 'no_backup' as const }

  const { data: org } = await db.from('organizations').select('name,whatsapp_number').eq('id', order.org_id).single()
  const escalatedNames: string[] = []

  for (const backupId of backupIds) {
    const { data: backupSupplier } = await db.from('suppliers').select('id,name,phone').eq('id', backupId).single()
    if (!backupSupplier?.phone) continue

    const its = byBackup[backupId]
    const itemsList = its.map((it: any, i: number) => `${i + 1}. *${it.name}* — ${it.qty} ${it.unit}`).join('\n')
    const orgName = (org as any)?.name || 'المتجر'
    const reasonNote = reason === 'unavailable'
      ? `⚠️ هذا الطلب مُحوّل تلقائياً لأن المورد الأساسي أبلغ بعدم توفر الصنف`
      : `⚠️ هذا الطلب مُحوّل تلقائياً لأن المورد الأساسي لم يرد خلال 24 ساعة`

    const msg = `📦 *طلب توريد — ${orgName}*\n\n${reasonNote}\n\nنحتاج توريد المواد التالية:\n\n${itemsList}\n\nنرجو التوريد في أقرب وقت. شكراً 🙏\n\nللتأكيد رد بكلمة: *تم*\nإن لم يتوفر الصنف، رد بكلمة: *غير متوفر*\n\n_Storely — نظام إدارة المخزون_`

    await (db as any).from('supplier_orders').insert({
      org_id: order.org_id,
      supplier_id: backupId,
      supplier_name: backupSupplier.name,
      supplier_phone: backupSupplier.phone,
      items: its,
      status: 'pending',
      escalated_from: order.id,
      escalated_at: new Date().toISOString(),
    })

    await sendWhatsApp(formatPhone(backupSupplier.phone), msg)
    escalatedNames.push(backupSupplier.name)
  }

  await (db as any).from('supplier_orders').update({ status: 'escalated' }).eq('id', order.id)

  if ((org as any)?.whatsapp_number && escalatedNames.length) {
    const ownerPhone = (org as any).whatsapp_number.replace(/\D/g, '').replace(/^0/, '966')
    const reasonText = reason === 'unavailable' ? 'أبلغ بعدم توفر الصنف' : 'لم يرد خلال 24 ساعة'
    const ownerMsg = `🟢 *Storely*\n\n🔄 تم التحويل التلقائي\n\nالمورد *${order.supplier_name}* ${reasonText}، فتم إرسال الطلب تلقائياً إلى المورد البديل:\n${escalatedNames.map(n => `• ${n}`).join('\n')}\n\nبانتظار تأكيدهم`
    await sendWhatsApp(ownerPhone, ownerMsg)
  }

  return { escalated: escalatedNames.length > 0, suppliers: escalatedNames }
}
