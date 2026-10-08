import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يتحقق من انتهاء الاشتراك بوقت السيرفر (Node.js) -- مو وقت جهاز العميل.
// الاعتماد على new Date() بالمتصفح كان يقفل حسابات عملاء صحيحة لو ساعة/تاريخ جهازهم مضبوطة غلط.
export async function GET() {
  try {
    // المستخدم من جلسته — مو من الرابط (كان أي أحد يعرف رقم حساب يشوف تاريخ نهاية اشتراكه)
    const me = await getCurrentProfile()
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const profile_id = me.userId

    const { data: profile } = await sb()
      .from('profiles')
      .select('subscription_ends_at,subscription_type')
      .eq('id', profile_id)
      .maybeSingle()

    if (!profile?.subscription_ends_at) {
      return NextResponse.json({ hasSubscription: false, expired: false, daysLeft: null })
    }

    const ends = new Date(profile.subscription_ends_at)
    const now = new Date() // وقت السيرفر الفعلي وقت تنفيذ الطلب
    const expired = ends.getTime() < now.getTime()
    const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      hasSubscription: true,
      expired,
      daysLeft,
      subscription_ends_at: profile.subscription_ends_at,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
