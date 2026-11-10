// رسالة «انتهى اشتراكك» (واتساب + إيميل) — نص واحد للمهمة اليومية وزر الإدارة «أرسل رسالة التجديد»
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'
import { subscriptionEndedEmail } from '@/lib/emailTemplates'
import { pickOwnerWhatsapp } from '@/lib/ownerContact'

/** نص الواتساب: يوم الانتهاء، وبعده تذكير «بانتظار التجديد» */
export function expiredWhatsappText(name: string | null | undefined, daysAgo: number, isTrial = false) {
  const hi = `مرحباً ${name || ''}،`.replace(' ،', '،')
  if (daysAgo <= 1) return `${hi}\n\nنود إعلامك بأن ${isTrial ? 'تجربتك المجانية' : 'اشتراكك'} في Storely انتهى اليوم.\n\nجدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً، وتواصل متابعة منشأتك من حيث توقفت:\nstorely.dev/renew\n\nشكراً لثقتك بـ Storely.`
  return `${hi}\n\nنذكّرك بأن اشتراكك في Storely بانتظار التجديد.\n\nجدّد اشتراكك ليُعاد تفعيل حسابك فوراً:\nstorely.dev/renew\n\nيسعدنا خدمتك دائماً.`
}

/** يرسل للمالك واتساب وإيميل «انتهى اشتراكك» ويعلّم إنه وصله — من زر الإدارة */
export async function sendExpiredNotice(db: SupabaseClient, orgId: string) {
  const [{ data: p }, { data: org }] = await Promise.all([
    db.from('profiles').select('id,full_name,phone,subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('organizations').select('name,whatsapp_number').eq('id', orgId).maybeSingle(),
  ])
  const owner = p as any
  if (!owner?.subscription_ends_at || Date.parse(owner.subscription_ends_at) > Date.now()) return { ok: false as const, error: 'اشتراك هذه المنشأة ساري' }
  const isTrial = owner.subscription_type === 'trial'
  const name = owner.full_name || (org as any)?.name || null
  const daysAgo = Math.max(0, Math.floor((Date.now() - Date.parse(owner.subscription_ends_at)) / 86400e3))
  const to = pickOwnerWhatsapp((org as any)?.whatsapp_number, owner.phone)
  const wa = to ? (await sendWhatsAppMessage(to, expiredWhatsappText(owner.full_name, daysAgo, isTrial))).ok : false
  let email: string | null = null
  try { email = (await db.auth.admin.getUserById(owner.id)).data?.user?.email || null } catch {}
  const mail = email ? (await sendEmail({ to: email, ...subscriptionEndedEmail({ name, isTrial }) })).success === true : false
  if (wa || mail) await db.from('profiles').update({ renewal_reminder_at: new Date().toISOString(), expiry_notice_sent: true } as any).eq('id', owner.id)
  return { ok: true as const, wa, mail, hasWa: !!to, hasEmail: !!email }
}
