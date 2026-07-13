import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, delay } from '@/lib/whatsapp'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    const supabase = sb()
    const now = new Date()
    const in3days = new Date(now.getTime() + 3*24*60*60*1000).toISOString()
    const nowISO = now.toISOString()

    // 1. إشعار "3 أيام متبقية"
    const { data: expiringSoon } = await supabase
      .from('profiles')
      .select('id, full_name, phone, subscription_ends_at, org_id')
      .eq('status', 'active')
      .eq('subscription_type', 'trial')
      .gte('subscription_ends_at', nowISO)
      .lte('subscription_ends_at', in3days)

    for (const user of expiringSoon || []) {
      const daysLeft = Math.ceil((new Date(user.subscription_ends_at).getTime() - now.getTime()) / (1000*60*60*24))
      if (user.phone) {
        await sendWhatsAppMessage(user.phone,
          `⏰ *تنبيه — Storely*\n\nمرحباً ${user.full_name}،\n\nتجربتك المجانية ستنتهي بعد *${daysLeft} أيام*.\n\nللاستمرار في استخدام Storely اشترك الآن:\n👇\nhttps://wa.me/966594351667?text=أريد الاشتراك في Storely\n\n_فريق Storely_`
        )
        await delay(600)
      }
    }

    // 2. إيقاف الحسابات المنتهية وإرسال إشعار
    const { data: expired } = await supabase
      .from('profiles')
      .select('id, full_name, phone, org_id')
      .eq('status', 'active')
      .eq('subscription_type', 'trial')
      .lt('subscription_ends_at', nowISO)

    for (const user of expired || []) {
      // إيقاف الحساب
      await supabase.from('profiles').update({ status: 'suspended' }).eq('id', user.id)
      
      // إشعار انتهاء التجربة
      if (user.phone) {
        await sendWhatsAppMessage(user.phone,
          `🔴 *انتهت تجربتك المجانية — Storely*\n\nمرحباً ${user.full_name}،\n\nانتهت فترة التجربة المجانية.\n\nللاستمرار اشترك الآن وارجع لإدارة مخزونك:\n👇\nhttps://wa.me/966594351667?text=أريد الاشتراك في Storely\n\n_فريق Storely_`
        )
        await delay(600)
      }
    }

    return NextResponse.json({
      success: true,
      expiring_soon: (expiringSoon || []).length,
      expired_and_suspended: (expired || []).length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
