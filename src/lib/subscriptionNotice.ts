// رسالة «انتهى اشتراكك» (واتساب + إيميل) — نص واحد للمهمة اليومية وزر الإدارة «أرسل رسالة التجديد»
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { subscriptionReminderEmail } from '@/lib/emailTemplates'
import { pickOwnerWhatsapp } from '@/lib/ownerContact'

/** نص الواتساب: يوم الانتهاء، وبعده تذكير «بانتظار التجديد» */
export function expiredWhatsappText(name: string | null | undefined, daysAgo: number, isTrial = false) {
  const hi = `مرحباً ${name || ''}،`.replace(' ،', '،')
  if (daysAgo <= 1) return `${hi}\n\nنود إعلامك بأن ${isTrial ? 'تجربتك المجانية' : 'اشتراكك'} في Storely انتهى اليوم.\n\nجدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً، وتواصل متابعة منشأتك من حيث توقفت:\nstorely.dev/renew\n\nشكراً لثقتك بـ Storely.`
  return `${hi}\n\nنذكّرك بأن اشتراكك في Storely بانتظار التجديد.\n\nجدّد اشتراكك ليُعاد تفعيل حسابك فوراً:\nstorely.dev/renew\n\nيسعدنا خدمتك دائماً.`
}

/** نص واتساب التذكير اليدوي */
export function reminderWhatsappText(name: string | null | undefined, isTrial: boolean) {
  const hi = `مرحباً ${name || ''}،`.replace(' ،', '،')
  return `${hi}\n\nنذكّرك بأن ${isTrial ? 'تجربتك المجانية في Storely انتهت' : 'اشتراكك في Storely بانتظار التجديد'}.\n\nجدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً:\nstorely.dev/renew\n\nيسعدنا خدمتك دائماً.`
}

/** تذكير يدوي من زر الإدارة (واتساب + إيميل) — لا يغيّر علامات الرسائل التلقائية فتبقى كما هي */
export async function sendRenewalReminder(db: SupabaseClient, orgId: string) {
  const [{ data: p }, { data: org }] = await Promise.all([
    db.from('profiles').select('id,full_name,phone,subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('organizations').select('name,whatsapp_number').eq('id', orgId).maybeSingle(),
  ])
  const owner = p as any
  if (!owner?.subscription_ends_at || Date.parse(owner.subscription_ends_at) > Date.now()) return { ok: false as const, error: 'اشتراك هذه المنشأة ساري' }
  const isTrial = owner.subscription_type === 'trial'
  const name = owner.full_name || (org as any)?.name || null
  const to = pickOwnerWhatsapp((org as any)?.whatsapp_number, owner.phone)
  const wa = to ? (await sendWhatsAppMessage(to, reminderWhatsappText(owner.full_name, isTrial))).ok : false
  let email: string | null = null
  try { email = (await db.auth.admin.getUserById(owner.id)).data?.user?.email || null } catch {}
  const mail = email ? (await sendEmail({ to: email, ...subscriptionReminderEmail({ name, isTrial }) })).success === true : false
  return { ok: true as const, wa, mail, hasWa: !!to, hasEmail: !!email }
}
