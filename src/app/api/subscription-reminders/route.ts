import { NextResponse } from 'next/server'
import { trialEndingMessage } from '@/lib/trialReminder'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { pickOwnerWhatsapp } from '@/lib/ownerContact'
import { isCronRequest } from '@/lib/cronAuth'
import { syncBranchesToLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'
import { sendEmail } from '@/lib/email'
import { subscriptionEndingEmail, subscriptionEndedEmail } from '@/lib/emailTemplates'
import { expiredWhatsappText } from '@/lib/subscriptionNotice'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = sb()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const DAY = 24 * 60 * 60 * 1000
  // تذكير التجديد: كل يومين لمدة ٣٠ يوم بعد الانتهاء (المهمة يومية، ونسمح بفرق ساعة بتوقيتها)
  const REMIND_EVERY = 2 * DAY - 60 * 60 * 1000, REMIND_FOR = 30 * DAY

  // إضافة "فرع إضافي" انتهت بدون تجديد: نوقف الفروع الزايدة عن الحد (مؤقتاً — ترجع بالتجديد)
  let branchesLocked = 0
  const { data: expiredBranchSubs } = await db.from('org_addon_subscriptions')
    .select('org_id,marketplace_addons!inner(slug)')
    .eq('status', 'active').lt('expires_at', now.toISOString())
    .eq('marketplace_addons.slug', EXTRA_BRANCH_SLUG)
  for (const org_id of new Set(((expiredBranchSubs || []) as any[]).map(r => r.org_id))) {
    branchesLocked += (await syncBranchesToLimit(db, org_id)).locked
  }

  const { data: profiles } = await db
    .from('profiles')
    .select('id,full_name,phone,subscription_type,subscription_ends_at,trial_reminder_sent,renewal_reminder_at,expiry_notice_sent,organizations(whatsapp_number,name)')
    .eq('role', 'owner')
    .eq('status', 'active')
    .not('subscription_ends_at', 'is', null)

  let remindersSent = 0
  let expirySent = 0
  let emailsSent = 0
  // بريد المالك من حسابه (نجيبه بس لما نحتاجه — أغلب المالكين ما عندهم تذكير اليوم)
  const ownerEmail = async (id: string) => { try { return (await db.auth.admin.getUserById(id)).data?.user?.email || null } catch { return null } }
  const mail = async (to: string | null, m: { subject: string; html: string; text: string }) => to ? (await sendEmail({ to, ...m })).success === true : false

  for (const p of (profiles || []) as any[]) {
    // رقم واتساب المنشأة اللي حدده العميل، أو جوال التسجيل — بصيغة دولية
    // (لو ما عنده واتساب يوصله البريد على الأقل)
    const to = pickOwnerWhatsapp(p.organizations?.whatsapp_number, p.phone)
    const endsAt = new Date(p.subscription_ends_at)
    const name = p.full_name || p.organizations?.name || null
    const isTrial = p.subscription_type === 'trial'

    // تذكير قبل انتهاء الاشتراك بـ٣ أيام — للتجربة المجانية والاشتراك المدفوع معاً، مرة وحدة بس
    if (
      !p.trial_reminder_sent &&
      endsAt > now &&
      endsAt <= in3Days
    ) {
      const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const text = isTrial
        ? trialEndingMessage(p.full_name, daysLeft)
        : `مرحباً ${p.full_name || ''}\n\nينتهي اشتراكك في Storely خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}.\n\nجدّد اشتراكك الآن لمتابعة إدارة مخزونك وفريقك دون انقطاع:\nhttps://www.storely.dev/renew`
      const waOk = to ? (await sendWhatsAppMessage(to, text)).ok : false
      // نفس التذكير بالبريد (مرة وحدة مع الواتساب)
      const mailOk = await mail(await ownerEmail(p.id), subscriptionEndingEmail({ name, daysLeft, endsAt: p.subscription_ends_at, isTrial }))
      if (mailOk) emailsSent++
      if (waOk || mailOk) {
        await db.from('profiles').update({ trial_reminder_sent: true } as any).eq('id', p.id)
        remindersSent++
      }
    }

    // انتهى الاشتراك: تذكير كل يومين لمدة ٣٠ يوم (التنبيهات والطلبات التلقائية متوقفة لين يجدد)
    const last = p.renewal_reminder_at ? new Date(p.renewal_reminder_at).getTime() : 0
    if (endsAt <= now && now.getTime() - endsAt.getTime() <= REMIND_FOR && now.getTime() - last >= REMIND_EVERY) {
      const days = Math.max(1, Math.floor((now.getTime() - endsAt.getTime()) / DAY))
      const text = expiredWhatsappText(p.full_name, days <= 1 ? 0 : days, isTrial)
      const waOk = to ? (await sendWhatsAppMessage(to, text)).ok : false
      // البريد مرة وحدة يوم الانتهاء (مو كل يومين — الإيميلات المتكررة تروح للرسائل المزعجة)
      const mailOk = !p.expiry_notice_sent ? await mail(await ownerEmail(p.id), subscriptionEndedEmail({ name, isTrial })) : false
      if (mailOk) emailsSent++
      if (waOk || mailOk) {
        await db.from('profiles').update({ renewal_reminder_at: now.toISOString(), expiry_notice_sent: true } as any).eq('id', p.id)
        expirySent++
      }
    }
  }

  return NextResponse.json({ success: true, remindersSent, expirySent, emailsSent, branchesLocked })
}

// Vercel Cron يستدعي GET
export async function GET(req: Request) { return POST(req) }
