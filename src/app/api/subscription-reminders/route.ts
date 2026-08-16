import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = sb()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

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

    // تذكير قبل انتهاء التجربة المجانية بـ٣ أيام — مرة وحدة بس
    if (
      p.subscription_type === 'trial' &&
      !p.trial_reminder_sent &&
      endsAt > now &&
      endsAt <= in3Days
    ) {
      const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const text = `مرحباً ${p.full_name || ''} 👋\n\nتجربتك المجانية بـ Storely راح تنتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} 📅\n\nلا تفوّت الفرصة — رقّي اشتراكك الآن واستمر بدون أي انقطاع في إدارة مخزونك:\nstorely.dev`
      const res = await sendWhatsAppMessage(p.phone, text)
      if (res.ok) {
        await db.from('profiles').update({ trial_reminder_sent: true } as any).eq('id', p.id)
        remindersSent++
      }
    }

    // إشعار انتهاء الاشتراك فعلياً — مرة وحدة بس
    if (!p.expiry_notice_sent && endsAt <= now) {
      const text = `مرحباً ${p.full_name || ''}،\n\nانتهى اشتراكك بـ Storely 😔\n\nجدّد اشتراكك الآن عشان تكمل إدارة مخزونك وفريقك بدون انقطاع:\nstorely.dev/login`
      const res = await sendWhatsAppMessage(p.phone, text)
      if (res.ok) {
        await db.from('profiles').update({ expiry_notice_sent: true } as any).eq('id', p.id)
        expirySent++
      }
    }
  }

  return NextResponse.json({ success: true, remindersSent, expirySent })
}
