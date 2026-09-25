import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToOrg } from '@/lib/push'
import { formatPhone, sendWhatsAppMessage } from '@/lib/whatsapp'

/** كلمات تأكيد المورد (بعد تنظيف الرموز والإيموجي) */
const CONFIRM_WORDS = new Set(['تم', 'تمام', 'موافق', 'تأكيد', 'تاكيد', 'اكيد', 'أكيد', 'ابشر', 'أبشر', 'حاضر', 'ok', 'okay', 'done', 'confirmed', 'yes'])

/** هل الرد تأكيد من المورد؟ ("تم" / "تمام ✅" / "👍" / "تم التوريد" ...) */
export function isSupplierConfirmation(raw: string): boolean {
  const text = (raw || '').trim()
  if (/^(👍|✅|✔️|👌)+$/u.test(text.replace(/\s/g, ''))) return true
  const t = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (CONFIRM_WORDS.has(t)) return true
  const first = t.split(' ')[0]
  return first === 'تم' || first === 'تمام'
}

/** آخر طلب توريد معلّق لرقم المورد (مطابقة آخر 9 أرقام — يتجاهل صيغة الرقم الدولية/المحلية) */
export async function findPendingOrderForPhone(db: SupabaseClient, phone: string) {
  const last9 = (phone || '').replace(/\D/g, '').slice(-9)
  if (last9.length < 9) return null
  const { data } = await db.from('supplier_orders')
    .select('id,org_id,branch_id,supplier_id,supplier_name,supplier_phone,items,current_priority,created_at,token,status')
    .eq('status', 'pending').ilike('supplier_phone', `%${last9}`)
    .order('created_at', { ascending: false }).limit(5)
  return ((data || []) as any[]).find(o => (o.supplier_phone || '').replace(/\D/g, '').slice(-9) === last9) || null
}

/**
 * يبلّغ المالك إن المورد أكد الطلب: إشعار داخل النظام + إشعار جوال دايماً،
 * وواتساب لو المالك موافق وما عطّل إشعارات الموردين.
 */
export async function notifyOwnerSupplierConfirmed(db: SupabaseClient, order: any) {
  const { data: org } = await db.from('organizations').select('name,whatsapp_number,notify_supplier_wa,digest_mode').eq('id', order.org_id).single()
  if (!org) return { ok: false as const, orgName: '' }

  await db.from('notifications').insert({
    org_id: order.org_id, branch_id: order.branch_id || null,
    title: `تأكيد مورد: ${order.supplier_name}`, message: 'تم تأكيد الطلب — سيتم التوصيل قريباً',
    type: 'success', read: false,
  } as any)
  sendPushToOrg(order.org_id, `تأكيد مورد: ${order.supplier_name}`, 'تم تأكيد الطلب — سيتم التوصيل قريباً', '/purchases').catch(() => {})

  const orgName = (org as any).name || ''
  const { data: owner } = await db.from('profiles').select('whatsapp_consent').eq('org_id', order.org_id).eq('role', 'owner').maybeSingle()
  if ((owner as any)?.whatsapp_consent !== true) return { ok: true as const, orgName, skipped: 'whatsapp_consent' }
  // تأكيد المورد مو حرج — يتوقف لو المالك عطّل إشعارات الموردين أو مفعّل وضع الملخص
  if ((org as any).notify_supplier_wa === false || (org as any).digest_mode === true) return { ok: true as const, orgName, skipped: 'notify_preference' }

  const { data: branches } = await db.from('branches').select('id,name,whatsapp_number').eq('org_id', order.org_id).eq('is_active', true)
  const current = order.branch_id ? (branches || []).find((b: any) => b.id === order.branch_id) : null
  const branchLine = ((branches || []).length > 1 && (current as any)?.name) ? `🏪 الفرع: *${(current as any).name}*\n` : ''
  // رقم الفرع المخصص له الأولوية على رقم المنشأة الرئيسي
  const notifyPhone = (current as any)?.whatsapp_number || (org as any).whatsapp_number
  if (!notifyPhone) return { ok: true as const, orgName, skipped: 'no_phone' }

  const items = (order.items || []).map((i: any) => `• ${i.name} — ${i.qty} ${i.unit}`).join('\n')
  const msg = `🟢 *Storely*\n\nمرحباً ${orgName}،\n\n✅ المورد *${order.supplier_name}* أكد طلب التوريد\n${branchLine}\n${items}\n\nسيتم التوصيل قريباً`
  await sendWhatsAppMessage(formatPhone(notifyPhone), msg)
  return { ok: true as const, orgName }
}
