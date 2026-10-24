import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { pickOwnerWhatsapp } from '@/lib/ownerContact'
import { isCronRequest } from '@/lib/cronAuth'
import { syncBranchesToLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'

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
    .select('id,full_name,phone,subscription_type,subscription_ends_at,trial_reminder_sent,renewal_reminder_at,organizations(whatsapp_number)')
    .eq('role', 'owner')
    .eq('status', 'active')
    .not('subscription_ends_at', 'is', null)

  let remindersSent = 0
  let expirySent = 0

  for (const p of (profiles || []) as any[]) {
    // رقم واتساب المنشأة اللي حدده العميل، أو جوال التسجيل — بصيغة دولية
    const to = pickOwnerWhatsapp(p.organizations?.whatsapp_number, p.phone)
    if (!to) continue
    const endsAt = new Date(p.subscription_ends_at)

    // تذكير قبل انتهاء الاشتراك بـ٣ أيام — للتجربة المجانية والاشتراك المدفوع معاً، مرة وحدة بس
    if (
      !p.trial_reminder_sent &&
      endsAt > now &&
      endsAt <= in3Days
    ) {
      const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const isTrial = p.subscription_type === 'trial'
      const text = isTrial
        ? `مرحباً ${p.full_name || ''}\n\nتجربتك المجانية بـ Storely تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}.\n\nاشترك الحين وكمّل إدارة مخزونك بدون انقطاع:\nstorely.dev`
        : `مرحباً ${p.full_name || ''}\n\nاشتراكك بـ Storely ينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}.\n\nجدّد اشتراكك الحين وكمّل إدارة مخزونك وفريقك بدون انقطاع:\nstorely.dev`
      const res = await sendWhatsAppMessage(to, text)
      if (res.ok) {
        await db.from('profiles').update({ trial_reminder_sent: true } as any).eq('id', p.id)
        remindersSent++
      }
    }

    // انتهى الاشتراك: تذكير كل يومين لمدة ٣٠ يوم (التنبيهات والطلبات التلقائية متوقفة لين يجدد)
    const last = p.renewal_reminder_at ? new Date(p.renewal_reminder_at).getTime() : 0
    if (endsAt <= now && now.getTime() - endsAt.getTime() <= REMIND_FOR && now.getTime() - last >= REMIND_EVERY) {
      const days = Math.max(1, Math.floor((now.getTime() - endsAt.getTime()) / DAY))
      const text = days <= 1
        ? `مرحباً ${p.full_name || ''}،\n\nانتهى اشتراكك بـ Storely، وتوقفت تنبيهات المخزون وطلبات الموردين التلقائية.\n\nجدّد اشتراكك الحين وترجع كل بياناتك وتنبيهاتك مثل ما كانت:\nstorely.dev/login`
        : `مرحباً ${p.full_name || ''}،\n\nاشتراكك بـ Storely منتهي من ${days} يوم، وبياناتك محفوظة بانتظارك.\n\nجدّد الحين وترجع تنبيهات المخزون وطلبات الموردين على طول:\nstorely.dev/login`
      const res = await sendWhatsAppMessage(to, text)
      if (res.ok) {
        await db.from('profiles').update({ renewal_reminder_at: now.toISOString(), expiry_notice_sent: true } as any).eq('id', p.id)
        expirySent++
      }
    }
  }

  return NextResponse.json({ success: true, remindersSent, expirySent, branchesLocked })
}

// Vercel Cron يستدعي GET
export async function GET(req: Request) { return POST(req) }
