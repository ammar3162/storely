import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
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
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

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
    .select('id,full_name,phone,subscription_type,subscription_ends_at,trial_reminder_sent,expiry_notice_sent')
    .eq('role', 'owner')
    .eq('status', 'active')
    .not('subscription_ends_at', 'is', null)

  let remindersSent = 0
  let expirySent = 0

  for (const p of (profiles || []) as any[]) {
    if (!p.phone) continue
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
        ? `مرحباً ${p.full_name || ''} 👋\n\nتجربتك المجانية بـ Storely راح تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} 📅\n\nلا تفوّت الفرصة — رقّي اشتراكك الآن واستمر بدون أي انقطاع في إدارة مخزونك:\nstorely.dev`
        : `مرحباً ${p.full_name || ''} 👋\n\nاشتراكك بـ Storely راح ينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} 📅\n\nجدّد اشتراكك الآن عشان تكمل إدارة مخزونك وفريقك بدون أي انقطاع:\nstorely.dev`
      const res = await sendWhatsAppMessage(p.phone, text)
      if (res.ok) {
        await db.from('profiles').update({ trial_reminder_sent: true } as any).eq('id', p.id)
        remindersSent++
      }
    }

    // إشعار انتهاء الاشتراك فعلياً — مرة وحدة بس
    // (للي انتهى خلال آخر ٣ أيام فقط — عشان ما نرسل للحسابات المنتهية من زمان)
    if (!p.expiry_notice_sent && endsAt <= now && endsAt > threeDaysAgo) {
      const text = `مرحباً ${p.full_name || ''}،\n\nانتهى اشتراكك بـ Storely 😔\n\nجدّد اشتراكك الآن عشان تكمل إدارة مخزونك وفريقك بدون انقطاع:\nstorely.dev/login`
      const res = await sendWhatsAppMessage(p.phone, text)
      if (res.ok) {
        await db.from('profiles').update({ expiry_notice_sent: true } as any).eq('id', p.id)
        expirySent++
      }
    }
  }

  return NextResponse.json({ success: true, remindersSent, expirySent, branchesLocked })
}

// Vercel Cron يستدعي GET
export async function GET(req: Request) { return POST(req) }
