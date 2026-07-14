import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidAdminKey } from '@/lib/adminAuth'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '').replace(/^\+/, '')
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05'))  return '966' + clean.slice(1)
  if (clean.startsWith('5'))   return '966' + clean
  return '966' + clean
}

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!(await isValidAdminKey(adminKey))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, subscriptionType, subscriptionEndsAt } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, org_id')
      .eq('id', userId)
      .single()

    if (!profile?.phone) {
      return NextResponse.json({ error: 'لا يوجد رقم هاتف' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single()

    const phone   = formatPhone(profile.phone)
    const apiKey  = process.env.WASENDER_API_KEY!
    const session = process.env.WASENDER_SESSION_ID!
    const isPaid  = subscriptionType === 'paid'
    const endsDate = subscriptionEndsAt
      ? new Date(subscriptionEndsAt).toLocaleDateString('ar-SA')
      : '—'

    const msg =
      `🎉 *أهلاً ${profile.full_name}!*\n\n` +
      `تم تفعيل حسابك في *Storely* بنجاح ✅\n\n` +
      `📦 *المؤسسة:* ${org?.name || '—'}\n` +
      `🏷️ *نوع الاشتراك:* ${isPaid ? 'مدفوع 💳' : 'تجريبي 🎁'}\n` +
      `📅 *ينتهي في:* ${endsDate}\n\n` +
      `🔗 storely.dev\n\n` +
      `_Storely — نظام إدارة المخزون_`

    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ session_id: session, phone_number: phone, message: msg }),
    })

    await supabase.from('whatsapp_logs').insert({
      org_id: profile.org_id,
      phone,
      message: msg,
      status: res.ok ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: res.ok, phone })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
